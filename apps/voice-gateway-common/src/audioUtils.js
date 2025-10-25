export function createMelBuffer(frames = 76, bins = 32) {
    return Array.from({length: frames}, () => new Float32Array(bins));
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
    melBuffer.splice(0, melBuffer.length, ...createMelBuffer(frames, bins));
}
