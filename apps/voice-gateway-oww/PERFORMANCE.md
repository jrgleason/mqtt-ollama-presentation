# Performance Guide - Raspberry Pi vs macOS

## Expected Performance

### macOS (M1/M2/Intel)
- **Wake word detection**: ~5-10ms per chunk (80ms audio)
- **Whisper transcription**: 1-3 seconds for 3-second audio
- **Total response time**: 4-6 seconds from wake word to transcription

### Raspberry Pi 5 (ARM64, 16GB)
- **Wake word detection**: ~20-50ms per chunk (80ms audio)
- **Whisper transcription**: 5-15 seconds for 3-second audio
- **Total response time**: 8-18 seconds from wake word to transcription

## Why is Raspberry Pi Slower?

### 1. CPU Architecture
- **Mac**: High-performance x86_64 or Apple Silicon with neural engines
- **Pi**: ARM Cortex-A76 quad-core @ 2.4GHz (no dedicated AI accelerators)

### 2. ONNX Runtime
- **Mac**: Can use Metal acceleration (GPU) or optimized BLAS libraries
- **Pi**: CPU-only inference, no GPU acceleration for ONNX models

### 3. Whisper.cpp
- **Mac**: Optimized with Accelerate framework (vecLib/BLAS)
- **Pi**: Generic ARM implementation without specialized acceleration

## Optimization Strategies

### Already Implemented ✅

1. **Transcription Lock**
   - Prevents overlapping Whisper jobs
   - Skips new requests if transcription in progress
   - Avoids queue buildup on slow hardware

2. **Audio Validation**
   - Skips transcription if audio < 0.5s
   - Skips if energy < 1e-6 (silence)
   - Saves CPU cycles on invalid audio

3. **Background Transcription**
   - Non-blocking fire-and-forget pattern
   - Doesn't block wake word detection
   - Uses async/await properly

### Possible Further Optimizations

#### Option 1: Use Smaller Whisper Model
```bash
# Edit .env
WHISPER_MODEL=tiny         # Fastest, less accurate
# or
WHISPER_MODEL=base         # Current (balanced)
# vs
WHISPER_MODEL=small        # More accurate, slower
```

**tiny model**: ~2-5 seconds on Pi (vs 5-15 for base)

#### Option 2: Lower Wake Word Threshold
```bash
# Edit .env
OWW_THRESHOLD=0.2  # More sensitive, faster to trigger
```

Less waiting for high-confidence detection.

#### Option 3: Reduce Recording Duration
```javascript
// In state machine, change:
after: { 3000: 'cooldown' }  // Current
// To:
after: { 2000: 'cooldown' }  // Shorter recording = less to transcribe
```

Shorter audio = faster transcription.

#### Option 4: Use Remote Whisper API
Instead of local Whisper, send audio to cloud service:
- OpenAI Whisper API
- AssemblyAI
- Google Speech-to-Text

**Trade-off**: Requires internet, adds latency, costs money.

## Performance Monitoring

### Current Logs Show:

```
🎙️  Calling Whisper... { wavPath: '...', model: 'models/ggml-base.bin' }
📝 Transcription complete { text: 'Turn on the lights', whisperDuration: '12.34s' }
```

**Key Metric**: `whisperDuration`
- **< 5s**: Excellent (Mac-like performance)
- **5-10s**: Good (acceptable for Pi)
- **10-20s**: Slow but functional
- **> 20s**: Too slow, consider optimizations

### If Transcription is Skipped:

```
⚠️  Transcription already in progress, skipping this recording
```

This means you triggered wake word again before previous transcription finished.

**Solutions**:
1. Wait longer between commands
2. Use smaller Whisper model
3. Reduce recording duration

## Recommended Settings for Pi

### For Best Responsiveness:
```bash
# .env
WHISPER_MODEL=tiny                    # Fastest model
OWW_THRESHOLD=0.25                    # Current setting (good)
AUDIO_MIC_DEVICE=plughw:2,0          # Already correct
```

### For Best Accuracy:
```bash
# .env
WHISPER_MODEL=base                    # Current (balanced)
OWW_THRESHOLD=0.3                     # Higher confidence
AUDIO_MIC_DEVICE=plughw:2,0          # Already correct
```

### Recording Duration (in code):
- **Current**: 3 seconds
- **Fast**: 2 seconds
- **Accurate**: 4-5 seconds

## Benchmarking

To measure your Pi's performance:

```bash
# Run the app
npm run dev

# Say "Hey Jarvis" followed by a command
# Watch for the whisperDuration in logs

# Typical results:
📝 Transcription complete {
  text: 'What time is it?',
  whisperDuration: '8.45s'    ← Your Pi's speed
}
```

**Baseline Expectations**:
- Raspberry Pi 5 (16GB): 5-15s
- Raspberry Pi 5 (8GB): 8-20s
- Raspberry Pi 4: 15-30s (not recommended)

## Is My Pi Too Slow?

### Pi is Fine If:
- ✅ Wake word detection works consistently
- ✅ Transcription completes in < 20s
- ✅ You don't see "skipping" warnings often
- ✅ Results are accurate

### Pi Needs Optimization If:
- ❌ Transcription takes > 20s consistently
- ❌ You see "skipping" warnings frequently
- ❌ System feels sluggish or unresponsive
- ❌ CPU usage is constantly 100%

## CPU Usage

Expected CPU usage on Raspberry Pi 5:

| Phase | CPU Usage | Duration |
|-------|-----------|----------|
| Idle listening | 10-20% | Continuous |
| Wake word detection | 30-50% | ~2 seconds |
| Recording | 5-10% | 3 seconds |
| Whisper transcription | 80-100% | 5-15 seconds |

**Total CPU time per interaction**: ~20 seconds at varying loads

This is normal! The Pi will get warm during transcription.

## Heat Management

Raspberry Pi 5 during heavy use:
- **Without heatsink**: May throttle at 80°C
- **With heatsink**: Stays under 70°C
- **With active cooling**: Stays under 60°C

**Recommendation**: Use at least a heatsink, ideally with a fan for continuous operation.

## Comparing Your Results

Share your performance logs:

```
Platform: Raspberry Pi 5 (16GB)
Model: ggml-base.bin
Average whisperDuration: 9.2s
Success rate: 95%
Issues: Occasional skipping on rapid triggers
```

This helps tune the system for different hardware configurations!
