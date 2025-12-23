# Deployment Guide

This document provides comprehensive deployment instructions for production deployments using systemd services, Docker, and Kubernetes.

## Quick Reference: Service Log Commands

### Check Oracle (Next.js) Service

```bash
# View status
systemctl status oracle.service

# View logs (last 100 lines)
journalctl -u oracle.service -n 100 --no-pager

# Follow logs in real-time
journalctl -u oracle.service -f
```

### Check Voice Gateway Service

```bash
# View status
systemctl status voice-gateway-oww.service

# View logs (last 100 lines)
journalctl -u voice-gateway-oww.service -n 100 --no-pager

# Follow logs in real-time
journalctl -u voice-gateway-oww.service -f
```

### Check All Running Services

```bash
# List all active services
systemctl list-units --type=service --state=running

# Check failed services
systemctl list-units --type=service --state=failed
```

## Oracle Module (Next.js App) Deployment

### Pre-Deployment Checklist

**For Oracle (Next.js App):**

- [ ] Run `npm run build` in `/apps/oracle` directory
- [ ] Verify `.next` directory was created successfully
- [ ] Test the production build locally with `npm start`
- [ ] Check all environment variables are set correctly
- [ ] Verify database migrations are up to date
- [ ] Test MQTT connection and device control
- [ ] Verify Ollama is accessible and models are downloaded

**For Systemd Service Setup:**

- [ ] Verify working directory path is correct (`/apps/oracle` not `/oracle`)
- [ ] Check Node.js binary path is correct (especially if using NVM)
- [ ] Verify all environment variables are defined in service file
- [ ] Test service starts successfully: `systemctl status oracle.service`
- [ ] Check logs for errors: `journalctl -u oracle.service -n 100 --no-pager`
- [ ] Verify service restarts on failure
- [ ] Test service survives system reboot

### Common Deployment Issues

#### 1. "Could not find a production build in the '.next' directory"

- **Cause:** Missing production build
- **Fix:** Run `npm run build` in the application directory before starting
- **Prevention:** Add build step to deployment automation

#### 2. "Changing to the requested working directory failed: No such file or directory"

- **Cause:** Incorrect `WorkingDirectory` path in systemd service file
- **Fix:** Update service file to use correct path (e.g., `/home/pi/code/mqtt-ollama-presentation/apps/oracle`)
- **Prevention:** Always verify directory structure before creating service files

#### 3. Service fails silently or restarts continuously

- **Check logs:** `journalctl -u oracle.service -n 100 --no-pager`
- **Common causes:** Missing env vars, database not accessible, MQTT broker unreachable
- **Debug:** Run the ExecStart command manually to see real-time errors

### Systemd Service Template

**Location:** `/etc/systemd/system/oracle.service`

**Correct configuration:**

```ini
[Unit]
Description=Oracle - AI Home Automation Assistant
After=network.target ollama.service
Wants=ollama.service

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/code/mqtt-ollama-presentation/apps/oracle
Environment="NODE_ENV=production"
Environment="PORT=3000"
Environment="PATH=/usr/local/bin:/usr/bin:/bin"
Environment="OLLAMA_BASE_URL=http://localhost:11434"
Environment="OLLAMA_MODEL=llama3.2:3b"
Environment="DATABASE_URL=file:./dev.db"
Environment="MQTT_BROKER_URL=mqtt://127.0.0.1:1883"
ExecStart=/home/pi/.nvm/versions/node/current/bin/node /home/pi/code/mqtt-ollama-presentation/apps/oracle/node_modules/.bin/next start
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

# Security settings
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

**Key points:**

- ✅ `WorkingDirectory` must point to `/apps/oracle` (NOT `/oracle`)
- ✅ `ExecStart` must use absolute path to Node.js binary
- ✅ `ExecStart` must use absolute path to `next` executable
- ✅ Must run `npm run build` BEFORE starting the service
- ✅ All required environment variables must be defined
- ✅ Service should depend on network and ollama being ready

### Service Management

```bash
# After creating/editing service file
sudo systemctl daemon-reload
sudo systemctl enable oracle.service
sudo systemctl start oracle.service

# Check status
systemctl status oracle.service

# Check logs (most recent 100 lines)
journalctl -u oracle.service -n 100 --no-pager

# Follow logs in real-time
journalctl -u oracle.service -f

# Restart after code changes
sudo systemctl restart oracle.service
```

### Verifying the Service is Running Correctly

```bash
# 1. Check service status (should show "active (running)")
systemctl status oracle.service

# 2. View recent logs to check for errors
journalctl -u oracle.service -n 100 --no-pager

