# Voice Gateway Architecture (Concise)

Last Updated: 2025-10-12

## Overview

The `voice-gateway-oww` is a small Node.js service that adds offline, Alexa‑style voice commands to the MQTT + Ollama system. It runs alongside the Oracle Next.js app and communicates via MQTT. Current stack:
- Wake word: OpenWakeWord (model: "Hey Jarvis")
- STT: Whisper via Ollama HTTP API (local)
- TTS: Piper (local)
- Transport: MQTT (HiveMQ at 10.0.0.58:31883)
- Audio: ALSA 16kHz mono (USB mic/speaker)

Why a separate service?
- Real‑time audio needs a dedicated, always‑on process
- Keeps Next.js HTTP/WebSocket separate from mic/speaker loops
- Deployable on a different device (e.g., Raspberry Pi)

---

## Data Flow (Happy Path)

1) Wake word detected by OpenWakeWord → enter recording
2) Recorder buffers PCM while simple RMS‑based VAD detects trailing silence
3) On stop: audio → WAV → Ollama Whisper → transcription text
4) Publish `{ transcription, session_id }` to `voice/req`
5) Oracle subscribes, generates response → publishes to `voice/res`
6) Voice gateway synthesizes with Piper → plays audio
7) Status transitions: listening → recording → transcribing → speaking → idle

---

## MQTT Contract

- Publish: `voice/req`
  {
    "transcription": "turn on the living room lights",
    "timestamp": "2025-10-11T15:30:00Z",
    "session_id": "550e8400-e29b-41d4-a716-446655440000"
  }

- Publish: `voice/status`
  {
    "state": "listening" | "recording" | "transcribing" | "speaking" | "idle" | "error",
    "wake_word_active": true,
    "error": "optional"
  }

- Subscribe: `voice/res`
  {
    "response": "Turning on the living room lights now.",
    "session_id": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2025-10-11T15:30:02Z"
  }

---

## Configuration (env)

Required
- MQTT_BROKER_URL=mqtt://10.0.0.58:31883
- OLLAMA_BASE_URL=http://localhost:11434

Common (defaults shown)
- OWW_MODEL_PATH=models/hey_jarvis_v0.1.onnx
- OWW_THRESHOLD=0.5
- MIC_DEVICE=plughw:2,0
- SPEAKER_DEVICE=plughw:2,0
- SAMPLE_RATE=16000
- SILENCE_THRESHOLD=0.001
- SILENCE_DURATION_MS=1000
- OLLAMA_WHISPER_MODEL=whisper:latest
- TTS_ENABLED=true
- TTS_MODEL_PATH=models/piper/en_US-amy-medium.onnx
- TTS_VOLUME=1.0
- TTS_SPEED=1.0
- MQTT_CLIENT_ID=voice-gateway-oww
- LOG_LEVEL=info

---

## Error Handling & Resilience

- Wake word loop: catch OpenWakeWord errors, log, restart; backoff after consecutive failures
- STT failures: log, optional error beep, publish `{state: "idle"}`, resume listening
- MQTT disconnects: auto‑reconnect with backoff; queue up to 10 requests
- Back‑pressure: disable wake word while recording/transcribing/speaking; re‑enable only when idle

---

## Health & Logging

- Health: `GET /health` → { status, wake_word_active, uptime, counts, mqtt_connected }
- Logs: structured JSON with `timestamp`, `level`, `component`, `message`, `metadata`

---

## Deployment Notes

- Docker: Node 20 + ALSA libs, mount `/dev/snd`, run `npm ci --production`, optional model download in build
- Pi 5: Prefer active cooling; set ALSA devices via env
- Audio test: `arecord -D plughw:2,0 -f S16_LE -r 16000 -d 3 test.wav && aplay test.wav`

---

## Known Limitations / Next Up

- Limited VAD: RMS energy only (works well enough for demo); consider RNNoise later
- Single language (EN), single wake word
- No streaming partial STT yet (full utterance after silence)

---

## Reference Links

- OpenWakeWord: https://github.com/dscripka/openWakeWord
- Ollama: https://ollama.com (pull `whisper` model)
- Piper TTS: https://github.com/rhasspy/piper
- Z-Wave JS UI (for devices via MQTT): https://github.com/zwave-js/zwave-js-ui
