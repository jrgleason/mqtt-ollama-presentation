# Wake Word Detection - Implementation Fix

**Date:** 2025-10-12
**Issue:** Shape mismatch - expecting `[1, 16, 96]` but getting `[1, 1, 96]`
**Root Cause:** Fundamental misunderstanding of temporal vs. spatial processing

---

## Problem Statement

The wake word model expects:

- **Shape:** `[1, 16, 96]`
- **Meaning:** 1 batch, 16 time steps, 96 features per time step
- **Temporal window:** 16 embeddings × 80ms = 1.28 seconds of audio

We were providing:

- **Shape:** `[1, 1, 96]`
- **Meaning:** 1 batch, 1 time step, 96 features
- **Temporal window:** Just 1 embedding (effectively 760ms with overlap, but wrong format)

---

## The Fix: Maintain Rolling Buffers

### Architecture Change

```
OLD (Broken):
─────────────
Audio → Accumulate exactly 76 mel frames → Extract 1 embedding → Try to detect ❌

NEW (Correct):
──────────────
Audio (streaming 80ms chunks)
  ↓
Mel Buffer (rolling, ≥76 frames)
  ↓ (every 80ms: extract last 76 frames)
Embedding Model → 1 new embedding (96-dim)
  ↓
Embedding Buffer (rolling, ≥16 embeddings)
  ↓ (every 80ms: take last 16 embeddings)
Wake Word Model → Detection score ✓
```

---

## Implementation Details

### 1. Add State Variables

```typescript
// Global state for streaming detection
class WakeWordDetector {
    private melBuffer: Float32Array[] = [];           // Rolling buffer of mel frames
    private embeddingBuffer: Float32Array[] = [];     // Rolling buffer of embeddings
    private readonly MEL_BUFFER_MAX = 100;            // ~1 second of mel frames
    private readonly EMBEDDING_BUFFER_MAX = 30;       // ~2.4 seconds of embeddings
    private readonly WAKE_WORD_WINDOW = 16;           // 16 embeddings for detection
    private readonly MEL_EMBEDDING_WINDOW = 76;       // 76 frames for 1 embedding
}
```

### 2. Process Audio in 80ms Chunks

```typescript
async processAudioChunk(pcmSamples: Int16Array): Promise<DetectionResult> {
    // Validate input
    if (pcmSamples.length !== 1280) {  // 80ms @ 16kHz
        throw new Error(`Expected 1280 samples, got ${pcmSamples.length}`);
    }

    // Step 1: Generate mel spectrogram (8 new frames)
    const newMelFrames = await this.melSpectrogramModel.predict(pcmSamples);
    this.addToMelBuffer(newMelFrames);  // Adds 8 frames

    // Step 2: Extract embedding (if we have enough mel frames)
    if (this.melBuffer.length < this.MEL_EMBEDDING_WINDOW) {
        return { ready: false, phase: 'warmup-mel', framesNeeded: this.MEL_EMBEDDING_WINDOW - this.melBuffer.length };
    }

    const embedding = await this.extractEmbedding();
    this.addToEmbeddingBuffer(embedding);

    // Step 3: Detect wake word (if we have enough embeddings)
    if (this.embeddingBuffer.length < this.WAKE_WORD_WINDOW) {
        return { ready: false, phase: 'warmup-embedding', embeddingsNeeded: this.WAKE_WORD_WINDOW - this.embeddingBuffer.length };
    }

    const score = await this.detectWakeWord();
    return {
        ready: true,
        score: score,
        detected: score > 0.5,  // Configurable threshold
        timestamp: Date.now()
    };
}
```

### 3. Buffer Management Methods

