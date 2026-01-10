/**
 * DetectorStateManager
 *
 * Manages OpenWakeWord detector state lifecycle including mel buffer
 * and embedding buffer initialization, reset, and maintenance.
 *
 * The detector state includes:
 * - melBuffer: Array of Float32Arrays for mel-spectrogram frames
 * - embeddingBuffer: Array for model embeddings
 * - melBufferFilled/embeddingBufferFilled: State tracking flags
 * - framesSinceLastPrediction: Frame counter for prediction timing
 */
export class DetectorStateManager {
    /**
     * Create a new DetectorStateManager
     *
     * @param {Object} [options] - Configuration options
     * @param {number} [options.frames=76] - Number of mel-spectrogram frames
     * @param {number} [options.bins=32] - Number of mel-spectrogram bins per frame
     */
    constructor({frames = 76, bins = 32} = {}) {
        this.frames = frames;
        this.bins = bins;
    }

    /**
     * Create a new mel buffer filled with zeros
     *
     * @returns {Array<Float32Array>} Mel buffer with configured dimensions
     */
    createMelBuffer() {
        return Array.from({length: this.frames}, () => new Float32Array(this.bins));
    }

    /**
     * Create a new detector state object
     *
     * @returns {Object} Fresh detector state
     * @returns {Array<Float32Array>} state.melBuffer - Mel-spectrogram buffer
     * @returns {boolean} state.melBufferFilled - Whether mel buffer is filled
     * @returns {Array} state.embeddingBuffer - Embedding buffer
     * @returns {boolean} state.embeddingBufferFilled - Whether embedding buffer is filled
     * @returns {number} state.framesSinceLastPrediction - Frame counter
     */
    newDetectorState() {
        return {
            melBuffer: this.createMelBuffer(),
            melBufferFilled: false,
            embeddingBuffer: [],
            embeddingBufferFilled: false,
            framesSinceLastPrediction: 0
        };
    }

    /**
     * Fill an existing mel buffer with zeros
     *
     * This maintains the original buffer array reference while replacing
     * all frames with fresh zero-filled Float32Arrays.
     *
     * @param {Array<Float32Array>} melBuffer - Existing mel buffer to fill
     */
    fillMelBufferWithZeros(melBuffer) {
        melBuffer.splice(0, melBuffer.length, ...this.createMelBuffer());
    }

    /**
     * Reset detector state to initial values
     *
     * Clears mel buffer, embedding buffer, and resets all flags and counters.
     *
     * @param {Object} state - Detector state to reset
     */
    reset(state) {
        this.fillMelBufferWithZeros(state.melBuffer);
        state.melBufferFilled = false;
        state.embeddingBuffer.length = 0;
        state.embeddingBufferFilled = false;
        state.framesSinceLastPrediction = 0;
    }
}
