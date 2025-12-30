/**
 * Threshold Constants
 *
 * Numeric thresholds used for comparisons and decision-making
 * throughout the voice gateway system.
 */

/**
 * VAD_SILENCE_THRESHOLD - RMS energy level below which audio is considered silence
 *
 * This is re-exported from audio/constants.js for convenience.
 * See audio/constants.js for detailed documentation.
 *
 * Value: 0.01
 */
export { SILENCE_THRESHOLD as VAD_SILENCE_THRESHOLD } from '../audio/constants.js';

/**
 * MIN_AUDIO_ENERGY - Minimum RMS energy to attempt transcription
 *
 * Audio recordings with RMS energy below this threshold are considered
 * to contain no speech and transcription is skipped to save processing time.
 *
 * Value: 0.000001 (1e-6)
 * Rationale: Extremely quiet audio is likely silence or background noise
 */
export const MIN_AUDIO_ENERGY = 1e-6;

/**
 * MIN_AUDIO_DURATION_SECONDS - Minimum audio duration to attempt transcription
 *
 * Audio recordings shorter than this are skipped as they're unlikely to
 * contain meaningful speech.
 *
 * Value: 0.15 seconds
 * Rationale: Very short audio clips are usually noise or artifacts
 */
export const MIN_AUDIO_DURATION_SECONDS = 0.15;

/**
 * WAKE_WORD_THRESHOLD - Minimum confidence score for wake word detection
 *
 * Wake word detections with confidence below this threshold are ignored.
 * Higher values reduce false positives but may miss valid wake words.
 *
 * Value: 0.5 (50% confidence)
 * Rationale: Balances sensitivity with false positive rate
 */
export const WAKE_WORD_THRESHOLD = 0.5;

/**
 * WAKE_WORD_MIN_SCORE - Absolute minimum valid wake word score
 *
 * Wake word scores must be between 0 and 1.
 *
 * Value: 0.0
 */
export const WAKE_WORD_MIN_SCORE = 0.0;

/**
 * WAKE_WORD_MAX_SCORE - Absolute maximum valid wake word score
 *
 * Wake word scores must be between 0 and 1.
 *
 * Value: 1.0
 */
export const WAKE_WORD_MAX_SCORE = 1.0;
