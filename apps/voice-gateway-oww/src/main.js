/**
 * Voice Gateway with OpenWakeWord - Main Entry Point
 * Orchestrates wake word detection, audio recording, STT, and MQTT communication.
 */

import {config} from './config.js';
import {logger} from './logger.js';
import ort from 'onnxruntime-node';
import mic from 'mic';
import fs from 'fs';
import path from 'path';
import {spawn} from 'child_process';
import wav from 'wav';
import {assign, createMachine, interpret} from 'xstate';
import {fillMelBufferWithZeros, newDetectorState, transcribeWithWhisper} from '@jrg-voice/common';
import {checkOllamaHealth, queryOllama} from './ollama-client.js';
import {connectMQTT, publishAIResponse, publishTranscription} from './mqtt-client.js';
import {conversationManager} from './conversation-manager.js';
import {checkElevenLabsHealth, synthesizeSpeech} from './elevenlabs-tts.js';
import {getDevicesForAI, initializeMCPClient, shutdownMCPClient} from './mcp-zwave-client.js';
import {dateTimeTool, executeDateTimeTool} from './tools/datetime-tool.js';
import {searchTool, executeSearchTool} from './tools/search-tool.js';
import {zwaveControlTool, executeZWaveControlTool} from './tools/zwave-control-tool.js';
import {playErrorSound} from './audio-feedback.js';

// OpenWakeWord constants
const SAMPLE_RATE = 16000;
const CHUNK_SIZE = 1280; // 80ms at 16kHz
const MEL_SPEC_MODEL_INPUT_SIZE = 1280;
const PRE_ROLL_MS = 300;

// Platform helpers
const isMacOS = process.platform === 'darwin';
const isLinux = process.platform === 'linux';

// Small helpers
const msToSamples = (ms, rate = SAMPLE_RATE) => Math.floor((ms / 1000) * rate);
const PRE_ROLL_SAMPLES = msToSamples(PRE_ROLL_MS);

const toFloat32FromInt16Buffer = (buf) => {
    const pcm = new Int16Array(buf.buffer, buf.byteOffset, buf.length / Int16Array.BYTES_PER_ELEMENT);
    const out = new Float32Array(pcm.length);
    for (let i = 0; i < pcm.length; i++) out[i] = pcm[i] / 32768.0;
    return out;
};

const rmsEnergy = (samples) => {
    if (!samples || !samples.length) return 0;
    let e = 0;
    for (let i = 0; i < samples.length; i++) e += samples[i] * samples[i];
    return e / samples.length;
};

const writeWavFile = async (wavPath, samples, {channels = 1, sampleRate = SAMPLE_RATE, bitDepth = 16} = {}) => {
    const writer = new wav.FileWriter(wavPath, {channels, sampleRate, bitDepth});
    const int16Audio = new Int16Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
        int16Audio[i] = Math.max(-32768, Math.min(32767, samples[i] * 32768));
    }
    writer.write(Buffer.from(int16Audio.buffer));
    writer.end();
    await new Promise((res, rej) => {
        writer.on('finish', res);
        writer.on('error', rej);
        setTimeout(() => rej(new Error('wav writer timeout')), 5000);
    });
};

const safeDetectorReset = (detector, context = 'general') => {
    try {
        detector.reset();
    } catch (err) {
        logger.debug(`Detector reset failed (${context})`, {error: err && err.message ? err.message : String(err)});
    }
};

/**
 * Generate a simple beep tone (sine wave)
 * @param {number} frequency - Frequency in Hz (default 800Hz)
 * @param {number} duration - Duration in milliseconds (default 200ms)
 * @returns {Buffer} - PCM audio buffer (16-bit signed integer)
 */
const generateBeep = (frequency = 800, duration = 200) => {
    const sampleRate = SAMPLE_RATE;
    const numSamples = Math.floor((duration / 1000) * sampleRate);
    const pcmData = Buffer.alloc(numSamples * 2); // 2 bytes per sample (16-bit)

    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const sample = Math.sin(2 * Math.PI * frequency * t) * config.audio.beepVolume;
        const int16Sample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
        pcmData.writeInt16LE(int16Sample, i * 2);
    }

    return pcmData;
};

/**
 * Generate a two-tone beep pattern (ascending)
 * @param {number} freq1 - First frequency in Hz
 * @param {number} freq2 - Second frequency in Hz
 * @param {number} toneDuration - Duration of each tone in milliseconds
 * @param {number} gapDuration - Gap between tones in milliseconds
 * @returns {Buffer} - PCM audio buffer (16-bit signed integer)
 */
const generateDualBeep = (freq1 = 600, freq2 = 900, toneDuration = 80, gapDuration = 30) => {
    const tone1 = generateBeep(freq1, toneDuration);
    const tone2 = generateBeep(freq2, toneDuration);
    const gapSamples = Math.floor((gapDuration / 1000) * SAMPLE_RATE);
    const gapBuffer = Buffer.alloc(gapSamples * 2); // Silent gap

    // Concatenate: tone1 + gap + tone2
    return Buffer.concat([tone1, gapBuffer, tone2]);
};

