# Linux/Raspberry Pi Diagnostics

## Current Issue

The app initializes successfully on Raspberry Pi but produces NO audio chunks - only heartbeat messages every 100 detections.

This indicates the microphone is not streaming data to the application.

## What The Diagnostic Logs Will Show

With the latest code changes, you'll now see:

### If ALSA Device is Wrong:
```
🔍 Checking ALSA device: hw:2,0
❌ ALSA device check failed with code 1
   stderr: "arecord: main:830: audio open error: No such file or directory"
```

**Fix**: Find correct device with `arecord -l`

### If ALSA Device Works But Mic Library Fails:
```
✅ ALSA device check passed: hw:2,0
✅ OpenWakeWord initialized
🎤 Starting microphone...
❌ No audio chunks received after 3 seconds!
   suggestion: "Check microphone permissions or device configuration"
```

**Fix**: Microphone library issue - may need different audio capture approach

### If Microphone Starts But Stops:
```
✅ First audio chunk received! { size: 8192, platform: 'linux', device: 'hw:2,0' }
🎙️ Microphone still streaming { chunks: 100, bufferSize: 8192 }
🎙️ Microphone still streaming { chunks: 200, bufferSize: 8192 }
[... then stops ...]
```

**Fix**: Audio buffer overflow or mic library crash

### If Everything Works:
```
✅ ALSA device check passed: hw:2,0
✅ OpenWakeWord initialized
🎤 Starting microphone...
✅ First audio chunk received! { size: 8192, platform: 'linux', device: 'hw:2,0' }
🎧 Listening for wake word...
State changed { state: 'listening' }
🎙️ Microphone still streaming { chunks: 100, bufferSize: 8192 }
👂 Still listening... { detections: 100 }
```

## Diagnostic Commands to Run on Pi

### 1. Check Available Audio Devices
```bash
arecord -l
```

Expected output should show your USB mic:
```
card 2: GSH23 [USB PnP Sound Device], device 0: USB Audio [USB Audio]
```

### 2. Test ALSA Device Directly
```bash
arecord -D hw:2,0 -f S16_LE -r 16000 -c 1 -d 3 test.wav
aplay test.wav
```

Should record and play back 3 seconds of audio.

### 3. Check Microphone Permissions
```bash
# Check if user is in audio group
groups

# Should show: pi adm dialout cdrom sudo audio video plugdev games users input render netdev gpio i2c spi

# If 'audio' is missing, add it:
sudo usermod -a -G audio $USER
# Then log out and back in
```

### 4. Check ALSA Configuration
```bash
cat /proc/asound/cards
```

Should show your USB mic with a card number.

### 5. Test with arecord in Background
```bash
# Start recording to file
arecord -D hw:2,0 -f S16_LE -r 16000 -c 1 test_stream.wav &
ARECORD_PID=$!

# Wait 5 seconds
sleep 5

# Stop recording
kill $ARECORD_PID

# Check file size (should be ~160KB for 5 seconds)
ls -lh test_stream.wav

# Play it back
aplay test_stream.wav
```

## Common Linux/Pi Issues

### Issue 1: Sample Rate Mismatch (CRITICAL!)
**Symptom**:
```
Warning: rate is not accurate (requested = 16000Hz, got = 44100Hz)
First audio chunk received! { size: 44 }
Still listening... { detections: 100 }
[No wake word detection despite speaking]
```

**Root Cause**: USB mic doesn't natively support 16kHz, so ALSA gives you 44100Hz instead, making audio unusable.

**Fix**: Use `plughw` instead of `hw` to enable automatic resampling:
```bash
# In .env, change:
AUDIO_MIC_DEVICE=hw:2,0

# To:
AUDIO_MIC_DEVICE=plughw:2,0
```

The `plug` plugin automatically converts 44100Hz → 16000Hz for you!

### Issue 2: Wrong ALSA Device
**Symptom**: `❌ ALSA device check failed with code 1`

**Fix**:
1. Run `arecord -l` to find correct device
2. Update `.env` with correct device (e.g., `hw:1,0` instead of `hw:2,0`)

### Issue 2: Audio Group Permission
**Symptom**: `❌ No audio chunks received after 3 seconds`

**Fix**:
```bash
sudo usermod -a -G audio $USER
# Log out and back in
```

### Issue 3: ALSA Device Locked by Another Process
**Symptom**: ALSA check passes but mic library fails

**Fix**:
```bash
# Check what's using audio
lsof /dev/snd/*

# Kill any other processes using the mic
```

### Issue 4: Mic Library Not Installing Correctly
**Symptom**: Mic stream never fires 'data' events

**Fix**:
```bash
# Reinstall mic library
npm uninstall mic
npm install mic

# Or try alternative: node-record-lpcm16
npm install node-record-lpcm16
```

### Issue 5: USB Microphone Power Issue
**Symptom**: Mic works with arecord but not with Node.js

**Fix**:
- Try different USB port
- Check if mic has external power
- Check `dmesg | grep -i usb` for USB errors

## Next Steps After Running Diagnostics

1. **Run the app on Pi**: `npm run dev`
2. **Check new diagnostic logs** (look for emoji indicators)
3. **If ALSA check fails**: Fix device configuration
4. **If mic timeout occurs**: Check permissions and processes
5. **If chunks arrive but no detections**: Wake word threshold issue (already solved on macOS)

## Emergency Fallback: File-Based Testing

If mic library is fundamentally broken on your Pi, test wake word detection with pre-recorded audio:

```bash
# Record test audio
arecord -D hw:2,0 -f S16_LE -r 16000 -c 1 -d 5 test_wakeword.wav

# Create test script that feeds this to detector
# (Would require modifying main.js to read from file instead of mic)
```

## Known Working Configuration

- **Hardware**: Raspberry Pi 5, LANDIBO GSH23 USB microphone
- **OS**: Raspberry Pi OS (Debian-based)
- **Device**: hw:2,0
- **Sample Rate**: 16000 Hz
- **Channels**: 1 (mono)
- **Format**: S16_LE (16-bit PCM)

If you have this exact setup and it still doesn't work, the issue is likely software/permissions.
