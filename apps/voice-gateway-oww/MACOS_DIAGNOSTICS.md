# macOS Microphone Diagnostics

## The Problem

Your app shows that OpenWakeWord buffers are filling correctly, but you're not getting any wake word detections. This
could be caused by:

1. **Microphone not capturing audio** (most likely on macOS)
2. **Audio levels too low**
3. **Wrong sample rate**
4. **Scores genuinely below threshold**

## Quick Diagnostic Steps

### 1. Check Microphone Permissions

macOS requires explicit permission for apps to access the microphone.

**Check current permissions:**

```bash
# Check if Terminal has microphone access
tccutil status Microphone
```

**Grant permission:**

1. System Settings → Privacy & Security → Microphone
2. Ensure "Terminal" or your terminal app is checked
3. Restart the terminal app after enabling

### 2. List Available Audio Devices

**Using system_profiler:**

```bash
system_profiler SPAudioDataType
```

This shows all audio devices with their details.

**Using `rec` (if installed):**

```bash
# Install sox if not already installed
brew install sox

# List devices
rec -V
```

### 3. Test Audio Recording

**Test with `sox` (recommended for macOS):**

```bash
# Install sox if needed
brew install sox

# Record 3 seconds of audio
rec -r 16000 -c 1 test.wav trim 0 3

# Play it back
play test.wav
```

**Alternative - using ffmpeg:**

```bash
# Install ffmpeg if needed
brew install ffmpeg

# List audio devices
ffmpeg -f avfoundation -list_devices true -i ""

# Record 3 seconds from default device
ffmpeg -f avfoundation -i ":0" -ar 16000 -ac 1 -t 3 test.wav

# Play it back
afplay test.wav
```

### 4. Check Audio Levels While Speaking

```bash
# Install sox
brew install sox

# Monitor audio levels in real-time
rec -q -r 16000 -c 1 -n stats
```

Speak into the microphone. You should see:

- **Maximum amplitude** close to 1.0 when speaking
- **Minimum amplitude** close to -1.0 when speaking
- **Mean amplitude** around 0.0

If all values stay near 0.0, your mic is either not working or not being accessed.

### 5. Run the App with Enhanced Logging

The latest code changes add detailed logging:

```bash
cd /Users/jrg/code/CodeMash/mqtt-ollama-presentation/apps/voice-gateway-oww
npm run dev
```

**What to look for:**

1. **Audio chunks arriving:**
   ```
   📥 Received audio chunk #1 { size: 16384, bytes: '16384 bytes = 8192 samples = 512.0ms' }
   ```
    - If you don't see these, audio isn't being captured

2. **Audio level checks:**
   ```
   🎤 Audio level check { maxAmplitude: '0.0234', isSilent: 'NO (mic is working)', audioChunkCount: 5 }
   ```
    - If `maxAmplitude` is always near 0.0000, mic isn't working
    - If `isSilent: 'YES'`, you have a problem

3. **Wake word scores:**
   ```
   🔊 Wake word score #1 { score: '0.0123', threshold: 0.5, status: '✓ normal' }
   ```
    - Scores should appear once buffers are filled (~2 seconds)
    - Normal background noise: 0.001 - 0.05
    - Close to wake word: 0.1 - 0.4
    - Wake word detected: 0.5+

### 6. Adjust Threshold If Needed

If you see scores like 0.3 or 0.4 when saying "Hey Jarvis", lower the threshold:

```bash
# Edit .env
OWW_THRESHOLD=0.3

# Then restart
npm run dev
```

## Common macOS Issues

### Issue: "Microphone permission denied"

**Solution:**

1. Open System Settings
2. Privacy & Security → Microphone
3. Enable Terminal (or iTerm, etc.)
4. Restart terminal

### Issue: No audio chunks received

**Symptoms:**

- No "📥 Received audio chunk" messages
- App seems to hang after "Listening for wake word"

**Solutions:**

1. Check microphone permissions (above)
2. Try a different microphone:
   ```bash
   # Plug in external USB mic
   # Built-in mics often work better with `sox`
   ```
3. Verify Node.js microphone access (may need manual approval)

