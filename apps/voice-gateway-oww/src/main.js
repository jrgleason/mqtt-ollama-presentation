/**
 * Voice Gateway with OpenWakeWord - Main Entry Point
 * Orchestrates wake word detection, audio recording, STT, and MQTT communication.
 */

import {errMsg, logger} from './util/Logger.js';
import {config} from './config.js';
import {VoiceInteractionOrchestrator} from "./services/VoiceInteractionOrchestrator.js";
import {initServices, setupWakeWordDetector, startTTSWelcome} from "./util/InitUtil.js";
import {setupVoiceStateMachine} from "./util/VoiceGateway.js";
import {shutdownMCPClient} from "./mcpZWaveClient.js";
import mic from 'mic';
import {SAMPLE_RATE, CHUNK_SIZE} from "./audio/constants.js";
import {getServiceSnapshot, safeDetectorReset} from "./util/XStateHelpers.js";
import {AudioPlayer} from "./audio/AudioPlayer.js";
import {BeepUtil} from "./util/BeepUtil.js";
import {ToolRegistry} from './services/ToolRegistry.js';
import {ToolExecutor} from './services/ToolExecutor.js';
import {
    dateTimeTool,
    executeDateTimeTool
} from './tools/datetime-tool.js';
import {
    searchTool,
    executeSearchTool
} from './tools/search-tool.js';
import {
    volumeControlTool,
    executeVolumeControlTool
} from './tools/volume-control-tool.js';
import {
    zwaveControlTool,
    executeZWaveControlTool
} from './tools/zwave-control-tool.js';

// Initialize audio player and beep util
const audioPlayer = new AudioPlayer(config, logger);
const beepUtil = new BeepUtil(config);
const BEEPS = beepUtil.BEEPS;

/**
 * Voice Gateway Microphone Setup
 */
