// filepath: /Users/jrg/code/CodeMash/mqtt-ollama-presentation/apps/voice-gateway-oww/src/config.js
/**
 * Configuration loader and validator
 */

import dotenv from 'dotenv';

// Load .env file
dotenv.config();

// Parse command-line arguments
// Support: npm run dev --ollama (default is Anthropic)
const cliArgs = process.argv.slice(2);
const useOllama = cliArgs.includes('--ollama');

const config = {
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
    openWakeWord: {
        modelPath: process.env.OWW_MODEL_PATH || 'models/hey_jarvis_v0.1.onnx',
        threshold: process.env.OWW_THRESHOLD ? Number(process.env.OWW_THRESHOLD) : 0.5,
        inferenceFramework: process.env.OWW_INFERENCE_FRAMEWORK || 'onnx',
    },
    audio: {
        micDevice: process.env.AUDIO_MIC_DEVICE || 'hw:2,0',
        speakerDevice: process.env.AUDIO_SPEAKER_DEVICE,
        sampleRate: process.env.AUDIO_SAMPLE_RATE ? Number(process.env.AUDIO_SAMPLE_RATE) : 16000,
        channels: process.env.AUDIO_CHANNELS ? Number(process.env.AUDIO_CHANNELS) : 1,
        triggerCooldownMs: process.env.AUDIO_TRIGGER_COOLDOWN_MS ? Number(process.env.AUDIO_TRIGGER_COOLDOWN_MS) : 1500,
        beepVolume: process.env.BEEP_VOLUME ? Number(process.env.BEEP_VOLUME) : 0.3,
    },
    vad: {
        trailingSilenceMs: process.env.VAD_TRAILING_SILENCE_MS ? Number(process.env.VAD_TRAILING_SILENCE_MS) : 1500,
        maxUtteranceMs: process.env.VAD_MAX_UTTERANCE_MS ? Number(process.env.VAD_MAX_UTTERANCE_MS) : 10000,
        minSpeechMs: process.env.VAD_MIN_SPEECH_MS ? Number(process.env.VAD_MIN_SPEECH_MS) : 700,
        graceBeforeStopMs: process.env.VAD_GRACE_BEFORE_STOP_MS ? Number(process.env.VAD_GRACE_BEFORE_STOP_MS) : 1200,
    },
    whisper: {
        model: process.env.WHISPER_MODEL || 'base',
        modelPath: process.env.WHISPER_MODEL_PATH || 'models/ggml-base.bin',
    },
    mqtt: {
        brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
        clientId: process.env.MQTT_CLIENT_ID || `voice-gateway-oww-${Math.random().toString(16).slice(2, 8)}`,
        username: process.env.MQTT_USERNAME,
        password: process.env.MQTT_PASSWORD,
    },
    healthCheck: {
        port: process.env.HEALTHCHECK_PORT ? Number(process.env.HEALTHCHECK_PORT) : 3002,
    },
    ai: {
        // Default to Anthropic unless --ollama flag is passed or AI_PROVIDER is set to 'ollama'
        provider: useOllama ? 'ollama' : (process.env.AI_PROVIDER || 'anthropic'),
    },
    anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
    },
    ollama: {
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        model: process.env.OLLAMA_MODEL || 'qwen2.5:0.5b',
    },
    tts: {
        enabled: process.env.TTS_ENABLED !== 'false', // Default to enabled
        provider: process.env.TTS_PROVIDER || 'ElevenLabs',
        volume: process.env.TTS_VOLUME ? Number(process.env.TTS_VOLUME) : 1.0,
        speed: process.env.TTS_SPEED ? Number(process.env.TTS_SPEED) : 1.0,
        modelPath: process.env.TTS_MODEL_PATH || 'models/piper/voice.onnx', // Used by Piper
        streaming: process.env.TTS_STREAMING !== 'false', // Enable streaming by default
    },
    elevenlabs: {
        apiKey: process.env.ELEVENLABS_API_KEY,
        voiceId: process.env.ELEVENLABS_VOICE_ID || 'UgBBYS2sOqTuMpoF3BR0', // Default: George (deep, authoritative male)
        modelId: process.env.ELEVENLABS_MODEL_ID || 'eleven_v3',
        stability: process.env.ELEVENLABS_STABILITY ? Number(process.env.ELEVENLABS_STABILITY) : 0.5,
        similarityBoost: process.env.ELEVENLABS_SIMILARITY_BOOST ? Number(process.env.ELEVENLABS_SIMILARITY_BOOST) : 0.75,
        style: process.env.ELEVENLABS_STYLE ? Number(process.env.ELEVENLABS_STYLE) : 0.0,
        useSpeakerBoost: process.env.ELEVENLABS_USE_SPEAKER_BOOST !== 'false',
    },
};

export {config};

// Validate configuration
if (config.openWakeWord.threshold < 0 || config.openWakeWord.threshold > 1) {
    throw new Error('OWW_THRESHOLD must be between 0 and 1');
}

if (config.audio.sampleRate !== 16000) {
    console.warn('⚠️  Warning: Sample rate is not 16000 Hz. OpenWakeWord expects 16kHz audio.');
}

// Log AI provider configuration
console.log('🤖 AI Provider:', {
    provider: config.ai.provider,
    model: config.ai.provider === 'anthropic' ? config.anthropic.model : config.ollama.model,
    hasApiKey: config.ai.provider === 'anthropic' ? !!config.anthropic.apiKey : 'N/A (local)',
});

// Log Anthropic API key details for debugging (if using Anthropic)
if (config.ai.provider === 'anthropic') {
    console.log('🔑 Anthropic API Key Configuration:', {
        hasApiKey: !!config.anthropic.apiKey,
        apiKeyLength: config.anthropic.apiKey?.length || 0,
        apiKeyPreview: config.anthropic.apiKey
            ? `${config.anthropic.apiKey.substring(0, 8)}...${config.anthropic.apiKey.slice(-4)}`
            : 'NOT_SET',
        envVarSet: !!process.env.ANTHROPIC_API_KEY,
    });
}

// Log TTS configuration for debugging
console.log('🔊 TTS Configuration:', {
    enabled: config.tts.enabled,
    speed: config.tts.speed,
    volume: config.tts.volume,
    provider: config.tts.provider,
});

if (config.tts.provider === 'ElevenLabs') {
    console.log('🌐 ElevenLabs Configuration:', {
        hasApiKey: !!config.elevenlabs.apiKey,
        apiKeyLength: config.elevenlabs.apiKey?.length || 0,
        apiKeyPreview: config.elevenlabs.apiKey ? `${config.elevenlabs.apiKey.substring(0, 8)}...` : 'NOT_SET',
        voiceId: config.elevenlabs.voiceId,
        modelId: config.elevenlabs.modelId,
        stability: config.elevenlabs.stability,
        similarityBoost: config.elevenlabs.similarityBoost,
        style: config.elevenlabs.style,
        useSpeakerBoost: config.elevenlabs.useSpeakerBoost,
    });
}
