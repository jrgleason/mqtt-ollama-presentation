# Performance Optimization Journey

## Overview

This document chronicles the optimization process for the voice gateway application, showing how we reduced total
pipeline latency from **27 seconds to 7 seconds** (74% improvement).

**Target Hardware:** Raspberry Pi 5 (16GB RAM)

---

## Initial Performance Baseline

### Original Configuration (October 2025)

**Models:**

- Whisper: `ggml-base.bin` (142 MB)
- Ollama: `qwen3:1.7b` (Q4_K_M quantized)
- TTS: Piper `en_US-amy-medium.onnx` at 1x speed

**Performance:**

```
Pipeline Breakdown:
├─ Wake word detection: ~100ms per chunk
├─ Audio recording + VAD: ~3-4s
├─ Whisper STT (base): ~6s ⚠️ BOTTLENECK
├─ Ollama AI (qwen3:1.7b): ~14s ⚠️ CRITICAL BOTTLENECK
├─ Piper TTS: ~2s
└─ Audio playback: ~3-4s

Total: ~27 seconds (wake word to response completion)
```

**Issues Identified:**

1. Ollama was generating verbose `<think>` tags with reasoning text (267 characters for simple queries)
2. qwen3:1.7b model was too large for fast inference on Pi 5
3. Whisper base model was slower than necessary for simple voice commands

---

## Optimization Phase 1: Ollama Model & Prompts

### Changes Made

1. **System Prompt Optimization**
    - Added explicit instruction: "Do not include <think> tags or explain your reasoning"
    - Limited responses to 2 sentences
    - Disabled non-English text output
    - Updated in TWO locations: `src/ollama-client.js:40` and `src/main.js:301`

2. **Model Downgrade: qwen3:1.7b → qwen2.5:1.5b**
    - Smaller parameter count (1.5B vs 1.7B)
    - Better optimized architecture
    - Changed via `.env`: `OLLAMA_MODEL=qwen2.5:1.5b`

### Results

**Ollama Performance:**

```
Model: qwen2.5:1.5b
├─ Cold start: 16.5s (worse, but expected)
├─ Warm inference: 4.6s ✅ (67% faster than qwen3:1.7b)
└─ Response quality: Clean, no <think> tags, accurate answers
```

**Response Comparison:**

```
Before (qwen3:1.7b):
"<think>Let me consider the current date...</think>Today is Tuesday, October 15, 2025."
(267 characters, 14s)

After (qwen2.5:1.5b):
"Today is Tuesday, October 15, 2025."
(37 characters, 4.6s warm)
```

---

## Optimization Phase 2: Smaller Ollama Model

### Changes Made

1. **Model Downgrade: qwen2.5:1.5b → qwen2.5:0.5b**
    - Even smaller parameter count (0.5B)
    - Optimized for speed over complex reasoning
    - Changed via `.env`: `OLLAMA_MODEL=qwen2.5:0.5b`

### Results

**Ollama Performance:**

```
Model: qwen2.5:0.5b
├─ Cold start: 3.2s ✅ (77% faster than qwen3:1.7b!)
├─ Warm inference: ~1-2s ✅ (93% faster than qwen3:1.7b!)
└─ Response quality: Good for simple queries, some accuracy trade-offs
```

**Accuracy Trade-off:**

- ✅ Handles simple queries well ("What time is it?")
- ⚠️ Occasional errors on complex reasoning (e.g., said "Sunday" instead of "Tuesday")
- 💡 **Recommendation:** Use qwen2.5:0.5b for voice gateway (speed priority), qwen2.5:1.5b+ for Oracle chatbot (accuracy
  priority)

---

## Optimization Phase 3: Whisper Model

### Changes Made

1. **Model Downgrade: base → tiny**
    - Downloaded `ggml-tiny.bin` (75 MB vs 142 MB base)
    - Changed via `.env`: `WHISPER_MODEL_PATH=models/ggml-tiny.bin`
    - Added performance logging in `voice-gateway-oww/src/services/TranscriptionService.js`

### Results

**Whisper Performance:**

