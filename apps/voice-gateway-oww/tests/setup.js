/**
 * Jest Test Setup
 * Sets minimal environment variables required for testing
 */

// Set minimal required environment variables for config.js
process.env.OWW_MODEL_PATH = process.env.OWW_MODEL_PATH || 'jarvis';
process.env.AI_PROVIDER = process.env.AI_PROVIDER || 'ollama';
process.env.TTS_PROVIDER = process.env.TTS_PROVIDER || 'piper';
process.env.WHISPER_MODEL_PATH = process.env.WHISPER_MODEL_PATH || './models/ggml-tiny.bin';
process.env.OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:0.5b';
process.env.PIPER_MODEL_PATH = process.env.PIPER_MODEL_PATH || './models/piper/en_US-amy-low.onnx';