### Issue: Audio chunks received but all zeros

**Symptoms:**

- Audio chunks appear: `📥 Received audio chunk #1 { size: 16384 }`
- But audio level shows: `🎤 Audio level check { maxAmplitude: '0.0000', isSilent: 'YES' }`

**Solutions:**

1. Microphone is muted in System Settings
2. Wrong input device selected
3. Need to restart app after granting permission

### Issue: Scores too low (always < 0.1)

**Symptoms:**

- Audio is being captured (maxAmplitude > 0.01)
- Wake word scores appear
- But scores stay below 0.1 even when saying "Hey Jarvis"

**Solutions:**

1. **Speak louder and clearer**
2. **Say the wake word slowly**: "HEY... JARVIS"
3. **Lower threshold**: Try 0.3 or even 0.2
4. **Try different wake word**: Alexa or Hey Mycroft might work better
5. **Verify you're saying the right phrase**: "Hey Jarvis" not "Jarvis"

### Issue: Works on Raspberry Pi but not macOS

**This is expected!** The `mic` library uses ALSA, which is Linux-specific. On macOS:

- It falls back to a default audio capture method
- This may not work reliably
- The Raspberry Pi is the intended deployment target

## If Nothing Works on macOS

**Don't worry!** This app is designed for Raspberry Pi 5 with a USB microphone. If you can't get it working on macOS:

1. **Deploy to Raspberry Pi** (see QUICKSTART.md)
2. **Use the existing voice-gateway app** (Porcupine version) which may work better on macOS
3. **Test the models in isolation** using recorded WAV files

## Testing with Pre-recorded Audio

If live microphone isn't working, test the models with a WAV file:

```bash
# Record yourself saying "Hey Jarvis"
sox -d -r 16000 -c 1 hey_jarvis.wav trim 0 3

# TODO: Add test script that feeds WAV file to detector
# (This would help isolate whether issue is mic or models)
```

## Next Steps

1. **Run the app** with the new logging: `npm run dev`
2. **Watch for**:
    - Audio chunks arriving (📥)
    - Audio levels when speaking (🎤)
    - Wake word scores (🔊)
3. **Speak into mic**: Say "Hey Jarvis" clearly
4. **If scores appear but are low**: Lower threshold to 0.3
5. **If no audio chunks**: Check microphone permissions
6. **If all fails**: Test on Raspberry Pi (the intended platform)

## Expected Output (Working System)

```
ℹ️  [info] Voice Gateway (OpenWakeWord) starting...
ℹ️  [info] Loading melspectrogram model...
ℹ️  [info] Loading embedding model...
ℹ️  [info] Loading wake word model...
ℹ️  [info] All OpenWakeWord models loaded successfully
⚠️  [warn] Running on macOS - using default microphone
ℹ️  [info] Microphone started
📥 [info] Received audio chunk #1 { size: 16384, bytes: '16384 bytes = 8192 samples = 512.0ms' }
🎤 [info] Audio level check { maxAmplitude: '0.0234', isSilent: 'NO (mic is working)' }
📥 [info] Received audio chunk #2 { size: 16384, bytes: '16384 bytes = 8192 samples = 512.0ms' }
🎤 [info] Audio level check { maxAmplitude: '0.0189', isSilent: 'NO (mic is working)' }
...
ℹ️  [info] Mel spectrogram buffer filled (76 frames)
ℹ️  [info] Embedding buffer filled (16 embeddings), wake word detection active
🔊 [info] Wake word score #1 { score: '0.0023', threshold: 0.5, status: '✓ normal' }
🔊 [info] Wake word score #2 { score: '0.0019', threshold: 0.5, status: '✓ normal' }
...
[You say "Hey Jarvis"]
🔊 [info] Wake word score #45 { score: '0.6234', threshold: 0.5, status: '🎉 DETECTED!' }
ℹ️  [info] Wake word detected! Starting recording... { score: 0.6234 }
```

## Support

If you're still stuck:

1. Share the output from `npm run dev`
2. Include results from audio tests above
3. Specify: macOS version, microphone type, Node.js version
