# Voice Gateway Performance Guide

## Overview

This document consolidates all performance-related information for the voice gateway application, including:

- Current performance benchmarks and industry comparisons
- The optimization journey from 27-second to 7-second response times
- Model selection guidelines for Raspberry Pi 5
- VAD (Voice Activity Detection) tuning recommendations
- Troubleshooting with debug logging

**Target Hardware:** Raspberry Pi 5 (16GB RAM)

---

## Current Performance Benchmarks

### System Performance

| Component | Time | Status |
|-----------|------|--------|
| Wake word detection | <50ms | Excellent |
| Whisper STT (tiny) | 265-342ms | Good |
| **Anthropic AI (no tools)** | **1082-1972ms** | Bottleneck |
| **Anthropic AI (with tools)** | **1947-4105ms** | Major bottleneck |
| ElevenLabs TTS | 1194-1821ms | Bottleneck |
| **Total (simple query)** | **~3-4 seconds** | Comparable to Alexa |

### Industry Benchmarks

#### Claude Haiku 3.5 (API)

- **Time to First Token (TTFT)**: 360-700ms
- **Throughput**: 52-65 tokens/second
- **Expected latency**: 1-2 seconds for short responses
- **Your performance**: NORMAL - matches expected benchmarks

#### Amazon Alexa (Industry Standard)

- **Target**: <1 second (certification requirement)
- **Reality**: 3-4 seconds in practice
- **On-device optimization**: 200ms faster than cloud
- **Status**: New AI Alexa delayed due to latency issues

#### Sub-500ms Goal Assessment

- **Verdict**: NOT ACHIEVABLE with Anthropic Claude Haiku
- **Reason**: TTFT alone is 360-700ms before any token generation
- **Solution**: Use local models (Ollama) or direct tool bypass

### Comparison Summary

| System | Response Time | Notes |
|--------|---------------|-------|
| Your system (Anthropic) | 3-4 seconds | Matches industry |
| Your system (direct bypass) | <2 seconds | Faster than Alexa |
| Amazon Alexa | 3-4 seconds | Industry standard |

---

## Optimization Journey

This section chronicles how we reduced total pipeline latency from **27 seconds to 7 seconds** (74% improvement).

### Initial Baseline (October 2025)

**Original Configuration:**

- Whisper: `ggml-base.bin` (142 MB)
- Ollama: `qwen3:1.7b` (Q4_K_M quantized)
- TTS: Piper `en_US-amy-medium.onnx` at 1x speed

**Original Performance:**

```
Pipeline Breakdown:
├─ Wake word detection: ~100ms per chunk
├─ Audio recording + VAD: ~3-4s
├─ Whisper STT (base): ~6s         <-- BOTTLENECK
├─ Ollama AI (qwen3:1.7b): ~14s    <-- CRITICAL BOTTLENECK
├─ Piper TTS: ~2s
└─ Audio playback: ~3-4s

Total: ~27 seconds (wake word to response completion)
```

**Issues Identified:**

1. Ollama generated verbose `<think>` tags with reasoning text (267 characters for simple queries)
2. qwen3:1.7b model too large for fast inference on Pi 5
3. Whisper base model slower than necessary for simple voice commands

### Phase 1: Ollama Model & Prompts

**Changes Made:**

1. **System Prompt Optimization**
   - Added explicit instruction: "Do not include `<think>` tags or explain your reasoning"
   - Limited responses to 2 sentences
   - Disabled non-English text output

2. **Model Downgrade: qwen3:1.7b to qwen2.5:1.5b**
   - Smaller parameter count (1.5B vs 1.7B)
   - Better optimized architecture

**Results:**

```
Model: qwen2.5:1.5b
├─ Cold start: 16.5s (worse, but expected)
├─ Warm inference: 4.6s    <-- 67% faster than qwen3:1.7b
└─ Response quality: Clean, no <think> tags, accurate answers

Response comparison:
Before: "<think>Let me consider...</think>Today is Tuesday..." (267 chars, 14s)
After:  "Today is Tuesday, October 15, 2025." (37 chars, 4.6s)
```

### Phase 2: Smaller Ollama Model

**Changes Made:**

- Model Downgrade: qwen2.5:1.5b to qwen2.5:0.5b
- Even smaller parameter count (0.5B)
- Optimized for speed over complex reasoning

**Results:**

```
Model: qwen2.5:0.5b
├─ Cold start: 3.2s     <-- 77% faster than qwen3:1.7b
├─ Warm inference: ~1-2s <-- 93% faster than qwen3:1.7b
└─ Response quality: Good for simple queries, some accuracy trade-offs
```

