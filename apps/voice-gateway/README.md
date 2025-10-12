# Voice Gateway

Offline voice command gateway for MQTT + Ollama home automation.

## Features

- **Wake Word Detection:** "Computer" using Porcupine (Picovoice)
- **Voice Activity Detection:** WebRTC VAD with trailing silence detection
- **Speech-to-Text:** Local Whisper.cpp (base model)
- **MQTT Integration:** Communicates with Oracle chatbot
- **Offline Operation:** All processing happens locally

## Hardware Requirements

- **Raspberry Pi 5** (16GB RAM recommended)
- **USB Microphone:** LANDIBO GSH23 (or compatible, 16kHz capable)
- **USB Speaker/DAC:** (Optional, for future TTS)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Download Models & Setup

```bash
npm run setup
```

This will:
- Check for ALSA audio devices
- Download Whisper base model (~74MB)
- Test microphone access

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your Picovoice access key:
```env
PORCUPINE_ACCESS_KEY=your_picovoice_access_key
```

Get a free key at: https://console.picovoice.ai

### 4. Test Audio

```bash
# List audio devices
arecord -l

# Test microphone (3 second recording)
arecord -D hw:2,0 -f S16_LE -r 16000 -c 1 -d 3 test.wav
aplay test.wav
```

### 5. Run Voice Gateway

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm start
```

## Architecture

```
USB Mic (hw:2,0)
    ↓
Porcupine Wake Word ("Computer")
    ↓
Audio Recorder + VAD (1.5s silence)
    ↓
Whisper STT (base model)
    ↓
MQTT (voice/req) → Oracle Chatbot
    ↓
MQTT (voice/res) ← AI Response
    ↓
Console Log (TTS future)
```

## MQTT Topics

**Published:**
- `voice/req` - Voice transcriptions
  ```json
  {
    "transcription": "turn on the living room lights",
    "timestamp": "2025-10-11T15:30:00Z",
    "session_id": "uuid"
  }
  ```

- `voice/status` - Gateway status
  ```json
  {
    "state": "listening" | "recording" | "processing" | "idle" | "error",
    "wake_word_active": true
  }
  ```

**Subscribed:**
- `voice/res` - AI responses
  ```json
  {
    "response": "Turning on the living room lights now.",
    "session_id": "uuid",
    "timestamp": "2025-10-11T15:30:02Z"
  }
  ```

## Configuration

See `.env.example` for all available options.

**Key Settings:**
- `PORCUPINE_ACCESS_KEY` - Required (free tier at picovoice.ai)
- `ALSA_MIC_DEVICE` - Default: `hw:2,0`
- `MQTT_BROKER_URL` - Default: `mqtt://10.0.0.58:31883`
- `VAD_TRAILING_SILENCE_MS` - Default: `1500` (1.5 seconds)
- `VAD_MAX_UTTERANCE_MS` - Default: `10000` (10 seconds)

## Health Check

Voice gateway exposes a health check endpoint on port 3001:

```bash
curl http://localhost:3001/health
```

Response:
```json
{
  "status": "ok",
  "wake_word_active": true,
  "uptime": 3600
}
```

## Troubleshooting

### Wake word not detecting

1. Check microphone: `arecord -l`
2. Test recording: `arecord -D hw:2,0 -f S16_LE -r 16000 -c 1 -d 3 test.wav`
3. Adjust sensitivity: `PORCUPINE_SENSITIVITY=0.7` in `.env`
4. Check logs: `npm run dev` (verbose output)

### STT transcription errors

1. Verify model downloaded: `ls -lh models/ggml-base.bin`
2. Check audio quality: Play back recorded WAV
3. Increase max utterance: `VAD_MAX_UTTERANCE_MS=15000`

### MQTT connection issues

1. Test broker: `mosquitto_sub -h 10.0.0.58 -p 31883 -t 'voice/#'`
2. Check firewall rules
3. Verify Oracle is subscribed to `voice/req`

See [docs/alsa-setup.md](../../docs/alsa-setup.md) for detailed audio troubleshooting.

## Development

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type checking
npm run type-check

# Linting
npm run lint
```

## Project Structure

```
voice-gateway/
├── src/
│   ├── main.ts          # Entry point
│   ├── config.ts        # Environment configuration
│   ├── wakeword.ts      # Porcupine integration
│   ├── recorder.ts      # Audio capture + VAD
│   ├── stt.ts           # Whisper.cpp wrapper
│   ├── mqtt.ts          # MQTT client
│   ├── audio.ts         # ALSA playback (future)
│   ├── health.ts        # Health check server
│   └── logger.ts        # Structured logging
├── scripts/
│   └── setup.js         # Model download script
├── models/              # Downloaded models (gitignored)
├── tests/               # Unit tests
├── .env.example         # Environment template
└── package.json
```

## Documentation

- **Architecture:** [docs/voice-gateway-architecture.md](../../docs/voice-gateway-architecture.md)
- **ALSA Setup:** [docs/alsa-setup.md](../../docs/alsa-setup.md)
- **Network Dependencies:** [docs/network-dependencies.md](../../docs/network-dependencies.md)
- **Task List:** [docs/tasks-active.md](../../docs/tasks-active.md#phase-5-voice-integration-)

## License

MIT
