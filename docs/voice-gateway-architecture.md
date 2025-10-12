# Voice Gateway Architecture

**Last Updated:** 2025-10-11

## Overview

The `voice-gateway` is a standalone Node.js service that adds offline, Alexa-style voice commands to the MQTT + Ollama home automation system. It runs alongside the Oracle Next.js app and communicates via MQTT.

## Architecture Decision

### Why Separate Service?

**Chosen:** Separate `voice-gateway` service (not integrated into Oracle)

**Rationale:**
1. **Separation of concerns**: Voice is real-time audio processing; Oracle is HTTP/WebSocket-based chat
2. **Different runtime requirements**: Voice needs persistent mic/speaker access, Oracle doesn't
3. **Deployment flexibility**: Can run voice on different hardware (e.g., dedicated audio device)
4. **Presentation clarity**: Shows modular microservices architecture for CodeMash talk
5. **Process isolation**: Audio buffer timing won't block Next.js HTTP requests

**Alternatives considered:**
- ❌ Integrate into Oracle as `/api/voice` route: Next.js doesn't handle long-running mic streams well
- ❌ Python service: Requires polyglot toolchain, increases complexity
- ✅ Node.js service: Matches Oracle stack, npm has good audio bindings

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Raspberry Pi 5                            │
│                                                                   │
│  ┌───────────────────┐                ┌───────────────────────┐ │
│  │   voice-gateway   │◄──────MQTT────►│   Oracle (Next.js)    │ │
│  │   (Node.js)       │                │   (LangChain + AI)    │ │
│  │                   │                │                       │ │
│  │ • Porcupine       │                │ • Chat API            │ │
│  │ • Whisper.cpp     │                │ • Device Control      │ │
│  │ • WebRTC VAD      │                │ • Database            │ │
│  └─────────┬─────────┘                └───────────┬───────────┘ │
│            │                                      │               │
│            │                                      │               │
│  ┌─────────▼──────────────────────────────────────▼───────────┐ │
│  │              HiveMQ MQTT Broker                             │ │
│  │              (10.0.0.58:31883)                              │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌───────────────┐                    ┌───────────────────────┐ │
│  │ USB Microphone│                    │   Z-Wave Devices      │ │
│  │ (LANDIBO GSH23│                    │   (via zwave-js-ui)   │ │
│  │  hw:2,0)      │                    └───────────────────────┘ │
│  └───────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Voice Gateway Components

### 1. Wake Word Detection (Porcupine)

**Technology:** Picovoice Porcupine Node.js SDK
**Wake Word:** "Computer" (built-in)
**Audio Input:** ALSA hw:2,0 (USB PnP Sound Device)
**Sample Rate:** 16kHz mono PCM

**Flow:**
1. Open ALSA microphone stream
2. Feed 512-frame audio chunks to Porcupine
3. On detection: Trigger recorder, disable wake word loop
4. Publish MQTT status: `{state: "recording", wake_word_active: false}`

**Configuration:**
```env
PORCUPINE_ACCESS_KEY=your_picovoice_access_key
PORCUPINE_KEYWORD=computer
PORCUPINE_SENSITIVITY=0.5  # 0.0-1.0, higher = more sensitive
```

---

### 2. Audio Recording + VAD

**Recorder:** ALSA continuous capture after wake word
**VAD:** WebRTC VAD (C++ bindings via `node-webrtc-vad`)
**Silence Detection:** 1.5s trailing silence → stop recording
**Max Length:** 10 seconds

**Flow:**
1. Wake word detected → start buffering audio
2. Feed 10ms frames (160 samples @ 16kHz) to VAD
3. Track continuous silence duration
4. Stop conditions:
   - Trailing silence > 1.5s
   - Total length > 10s
5. Save PCM buffer as WAV file: `/tmp/voice-recording-{timestamp}.wav`

**Configuration:**
```env
VAD_TRAILING_SILENCE_MS=1500
VAD_MAX_UTTERANCE_MS=10000
SAMPLE_RATE=16000
```

---

### 3. Speech-to-Text (Whisper.cpp)

**Technology:** whisper.cpp with Node.js bindings
**Model:** ggml-base.bin (~74MB)
**Input:** WAV file (16kHz mono PCM)
**Output:** UTF-8 text transcription

**Flow:**
1. Load Whisper model on startup
2. On recording complete: `transcribe(wavFilePath)`
3. Whisper processes audio locally (~1-2s for 5s audio)
4. Return cleaned transcription text
5. Delete temporary WAV file

