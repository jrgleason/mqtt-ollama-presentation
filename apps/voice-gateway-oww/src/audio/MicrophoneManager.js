/**
 * MicrophoneManager - Orchestrates microphone setup and audio processing
 *
 * This class is the main coordinator for all microphone-related functionality.
 * It brings together the specialized components (AudioRecordingState,
 * VoiceActivityDetector, WakeWordProcessor) and integrates them with
 * the XState voice state machine.
 *
 * Responsibilities:
 * - Create and configure microphone instance
 * - Initialize and coordinate sub-components
 * - Handle XState state transitions (listening, recording, etc.)
 * - Process incoming audio stream from microphone
 * - Route audio to appropriate processors based on state
 * - Handle microphone errors gracefully
 *
 * Architecture:
 * - Uses dependency injection for testability
 * - Delegates to specialized classes (SRP)
 * - Integrates with XState for state management
 * - Provides clean interface for main.js
 */

import mic from 'mic';
import { AudioRecordingState } from './AudioRecordingState.js';
import { VoiceActivityDetector } from './VoiceActivityDetector.js';
import { WakeWordProcessor } from './WakeWordProcessor.js';
import { CHUNK_SIZE } from './constants.js';
import { getServiceSnapshot } from '../util/XStateHelpers.js';
import { errMsg } from '../util/Logger.js';

export class MicrophoneManager {
    /**
     * Create a MicrophoneManager instance
     *
     * @param {Object} config - Configuration object
     * @param {Object} logger - Logger instance
     * @param {Object} voiceService - XState voice state machine service
     * @param {Object} orchestrator - VoiceInteractionOrchestrator instance (or BackgroundTranscriber for compatibility)
     * @param {Object} detector - OpenWakeWord detector instance
     */
    constructor(config, logger, voiceService, orchestrator, detector) {
        this.config = config;
        this.logger = logger;
        this.voiceService = voiceService;
        this.orchestrator = orchestrator;
        this.detector = detector;

        // Sub-components (initialized in initialize())
        this.recordingState = null;
        this.vadDetector = null;
        this.wakeWordProcessor = null;

        // Microphone instance
        this.micInstance = null;
        this.micInputStream = null;
    }

    /**
     * Initialize all sub-components
     */
    initialize() {
        // Create audio recording state manager
        this.recordingState = new AudioRecordingState(this.config, this.logger);

        // Create voice activity detector
        this.vadDetector = new VoiceActivityDetector(this.config, this.logger);

        // Create wake word processor
        this.wakeWordProcessor = new WakeWordProcessor(
            this.detector,
            this.config,
            this.logger
        );

        this.logger.debug('✅ MicrophoneManager components initialized');
    }

    /**
     * Create and configure microphone instance
     *
     * @returns {Object} Microphone instance
     */
    setupMicrophoneInstance() {
        this.micInstance = mic({
            rate: String(this.config.audio.sampleRate),
            channels: String(this.config.audio.channels),
            device: this.config.audio.micDevice,
            bitwidth: '16',
            encoding: 'signed-integer',
            endian: 'little'
        });

        this.micInputStream = this.micInstance.getAudioStream();

        this.logger.debug('🎤 Microphone instance created', {
            device: this.config.audio.micDevice,
            sampleRate: this.config.audio.sampleRate,
            channels: this.config.audio.channels
        });

        return this.micInstance;
    }

    /**
     * Setup XState state machine listeners
     */
    setupXStateListeners() {
        this.voiceService.subscribe((state) => {
            const value = state.value;

            // Transition TO recording state
            if (value === 'recording' && !this.recordingState.isRecording) {
                this.recordingState.startRecording();
                this.vadDetector.reset();
            }
            // Transition FROM recording state
            else if (value !== 'recording' && this.recordingState.isRecording) {
                const audioSnapshot = this.recordingState.stopRecording();

                // Process voice interaction in background (transcribe + AI + TTS)
                if (audioSnapshot.length > 0) {
                    this.orchestrator.processVoiceInteraction(audioSnapshot).catch(err => {
                        this.logger.error('Voice interaction error', { error: errMsg(err) });
                    });
                }
            }
        });

        this.logger.debug('✅ XState listeners attached');
    }