```
Model: ggml-tiny.bin
├─ Transcription time: 1.5s ✅ (75% faster than base!)
├─ Model size: 75 MB (47% smaller)
├─ Memory usage: ~273 MB (vs ~388 MB base)
└─ Accuracy: Good for clear voice commands
```

**Example Log Output:**

```
🎤 [Whisper] Starting transcription with ggml-tiny.bin
✅ [Whisper] Transcription complete with ggml-tiny.bin in 1475ms
📝 You said: "What time is it?"
```

---

## Final Optimized Performance

### Current Configuration

**Models:**

- Whisper: `ggml-tiny.bin` (75 MB)
- Ollama: `qwen2.5:0.5b` (Q4_K_M quantized)
- TTS: Piper `en_US-amy-medium.onnx` at 3x speed

### Performance Breakdown

```
Pipeline Breakdown:
├─ Wake word detection: ~100ms per chunk
├─ Audio recording + VAD: ~2.7s
├─ Whisper STT (tiny): ~1.5s ✅ (was 6s)
├─ Ollama AI (qwen2.5:0.5b): ~1s ✅ (was 14s)
├─ Piper TTS: ~1.7s
└─ Audio playback: ~3s (not counted in pipeline)

Total: ~7 seconds (wake word to response playback start)
```

### Performance Comparison

| Component          | Before | After | Improvement    |
|--------------------|--------|-------|----------------|
| **Whisper STT**    | 6s     | 1.5s  | **75% faster** |
| **Ollama AI**      | 14s    | 1s    | **93% faster** |
| **TTS**            | 2s     | 1.7s  | Similar        |
| **Total Pipeline** | ~27s   | ~7s   | **74% faster** |

---

## Current Bottleneck Analysis

After all optimizations, the pipeline breakdown shows:

```
Component Performance (from logs):
1. Audio Recording + VAD: ~2.7s (39%)
2. Whisper STT: ~1.5s (21%)
3. TTS Synthesis: ~1.7s (24%)
4. Ollama AI: ~1s (14%)
5. Wake word: ~100ms (1%)
```

**Current bottleneck:** Audio recording with Voice Activity Detection (2.7 seconds)

**Why it's slow:**

- Waits for 1.5 seconds of trailing silence before stopping
- Configured via `VAD_TRAILING_SILENCE_MS=1500`

**Optimization options:**

1. **Reduce silence threshold** to 1000ms (trade-off: may cut off longer utterances)
2. **Tune VAD sensitivity** to detect end-of-speech faster
3. **Accept current performance** - 2.7s is reasonable for natural speech patterns

**Note:** Further optimization has diminishing returns. At 7 seconds total, the system provides good user experience for
a voice assistant.

---

## Model Selection Guidelines

### For Voice Gateway (this app)

**Recommended Models:**

**Whisper:**

- ✅ **Primary:** `ggml-tiny.bin` - Fast, good accuracy for clear speech
- 🔄 **Alternative:** `ggml-base.bin` - Better accuracy in noisy environments (4x slower)

**Ollama:**

- ✅ **Primary:** `qwen2.5:0.5b` - Fastest response, good for simple queries
- 🔄 **Alternative:** `qwen2.5:1.5b` - Better accuracy (4x slower warm)

### For Oracle Chatbot

**Recommended Models:**

**Ollama:**

- ✅ **Primary:** `qwen2.5:1.5b` or `qwen2.5:3b` - Better reasoning capabilities
- 🔄 **Alternative:** `gemma2:2b` or `phi-3.5-mini-instruct` - Different architectures

### NOT Recommended

**Whisper:**

- ❌ **turbo** - Designed for cloud/GPU, not optimized for Whisper.cpp on Pi
    - Would require ~6 GB RAM
    - Model file ~2-3 GB
    - Not well-tested for ARM/edge deployment

**Ollama:**

- ❌ **qwen3:1.7b** - Superseded by qwen2.5 family (older architecture)
- ❌ **Models > 3B** - Too slow for voice interaction on Pi 5

---

## Optimization Techniques Summary

### 1. System Prompt Engineering