// Pre-generate common beep patterns to avoid repeated computation during voice pipeline
// These buffers are created once at module initialization for better performance
const BEEPS = {
    wakeWord: generateBeep(800, 150),        // 800Hz for 150ms (wake word detected)
    processing: generateBeep(500, 100),      // 500Hz for 100ms (processing query)
    response: generateDualBeep(600, 900, 80, 30) // Dual-tone ascending (response ready)
};

/**
 * Play audio through speaker using aplay (Linux) or afplay (macOS)
 * @param {Buffer} pcmAudio - Raw 16kHz S16LE PCM audio
 * @returns {Promise<void>}
 */
const playAudio = async (pcmAudio) => {
    if (!pcmAudio || pcmAudio.length === 0) {
        logger.debug('⚠️ No audio to play');
        return;
    }

    return new Promise((resolve, reject) => {
        let player;

        if (isMacOS) {
            // macOS: convert PCM to WAV and use afplay
            const wavPath = path.join(process.cwd(), `tts_${Date.now()}.wav`);
            const writer = new wav.FileWriter(wavPath, {channels: 1, sampleRate: SAMPLE_RATE, bitDepth: 16});

            writer.write(pcmAudio);
            writer.end();

            writer.on('finish', () => {
                player = spawn('afplay', [wavPath]);

                player.on('close', (code) => {
                    try {
                        fs.unlinkSync(wavPath);
                    } catch {
                        // Ignore cleanup errors
                    }

                    if (code === 0) {
                        resolve();
                    } else {
                        reject(new Error(`afplay exited with code ${code}`));
                    }
                });

                player.on('error', (err) => {
                    try {
                        fs.unlinkSync(wavPath);
                    } catch {
                        // Ignore cleanup errors
                    }
                    reject(err);
                });
            });

            writer.on('error', reject);
        } else {
            // Linux: use aplay with raw PCM
            const device = config.audio.speakerDevice || config.audio.micDevice;
            player = spawn('aplay', ['-D', device, '-f', 'S16_LE', '-r', String(SAMPLE_RATE), '-c', '1']);

            player.stdin.write(pcmAudio);
            player.stdin.end();

            player.on('close', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`aplay exited with code ${code}`));
                }
            });

            player.on('error', reject);
        }
    });
};

const getServiceSnapshot = (service) => (typeof service.getSnapshot === 'function' ? service.getSnapshot() : service.state);

// ALSA device check (Linux only)
const checkAlsaDevice = async (alsaDevice, rate, channels) => {
    logger.debug(`🔍 Checking ALSA device: ${alsaDevice}`);
    await Promise.race([
        new Promise((resolve, reject) => {
            const arecord = spawn('arecord', ['-D', alsaDevice, '-f', 'S16_LE', '-r', String(rate), '-c', String(channels), '-d', '1', '/dev/null']);
            let stderr = '';
            let stdout = '';
            arecord.stdout.on('data', (d) => (stdout += d.toString()));
            arecord.stderr.on('data', (d) => (stderr += d.toString()));
            arecord.on('error', (err) => {
                logger.error('❌ ALSA spawn error', {error: err.message});
                reject(err);
            });
            arecord.on('exit', (code, signal) => {
                logger.debug('📋 arecord exit event', {code, signal, stderr: stderr.trim(), stdout: stdout.trim()});
                code === 0 ? resolve() : reject(new Error(`arecord exited with code ${code}`));
            });
            arecord.on('close', (code) => logger.debug('📋 arecord close event', {code}));
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('ALSA check timeout after 5s')), 5000))
    ]);
    logger.debug(`✅ ALSA device check passed: ${alsaDevice}`);
};

/**
 * OpenWakeWord Model Manager with Mel Spectrogram Buffering
 */
class OpenWakeWordDetector {
    constructor(modelsPath, wakeWordModel, threshold = 0.5) {
        this.modelsPath = modelsPath;
        this.wakeWordModel = wakeWordModel;
        this.threshold = threshold;
        this.melSession = null;
        this.embeddingSession = null;
        this.wakeWordSession = null;

        const detState = newDetectorState();
        this.melBuffer = detState.melBuffer;
        this.melBufferFilled = detState.melBufferFilled;
        this.embeddingBuffer = detState.embeddingBuffer;
        this.embeddingBufferFilled = detState.embeddingBufferFilled;
        this.framesSinceLastPrediction = detState.framesSinceLastPrediction;
        this.stepSize = 8; // every 8 frames (80ms)
    }

    async initialize() {
        const modelsDir = path.isAbsolute(this.modelsPath) ? this.modelsPath : path.resolve(process.cwd(), this.modelsPath);

        this.melSession = await ort.InferenceSession.create(path.join(modelsDir, 'melspectrogram.onnx'));
        this.embeddingSession = await ort.InferenceSession.create(path.join(modelsDir, 'embedding_model.onnx'));
        this.wakeWordSession = await ort.InferenceSession.create(path.join(modelsDir, this.wakeWordModel));

        logger.info('✅ OpenWakeWord initialized', {
            wakeWord: this.wakeWordModel.replace('_v0.1.onnx', '').replace(/_/g, ' '),
            threshold: this.threshold
        });
    }

