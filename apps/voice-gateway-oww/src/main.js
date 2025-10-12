/**
 * Voice Gateway with OpenWakeWord - Main Entry Point
 *
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
import {createMachine, interpret, assign} from 'xstate';
import { transcribeWithWhisper, newDetectorState, fillMelBufferWithZeros } from '@jrg-voice/common';

// OpenWakeWord audio processing constants
const SAMPLE_RATE = 16000;
const CHUNK_SIZE = 1280; // 80ms at 16kHz (16000 * 0.08)
const MEL_SPEC_MODEL_INPUT_SIZE = 1280;
const PRE_ROLL_MS = 300; // include 300ms of audio prior to trigger
const PRE_ROLL_SAMPLES = Math.floor((PRE_ROLL_MS / 1000) * SAMPLE_RATE);

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

        // Initialize mel/embedding buffers via shared helper
        const detState = newDetectorState();
        this.melBuffer = detState.melBuffer;
        this.melBufferFilled = detState.melBufferFilled;
        this.embeddingBuffer = detState.embeddingBuffer;
        this.embeddingBufferFilled = detState.embeddingBufferFilled;
        this.framesSinceLastPrediction = detState.framesSinceLastPrediction;
        this.stepSize = 8; // Process every 8 frames (80ms)
    }

    async initialize() {
        const modelsDir = path.isAbsolute(this.modelsPath)
            ? this.modelsPath
            : path.resolve(process.cwd(), this.modelsPath);

        // Load melspectrogram model
        const melPath = path.join(modelsDir, 'melspectrogram.onnx');
        this.melSession = await ort.InferenceSession.create(melPath);

        // Load embedding model
        const embeddingPath = path.join(modelsDir, 'embedding_model.onnx');
        this.embeddingSession = await ort.InferenceSession.create(embeddingPath);

        // Load wake word model
        const wakeWordPath = path.join(modelsDir, this.wakeWordModel);
        this.wakeWordSession = await ort.InferenceSession.create(wakeWordPath);

        logger.info('✅ OpenWakeWord initialized', {
            wakeWord: this.wakeWordModel.replace('_v0.1.onnx', '').replace(/_/g, ' '),
            threshold: this.threshold
        });
    }

    // Reset internal buffers to avoid residual detections
    reset() {
        // Use shared utility to refill mel buffer and clear embeddings
        try {
            fillMelBufferWithZeros(this.melBuffer);
        } catch (err) {
            // fallback: re-create buffers
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
        // Ensure audio chunk is the right size
        if (audioChunk.length !== MEL_SPEC_MODEL_INPUT_SIZE) {
            throw new Error(`Audio chunk must be ${MEL_SPEC_MODEL_INPUT_SIZE} samples`);
        }

        // Step 1: Convert audio to mel spectrogram
        // melspectrogram.onnx expects input tensor named 'input' with shape [1, 1280]
        const audioTensor = new ort.Tensor('float32', audioChunk, [1, MEL_SPEC_MODEL_INPUT_SIZE]);
        const melResult = await this.melSession.run({input: audioTensor});
        const melOutput = Object.values(melResult)[0]; // Shape: [1, 1, 5, 32]

        // Extract mel frames from output [1, 1, 5, 32] -> [5, 32]
        // Each chunk produces 5 frames of 32 mel bins
        const melFrames = [];
        for (let frame = 0; frame < 5; frame++) {
            const frameData = new Float32Array(32);
            for (let mel = 0; mel < 32; mel++) {
                // CRITICAL: Apply OpenWakeWord's melspectrogram transform
                // This matches the original TensorFlow implementation
                const rawValue = melOutput.data[frame * 32 + mel];
                frameData[mel] = rawValue / 10 + 2;
            }
            melFrames.push(frameData);
        }

        // Step 2: Add new frames to buffer (sliding window)
        // Remove oldest 5 frames and append new 5 frames
        this.melBuffer = this.melBuffer.slice(5).concat(melFrames);
        this.framesSinceLastPrediction += 5;

        // Check if mel buffer is filled for first time
        if (!this.melBufferFilled && this.melBuffer.length >= 76) {
            this.melBufferFilled = true;
        }

        // Only compute embeddings if mel buffer is filled and we've accumulated enough frames
        if (!this.melBufferFilled || this.framesSinceLastPrediction < this.stepSize) {
            return 0; // Not ready yet
        }

        this.framesSinceLastPrediction = 0;

        // Step 3: Prepare input for embedding model [1, 76, 32, 1]
        const embeddingInput = new Float32Array(76 * 32);
        for (let frame = 0; frame < 76; frame++) {
            for (let mel = 0; mel < 32; mel++) {
                embeddingInput[frame * 32 + mel] = this.melBuffer[frame][mel];
            }
        }
        const embeddingTensor = new ort.Tensor('float32', embeddingInput, [1, 76, 32, 1]);

        // Step 4: Get ONE embedding from mel spectrogram (96-dimensional)
        // embedding_model.onnx expects input tensor named 'input_1'
        const embeddingResult = await this.embeddingSession.run({input_1: embeddingTensor});
        const embeddingOutput = Object.values(embeddingResult)[0]; // Get first output

        // Extract the embedding vector (96 features)
        const embeddingData = embeddingOutput.data;
        const embeddingDims = embeddingOutput.dims;
        const embeddingSize = embeddingDims[embeddingDims.length - 1]; // Last dimension is feature count

        // Add this embedding to the embedding buffer (sliding window)
        this.embeddingBuffer.push(new Float32Array(embeddingData));

        // Keep only the last 16 embeddings
        if (this.embeddingBuffer.length > 16) {
            this.embeddingBuffer.shift();
        }

        // Check if embedding buffer is filled for first time
        if (!this.embeddingBufferFilled && this.embeddingBuffer.length >= 16) {
            this.embeddingBufferFilled = true;
            logger.info('🎧 Listening for wake word...');
        }

        // Only run wake word detection if we have 16 embeddings
        if (!this.embeddingBufferFilled) {
            return 0; // Not ready yet
        }

        // Step 5: Prepare wake word model input [1, 16, 96]
        // Flatten 16 embeddings into single array
        const wakeWordInput = new Float32Array(16 * embeddingSize);
        for (let i = 0; i < 16; i++) {
            for (let j = 0; j < embeddingSize; j++) {
                wakeWordInput[i * embeddingSize + j] = this.embeddingBuffer[i][j];
            }
        }

        const wakeWordTensor = new ort.Tensor('float32', wakeWordInput, [1, 16, embeddingSize]);

        // Step 6: Run wake word detection
        // Wake word models use dynamic input names, query at runtime
        const wakeWordInputName = this.wakeWordSession.inputNames[0];
        const wakeWordResult = await this.wakeWordSession.run({[wakeWordInputName]: wakeWordTensor});
        return Object.values(wakeWordResult)[0].data[0];
    }
}

async function main() {
    logger.info('🚀 Voice Gateway (OpenWakeWord) starting...');
    logger.info(`Audio config: micDevice=${config.audio.micDevice}, sampleRate=${config.audio.sampleRate}, channels=${config.audio.channels}`);

    // Optionally, check ALSA device availability (Linux only)
    if (process.platform === 'linux') {
        const alsaDevice = config.audio.micDevice;
        logger.info(`Checking ALSA device: ${alsaDevice}`);
        const arecord = spawn('arecord', ['-D', alsaDevice, '-f', 'S16_LE', '-r', String(config.audio.sampleRate), '-c', String(config.audio.channels), '-d', '1', '/dev/null']);
        arecord.on('error', (err) => {
            logger.error('ALSA device check failed. Microphone may not be available.', {
                device: alsaDevice,
                error: err.message
            });
            process.exit(1);
        });
        arecord.on('close', (code) => {
            if (code !== 0) {
                logger.error(`ALSA device check failed with code ${code}. Microphone may not be available.`, {device: alsaDevice});
                process.exit(1);
            }
        });
    }

    try {
        // Initialize OpenWakeWord detector
        const modelsDir = path.dirname(config.openWakeWord.modelPath);
        const wakeWordModelFile = path.basename(config.openWakeWord.modelPath);

        const detector = new OpenWakeWordDetector(
            modelsDir,
            wakeWordModelFile,
            config.openWakeWord.threshold
        );

        await detector.initialize();

        let audioBuffer = [];
        let isRecording = false; // still used by audio handler to append audio
        let recordedAudio = [];
        let recordTimeout = null;
        let preRollBuffer = [];

        // Define the state machine for voice control
        const voiceMachine = createMachine({
          id: 'voice',
          initial: 'listening',
          context: {
            lastTrigger: 0,
            minRearmMs: config.audio.triggerCooldownMs || 1500
          },
          states: {
            listening: {
              entry: () => logger.info('🎧 Listening for wake word...'),
              on: {
                TRIGGER: [
                  { cond: 'canTrigger', target: 'recording', actions: 'recordTriggered' },
                  { actions: 'logTriggerBlocked' }
                ]
              }
            },
            recording: {
              entry: ['startRecordingAction'],
              exit: ['stopRecordingAction'],
              after: { 3000: 'cooldown' },
              on: { FORCE_STOP: 'cooldown' }
            },
            cooldown: {
              entry: ['enterCooldownAction'],
              after: { 1500: 'listening' }
            }
          }
        }, {
          guards: {
            canTrigger: (ctx, evt) => {
              const ts = evt && evt.ts ? evt.ts : Date.now();
              return (ts - (ctx.lastTrigger || 0)) >= (ctx.minRearmMs || 1500);
            }
          },
          actions: {
            logTriggerBlocked: (ctx, evt) => {
              const now = (evt && evt.ts) ? evt.ts : Date.now();
              const last = ctx.lastTrigger || 0;
              const minMs = ctx.minRearmMs || 1500;
              logger.info('Trigger blocked by guard', { now, lastTrigger: last, minRearmMs: minMs, elapsed: now - last });
            },
            recordTriggered: assign({ lastTrigger: (ctx, evt) => (evt && evt.ts) ? evt.ts : Date.now() }),
            startRecordingAction: () => {
              logger.info('⏺  Start recording (state machine)');
              isRecording = true;
              // Prepend pre-roll audio so we capture speech that occurred slightly before the trigger
              recordedAudio = preRollBuffer.slice();
              preRollBuffer = [];
              // Clear detection buffer so we don't re-process the audio that triggered the wakeword
              audioBuffer = [];
              // Reset detector buffers to avoid residual embeddings causing immediate re-triggers
              try { detector.reset(); } catch (err) { logger.debug('Detector reset failed', { error: err.message }); }
              // Ensure any previous timeouts are cleared
              if (recordTimeout) clearTimeout(recordTimeout);
            },
            stopRecordingAction: () => {
              logger.info('⏹️  Recording stopped (state machine exit)');
              isRecording = false;
              // Snapshot the recorded audio and clear buffer promptly so detector can work
              const audioSnapshot = Array.isArray(recordedAudio) ? recordedAudio.slice() : [];
              recordedAudio = [];
              // Fire-and-forget transcription so we don't block the state machine
              (async () => {
                try {
                  await backgroundTranscribe(audioSnapshot);
                } catch (e) {
                  logger.error('stopRecordingAction: backgroundTranscribe error', { error: e && e.message ? e.message : String(e) });
                }
              })();
            },
            enterCooldownAction: () => {
              logger.info('Cooldown started');
              audioBuffer = [];
              try { detector.reset(); } catch (err) { logger.debug('Detector reset failed on cooldown', { error: err && err.message ? err.message : String(err) }); }
            },
            // transcription runs in background via backgroundTranscribe
          }
        });

        const voiceService = interpret(voiceMachine);
        // Subscribe to state updates (v5 interpreter uses subscribe)
        voiceService.subscribe((state) => {
             if (!state) return; // defensive: subscribe may emit undefined on teardown
             const stateValue = state && state.value !== undefined ? state.value : null;
             logger.info('State changed', { state: stateValue });
             if (typeof state.matches === 'function' && state.matches('cooldown')) {
                 try {
                     detector.reset();
                 } catch (err) {
                     logger.debug('Detector reset failed on cooldown', { error: err && err.message ? err.message : String(err) });
                 }
             }
         });
         voiceService.start();

        // On macOS, the 'device' parameter won't work (ALSA is Linux-only)
        const isMacOS = process.platform === 'darwin';
        const micConfig = {
            rate: String(config.audio.sampleRate),
            channels: String(config.audio.channels),
            debug: false,
            exitOnSilence: 6,
        };

        // Only add device parameter on Linux
        if (!isMacOS) {
            micConfig.device = config.audio.micDevice;
        }

        const micInstance = mic(micConfig);
        const micInputStream = micInstance.getAudioStream();
        micInstance.start();

        let audioChunkCount = 0;
        let detectionCount = 0;

        micInputStream.on('data', async (data) => {
            audioChunkCount++;
            // Convert buffer to Float32Array (normalized to -1 to 1)
            const pcm = new Int16Array(data.buffer, data.byteOffset, data.length / Int16Array.BYTES_PER_ELEMENT);
            const normalized = new Float32Array(pcm.length);
            for (let i = 0; i < pcm.length; i++) {
                normalized[i] = pcm[i] / 32768.0;
            }
            audioBuffer = audioBuffer.concat(Array.from(normalized));

            // Process audio in chunks for wake word detection
            // Only attempt wake word detection when machine is in listening state
            while (audioBuffer.length >= CHUNK_SIZE) {
               // Re-evaluate the interpreter snapshot on each chunk so we don't use a stale state
               const svcSnapshot = typeof voiceService.getSnapshot === 'function' ? voiceService.getSnapshot() : voiceService.state;
               if (!svcSnapshot || typeof svcSnapshot.matches !== 'function' || !svcSnapshot.matches('listening')) break;
               const chunk = new Float32Array(audioBuffer.slice(0, CHUNK_SIZE));
               audioBuffer = audioBuffer.slice(CHUNK_SIZE);
                try {
                  // Run wake word detection
                  const score = await detector.detect(chunk);
                  detectionCount++;
                  // Heartbeat: log every 100 detections to show it's working
                  if (detectionCount % 100 === 0) {
                     logger.info('👂 Still listening...', {detections: detectionCount});
                 }
                 // Log scores that are close to threshold (helps tune sensitivity)
                 const svcSnapshot2 = typeof voiceService.getSnapshot === 'function' ? voiceService.getSnapshot() : voiceService.state;
                 if (score > config.openWakeWord.threshold && svcSnapshot2 && typeof svcSnapshot2.matches === 'function' && svcSnapshot2.matches('listening')) {
                   const ts = Date.now();
                   const wakeWord = config.openWakeWord.modelPath.includes('jarvis') ? 'Hey Jarvis' :
                                       config.openWakeWord.modelPath.includes('mycroft') ? 'Hey Mycroft' :
                                       config.openWakeWord.modelPath.includes('alexa') ? 'Alexa' : 'Wake word';
                   logger.info('🎤 Wake word detected!', {
                     wakeWord,
                     score: score.toFixed(3),
                     serviceState: svcSnapshot2 && svcSnapshot2.value ? svcSnapshot2.value : String(svcSnapshot2)
                   });
                   // Signal the state machine to transition to recording with timestamp for guard
                   voiceService.send({ type: 'TRIGGER', ts });
                 }
               } catch (err) {
                   logger.error('Error in wake word detection', { error: err.message });
               }
             }

            // Maintain pre-roll buffer (always keep the last PRE_ROLL_SAMPLES samples)
            if (normalized && normalized.length) {
              preRollBuffer = preRollBuffer.concat(Array.from(normalized));
              if (preRollBuffer.length > PRE_ROLL_SAMPLES) {
                preRollBuffer = preRollBuffer.slice(preRollBuffer.length - PRE_ROLL_SAMPLES);
              }
            }

            // While recording, append the incoming audio to recordedAudio so we can transcribe it later
            if (isRecording) {
               // Append normalized samples into recordedAudio
               if (normalized && normalized.length) {
                 recordedAudio = recordedAudio.concat(Array.from(normalized));
                 // Cap recorded audio to 30s to prevent unbounded growth
                 const maxSamples = SAMPLE_RATE * 30;
                 if (recordedAudio.length > maxSamples) {
                   recordedAudio = recordedAudio.slice(recordedAudio.length - maxSamples);
                 }
               }
             }
           });

        process.on('SIGINT', () => {
            logger.info('SIGINT received, shutting down...');
            micInstance.stop();
            process.exit(0);
        });

        process.on('uncaughtException', (err) => {
            logger.error('Uncaught exception', {error: err.message});
            // Perform any cleanup or graceful shutdown here
            micInstance.stop();
            process.exit(1);
        });

        logger.info('✅ Voice Gateway (OpenWakeWord) is ready');
    } catch (err) {
        logger.error('Failed to initialize Voice Gateway', {error: err.message});
        process.exit(1);
    }
}

// Background transcription helper (fire-and-forget). Accepts a snapshot of normalized samples.
async function backgroundTranscribe(audioSamples) {
  try {
    if (!audioSamples || audioSamples.length < SAMPLE_RATE * 0.15) {
      logger.warn('backgroundTranscribe: audio too short, skipping');
      return;
    }
    // Compute energy check again (defensive)
    let energy = 0;
    for (let i = 0; i < audioSamples.length; i++) energy += audioSamples[i] * audioSamples[i];
    energy = energy / audioSamples.length;
    if (energy < 1e-6) { logger.warn('backgroundTranscribe: audio energy too low, skipping'); return; }

    const wavPath = path.join(process.cwd(), `recorded_bg_${Date.now()}.wav`);
    const writer = new wav.FileWriter(wavPath, { channels: 1, sampleRate: SAMPLE_RATE, bitDepth: 16 });
    const int16Audio = new Int16Array(audioSamples.length);
    for (let i = 0; i < audioSamples.length; i++) {
      int16Audio[i] = Math.max(-32768, Math.min(32767, audioSamples[i] * 32768));
    }
    writer.write(Buffer.from(int16Audio.buffer));
    writer.end();
    await new Promise((res, rej) => {
      writer.on('finish', res);
      writer.on('error', rej);
      // small timeout so writer doesn't hang forever
      setTimeout(() => rej(new Error('wav writer timeout')), 5000);
    });

    const whisperModelRel = config.whisper.modelPath || 'models/ggml-base.bin';
    logger.info('backgroundTranscribe: calling transcribeWithWhisper', { wavPath, model: whisperModelRel });
    try {
      const transcription = await transcribeWithWhisper(whisperModelRel, wavPath, { timeoutMs: 60000 });
      if (transcription && transcription.length) {
        logger.info('📝 Background transcription result', { text: transcription });
      } else {
        logger.warn('⚠️ Background transcription returned empty string');
      }
    } catch (err) {
      logger.error('backgroundTranscribe: transcription failed', { error: err && err.message ? err.message : String(err) });
    } finally {
      try { fs.unlinkSync(wavPath); } catch (e) { /* ignore */ }
    }
  } catch (err) {
    logger.error('backgroundTranscribe failed', { error: err && err.message ? err.message : String(err) });
  }
}

main().catch(err => {
    logger.error('Fatal error in main', {error: err.message});
    process.exit(1);
});