**Configuration:**
```env
WHISPER_MODEL=base
WHISPER_MODEL_PATH=./models/ggml-base.bin
```

**Model Download:**
- Source: Hugging Face (ggerganov/whisper.cpp)
- URL: https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin
- Size: 74MB
- Cached in: `voice-gateway/models/`

---

### 4. MQTT Integration

**Broker:** HiveMQ at `mqtt://10.0.0.58:31883`
**Client ID:** `voice-gateway`
**QoS Level:** 1 (at least once delivery)

**Published Topics:**

**`voice/req` - Voice transcription requests**
```json
{
  "transcription": "turn on the living room lights",
  "timestamp": "2025-10-11T15:30:00Z",
  "session_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**`voice/status` - Gateway status updates**
```json
{
  "state": "listening" | "recording" | "processing" | "idle" | "error",
  "wake_word_active": true,
  "error": "optional error message"
}
```

**Subscribed Topics:**

**`voice/res` - AI responses from Oracle**
```json
{
  "response": "Turning on the living room lights now.",
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-10-11T15:30:02Z"
}
```

**Flow:**
1. Transcription complete → Publish to `voice/req` with new session_id
2. Subscribe to `voice/res`, filter by session_id
3. Log AI response to console (TTS deferred)
4. Publish status: `{state: "idle", wake_word_active: true}`
5. Re-enable wake word detection

---

### 5. Oracle Integration

**Changes Required in Oracle App:**

**5.1: Subscribe to `voice/req`**
```typescript
// oracle/src/lib/mqtt/client.ts
mqttClient.subscribe('voice/req', (err) => {
  if (!err) console.log('Subscribed to voice requests');
});

mqttClient.on('message', async (topic, message) => {
  if (topic === 'voice/req') {
    const { transcription, session_id } = JSON.parse(message.toString());
    console.log(`Voice request: ${transcription}`);

    // Forward to existing chat logic
    const response = await processChat(transcription);

    // Publish response
    mqttClient.publish('voice/res', JSON.stringify({
      response,
      session_id,
      timestamp: new Date().toISOString(),
    }));
  }
});
```

**5.2: No changes to chat API**
- Voice requests use same LangChain agent logic
- Same device control tools
- Same database queries
- Same response formatting

---

## Project Structure

```
voice-gateway/
├── src/
│   ├── main.ts              # Entry point, orchestrates components
│   ├── config.ts            # Environment variable loader + validation
│   ├── wakeword.ts          # Porcupine integration
│   ├── recorder.ts          # ALSA capture + WebRTC VAD
│   ├── stt.ts               # Whisper.cpp wrapper
│   ├── mqtt.ts              # MQTT client (publish/subscribe)
│   ├── audio.ts             # ALSA playback utilities (future TTS)
│   ├── health.ts            # HTTP health check server
│   └── logger.ts            # Structured logging
├── scripts/
│   ├── setup.sh             # Model download + ALSA test
│   └── test-voice-e2e.sh    # End-to-end test script
├── models/                  # Downloaded models (gitignored)
│   ├── ggml-base.bin        # Whisper model (74MB)
│   └── porcupine_params.pv  # Porcupine wake word (if not embedded)
├── tests/
│   ├── wakeword.test.ts
│   ├── recorder.test.ts
│   ├── stt.test.ts
│   └── mqtt.test.ts
├── .env.example             # Environment template
├── .gitignore
├── package.json
├── tsconfig.json
├── Dockerfile
└── README.md
```

---

## Dependencies

### Core Dependencies
```json
{
  "@picovoice/porcupine-node": "^3.0.0",  // Wake word detection
  "node-webrtc-vad": "^1.0.0",            // Voice activity detection
  "mqtt": "^5.14.1",                       // MQTT client
  "wav": "^1.0.2",                         // WAV file I/O
  "whisper-node": "^1.0.0",                // Whisper.cpp bindings
  "alsa": "^1.0.0",                        // ALSA audio bindings
  "uuid": "^9.0.0"                         // Session ID generation
}
```

### Dev Dependencies
```json
{
  "typescript": "^5.0.0",
  "@types/node": "^20.0.0",
  "ts-node": "^10.0.0",
  "jest": "^29.0.0",
  "@types/jest": "^29.0.0"
}
```

---

## Configuration

### Environment Variables

**Required:**
```env
# Porcupine
PORCUPINE_ACCESS_KEY=your_picovoice_access_key

# MQTT
MQTT_BROKER_URL=mqtt://10.0.0.58:31883

