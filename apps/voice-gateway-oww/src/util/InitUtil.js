import {errMsg, logger} from "./Logger.js";
import {config} from '../config.js';
import path from 'path';
import {checkOllamaHealth} from '../OllamaClient.js';
import {checkAnthropicHealth} from '../AnthropicClient.js';
import {connectMQTT} from '../mqttClient.js';
import {ElevenLabsTTS} from "./ElevenLabsTTS.js";
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

async function setupWakeWordDetector() {
    const modelsDir = path.dirname(config.openWakeWord.modelPath);
    const modelFile = path.basename(config.openWakeWord.modelPath);
    const detector = new OpenWakeWordDetector(modelsDir, modelFile, config.openWakeWord.threshold, config.openWakeWord.embeddingFrames);
    await detector.initialize();

    // Warm-up will happen automatically in background once mic starts feeding audio
    logger.info('✅ Detector initialized (warm-up will occur automatically)');

    return detector;
}

async function startTTSWelcome(detector, audioPlayer, beeps = null) {
    if (!config.tts.enabled) return null;

    // Create AudioPlayer if not provided (for backward compatibility)
    const player = audioPlayer || new AudioPlayer(config, logger);

    try {
        logger.debug('🔧 [STARTUP-DEBUG] startTTSWelcome: Starting TTS synthesis...');
        const tts = new ElevenLabsTTS(config, logger);
        const welcomeMessage = 'Hello, I am Jarvis. How can I help?';
        const audioBuffer = await tts.synthesizeSpeech(welcomeMessage, {
            volume: config.tts.volume,
            speed: config.tts.speed
        });
        logger.debug('🔧 [STARTUP-DEBUG] startTTSWelcome: TTS synthesis complete, starting playback...');

        if (audioBuffer && audioBuffer.length > 0) {
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
                        logger.error('❌ Failed to speak welcome message', {error: err.message});
                    }
                });

            // Return playback handle for interruption support
            return playback;
        }
    } catch (err) {
        logger.error('❌ Failed to speak welcome message', {error: err.message});
    }

    return null;
}

export {
    initServices,
    setupWakeWordDetector,
    startTTSWelcome,
    checkAIHealth,
    checkAlsa,
    checkTTSHealth
}
