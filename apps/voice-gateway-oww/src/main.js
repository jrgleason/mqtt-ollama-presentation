/**
 * Voice Gateway with OpenWakeWord - Main Entry Point
 *
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

// OpenWakeWord audio processing constants
const SAMPLE_RATE = 16000;
const CHUNK_SIZE = 1280; // 80ms at 16kHz (16000 * 0.08)
const MEL_SPEC_MODEL_INPUT_SIZE = 1280;

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

    // Mel spectrogram buffer (76 frames x 32 mel bins)
    // Initialize with zeros
    this.melBuffer = Array(76).fill(null).map(() => new Float32Array(32).fill(0));
    this.melBufferFilled = false;

    // Embedding buffer (accumulate 16 embeddings over time)
    this.embeddingBuffer = [];
    this.embeddingBufferFilled = false;

    this.framesSinceLastPrediction = 0;
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

  async detect(audioChunk) {
    // Ensure audio chunk is the right size
    if (audioChunk.length !== MEL_SPEC_MODEL_INPUT_SIZE) {
      throw new Error(`Audio chunk must be ${MEL_SPEC_MODEL_INPUT_SIZE} samples`);
    }

    // Step 1: Convert audio to mel spectrogram
    // melspectrogram.onnx expects input tensor named 'input' with shape [1, 1280]
    const audioTensor = new ort.Tensor('float32', audioChunk, [1, MEL_SPEC_MODEL_INPUT_SIZE]);
    const melResult = await this.melSession.run({ input: audioTensor });
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
    const embeddingResult = await this.embeddingSession.run({ input_1: embeddingTensor });
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
    const wakeWordResult = await this.wakeWordSession.run({ [wakeWordInputName]: wakeWordTensor });
    const score = Object.values(wakeWordResult)[0].data[0];

    return score;
  }
}

async function main() {
  logger.info('🚀 Voice Gateway (OpenWakeWord) starting...');

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
    let isRecording = false;
    let recordedAudio = [];
    let recordTimeout = null;

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
      while (audioBuffer.length >= CHUNK_SIZE && !isRecording) {
        const chunk = new Float32Array(audioBuffer.slice(0, CHUNK_SIZE));
        audioBuffer = audioBuffer.slice(CHUNK_SIZE);

        try {
          // Run wake word detection
          const score = await detector.detect(chunk);
          detectionCount++;

          // Heartbeat: log every 100 detections to show it's working
          if (detectionCount % 100 === 0) {
            logger.info('👂 Still listening...', { detections: detectionCount });
          }

          // Log scores that are close to threshold (helps tune sensitivity)
          // Show scores between 0.1 and threshold, and anything above threshold
          if (score > 0.1) {
            const status = score >= config.openWakeWord.threshold ? '🎯 Above threshold!' :
                          score > 0.2 ? '⚡ Getting close' :
                          '📊 Low but detected';
            logger.info('Score detected', {
              score: score.toFixed(3),
              threshold: config.openWakeWord.threshold,
              status
            });
          }

          if (score > config.openWakeWord.threshold && !isRecording) {
            const wakeWord = config.openWakeWord.modelPath.includes('jarvis') ? 'Hey Jarvis' :
                            config.openWakeWord.modelPath.includes('mycroft') ? 'Hey Mycroft' :
                            config.openWakeWord.modelPath.includes('alexa') ? 'Alexa' : 'Wake word';
            logger.info('🎤 Wake word detected!', {
              wakeWord,
              score: score.toFixed(3)
            });
            isRecording = true;
            recordedAudio = [];
            audioBuffer = []; // Clear buffer to avoid duplicate processing

            // Record for 5 seconds
            recordTimeout = setTimeout(async () => {
              isRecording = false;
              logger.info('⏹️  Recording stopped');

              // Write recorded audio to WAV file
              const wavPath = path.join(process.cwd(), 'recorded.wav');
              const writer = new wav.FileWriter(wavPath, {
                channels: 1,
                sampleRate: SAMPLE_RATE,
                bitDepth: 16
              });

              // Convert float32 back to int16
              const int16Audio = new Int16Array(recordedAudio.length);
              for (let i = 0; i < recordedAudio.length; i++) {
                int16Audio[i] = Math.max(-32768, Math.min(32767, recordedAudio[i] * 32768));
              }

              const buffer = Buffer.from(int16Audio.buffer);
              writer.write(buffer);
              writer.end();

              writer.on('finish', () => {
                // Run whisper.cpp using whisper-cli
                const whisperModelRel = config.whisper.modelPath || 'models/ggml-base.bin';
                const whisperModelAbs = path.isAbsolute(whisperModelRel)
                  ? whisperModelRel
                  : path.resolve(process.cwd(), whisperModelRel);

                const whisper = spawn('whisper-cli', ['-m', whisperModelAbs, '-f', wavPath, '-nt']);
                let transcript = '';

                whisper.stdout.on('data', (data) => {
                  transcript += data.toString();
                });

                whisper.stderr.on('data', (data) => {
                  // Whisper outputs debug info to stderr - ignore it
                });

                whisper.on('close', (code) => {
                  const transcription = transcript.trim();
                  if (transcription) {
                    logger.info('📝 Transcription:', { text: transcription });
                  } else {
                    logger.warn('⚠️ No transcription generated');
                  }

                  // Delete the wav file
                  try {
                    fs.unlinkSync(wavPath);
                  } catch (err) {
                    // Ignore cleanup errors
                  }
                });
              });
            }, 5000);
          }
        } catch (err) {
          logger.error('Error during wake word detection', { error: err.message });
        }
      }

      if (isRecording) {
        recordedAudio = recordedAudio.concat(Array.from(normalized));
      }
    });


    process.on('SIGINT', async () => {
      logger.info('Shutting down gracefully...');
      try {
        micInstance.stop();
        // Give mic time to stop cleanly
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        logger.error('Error stopping microphone', { error: err.message });
      }
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start Voice Gateway', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

main();

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
  process.exit(1);
});
