# OpenWakeWord Integration Guide

**Last Updated:** 2025-10-22

This guide covers how OpenWakeWord works in the voice-gateway-oww service for wake word detection.

---

## Overview

OpenWakeWord is used for offline wake word detection with the phrase "Hey Jarvis". The system processes audio in real-time and triggers transcription when the wake word is detected.

---

## How OpenWakeWord Works

### Audio Processing Pipeline

```
Raw Audio (16kHz PCM)
    ↓ (every 1280 samples = 80ms)
Mel Spectrogram (8 new frames per 80ms chunk, keep rolling buffer of ≥76 frames)
    ↓ (extract last 76 frames)
Embedding Model (batch of [1, 76, 32, 1])
    ↓
Single Embedding Vector (96 dimensions)
    ↓
Feature Buffer (rolling buffer of embeddings, max 120 ≈ 10 seconds)
    ↓ (take last 16 embeddings)
Wake Word Model Input [1, 16, 96]
    ↓
Detection Score (0.0 - 1.0)
```

###Processing Timeline

**Every 80ms of audio:**

1. **Audio Capture:** 1280 samples (80ms @ 16kHz)
2. **Mel Spectrogram:** Generate 8 new frames, add to rolling buffer
3. **When buffer ≥ 76 frames:** Extract embedding (96-dim vector)
4. **Embedding Buffer:** Keep last ~30 embeddings
5. **Every new embedding:** Run wake word model on last 16 embeddings
6. **Detection:** If score > threshold (e.g., 0.25), trigger wake word event

**Key Insight:** The model needs 16 embeddings representing **1.28 seconds** of audio context:
- 16 embeddings × 80ms per embedding = 1280ms of temporal context
- Shape: `[1, 16, 96]` = [batch, time_steps, features]

---

## Implementation in Voice Gateway

### Models Required

Download these models to `apps/voice-gateway-oww/models/`:

```bash
# OpenWakeWord models
openwakeword_melspectrogram.onnx       # Mel spectrogram generator
openwakeword_embedding_model.onnx      # Embedding extractor (96-dim)
hey_jarvis_v0.1.onnx                   # Wake word detection model
```

### Configuration

```env
# .env configuration
OWW_MODEL_PATH=models/hey_jarvis_v0.1.onnx
OWW_THRESHOLD=0.25                      # Detection threshold (0.0-1.0)
OWW_INFERENCE_FRAMEWORK=onnx            # Use ONNX runtime

# Audio settings
AUDIO_SAMPLE_RATE=16000                 # Required for OpenWakeWord
AUDIO_CHANNELS=1                        # Mono audio
```

### Detection Threshold Tuning

| Threshold | Behavior |
|-----------|----------|
| 0.01-0.10 | Very sensitive - many false positives |
| 0.15-0.25 | **Recommended** - balanced detection |
| 0.30-0.50 | Conservative - fewer false positives, may miss quiet wake words |
| 0.50+     | Very strict - may miss most wake words |

**Tuning Tips:**
- Start with `0.25` for testing
- Lower threshold if wake word is missed frequently
- Raise threshold if getting false triggers
- Monitor logs for detection scores to calibrate

---

## Embedding Extraction Details

### Mel Spectrogram Buffer

- **Window Size:** 76 frames (corresponds to ~760ms of audio)
- **Hop Size:** 10ms per frame
- **Overlap:** Frames are overlapping for smooth transitions
- **Buffer Management:** Rolling buffer, oldest frames discarded

### Embedding Model

- **Input:** `[1, 76, 32, 1]` (batch, frames, mel_bins, channels)
- **Output:** `[1, 96]` (batch, embedding_dimension)
- **Processing:** Converts 76 mel frames → single 96-dim embedding vector
- **Frequency:** New embedding every 80ms of audio

### Wake Word Model

- **Input:** `[1, 16, 96]` (batch, time_steps, features)
- **Output:** Detection score (0.0 - 1.0)
- **Temporal Context:** 1.28 seconds (16 × 80ms)
- **Rolling Window:** As new embeddings arrive, oldest are dropped

---

## Custom Wake Word Training

To create custom wake words (e.g., "Hey Oracle", "Computer"):

1. **Collect Audio Samples:**
   - Record 20-50 clips of the wake word
   - Vary speaking speed, pitch, volume
   - Include different speakers if possible

2. **Extract Embeddings:**
   - Use the embedding model to convert each clip to 96-dim vectors
   - Save embeddings for training

3. **Train Wake Word Model:**
   - Use OpenWakeWord training tools
   - Fine-tune on your custom wake word data
   - Test with validation clips

4. **Deploy:**
   - Place trained `.onnx` model in `models/` directory
   - Update `OWW_MODEL_PATH` in `.env`
   - Tune detection threshold

**See:** OpenWakeWord GitHub repository for detailed training instructions

---

## Troubleshooting

### Wake Word Not Detected

**Symptoms:** Saying "Hey Jarvis" doesn't trigger detection

**Solutions:**
1. Check microphone is working: `arecord -l` (Linux) or test-audio-recording.js (macOS)
2. Lower threshold: `OWW_THRESHOLD=0.15`
3. Check logs for detection scores
4. Ensure models are downloaded correctly
5. Speak clearly and wait 1-2 seconds after wake word

### False Positives

**Symptoms:** Wake word triggers on background noise or other speech

**Solutions:**
1. Raise threshold: `OWW_THRESHOLD=0.35`
2. Reduce background noise
3. Check microphone gain settings
4. Review detection scores in logs

### Shape Mismatch Errors

**Error:** `Expected [1, 16, 96] but got [1, 1, 96]`

**Cause:** Embedding buffer not accumulating properly

**Solution:**
- Ensure code maintains rolling buffer of 16 embeddings
- Check that new embeddings are added every 80ms
- Verify buffer initialization and updates

---

## Performance Characteristics

### Latency

- **Embedding Generation:** ~10-20ms per embedding
- **Wake Word Inference:** ~5-10ms
- **Total Latency:** ~15-30ms per audio chunk
- **Detection Delay:** ~1.28s (temporal context window)

### CPU Usage

- **Raspberry Pi 5:** ~5-10% CPU (ONNX runtime)
- **Mac/Desktop:** ~1-2% CPU
- **Memory:** ~50-100MB for models + buffers

### Accuracy

- **True Positive Rate:** 90-95% (with proper threshold tuning)
- **False Positive Rate:** <1% (in normal quiet environment)
- **Distance Tolerance:** Works up to ~3-4 meters with good microphone

---

## References

- **OpenWakeWord GitHub:** https://github.com/dscripka/openWakeWord
- **Model Training Guide:** https://github.com/dscripka/openWakeWord/blob/main/docs/training.md
- **Voice Gateway README:** `/apps/voice-gateway-oww/README.md`
- **Voice Gateway Architecture:** `/docs/voice-gateway-architecture.md`

---

**Next Steps:**
- See `/apps/voice-gateway-oww/README.md` for full setup instructions
- Check `apps/voice-gateway-oww/docs/DEVELOPER_GUIDE.md` for platform-specific issues
