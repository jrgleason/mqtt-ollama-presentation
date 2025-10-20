export function createMelBuffer(frames = 76, bins = 32) {
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
    // Replace content of melBuffer with fresh zeroed frames (mutating array)
    const newBuf = createMelBuffer(frames, bins);
    melBuffer.length = 0;
    for (let i = 0; i < newBuf.length; i++) melBuffer.push(newBuf[i]);
}
