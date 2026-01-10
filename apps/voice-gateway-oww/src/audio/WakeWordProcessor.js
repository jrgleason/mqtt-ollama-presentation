/**
 * WakeWordProcessor - Handles wake word detection and feedback
 *
 * This class encapsulates wake word detection logic, score evaluation,
 * and audio feedback (beeps).
 *
 * Responsibilities:
 * - Process audio chunks through the wake word detector
 * - Evaluate detection scores against configured threshold
 * - Determine wake word name from model path
 * - Trigger audio feedback (beep) on detection
 * - Safely reset detector after detection
 * - Handle detector errors gracefully
 *
 * Wake Word Detection Flow:
 * 1. Receive audio chunk (Float32Array)
 * 2. Pass chunk to OpenWakeWord detector
 * 3. Compare score to threshold (e.g., 0.5)
 * 4. If detected:
 *    - Play beep feedback
 *    - Reset detector state
 *    - Return detection result with score and wake word name
 * 5. If error, log and return negative result (don't crash)
 */

import {safeDetectorReset} from '../util/XStateHelpers.js';
import {BeepUtil} from '../util/BeepUtil.js';
import {AudioPlayer} from './AudioPlayer.js';
import {errMsg} from '../util/Logger.js';

export class WakeWordProcessor {
    /**
     * Create a WakeWordProcessor instance
     *
     * @param {Object} detector - OpenWakeWord detector instance
     * @param {Object} config - Configuration object (for threshold and model path)
     * @param {Object} logger - Logger instance
     * @param {AudioPlayer} audioPlayer - AudioPlayer instance for beep playback
     */
    constructor(detector, config, logger, audioPlayer) {
        this.detector = detector;
        this.config = config;
        this.logger = logger;
        this.audioPlayer = audioPlayer || new AudioPlayer(config, logger);

        // Initialize beep util
        this.beep = new BeepUtil(config);

        // Extract threshold from config
        this.threshold = config.openWakeWord.threshold;
        this.modelPath = config.openWakeWord.modelPath;
    }

    /**
     * Process an audio chunk and check for wake word detection
     *
     * @param {Float32Array} chunk - Audio chunk to process (typically 1280 samples)
     * @returns {Promise<Object>} Detection result: {detected: boolean, score: number, wakeWord: string|null}
     */
    async processChunk(chunk) {
        try {
            // Run wake word detection
            const score = await this.detector.detect(chunk);

            // Check if score exceeds threshold
            if (score > this.threshold) {
                // Determine wake word name from model path
                const wakeWord = this.getWakeWordName();

                // Log detection
                this.logger.info('🎤 Wake word detected!', {
                    wakeWord,
                    score: score.toFixed(3),
                    threshold: this.threshold
                });

                // Reset detector state
                safeDetectorReset(this.detector, 'post-trigger');

                // Play audio feedback (beep)
                this.audioPlayer.play(this.beep.BEEPS.wakeWord).catch(err => {
                    this.logger.debug('Beep playback failed', {error: errMsg(err)});
                });

                return {
                    detected: true,
                    score,
                    wakeWord
                };
            }

            // No detection
            return {
                detected: false,
                score,
                wakeWord: null
            };
        } catch (err) {
            // Handle detector errors gracefully
            this.logger.error('Wake word detection error', {
                error: errMsg(err),
                chunkSize: chunk?.length || 0
            });

            return {
                detected: false,
                score: 0,
                wakeWord: null
            };
        }
    }

    /**
     * Determine wake word name from model path
     *
     * @returns {string} Human-readable wake word name
     */
    getWakeWordName() {
        const modelPath = this.modelPath.toLowerCase();

        if (modelPath.includes('jarvis')) {
            return 'Hey Jarvis';
        } else if (modelPath.includes('robot')) {
            return 'Hello Robot';
        } else {
            return 'Wake word';
        }
    }

    /**
     * Get processor configuration (for debugging)
     * @returns {Object}
     */
    getConfig() {
        return {
            threshold: this.threshold,
            modelPath: this.modelPath,
            wakeWord: this.getWakeWordName()
        };
    }
}
