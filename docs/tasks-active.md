# Active Implementation Tasks (Condensed)

Status Legend:
- ⏳ Not Started • 🔄 In Progress • 🔴 DEMO CRITICAL • 🎯 Stretch Goal

Last Updated: 2025-10-12

See `delivered.md` for completed work.

---

## Current Sprint Focus

Goal: Ship end-to-end device control via LangChain tools + MQTT, and stabilize Offline Voice Gateway.

Next Up (DEMO CRITICAL):
1) Update LangChain tools to use Prisma (device list/control)
2) Implement MQTT client + end-to-end device control
3) Stabilize Voice Gateway state machine (wake word → record → transcribe → speak → idle)
4) Integrate Piper TTS playback

---

## Phase 2: AI Chatbot Implementation

- 🔄 Re-enable tools with selective calling (ensure normal chat avoids tools)
- 🔄 Device list/control tools → switch from mocks to Prisma
- 🔄 MQTT client singleton with reconnect + QoS 1 for commands

---

## Phase 3: MQTT Integration

- 🔄 Connect to HiveMQ at `mqtt://10.0.0.58:31883`
- 🔄 Topic utilities and publish helpers
- ⏳ Subscribe to device state topics and update DB (optional for demo)

---

## Phase 4: Z-Wave Integration

- ⏳ Setup zwave-js-ui on Pi, pair test devices
- ⏳ Verify MQTT topics and control loop

---

## Phase 5: Voice Integration (Current)

Architecture: Separate `voice-gateway-oww` service. Offline stack = OpenWakeWord (wake word) + Whisper via Ollama (STT) + Piper (TTS).

### 5.1 Voice Gateway Stability (🔴)
- 🔄 Fix “stuck on transcribing” edge case:
  - Ensure transcription promise resolves/rejects with timeout (e.g., 10s)
  - On failure: publish `{state: "idle"}`, re-enable wake word
- 🔄 Ensure wake word is re-enabled after transcribing and after speaking
- 🔄 Add state guard to ignore duplicate transitions; log state changes

### 5.2 Recording + VAD (🔄)
- 🔄 RMS VAD thresholds: `SILENCE_THRESHOLD`, `SILENCE_DURATION_MS`
- ⏳ Optional: cap max utterance (safety)

### 5.3 STT via Ollama Whisper (🔄)
- 🔄 Convert PCM → WAV → POST to Ollama (`whisper:latest`)
- 🔄 Add request timeout + retries (backoff)

### 5.4 MQTT Contract (✅)
- ✅ Publish `voice/req`, `voice/status`; subscribe `voice/res`
- 🔄 Filter `voice/res` by `session_id`

### 5.5 TTS via Piper (🔴)
- 🔄 Add Markdown→speech preprocessor (simple: code spelled out, light pauses)
- 🔄 Synthesize with Piper → 16k PCM
- 🔄 Play via ALSA; volume/speed via env (`TTS_VOLUME`, `TTS_SPEED`)

### 5.6 Health & Logging (🔄)
- 🔄 `GET /health` with state, uptime, counts, MQTT connectivity
- 🔄 Structured logs with component + state transitions

---

## Deprecated: Previous Voice Plan (Do Not Implement)

The following tasks were superseded by the current offline stack and are kept for historical reference only:
- Porcupine (Picovoice) wake word + API key validation
- WebRTC VAD C++ bindings
- whisper.cpp build + direct bindings and model downloads
- Text-only responses (no TTS)

All corresponding subsections (5.2, 5.3, 5.4 old content) are deprecated; see Voice Integration (Current) above.

---

## Phase 8: Presentation (Summary)

- ⏳ Slide deck with architecture + code highlights
- ⏳ Live demo script + fallback (scripted MQTT, recorded video)
- ⏳ Hardware checklist (Pi, mic, Z-Wave devices)

---

## Progress Snapshot

- Phase 0: Infrastructure — partial
- Phase 1: Project Setup — mostly complete
- Phase 2: AI Chatbot — core API + streaming done; tools need DB wiring
- Phase 3: MQTT — broker up; client wiring in progress
- Phase 4: Z-Wave — pending
- Phase 5: Voice — core path implemented; stability + TTS integration pending

---

## Immediate Action Items (This Week)

1) Device tools → Prisma + MQTT command publish
2) Voice Gateway: add STT timeout + always re-enable wake word
3) Piper TTS playback path
4) End-to-end demo pass (text + voice)