**Accuracy Trade-off:**

- Handles simple queries well ("What time is it?")
- Occasional errors on complex reasoning
- **Recommendation:** Use qwen2.5:0.5b for voice gateway (speed priority), qwen2.5:1.5b+ for Oracle chatbot (accuracy priority)

### Phase 3: Whisper Model

**Changes Made:**

- Model Downgrade: base to tiny
- Downloaded `ggml-tiny.bin` (75 MB vs 142 MB base)

**Results:**

```
Model: ggml-tiny.bin
├─ Transcription time: 1.5s  <-- 75% faster than base
├─ Model size: 75 MB (47% smaller)
├─ Memory usage: ~273 MB (vs ~388 MB base)
└─ Accuracy: Good for clear voice commands
```

### Final Optimized Performance

**Current Configuration:**

- Whisper: `ggml-tiny.bin` (75 MB)
- Ollama: `qwen2.5:0.5b` (Q4_K_M quantized)
- TTS: Piper `en_US-amy-medium.onnx` at 3x speed

**Performance Breakdown:**

```
Pipeline Breakdown:
├─ Wake word detection: ~100ms per chunk
├─ Audio recording + VAD: ~2.7s
├─ Whisper STT (tiny): ~1.5s   <-- was 6s
├─ Ollama AI (qwen2.5:0.5b): ~1s <-- was 14s
├─ Piper TTS: ~1.7s
└─ Audio playback: ~3s (not counted in pipeline)

Total: ~7 seconds (wake word to response playback start)
```

**Summary of Improvements:**

| Component          | Before | After | Improvement    |
|--------------------|--------|-------|----------------|
| **Whisper STT**    | 6s     | 1.5s  | **75% faster** |
| **Ollama AI**      | 14s    | 1s    | **93% faster** |
| **TTS**            | 2s     | 1.7s  | Similar        |
| **Total Pipeline** | ~27s   | ~7s   | **74% faster** |

### Optimization Techniques Summary

1. **System Prompt Engineering** (High Impact)
   - Reduced response length by 85%
   - Removed verbose reasoning output
   - Set clear length constraints

2. **Model Right-Sizing** (Critical Impact)
   - 77-93% speed improvement
   - Use smallest model that meets accuracy requirements

3. **Hardware-Appropriate Selection**
   - Use quantized models (Q4_K_M)
   - Prefer models < 2GB
   - Choose ARM-optimized implementations

---

## Model Selection Guidelines

### For Voice Gateway

**Whisper Models:**

| Model | Recommendation | Notes |
|-------|----------------|-------|
| `ggml-tiny.bin` | **Primary** | Fast, good accuracy for clear speech |
| `ggml-base.bin` | Alternative | Better accuracy in noisy environments (4x slower) |
| `turbo` | **Not Recommended** | Requires ~6 GB RAM, not optimized for Pi |

**Ollama Models:**

| Model | Recommendation | Notes |
|-------|----------------|-------|
| `qwen2.5:0.5b` | **Primary** | Fastest response, good for simple queries |
| `qwen2.5:1.5b` | Alternative | Better accuracy (4x slower warm) |
| `qwen3:1.7b` | **Not Recommended** | Superseded by qwen2.5 family |
| Models > 3B | **Not Recommended** | Too slow for voice interaction on Pi 5 |

### For Oracle Chatbot

**Recommended:**

- `qwen2.5:1.5b` or `qwen2.5:3b` - Better reasoning capabilities
- `gemma2:2b` or `phi-3.5-mini-instruct` - Different architectures for variety

### Cold Start vs Warm Inference

| Model | Cold Start | Warm Inference |
|-------|------------|----------------|
| qwen3:1.7b | 16.5s | 14s |
| qwen2.5:1.5b | 16.5s | 4.6s |
| qwen2.5:0.5b | 3.2s | 1-2s |

**Design consideration:** First query always slower - design UX accordingly.

---

## VAD Tuning

### Current Bottleneck

After model optimizations, Voice Activity Detection (VAD) became the primary bottleneck:

```
Component Performance:
1. Audio Recording + VAD: ~2.7s (39%)
2. Whisper STT: ~1.5s (21%)
3. TTS Synthesis: ~1.7s (24%)
4. Ollama AI: ~1s (14%)
5. Wake word: ~100ms (1%)
```

### VAD Trailing Silence Configuration

The `VAD_TRAILING_SILENCE_MS` setting controls how long the system waits after you stop talking before processing:

| Setting | Behavior | Use Case |
|---------|----------|----------|
| **800ms** | Fast, natural | **Recommended** - feels conversational |
| 1000ms | Slightly safer | For slower speakers |
| 1500ms | Original default | Too slow for most users |
| 500ms | Very aggressive | May cut off mid-sentence |

### Applying VAD Changes

```bash
# Option 1: Update your .env.tmp file
VAD_TRAILING_SILENCE_MS=800

# Option 2: Set via environment variable
VAD_TRAILING_SILENCE_MS=800 npm run dev
```

### Performance Impact

| Metric | Before (1500ms) | After (800ms) | Improvement |
|--------|-----------------|---------------|-------------|
| Silence delay | 1.5s | 0.8s | **700ms faster** |
| Total pipeline | ~7-8s | ~5-6s | ~1-2s faster |

---

## Troubleshooting & Debug Logging

### Enabling Debug Logs

**Method 1: Environment Variable**
```bash
LOG_LEVEL=debug npm run dev
```

**Method 2: .env File**
```bash
# Add to .env.tmp
LOG_LEVEL=debug
```

**Method 3: Command Line**
```bash
LOG_LEVEL=debug node src/main.js
```

### Available Log Levels

| Level | Description |
|-------|-------------|
| `error` | Only errors |
| `warn` | Warnings and errors |
| `info` | General information (default) |
| `debug` | Detailed debugging with timing breakdowns |

### Debug Output Example

With debug logging enabled, you'll see detailed timing:

```
Message building took 5ms
Tool binding took 3ms
Calling Anthropic API...
Anthropic API call took 1247ms
Tool "get_current_datetime" execution took 2ms
Calling Anthropic API for final response after tools...
Final Anthropic API call took 698ms
Detailed timing breakdown:
  messageBuild: 5ms
  toolBinding: 3ms
  firstApiCall: 1247ms    <-- BOTTLENECK
  toolExecution: 2ms
  finalApiCall: 698ms     <-- BOTTLENECK
  total: 1955ms
```

### Performance Testing Methodology

1. **Restart application** to clear caches
2. **First query** measures cold start performance
3. **Second query** measures warm/cached performance
4. **Record timing from logs:**
   - Whisper: Look for `[Whisper] Transcription complete ... in XXXms`
   - Ollama: Look for `Ollama response received ... duration: 'XXXms'`
   - TTS: Look for `TTS synthesis complete ... duration: 'XXXms'`

### Accuracy Testing

Test with a variety of queries:

- Simple facts: "What time is it?"
- Commands: "Turn on the lights"
- Complex reasoning: "What day of the week will it be in 3 days?"
- Multi-step: "What's the weather and should I bring an umbrella?"

**Balance speed vs accuracy based on use case.**

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Very slow first response | Cold start | Normal - subsequent queries faster |
| Cuts off mid-sentence | VAD too aggressive | Increase `VAD_TRAILING_SILENCE_MS` to 1000ms |
| Long silence before processing | VAD too slow | Decrease `VAD_TRAILING_SILENCE_MS` to 800ms |
| "No answer found" for questions | Search bypass issue | Ensure Anthropic handles search queries |

---

## Future Optimization Ideas

### Not Yet Implemented

1. **Parallel Processing**
   - Start Ollama inference while TTS is preparing
   - Estimated gain: 1-2 seconds

2. **Model Preloading**
   - Keep Ollama model in memory between queries (currently doing this)
   - Keep Whisper loaded (requires keeping whisper-cli process alive)
   - Estimated gain: Eliminate cold start delays

3. **Streaming Responses**
   - Start TTS synthesis while Ollama is generating
   - Begin audio playback before full response complete
   - Estimated gain: 1-2 seconds perceived latency

4. **Hardware Acceleration**
   - Investigate GPU acceleration for Ollama on Pi 5
   - Use Raspberry Pi-specific optimizations
   - Estimated gain: 20-30%

5. **Prompt Caching**
   - Pre-cache common responses with Anthropic prompt caching
   - Reduces TTFT to ~200ms

---

## References

- **Whisper.cpp:** https://github.com/ggml-org/whisper.cpp
- **Ollama Models:** https://ollama.ai/library
- **Qwen2.5 Performance:** https://github.com/QwenLM/Qwen2.5
- **Anthropic Prompt Caching:** https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching
- **Voice Gateway Architecture:** [voice-gateway-architecture.md](./voice-gateway-architecture.md)

---

**Last Updated:** January 2026
**Hardware:** Raspberry Pi 5 (16GB RAM)
**Software:** Node.js 20+, Ollama 0.6+, Whisper.cpp latest
