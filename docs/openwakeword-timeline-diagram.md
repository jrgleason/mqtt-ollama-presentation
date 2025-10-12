# OpenWakeWord Processing Timeline

## Visual Timeline of Streaming Wake Word Detection

```
Audio Stream (16kHz PCM)
═══════════════════════════════════════════════════════════════════

Time:     0ms      80ms     160ms    240ms    ...    760ms    840ms    920ms    ...    1280ms
          │        │        │        │               │        │        │               │
Samples:  1280     1280     1280     1280            1280     1280     1280            1280
          │        │        │        │               │        │        │               │
          ▼        ▼        ▼        ▼               ▼        ▼        ▼               ▼

Mel Spectrogram Buffer (rolling, 10ms hop → 8 frames per 80ms chunk)
═══════════════════════════════════════════════════════════════════

          [8]      [16]     [24]     [32]            [76]     [84]     [92]            [144]
          frames   frames   frames   frames          frames   frames   frames          frames
                                                      ├────────┐
                                                      │ Take   │
                                                      │ last   │
                                                      │ 76     │
                                                      └────────┤
                                                               ▼

Embedding Model (processes 76 mel frames → 1 embedding of 96-dim)
═══════════════════════════════════════════════════════════════════

                                                      [emb₁]   [emb₂]   [emb₃]          [emb₁₆]
                                                      96-dim   96-dim   96-dim          96-dim

Embedding Buffer (rolling, keep last ~30)
═══════════════════════════════════════════════════════════════════

                                                      [1]      [2]      [3]      ...    [16]
                                                                                        ├──────────┐
                                                                                        │ Take     │
                                                                                        │ last 16  │
                                                                                        └──────────┤
                                                                                                   ▼

Wake Word Model Input: [1, 16, 96]
═══════════════════════════════════════════════════════════════════

                                                                                        [batch=1]
                                                                                        [time=16]
                                                                                        [features=96]
                                                                                                   ▼

Wake Word Detection: Score 0.0 - 1.0
═══════════════════════════════════════════════════════════════════

                                                                                        0.87 ✓
```

## Key Temporal Relationships

### Stage 1: Audio → Mel Spectrogram
- **Input:** 1280 samples (80ms @ 16kHz)
- **Output:** 8 mel frames (with 10ms hop, 160 sample hop)
- **Buffer:** Keep rolling buffer of ~100 frames (1 second)

### Stage 2: Mel Frames → Embedding
- **Input:** 76 consecutive mel frames (from rolling buffer)
- **Output:** 1 embedding vector (96 dimensions)
- **Frequency:** Every 80ms (when new 8 frames arrive)
- **Delay:** Need ≥76 frames before first embedding (760ms warmup)

### Stage 3: Embeddings → Wake Word Detection
- **Input:** 16 consecutive embeddings (from rolling buffer)
- **Output:** 1 detection score (0.0 - 1.0)
- **Frequency:** Every 80ms (when new embedding arrives)
- **Delay:** Need ≥16 embeddings before first detection (1280ms warmup)

## Warmup Period

```
Time 0ms:       Start streaming
Time 760ms:     First embedding extracted (have 76 mel frames)
Time 1280ms:    First wake word detection (have 16 embeddings)
Time 1360ms+:   Continuous detection every 80ms
```

## Buffer Management

### Mel Buffer
```javascript
const MEL_BUFFER_SIZE = 100;  // ~1 second
let melBuffer = [];

function addMelFrames(newFrames) {  // newFrames.length = 8
    melBuffer.push(...newFrames);
    if (melBuffer.length > MEL_BUFFER_SIZE) {
        melBuffer = melBuffer.slice(-MEL_BUFFER_SIZE);
    }
}

function getEmbedding() {
    if (melBuffer.length < 76) return null;
    const input = melBuffer.slice(-76);  // Last 76 frames
    return embeddingModel.predict(input);  // → [96]
}
```

### Embedding Buffer
```javascript
const EMBEDDING_BUFFER_SIZE = 30;  // ~2.4 seconds
let embeddingBuffer = [];

function addEmbedding(embedding) {  // embedding.shape = [96]
    embeddingBuffer.push(embedding);
    if (embeddingBuffer.length > EMBEDDING_BUFFER_SIZE) {
        embeddingBuffer = embeddingBuffer.slice(-EMBEDDING_BUFFER_SIZE);
    }
}

function detectWakeWord() {
    if (embeddingBuffer.length < 16) return null;
    const input = embeddingBuffer.slice(-16);  // Last 16 embeddings
    const shaped = reshape(input, [1, 16, 96]);
    return wakeWordModel.predict(shaped);  // → score
}
```

## Complete Processing Loop

```javascript
async function processAudioChunk(pcmSamples) {  // pcmSamples.length = 1280
    // Step 1: Compute mel spectrogram
    const newMelFrames = await melSpectrogramModel.predict(pcmSamples);  // → [8, 32]
    addMelFrames(newMelFrames);

    // Step 2: Extract embedding (if we have enough mel frames)
    const embedding = getEmbedding();  // → [96] or null
    if (embedding === null) {
        return { ready: false, warmup: 'mel' };
    }
    addEmbedding(embedding);

    // Step 3: Detect wake word (if we have enough embeddings)
    const score = detectWakeWord();  // → float or null
    if (score === null) {
        return { ready: false, warmup: 'embedding' };
    }

    return {
        ready: true,
        score: score,
        detected: score > 0.5  // threshold
    };
}
```

## Why 16 Embeddings?

The wake word model was trained to look at a **1.28 second temporal window**:
- Too short → might miss the wake word
- Too long → slower detection, more computation
- 16 × 80ms = 1.28s is a sweet spot for 2-3 syllable wake words

Each embedding captures 760ms of audio (76 frames × 10ms), but with:
- 80ms stride between embeddings
- Significant overlap between consecutive embeddings
- This overlap gives the model temporal context

## Comparison to Our Incorrect Approach

### ❌ What We Were Trying
```
Accumulate 76 mel frames
↓
Try to extract 16 embeddings using sliding window with step=8
↓
frames[0:76]   → embedding 1
frames[8:84]   → ERROR: only have 76 frames total!
```

### ✅ Correct Approach
```
Process chunk 1 (80ms) → 8 mel frames  → buffer has 8
Process chunk 2 (80ms) → 8 mel frames  → buffer has 16
...
Process chunk 10 (80ms) → 8 mel frames → buffer has 76 → embedding 1
Process chunk 11 (80ms) → 8 mel frames → buffer has 84 → embedding 2
...
Process chunk 25 (80ms) → buffer has 16 embeddings → DETECT
```

The key difference: **temporal progression** vs **spatial windowing**.
