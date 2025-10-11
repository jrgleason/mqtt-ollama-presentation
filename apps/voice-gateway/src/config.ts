/**
 * Configuration loader and validator
 */

import dotenv from 'dotenv';

// Load .env file
dotenv.config();

export interface Config {
  nodeEnv: string;
  logLevel: string;

  porcupine: {
    accessKey: string;
    keyword: string;
    sensitivity: number;
  };

  audio: {
    micDevice: string;
    speakerDevice: string;
    sampleRate: number;
  };

  vad: {
    trailingSilenceMs: number;
    maxUtteranceMs: number;
  };

  whisper: {
    model: string;
    modelPath: string;
  };

  mqtt: {
    brokerUrl: string;
    clientId: string;
    username?: string;
    password?: string;
  };

  healthCheck: {
    port: number;
  };
}

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

export const config: Config = {
  nodeEnv: getEnv('NODE_ENV', 'development'),
  logLevel: getEnv('LOG_LEVEL', 'info'),

  porcupine: {
    accessKey: getEnv('PORCUPINE_ACCESS_KEY'),
    keyword: getEnv('PORCUPINE_KEYWORD', 'computer'),
    sensitivity: parseFloat(getEnv('PORCUPINE_SENSITIVITY', '0.5')),
  },

  audio: {
    micDevice: getEnv('ALSA_MIC_DEVICE', 'hw:2,0'),
    speakerDevice: getEnv('ALSA_SPEAKER_DEVICE', 'hw:1,0'),
    sampleRate: getEnvNumber('SAMPLE_RATE', 16000),
  },

  vad: {
    trailingSilenceMs: getEnvNumber('VAD_TRAILING_SILENCE_MS', 1500),
    maxUtteranceMs: getEnvNumber('VAD_MAX_UTTERANCE_MS', 10000),
  },

  whisper: {
    model: getEnv('WHISPER_MODEL', 'base'),
    modelPath: getEnv('WHISPER_MODEL_PATH', './models/ggml-base.bin'),
  },

  mqtt: {
    brokerUrl: getEnv('MQTT_BROKER_URL', 'mqtt://10.0.0.58:31883'),
    clientId: getEnv('MQTT_CLIENT_ID', 'voice-gateway'),
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
  },

  healthCheck: {
    port: getEnvNumber('HEALTH_CHECK_PORT', 3001),
  },
};

// Validate configuration
if (config.porcupine.sensitivity < 0 || config.porcupine.sensitivity > 1) {
  throw new Error('PORCUPINE_SENSITIVITY must be between 0 and 1');
}

if (config.audio.sampleRate !== 16000) {
  console.warn('⚠️  Warning: Sample rate is not 16000 Hz. Whisper and Porcupine expect 16kHz audio.');
}
