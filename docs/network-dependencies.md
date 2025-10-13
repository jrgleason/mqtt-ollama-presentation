# Network Dependencies (Condensed)

This project runs primarily on a local network. Internet is only needed for initial downloads and optional Auth0 auth.

Last Updated: 2025-10-12

---

## Required (one-time) before demo

- Ollama models: `ollama pull llama3.2:1b` (Pi) / `llama3.2:3b` or `mistral`, and `ollama pull whisper`
- NPM packages: `npm install` (cached in node_modules)
- Optional containers: `docker pull` images if using Docker

After pre-pulls, the demo runs fully local.

---

## Local-only at runtime (no internet)

- MQTT Broker: HiveMQ CE at `mqtt://10.0.0.58:31883`
- Ollama API: `http://localhost:11434` (or Pi IP)
- Z-Wave: zwave-js-ui (local UI + MQTT gateway)
- Voice Gateway: OpenWakeWord + Whisper via Ollama + Piper

---

## Optional Cloud (Auth0)

- Auth: Auth0 is recommended but optional and currently deferred for the live demo.
  - If enabled: requires internet during auth flows (authorize, token exchange, JWKS). See quickstart for env.
  - If disabled: run fully local/offline for demo; remove/skip auth middleware.

---

## Demo Environment Options

- Primary plan (local-first):
  - No internet required at runtime (auth disabled)
  - MQTT, Ollama, Z-Wave, Voice all local

- If demonstrating Auth0 (optional):
  - Internet required for login
  - Keep a pre-authenticated session as backup; have hotspot ready

- Emergency offline:
  - Disable auth entirely; proceed with full local stack

---

## Summary Table

| Service | Network Type | Required During Demo? | Notes |
|---------|--------------|-----------------------|-------|
| Auth0 (optional) | Internet | No (Deferred by default) | Required only if you choose to show login |
| Ollama model pulls | Internet | No (pre-download) | Pre-pull models; cached locally |
| npm install | Internet | No (pre-install) | Cached in node_modules |
| OpenWakeWord model | Local file | No | Store ONNX under models/ |
| MQTT Broker (HiveMQ) | Local | Yes | Local TCP/WebSocket |
| Ollama API (runtime) | Local | Yes | Local HTTP |
| zwave-js-ui | Local | Yes | Local UI + MQTT gateway |
| Docker images | Internet | No (pre-pull) | Cached locally |
| GitHub | Internet | No | Code cloned ahead of time |

---

## Pre-Demo Checklist (short)

- ollama list → models present (llama3.2 and whisper)
- MQTT reachable at 10.0.0.58:31883
- Ollama reachable at http://localhost:11434
- zwave-js-ui up on Pi, MQTT gateway enabled
- Optional: Auth0 env configured (if showing auth)

---

## Notes

- Design: local-first; zero cloud calls at runtime unless Auth0 is intentionally enabled
- Voice: both wake word and STT/TTS are fully offline after one-time downloads
- See also: voice-gateway-architecture.md
