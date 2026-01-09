import {errMsg, logger} from "./Logger.js";
import {config} from '../config.js';
import path from 'path';
import {checkOllamaHealth} from '../OllamaClient.js';
import {checkAnthropicHealth} from '../AnthropicClient.js';
import {connectMQTT} from '../mqttClient.js';
import {ElevenLabsTTS} from "./ElevenLabsTTS.js";
import {synthesizeSpeech as piperSynthesize} from '../piperTTS.js';
import {checkAlsaDevice} from "../audio/AudioUtils.js";
import {AudioPlayer} from "../audio/AudioPlayer.js";
import {safeDetectorReset} from "./XStateHelpers.js";
import {OpenWakeWordDetector} from "./OpenWakeWordDetector.js";

// Platform helpers
const isLinux = process.platform === 'linux';


async function initServices() {
    logger.info('🚀 Voice Gateway (OpenWakeWord) starting...');
    logger.debug(`Audio config: micDevice=${config.audio.micDevice}, sampleRate=${config.audio.sampleRate}, channels=${config.audio.channels}`);

    await initMQTT();
    await checkAIHealth();
    await checkTTSHealth();
    if (isLinux) await checkAlsa();
    // Note: Z-Wave MCP initialization is now handled in main.js with tool registry
}

async function initMQTT() {
    try {
        await connectMQTT();
        logger.debug('✅ MQTT connection established');
    } catch (err) {
        logger.error('❌ Failed to connect to MQTT broker', {error: errMsg(err)});
        logger.warn('⚠️ Continuing without MQTT - AI responses will be logged only');
    }
}

async function checkAIHealth() {
    if (config.ai.provider === 'anthropic') {
        logger.info('🤖 Using Anthropic (Claude) for AI inference');
        try {
            const ready = await checkAnthropicHealth();
            if (!ready) logger.warn('⚠️ Anthropic not ready - AI responses may fail');
        } catch (err) {
            logger.error('❌ Anthropic health check failed', {error: errMsg(err)});
        }
    } else {
        logger.info('🤖 Using Ollama for AI inference');
        try {
            const ready = await checkOllamaHealth();
            if (!ready) logger.warn('⚠️ Ollama not ready - AI responses may fail');
        } catch (err) {
            logger.error('❌ Ollama health check failed', {error: errMsg(err)});
        }
    }
}

async function checkTTSHealth() {
    if (!config.tts.enabled) return;
    try {
        const tts = new ElevenLabsTTS(config, logger);
        const ready = await tts.checkHealth();
        if (!ready) {
            logger.warn('⚠️ ElevenLabs TTS not ready - AI responses will not be spoken');
        }
    } catch (err) {
        logger.error('❌ ElevenLabs TTS health check failed', {error: errMsg(err)});
    }
}

async function checkAlsa() {
    try {
        await checkAlsaDevice(config.audio.micDevice, config.audio.sampleRate, config.audio.channels);
    } catch (err) {
        logger.error('❌ ALSA device check failed', {device: config.audio.micDevice, error: errMsg(err)});
    }
}

async function setupWakeWordDetector(wakeWordMachine = null) {
    const modelsDir = path.dirname(config.openWakeWord.modelPath);
    const modelFile = path.basename(config.openWakeWord.modelPath);
    const detector = new OpenWakeWordDetector(
        modelsDir,
        modelFile,
        config.openWakeWord.threshold,
        config.openWakeWord.embeddingFrames,
        config.openWakeWord.warmupMs
    );
    await detector.initialize();

    // Connect detector to WakeWordMachine if provided
    if (wakeWordMachine) {
        // Notify machine that detector is initialized
        wakeWordMachine.send({ type: 'DETECTOR_INITIALIZED', detector });

        // Listen for warmup-complete event and notify machine
        detector.on('warmup-complete', () => {
            logger.debug('[InitUtil] Detector warmup-complete event received, notifying WakeWordMachine');
            wakeWordMachine.send({ type: 'WARMUP_COMPLETE' });
        });

        logger.debug('[InitUtil] Detector connected to WakeWordMachine');
    }

    // Warm-up will happen automatically in background once mic starts feeding audio
    logger.info('✅ Detector initialized (warm-up will occur automatically)');

    return detector;
}

