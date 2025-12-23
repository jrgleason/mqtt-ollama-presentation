/**
 * Audio configuration constants
 *
 * These constants define the audio processing parameters used throughout
 * the voice gateway for consistent audio capture, processing, and playback.
 */

/**
 * Audio sample rate in Hz
 * 16kHz is optimal for speech recognition and wake word detection
 * @type {number}
 */
export const SAMPLE_RATE = 16000;

/**
 * Audio chunk size in samples
 * 1280 samples at 16kHz = 80ms of audio
 * This chunk size is required by the OpenWakeWord mel-spectrogram model
 * @type {number}
 */
export const CHUNK_SIZE = 1280;

/**
 * Voice Activity Detection (VAD) Configuration Constants
 *
 * These constants control the behavior of voice activity detection,
 * recording duration, and silence detection thresholds.
 */

/**
 * PRE_ROLL_MS - Duration of audio to capture before wake word detection
 *
 * When a wake word is detected, we include this much audio from BEFORE
 * the wake word was detected. This ensures we capture the beginning of
 * the user's utterance even if they started speaking slightly before
 * the wake word was fully recognized.
 *
 * Value: 300ms
 * Rationale: Balances context capture with memory usage
 */
export const PRE_ROLL_MS = 300;
export const PRE_ROLL_SAMPLES = Math.floor((PRE_ROLL_MS / 1000) * SAMPLE_RATE);

/**
 * SILENCE_THRESHOLD - RMS energy level below which audio is considered silence
 *
 * This threshold distinguishes between speech/noise and silence.
 * - Typical human voice: 0.05 - 0.2 RMS energy
 * - Background noise: < 0.01 RMS energy
 * - Silence: < 0.01 RMS energy
 *
 * Value: 0.01
 * Rationale: Empirically tested to work well in typical home environments
 */
export const SILENCE_THRESHOLD = 0.01;

/**
 * MIN_SPEECH_MS - Minimum duration of recording before it can be stopped
 *
 * This prevents the system from stopping recording too early due to
 * brief pauses, coughs, or mouth clicks. The user must speak for at
 * least this duration before silence detection can trigger a stop.
 *
 * Value: 700ms
 * Rationale: Avoids false positives from very short utterances
 */
export const MIN_SPEECH_MS = 700;
export const MIN_SPEECH_SAMPLES = Math.floor((MIN_SPEECH_MS / 1000) * SAMPLE_RATE);

/**
 * TRAILING_SILENCE_MS - Duration of silence required before stopping recording
 *
 * After the user finishes speaking, we wait for this much continuous
 * silence before automatically stopping the recording. This allows for
 * natural pauses in speech without prematurely cutting off the user.
 *
 * Default: 1500ms (can be overridden via config.vad.trailingSilenceMs)
 * Rationale: Allows for natural pauses while keeping total latency reasonable
 */
export const DEFAULT_TRAILING_SILENCE_MS = 1500;

/**
 * MAX_RECORDING_MS - Maximum duration of a single recording
 *
 * This is a safety timeout to prevent infinite recording if voice activity
 * detection fails or if the user speaks continuously for an extended period.
 * After this duration, recording is automatically stopped regardless of
 * whether silence is detected.
 *
 * Default: 10000ms (10 seconds) (can be overridden via config.vad.maxUtteranceMs)
 * Rationale: Typical voice commands are 2-5 seconds; 10s provides ample buffer
 */
export const DEFAULT_MAX_RECORDING_MS = 10000;

/**
 * GRACE_BEFORE_STOP_MS - Grace period after wake word before silence detection activates
 *
 * After the wake word is detected and recording starts, we allow this much
 * time for the user to start speaking before silence detection can stop the
 * recording. This accounts for reaction time and the natural pause between
 * saying the wake word and the actual command.
 *
 * Default: 1200ms (can be overridden via config.vad.graceBeforeStopMs)
 * Rationale: Human reaction time + natural pause between wake word and command
 */
export const DEFAULT_GRACE_BEFORE_STOP_MS = 1200;

/**
 * Helper function to get trailing silence duration from config or use default
 */
export function getTrailingSilenceMs(config) {
    return config?.vad?.trailingSilenceMs || DEFAULT_TRAILING_SILENCE_MS;
}

/**
 * Helper function to calculate trailing silence samples required
 */
export function getTrailingSilenceSamples(config) {
    return Math.floor((getTrailingSilenceMs(config) / 1000) * SAMPLE_RATE);
}

/**
 * Helper function to get max recording duration from config or use default
 */
export function getMaxRecordingMs(config) {
    return config?.vad?.maxUtteranceMs || DEFAULT_MAX_RECORDING_MS;
}

/**
 * Helper function to calculate max recording samples
 */
export function getMaxRecordingSamples(config) {
    return Math.floor((getMaxRecordingMs(config) / 1000) * SAMPLE_RATE);
}

/**
 * Helper function to get grace period from config or use default
 */
export function getGraceBeforeStopMs(config) {
    return config?.vad?.graceBeforeStopMs || DEFAULT_GRACE_BEFORE_STOP_MS;
}
