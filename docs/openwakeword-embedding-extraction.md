# OpenWakeWord Embedding Extraction - Complete Analysis

**Date:** 2025-10-12
**Issue:** Wake word model expects `[1, 16, 96]` but we're providing `[1, 1, 96]`

---

## Executive Summary

The issue is a fundamental misunderstanding of the temporal nature of wake word detection:

- **What we were doing:** Trying to extract 16 embeddings from a single 76-frame mel spectrogram
- **What we should do:** Accumulate 1 embedding per 80ms of audio, then use the last 16 embeddings (representing 1.28
  seconds)

---

## How OpenWakeWord Works (from Source Code Analysis)

### 1. Audio Processing Pipeline

```
Raw Audio (16kHz PCM)
    ↓ (every 1280 samples = 80ms)
Mel Spectrogram (8 new frames per 80ms, keep rolling buffer of ≥76 frames)
    ↓ (extract last 76 frames)
Embedding Model (batch of [1, 76, 32, 1])
    ↓
Single Embedding Vector (96 dimensions)
    ↓
Feature Buffer (rolling buffer of embeddings, max 120 ≈ 10 seconds)
    ↓ (take last 16 embeddings)
Wake Word Model Input [1, 16, 96]
```

### 2. Critical Code from `utils.py`

#### Sliding Window (for batch processing, not streaming):

```python
def _get_embeddings(self, x: np.ndarray, window_size: int = 76, step_size: int = 8):
    """Extract embeddings using sliding window over mel spectrogram."""
    spec = self._get_melspectrogram(x)  # Full mel spectrogram
    windows = []
    for i in range(0, spec.shape[0], 8):  # Step by 8 frames
        window = spec[i:i+window_size]    # 76-frame window
        if window.shape[0] == window_size:
            windows.append(window)
    batch = np.expand_dims(np.array(windows), axis=-1).astype(np.float32)
    embedding = self.embedding_model_predict(batch)  # Batch inference
    return embedding
```

**Key:** To get 16 embeddings using sliding window:

- Total mel frames needed: 76 + (16-1) × 8 = **196 frames**
- Window positions: 0, 8, 16, 24, ..., 120 (16 windows)

#### Streaming (real-time processing):

```python
def _streaming_features(self, x):
    # Accumulate samples until we have 80ms (1280 samples)
    if self.accumulated_samples >= 1280 and self.accumulated_samples % 1280 == 0:
        self._streaming_melspectrogram(self.accumulated_samples)  # Add 8 mel frames

        # Extract embedding from last 76 mel frames
        for i in np.arange(self.accumulated_samples//1280-1, -1, -1):
            ndx = -8*i
            ndx = ndx if ndx != 0 else len(self.melspectrogram_buffer)
            x = self.melspectrogram_buffer[-76 + ndx:ndx].astype(np.float32)[None, :, :, None]
            if x.shape[1] == 76:
                # Run embedding model → get 1 embedding
                self.feature_buffer = np.vstack((self.feature_buffer,
                                                self.embedding_model_predict(x)))
```

**Key:** Each 80ms of audio produces **1 new embedding** that gets added to `feature_buffer`.

### 3. Wake Word Detection (from `model.py`)

```python
def predict(self, x: np.ndarray):
    # Process incoming audio
    n_prepared_samples = self.preprocessor(x)  # Adds to buffers

    # Get last N embeddings from feature buffer
    prediction = self.model_prediction_function[mdl](
        self.preprocessor.get_features(self.model_inputs[mdl])  # model_inputs[mdl] = 16
    )
```

Where `get_features`:

```python
def get_features(self, n_feature_frames: int = 16, start_ndx: int = -1):
    # Return last 16 embedding vectors from buffer
    return self.feature_buffer[int(-1*n_feature_frames):, :][None, ].astype(np.float32)
```

---

## Key Insights

### 1. Temporal Window

- Wake word model expects **16 consecutive embeddings**
- Each embedding represents **80ms of audio**
- Total temporal window: **16 × 80ms = 1.28 seconds**

### 2. Frame Calculations

- **1280 samples** (80ms @ 16kHz) = **8 mel frames** (with 10ms hop, 160 sample hop)
- **76 mel frames** = 760ms of audio history needed for embedding extraction
- **16 embeddings** = 1280ms of audio history needed for wake word detection

### 3. Two Approaches

#### Approach A: Sliding Window (Batch Processing)

- Accumulate 196 mel frames (1.96 seconds of audio)
- Extract 16 embeddings at once using sliding window (step=8)
- Feed all 16 to wake word model

**Pros:**

- All embeddings from single mel buffer
- Good for offline/batch processing

**Cons:**

