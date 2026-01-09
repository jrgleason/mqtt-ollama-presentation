/**
 * Voice Gateway with OpenWakeWord - Main Entry Point
 * Orchestrates wake word detection, audio recording, STT, and MQTT communication.
 */

import {errMsg, logger} from './util/Logger.js';
import {config} from './config.js';
import {VoiceInteractionOrchestrator} from "./services/VoiceInteractionOrchestrator.js";
import {initServices, setupWakeWordDetector, synthesizeWelcomeMessage, startTTSWelcome} from "./util/InitUtil.js";
import {setupVoiceStateMachine} from "./util/VoiceGateway.js";
import {setupWakeWordMachine} from "./state-machines/WakeWordMachine.js";
import {setupPlaybackMachine, isPlaying as isPlaybackActive} from "./state-machines/PlaybackMachine.js";
import {initializeMCPIntegration, shutdownMCPClient} from "./services/MCPIntegration.js";
import mic from 'mic';
import {SAMPLE_RATE, CHUNK_SIZE, getSilenceThreshold} from "./audio/constants.js";
import {getServiceSnapshot, safeDetectorReset} from "./util/XStateHelpers.js";
import {DETECTOR_WARMUP_TIMEOUT_MS} from './constants/timing.js';
import {AudioPlayer} from "./audio/AudioPlayer.js";
import {BeepUtil} from "./util/BeepUtil.js";
import {ToolManager} from './services/ToolManager.js';
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
function setupMic(voiceService, orchestrator, detector, playbackMachine, onRecordingCheckerReady = null, getWelcomePlayback = null) {
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
     * Check if beeps should be suppressed to prevent feedback loops
     * Beeps are suppressed when:
     * - Recording is active (prevents beep from being captured in user audio)
     * - Playback is active (prevents beep overlap with TTS/other audio)
     *
     * @returns {boolean} True if beeps should be suppressed
     */
    const shouldSuppressBeep = () => {
        const isRecordingActive = stateIsRecording;
        const isPlaybackPlaying = playbackMachine ? isPlaybackActive(playbackMachine) : false;

        if (isRecordingActive || isPlaybackPlaying) {
            logger.debug('🔇 Suppressing beep', {
                recording: isRecordingActive,
                playback: isPlaybackPlaying
            });
            return true;
        }

        return false;
    };

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
                const silenceThreshold = getSilenceThreshold(config);

                // Categorize silence type for better diagnostics
                const category = avgEnergy < 0.002
                    ? 'True silence'
                    : avgEnergy <= 0.004
                    ? 'Close to threshold - consider lowering VAD_SILENCE_THRESHOLD'
                    : 'Just below threshold';

                // Skip transcription when no speech detected (false wake word trigger)
                logger.info('Skipping transcription - no speech detected', {
                    recordedSamples: audioSnapshot.length,
                    avgEnergy: avgEnergy.toFixed(6),
                    threshold: silenceThreshold,
                    category: category
                });
                // Transition back to listening state
                voiceService.send({type: 'INTERACTION_COMPLETE'});
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

            const inStartup = snapshot.matches('startup');
            const inListening = snapshot.matches('listening');
            const inCooldown = snapshot.matches('cooldown');

            // During startup: feed audio to detector for warm-up, but don't check for wake words
            if (inStartup) {
                const chunk = new Float32Array(audioBuffer.slice(0, CHUNK_SIZE));
                audioBuffer = audioBuffer.slice(CHUNK_SIZE);
                try {
                    await detector.detect(chunk); // Feed audio for warm-up, ignore score
                } catch (err) {
                    logger.error('Wake word detection error during startup', {error: errMsg(err)});
                }
                continue; // Don't check for wake words during startup
            }

            // Allow wake word detection in 'listening' and 'cooldown' states
            // Cooldown allows interruption (barge-in during TTS playback)
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
            const silenceThreshold = getSilenceThreshold(config);
            if (energy < silenceThreshold) {
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

    // Boot timing instrumentation
    const bootTimings = {
        startTime: Date.now(),
        phases: {}
    };

    try {
        // ========================================
        // Phase 1: Services and Health Checks
        // ========================================
        const phase1Start = Date.now();
        logger.info('🏥 Running provider health checks...');
        const healthResults = await validateProviders(config, logger);

        // Health checks are informational - we continue even if providers are unhealthy
        // This allows the service to start and provide helpful error messages during operation

        await initServices();
        bootTimings.phases.phase1_healthChecks = Date.now() - phase1Start;

        // ========================================
        // Phase 2: State Machines & Detector Initialization
        // ========================================
        const phase2Start = Date.now();
        logger.debug('🔧 [STARTUP-DEBUG] Phase 2: Initializing state machines...');
        const wakeWordMachine = setupWakeWordMachine();
        const playbackMachine = setupPlaybackMachine();

        logger.debug('🔧 [STARTUP-DEBUG] Phase 2: Initializing wake word detector...');
        const detector = await setupWakeWordDetector(wakeWordMachine);
        logger.debug('🔧 [STARTUP-DEBUG] Phase 2: Detector and state machines initialized');
        bootTimings.phases.phase2_detectorInit = Date.now() - phase2Start;

        // ========================================
        // Phase 3: Tool System Initialization & Welcome Synthesis (Parallel)
        // ========================================
        const phase3Start = Date.now();
        logger.info('🔧 Initializing tool system...');
        const toolManager = new ToolManager();

        // Start welcome message synthesis in parallel (don't await yet)
        // This allows synthesis to happen during detector warm-up
        logger.debug('🔧 [STARTUP-DEBUG] Phase 3: Starting welcome message synthesis in parallel...');
        const welcomeSynthesisPromise = synthesizeWelcomeMessage();

        // Start MCP initialization in parallel (don't await yet)
        // This allows detector warm-up and microphone setup to proceed concurrently
        logger.debug('🔧 [STARTUP-DEBUG] Phase 3: Starting MCP initialization in parallel...');
        const mcpInitPromise = (async () => {
            try {
                const mcpIntegration = await initializeMCPIntegration(config, logger);
                mcpClient = mcpIntegration.mcpClient;
                const mcpTools = mcpIntegration.tools;

                logger.info('🔍 Discovered MCP tools', {
                    count: mcpTools.length,
                    tools: mcpTools.map(t => t.lc_name || t.name)
                });

                return mcpTools;
            } catch (error) {
                logger.error('❌ Failed to initialize MCP tools', {
                    error: error.message,
                    stack: error.stack
                });
                logger.warn('⚠️ Continuing with local tools only...');
                return []; // Return empty array on failure
            }
        })();

        // Add local tools immediately (these are always available)
        // These manual tools need invoke() method to match LangChain interface
        toolManager.addCustomTool({
            name: dateTimeTool.function.name,
            description: dateTimeTool.function.description,
            schema: dateTimeTool.function.parameters,
            invoke: async ({ input }) => executeDateTimeTool(input)
        });

        toolManager.addCustomTool({
            name: searchTool.function.name,
            description: searchTool.function.description,
            schema: searchTool.function.parameters,
            invoke: async ({ input }) => executeSearchTool(input)
        });

        toolManager.addCustomTool({
            name: volumeControlTool.function.name,
            description: volumeControlTool.function.description,
            schema: volumeControlTool.function.parameters,
            invoke: async ({ input }) => executeVolumeControlTool(input)
        });

        logger.debug('🔧 [STARTUP-DEBUG] Phase 3: Local tools registered, MCP init and welcome synthesis running in background...');

        const toolExecutor = new ToolExecutor(toolManager, logger);
        bootTimings.phases.phase3_toolSystemSetup = Date.now() - phase3Start;

        // ========================================
        // Phase 4: Voice Service & Orchestrator
        // ========================================
        const phase4Start = Date.now();
        // Setup voice state machine (needed by orchestrator)
        const voiceService = setupVoiceStateMachine();

        // Create isRecording checker callback for beep isolation
        let isRecordingChecker = null;
        const getIsRecording = () => isRecordingChecker ? isRecordingChecker() : false;

        // Setup voice orchestrator with state machine references and isRecording checker
        const orchestrator = new VoiceInteractionOrchestrator(config, logger, toolExecutor, voiceService, getIsRecording, playbackMachine);
        bootTimings.phases.phase4_voiceServiceSetup = Date.now() - phase4Start;

        // ========================================
        // Phase 5: Microphone Setup
        // ========================================
        const phase5Start = Date.now();
        logger.debug('🔧 [STARTUP-DEBUG] Phase 5: Starting microphone (will feed audio to detector)...');
        // Start microphone (buffers will be drained until READY signal)
        // setupMic will set isRecordingChecker after voiceService.subscribe is established
        const micInstance = setupMic(voiceService, orchestrator, detector, playbackMachine, (checker) => {
            isRecordingChecker = checker;
        }, () => activeWelcomePlayback); // Pass welcome playback getter for interruption
        handleSignals(micInstance, mcpClient);
        logger.debug('🔧 [STARTUP-DEBUG] Phase 5: Microphone started, audio feeding to detector');
        bootTimings.phases.phase5_microphoneSetup = Date.now() - phase5Start;

        // ========================================
        // Phase 5.5: Detector Warm-up Wait & MCP Tool Finalization
        // ========================================
        const phase5_5Start = Date.now();
        // Wait for detector warm-up AFTER microphone starts feeding audio
        // This ensures detector is ready BEFORE welcome message plays
        // Timeout after 10 seconds to prevent indefinite hang
        logger.info('⏳ Waiting for detector warm-up...');
        try {
            await Promise.race([
                detector.getWarmUpPromise(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Detector warm-up timeout')), DETECTOR_WARMUP_TIMEOUT_MS)
                )
            ]);
            logger.info('✅ Detector fully warmed up and ready');
        } catch (error) {
            logger.warn('⚠️ Detector warm-up timeout - may experience initial detection issues', {
                error: error.message
            });
        }

        // Ensure MCP tools are registered before voice gateway becomes ready
        // This typically completes during detector warm-up (parallel execution)
        logger.debug('🔧 [STARTUP-DEBUG] Phase 5.5: Finalizing MCP tool registration...');
        const mcpTools = await mcpInitPromise;
        if (mcpTools.length > 0) {
            // Add MCP tools to manager (no wrapping needed - already LangChain tools)
            toolManager.addMCPTools(mcpTools);
            logger.info('✅ MCP tools registered', {
                toolCount: toolManager.toolCount,
                tools: toolManager.getToolNames()
            });
        } else {
            logger.info('✅ Tool system ready (local tools only)', {
                toolCount: toolManager.toolCount,
                tools: toolManager.getToolNames()
            });
        }
        bootTimings.phases.phase5_5_warmupAndMCP = Date.now() - phase5_5Start;

        // ========================================
        // Phase 6: Welcome Message AFTER WakeWordMachine Ready
        // ========================================
        const phase6Start = Date.now();
        logger.debug('🔧 [STARTUP-DEBUG] Phase 6: Waiting for WakeWordMachine ready state...');
        // Wait for WakeWordMachine to be in 'ready' state before playing welcome message
        // This ensures the detector is fully warmed up
        const waitForReady = new Promise((resolve) => {
            // Subscribe to state changes
            const subscription = wakeWordMachine.subscribe(() => {
                const snapshot = wakeWordMachine.getSnapshot();
                if (snapshot.matches('ready')) {
                    logger.debug('🔧 [STARTUP-DEBUG] Phase 6: WakeWordMachine ready, playing welcome message...');
                    // Clean up subscription before resolving
                    subscription.unsubscribe();
                    resolve();
                }
            });

            // Check immediately in case already ready
            const snapshot = wakeWordMachine.getSnapshot();
            if (snapshot.matches('ready')) {
                logger.debug('🔧 [STARTUP-DEBUG] Phase 6: WakeWordMachine ready, playing welcome message...');
                subscription.unsubscribe();
                resolve();
            }
        });

        await waitForReady;

        // Get pre-synthesized welcome audio (should be ready by now)
        const welcomeAudio = await welcomeSynthesisPromise;

        // Speak welcome message now that detector is ready
        activeWelcomePlayback = await startTTSWelcome(welcomeAudio, detector, audioPlayer, BEEPS);
        logger.debug('🔧 [STARTUP-DEBUG] Phase 6: Welcome message playback initiated');

        // Clear welcome playback after it completes
        if (activeWelcomePlayback) {
            activeWelcomePlayback.promise.finally(() => {
                activeWelcomePlayback = null;
            });
        }
        bootTimings.phases.phase6_welcomeMessage = Date.now() - phase6Start;

        // ========================================
        // Phase 7: Final Activation
        // ========================================
        const phase7Start = Date.now();
        logger.debug('🔧 [STARTUP-DEBUG] Phase 7: Activating wake word detection...');
        // Activate wake word detection (transitions from startup -> listening)
        logger.info('🎧 Activating wake word detection...');
        voiceService.send({type: 'READY'});

        logger.debug('🔧 [STARTUP-DEBUG] Phase 7: State machine transitioned to listening');
        bootTimings.phases.phase7_finalActivation = Date.now() - phase7Start;

        // Boot timing summary
        const totalBootTime = Date.now() - bootTimings.startTime;
        logger.info('✅ Voice Gateway ready');
        logger.info('⏱️  Boot Time Performance Summary', {
            totalBootTimeMs: totalBootTime,
            totalBootTimeSec: (totalBootTime / 1000).toFixed(2),
            phases: {
                'Phase 1 (Health Checks)': `${bootTimings.phases.phase1_healthChecks}ms`,
                'Phase 2 (Detector Init)': `${bootTimings.phases.phase2_detectorInit}ms`,
                'Phase 3 (Tool System Setup)': `${bootTimings.phases.phase3_toolSystemSetup}ms`,
                'Phase 4 (Voice Service Setup)': `${bootTimings.phases.phase4_voiceServiceSetup}ms`,
                'Phase 5 (Microphone Setup)': `${bootTimings.phases.phase5_microphoneSetup}ms`,
                'Phase 5.5 (Warmup & MCP)': `${bootTimings.phases.phase5_5_warmupAndMCP}ms`,
                'Phase 6 (Welcome Message)': `${bootTimings.phases.phase6_welcomeMessage}ms`,
                'Phase 7 (Final Activation)': `${bootTimings.phases.phase7_finalActivation}ms`
            }
        });
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
