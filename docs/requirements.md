# Technical Requirements (Condensed for Demo)

Presentation: CodeMash 2026 • Title: MQTT + Ollama = Building Home Automation That Actually Works (And Doesn't Spy on You)

---

## Scope (What we will show)
- Text and voice control of real devices via MQTT
- Local-only AI pipeline: Ollama LLM + Whisper STT + Piper TTS
- Z-Wave devices via zwave-js-ui MQTT gateway
- Minimal UI in Next.js (Oracle) with LangChain tools calling MQTT

---

## Functional Requirements

- Natural language commands (text) processed locally with Ollama
- Device listing and control via LangChain tools
  - list_devices → Prisma DB
  - control_device → MQTT publish to zwave-js-ui topics
- Voice pipeline (offline): OpenWakeWord → record + VAD → Whisper (Ollama) → reply → Piper TTS
  - Wake word disabled during record/transcribe/speak
  - MQTT topics: voice/req, voice/res, voice/status
- Basic device state reflect
  - Optional: subscribe to zwave-js-ui currentValue topics and update DB state

---

## Non-Functional Requirements

- Latency targets: LLM < 5s; MQTT < 500ms; STT < 2s
- Reliability: MQTT reconnect, QoS 1 for commands, basic retries
- Demo resilience: pre-pulled models, mock path fallback, scripted MQTT backup
- Security (demo mode): broker may run without auth; no cloud dependencies

---

## Current Stack

- App: Next.js, TypeScript (Oracle)
- AI: Ollama (llama3.2:1b/3b, mistral), Whisper (via Ollama)
- Voice: OpenWakeWord (wake word), RMS VAD, Piper (TTS)
- Messaging: MQTT.js, HiveMQ CE (localhost:1883)
- Z-Wave: zwave-js-ui (MQTT gateway)
- Data: Prisma, SQLite (devices, metadata, basic state)

---

## Environment & Hardware

- Dev machine or Pi for Ollama (models pre-pulled)
- Raspberry Pi with zwave-js-ui and Z-Wave USB stick (Aeotec Z-Stick 7/Zooz ZST10)
- 1–2 Z-Wave lights/switches for demo
- USB microphone and speaker output for voice

---

## Deferred (Not in demo)

- Full Auth (Auth0). Run local/offline.
- Rich device dashboards and full state history sync
- ESP32 examples
- Kubernetes/Helm productionization

---

## Deprecated (Kept for reference only)

- MCP-based integration path (custom MCP server). We now publish directly to MQTT from the app.
- Previous voice plan: Porcupine (Picovoice), WebRTC VAD C++ bindings, whisper.cpp direct bindings, text-only responses

---

## Acceptance Criteria

- Text: "Turn on living room light" toggles a real device via MQTT
- Voice: Wake → speak → device toggles → assistant replies via TTS
- Demo runs fully offline using local broker and models
- Setup reproducible in < 10 minutes with provided scripts/docs

---

## References
- zwave-js-ui docs (MQTT gateway)
- HiveMQ CE broker (31883)
- Piper + OpenWakeWord quickstart notes