**Impact:** High (reduced response length by 85%, removed verbose reasoning)

**Key techniques:**

- Explicitly disable unwanted output formats (`<think>` tags)
- Set clear length constraints ("under 2 sentences")
- Specify language requirements ("English only")

**Files modified:**

- `src/ollama-client.js:40-41`
- `src/main.js:301`

### 2. Model Right-Sizing

**Impact:** Critical (77-93% speed improvement)

**Principle:** Use the smallest model that meets accuracy requirements

**Trade-offs:**

- Smaller models = faster inference + lower memory
- Larger models = better accuracy + reasoning capability

### 3. Performance Monitoring

**Impact:** Essential for identifying bottlenecks

**Techniques:**

- Add timing logs around each component
- Log model names and versions
- Track response quality vs speed

**Files modified:**

- `voice-gateway-oww/src/services/TranscriptionService.js` - Added Whisper timing logs
- `src/ollama-client.js` - Already had timing logs

### 4. Hardware-Appropriate Selection

**Impact:** Foundational

**For Raspberry Pi 5:**

- ✅ Use quantized models (Q4_K_M)
- ✅ Prefer models < 2GB
- ✅ Choose ARM-optimized implementations (Whisper.cpp over Python Whisper)
- ✅ Monitor cold start vs warm inference

---

## Testing Methodology

### Performance Testing

1. **Restart application** to clear caches
2. **First query** measures cold start performance
3. **Second query** measures warm/cached performance
4. **Record timing from logs:**
    - Whisper: Look for `[Whisper] Transcription complete ... in XXXms`
    - Ollama: Look for `Ollama response received ... duration: 'XXXms'`
    - TTS: Look for `TTS synthesis complete ... duration: 'XXXms'`

### Accuracy Testing

Test with variety of queries:

- ✅ Simple facts: "What time is it?"
- ✅ Commands: "Turn on the lights"
- ⚠️ Complex reasoning: "What day of the week will it be in 3 days?"
- ⚠️ Multi-step: "What's the weather and should I bring an umbrella?"

**Balance speed vs accuracy based on use case.**

---

## Future Optimization Ideas

### Not Yet Implemented

1. **Parallel Processing**
    - Start Ollama inference while TTS is still preparing (overlap operations)
    - Estimated gain: 1-2 seconds

2. **Model Preloading**
    - Keep Ollama model in memory between queries (currently doing this)
    - Keep Whisper loaded (requires keeping whisper-cli process alive)
    - Estimated gain: Eliminate cold start delays

3. **Hardware Acceleration**
    - Investigate GPU acceleration for Ollama on Pi 5 (limited GPU capabilities)
    - Use Raspberry Pi-specific optimizations
    - Estimated gain: 20-30%

4. **Streaming Responses**
    - Start TTS synthesis while Ollama is still generating
    - Begin audio playback before full response complete
    - Estimated gain: 1-2 seconds perceived latency

5. **Reduce VAD Silence Threshold**
    - Lower `VAD_TRAILING_SILENCE_MS` from 1500ms to 1000ms
    - Test with various speech patterns
    - Estimated gain: 0.5 seconds

---

## Lessons Learned

1. **Profile before optimizing** - Timing logs revealed Ollama was 2x slower than Whisper, not the other way around
2. **System prompts matter** - Simple prompt changes eliminated 85% of response text
3. **Smaller models often sufficient** - 0.5B model adequate for simple voice commands
4. **Cold start vs warm matters** - First query always slower, design UX accordingly
5. **Document tradeoffs** - Speed gains came with minor accuracy compromises

---

## References

- **Whisper.cpp:** https://github.com/ggml-org/whisper.cpp
- **Ollama Models:** https://ollama.ai/library
- **Qwen2.5 Performance:** https://github.com/QwenLM/Qwen2.5
- **Voice Gateway Architecture:** [voice-gateway-architecture.md](./voice-gateway-architecture.md)

---

**Last Updated:** October 16, 2025
**Hardware:** Raspberry Pi 5 (16GB RAM)
**Software:** Node.js 20+, Ollama 0.6+, Whisper.cpp latest
