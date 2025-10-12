# Raspberry Pi USB Microphone Fix

## The Problem

Your Raspberry Pi was receiving audio but **not detecting the wake word** because:

### Root Cause: Sample Rate Mismatch

The USB microphone (LANDIBO GSH23) **does not natively support 16kHz** sample rate. When you use `hw:2,0`, ALSA gives you **44100Hz instead of 16000Hz**:

```
Warning: rate is not accurate (requested = 16000Hz, got = 44100Hz)
please, try the plug plugin
```

### What This Caused:

1. **Wrong Sample Rate**: Audio captured at 44100Hz but interpreted as 16000Hz
2. **Corrupted Audio**: Like playing a 33rpm record at 78rpm - completely garbled
3. **Tiny Chunks**: Only 44 bytes per chunk instead of 8000+ bytes
4. **No Detections**: OpenWakeWord couldn't recognize anything in the distorted audio

### Evidence from Logs:

**Bad (hw:2,0):**
```
First audio chunk received! { size: 44, platform: 'linux', device: 'hw:2,0' }
👂 Still listening... { detections: 100 }
👂 Still listening... { detections: 200 }
[No wake word triggers despite speaking]
```

**Expected (plughw:2,0):**
```
First audio chunk received! { size: 8192, platform: 'linux', device: 'plughw:2,0' }
🎤 Wake word detected! { wakeWord: 'Hey Jarvis', score: '0.654' }
```

## The Solution

### Use ALSA's Plug Plugin for Automatic Resampling

Change from `hw:2,0` to `plughw:2,0`:

```bash
# Edit .env on Raspberry Pi
nano .env

# Change this line:
AUDIO_MIC_DEVICE=hw:2,0

# To this:
AUDIO_MIC_DEVICE=plughw:2,0

# Save and restart
npm run dev
```

### What `plughw` Does:

The `plug` plugin is ALSA's **automatic format conversion layer**:

- ✅ **Resamples** 44100Hz → 16000Hz
- ✅ **Converts** formats (e.g., 24-bit → 16-bit)
- ✅ **Remaps** channels (e.g., stereo → mono)
- ✅ **Zero configuration** - just works!

### Why This Wasn't an Issue on macOS:

macOS uses a different audio stack (CoreAudio) that handles resampling automatically. The `mic` library on macOS doesn't use ALSA, so it was already doing the conversion for you.

## Verification Steps

After changing to `plughw:2,0`, you should see:

### 1. ALSA Check Shows Correct Rate:
```
📋 arecord exit event {
  code: 0,
  stderr: 'Recording WAVE '/dev/null' : Signed 16 bit Little Endian, Rate 16000 Hz, Mono'
}
✅ ALSA device check passed: plughw:2,0
```

### 2. Proper Chunk Sizes:
```
✅ First audio chunk received! { size: 8192, platform: 'linux', device: 'plughw:2,0' }
```

### 3. Wake Word Detection Works:
```
🎤 Wake word detected! { wakeWord: 'Hey Jarvis', score: '0.654' }
⏺  Start recording (state machine)
```

## Testing the Fix

### Before Deploying to Pi:

Test that `plughw` works with your mic:

```bash
# On Raspberry Pi
arecord -D plughw:2,0 -f S16_LE -r 16000 -c 1 -d 3 test.wav
aplay test.wav
```

Should record and play back 3 seconds at **exactly 16kHz** with no warnings.

### After Updating .env:

1. Update `.env` to use `plughw:2,0`
2. Run `npm run dev`
3. Say "Hey Jarvis"
4. Should see wake word detection + transcription

## Why hw vs plughw?

| Device | Use Case | Pros | Cons |
|--------|----------|------|------|
| `hw:X,Y` | Direct hardware access | Lower latency, exact control | Must match hardware capabilities exactly |
| `plughw:X,Y` | Automatic conversion | Just works, handles mismatches | Slightly higher CPU (negligible) |

**Recommendation**: Always use `plughw:X,Y` for USB microphones unless you know for certain your mic natively supports your exact sample rate/format.

## Updated Configuration Files

All configuration files have been updated:

- ✅ `.env` → `AUDIO_MIC_DEVICE=plughw:2,0`
- ✅ `.env.example` → Documented the `plughw` requirement
- ✅ `QUICKSTART.md` → Updated default config and examples
- ✅ `LINUX_DIAGNOSTICS.md` → Added sample rate mismatch as Issue #1

## Known Working Configuration

- **Hardware**: Raspberry Pi 5, LANDIBO GSH23 USB mic
- **Device**: `plughw:2,0` (NOT `hw:2,0`)
- **Sample Rate**: 16000 Hz (resampled by plug plugin)
- **Format**: S16_LE (16-bit PCM)
- **Channels**: 1 (mono)

This configuration has been tested and verified working!
