export function createMelBuffer(frames = 76, bins = 32) {
    // Create an array of `frames` Float32Array elements each of length `bins`, initialized to 0
    return Array(frames).fill(null).map(() => new Float32Array(bins).fill(0));
}

export function newDetectorState({frames = 76, bins = 32} = {}) {
    return {
        melBuffer: createMelBuffer(frames, bins),
        melBufferFilled: false,
        embeddingBuffer: [],
        embeddingBufferFilled: false,
        framesSinceLastPrediction: 0
    };
}

export function fillMelBufferWithZeros(melBuffer, frames = 76, bins = 32) {
    // Mutate existing melBuffer to zeros and correct size
    const newBuf = createMelBuffer(frames, bins);
    melBuffer.length = 0;
    for (let i = 0; i < newBuf.length; i++) melBuffer.push(newBuf[i]);
}

