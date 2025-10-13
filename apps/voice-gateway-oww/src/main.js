/**
 * Voice Gateway with OpenWakeWord - Main Entry Point
 * Orchestrates wake word detection, audio recording, STT, and MQTT communication.
 */

import { config } from './config.js';
import { logger } from './logger.js';
import ort from 'onnxruntime-node';
import mic from 'mic';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import wav from 'wav';
import { createMachine, interpret, assign } from 'xstate';
import { transcribeWithWhisper, newDetectorState, fillMelBufferWithZeros } from '@jrg-voice/common';
import { queryOllama, checkOllamaHealth } from './ollama-client.js';
import { connectMQTT, publishTranscription, publishAIResponse } from './mqtt-client.js';
import { conversationManager } from './conversation-manager.js';
import { synthesizeSpeech, checkPiperHealth } from './piper-tts.js';

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

const writeWavFile = async (wavPath, samples, { channels = 1, sampleRate = SAMPLE_RATE, bitDepth = 16 } = {}) => {
  const writer = new wav.FileWriter(wavPath, { channels, sampleRate, bitDepth });
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
    logger.debug(`Detector reset failed (${context})`, { error: err && err.message ? err.message : String(err) });
  }
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
      const writer = new wav.FileWriter(wavPath, { channels: 1, sampleRate: SAMPLE_RATE, bitDepth: 16 });

      writer.write(pcmAudio);
      writer.end();

      writer.on('finish', () => {
        player = spawn('afplay', [wavPath]);

        player.on('close', (code) => {
          try {
            fs.unlinkSync(wavPath);
          } catch (e) {
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
          } catch (e) {
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
        logger.error('❌ ALSA spawn error', { error: err.message });
        reject(err);
      });
      arecord.on('exit', (code, signal) => {
        logger.debug('📋 arecord exit event', { code, signal, stderr: stderr.trim(), stdout: stdout.trim() });
        code === 0 ? resolve() : reject(new Error(`arecord exited with code ${code}`));
      });
      arecord.on('close', (code) => logger.debug('📋 arecord close event', { code }));
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
    const melResult = await this.melSession.run({ input: new ort.Tensor('float32', audioChunk, [1, MEL_SPEC_MODEL_INPUT_SIZE]) });
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
    const embeddingOutput = Object.values(await this.embeddingSession.run({ input_1: embeddingTensor }))[0];
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
    const wakeWordResult = await this.wakeWordSession.run({ [inputName]: wakeWordTensor });
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

    logger.debug('backgroundTranscribe: calling transcribeWithWhisper', { wavPath, model: whisperModelRel });
    try {
      await writeWavFile(wavPath, audioSamples);
      const transcription = await transcribeWithWhisper(whisperModelRel, wavPath, { timeoutMs: 60000 });

      if (transcription && transcription.length) {
        logger.info(`📝 You said: "${transcription}"`);
        await publishTranscription(transcription, { duration: audioSamples.length / SAMPLE_RATE });

        try {
          conversationManager.addUserMessage(transcription);
          const systemPrompt = 'You are a helpful home automation assistant. Provide concise, friendly responses in English only. Keep answers under 3 sentences. Do not include non-English text in your responses.';
          const messages = conversationManager.getMessages(systemPrompt);
          const convSummary = conversationManager.getSummary();
          logger.debug('Conversation context', convSummary);

          const aiResponse = await queryOllama(null, { messages });
          conversationManager.addAssistantMessage(aiResponse);

          logger.info(`🤖 AI Response: "${aiResponse}"`);
          await publishAIResponse(transcription, aiResponse, {
            model: config.ollama.model,
            conversationTurns: Math.floor(convSummary.totalMessages / 2)
          });

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
      logger.error('backgroundTranscribe: transcription failed', { error: err && err.message ? err.message : String(err) });
    } finally {
      try {
        fs.unlinkSync(wavPath);
      } catch {
        /* ignore */
      }
    }
  } catch (err) {
    logger.error('backgroundTranscribe failed', { error: err && err.message ? err.message : String(err) });
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
    logger.error('❌ Failed to connect to MQTT broker', { error: err.message });
    logger.warn('⚠️ Continuing without MQTT - AI responses will be logged only');
  }

  // Ollama
  try {
    const ollamaReady = await checkOllamaHealth();
    if (!ollamaReady) logger.warn('⚠️ Ollama not ready - AI responses may fail');
  } catch (err) {
    logger.error('❌ Ollama health check failed', { error: err.message });
    logger.warn('⚠️ Continuing without Ollama - transcriptions will work but no AI responses');
  }

  // Piper TTS
  if (config.tts.enabled) {
    try {
      const piperReady = await checkPiperHealth();
      if (!piperReady) {
        logger.warn('⚠️ Piper TTS not ready - AI responses will not be spoken');
        logger.warn('⚠️ Install with: pip install piper-tts');
        logger.warn('⚠️ Download voice with: python3 -m piper.download_voices en_US-amy-medium');
      }
    } catch (err) {
      logger.error('❌ Piper TTS health check failed', { error: err.message });
      logger.warn('⚠️ Continuing without TTS - AI responses will be text only');
    }
  }

  // ALSA device check (Linux only)
  if (isLinux) {
    try {
      await checkAlsaDevice(config.audio.micDevice, config.audio.sampleRate, config.audio.channels);
    } catch (err) {
      logger.error('❌ ALSA device check failed', { device: config.audio.micDevice, error: err.message });
      logger.warn('⚠️  Continuing anyway - mic library will try to use device');
    }
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
              TRIGGER: [{ cond: 'canTrigger', target: 'recording', actions: 'recordTriggered' }, { actions: 'logTriggerBlocked' }]
            }
          },
          recording: {
            entry: ['startRecordingAction'],
            exit: ['stopRecordingAction'],
            on: { SILENCE_DETECTED: 'cooldown', MAX_LENGTH_REACHED: 'cooldown', FORCE_STOP: 'cooldown' }
          },
          cooldown: {
            entry: ['enterCooldownAction'],
            after: { 1500: 'listening' }
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
            logger.debug('Trigger blocked by guard', { now, lastTrigger: last, minRearmMs: minMs, elapsed: now - last });
          },
          recordTriggered: assign({ lastTrigger: (ctx, evt) => (evt && evt.ts) ? evt.ts : Date.now() }),
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
                logger.error('stopRecordingAction: backgroundTranscribe error', { error: e && e.message ? e.message : String(e) });
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
      logger.debug('State changed', { state: stateValue });
      if (typeof state.matches === 'function' && state.matches('cooldown')) safeDetectorReset(detector, 'cooldown-subscribe');
    });
    voiceService.start();

    // Mic config (device only on Linux)
    const micConfig = { rate: String(config.audio.sampleRate), channels: String(config.audio.channels), debug: false, exitOnSilence: 6 };
    if (!isMacOS) micConfig.device = config.audio.micDevice;

    const micInstance = mic(micConfig);
    const micInputStream = micInstance.getAudioStream();

    micInputStream.on('error', (err) => logger.error('❌ Microphone stream error', { error: err.message }));

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

      if (isLinux && audioChunkCount % 100 === 0) logger.debug('🎙️ Microphone still streaming', { chunks: audioChunkCount, bufferSize: data.length });

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
          if (detectionCount % 100 === 0) logger.debug('👂 Still listening...', { detections: detectionCount });

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
            logger.info('🎤 Wake word detected!', {
              wakeWord,
              score: score.toFixed(3),
              serviceState: snapshot2 && snapshot2.value ? snapshot2.value : String(snapshot2)
            });
            voiceService.send({ type: 'TRIGGER', ts });
          }
        } catch (err) {
          logger.error('Error in wake word detection', { error: err.message });
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
        if (energy < 0.001) {
          silenceSampleCount += normalized.length;
          const silenceDurationMs = Math.floor((silenceSampleCount / SAMPLE_RATE) * 1000);
          if (silenceDurationMs % 500 === 0) {
            logger.debug('🔇 Detecting silence', { energy: energy.toFixed(6), threshold: 0.001, silenceDurationMs });
          }
          if (silenceSampleCount >= SILENCE_SAMPLES_REQUIRED) {
            logger.debug('🔇 Silence detected, stopping recording', {
              silenceDurationMs: Math.floor((silenceSampleCount / SAMPLE_RATE) * 1000),
              totalRecordingMs: Math.floor((recordedAudio.length / SAMPLE_RATE) * 1000)
            });
            voiceService.send({ type: 'SILENCE_DETECTED' });
          }
        } else {
          if (silenceSampleCount > 0) {
            logger.debug('🗣️ Speech detected, resetting silence counter', {
              energy: energy.toFixed(6),
              threshold: 0.001,
              silenceDurationMs: Math.floor((silenceSampleCount / SAMPLE_RATE) * 1000)
            });
          }
          silenceSampleCount = 0;
        }

        if (recordedAudio.length >= MAX_RECORDING_SAMPLES) {
          logger.debug('⏱️ Maximum recording length reached, stopping', { durationMs: Math.floor((recordedAudio.length / SAMPLE_RATE) * 1000) });
          voiceService.send({ type: 'MAX_LENGTH_REACHED' });
        }
      }
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down...');
      micInstance.stop();
      process.exit(0);
    });

    process.on('uncaughtException', (err) => {
      logger.error('Uncaught exception', { error: err.message });
      micInstance.stop();
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
    logger.error('Failed to initialize Voice Gateway', { error: err.message });
    process.exit(1);
  }
}

main().catch((err) => {
  logger.error('Fatal error in main', { error: err.message });
  process.exit(1);
});