# 3. Look for these success indicators in logs:
# ✅ "Server started on http://localhost:3000"
# ✅ "ready - started server on"
# ❌ Look for ERROR, ECONNREFUSED, or exit codes

# 4. Test the application is accessible
curl http://localhost:3000

# 5. Check if Next.js is listening on port 3000
sudo netstat -tlnp | grep 3000
# OR
ss -tlnp | grep 3000
```

### Nginx Reverse Proxy Setup

If using nginx to proxy to the Next.js app:

- Next.js runs on port 3000
- Nginx should proxy to `http://127.0.0.1:3000`
- If nginx returns 502 Bad Gateway, check if oracle.service is running
- Check nginx logs: `sudo tail -50 /var/log/nginx/error.log`

### Docker Deployment

See README.md for Docker Compose and Kubernetes/Helm deployment options.

## Voice Gateway OWW Deployment

**IMPORTANT: Voice Gateway requires audio devices and Python dependencies**

### Pre-Deployment Checklist

**For Voice Gateway OWW:**

- [ ] Download Whisper model (e.g., `ggml-tiny.bin` or `ggml-base.bin`)
- [ ] Download OpenWakeWord models (melspectrogram, embedding, wake word model)
- [ ] **Configure ElevenLabs API key** in `.env` file
- [ ] **Install ffmpeg:** `brew install ffmpeg` (macOS) or `apt-get install ffmpeg` (Linux)
- [ ] **Verify internet connection** (required for ElevenLabs TTS)
- [ ] Test audio devices: `arecord -l` and `aplay -l`
- [ ] Verify ALSA device names in `.env` file
- [ ] Test MQTT connection to broker
- [ ] Verify Ollama is running and model is downloaded
- [ ] Test microphone: `arecord -D plughw:3,0 -f S16_LE -r 16000 -d 3 test.wav`

### Systemd Service Template

**Location:** `/etc/systemd/system/voice-gateway-oww.service`

**Correct configuration:**

```ini
[Unit]
Description=Voice Gateway OWW - Wake Word Detection and Voice Commands
After=network.target ollama.service
Wants=ollama.service

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/code/mqtt-ollama-presentation/apps/voice-gateway-oww
Environment="NODE_ENV=production"
Environment="LOG_LEVEL=info"
Environment="VIRTUAL_ENV=/home/pi/code/mqtt-ollama-presentation/apps/voice-gateway-oww/.venv"
Environment="PATH=/home/pi/code/mqtt-ollama-presentation/apps/voice-gateway-oww/.venv/bin:/usr/local/bin:/usr/bin:/bin"

# OpenWakeWord Configuration
Environment="OWW_MODEL_PATH=models/hey_jarvis_v0.1.onnx"
Environment="OWW_THRESHOLD=0.25"
Environment="OWW_INFERENCE_FRAMEWORK=onnx"

# Audio Configuration
Environment="AUDIO_MIC_DEVICE=plughw:3,0"
Environment="AUDIO_SPEAKER_DEVICE=plughw:2,0"
Environment="AUDIO_SAMPLE_RATE=16000"
Environment="AUDIO_CHANNELS=1"

# Voice Activity Detection (VAD)
Environment="VAD_TRAILING_SILENCE_MS=1500"
Environment="VAD_MAX_UTTERANCE_MS=10000"

# Whisper Speech-to-Text
Environment="WHISPER_MODEL=tiny"
Environment="WHISPER_MODEL_PATH=models/ggml-tiny.bin"

# MQTT Broker
Environment="MQTT_BROKER_URL=mqtt://localhost:1883"
Environment="MQTT_CLIENT_ID=voice-gateway-oww"
Environment="MQTT_USERNAME="
Environment="MQTT_PASSWORD="

# Health Check
Environment="HEALTHCHECK_PORT=3002"

# Ollama AI Configuration
Environment="OLLAMA_BASE_URL=http://localhost:11434"
Environment="OLLAMA_MODEL=qwen2.5:0.5b"

# Text-to-Speech (ElevenLabs)
Environment="TTS_ENABLED=true"
Environment="TTS_VOLUME=1.0"
Environment="TTS_SPEED=1.0"
Environment="ELEVENLABS_API_KEY=your_api_key_here"
Environment="ELEVENLABS_VOICE_ID=JBFqnCBsd6RMkjVDRZzb"
Environment="ELEVENLABS_MODEL_ID=eleven_multilingual_v2"

ExecStart=/home/pi/.nvm/versions/node/current/bin/node /home/pi/code/mqtt-ollama-presentation/apps/voice-gateway-oww/src/main.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

# Security settings
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

**Key points:**

- ✅ **CRITICAL:** Set `ELEVENLABS_API_KEY` environment variable with your API key
- ✅ **CRITICAL:** Internet connection required for TTS (fallback: disable with `TTS_ENABLED=false`)
- ✅ `WorkingDirectory` must point to `/apps/voice-gateway-oww`
- ✅ `ExecStart` must use absolute path to Node.js binary
- ✅ All audio device names must match your hardware (use `arecord -l` to find)
- ✅ Service should depend on network and ollama being ready
- ✅ Adjust `OWW_THRESHOLD` based on your environment (0.01-0.5)
- ✅ Ensure `ffmpeg` is installed for audio format conversion

### Installation Steps

```bash
# 1. Create service file in the app directory (for version control)
cd /home/pi/code/mqtt-ollama-presentation/apps/voice-gateway-oww

