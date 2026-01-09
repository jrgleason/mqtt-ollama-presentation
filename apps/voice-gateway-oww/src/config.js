// filepath: /Users/jrg/code/CodeMash/mqtt-ollama-presentation/apps/voice-gateway-oww/src/config.js
/**
 * Configuration loader and validator
 */

import dotenv from 'dotenv';
import { WAKE_WORD_THRESHOLD } from './constants/thresholds.js';
import { MCP_RETRY_BASE_DELAY_MS } from './constants/timing.js';

// Load .env file (quiet mode to suppress verbose logging)
dotenv.config({ quiet: true });

// Parse command-line arguments
// Support: npm run dev --ollama (default is Anthropic)
const cliArgs = process.argv.slice(2);
const useOllama = cliArgs.includes('--ollama');

// Model registry - maps short aliases to full configuration
// Use short aliases like 'jarvis' or 'robot' in OWW_MODEL_PATH
const MODEL_CONFIGS = {
    'jarvis': {
        filename: 'hey_jarvis_v0.1.onnx',
        path: 'models/hey_jarvis_v0.1.onnx',
        embeddingFrames: 16,
        description: 'Hey Jarvis wake word',
    },
    'robot': {
        filename: 'hello_robot.onnx',
        path: 'models/hello_robot.onnx',
        embeddingFrames: 28,
        description: 'Hello Robot wake word',
    },
    // Add more models here as needed
    // Example:
    // 'mycroft': {
    //     filename: 'hey_mycroft.onnx',
    //     path: 'models/hey_mycroft.onnx',
    //     embeddingFrames: 16,
    //     description: 'Hey Mycroft wake word',
    // },
};

const config = {
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
    openWakeWord: {
        modelPath: process.env.OWW_MODEL_PATH,
        threshold: process.env.OWW_THRESHOLD ? Number(process.env.OWW_THRESHOLD) : WAKE_WORD_THRESHOLD,
        inferenceFramework: process.env.OWW_INFERENCE_FRAMEWORK || 'onnx',
        // Auto-detect embedding frames based on model, or allow manual override
        embeddingFrames: process.env.OWW_EMBEDDING_FRAMES ? Number(process.env.OWW_EMBEDDING_FRAMES) : null,
        // Detector warm-up duration (ms) after embedding buffer fills
        // Reduced from 2500ms to 1500ms for faster boot time
        warmupMs: process.env.DETECTOR_WARMUP_MS ? Number(process.env.DETECTOR_WARMUP_MS) : 1500,
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
        silenceThreshold: process.env.VAD_SILENCE_THRESHOLD ? Number(process.env.VAD_SILENCE_THRESHOLD) : undefined,
        trailingSilenceMs: process.env.VAD_TRAILING_SILENCE_MS ? Number(process.env.VAD_TRAILING_SILENCE_MS) : 1500,
        maxUtteranceMs: process.env.VAD_MAX_UTTERANCE_MS ? Number(process.env.VAD_MAX_UTTERANCE_MS) : 10000,
        minSpeechMs: process.env.VAD_MIN_SPEECH_MS ? Number(process.env.VAD_MIN_SPEECH_MS) : 700,
        graceBeforeStopMs: process.env.VAD_GRACE_BEFORE_STOP_MS ? Number(process.env.VAD_GRACE_BEFORE_STOP_MS) : 1200,
    },
    whisper: {
        model: process.env.WHISPER_MODEL || 'base',
        modelPath: process.env.WHISPER_MODEL_PATH || 'models/ggml-base.bin',
        // Performance optimizations
        threads: process.env.WHISPER_THREADS ? Number(process.env.WHISPER_THREADS) : 4,
        language: process.env.WHISPER_LANGUAGE || 'en', // Skip language detection
        beamSize: process.env.WHISPER_BEAM_SIZE ? Number(process.env.WHISPER_BEAM_SIZE) : 1, // Greedy decoding
        bestOf: process.env.WHISPER_BEST_OF ? Number(process.env.WHISPER_BEST_OF) : 1, // Greedy decoding
    },
    mqtt: {
        brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
        // Always append random suffix to prevent connection cycling when running multiple instances
        clientId: `${process.env.MQTT_CLIENT_ID || 'voice-gateway-oww'}-${Math.random().toString(16).slice(2, 8)}`,
        username: process.env.MQTT_USERNAME,
        password: process.env.MQTT_PASSWORD,
    },
    healthCheck: {
        port: process.env.HEALTHCHECK_PORT ? Number(process.env.HEALTHCHECK_PORT) : 3002,
    },
    mcp: {
        retryAttempts: process.env.MCP_RETRY_ATTEMPTS ? Number(process.env.MCP_RETRY_ATTEMPTS) : 2,
        retryBaseDelay: process.env.MCP_RETRY_BASE_DELAY ? Number(process.env.MCP_RETRY_BASE_DELAY) : MCP_RETRY_BASE_DELAY_MS,
    },
    ai: {
        // Default to Anthropic unless --ollama flag is passed or AI_PROVIDER is set to 'ollama'
        provider: useOllama ? 'ollama' : (process.env.AI_PROVIDER || 'anthropic'),
        // Custom system prompt (optional) - if not set, uses default from AIRouter
        systemPrompt: process.env.AI_SYSTEM_PROMPT,
    },
    anthropic: {
        apiKey: process.env.ANTHROPIC_API_KEY,
        // Valid Claude 4.5 models: claude-haiku-4-5-20251001, claude-sonnet-4-5-20250929, claude-opus-4-5-20251101
        model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
    },
    ollama: {
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        model: process.env.OLLAMA_MODEL || 'qwen2.5:0.5b',
        // Disable thinking mode for qwen3 models (faster but less accurate)
        noThink: process.env.OLLAMA_NO_THINK === 'true',
        // Performance settings
        numCtx: process.env.OLLAMA_NUM_CTX ? Number(process.env.OLLAMA_NUM_CTX) : 2048,
        temperature: process.env.OLLAMA_TEMPERATURE ? Number(process.env.OLLAMA_TEMPERATURE) : 0.5,
        keepAlive: process.env.OLLAMA_KEEP_ALIVE !== undefined ? Number(process.env.OLLAMA_KEEP_ALIVE) : -1,
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
        voiceId: process.env.ELEVENLABS_VOICE_ID || '2i0Vtk39FYVTw6Tx1mC9', // Default: George (deep, authoritative male)
        modelId: process.env.ELEVENLABS_MODEL_ID || 'eleven_v3',
        stability: process.env.ELEVENLABS_STABILITY ? Number(process.env.ELEVENLABS_STABILITY) : 0.5,
        similarityBoost: process.env.ELEVENLABS_SIMILARITY_BOOST ? Number(process.env.ELEVENLABS_SIMILARITY_BOOST) : 0.75,
        style: process.env.ELEVENLABS_STYLE ? Number(process.env.ELEVENLABS_STYLE) : 0.0,
        useSpeakerBoost: process.env.ELEVENLABS_USE_SPEAKER_BOOST !== 'false',
    },
};

