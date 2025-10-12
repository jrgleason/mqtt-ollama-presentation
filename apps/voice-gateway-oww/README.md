# Voice Gateway with OpenWakeWord

Offline voice command gateway for MQTT + Ollama home automation using OpenWakeWord for wake word detection.

## Features

- **Wake Word Detection:** Using OpenWakeWord (open-source, no API key required)
- **Voice Activity Detection:** WebRTC VAD with trailing silence detection
- **Speech-to-Text:** Local Whisper.cpp (base model)
- **MQTT Integration:** Communicates with Oracle chatbot
- **Offline Operation:** All processing happens locally
- **No Cloud Dependencies:** Completely free and open-source wake word detection

## Why OpenWakeWord?

Unlike Picovoice Porcupine which requires an API key, OpenWakeWord is:
- ✅ Completely free and open-source
- ✅ No API key or registration required
- ✅ Runs entirely offline
- ✅ Customizable wake words with pre-trained models
- ✅ Lower resource usage on Raspberry Pi

## Hardware Requirements

- **Raspberry Pi 5** (16GB RAM recommended, 8GB minimum)
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
- Download OpenWakeWord core models (melspectrogram, embedding)
- Download wake word models (hey_jarvis, alexa, hey_mycroft)
- Download Whisper base model (~141MB)
- Check for ALSA audio devices (Linux only)

**Note:** The ALSA check will fail on macOS - this is expected and can be ignored.

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` if needed (works with defaults):
```env
# OpenWakeWord settings
OWW_MODEL_PATH=models/hey_jarvis_v0.1.onnx
OWW_THRESHOLD=0.5

# Audio settings
AUDIO_MIC_DEVICE=hw:2,0
AUDIO_SAMPLE_RATE=16000

# MQTT settings
MQTT_BROKER_URL=mqtt://10.0.0.58:31883
```

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
npm start
```

## Architecture

```
USB Mic (hw:2,0)
    ↓
OpenWakeWord ("Hey Jarvis" / "Alexa")
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

## Available Wake Words

OpenWakeWord includes several pre-trained models:

1. **hey_jarvis** (Recommended) - "Hey Jarvis"
2. **alexa** - "Alexa"
3. **hey_mycroft** - "Hey Mycroft"
4. **timer** - "Timer"
5. **weather** - "Weather"

Custom wake words can be trained using the OpenWakeWord toolkit.

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
- `OWW_MODEL_PATH` - Path to OpenWakeWord ONNX model (default: models/hey_jarvis_v0.1.onnx)
- `OWW_THRESHOLD` - Detection threshold 0-1 (default: 0.5, lower = more sensitive)
- `AUDIO_MIC_DEVICE` - ALSA device (default: hw:2,0)
- `MQTT_BROKER_URL` - MQTT broker (default: mqtt://10.0.0.58:31883)
- `VAD_TRAILING_SILENCE_MS` - Silence before stopping (default: 1500ms)
- `VAD_MAX_UTTERANCE_MS` - Max recording time (default: 10000ms)

## Troubleshooting

### Wake word not detecting

1. Check microphone: `arecord -l`
2. Test recording: `arecord -D hw:2,0 -f S16_LE -r 16000 -c 1 -d 3 test.wav`
3. Adjust threshold: `OWW_THRESHOLD=0.3` in `.env` (lower = more sensitive)
4. Try different model: Download alternative wake word model
5. Check logs: `npm run dev` (verbose output with debug scores)

### STT transcription errors

1. Verify model downloaded: `ls -lh models/ggml-base.bin`
2. Check audio quality: Play back recorded WAV
3. Increase max utterance: `VAD_MAX_UTTERANCE_MS=15000`

### MQTT connection issues

1. Test broker: `mosquitto_sub -h 10.0.0.58 -p 31883 -t 'voice/#'`
2. Check firewall rules
3. Verify Oracle is subscribed to `voice/req`

### Performance issues on Raspberry Pi

1. Use smaller wake word model (hey_jarvis is lightweight)
2. Reduce threshold for faster detection
3. Monitor CPU usage: `top`
4. Consider overclocking Pi 5 for better performance

## Comparison: OpenWakeWord vs Picovoice Porcupine

| Feature | OpenWakeWord | Picovoice Porcupine |
|---------|--------------|---------------------|
| **Cost** | Free | Free tier (limited) |
| **API Key** | Not required | Required |
| **Offline** | Yes | Yes |
| **Custom Wake Words** | Yes (train your own) | Yes (paid tier) |
| **Pre-trained Models** | Multiple free models | Limited free models |
| **Resource Usage** | Low | Low-Medium |
| **Accuracy** | Good | Excellent |
| **License** | Apache 2.0 | Proprietary |

## Development

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Linting
npm run lint
```

## Project Structure

```
voice-gateway-oww/
├── src/
│   ├── main.js          # Entry point with OpenWakeWord
│   ├── config.js        # Environment configuration
│   └── logger.js        # Structured logging
├── scripts/
│   └── setup.js         # Model download script
├── models/              # Downloaded models (gitignored)
│   ├── hey_jarvis_v0.1.onnx
│   └── ggml-base.bin
├── tests/               # Unit tests
├── .env.example         # Environment template
└── package.json
```

## Documentation

- **Architecture:** [docs/voice-gateway-architecture.md](../../docs/voice-gateway-architecture.md)
- **ALSA Setup:** [docs/alsa-setup.md](../../docs/alsa-setup.md)
- **OpenWakeWord:** https://github.com/dscripka/openWakeWord
- **Network Dependencies:** [docs/network-dependencies.md](../../docs/network-dependencies.md)

## Model Downloads

OpenWakeWord models are downloaded automatically by the setup script, or manually:

```bash
# Download hey_jarvis model
curl -L -o models/hey_jarvis_v0.1.onnx \
  https://github.com/dscripka/openWakeWord/releases/download/v0.1.1/hey_jarvis_v0.1.onnx

# Download alexa model
curl -L -o models/alexa_v0.1.onnx \
  https://github.com/dscripka/openWakeWord/releases/download/v0.1.1/alexa_v0.1.onnx
```

## License

MIT

## Credits

- **OpenWakeWord:** https://github.com/dscripka/openWakeWord
- **Whisper.cpp:** https://github.com/ggerganov/whisper.cpp
- **ONNX Runtime:** https://onnxruntime.ai/
