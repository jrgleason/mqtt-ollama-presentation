# Network Dependencies (Condensed)

This project runs primarily on a local network. Internet is only needed for initial downloads, optional Auth0 auth, and ElevenLabs TTS.

Last Updated: 2025-10-22

---

## Required (one-time) before demo

- Ollama models: `ollama pull llama3.2:1b` (Pi) / `llama3.2:3b` or `mistral`, and `ollama pull whisper`
- NPM packages: `npm install` (cached in node_modules)
- Optional containers: `docker pull` images if using Docker

After pre-pulls, the demo runs fully local.

---

## Local-only at runtime (no internet)

- MQTT Broker: HiveMQ CE at `mqtt://localhost:1883`
- Ollama API: `http://localhost:11434` (or Pi IP)
- Z-Wave: zwave-js-ui (local UI + MQTT gateway)
- Voice Gateway: OpenWakeWord + Whisper via Ollama

## Cloud Services at runtime (requires internet)

- **ElevenLabs TTS**: Real-time text-to-speech API
    - Required for voice responses during demo
    - API endpoint: `https://api.elevenlabs.io`
    - Fallback: Disable TTS (`TTS_ENABLED=false`) to continue without voice output
    - Mitigation: Pre-cache common responses (future enhancement)

---

## Optional Cloud (Auth0)

- Auth: Auth0 is recommended but optional and currently deferred for the live demo.
    - If enabled: requires internet during auth flows (authorize, token exchange, JWKS). See quickstart for env.
    - If disabled: run fully local/offline for demo; remove/skip auth middleware.

---

## Demo Environment Options

- Primary plan (requires internet for TTS):
    - Internet required for ElevenLabs TTS voice responses
    - MQTT, Ollama, Z-Wave, Wake Word, STT all local
    - Auth disabled by default

- If demonstrating Auth0 (optional):
    - Internet required for login and TTS
    - Keep a pre-authenticated session as backup; have hotspot ready

- Emergency offline (if internet fails):
    - Disable TTS (`TTS_ENABLED=false`) - text responses only
    - Disable auth entirely; proceed with full local stack minus voice output

---

## Summary Table

| Service              | Network Type | Required During Demo?    | Notes                                     |
|----------------------|--------------|--------------------------|-------------------------------------------|
| **ElevenLabs TTS**   | **Internet** | **Yes (for voice)**      | Real-time API calls; fallback: disable TTS |
| Auth0 (optional)     | Internet     | No (Deferred by default) | Required only if you choose to show login |
| Ollama model pulls   | Internet     | No (pre-download)        | Pre-pull models; cached locally           |
| npm install          | Internet     | No (pre-install)         | Cached in node_modules                    |
| OpenWakeWord model   | Local file   | No                       | Store ONNX under models/                  |
| MQTT Broker (HiveMQ) | Local        | Yes                      | Local TCP/WebSocket                       |
| Ollama API (runtime) | Local        | Yes                      | Local HTTP                                |
| zwave-js-ui          | Local        | Yes                      | Local UI + MQTT gateway                   |
| Docker images        | Internet     | No (pre-pull)            | Cached locally                            |
| GitHub               | Internet     | No                       | Code cloned ahead of time                 |

---

## Pre-Demo Checklist (short)

- ollama list → models present (llama3.2 and whisper)
- MQTT reachable at localhost:1883
- Ollama reachable at http://localhost:11434
- zwave-js-ui up on Pi, MQTT gateway enabled
- **Internet connection active** (for ElevenLabs TTS)
- **ElevenLabs API key configured** in `.env`
- **ffmpeg installed** (`brew install ffmpeg` or `apt-get install ffmpeg`)
- Optional: Auth0 env configured (if showing auth)

---

## Notes

- Design: local-first for processing; cloud-based for high-quality TTS
- Voice pipeline:
    - Wake word detection: Fully offline (OpenWakeWord)
    - Speech-to-text: Fully offline (Whisper via Ollama)
    - AI processing: Fully offline (Ollama)
    - Text-to-speech: **Cloud-based (ElevenLabs API)**
- Trade-off: High-quality TTS requires internet, but fallback to text-only mode available
- See also: voice-gateway-architecture.md
