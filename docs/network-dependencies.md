# Network Dependencies (Condensed)

This project demonstrates **local-first architecture** with optional cloud services. Internet is only needed for initial downloads and optional cloud features (Auth0, Ollama Cloud).

Last Updated: 2025-10-19

---

## Required (one-time) before demo

**For Local-Only Demo:**
- Ollama local models: `ollama pull qwen2.5:0.5b` (voice) / `qwen2.5:3b` (oracle)
- Whisper model: Download `ggml-tiny.bin` or `ggml-base.bin`
- NPM packages: `npm install` (cached in node_modules)
- Optional containers: `docker pull` images if using Docker

After pre-pulls, the demo runs fully local.

**For Cloud Model Demo (Optional):**
- NO downloads required! Cloud models use `:cloud` suffix (e.g., `qwen3-coder:480b-cloud`)
- Internet connection required during demo

---

## Runtime Dependencies

### Local-Only Mode (No Internet)

- **MQTT Broker:** HiveMQ CE at `mqtt://10.0.0.58:31883`
- **Ollama API (local models):** `http://localhost:11434` (or Pi IP)
- **Z-Wave:** zwave-js-ui (local UI + MQTT gateway)
- **Voice Gateway:** OpenWakeWord + Whisper + Piper (all local)

### Cloud-Enhanced Mode (Internet Required)

- **Ollama Cloud Models:** Use `:cloud` suffix models for cloud inference
  - Example: `OLLAMA_MODEL=qwen3-coder:480b-cloud`
  - Requires internet during runtime
  - Offloads compute to Ollama's cloud infrastructure
  - No local download/storage required

---

## Optional Cloud Services

### Auth0 (Authentication)

- Auth: Auth0 is recommended but optional and currently deferred for the live demo.
  - If enabled: requires internet during auth flows (authorize, token exchange, JWKS). See quickstart for env.
  - If disabled: run fully local/offline for demo; remove/skip auth middleware.

### Ollama Cloud Models (AI Inference)

- **Purpose:** Demonstrate performance improvement by offloading to cloud
- **When to use:** Show local → cloud progression in presentation
- **Trade-offs:**
  - ✅ Better performance (sub-second inference)
  - ✅ Larger models (120B+ parameters)
  - ✅ No disk space required
  - ❌ Internet dependency
  - ❌ Privacy concerns (queries leave local network)
  - ❌ Potential usage costs

---

## Demo Environment Options

### Option 1: Full Local (Recommended Default)
- No internet required at runtime
- MQTT, Ollama (local models), Z-Wave, Voice all local
- Best for privacy-focused demo
- Reliable even without network

### Option 2: Local + Auth0
- Internet required for login only
- Keep a pre-authenticated session as backup
- Have mobile hotspot ready

### Option 3: Local → Cloud Progression (Recommended for Presentation)
- **Part 1:** Start with local models (`qwen2.5:0.5b`)
  - Show privacy benefits, offline capability
  - Demonstrate reasonable performance
- **Part 2:** Switch to cloud models (`qwen3-coder:480b-cloud`)
  - Show performance improvement
  - Discuss trade-offs (privacy vs performance)
  - Highlight Ollama's flexibility

### Emergency Offline
- Disable auth entirely
- Use only local models
- Proceed with full local stack

---

## Summary Table

| Service | Network Type | Required During Demo? | Notes |
|---------|--------------|-----------------------|-------|
| **One-Time Setup (before demo)** | | | |
| Ollama local model pulls | Internet | No (pre-download) | `ollama pull qwen2.5:0.5b` |
| npm install | Internet | No (pre-install) | Cached in node_modules |
| Whisper models | Internet | No (pre-download) | Download ggml-*.bin files |
| Docker images | Internet | No (pre-pull) | Cached locally |
| GitHub | Internet | No | Code cloned ahead of time |
| OpenWakeWord models | Internet | No (pre-download) | Store ONNX under models/ |
| **Runtime (Local Mode)** | | | |
| MQTT Broker (HiveMQ) | Local network | Yes | Local TCP/WebSocket at 10.0.0.58:31883 |
| Ollama API (local models) | Local | Yes | Local HTTP at localhost:11434 |
| zwave-js-ui | Local | Yes | Local UI + MQTT gateway |
| Voice Gateway (OWW) | Local | Yes | Wake word, STT, TTS all local |
| **Optional Runtime (Cloud Mode)** | | | |
| Auth0 (optional) | Internet | No (Deferred) | Required only if showing login |
| Ollama Cloud Models | Internet | No (Optional) | For performance comparison demo |

---

## Pre-Demo Checklist

### For Local-Only Demo
- [ ] `ollama list` → models present (qwen2.5:0.5b, qwen2.5:1.5b, etc.)
- [ ] MQTT reachable at 10.0.0.58:31883 (`mosquitto_sub -h 10.0.0.58 -p 31883 -t '#'`)
- [ ] Ollama reachable at http://localhost:11434 (`curl http://localhost:11434/api/tags`)
- [ ] zwave-js-ui up on Pi, MQTT gateway enabled
- [ ] Whisper models downloaded (`ls models/ggml-*.bin`)
- [ ] Voice gateway service running (`systemctl status voice-gateway-oww.service`)
- [ ] Test local query: "Hey Jarvis, what time is it?"

### For Cloud Model Demo (Additional)
- [ ] Internet connection verified and stable
- [ ] Test cloud model: `curl -X POST http://localhost:11434/api/chat -d '{"model":"qwen3-coder:480b-cloud","messages":[{"role":"user","content":"test"}],"stream":false}'`
- [ ] Have backup plan if internet fails (switch back to local model)
- [ ] Know how to switch models quickly (see CLAUDE.md)

### Optional: Auth0
- [ ] Auth0 env configured (if showing auth)
- [ ] Pre-authenticated session ready as backup

---

## Notes

- **Design:** Local-first architecture with optional cloud enhancement
- **Voice:** Wake word, STT, and TTS are fully offline after one-time downloads
- **Presentation Strategy:** Start local (privacy) → Optional cloud (performance)
- **Flexibility:** Ollama makes it trivial to switch between local and cloud models
- **Production Guidance:** Use local for sensitive data, cloud for public-facing features
- See also: voice-gateway-architecture.md, CLAUDE.md (Ollama Model Recommendations)
