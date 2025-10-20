# ALSA Audio Configuration for Voice Gateway

**Last Updated:** 2025-10-11

This guide explains how to configure ALSA (Advanced Linux Sound Architecture) audio devices for the voice-gateway
service on Raspberry Pi 5.

---

## Hardware Overview

### USB Microphone: LANDIBO GSH23

**Specifications:**

- **Frequency Response:** 100-16kHz
- **Connector:** USB (8-foot shielded cable)
- **Sensitivity:** -67 DBV/PBAR, -47 DBV/Pascal ±4dB
- **Form Factor:** 2cm x 2cm x 0.5cm (0.79" x 0.79" x 0.20")
- **Color:** Black

**ALSA Device Name:** `hw:2,0` (detected as "USB PnP Sound Device")

### USB DAC/Speaker (Future)

**Status:** TBD - To be configured when TTS (Piper) is implemented in Phase 5.6

---

## Finding Your Audio Devices

### 1. List Capture Devices (Microphones)

```bash
arecord -l
```

**Expected Output:**

```
**** List of CAPTURE Hardware Devices ****
card 2: Device [USB PnP Sound Device], device 0: USB Audio [USB Audio]
  Subdevices: 1/1
  Subdevice #0: subdevice #0
```

**Device String:** `hw:2,0`

- `2` = Card number
- `0` = Device number

### 2. List Playback Devices (Speakers/DAC)

```bash
aplay -l
```

**Expected Output (example):**

```
**** List of PLAYBACK Hardware Devices ****
card 0: Headphones [bcm2835 Headphones], device 0: bcm2835 Headphones [bcm2835 Headphones]
  Subdevices: 8/8
  Subdevice #0: subdevice #0
  ...
card 1: Device [USB Audio Device], device 0: USB Audio [USB Audio]
  Subdevices: 1/1
  Subdevice #0: subdevice #0
```

**Device String:** `hw:1,0` (example, adjust based on your output)

---

## Testing Audio Devices

### Test Microphone Recording

**Record 3 seconds of audio:**

```bash
arecord -D hw:2,0 -f S16_LE -r 16000 -c 1 -d 3 test.wav
```

**Parameters:**

- `-D hw:2,0` - Device name (USB PnP Sound Device)
- `-f S16_LE` - Format: Signed 16-bit Little Endian PCM
- `-r 16000` - Sample rate: 16kHz (required for Whisper/OpenWakeWord)
- `-c 1` - Channels: Mono
- `-d 3` - Duration: 3 seconds

**Expected Output:**

```
Recording WAVE 'test.wav' : Signed 16 bit Little Endian, Rate 16000 Hz, Mono
```

### Test Speaker Playback

**Play back the recording:**

```bash
aplay test.wav
```

Or specify device explicitly:

```bash
aplay -D hw:1,0 test.wav
```

---

## Troubleshooting

### Issue: "Device or resource busy"

**Symptom:**

```
arecord: main:832: audio open error: Device or resource busy
```

**Causes:**

1. Another process is using the microphone
2. PulseAudio/PipeWire is intercepting the device

**Solutions:**

**Option 1: Kill competing processes**

```bash
# Find processes using the audio device
fuser -v /dev/snd/*

# Kill specific process (e.g., pulseaudio)
killall pulseaudio
```

**Option 2: Use PulseAudio device name**

```bash
# List PulseAudio devices
pactl list sources short

# Record via PulseAudio
arecord -D pulse -f S16_LE -r 16000 -c 1 -d 3 test.wav
```

**For voice-gateway:** Update `.env`:

```env
ALSA_MIC_DEVICE=pulse
```

---

### Issue: "No such file or directory"

**Symptom:**

```
arecord: main:832: audio open error: No such file or directory
```

**Cause:** Device name is incorrect or USB device not detected

**Solution:**

1. Verify USB device is connected:
   ```bash
   lsusb
   ```
   Look for audio device (e.g., "C-Media Electronics" or similar)

2. Re-check device name:
   ```bash
   arecord -l
   ```
   Note the correct `card X, device Y` numbers

3. Update `.env` with correct device:
   ```env
   ALSA_MIC_DEVICE=hw:X,Y
   ```

---

### Issue: Permissions denied

**Symptom:**

```
arecord: main:832: audio open error: Permission denied
```

**Cause:** User doesn't have permissions to access audio devices

**Solution:**

**Add user to `audio` group:**

```bash
sudo usermod -aG audio $USER
```

**Log out and back in** (or reboot) for changes to take effect.

**Verify group membership:**

```bash
groups
```

Should include `audio`.

---

### Issue: No audio input (silent recording)

**Symptom:** Recording succeeds, but file contains silence

**Debugging:**

1. **Check microphone levels:**
   ```bash
   alsamixer
   ```
    - Press `F4` to show capture devices
    - Use arrow keys to select USB microphone
    - Press `Space` to unmute (should show "CAPTURE" in red)
    - Adjust volume with up/down arrows

2. **Test microphone with visual feedback:**
   ```bash
   arecord -D hw:2,0 -f S16_LE -r 16000 -c 1 | aplay -D hw:1,0
   ```
   Speak into mic, should hear yourself in real-time (with slight delay).

3. **Check cable connection:**
    - Unplug and replug USB microphone
    - Try different USB port
    - Check for physical damage to cable

---

### Issue: Sample rate mismatch

**Symptom:**

```
arecord: set_params:1405: Sample format non available
```

**Cause:** Device doesn't support requested sample rate

**Solution:**

1. **Check supported formats:**
   ```bash
   arecord -D hw:2,0 --dump-hw-params
   ```

2. **Try different sample rate:**
   ```bash
   # Try 48kHz
   arecord -D hw:2,0 -f S16_LE -r 48000 -c 1 -d 3 test.wav
   ```

3. **For voice-gateway:** Update `.env` if needed:
   ```env
   SAMPLE_RATE=48000
   ```
   **Note:** Whisper expects 16kHz, so you'll need resampling if using 48kHz.

---

## ALSA Configuration File (Optional)

If you need persistent device aliases, create `/etc/asound.conf`:

```conf
# Voice Gateway ALSA Configuration

# USB Microphone (LANDIBO GSH23)
pcm.voice_mic {
    type hw
    card 2
    device 0
}

# Microphone with automatic resampling to 16kHz
pcm.voice_mic_16k {
    type plug
    slave {
        pcm "voice_mic"
        rate 16000
    }
}

# USB Speaker/DAC (future)
pcm.voice_speaker {
    type hw
    card 1
    device 0
}
```

**Usage:**

```bash
# Record using alias
arecord -D voice_mic_16k -f S16_LE -c 1 -d 3 test.wav

# Use in voice-gateway .env
ALSA_MIC_DEVICE=voice_mic_16k
```

---

## Voice Gateway Environment Configuration

### Minimum Configuration

**voice-gateway/.env:**

```env
# Audio Devices
ALSA_MIC_DEVICE=hw:2,0       # USB PnP Sound Device (LANDIBO GSH23)
SAMPLE_RATE=16000             # 16kHz for Whisper/OpenWakeWord
```

### Full Configuration with Future TTS

```env
# Audio Devices
ALSA_MIC_DEVICE=hw:2,0        # Capture device (microphone)
ALSA_SPEAKER_DEVICE=hw:1,0    # Playback device (speaker/DAC)
SAMPLE_RATE=16000             # Sample rate in Hz

# Audio Buffer Settings (advanced)
CAPTURE_BUFFER_SIZE=512       # Frames per buffer (lower = less latency)
PLAYBACK_BUFFER_SIZE=1024     # Frames per buffer
```

---

## Audio Quality Verification

### Recording Quality Checklist

**Record a test sample:**

```bash
arecord -D hw:2,0 -f S16_LE -r 16000 -c 1 -d 5 quality-test.wav
```

**Check file properties:**

```bash
file quality-test.wav
```

**Expected:**

```
quality-test.wav: RIFF (little-endian) data, WAVE audio, Microsoft PCM, 16 bit, mono 16000 Hz
```

**Play back and verify:**

- ✅ Clear speech (no distortion)
- ✅ Minimal background noise
- ✅ Consistent volume (not too quiet)
- ✅ No clipping (not too loud)

**If poor quality:**

1. Adjust microphone position (2-3 feet from mouth)
2. Reduce background noise (close windows, turn off fans)
3. Adjust ALSA capture volume: `alsamixer` → F4 → adjust levels

---

## Pre-Demo Audio Test Script

Save as `scripts/test-audio.sh`:

```bash
#!/bin/bash
set -e

echo "🎤 Voice Gateway Audio Test"
echo "=============================="
echo ""

# Check if ALSA utils are installed
if ! command -v arecord &> /dev/null; then
    echo "❌ arecord not found. Install: sudo apt-get install alsa-utils"
    exit 1
fi

# List capture devices
echo "📋 Available capture devices:"
arecord -l
echo ""

# Test recording
echo "🔴 Recording 3 seconds of audio... (speak into microphone)"
arecord -D hw:2,0 -f S16_LE -r 16000 -c 1 -d 3 /tmp/voice-test.wav 2>&1
echo ""

# Check recording
if [ ! -f /tmp/voice-test.wav ]; then
    echo "❌ Recording failed"
    exit 1
fi

echo "✅ Recording successful"
echo "📊 File info:"
file /tmp/voice-test.wav
echo ""

# Test playback
echo "🔊 Playing back recording..."
aplay /tmp/voice-test.wav
echo ""

# Cleanup
rm /tmp/voice-test.wav

echo "✅ Audio test complete!"
echo ""
echo "📝 If you heard your voice clearly, audio is configured correctly."
echo "📝 Update voice-gateway/.env with: ALSA_MIC_DEVICE=hw:2,0"
```

**Usage:**

```bash
chmod +x scripts/test-audio.sh
./scripts/test-audio.sh
```

---

## Docker Configuration

### Exposing Audio Devices to Container

**docker-compose.yml:**

```yaml
version: '3.8'
services:
  voice-gateway:
    image: voice-gateway:latest
    devices:
      - /dev/snd:/dev/snd    # Expose all ALSA devices
    environment:
      - ALSA_MIC_DEVICE=hw:2,0
      - SAMPLE_RATE=16000
    # Give container access to audio group
    group_add:
      - audio
```

**Alternative: Specific device only**

```yaml
devices:
  - /dev/snd/controlC2:/dev/snd/controlC2
  - /dev/snd/pcmC2D0c:/dev/snd/pcmC2D0c
```

### Dockerfile ALSA Dependencies

```dockerfile
FROM node:20-bullseye

# Install ALSA libraries
RUN apt-get update && apt-get install -y \
    alsa-utils \
    libasound2-dev \
    && rm -rf /var/lib/apt/lists/*

# Rest of Dockerfile...
```

---

## Kubernetes Configuration

### Privileged Pod with Audio Access

**deployment.yaml:**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: voice-gateway
spec:
  template:
    spec:
      containers:
      - name: voice-gateway
        image: voice-gateway:latest
        securityContext:
          privileged: true   # Required for /dev/snd access
        volumeMounts:
        - name: alsa-device
          mountPath: /dev/snd
        env:
        - name: ALSA_MIC_DEVICE
          value: "hw:2,0"
        - name: SAMPLE_RATE
          value: "16000"
      volumes:
      - name: alsa-device
        hostPath:
          path: /dev/snd
          type: Directory
      nodeSelector:
        audio: "true"    # Schedule on nodes with USB mic
```

**Label node with USB mic:**

```bash
kubectl label nodes raspberry-pi-5 audio=true
```

---

## Performance Considerations

### Latency Tuning

**Lower buffer size = Lower latency, but higher CPU:**

```env
CAPTURE_BUFFER_SIZE=256    # ~16ms latency at 16kHz
```

**Higher buffer size = Higher latency, but more stable:**

```env
CAPTURE_BUFFER_SIZE=1024   # ~64ms latency at 16kHz
```

**Recommendation for voice-gateway:**

- **Capture:** 512 frames (~32ms) - Good balance
- **Playback:** 1024 frames (~64ms) - More buffering for smooth playback

### CPU Usage

**Monitor ALSA CPU usage:**

```bash
top -p $(pgrep -f voice-gateway)
```

**If CPU usage is high:**

1. Increase buffer size
2. Reduce sample rate (if Whisper supports it)
3. Use hardware mixing (if available)

---

## Common ALSA Commands Reference

```bash
# List all cards
arecord -L

# List playback devices
aplay -L

# Show card info
cat /proc/asound/cards

# Test microphone with volume meter
arecord -D hw:2,0 -f S16_LE -r 16000 -c 1 | aplay -D hw:1,0

# Continuous recording (Ctrl+C to stop)
arecord -D hw:2,0 -f S16_LE -r 16000 -c 1 recording.wav

# Adjust volume
alsamixer

# Show ALSA version
arecord --version
```

---

## References

- [ALSA Project Documentation](https://www.alsa-project.org/wiki/Main_Page)
- [ALSA PCM API](https://www.alsa-project.org/alsa-doc/alsa-lib/pcm.html)
- [Raspberry Pi Audio Configuration](https://www.raspberrypi.com/documentation/computers/configuration.html#audio-configuration)
- [USB Audio Class (UAC)](https://en.wikipedia.org/wiki/USB_audio)

---

## Quick Start Checklist

Before starting voice-gateway, verify:

- [ ] USB microphone connected: `lsusb`
- [ ] Device detected: `arecord -l` shows card 2
- [ ] Recording works: `arecord -D hw:2,0 -f S16_LE -r 16000 -c 1 -d 3 test.wav`
- [ ] Playback works: `aplay test.wav`
- [ ] User in audio group: `groups | grep audio`
- [ ] Environment configured: `ALSA_MIC_DEVICE=hw:2,0` in `.env`
- [ ] Test script passes: `./scripts/test-audio.sh`

**If all checks pass:** ✅ Ready to start voice-gateway!

---

**Questions or issues?** See [Troubleshooting](#troubleshooting) section or check voice-gateway logs.