# 2. Copy service file to systemd directory
sudo cp voice-gateway-oww.service /etc/systemd/system/

# 3. Reload systemd daemon
sudo systemctl daemon-reload

# 4. Enable service to start on boot
sudo systemctl enable voice-gateway-oww.service

# 5. Start the service
sudo systemctl start voice-gateway-oww.service

# 6. Check status
systemctl status voice-gateway-oww.service
```

### Viewing Logs

**Real-time log monitoring:**

```bash
# Follow logs in real-time (most useful)
journalctl -u voice-gateway-oww.service -f

# Follow logs with timestamps
journalctl -u voice-gateway-oww.service -f --output=short-iso
```

**Historical logs:**

```bash
# Show last 50 lines
journalctl -u voice-gateway-oww.service -n 50 --no-pager

# Show last 100 lines
journalctl -u voice-gateway-oww.service -n 100 --no-pager

# Show logs since last boot
journalctl -u voice-gateway-oww.service -b

# Show logs from specific time range
journalctl -u voice-gateway-oww.service --since "2025-10-17 20:00:00" --until "2025-10-17 21:00:00"

# Show logs from last hour
journalctl -u voice-gateway-oww.service --since "1 hour ago"
```

**Filtering logs:**

```bash
# Search for errors only
journalctl -u voice-gateway-oww.service -p err

# Search for specific keywords
journalctl -u voice-gateway-oww.service --no-pager | grep "wake word"
journalctl -u voice-gateway-oww.service --no-pager | grep "TTS"
journalctl -u voice-gateway-oww.service --no-pager | grep "ElevenLabs"

# Show logs with context (before/after)
journalctl -u voice-gateway-oww.service --no-pager | grep -C 5 "error"
```

**Exporting logs:**

```bash
# Export to file
journalctl -u voice-gateway-oww.service --no-pager > voice-gateway-logs.txt

# Export last 1000 lines to file
journalctl -u voice-gateway-oww.service -n 1000 --no-pager > voice-gateway-logs.txt
```

### Service Management

```bash
# Start service
sudo systemctl start voice-gateway-oww.service

# Stop service
sudo systemctl stop voice-gateway-oww.service

# Restart service (after config changes)
sudo systemctl restart voice-gateway-oww.service

# Check status
systemctl status voice-gateway-oww.service

# Enable auto-start on boot
sudo systemctl enable voice-gateway-oww.service

# Disable auto-start on boot
sudo systemctl disable voice-gateway-oww.service