/**
 * Pre-synthesize welcome message audio (non-blocking)
 * This allows synthesis to happen in parallel with other initialization tasks
 *
 * @returns {Promise<Float32Array|null>} Pre-synthesized audio buffer or null on failure
 */
async function synthesizeWelcomeMessage() {
    if (!config.tts.enabled) return null;

    try {
        const provider = config.tts.provider || 'ElevenLabs';
        logger.debug('🔧 [STARTUP-DEBUG] synthesizeWelcomeMessage: Starting TTS synthesis in background...', {provider});

        const welcomeMessage = 'Hello, I am Jarvis. How can I help?';
        let audioBuffer;

        if (provider === 'Piper') {
            // Use Piper TTS (local/offline)
            audioBuffer = await piperSynthesize(welcomeMessage, {
                volume: config.tts.volume,
                speed: config.tts.speed
            });
        } else {
            // Use ElevenLabs TTS (cloud)
            const tts = new ElevenLabsTTS(config, logger);
            audioBuffer = await tts.synthesizeSpeech(welcomeMessage, {
                volume: config.tts.volume,
                speed: config.tts.speed
            });
        }

        logger.debug('🔧 [STARTUP-DEBUG] synthesizeWelcomeMessage: TTS synthesis complete');
        return audioBuffer;
    } catch (err) {
        logger.error('❌ Failed to synthesize welcome message', {error: err.message});
        return null;
    }
}

/**
 * Play pre-synthesized welcome message
 * @param {Float32Array|null} audioBuffer - Pre-synthesized audio buffer
 * @param {Object} detector - Wake word detector instance (unused, kept for backwards compatibility)
 * @param {Object} audioPlayer - Audio player instance
 * @param {Object} beeps - Beep sounds object
 * @returns {Object|null} Playback handle for interruption support
 */
async function startTTSWelcome(audioBuffer, detector, audioPlayer, beeps = null) {
    if (!audioBuffer || !config.tts.enabled) {
        logger.debug('🔧 [STARTUP-DEBUG] startTTSWelcome: No audio buffer or TTS disabled, skipping welcome');
        return null;
    }

    // Create AudioPlayer if not provided (for backward compatibility)
    const player = audioPlayer || new AudioPlayer(config, logger);

    try {
        logger.debug('🔧 [STARTUP-DEBUG] startTTSWelcome: Starting playback of pre-synthesized audio...');

        if (audioBuffer.length > 0) {
            // Use playInterruptible for cancellable welcome message
            const playback = player.playInterruptible(audioBuffer);

            // Play in background, handle completion/cancellation
            playback.promise
                .then(() => {
                    logger.debug('🔧 [STARTUP-DEBUG] startTTSWelcome: Playback completed');
                    logger.info('✅ Welcome message spoken');
                    // REMOVED: Post-welcome detector reset (no longer needed with warm-up wait)
                    // The detector is already warmed up before welcome message plays
                    // Beep isolation prevents TTS audio from being recorded

                    // Play ready-to-listen beep to signal system is ready for wake word
                    if (beeps && beeps.ready) {
                        logger.debug('🔔 Playing ready-to-listen beep');
                        player.play(beeps.ready)
                            .then(() => {
                                logger.debug('✅ Ready beep played');
                            })
                            .catch(err => {
                                logger.warn('⚠️ Failed to play ready beep', { error: err.message });
                                // Non-critical failure - continue
                            });
                    }
                })
                .catch(err => {
                    if (err.message.includes('cancelled')) {
                        logger.info('🛑 Welcome message interrupted');
                    } else {
                        logger.error('❌ Failed to play welcome message', {error: err.message});
                    }
                });

            // Return playback handle for interruption support
            return playback;
        }
    } catch (err) {
        logger.error('❌ Failed to play welcome message', {error: err.message});
    }

    return null;
}

export {
    initServices,
    setupWakeWordDetector,
    synthesizeWelcomeMessage,
    startTTSWelcome,
    checkAIHealth,
    checkAlsa,
    checkTTSHealth
}
