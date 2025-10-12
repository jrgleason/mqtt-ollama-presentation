/**
 * Configuration loader and validator
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env file
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const keywordPath = process.env.PORCUPINE_KEYWORD_PATH
  ? path.resolve(projectRoot, process.env.PORCUPINE_KEYWORD_PATH)
  : undefined;

const config = {
  nodeEnv: process.env.NODE_ENV,
  logLevel: process.env.LOG_LEVEL,
  porcupine: {
    accessKey: process.env.PORCUPINE_ACCESS_KEY,
    keywordPath,
    sensitivity: process.env.PORCUPINE_SENSITIVITY ? Number(process.env.PORCUPINE_SENSITIVITY) : undefined,
  },
  audio: {
    micDevice: process.env.AUDIO_MIC_DEVICE,
    speakerDevice: process.env.AUDIO_SPEAKER_DEVICE,
    sampleRate: process.env.AUDIO_SAMPLE_RATE ? Number(process.env.AUDIO_SAMPLE_RATE) : undefined,
  },
  vad: {
    trailingSilenceMs: process.env.VAD_TRAILING_SILENCE_MS ? Number(process.env.VAD_TRAILING_SILENCE_MS) : undefined,
    maxUtteranceMs: process.env.VAD_MAX_UTTERANCE_MS ? Number(process.env.VAD_MAX_UTTERANCE_MS) : undefined,
  },
  whisper: {
    model: process.env.WHISPER_MODEL,
    modelPath: process.env.WHISPER_MODEL_PATH,
  },
  mqtt: {
    brokerUrl: process.env.MQTT_BROKER_URL,
    clientId: process.env.MQTT_CLIENT_ID,
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
  },
  healthCheck: {
    port: process.env.HEALTHCHECK_PORT ? Number(process.env.HEALTHCHECK_PORT) : undefined,
  },
};

export { config };

// Validate configuration
if (config.porcupine.sensitivity < 0 || config.porcupine.sensitivity > 1) {
  throw new Error('PORCUPINE_SENSITIVITY must be between 0 and 1');
}

if (config.audio.sampleRate !== 16000) {
  console.warn('⚠️  Warning: Sample rate is not 16000 Hz. Whisper and Porcupine expect 16kHz audio.');
}