- Requires 1.96s of audio before first detection
- Not how OpenWakeWord actually operates in streaming mode

#### Approach B: Streaming (Real-time)

- Process audio in 80ms chunks
- Add 1 embedding per chunk to rolling buffer
- Use last 16 embeddings for detection

**Pros:**

- True streaming, continuous detection
- Lower latency (can detect after 1.28s)
- Matches OpenWakeWord's production behavior

**Cons:**

- Need to maintain state across chunks

---

## Our Implementation Fix

### Current (Broken) Code:

```python
// We accumulate exactly 76 mel frames
const melBuffer = accumulateMelFrames(76);  // ❌

// Try to extract 16 embeddings from 76 frames
const embeddings = extractEmbeddings(melBuffer);  // Returns [1, 1, 96] ❌
```

### Fixed Code (Streaming Approach):

```python
// Global state
let melBuffer = [];      // Rolling buffer, keep last ~100 frames
let embeddingBuffer = [];  // Rolling buffer, keep last ~30 embeddings

// Process each 80ms chunk
function processAudioChunk(samples_1280) {
    // 1. Add to mel buffer
    const newMelFrames = computeMelSpectrogram(samples_1280);  // 8 frames
    melBuffer.push(...newMelFrames);
    if (melBuffer.length > 100) {
        melBuffer = melBuffer.slice(-100);  // Keep last 100 frames
    }

    // 2. Extract embedding if we have enough mel frames
    if (melBuffer.length >= 76) {
        const last76Frames = melBuffer.slice(-76);  // Last 76 frames
        const embedding = embeddingModel.predict(last76Frames);  // [1, 76, 32, 1] → [96]
        embeddingBuffer.push(embedding);
        if (embeddingBuffer.length > 30) {
            embeddingBuffer = embeddingBuffer.slice(-30);  // Keep last 30 embeddings
        }
    }

    // 3. Detect wake word if we have enough embeddings
    if (embeddingBuffer.length >= 16) {
        const last16Embeddings = embeddingBuffer.slice(-16);  // [16, 96]
        const wakeWordInput = reshape(last16Embeddings, [1, 16, 96]);
        const prediction = wakeWordModel.predict(wakeWordInput);
        return prediction;
    }

    return null;  // Not ready yet
}
```

---

## Buffer Size Requirements

### Mel Spectrogram Buffer

- **Minimum:** 76 frames
- **Recommended:** 100 frames (~1 second of history)
- **Purpose:** Always have enough frames to extract embeddings

### Embedding Buffer

- **Minimum:** 16 vectors
- **Recommended:** 30 vectors (~2.4 seconds of history)
- **Purpose:** Always have enough embeddings for wake word detection

---

## Exact Logic for 16 Embeddings

### Option 1: Streaming (RECOMMENDED)

```
Time 0ms:     Process chunk 1 → mel buffer has 8 frames   (not enough for embedding)
Time 80ms:    Process chunk 2 → mel buffer has 16 frames  (not enough for embedding)
...
Time 680ms:   Process chunk 9 → mel buffer has 72 frames  (not enough for embedding)
Time 760ms:   Process chunk 10 → mel buffer has 80 frames → extract embedding #1
Time 840ms:   Process chunk 11 → mel buffer has 88 frames → extract embedding #2
...
Time 1960ms:  Process chunk 25 → embedding buffer has 16  → FIRST WAKE WORD DETECTION
Time 2040ms:  Process chunk 26 → embedding buffer has 17  → continuous detection
```

### Option 2: Sliding Window (for reference)

```
Accumulate 196 mel frames (1.96 seconds of audio)
Extract embeddings using sliding window:
  Position 0:   frames[0:76]     → embedding 1
  Position 8:   frames[8:84]     → embedding 2
  Position 16:  frames[16:92]    → embedding 3
  ...
  Position 120: frames[120:196]  → embedding 16
Feed [1, 16, 96] to wake word model
```

---

## Summary

**The answer to "How to get 16 embeddings from 76 frames?"**

You **don't** get 16 embeddings from 76 frames. You get:

- **1 embedding per 80ms chunk** of audio
- **Accumulate 16 embeddings over 1.28 seconds**
- **Use rolling buffers** to maintain state

The embedding model processes **76 mel frames at a time** to produce **1 embedding vector (96-dim)**.
The wake word model processes **16 embedding vectors** to detect the wake word.

---

## References

- OpenWakeWord Repository: https://github.com/dscripka/openWakeWord
- Key Files:
    - `openwakeword/model.py` - Main prediction logic
    - `openwakeword/utils.py` - AudioFeatures class with streaming implementation
- Speech Embedding Model: https://tfhub.dev/google/speech_embedding/1
