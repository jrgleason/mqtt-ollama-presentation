/**
 * Voice Gateway with OpenWakeWord - Main Entry Point
 * Orchestrates wake word detection, audio recording, STT, and MQTT communication.
 */

import {errMsg, logger} from './util/Logger.js';
import {config} from './config.js';
import {VoiceInteractionOrchestrator} from "./services/VoiceInteractionOrchestrator.js";
import {initServices, setupWakeWordDetector, startTTSWelcome} from "./util/InitUtil.js";
import {setupVoiceStateMachine} from "./util/VoiceGateway.js";
import {initializeMCPIntegration, shutdownMCPClient} from "./services/MCPIntegration.js";
import mic from 'mic';
import {SAMPLE_RATE, CHUNK_SIZE} from "./audio/constants.js";
import {getServiceSnapshot, safeDetectorReset} from "./util/XStateHelpers.js";
import {AudioPlayer} from "./audio/AudioPlayer.js";
import {BeepUtil} from "./util/BeepUtil.js";
import {ToolRegistry} from './services/ToolRegistry.js';
import {ToolExecutor} from './services/ToolExecutor.js';
import {validateProviders} from './util/ProviderHealthCheck.js';
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

// Initialize audio player and beep util
const audioPlayer = new AudioPlayer(config, logger);
const beepUtil = new BeepUtil(config);
const BEEPS = beepUtil.BEEPS;

/**
 * Voice Gateway Microphone Setup
 */