```typescript
private addToMelBuffer(newFrames: Float32Array[]): void {
    // newFrames.length should be 8 (one 80ms chunk)
    this.melBuffer.push(...newFrames);

    // Keep buffer from growing too large
    if (this.melBuffer.length > this.MEL_BUFFER_MAX) {
        this.melBuffer = this.melBuffer.slice(-this.MEL_BUFFER_MAX);
    }
}

private addToEmbeddingBuffer(embedding: Float32Array): void {
    // embedding.length should be 96
    this.embeddingBuffer.push(embedding);

    // Keep buffer from growing too large
    if (this.embeddingBuffer.length > this.EMBEDDING_BUFFER_MAX) {
        this.embeddingBuffer = this.embeddingBuffer.slice(-this.EMBEDDING_BUFFER_MAX);
    }
}
```

### 4. Embedding Extraction

```typescript
private async extractEmbedding(): Promise<Float32Array> {
    // Take last 76 mel frames
    const last76Frames = this.melBuffer.slice(-this.MEL_EMBEDDING_WINDOW);

    // Reshape for model: [1, 76, 32, 1]
    const input = tf.tensor4d(
        last76Frames.flat(),
        [1, 76, 32, 1],
        'float32'
    );

    // Run embedding model
    const output = this.embeddingModel.predict(input) as tf.Tensor;
    const embedding = await output.data();  // [96]

    // Cleanup
    input.dispose();
    output.dispose();

    return new Float32Array(embedding);
}
```

### 5. Wake Word Detection

```typescript
private async detectWakeWord(): Promise<number> {
    // Take last 16 embeddings
    const last16Embeddings = this.embeddingBuffer.slice(-this.WAKE_WORD_WINDOW);

    // Reshape for model: [1, 16, 96]
    const flatEmbeddings = last16Embeddings.flatMap(emb => Array.from(emb));
    const input = tf.tensor3d(
        flatEmbeddings,
        [1, 16, 96],
        'float32'
    );

    // Run wake word model
    const output = this.wakeWordModel.predict(input) as tf.Tensor;
    const scores = await output.data();
    const score = scores[0];  // Single score output

    // Cleanup
    input.dispose();
    output.dispose();

    return score;
}
```

### 6. Reset Method

```typescript
reset(): void {
    this.melBuffer = [];
    this.embeddingBuffer = [];
    console.log('Wake word detector reset');
}
```

---

## Usage Example

```typescript
const detector = new WakeWordDetector();
await detector.initialize();  // Load models

// Simulate streaming audio (80ms chunks)
const audioStream = getAudioStream();  // Your audio source

audioStream.on('data', async (chunk: Int16Array) => {
    const result = await detector.processAudioChunk(chunk);

    if (!result.ready) {
        // Still warming up
        console.log(`Warming up: ${result.phase}, need ${result.framesNeeded || result.embeddingsNeeded} more`);
        return;
    }

    if (result.detected) {
        console.log(`🎤 Wake word detected! Score: ${result.score}`);
        // Trigger your action here
    }
});
```

---

## Timeline to First Detection

```
Time 0ms:       Start streaming
                ↓
Time 760ms:     First embedding ready (10 chunks × 80ms)
                melBuffer has 80 frames (76 needed, 8 per chunk)
                embeddingBuffer has 1 embedding
                ↓
Time 1280ms:    First detection possible (16 chunks × 80ms)
                embeddingBuffer has 16 embeddings
                ↓
Time 1360ms+:   Continuous detection every 80ms
```

**Total warmup time:** ~1.28 seconds

---

## Memory Requirements

### Mel Buffer

- **Size:** 100 frames × 32 features × 4 bytes = ~13 KB
- **Duration:** ~1 second of audio history

### Embedding Buffer

- **Size:** 30 embeddings × 96 features × 4 bytes = ~12 KB
- **Duration:** ~2.4 seconds of audio history

**Total state:** ~25 KB (very reasonable)

---

## Testing Strategy

### Unit Tests