    reset() {
        try {
            fillMelBufferWithZeros(this.melBuffer);
        } catch {
            const detState = newDetectorState();
            this.melBuffer = detState.melBuffer;
        }
        this.melBufferFilled = false;
        this.embeddingBuffer = [];
        this.embeddingBufferFilled = false;
        this.framesSinceLastPrediction = 0;
        logger.debug('OpenWakeWord detector buffers reset');
    }

    async detect(audioChunk) {
        if (audioChunk.length !== MEL_SPEC_MODEL_INPUT_SIZE) throw new Error(`Audio chunk must be ${MEL_SPEC_MODEL_INPUT_SIZE} samples`);

        // Step 1: mel spectrogram [1,1280] -> [1,1,5,32]
        const melResult = await this.melSession.run({input: new ort.Tensor('float32', audioChunk, [1, MEL_SPEC_MODEL_INPUT_SIZE])});
        const melOutput = Object.values(melResult)[0];

        // Extract 5 frames x 32 bins with OpenWakeWord transform (raw/10 + 2)
        const melFrames = [];
        for (let f = 0; f < 5; f++) {
            const frameData = new Float32Array(32);
            for (let m = 0; m < 32; m++) frameData[m] = melOutput.data[f * 32 + m] / 10 + 2;
            melFrames.push(frameData);
        }

        // Step 2: slide mel buffer, accumulate frames
        this.melBuffer = this.melBuffer.slice(5).concat(melFrames);
        this.framesSinceLastPrediction += 5;
        if (!this.melBufferFilled && this.melBuffer.length >= 76) this.melBufferFilled = true;
        if (!this.melBufferFilled || this.framesSinceLastPrediction < this.stepSize) return 0;

        this.framesSinceLastPrediction = 0;

        // Step 3: embedding input [1,76,32,1]
        const embeddingInput = new Float32Array(76 * 32);
        for (let f = 0; f < 76; f++) for (let m = 0; m < 32; m++) embeddingInput[f * 32 + m] = this.melBuffer[f][m];
        const embeddingTensor = new ort.Tensor('float32', embeddingInput, [1, 76, 32, 1]);

        // Step 4: get one 96-dim embedding
        const embeddingOutput = Object.values(await this.embeddingSession.run({input_1: embeddingTensor}))[0];
        const embeddingData = embeddingOutput.data;
        const embeddingDims = embeddingOutput.dims;
        const embeddingSize = embeddingDims[embeddingDims.length - 1];

        this.embeddingBuffer.push(new Float32Array(embeddingData));
        if (this.embeddingBuffer.length > 16) this.embeddingBuffer.shift();
        if (!this.embeddingBufferFilled && this.embeddingBuffer.length >= 16) {
            this.embeddingBufferFilled = true;
            logger.info('🎧 Listening for wake word...');
        }
        if (!this.embeddingBufferFilled) return 0;

        // Step 5: wake word input [1,16,96]
        const wakeWordInput = new Float32Array(16 * embeddingSize);
        for (let i = 0; i < 16; i++) for (let j = 0; j < embeddingSize; j++) wakeWordInput[i * embeddingSize + j] = this.embeddingBuffer[i][j];

        const wakeWordTensor = new ort.Tensor('float32', wakeWordInput, [1, 16, embeddingSize]);

        // Step 6: wake word detection
        const inputName = this.wakeWordSession.inputNames[0];
        const wakeWordResult = await this.wakeWordSession.run({[inputName]: wakeWordTensor});
        return Object.values(wakeWordResult)[0].data[0];
    }
}

