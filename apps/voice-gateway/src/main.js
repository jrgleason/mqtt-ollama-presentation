/**
 * Voice Gateway - Main Entry Point
 *
 * Orchestrates wake word detection, audio recording, STT, and MQTT communication.
 */

import { config } from './config.js';
import { logger } from './logger.js';
import { Porcupine } from '@picovoice/porcupine-node';
import mic from 'mic';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import wav from 'wav';

async function main() {
  logger.info('Voice Gateway starting...', {
    nodeEnv: config.nodeEnv,
    mqttBroker: config.mqtt.brokerUrl,
    micDevice: config.audio.micDevice,
    wakeWord: config.porcupine.keywordPath,
  });

  try {
    // Determine Porcupine keyword: fallback to built-in 'computer' if keywordPath is not set
    const keyword = config.porcupine.keywordPath ? config.porcupine.keywordPath : 'computer';
    const sensitivity = config.porcupine.sensitivity !== undefined ? config.porcupine.sensitivity : 0.5;

    const porcupine = new Porcupine(
      config.porcupine.accessKey,
      [keyword],
      [sensitivity]
    );

    const frameLength = porcupine.frameLength;
    let audioBuffer = [];

    const micInstance = mic({
      rate: '16000',
      channels: '1',
      debug: false,
      exitOnSilence: 6
    });
    const micInputStream = micInstance.getAudioStream();
    micInstance.start();

    let isRecording = false;
    let recordedAudio = [];
    let recordTimeout = null;

    micInputStream.on('data', (data) => {
      // Convert buffer to Int16Array
      const pcm = new Int16Array(data.buffer, data.byteOffset, data.length / Int16Array.BYTES_PER_ELEMENT);
      audioBuffer = audioBuffer.concat(Array.from(pcm));
      while (audioBuffer.length >= frameLength) {
        const frame = audioBuffer.slice(0, frameLength);
        audioBuffer = audioBuffer.slice(frameLength);
        const keywordIndex = porcupine.process(Int16Array.from(frame));
        if (keywordIndex >= 0 && !isRecording) {
          logger.info('Wake word detected! Starting recording...');
          isRecording = true;
          recordedAudio = [];
          // Record for 5 seconds
          recordTimeout = setTimeout(async () => {
            isRecording = false;
            logger.info('Recording stopped. Transcribing...');
            // Write recorded audio to WAV file
            const wavPath = path.join(process.cwd(), 'recorded.wav');
            const writer = new wav.FileWriter(wavPath, {
              channels: 1,
              sampleRate: 16000,
              bitDepth: 16
            });
            const buffer = Buffer.from(Int16Array.from(recordedAudio).buffer);
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
                logger.error('Whisper error:', { error: data.toString() });
              });
              whisper.on('close', (code) => {
                logger.info('Transcription result:');
                console.log(transcript.trim());
                // Optionally delete the wav file
                fs.unlinkSync(wavPath);
              });
            });
          }, 5000);
        }
        if (isRecording) {
          recordedAudio = recordedAudio.concat(frame);
        }
      }
    });

    logger.info('✅ Voice Gateway started successfully');
    logger.info(`🎤 Listening for wake word: "${keyword}"`);

    process.on('SIGINT', async () => {
      logger.info('Shutting down gracefully...');
      micInstance.stop();
      porcupine.release();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start Voice Gateway', { error });
    process.exit(1);
  }
}

main();

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
  process.exit(1);
});