function setupMic(voiceService, orchestrator, detector, onRecordingCheckerReady = null, getWelcomePlayback = null) {
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

    // Track state machine recording state for beep isolation
    let stateIsRecording = false;

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
         * - Background noise: < 0.005
         * - Very quiet speech: 0.005-0.01
         * - Normal speech: 0.05 - 0.2
         * - Loud speech: > 0.2
         *
         * Tuning guidance:
         * - Lower values (e.g., 0.003): More sensitive, may capture background noise
         * - Higher values (e.g., 0.02): Less sensitive, may cut off quiet speech
         */
        SILENCE_THRESHOLD: 0.005,

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

        // Track recording state for beep isolation (prevent beep feedback loops)
        stateIsRecording = (value === 'recording');

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

            // Check if speech was detected during recording
            if (audioSnapshot.length > 0 && hasSpokenDuringRecording) {
                // Process voice interaction in background (transcribe + AI + TTS)
                orchestrator.processVoiceInteraction(audioSnapshot).catch(err => {
                    logger.error('Voice interaction error', {error: errMsg(err)});
                });
            } else if (audioSnapshot.length > 0 && !hasSpokenDuringRecording) {
                // Calculate energy for logging (to help tune threshold)
                const avgEnergy = rmsEnergy(audioSnapshot);
                // Skip transcription when no speech detected (false wake word trigger)
                logger.info('⏩ Skipping transcription - no speech detected', {
                    recordedSamples: audioSnapshot.length,
                    avgEnergy: avgEnergy.toFixed(6),
                    threshold: VAD_CONSTANTS.SILENCE_THRESHOLD,
                    suggestion: avgEnergy > 0.003 ? 'Energy close to threshold - may need adjustment' : 'True silence'
                });
                // State machine automatically returns to listening (no action needed)
            }
        }
    });

    // Provide isRecording checker callback to orchestrator (for beep isolation)
    if (onRecordingCheckerReady) {
        onRecordingCheckerReady(() => stateIsRecording);
    }

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
            // Allow wake word detection in 'listening' and 'cooldown' states
            // Cooldown allows interruption (barge-in during TTS playback)
            const inListening = snapshot.matches('listening');
            const inCooldown = snapshot.matches('cooldown');

            if (!inListening && !inCooldown) break;

            const chunk = new Float32Array(audioBuffer.slice(0, CHUNK_SIZE));
            audioBuffer = audioBuffer.slice(CHUNK_SIZE);

            try {
                const score = await detector.detect(chunk);

                if (score > config.openWakeWord.threshold) {
                    const wakeWord = config.openWakeWord.modelPath.includes('jarvis') ? 'Hey Jarvis' :
                        config.openWakeWord.modelPath.includes('robot') ? 'Hello Robot' : 'Wake word';

                    // INTERRUPTION: Cancel active TTS if wake word triggered during cooldown OR welcome message
                    if (inCooldown) {
                        logger.info('🎤 Wake word detected during playback (interruption)!', {
                            wakeWord,
                            score: score.toFixed(3)
                        });
                        orchestrator.cancelActivePlayback(); // Stop TTS immediately
                    } else {
                        logger.info('🎤 Wake word detected!', {wakeWord, score: score.toFixed(3)});
                    }

                    // Also cancel welcome message if still playing (during startup state)
                    if (getWelcomePlayback) {
                        const welcomePlayback = getWelcomePlayback();
                        if (welcomePlayback) {
                            logger.info('🛑 Interrupting welcome message');
                            welcomePlayback.cancel();
                        }
                    }

                    voiceService.send({type: 'TRIGGER', ts: Date.now()});
                    safeDetectorReset(detector, 'post-trigger');

                    // Always play wake word beep - user needs this audible cue to start talking
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
function handleSignals(micInstance, mcpClient) {
    process.on('SIGINT', async () => {
        logger.info('SIGINT received, shutting down...');
        micInstance.stop();
        if (mcpClient) {
            await shutdownMCPClient(mcpClient, logger);
        }
        process.exit(0);
    });

    process.on('uncaughtException', async (err) => {
        logger.error('Uncaught exception', {error: errMsg(err)});
        micInstance.stop();
        if (mcpClient) {
            await shutdownMCPClient(mcpClient, logger);
        }
        process.exit(1);
    });
}

async function main() {
    let mcpClient = null; // Store MCP client for cleanup
    let activeWelcomePlayback = null; // Track welcome message playback for interruption

    try {
        // ========================================
        // Phase 1: Services and Health Checks
        // ========================================
        logger.info('🏥 Running provider health checks...');
        const healthResults = await validateProviders(config, logger);

        // Health checks are informational - we continue even if providers are unhealthy
        // This allows the service to start and provide helpful error messages during operation

        await initServices();

        // ========================================
        // Phase 2: Wake Word Detector (with warm-up)
        // ========================================
        logger.debug('🔧 [STARTUP-DEBUG] Phase 2: Initializing wake word detector...');
        const detector = await setupWakeWordDetector();
        logger.debug('🔧 [STARTUP-DEBUG] Phase 2: Detector initialized (warm-up will occur after mic starts)');

        // ========================================
        // Phase 3: Tool System Initialization
        // ========================================
        logger.info('🔧 Initializing tool system...');
        const toolRegistry = new ToolRegistry();

        // 1. Auto-discover MCP tools from Z-Wave MCP server
        try {
            const mcpIntegration = await initializeMCPIntegration(config, logger);
            mcpClient = mcpIntegration.mcpClient;
            const mcpTools = mcpIntegration.tools;

            logger.info('🔍 Discovered MCP tools', {
                count: mcpTools.length,
                tools: mcpTools.map(t => t.lc_name || t.name)
            });

            // Register each MCP tool
            for (const tool of mcpTools) {
                toolRegistry.registerLangChainTool(tool);
            }
        } catch (error) {
            logger.error('❌ Failed to initialize MCP tools', {
                error: error.message,
                stack: error.stack
            });
            logger.warn('⚠️ Continuing with local tools only...');
        }

        // 2. Manually register local tools (non-MCP)
        toolRegistry.registerTool(dateTimeTool, executeDateTimeTool);
        toolRegistry.registerTool(searchTool, executeSearchTool);
        toolRegistry.registerTool(volumeControlTool, executeVolumeControlTool);

        const toolExecutor = new ToolExecutor(toolRegistry, logger);

        logger.info('✅ Tool system initialized', {
            toolCount: toolRegistry.toolCount,
            tools: toolRegistry.getToolNames()
        });

        // ========================================
        // Phase 4: Voice Service & Orchestrator
        // ========================================
        // Setup voice state machine (needed by orchestrator)
        const voiceService = setupVoiceStateMachine();

        // Create isRecording checker callback for beep isolation
        let isRecordingChecker = null;
        const getIsRecording = () => isRecordingChecker ? isRecordingChecker() : false;

        // Setup voice orchestrator with state machine reference and isRecording checker
        const orchestrator = new VoiceInteractionOrchestrator(config, logger, toolExecutor, voiceService, getIsRecording);

        // ========================================
        // Phase 5: Microphone Setup
        // ========================================
        logger.debug('🔧 [STARTUP-DEBUG] Phase 5: Starting microphone (will feed audio to detector)...');
        // Start microphone (buffers will be drained until READY signal)
        // setupMic will set isRecordingChecker after voiceService.subscribe is established
        const micInstance = setupMic(voiceService, orchestrator, detector, (checker) => {
            isRecordingChecker = checker;
        }, () => activeWelcomePlayback); // Pass welcome playback getter for interruption
        handleSignals(micInstance, mcpClient);
        logger.debug('🔧 [STARTUP-DEBUG] Phase 5: Microphone started, audio feeding to detector');

        // ========================================
        // Phase 6: Welcome Message BEFORE Activation
        // ========================================
        logger.debug('🔧 [STARTUP-DEBUG] Phase 6: Starting welcome message...');
        // Speak welcome message while system is in startup state
        // This ensures the message plays AFTER detector is fully warmed up
        activeWelcomePlayback = await startTTSWelcome(detector, audioPlayer);
        logger.debug('🔧 [STARTUP-DEBUG] Phase 6: Welcome message playback initiated');

        // Clear welcome playback after it completes
        if (activeWelcomePlayback) {
            activeWelcomePlayback.promise.finally(() => {
                activeWelcomePlayback = null;
            });
        }

        // ========================================
        // Phase 7: Final Activation
        // ========================================
        logger.debug('🔧 [STARTUP-DEBUG] Phase 7: Activating wake word detection...');
        // Activate wake word detection (transitions from startup -> listening)
        logger.info('🎧 Activating wake word detection...');
        voiceService.send({type: 'READY'});

        logger.debug('🔧 [STARTUP-DEBUG] Phase 7: State machine transitioned to listening');
        logger.info('✅ Voice Gateway ready');
    } catch (err) {
        logger.error('Failed to initialize Voice Gateway', {error: errMsg(err)});

        // Clean up MCP client if it exists
        if (mcpClient) {
            await shutdownMCPClient(mcpClient, logger);
        }

        process.exit(1);
    }
}


main().catch((err) => {
    logger.error('Fatal error in main', {error: errMsg(err)});
    process.exit(1);
});