# Whisper
WHISPER_MODEL_PATH=./models/ggml-base.bin
```

**Optional (with defaults):**
```env
# Porcupine
PORCUPINE_KEYWORD=computer
PORCUPINE_SENSITIVITY=0.5

# Audio
ALSA_MIC_DEVICE=hw:2,0
SAMPLE_RATE=16000

# VAD
VAD_TRAILING_SILENCE_MS=1500
VAD_MAX_UTTERANCE_MS=10000

# MQTT
MQTT_CLIENT_ID=voice-gateway

# Whisper
WHISPER_MODEL=base

# Logging
LOG_LEVEL=info
```

---

## Error Handling & Resilience

### Wake Word Crashes
- Catch Porcupine errors → log + restart loop
- Max consecutive failures: 5 → process exit

### STT Failures
- Catch Whisper errors → log transcription failure
- Optional: Play error beep via speaker
- Restart wake word loop (don't block)

### MQTT Disconnections
- Auto-reconnect with exponential backoff
- Queue voice requests (max 10) during disconnect
- Publish queued requests on reconnect

### Back-Pressure Protection
- Disable wake word detection during:
  - Active recording
  - STT processing
  - TTS playback (future)
- Re-enable only when `state === "idle"`
- Prevents overlapping commands

---

## Monitoring & Metrics

### Health Check Endpoint
- **Port:** 3001
- **Endpoint:** `GET /health`
- **Response:**
  ```json
  {
    "status": "ok",
    "wake_word_active": true,
    "uptime": 3600,
    "wake_word_detections": 42,
    "transcriptions_completed": 40,
    "transcriptions_failed": 2,
    "mqtt_connected": true
  }
  ```

### Structured Logging
- Format: JSON (for Kubernetes)
- Fields: `timestamp`, `level`, `component`, `message`, `metadata`
- Levels: `debug`, `info`, `warn`, `error`

**Example:**
```json
{
  "timestamp": "2025-10-11T15:30:00Z",
  "level": "info",
  "component": "wakeword",
  "message": "Wake word detected",
  "metadata": { "confidence": 0.85 }
}
```

---

## Deployment

### Docker

**Dockerfile:**
```dockerfile
FROM node:20-bullseye

# Install ALSA and build tools
RUN apt-get update && apt-get install -y \
    libasound2-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --production

# Copy source code
COPY . .

# Download models at build time
RUN npm run setup

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:3001/health || exit 1

# Run
CMD ["npm", "start"]
```

**Docker Compose:**
```yaml
version: '3.8'
services:
  voice-gateway:
    build: ./voice-gateway
    container_name: voice-gateway
    devices:
      - /dev/snd:/dev/snd  # ALSA audio devices
    environment:
      - PORCUPINE_ACCESS_KEY=${PORCUPINE_ACCESS_KEY}
      - MQTT_BROKER_URL=mqtt://10.0.0.58:31883
      - ALSA_MIC_DEVICE=hw:2,0
    ports:
      - "3001:3001"  # Health check
    restart: unless-stopped
```

### Kubernetes

**Deployment:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: voice-gateway
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: voice-gateway
        image: voice-gateway:latest
        env:
        - name: PORCUPINE_ACCESS_KEY
          valueFrom:
            secretKeyRef:
              name: voice-secrets
              key: porcupine-access-key
        volumeMounts:
        - name: alsa-device
          mountPath: /dev/snd
      volumes:
      - name: alsa-device
        hostPath:
          path: /dev/snd
      nodeSelector:
        audio: "true"  # Schedule on node with USB mic
```

---

## Testing Strategy

### Unit Tests
- `wakeword.test.ts` - Porcupine initialization, wake word detection
- `recorder.test.ts` - Audio buffering, VAD, WAV writing
- `stt.test.ts` - Whisper transcription (mock audio)
- `mqtt.test.ts` - Publish/subscribe, reconnection

### Integration Tests
- End-to-end: Wake word → Record → Transcribe → MQTT → Oracle → Response
- ALSA device detection and access
- Model loading and caching

### Manual Tests
- Say "Computer" → verify console log
- Say "Computer, turn on the lights" → verify MQTT message published
- Verify Oracle receives transcription
- Verify response logged in voice-gateway

### Pre-Demo Checklist
- [ ] Run `scripts/test-voice-e2e.sh` → passes
- [ ] Say test commands 5 times → 100% success rate
- [ ] Leave running 5 minutes → no false positives
- [ ] Unplug/replug mic → auto-recovers
- [ ] Kill MQTT broker → queues requests, reconnects

---

## Performance Targets

