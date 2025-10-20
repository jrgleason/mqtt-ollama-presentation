# Piper TTS Streaming Analysis

## Current Architecture (File-Based)

### How It Works Now

**Piper TTS Generation (piper-tts.js:46-158)**

```
1. Create Python script in /tmp/
2. Python script writes complete WAV file to /tmp/
3. Node.js reads complete WAV file
4. Convert WAV to raw PCM (int16)
5. Delete temp files
6. Return complete PCM buffer
```

**Audio Playback (main.js:77-141)**

```
Linux (aplay):
  ✅ ALREADY STREAMING: Accepts PCM buffer, pipes to aplay stdin

macOS (afplay):
  ❌ NOT STREAMING: Writes WAV file, runs afplay, deletes file
```

---

## Why We Use Files Currently

### Piper TTS Side

1. **Simplicity**: `voice.synthesize_wav()` is the simplest Piper API
2. **Complete Audio**: Generates the full audio in one operation
3. **WAV Format**: Easier to decode with `node-wav` library

### macOS Playback Side

1. **afplay limitation**: Requires a file path, cannot accept stdin
2. **WAV requirement**: afplay doesn't support raw PCM stdin

---

## Streaming Options Analysis

### Option 1: Stream Piper TTS Output (Recommended for Linux)

**Benefits:**