function setupMic(voiceService, orchestrator, detector) {
    const micInstance = mic({
        rate: String(config.audio.sampleRate),
        channels: String(config.audio.channels),
        device: config.audio.micDevice,
        bitwidth: '16',
        encoding: 'signed-integer',
        endian: 'little'
    });

    const micInputStream = micInstance.getAudioStream();

    // Audio processing state
    let audioBuffer = [];
    let recordedAudio = [];
    let preRollBuffer = [];
    let isRecording = false;
    let silenceSampleCount = 0;
    let recordingStartedAt = 0;
    let hasSpokenDuringRecording = false;

    /**
     * Voice Activity Detection (VAD) Configuration Constants
     *
     * These thresholds control when recording starts/stops and how speech is distinguished
     * from silence. Tuning these values affects the user experience - too sensitive captures
     * background noise, too conservative cuts off users mid-sentence.
     */
    const VAD_CONSTANTS = {
        /**
         * Pre-roll buffer duration in milliseconds
         * Captures audio BEFORE wake word detection completes to preserve the start of user speech.
         *
         * Typical range: 200-500ms
         * Trade-off: Longer preserves more context, shorter reduces memory usage
         */
        PRE_ROLL_MS: 300,

        /**
         * RMS energy threshold to distinguish speech from background noise
         * Audio below this threshold is considered silence.
         *
         * Typical ranges:
         * - Background noise: < 0.01
         * - Normal speech: 0.05 - 0.2
         * - Loud speech: > 0.2
         *
         * Tuning guidance:
         * - Lower values (e.g., 0.005): More sensitive, may capture background noise
         * - Higher values (e.g., 0.02): Less sensitive, may cut off quiet speech
         */
        SILENCE_THRESHOLD: 0.01,

        /**
         * Minimum speech duration in milliseconds
         * Filters out false positives like coughs, clicks, or brief background noises.
         *
         * Typical range: 500-1000ms
         * Trade-off: Longer reduces false positives but may reject very brief commands
         */
        MIN_SPEECH_MS: 700,

        /**
         * Trailing silence duration before stopping recording
         * How long to wait after detecting silence before ending the recording.
         * Allows for natural pauses mid-sentence.
         *
         * Configurable via: config.vad.trailingSilenceMs
         * Default: 1500ms
         *
         * Typical range: 1000-2500ms
         * Tuning guidance:
         * - Shorter (e.g., 1000ms): Faster response, may cut off slow speakers
         * - Longer (e.g., 2500ms): Better for slow speakers, slower response time
         */
        TRAILING_SILENCE_MS: config.vad.trailingSilenceMs || 1500,

        /**
         * Maximum utterance length in milliseconds
         * Prevents infinite recording if silence is never detected (continuous noise/speech).
         *
         * Configurable via: config.vad.maxUtteranceMs
         * Default: 10000ms (10 seconds)
         *
         * Typical range: 8000-15000ms
         * Trade-off: Longer allows complex queries, shorter prevents memory overflow
         */
        MAX_UTTERANCE_MS: config.vad.maxUtteranceMs || 10000,

        /**
         * Grace period after wake word before silence detection activates
         * Allows users time to formulate and start speaking after wake word is detected.
         * Prevents premature recording stop if user pauses before speaking.
         *
         * Configurable via: config.vad.graceBeforeStopMs
         * Default: 1200ms
         *
         * Typical range: 800-2000ms
         * Tuning guidance:
         * - Shorter (e.g., 800ms): Faster response to false triggers (wake word but no speech)
         * - Longer (e.g., 2000ms): More forgiving for users who need time to think
         */
        GRACE_BEFORE_STOP_MS: config.vad.graceBeforeStopMs || 1200,
    };

    /**
     * Helper function to convert milliseconds to audio sample counts
     *
     * @param {number} ms - Duration in milliseconds
     * @returns {number} Number of audio samples at the configured sample rate
     *
     * @example
     * // At 16000 Hz sample rate:
     * msToSamples(1000) // Returns 16000 (1 second = 16000 samples)
     * msToSamples(500)  // Returns 8000 (0.5 seconds = 8000 samples)
     */
    const msToSamples = (ms) => Math.floor((ms / 1000) * SAMPLE_RATE);

    // Convert VAD time thresholds to sample counts
    const PRE_ROLL_SAMPLES = msToSamples(VAD_CONSTANTS.PRE_ROLL_MS);
    const MIN_SPEECH_SAMPLES = msToSamples(VAD_CONSTANTS.MIN_SPEECH_MS);
    const SILENCE_SAMPLES_REQUIRED = msToSamples(VAD_CONSTANTS.TRAILING_SILENCE_MS);
    const MAX_RECORDING_SAMPLES = msToSamples(VAD_CONSTANTS.MAX_UTTERANCE_MS);

    // Convert Int16 buffer to Float32
    const toFloat32FromInt16Buffer = (buf) => {
        const pcm = new Int16Array(buf.buffer, buf.byteOffset, buf.length / Int16Array.BYTES_PER_ELEMENT);
        const out = new Float32Array(pcm.length);
        for (let i = 0; i < pcm.length; i++) out[i] = pcm[i] / 32768.0;
        return out;
    };

    // Calculate RMS energy
    const rmsEnergy = (samples) => {
        if (!samples || !samples.length) return 0;
        let e = 0;
        for (let i = 0; i < samples.length; i++) e += samples[i] * samples[i];
        return e / samples.length;
    };

    // Setup state machine listeners (XState v5 uses .subscribe instead of .onTransition)
    voiceService.subscribe((state) => {
        const value = state.value;
        if (value === 'recording' && !isRecording) {
            // Start recording
            isRecording = true;
            recordedAudio = Array.from(preRollBuffer);
            silenceSampleCount = 0;
            recordingStartedAt = Date.now();
            hasSpokenDuringRecording = false;
            logger.debug('🎙️ Recording started');
        } else if (value !== 'recording' && isRecording) {
            // Stop recording
            isRecording = false;
            const audioSnapshot = new Float32Array(recordedAudio);
            recordedAudio = [];
            logger.debug('🛑 Recording stopped', {samples: audioSnapshot.length});

            // Process voice interaction in background
            if (audioSnapshot.length > 0) {
                orchestrator.processVoiceInteraction(audioSnapshot).catch(err => {
                    logger.error('Voice interaction error', {error: errMsg(err)});
                });
            }
        }
    });

    // Microphone data handler
    micInputStream.on('data', async (data) => {
        const normalized = toFloat32FromInt16Buffer(data);
        audioBuffer = audioBuffer.concat(Array.from(normalized));

        // Process audio in chunks for wake word detection
        while (audioBuffer.length >= CHUNK_SIZE) {
            const snapshot = getServiceSnapshot(voiceService);
            if (!snapshot || typeof snapshot.matches !== 'function') break;
            if (snapshot.matches('startup')) {
                // Drain buffer during startup
                audioBuffer = audioBuffer.slice(CHUNK_SIZE);
                continue;
            }
            if (!snapshot.matches('listening')) break;

            const chunk = new Float32Array(audioBuffer.slice(0, CHUNK_SIZE));
            audioBuffer = audioBuffer.slice(CHUNK_SIZE);

            try {
                const score = await detector.detect(chunk);

                if (score > config.openWakeWord.threshold) {
                    const wakeWord = config.openWakeWord.modelPath.includes('jarvis') ? 'Hey Jarvis' :
                        config.openWakeWord.modelPath.includes('robot') ? 'Hello Robot' : 'Wake word';

                    voiceService.send({type: 'TRIGGER', ts: Date.now()});
                    safeDetectorReset(detector, 'post-trigger');

                    logger.info('🎤 Wake word detected!', {wakeWord, score: score.toFixed(3)});
                    audioPlayer.play(BEEPS.wakeWord).catch(err => logger.debug('Beep failed', {error: errMsg(err)}));
                }
            } catch (err) {
                logger.error('Wake word detection error', {error: errMsg(err)});
            }
        }

        // Maintain pre-roll buffer
        if (normalized.length) {
            preRollBuffer = preRollBuffer.concat(Array.from(normalized));
            if (preRollBuffer.length > PRE_ROLL_SAMPLES) {
                preRollBuffer = preRollBuffer.slice(preRollBuffer.length - PRE_ROLL_SAMPLES);
            }
        }

        // Recording/VAD
        if (isRecording && normalized.length) {
            recordedAudio = recordedAudio.concat(Array.from(normalized));

            const energy = rmsEnergy(normalized);
            if (energy < VAD_CONSTANTS.SILENCE_THRESHOLD) {
                silenceSampleCount += normalized.length;
                const sinceStartMs = Date.now() - recordingStartedAt;
                const graceActive = !hasSpokenDuringRecording && sinceStartMs < VAD_CONSTANTS.GRACE_BEFORE_STOP_MS;

                if (!graceActive && silenceSampleCount >= SILENCE_SAMPLES_REQUIRED && recordedAudio.length >= MIN_SPEECH_SAMPLES) {
                    voiceService.send({type: 'SILENCE_DETECTED'});
                }
            } else {
                if (!hasSpokenDuringRecording) {
                    hasSpokenDuringRecording = true;
                    logger.debug('✅ Speech detected in recording');
                }
                silenceSampleCount = 0;
            }

            if (recordedAudio.length >= MAX_RECORDING_SAMPLES) {
                logger.debug('⏱️ Max recording length reached');
                voiceService.send({type: 'MAX_LENGTH_REACHED'});
            }
        }
    });

    micInputStream.on('error', (err) => {
        logger.error('❌ Microphone error', {error: errMsg(err)});
    });

    micInstance.start();
    logger.info('🎤 Microphone started');

    return micInstance;
}