| Metric | Target | Actual (Measured) |
|--------|--------|-------------------|
| Wake word detection latency | < 500ms | TBD |
| Recording + VAD latency | < 2s | TBD |
| STT transcription (5s audio) | < 2s | TBD |
| End-to-end (wake word → MQTT) | < 5s | TBD |
| False positive rate (wake word) | < 1/hour | TBD |
| Memory usage | < 500MB | TBD |
| CPU usage (idle) | < 5% | TBD |
| CPU usage (active) | < 50% | TBD |

---

## Known Limitations & Future Work

### MVP Limitations
1. **No TTS playback** - Text responses logged to console only
2. **Single language** - English only (Whisper can do 99+ languages)
3. **Single user** - No speaker identification
4. **Single wake word** - "Computer" only (Porcupine free tier = 3 wake words)
5. **No streaming STT** - Full utterance transcribed after silence

### Future Enhancements
1. **Add TTS (Piper)** - Text-to-speech responses via USB speaker
2. **Custom wake word** - Train custom wake word (e.g., "Hey Oracle")
3. **Multi-language** - Detect language, transcribe accordingly
4. **Speaker identification** - Multi-user voice profiles
5. **Streaming STT** - Real-time transcription (partial results)
6. **Noise cancellation** - RNNoise or similar
7. **Far-field audio** - Beamforming with multi-mic array
8. **Wake-on-voice** - Low-power always-on detection

---

## Security Considerations

### API Keys
- Porcupine access key stored in environment variable (not committed)
- Use Kubernetes secrets in production
- Rotate keys regularly

### MQTT
- Currently uses anonymous auth (demo mode)
- Production: Enable authentication + TLS
- Use ACLs to restrict topic access

### Audio Privacy
- All processing happens locally (no cloud STT)
- Audio files deleted immediately after transcription
- No audio recording persistence
- No audio transmitted over network

---

## Troubleshooting Guide

### Wake Word Not Detecting

**Symptoms:** Say "Computer" but no response

**Checks:**
1. Verify microphone working: `arecord -D hw:2,0 -f S16_LE -r 16000 -d 3 test.wav && aplay test.wav`
2. Check Porcupine access key is valid
3. Adjust sensitivity: `PORCUPINE_SENSITIVITY=0.7`
4. Check logs: `docker logs voice-gateway`

### STT Transcription Errors

**Symptoms:** Wake word detects, but transcription fails

**Checks:**
1. Verify Whisper model downloaded: `ls -lh models/ggml-base.bin`
2. Check audio quality: Play back recorded WAV file
3. Increase max utterance length: `VAD_MAX_UTTERANCE_MS=15000`
4. Try tiny model: `WHISPER_MODEL=tiny`

### MQTT Connection Issues

**Symptoms:** Transcriptions not reaching Oracle

**Checks:**
1. Verify broker accessible: `mosquitto_sub -h 10.0.0.58 -p 31883 -t 'voice/#'`
2. Check firewall rules
3. Verify MQTT_BROKER_URL correct
4. Check Oracle subscribed to `voice/req`

### ALSA Device Not Found

**Symptoms:** `Error: Cannot open audio device`

**Checks:**
1. List devices: `arecord -l`
2. Verify device name: `ALSA_MIC_DEVICE=hw:2,0`
3. Check permissions: `sudo usermod -aG audio $USER`
4. Restart container: `docker restart voice-gateway`

---

## References

### Documentation
- [Porcupine Wake Word](https://picovoice.ai/docs/porcupine/)
- [Whisper.cpp](https://github.com/ggerganov/whisper.cpp)
- [WebRTC VAD](https://webrtc.googlesource.com/src/+/refs/heads/main/common_audio/vad/)
- [ALSA Documentation](https://www.alsa-project.org/wiki/Main_Page)

### Model Downloads
- [Whisper Models (Hugging Face)](https://huggingface.co/ggerganov/whisper.cpp)
- [Porcupine Console](https://console.picovoice.ai/)

### Related Projects
- [Home Assistant Year of Voice](https://www.home-assistant.io/voice_control/)
- [Rhasspy](https://rhasspy.readthedocs.io/) - Open-source voice assistant
- [Mycroft AI](https://mycroft.ai/) - Open-source voice assistant

---

## Changelog

### 2025-10-11 - Initial Architecture
- Defined separate voice-gateway service
- Selected Porcupine + Whisper.cpp + WebRTC VAD
- Designed MQTT contract
- TTS deferred to future work
- Documented hardware: LANDIBO GSH23 mic @ hw:2,0

---

**Questions or feedback?** See [docs/questions.md](./questions.md)