// Background transcription helper (fire-and-forget). Accepts a snapshot of normalized samples.
async function backgroundTranscribe(audioSamples) {
    try {
        if (!audioSamples || audioSamples.length < SAMPLE_RATE * 0.15) {
            logger.warn('backgroundTranscribe: audio too short, skipping');
            return;
        }

        const energy = rmsEnergy(audioSamples);
        if (energy < 1e-6) {
            logger.warn('backgroundTranscribe: audio energy too low, skipping');
            return;
        }

        const wavPath = path.join(process.cwd(), `recorded_bg_${Date.now()}.wav`);
        const whisperModelRel = config.whisper.modelPath || 'models/ggml-base.bin';

        logger.debug('backgroundTranscribe: calling transcribeWithWhisper', {wavPath, model: whisperModelRel});
        try {
            await writeWavFile(wavPath, audioSamples);
            const transcription = await transcribeWithWhisper(whisperModelRel, wavPath, {timeoutMs: 60000});

            if (transcription && transcription.length) {
                logger.info(`📝 You said: "${transcription}"`);

                // Publish to MQTT in background (don't await)
                publishTranscription(transcription, {duration: audioSamples.length / SAMPLE_RATE})
                    .catch(err => logger.debug('MQTT publish failed', {error: err.message}));

                try {
                    conversationManager.addUserMessage(transcription);

                    // Check if user is asking about devices
                    // Use more specific patterns and word boundaries to avoid false positives
                    const deviceQueryPatterns = [
                        /\b(list|show|what)\s+(devices?|lights?|switch(es)?|sensors?)\b/i,
                        /\bwhat do i have\b/i,
                        /\bshow me (the )?(devices?|lights?|switch(es)?|sensors?)\b/i,
                        /\bdevices?\b/i // Only match 'device' or 'devices' as a whole word
                    ];
                    const isDeviceQuery = deviceQueryPatterns.some(pattern =>
                        pattern.test(transcription)
                    );

                    let systemPrompt = 'You are a helpful home automation assistant. Answer in 1 sentence or less. Be direct. No explanations. English only. No <think> tags. IMPORTANT: When the user asks about the current date, time, day, or any temporal information, you MUST use the get_current_datetime tool. When the user asks you to search for information, you MUST use the search_web tool. Always use the appropriate tool when available.';

                    // Add device information to context if asking about devices
                    if (isDeviceQuery) {
                        try {
                            logger.debug('📡 Device query detected, fetching device list...');
                            const deviceInfo = await getDevicesForAI();
                            systemPrompt += `\n\n${deviceInfo}`;
                            logger.debug('✅ Device information added to context');
                        } catch (error) {
                            logger.warn('⚠️ Failed to fetch devices for AI', {error: error.message});
                        }
                    }

                    const messages = conversationManager.getMessages(systemPrompt);
                    const convSummary = conversationManager.getSummary();
                    logger.debug('Conversation context', convSummary);

                    // Play processing beep (lower pitch than wake word beep)
                    try {
                        await playAudio(BEEPS.processing);
                    } catch (beepError) {
                        logger.debug('⚠️ Failed to play processing beep', {error: beepError instanceof Error ? beepError.message : String(beepError)});
                    }

                    // Define available tools
                    const tools = [dateTimeTool, searchTool, zwaveControlTool];

                    // Tool executor function
                    const toolExecutor = async (toolName, toolArgs) => {
                        logger.debug(`🔧 Executing tool: ${toolName}`, toolArgs);

                        switch (toolName) {
                            case 'get_current_datetime':
                                return executeDateTimeTool(toolArgs);
                            case 'search_web':
                                return await executeSearchTool(toolArgs);
                            case 'control_zwave_device':
                                return await executeZWaveControlTool(toolArgs);
                            default:
                                logger.warn(`⚠️ Unknown tool requested: ${toolName}`);
                                return `Error: Unknown tool ${toolName}`;
                        }
                    };

                    // Detect if this is a date/time question (fallback for when AI doesn't use tools)
                    const dateTimePatterns = [
                        /what (time|date) is it/i,
                        /what'?s the (time|date)/i,
                        /what day is (it|today)/i,
                        /what'?s today'?s date/i,
                        /tell me the (time|date)/i,
                        /current (time|date)/i,
                        /what year is (it|this)/i,
                        /can you tell me (what|the) (time|date)/i,
                    ];

                    const isDateTimeQuery = dateTimePatterns.some(pattern =>
                        pattern.test(transcription)
                    );

                    // Detect if this is a search query (fallback for when AI doesn't use tools)
                    const searchPatterns = [
                        /search (for|google|the web)/i,
                        /google (for|search)/i,
                        /look up/i,
                        /find (information|out) (about|on)/i,
                        /who is/i,
                        /what is/i,
                        /where is/i,
                        /when (did|was|is)/i,
                        /how (many|much|does)/i,
                    ];

                    const isSearchQuery = searchPatterns.some(pattern =>
                        pattern.test(transcription)
                    );

                    // Detect if this is a device control command (fallback for when AI doesn't use tools)
                    const deviceControlPatterns = [
                        /turn (on|off)/i,
                        /switch (on|off)/i,
                        /dim/i,
                        /brighten/i,
                        /set .+ to \d+/i,
                    ];

                    const isDeviceControlQuery = deviceControlPatterns.some(pattern =>
                        pattern.test(transcription)
                    );

                    // If this is a date/time, search, or device control query, bypass the AI and directly use the tool
                    // This is more reliable than hoping the small model uses tools correctly
                    let aiResponse;
                    let aiDuration;

                    if (isDateTimeQuery) {
                        logger.info('📅 Date/time query detected, using datetime tool directly');
                        const aiStartTime = Date.now();
                        aiResponse = executeDateTimeTool();
                        aiDuration = Date.now() - aiStartTime;
                        logger.debug('✅ Using direct datetime tool result (bypassing AI)');
                    } else if (isSearchQuery) {
                        logger.info('🔍 Search query detected, using search tool directly');
                        const aiStartTime = Date.now();
                        // Extract the query from the transcription
                        const query = transcription
                            .replace(/^(search for|google|look up|find information about|find out about|who is|what is|where is|when did|when was|when is|how many|how much|how does)\s*/i, '')
                            .trim();
                        const searchResult = await executeSearchTool({query});
                        aiResponse = searchResult;
                        aiDuration = Date.now() - aiStartTime;
                        logger.debug('✅ Using direct search tool result (bypassing AI)', {query, result: searchResult.substring(0, 100)});
                    } else if (isDeviceControlQuery) {
                        logger.info('🏠 Device control query detected, using Z-Wave tool directly');
                        const aiStartTime = Date.now();

                        // Parse the device name and action from the transcription
                        // Example: "turn off switch one" -> deviceName: "switch one", action: "off"
                        let deviceName = null;
                        let action = null;
                        let level = null;

                        // Simplified approach: Look for action words and extract device name
                        // Remove polite prefixes first
                        let cleanedTranscription = transcription
                            .replace(/^(can you |please |could you |would you )?/i, '')
                            .trim();

                        // Detect action and extract device name in one pass
                        // Match patterns like: "turn [device] off", "turn off [device]", "switch [device] on", etc.
                        if (/\boff\b/i.test(cleanedTranscription)) {
                            action = 'off';
                            // Try "turn X off" pattern
                            deviceName = cleanedTranscription.replace(/^(turn|switch)\s+(.+?)\s+off.*$/i, '$2').trim();
                            // If no match, try "turn off X" pattern
                            if (deviceName === cleanedTranscription) {
                                deviceName = cleanedTranscription.replace(/^(turn|switch)\s+off\s+(.+)$/i, '$2').trim();
                            }
                        } else if (/\bon\b/i.test(cleanedTranscription)) {
                            action = 'on';
                            // Try "turn X on" pattern
                            deviceName = cleanedTranscription.replace(/^(turn|switch)\s+(.+?)\s+on.*$/i, '$2').trim();
                            // If no match, try "turn on X" pattern
                            if (deviceName === cleanedTranscription) {
                                deviceName = cleanedTranscription.replace(/^(turn|switch)\s+on\s+(.+)$/i, '$2').trim();
                            }
                        } else if (/\bdim\b/i.test(cleanedTranscription)) {
                            action = 'dim';
                            deviceName = cleanedTranscription.replace(/^dim\s+(.+?)(\s+to\s+\d+.*)?$/i, '$1').trim();
                            // Try to extract level (e.g., "dim to 50")
                            const levelMatch = cleanedTranscription.match(/\bto\s+(\d+)\s*%?/i);
                            if (levelMatch) {
                                level = parseInt(levelMatch[1], 10);
                            }
                        }

                        // Remove trailing punctuation
                        if (deviceName) {
                            deviceName = deviceName.replace(/[?!.]+$/, '').trim();
                        }

                        // First, check device status
                        logger.debug(`Checking status of device: "${deviceName}"`);
                        const statusResult = await executeZWaveControlTool({
                            deviceName,
                            action: 'status'
                        });

                        // Parse the status result to check if device exists and is online
                        // The result is formatted like: "Switch One (node 5 · Demo) — ready: yes | available: no | status: Asleep"
                        const deviceNameLower = deviceName.toLowerCase();
                        const statusLines = statusResult.split('\n');
                        let deviceFound = false;
                        let deviceOnline = false;

                        for (const line of statusLines) {
                            const lineLower = line.toLowerCase();
                            if (lineLower.includes(deviceNameLower)) {
                                deviceFound = true;
                                // Check if device is available (not offline)
                                // Look for "status: online" or "available: yes"
                                if (lineLower.includes('status: online') ||
                                    (lineLower.includes('ready: yes') && lineLower.includes('available: yes'))) {
                                    deviceOnline = true;
                                }
                                break;
                            }
                        }

                        // Provide appropriate response based on device status
                        if (!deviceFound) {
                            aiResponse = `I couldn't find a device called "${deviceName}". Please check the device name and try again.`;
                        } else if (!deviceOnline) {
                            aiResponse = `The device "${deviceName}" is currently offline or unavailable. Please wait until it comes back online.`;
                        } else {
                            // Device exists and is online, proceed with control
                            if (action) {
                                const controlResult = await executeZWaveControlTool({
                                    deviceName,
                                    action,
                                    level
                                });
                                aiResponse = controlResult;
                            } else {
                                aiResponse = `I'm not sure what you want me to do with ${deviceName}. Try "turn on" or "turn off".`;
                            }
                        }

                        aiDuration = Date.now() - aiStartTime;
                        logger.debug('✅ Using direct Z-Wave control tool result (bypassing AI)', {deviceName, action, result: aiResponse.substring(0, 100)});
                    } else {
                        // Performance timing: AI inference
                        const aiStartTime = Date.now();
                        aiResponse = await queryOllama(null, {messages, tools, toolExecutor});
                        aiDuration = Date.now() - aiStartTime;
                    }

                    conversationManager.addAssistantMessage(aiResponse);

                    logger.info(`🤖 AI Response: "${aiResponse}" (${aiDuration}ms)`);

                    // Play response received beep (dual-tone ascending)
                    try {
                        await playAudio(BEEPS.response);
                    } catch (beepError) {
                        logger.debug('⚠️ Failed to play response beep', {error: beepError instanceof Error ? beepError.message : String(beepError)});
                    }

                    // Publish to MQTT in background (don't await)
                    publishAIResponse(transcription, aiResponse, {
                        model: config.ollama.model,
                        conversationTurns: Math.floor(convSummary.totalMessages / 2)
                    }).catch(err => logger.debug('MQTT publish failed', {error: err.message}));

                    // Text-to-Speech
                    if (config.tts.enabled) {
                        try {
                            logger.debug('🔊 Generating speech...');
                            const audioBuffer = await synthesizeSpeech(aiResponse, {
                                volume: config.tts.volume,
                                speed: config.tts.speed
                            });

                            if (audioBuffer && audioBuffer.length > 0) {
                                logger.debug('🔊 Playing AI response through speaker...');
                                await playAudio(audioBuffer);
                                logger.debug('✅ AI response playback complete');
                            }
                        } catch (ttsError) {
                            logger.error('❌ TTS failed', {
                                error: ttsError.message
                            });
                        }
                    }
                } catch (aiError) {
                    logger.error('❌ Ollama AI query failed', {
                        error: aiError.message,
                        transcription: transcription.substring(0, 50)
                    });
                }
            } else {
                logger.warn('⚠️ Background transcription returned empty string');
            }
        } catch (err) {
            logger.error('backgroundTranscribe: transcription failed', {error: err && err.message ? err.message : String(err)});
            // Play error sound
            try {
                await playErrorSound();
            } catch (soundErr) {
                // Silently fail if audio playback isn't available
            }
        } finally {
            try {
                fs.unlinkSync(wavPath);
            } catch {
                /* ignore */
            }
        }
    } catch (err) {
        logger.error('backgroundTranscribe failed', {error: err && err.message ? err.message : String(err)});
    }
}