    /**
     * Convert Int16 buffer to Float32
     *
     * @param {Buffer} buf - Int16 audio buffer
     * @returns {Float32Array} Normalized Float32 audio
     */
    toFloat32FromInt16Buffer(buf) {
        const pcm = new Int16Array(buf.buffer, buf.byteOffset, buf.length / Int16Array.BYTES_PER_ELEMENT);
        const out = new Float32Array(pcm.length);
        for (let i = 0; i < pcm.length; i++) {
            out[i] = pcm[i] / 32768.0;
        }
        return out;
    }

    /**
     * Handle incoming microphone data
     */
    setupMicrophoneDataHandler() {
        this.micInputStream.on('data', async (data) => {
            // Convert Int16 to Float32
            const normalized = this.toFloat32FromInt16Buffer(data);

            // Add samples to recording state
            this.recordingState.appendAudio(normalized);

            // Get current state machine state
            const snapshot = getServiceSnapshot(this.voiceService);
            if (!snapshot || typeof snapshot.matches !== 'function') {
                return;
            }

            // Handle audio based on current state
            if (snapshot.matches('startup')) {
                // Drain buffer during startup (wait for READY event)
                this.recordingState.drainBuffer(CHUNK_SIZE);
                return;
            }

            if (snapshot.matches('listening')) {
                // Process audio for wake word detection
                await this.processListeningState();
            } else if (snapshot.matches('recording')) {
                // Process audio for voice activity detection
                this.processRecordingState(normalized);
            }
        });

        this.logger.debug('✅ Microphone data handler attached');
    }

    /**
     * Process audio during listening state (wake word detection)
     */
    async processListeningState() {
        // Process audio in chunks for wake word detection
        while (this.recordingState.hasChunk(CHUNK_SIZE)) {
            const chunk = this.recordingState.getChunk(CHUNK_SIZE);

            // Check for wake word
            const result = await this.wakeWordProcessor.processChunk(chunk);

            if (result.detected) {
                // Wake word detected - trigger state transition
                this.voiceService.send({ type: 'TRIGGER', ts: Date.now() });
            }
        }
    }

    /**
     * Process audio during recording state (VAD)
     *
     * @param {Float32Array} samples - Audio samples
     */
    processRecordingState(samples) {
        // Run voice activity detection
        const vadResult = this.vadDetector.processSamples(samples, this.recordingState);

        if (vadResult.shouldStop) {
            // Send appropriate event to state machine
            if (vadResult.reason === 'SILENCE_DETECTED') {
                this.voiceService.send({ type: 'SILENCE_DETECTED' });
            } else if (vadResult.reason === 'MAX_LENGTH_REACHED') {
                this.voiceService.send({ type: 'MAX_LENGTH_REACHED' });
            }
        }
    }

    /**
     * Setup microphone error handler
     */
    setupErrorHandler() {
        this.micInputStream.on('error', (err) => {
            this.logger.error('❌ Microphone error', {
                error: errMsg(err),
                device: this.config.audio.micDevice
            });
        });

        this.logger.debug('✅ Microphone error handler attached');
    }

    /**
     * Start the microphone and return the instance
     *
     * @returns {Object} Microphone instance
     */
    start() {
        // Initialize components
        this.initialize();

        // Setup microphone
        this.setupMicrophoneInstance();

        // Setup XState integration
        this.setupXStateListeners();

        // Setup audio processing
        this.setupMicrophoneDataHandler();

        // Setup error handling
        this.setupErrorHandler();

        // Start microphone
        this.micInstance.start();
        this.logger.info('🎤 Microphone started');

        return this.micInstance;
    }

    /**
     * Stop the microphone
     */
    stop() {
        if (this.micInstance) {
            this.micInstance.stop();
            this.logger.info('🛑 Microphone stopped');
        }
    }
}