# Reload service file after editing
sudo systemctl daemon-reload
sudo systemctl restart voice-gateway-oww.service
```

### Common Deployment Issues

#### 1. "ElevenLabs TTS not ready" or API key errors

- **Cause:** Missing or invalid ElevenLabs API key
- **Fix:** Set `ELEVENLABS_API_KEY` in `.env` or systemd service file
- **Get API key:** https://elevenlabs.io/app/settings/api-keys
- **Verify:** Check logs for "✅ ElevenLabs TTS health check passed"

#### 2. "arecord: device not found" or microphone errors

- **Cause:** Incorrect ALSA device name
- **Fix:** Find correct device with `arecord -l`, update `AUDIO_MIC_DEVICE` in service file
- **Common devices:** `hw:2,0`, `plughw:3,0`, `default`
- **Test:** `arecord -D plughw:3,0 -f S16_LE -r 16000 -d 3 test.wav`

#### 3. Wake word not detected

- **Cause:** Threshold too high or microphone level too low
- **Fix:** Lower `OWW_THRESHOLD` (try 0.01 for testing, then increase to 0.25-0.5)
- **Check logs:** Look for detection scores in logs to see if wake word is being heard
- **Test mic:** `arecord -D plughw:3,0 -f S16_LE -r 16000 test.wav` and play back

#### 4. "spawn whisper-cli ENOENT" or transcription fails

- **Cause:** whisper-cli not in PATH
- **Fix:** Add whisper.cpp build directory to PATH in service file
- **Update PATH:** `Environment="PATH=/home/pi/code/whisper.cpp/build/bin:..."`
- **Verify:** Check that whisper-cli exists: `ls -l /home/pi/code/whisper.cpp/build/bin/whisper-cli`
- **Symptom:** Wake word detected (beep), but no transcription or AI response

#### 5. Service fails silently or restarts continuously

- **Check logs:** `journalctl -u voice-gateway-oww.service -n 100 --no-pager`
- **Common causes:**
  - Missing models (whisper, OpenWakeWord)
  - Missing ElevenLabs API key
  - No internet connection (for TTS)
  - MQTT broker unreachable
  - Ollama not running
  - Audio device permissions
- **Debug:** Run command manually:
  ```bash
  cd /home/pi/code/mqtt-ollama-presentation/apps/voice-gateway-oww && node src/main.js
  ```

#### 6. TTS not working (no spoken responses)

- **Cause:** Missing ElevenLabs API key, no internet, or ffmpeg not installed
- **Fix:** Set `ELEVENLABS_API_KEY`, verify internet connection, install ffmpeg
- **Install ffmpeg:** `brew install ffmpeg` (macOS) or `apt-get install ffmpeg` (Linux)
- **Verify:** Check logs for "✅ Welcome message spoken" on startup
- **Test:** `curl -I https://api.elevenlabs.io` (should return HTTP 200)
- **Fallback:** Set `TTS_ENABLED=false` to disable voice output

#### 7. High CPU usage or slow responses

- **Cause:** Using large Ollama model or Whisper model
- **Fix:**
  - Use `qwen2.5:0.5b` for Ollama (fastest)
  - Use `ggml-tiny.bin` for Whisper (1.5s vs 6s for base)
- **Monitor:** `htop` to check CPU usage

### Testing the Deployment

After deploying, verify everything works:

```bash
# 1. Check service status (should show "active (running)")
systemctl status voice-gateway-oww.service

# 2. View recent logs to verify startup
journalctl -u voice-gateway-oww.service -n 100 --no-pager

# 3. Look for these success indicators in logs:
# ✅ "Voice Gateway (OpenWakeWord) starting..."
# ✅ "ZWave MCP client ready"
# ✅ "OpenWakeWord initialized"
# ✅ "Voice Gateway (OpenWakeWord) is ready"
# ✅ "Listening for wake word..."
# ✅ "Welcome message spoken" (if TTS enabled)
#
# ❌ Look for these error indicators:
# ❌ "spawn whisper-cli ENOENT" - whisper-cli not in PATH
# ❌ "ElevenLabs TTS not ready" - API key missing or internet down
# ❌ "ALSA device check failed" - audio device issues
# ❌ "Failed to connect to MQTT broker" - MQTT connection issues
# ❌ "ffmpeg conversion failed" - ffmpeg not installed

# 4. Follow logs in real-time for testing
journalctl -u voice-gateway-oww.service -f

# 5. Test wake word detection
# Say "Hey Jarvis" followed by a question
# Watch logs for the complete flow:
# 🎤 "Wake word detected!" - wake word heard
# 📝 "You said: [your question]" - transcription succeeded
# 🤖 "AI Response: [response]" - Ollama responded
# ✅ "AI response playback complete" - TTS played audio
#
# If you hear beeps but nothing else, check logs for errors

# 6. Verify all components
# Check Ollama is running
curl http://localhost:11434/api/tags

# Check MQTT broker (if configured)
# Use MQTT client to subscribe to topics and verify messages

# Check audio devices
arecord -l  # List microphones
aplay -l    # List speakers
```

**Quick verification checklist:**

- [ ] Service shows "active (running)" in status
- [ ] Logs show "Voice Gateway (OpenWakeWord) is ready"
- [ ] Logs show "Listening for wake word..."
- [ ] Wake word detection triggers beep
- [ ] Speech is transcribed (check logs for "You said:")
- [ ] AI responds (check logs for "AI Response:")
- [ ] TTS plays audio (if enabled)

## Pre-Deployment Summary Checklist

Before deploying to production:

- [ ] Run `npm run build` successfully
- [ ] Verify `.next` directory exists (for Next.js apps)
- [ ] Verify correct directory paths in systemd service file
- [ ] Test service starts and runs successfully
- [ ] Check logs for errors
- [ ] Test the application is accessible
- [ ] All environment variables configured correctly
- [ ] External dependencies verified (Ollama, MQTT, audio devices)
- [ ] Internet connectivity verified (if using cloud services like ElevenLabs)
- [ ] Service restart behavior tested