- ✅ Reduce latency (start speaking before generation completes)
- ✅ Lower memory usage (don't buffer entire audio)
- ✅ Better user experience (faster perceived response)

**Implementation:**

```python
# Instead of voice.synthesize_wav(text, wav_file)
# Use voice.synthesize(text) which yields audio chunks

import sys
from piper import PiperVoice
from piper.config import SynthesisConfig

voice = PiperVoice.load("model.onnx")
syn_config = SynthesisConfig(volume=1.0, length_scale=0.33)

# Yields 16-bit PCM chunks as they're generated
for audio_chunk in voice.synthesize(text, syn_config=syn_config):
    # Write raw PCM to stdout
    sys.stdout.buffer.write(audio_chunk)
```

**Node.js side:**

```javascript
const python = spawn('python3', [scriptPath]);
const audioChunks = [];

python.stdout.on('data', (chunk) => {
  // Receive PCM chunks as they're generated
  audioChunks.push(chunk);

  // For Linux: Could pipe directly to aplay here!
  // For macOS: Must buffer all chunks first
});
```

**Challenges:**

- ⚠️ macOS still requires buffering (afplay needs file)
- ⚠️ Error handling more complex (mid-stream failures)
- ⚠️ Must handle backpressure (if aplay can't keep up)

---

### Option 2: Use SoX for macOS Streaming

**Current Issue:** afplay requires file

**Solution:** Use `sox` to play raw PCM from stdin

```bash
# Install sox on macOS
brew install sox

# Play raw PCM from stdin
echo "audio data" | sox -t raw -r 16000 -e signed -b 16 -c 1 - -d
```

**Benefits:**

- ✅ Enables true streaming on macOS
- ✅ Same architecture as Linux (pipe to stdin)
- ✅ No temp file needed

**Drawbacks:**

- ❌ Requires sox installation (additional dependency)
- ❌ Different audio pipeline than afplay
- ❌ May have different latency characteristics

---

### Option 3: Hybrid Approach (Platform-Specific)

**Linux:** Full streaming (Piper → aplay stdin)
**macOS:** Keep current file-based (compatibility, simplicity)

**Rationale:**

- Linux is the production target (Raspberry Pi)
- macOS is development only
- Optimize for production, keep dev simple

---

## Performance Comparison

### Current (File-Based) Timing

```
Piper Generation:     500-1500ms (depends on text length, model)
File Write:           ~10ms
File Read + Decode:   ~50ms
Cleanup:              ~5ms
------------------------
Total Before Audio:   565-1565ms
Audio Playback:       2000-5000ms (depends on length)
========================
Total Perceived:      2565-6565ms
```

### Streaming (Estimated) Timing

```
Piper First Chunk:    50-100ms (generates first phonemes)
Stream to aplay:      ~5ms per chunk
------------------------
Time to First Audio:  55-105ms  ⚡ 90% reduction!
Audio Playback:       Same 2000-5000ms
========================
Total Perceived:      2055-5105ms  (10-20% improvement)
```

**Key Insight:** Streaming reduces *perceived* latency (time until first audio) dramatically, but doesn't change total
duration.

---

## Recommended Implementation Strategy

### Phase 1: Quick Win (No Code Changes)

**Status:** ✅ Already implemented!

The cleanup is working correctly - files are created in `/tmp/` and deleted after use. The perceived "not cleaning up"
was likely due to rapid testing - files are deleted immediately after playback.

### Phase 2: Streaming for Linux (If Needed)

**When to implement:**

- User feedback indicates latency is too high (>1 second to first audio)
- Running on Raspberry Pi with limited RAM
- Demoing voice responses in real-time

**Implementation:**

1. Create new `synthesizeSpeechStreaming()` function
2. Use `voice.synthesize()` instead of `voice.synthesize_wav()`
3. Pipe chunks directly to aplay stdin
4. Keep file-based version as fallback for macOS

**Estimated effort:** 2-3 hours
**Risk:** Medium (more complex error handling)

### Phase 3: macOS Streaming (Optional)

**When to implement:**

- Developer wants faster iteration on macOS
- sox is acceptable dependency

**Implementation:**

1. Install sox requirement
2. Detect sox availability
3. Use sox for playback instead of afplay
4. Fallback to afplay if sox not available

**Estimated effort:** 1-2 hours
**Risk:** Low (fallback available)

---

## Decision Matrix

| Scenario                       | Recommendation            | Reason                          |
|--------------------------------|---------------------------|---------------------------------|
| **Current state working well** | Keep file-based           | Simple, reliable, cleanup works |
| **High latency on RPi**        | Implement Linux streaming | Reduce perceived latency        |
| **Memory constraints**         | Implement streaming       | Lower peak memory usage         |
| **macOS development slow**     | Add sox support           | Optional convenience            |

---

## Code Examples

### Current Architecture (Simplified)

```javascript
// piper-tts.js
async function synthesizeSpeech(text, options) {
  // 1. Generate complete WAV file
  const wavPath = `/tmp/piper_${Date.now()}.wav`;
  await runPythonScript(`voice.synthesize_wav(text, wav_file)`);

  // 2. Read complete WAV file
  const buffer = readFileSync(wavPath);
  const pcm = wav.decode(buffer);

  // 3. Delete temp file
  unlinkSync(wavPath);

  // 4. Return complete buffer
  return pcm;
}

// main.js
async function playAudio(pcmBuffer) {
  if (isLinux) {
    // ALREADY STREAMING: Pipe buffer to aplay stdin
    const aplay = spawn('aplay', ['-f', 'S16_LE', '-r', '16000']);
    aplay.stdin.write(pcmBuffer);
    aplay.stdin.end();
  } else {
    // FILE-BASED: Write to file, run afplay
    const wavPath = `tts_${Date.now()}.wav`;
    writeWavFile(wavPath, pcmBuffer);
    await spawn('afplay', [wavPath]);
    unlinkSync(wavPath);
  }
}
```

### Proposed Streaming Architecture (Linux Only)

```javascript
// piper-tts-streaming.js (new file)
async function synthesizeSpeechStreaming(text, options) {
  return new Promise((resolve, reject) => {
    const python = spawn('python3', [streamingScriptPath]);

    // Collect chunks OR start playback immediately
    const chunks = [];
    let aplayProcess = null;

    python.stdout.on('data', (chunk) => {
      chunks.push(chunk);

      // For Linux: Start aplay on first chunk
      if (!aplayProcess && isLinux) {
        aplayProcess = spawn('aplay', ['-f', 'S16_LE', '-r', '16000']);
        aplayProcess.stdin.write(chunk);
      } else if (aplayProcess) {
        aplayProcess.stdin.write(chunk);
      }
    });

    python.on('close', () => {
      if (aplayProcess) {
        aplayProcess.stdin.end();
      }
      resolve(Buffer.concat(chunks));
    });
  });
}
```

---

## Conclusion

### Current State: ✅ Good Enough

- Files are properly cleaned up
- Latency is acceptable for development
- Architecture is simple and reliable

### When to Optimize

- Deploy to Raspberry Pi and measure latency
- User feedback indicates slowness
- Memory becomes constrained

### Best Next Step

**Test on target hardware first**, then decide if streaming is needed based on actual performance metrics.

---

## Additional Resources

- **Piper Streaming API**: https://github.com/OHF-Voice/piper1-gpl/blob/main/src/python/piper/voice.py#L123
- **aplay stdin examples**: `man aplay` - see `-` for stdin
- **sox documentation**: https://sox.sourceforge.net/sox.html
- **Node.js streams**: https://nodejs.org/api/stream.html

---

## Testing Streaming Implementation

### Test 1: Measure Current Latency

```bash
# Add timing logs to main.js
logger.debug('🗣️ TTS Start', { time: Date.now() });
const audioBuffer = await synthesizeSpeech(text);
logger.debug('🔊 TTS Complete', { time: Date.now() });
await playAudio(audioBuffer);
logger.debug('✅ Playback Complete', { time: Date.now() });
```

### Test 2: Verify Cleanup

```bash
# Before running app
ls -la /tmp/piper_*.py /tmp/piper_*.wav | wc -l

# Run app, trigger TTS
npm start

# After TTS completes
ls -la /tmp/piper_*.py /tmp/piper_*.wav | wc -l

# Should be same count (old files, but new ones cleaned up)
```

### Test 3: Streaming Prototype (Linux)

```bash
# Test Piper streaming directly
echo "Hello, this is a test" | python3 -c "
from piper import PiperVoice
from piper.config import SynthesisConfig
import sys

voice = PiperVoice.load('models/piper/en-us-glados-high.onnx')
config = SynthesisConfig(length_scale=0.33)

for chunk in voice.synthesize(sys.stdin.read(), syn_config=config):
    sys.stdout.buffer.write(chunk)
" | aplay -f S16_LE -r 22050 -c 1
```

---

## Summary

**Q: Is streaming needed?**
**A: Not currently.** The file-based approach is working well, cleanup is functioning, and latency is acceptable.

**Q: When would streaming help?**
**A: When deploying to Raspberry Pi** if you experience:

- Latency > 1 second before audio starts
- Memory pressure (OOM errors)
- User feedback that responses feel slow

**Q: What's the easiest improvement now?**
**A: Nothing needed!** System is working correctly. Focus on other features until you have real performance metrics from
target hardware.