```typescript
describe('WakeWordDetector', () => {
    it('should require 10 chunks before first embedding', async () => {
        const detector = new WakeWordDetector();
        await detector.initialize();

        for (let i = 0; i < 9; i++) {
            const chunk = new Int16Array(1280).fill(0);
            const result = await detector.processAudioChunk(chunk);
            expect(result.ready).toBe(false);
            expect(result.phase).toBe('warmup-mel');
        }

        const chunk = new Int16Array(1280).fill(0);
        const result = await detector.processAudioChunk(chunk);
        expect(result.phase).toBe('warmup-embedding');  // Now waiting for embeddings
    });

    it('should be ready after 16 chunks', async () => {
        const detector = new WakeWordDetector();
        await detector.initialize();

        for (let i = 0; i < 16; i++) {
            const chunk = new Int16Array(1280).fill(0);
            await detector.processAudioChunk(chunk);
        }

        const chunk = new Int16Array(1280).fill(0);
        const result = await detector.processAudioChunk(chunk);
        expect(result.ready).toBe(true);
        expect(result.score).toBeDefined();
    });
});
```

### Integration Tests

```typescript
it('should detect "hey jarvis" in test audio', async () => {
    const detector = new WakeWordDetector();
    await detector.initialize();

    const testAudio = loadTestAudio('hey_jarvis.wav');  // Pre-recorded wake word
    const chunks = splitInto80msChunks(testAudio);

    let detected = false;
    for (const chunk of chunks) {
        const result = await detector.processAudioChunk(chunk);
        if (result.detected) {
            detected = true;
            break;
        }
    }

    expect(detected).toBe(true);
});
```

---

## Common Pitfalls

### ❌ Don't Do This

```typescript
// Trying to get 16 embeddings from one mel buffer
const mel76 = getMelSpectrogram(audio);
const embeddings = [];
for (let i = 0; i < 16; i++) {
    const window = mel76.slice(i * 8, i * 8 + 76);  // ❌ Only works for i < 2!
    embeddings.push(await embeddingModel.predict(window));
}
```

### ✅ Do This Instead

```typescript
// Accumulate embeddings over time
for await (const chunk of audioStream) {  // Each chunk is 80ms
    const newMelFrames = await melModel.predict(chunk);  // 8 frames
    melBuffer.push(...newMelFrames);

    if (melBuffer.length >= 76) {
        const embedding = await embeddingModel.predict(melBuffer.slice(-76));
        embeddingBuffer.push(embedding);

        if (embeddingBuffer.length >= 16) {
            const score = await wakeWordModel.predict(embeddingBuffer.slice(-16));
            // Now you can detect!
        }
    }
}
```

---

## Performance Considerations

### Optimize for Real-time

```typescript
// Use batch processing when possible
private async extractEmbedding(): Promise<Float32Array> {
    const input = this.prepareEmbeddingInput();

    // Keep tensor in GPU memory if possible
    return tf.tidy(() => {
        const output = this.embeddingModel.predict(input) as tf.Tensor;
        return output.dataSync();  // Synchronous is OK for real-time
    });
}
```

### Monitor Performance

```typescript
const startTime = performance.now();
const result = await detector.processAudioChunk(chunk);
const duration = performance.now() - startTime;

if (duration > 80) {  // Should be < 80ms for real-time
    console.warn(`Processing too slow: ${duration}ms (need <80ms)`);
}
```

---

## Summary

**The Fix in One Sentence:**
Instead of trying to extract 16 embeddings from a single mel buffer, accumulate 1 embedding per 80ms chunk and use the
last 16 for detection.

**Key Changes:**

1. ✅ Add mel buffer (rolling, ≥76 frames)
2. ✅ Add embedding buffer (rolling, ≥16 embeddings)
3. ✅ Process audio in 80ms chunks
4. ✅ Extract 1 embedding per chunk (from last 76 mel frames)
5. ✅ Detect using last 16 embeddings

**Result:**

- Streaming wake word detection ✓
- Continuous detection every 80ms ✓
- 1.28 second warmup period ✓
- Low memory footprint (~25 KB) ✓
