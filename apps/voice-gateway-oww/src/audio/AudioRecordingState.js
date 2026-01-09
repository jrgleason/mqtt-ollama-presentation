/**
 * AudioRecordingState - Manages audio recording state and buffer lifecycle
 *
 * This class encapsulates all mutable state related to audio recording:
 * - Recording status (on/off)
 * - Audio buffers (recording, pre-roll, and processing buffers)
 * - Sample counters
 *
 * Responsibilities:
 * - Initialize and manage three separate audio buffers
 * - Handle recording lifecycle (start, append, stop)
 * - Maintain pre-roll buffer with sliding window
 * - Provide immutable snapshots of recorded audio
 *
 * This class follows the Single Responsibility Principle by focusing
 * solely on buffer management, delegating VAD logic and wake word
 * detection to separate classes.
 */

import { PRE_ROLL_SAMPLES } from './constants.js';

export class AudioRecordingState {
    /**
     * Create an AudioRecordingState instance
     *
     * @param {Object} config - Configuration object
     * @param {Object} logger - Logger instance
     */
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;

        // Audio buffers
        this.audioBuffer = [];           // Buffer for wake word detection chunks
        this.recordedAudio = [];         // Buffer for complete recording
        this.preRollBuffer = [];         // Circular buffer for audio before wake word

        // Recording state
        this._isRecording = false;
        this.recordingStartedAt = 0;
    }

    /**
     * Check if currently recording
     * @returns {boolean}
     */
    get isRecording() {
        return this._isRecording;
    }

    /**
     * Get number of recorded samples
     * @returns {number}
     */
    get recordedSampleCount() {
        return this.recordedAudio.length;
    }

    /**
     * Get number of samples in audio buffer (for wake word detection)
     * @returns {number}
     */
    get audioBufferSampleCount() {
        return this.audioBuffer.length;
    }

    /**
     * Start recording - copies pre-roll buffer to recordedAudio and resets state
     */
    startRecording() {
        this._isRecording = true;

        // Copy pre-roll buffer to recorded audio (captures audio before wake word)
        this.recordedAudio = Array.from(this.preRollBuffer);

        // Reset recording timestamp
        this.recordingStartedAt = Date.now();

        this.logger.debug('🎙️ Recording started', {
            preRollSamples: this.preRollBuffer.length,
            preRollMs: Math.round((this.preRollBuffer.length / 16000) * 1000)
        });
    }

    /**
     * Stop recording and return immutable snapshot of recorded audio
     *
     * @returns {Float32Array} Immutable copy of recorded audio
     */
    stopRecording() {
        this._isRecording = false;

        // Create immutable snapshot
        const audioSnapshot = new Float32Array(this.recordedAudio);

        const sampleCount = this.recordedAudio.length;
        const durationMs = Math.round((sampleCount / 16000) * 1000);

        // Clear buffers
        this.recordedAudio = [];

        this.logger.debug('🛑 Recording stopped', {
            samples: sampleCount,
            durationMs: durationMs
        });

        return audioSnapshot;
    }

    /**
     * Append audio samples to appropriate buffers based on recording state
     *
     * @param {Float32Array} samples - Audio samples to append
     */
    appendAudio(samples) {
        if (!samples || samples.length === 0) {
            return;
        }

        // Always add to audio buffer (for wake word detection)
        this.audioBuffer = this.audioBuffer.concat(Array.from(samples));

        // Update pre-roll buffer (maintains sliding window)
        this.updatePreRollBuffer(samples);

        // If recording, add to recorded audio
        if (this._isRecording) {
            this.recordedAudio = this.recordedAudio.concat(Array.from(samples));
        }
    }

    /**
     * Update pre-roll buffer with new samples (maintains fixed size sliding window)
     *
     * @param {Float32Array} samples - New audio samples
     */
    updatePreRollBuffer(samples) {
        if (!samples || samples.length === 0) {
            return;
        }

        // Add new samples to pre-roll buffer
        this.preRollBuffer = this.preRollBuffer.concat(Array.from(samples));

        // Trim to maintain fixed size (discard oldest samples)
        if (this.preRollBuffer.length > PRE_ROLL_SAMPLES) {
            this.preRollBuffer = this.preRollBuffer.slice(
                this.preRollBuffer.length - PRE_ROLL_SAMPLES
            );
        }
    }

    /**
     * Get and remove a chunk from the audio buffer
     *
     * @param {number} chunkSize - Size of chunk to extract
     * @returns {Float32Array|null} Audio chunk or null if insufficient samples
     */
    getChunk(chunkSize) {
        if (this.audioBuffer.length < chunkSize) {
            return null;
        }

        const chunk = new Float32Array(this.audioBuffer.slice(0, chunkSize));
        this.audioBuffer = this.audioBuffer.slice(chunkSize);

        return chunk;
    }

    /**
     * Check if audio buffer has enough samples for a chunk
     *
     * @param {number} chunkSize - Required chunk size
     * @returns {boolean}
     */
    hasChunk(chunkSize) {
        return this.audioBuffer.length >= chunkSize;
    }

    /**
     * Drain audio buffer (discard all samples)
     * Used during startup state when wake word detection is not active
     *
     * @param {number} chunkSize - Size of chunks to drain
     */
    drainBuffer(chunkSize) {
        if (this.audioBuffer.length >= chunkSize) {
            this.audioBuffer = this.audioBuffer.slice(chunkSize);
        }
    }

    /**
     * Get recording duration in milliseconds
     * @returns {number}
     */
    getRecordingDurationMs() {
        if (!this._isRecording) {
            return 0;
        }
        return Date.now() - this.recordingStartedAt;
    }

    /**
     * Reset all buffers (for cleanup or error recovery)
     */
    reset() {
        this.audioBuffer = [];
        this.recordedAudio = [];
        this.preRollBuffer = [];
        this._isRecording = false;
        this.recordingStartedAt = 0;

        this.logger.debug('🔄 Audio buffers reset');
    }
}