async function main() {
    logger.info('🚀 Voice Gateway (OpenWakeWord) starting...');
    logger.debug(`Audio config: micDevice=${config.audio.micDevice}, sampleRate=${config.audio.sampleRate}, channels=${config.audio.channels}`);

    // MQTT
    try {
        await connectMQTT();
        logger.debug('✅ MQTT connection established');
    } catch (err) {
        logger.error('❌ Failed to connect to MQTT broker', {error: err.message});
        logger.warn('⚠️ Continuing without MQTT - AI responses will be logged only');
    }

    // Ollama
    try {
        const ollamaReady = await checkOllamaHealth();
        if (!ollamaReady) logger.warn('⚠️ Ollama not ready - AI responses may fail');
    } catch (err) {
        logger.error('❌ Ollama health check failed', {error: err.message});
        logger.warn('⚠️ Continuing without Ollama - transcriptions will work but no AI responses');
    }

    // ElevenLabs TTS
    if (config.tts.enabled) {
        try {
            const elevenLabsReady = await checkElevenLabsHealth();
            if (!elevenLabsReady) {
                logger.warn('⚠️ ElevenLabs TTS not ready - AI responses will not be spoken');
                logger.warn('⚠️ Check ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID environment variables');
                logger.warn('⚠️ Ensure ffmpeg is installed: brew install ffmpeg (macOS) or apt-get install ffmpeg (Linux)');
            }
        } catch (err) {
            logger.error('❌ ElevenLabs TTS health check failed', {error: err.message});
            logger.warn('⚠️ Continuing without TTS - AI responses will be text only');
        }
    }

    // ALSA device check (Linux only)
    if (isLinux) {
        try {
            await checkAlsaDevice(config.audio.micDevice, config.audio.sampleRate, config.audio.channels);
        } catch (err) {
            logger.error('❌ ALSA device check failed', {device: config.audio.micDevice, error: err.message});
            logger.warn('⚠️  Continuing anyway - mic library will try to use device');
        }
    }

    // Initialize MCP ZWave Client
    try {
        logger.info('🔌 Initializing ZWave MCP client...');
        await initializeMCPClient();
        logger.info('✅ ZWave MCP client ready');

        // Test Z-Wave connection by fetching device list
        logger.info('🔍 Testing Z-Wave connection...');
        const deviceInfo = await getDevicesForAI();
        logger.info('✅ Z-Wave connection successful!');
        logger.debug('📋 Devices:', deviceInfo);
    } catch (err) {
        logger.error('❌ ZWave MCP client initialization failed', {error: err.message});
        logger.warn('⚠️ Continuing without device information - device queries will not work');
    }

    try {
        // OWW detector
        const modelsDir = path.dirname(config.openWakeWord.modelPath);
        const wakeWordModelFile = path.basename(config.openWakeWord.modelPath);
        const detector = new OpenWakeWordDetector(modelsDir, wakeWordModelFile, config.openWakeWord.threshold);
        await detector.initialize();

        // Buffers and state
        let audioBuffer = [];
        let isRecording = false;
        let recordedAudio = [];
        let recordTimeout = null; // intentionally left for compatibility with existing clearTimeout
        let preRollBuffer = [];

        // VAD params
        let silenceSampleCount = 0;
        const SILENCE_THRESHOLD = 0.001;
        const SILENCE_DURATION_MS = config.vad.trailingSilenceMs || 1500;
        const SILENCE_SAMPLES_REQUIRED = msToSamples(SILENCE_DURATION_MS);
        const MAX_RECORDING_MS = config.vad.maxUtteranceMs || 10000;
        const MAX_RECORDING_SAMPLES = msToSamples(MAX_RECORDING_MS);

        // State machine
        const voiceMachine = createMachine(
            {
                id: 'voice',
                initial: 'listening',
                context: {
                    lastTrigger: 0,
                    minRearmMs: config.audio.triggerCooldownMs || 1500
                },
                states: {
                    listening: {
                        entry: () => logger.debug('🎧 Listening for wake word...'),
                        on: {
                            TRIGGER: [{
                                cond: 'canTrigger',
                                target: 'recording',
                                actions: 'recordTriggered'
                            }, {actions: 'logTriggerBlocked'}]
                        }
                    },
                    recording: {
                        entry: ['startRecordingAction'],
                        exit: ['stopRecordingAction'],
                        on: {SILENCE_DETECTED: 'cooldown', MAX_LENGTH_REACHED: 'cooldown', FORCE_STOP: 'cooldown'}
                    },
                    cooldown: {
                        entry: ['enterCooldownAction'],
                        after: {1500: 'listening'}
                    }
                }
            },
            {
                guards: {
                    canTrigger: (ctx, evt) => {
                        const ts = (evt && evt.ts) ? evt.ts : Date.now();
                        return ts - (ctx.lastTrigger || 0) >= (ctx.minRearmMs || 1500);
                    }
                },
                actions: {
                    logTriggerBlocked: (ctx, evt) => {
                        const now = (evt && evt.ts) ? evt.ts : Date.now();
                        const last = ctx.lastTrigger || 0;
                        const minMs = ctx.minRearmMs || 1500;
                        logger.debug('Trigger blocked by guard', {
                            now,
                            lastTrigger: last,
                            minRearmMs: minMs,
                            elapsed: now - last
                        });
                    },
                    recordTriggered: assign({lastTrigger: (ctx, evt) => (evt && evt.ts) ? evt.ts : Date.now()}),
                    startRecordingAction: () => {
                        logger.debug('⏺  Start recording (VAD-based)');
                        isRecording = true;
                        silenceSampleCount = 0;
                        recordedAudio = preRollBuffer.slice();
                        preRollBuffer = [];
                        audioBuffer = [];
                        safeDetectorReset(detector, 'start');
                        if (recordTimeout) clearTimeout(recordTimeout);
                    },
                    stopRecordingAction: () => {
                        logger.debug('⏹️  Recording stopped (state machine exit)');
                        isRecording = false;
                        const audioSnapshot = Array.isArray(recordedAudio) ? recordedAudio.slice() : [];
                        recordedAudio = [];
                        (async () => {
                            try {
                                await backgroundTranscribe(audioSnapshot);
                            } catch (e) {
                                logger.error('stopRecordingAction: backgroundTranscribe error', {error: e && e.message ? e.message : String(e)});
                            }
                        })();
                    },
                    enterCooldownAction: () => {
                        logger.debug('Cooldown started');
                        audioBuffer = [];
                        safeDetectorReset(detector, 'cooldown');
                    }
                }
            }
        );

        const voiceService = interpret(voiceMachine);
        voiceService.subscribe((state) => {
            if (!state) return;
            const stateValue = state && state.value !== undefined ? state.value : null;
            logger.debug('State changed', {state: stateValue});
            if (typeof state.matches === 'function' && state.matches('cooldown')) safeDetectorReset(detector, 'cooldown-subscribe');
        });
        voiceService.start();

        // Mic config (device only on Linux)
        const micConfig = {
            rate: String(config.audio.sampleRate),
            channels: String(config.audio.channels),
            debug: false,
            exitOnSilence: 6
        };
        if (!isMacOS) micConfig.device = config.audio.micDevice;

        const micInstance = mic(micConfig);
        const micInputStream = micInstance.getAudioStream();

        micInputStream.on('error', (err) => logger.error('❌ Microphone stream error', {error: err.message}));

        logger.debug('🎤 Starting microphone...');
        micInstance.start();

        let audioChunkCount = 0;
        let detectionCount = 0;
        let firstChunkLogged = false;

        const micTimeout = setTimeout(() => {
            if (audioChunkCount === 0) {
                logger.error('❌ No audio chunks received after 3 seconds!', {
                    platform: process.platform,
                    device: !isMacOS ? config.audio.micDevice : 'default',
                    suggestion: 'Check microphone permissions or device configuration'
                });
            }
        }, 3000);

        micInputStream.on('data', async (data) => {
            if (audioChunkCount === 0) clearTimeout(micTimeout);
            audioChunkCount++;

            if (!firstChunkLogged) {
                logger.debug('✅ First audio chunk received!', {
                    size: data.length,
                    platform: process.platform,
                    device: !isMacOS ? config.audio.micDevice : 'default'
                });
                firstChunkLogged = true;
            }

            if (isLinux && audioChunkCount % 100 === 0) logger.debug('🎙️ Microphone still streaming', {
                chunks: audioChunkCount,
                bufferSize: data.length
            });

            const normalized = toFloat32FromInt16Buffer(data);
            audioBuffer = audioBuffer.concat(Array.from(normalized));

            // Wake word detection only in listening state
            while (audioBuffer.length >= CHUNK_SIZE) {
                const snapshot = getServiceSnapshot(voiceService);
                if (!snapshot || typeof snapshot.matches !== 'function' || !snapshot.matches('listening')) break;

                const chunk = new Float32Array(audioBuffer.slice(0, CHUNK_SIZE));
                audioBuffer = audioBuffer.slice(CHUNK_SIZE);

                try {
                    const score = await detector.detect(chunk);
                    detectionCount++;
                    if (detectionCount % 100 === 0) logger.debug('👂 Still listening...', {detections: detectionCount, lastScore: score.toFixed(3)});

                    // Log scores above 0.1 to help diagnose threshold issues
                    if (score > 0.1) {
                        logger.debug('🎯 Detection score elevated', {score: score.toFixed(3), threshold: config.openWakeWord.threshold});
                    }

                    const snapshot2 = getServiceSnapshot(voiceService);
                    if (score > config.openWakeWord.threshold && snapshot2 && typeof snapshot2.matches === 'function' && snapshot2.matches('listening')) {
                        const ts = Date.now();
                        const wakeWord =
                            config.openWakeWord.modelPath.includes('jarvis')
                                ? 'Hey Jarvis'
                                : config.openWakeWord.modelPath.includes('mycroft')
                                    ? 'Hey Mycroft'
                                    : config.openWakeWord.modelPath.includes('alexa')
                                        ? 'Alexa'
                                        : 'Wake word';

                        // Immediately trigger state transition to prevent duplicate detections
                        voiceService.send({type: 'TRIGGER', ts});

                        // Reset detector immediately after triggering to reduce chance of additional detections
                        safeDetectorReset(detector, 'post-trigger');

                        // Log after triggering so we don't emit multiple logs while still in listening state
                        const logSnapshot = getServiceSnapshot(voiceService);
                        logger.info('🎤 Wake word detected!', {
                            wakeWord,
                            score: score.toFixed(3),
                            serviceState: logSnapshot && logSnapshot.value ? logSnapshot.value : String(logSnapshot)
                        });

                        // Play acknowledgment beep asynchronously (do not await) so the detection loop isn't blocked
                        playAudio(BEEPS.wakeWord).catch((beepError) => {
                            logger.debug('⚠️ Failed to play beep', {error: beepError instanceof Error ? beepError.message : String(beepError)});
                        });

                        // Note: we intentionally don't await playAudio here. The state machine will
                        // transition to "recording" immediately which stops further wake detections.
                    }
                } catch (err) {
                    logger.error('Error in wake word detection', {error: err.message});
                }
            }

            // Maintain pre-roll buffer
            if (normalized.length) {
                preRollBuffer = preRollBuffer.concat(Array.from(normalized));
                if (preRollBuffer.length > PRE_ROLL_SAMPLES) preRollBuffer = preRollBuffer.slice(preRollBuffer.length - PRE_ROLL_SAMPLES);
            }

            // Recording/VAD
            if (isRecording && normalized.length) {
                recordedAudio = recordedAudio.concat(Array.from(normalized));

                const energy = rmsEnergy(normalized);
                if (energy < SILENCE_THRESHOLD) {
                    silenceSampleCount += normalized.length;
                    const silenceDurationMs = Math.floor((silenceSampleCount / SAMPLE_RATE) * 1000);
                    if (silenceDurationMs % 500 === 0) {
                        logger.debug('🔇 Detecting silence', {
                            energy: energy.toFixed(6),
                            threshold: SILENCE_THRESHOLD,
                            silenceDurationMs
                        });
                    }
                    if (silenceSampleCount >= SILENCE_SAMPLES_REQUIRED) {
                        logger.debug('🔇 Silence detected, stopping recording', {
                            silenceDurationMs: Math.floor((silenceSampleCount / SAMPLE_RATE) * 1000),
                            totalRecordingMs: Math.floor((recordedAudio.length / SAMPLE_RATE) * 1000)
                        });
                        voiceService.send({type: 'SILENCE_DETECTED'});
                    }
                } else {
                    if (silenceSampleCount > 0) {
                        logger.debug('🗣️ Speech detected, resetting silence counter', {
                            energy: energy.toFixed(6),
                            threshold: SILENCE_THRESHOLD,
                            silenceDurationMs: Math.floor((silenceSampleCount / SAMPLE_RATE) * 1000)
                        });
                    }
                    silenceSampleCount = 0;
                }

                if (recordedAudio.length >= MAX_RECORDING_SAMPLES) {
                    logger.debug('⏱️ Maximum recording length reached, stopping', {durationMs: Math.floor((recordedAudio.length / SAMPLE_RATE) * 1000)});
                    voiceService.send({type: 'MAX_LENGTH_REACHED'});
                }
            }
        });

        process.on('SIGINT', async () => {
            logger.info('SIGINT received, shutting down...');
            micInstance.stop();
            await shutdownMCPClient();
            process.exit(0);
        });

        process.on('uncaughtException', async (err) => {
            logger.error('Uncaught exception', {error: err.message});
            micInstance.stop();
            await shutdownMCPClient();
            process.exit(1);
        });

        logger.info('✅ Voice Gateway (OpenWakeWord) is ready');

        // Speak welcome message
        if (config.tts.enabled) {
            try {
                logger.debug('🗣️ Speaking welcome message...');
                const welcomeMessage = 'Hello, I am Jarvis. How can I help?';
                const audioBuffer = await synthesizeSpeech(welcomeMessage, {
                    volume: config.tts.volume,
                    speed: config.tts.speed
                });

                if (audioBuffer && audioBuffer.length > 0) {
                    await playAudio(audioBuffer);
                    logger.info('✅ Welcome message spoken');
                }
            } catch (ttsError) {
                logger.error('❌ Failed to speak welcome message', {
                    error: ttsError.message
                });
            }
        }
    } catch (err) {
        logger.error('Failed to initialize Voice Gateway', {error: err.message});
        process.exit(1);
    }
}

main().catch((err) => {
    logger.error('Fatal error in main', {error: err.message});
    process.exit(1);
});