/**
 * Setup signal handlers for graceful shutdown
 */
function handleSignals(micInstance) {
    process.on('SIGINT', async () => {
        logger.info('SIGINT received, shutting down...');
        micInstance.stop();
        await shutdownMCPClient();
        process.exit(0);
    });

    process.on('uncaughtException', async (err) => {
        logger.error('Uncaught exception', {error: errMsg(err)});
        micInstance.stop();
        await shutdownMCPClient();
        process.exit(1);
    });
}

async function main() {
    try {
        await initServices();
        const detector = await setupWakeWordDetector();
        await startTTSWelcome(detector, audioPlayer);

        // Initialize tool system
        logger.info('🔧 Initializing tool system...');
        const toolRegistry = new ToolRegistry();

        // Register all tools
        toolRegistry.registerTool(dateTimeTool, executeDateTimeTool);
        toolRegistry.registerTool(searchTool, executeSearchTool);
        toolRegistry.registerTool(volumeControlTool, executeVolumeControlTool);
        toolRegistry.registerTool(zwaveControlTool, executeZWaveControlTool);

        const toolExecutor = new ToolExecutor(toolRegistry, logger);

        logger.info('✅ Tool system initialized', {
            toolCount: toolRegistry.toolCount,
            tools: toolRegistry.getToolNames()
        });

        // Setup state machine, microphone, and audio loop
        const orchestrator = new VoiceInteractionOrchestrator(config, logger, toolExecutor);
        const voiceService = setupVoiceStateMachine();

        // Start microphone
        const micInstance = setupMic(voiceService, orchestrator, detector);

        handleSignals(micInstance);

        logger.info('✅ Voice Gateway ready');

        // Transition to listening mode after TTS welcome
        logger.info('🎧 Activating wake word detection...');
        voiceService.send({type: 'READY'});
    } catch (err) {
        logger.error('Failed to initialize Voice Gateway', {error: errMsg(err)});
        process.exit(1);
    }
}


main().catch((err) => {
    logger.error('Fatal error in main', {error: errMsg(err)});
    process.exit(1);
});