/**
 * Resolve model alias or path to full configuration
 * @param {string} input - Model alias (e.g., "jarvis") or full path (e.g., "models/hey_jarvis_v0.1.onnx")
 * @returns {Object} Model configuration with path, filename, embeddingFrames, description
 */
function resolveModelConfig(input) {
    if (!input) {
        throw new Error('OWW_MODEL_PATH is required');
    }

    // First, check if input is a known alias (case-insensitive)
    const lowerInput = input.toLowerCase();
    if (MODEL_CONFIGS[lowerInput]) {
        const config = MODEL_CONFIGS[lowerInput];
        console.log(`✅ Resolved model alias '${input}' → ${config.path}`);
        return {
            resolvedPath: config.path,
            filename: config.filename,
            embeddingFrames: config.embeddingFrames,
            description: config.description,
        };
    }

    // Not an alias, treat as a path - extract filename and try to look it up
    const filename = input.split('/').pop();

    // Search MODEL_CONFIGS by filename
    for (const [alias, config] of Object.entries(MODEL_CONFIGS)) {
        if (config.filename === filename) {
            console.log(`✅ Recognized model file '${filename}' (alias: ${alias})`);
            return {
                resolvedPath: input, // Use provided path
                filename: config.filename,
                embeddingFrames: config.embeddingFrames,
                description: config.description,
            };
        }
    }

    // Unknown model - use defaults and warn
    console.warn(`⚠️  Unknown wake word model: ${input}`);
    console.warn('   Using default embedding frames: 16');
    console.warn('   Available aliases:', Object.keys(MODEL_CONFIGS).join(', '));
    console.warn('   Recognized filenames:', Object.values(MODEL_CONFIGS).map(c => c.filename).join(', '));

    return {
        resolvedPath: input, // Use as-is
        filename: filename,
        embeddingFrames: 16,
        description: 'Custom model',
    };
}

// Resolve model alias/path and add computed model-specific settings
const modelConfig = resolveModelConfig(config.openWakeWord.modelPath);
config.openWakeWord.modelPath = modelConfig.resolvedPath; // Update to resolved full path
config.openWakeWord.modelFilename = modelConfig.filename;
config.openWakeWord.embeddingFrames = config.openWakeWord.embeddingFrames || modelConfig.embeddingFrames;
config.openWakeWord.modelDescription = modelConfig.description;

export {config, resolveModelConfig, MODEL_CONFIGS};

// Validate configuration
if (config.openWakeWord.threshold < 0 || config.openWakeWord.threshold > 1) {
    throw new Error('OWW_THRESHOLD must be between 0 and 1');
}

if (config.audio.sampleRate !== 16000) {
    console.warn('⚠️  Warning: Sample rate is not 16000 Hz. OpenWakeWord expects 16kHz audio.');
}

