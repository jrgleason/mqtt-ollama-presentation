/**
 * VoiceActivityDetector - Determines when to stop recording based on silence detection
 *
 * This class implements Voice Activity Detection (VAD) logic that determines
 * when a user has finished speaking and recording should stop.
 *
 * Responsibilities:
 * - Detect silence vs. speech based on RMS energy thresholds
 * - Implement grace period after wake word (allow user time to speak)
 * - Enforce minimum speech duration (avoid false positives)
 * - Enforce maximum recording length (safety timeout)
 * - Track silence duration for trailing silence detection
 *
 * VAD Algorithm:
 * 1. After wake word, allow grace period (default 1200ms) before silence can stop recording
 * 2. Detect speech when RMS energy >= 0.01 (SILENCE_THRESHOLD)
 * 3. After speech detected, require trailing silence (default 1500ms) before stopping
 * 4. Require minimum speech duration (default 700ms) before stopping
 * 5. Force stop after maximum recording length (default 10000ms)
 */

import { rmsEnergy } from './AudioUtils.js';
import {
    SILENCE_THRESHOLD,
    MIN_SPEECH_SAMPLES,
    getTrailingSilenceSamples,
    getMaxRecordingSamples,
    getGraceBeforeStopMs
} from './constants.js';

export class VoiceActivityDetector {
    /**
     * Create a VoiceActivityDetector instance
     *
     * @param {Object} config - Configuration object (for VAD thresholds)
     * @param {Object} logger - Logger instance
     */
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;

        // VAD state
        this.silenceSampleCount = 0;
        this.hasSpokenDuringRecording = false;

        // Calculate thresholds from config
        this.silenceSamplesRequired = getTrailingSilenceSamples(config);
        this.maxRecordingSamples = getMaxRecordingSamples(config);
        this.graceBeforeStopMs = getGraceBeforeStopMs(config);
    }

    /**
     * Reset VAD state (called when recording starts)
     */
    reset() {
        this.silenceSampleCount = 0;
        this.hasSpokenDuringRecording = false;
    }

    /**
     * Process audio samples and determine if recording should stop
     *
     * @param {Float32Array} samples - Audio samples to analyze
     * @param {Object} recordingState - AudioRecordingState instance
     * @returns {Object} Decision object: {shouldStop: boolean, reason: string, hasSpoken: boolean}
     */
    processSamples(samples, recordingState) {
        if (!samples || samples.length === 0) {
            return { shouldStop: false, reason: null, hasSpoken: this.hasSpokenDuringRecording };
        }

        // Check maximum recording length (safety timeout)
        if (recordingState.recordedSampleCount >= this.maxRecordingSamples) {
            this.logger.debug('⏱️ Max recording length reached', {
                samples: recordingState.recordedSampleCount,
                maxSamples: this.maxRecordingSamples
            });
            return {
                shouldStop: true,
                reason: 'MAX_LENGTH_REACHED',
                hasSpoken: this.hasSpokenDuringRecording
            };
        }

        // Calculate RMS energy to detect silence vs. speech
        const energy = rmsEnergy(samples);

        if (energy < SILENCE_THRESHOLD) {
            // Silence detected
            this.silenceSampleCount += samples.length;

            // Check grace period (don't stop during grace period after wake word)
            const sinceStartMs = recordingState.getRecordingDurationMs();
            const graceActive = !this.hasSpokenDuringRecording && sinceStartMs < this.graceBeforeStopMs;

            if (graceActive) {
                // Still in grace period, don't stop yet
                return {
                    shouldStop: false,
                    reason: null,
                    hasSpoken: this.hasSpokenDuringRecording
                };
            }

            // Check if enough silence has accumulated AND minimum speech duration met
            const enoughSilence = this.silenceSampleCount >= this.silenceSamplesRequired;
            const enoughSpeech = recordingState.recordedSampleCount >= MIN_SPEECH_SAMPLES;

            if (enoughSilence && enoughSpeech) {
                this.logger.debug('🤫 Silence detected', {
                    silenceSamples: this.silenceSampleCount,
                    requiredSilenceSamples: this.silenceSamplesRequired,
                    totalSamples: recordingState.recordedSampleCount
                });
                return {
                    shouldStop: true,
                    reason: 'SILENCE_DETECTED',
                    hasSpoken: this.hasSpokenDuringRecording
                };
            }
        } else {
            // Speech detected (energy above threshold)
            if (!this.hasSpokenDuringRecording) {
                this.hasSpokenDuringRecording = true;
                this.logger.debug('✅ Speech detected in recording', {
                    energy: energy.toFixed(4),
                    threshold: SILENCE_THRESHOLD
                });
            }

            // Reset silence counter when speech is detected
            this.silenceSampleCount = 0;
        }

        return {
            shouldStop: false,
            reason: null,
            hasSpoken: this.hasSpokenDuringRecording
        };
    }

    /**
     * Get current VAD state (for debugging)
     * @returns {Object}
     */
    getState() {
        return {
            silenceSampleCount: this.silenceSampleCount,
            hasSpokenDuringRecording: this.hasSpokenDuringRecording,
            silenceSamplesRequired: this.silenceSamplesRequired,
            maxRecordingSamples: this.maxRecordingSamples,
            graceBeforeStopMs: this.graceBeforeStopMs
        };
    }
}
