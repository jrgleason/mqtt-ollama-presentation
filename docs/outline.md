# CodeMash 2026 Presentation Outline (Lean)
## MQTT + Ollama = Building Home Automation That Actually Works (And Doesn't Spy on You)

Date: January 12, 2026 • Duration: 60 minutes • Format: Live demo + architecture + Q&A

---

## 0) Opening: Problem & Promise (3 min)
- Cloud assistants fail when the internet hiccups; privacy tradeoffs everywhere
- Promise: Local AI + MQTT → fast, private, reliable smart home

## 1) Architecture Overview (5 min)
- Components: Oracle (Next.js), Ollama (local LLM), HiveMQ, zwave-js-ui, Voice Gateway (OpenWakeWord + Whisper via Ollama + Piper)
- Flows at a glance: text and voice; MQTT as the integration fabric
- Note: Direct MQTT integration from the app (MCP server approach archived)

## 2) Live Demo (10 min)
- Text: "Turn on living room light" → MQTT → device
- Status query and a simple scene

## 3) Code Walkthrough (15 min)
- LangChain agent + tools (device list/control via SQLite + MQTT)
- MQTT client reliability (singleton, reconnect, QoS 1)
- Data models (SQLite with direct queries)

## 4) MQTT Integration Patterns (10 min)
- Topic conventions (voice/req, voice/res, voice/status; zwave-js-ui topics)
- Command vs state topics; idempotency and retries

## 5) Voice Command Demo (5 min)
- Wake word: OpenWakeWord → record + VAD → Whisper via Ollama → response → Piper TTS
- Back-pressure: disable wake word during record/transcribe/speak

## 6) Q&A (12 min)

---

## Stack & Requirements (short)
- LLM: llama3.2:1b (Pi) or llama3.2:3b/mistral (desktop)
- STT: Whisper via Ollama (local)
- Wake Word: OpenWakeWord ("Hey Jarvis")
- TTS: Piper (offline)
- Broker: HiveMQ CE at 10.0.0.58:31883 (demo mode)
- Z-Wave: zwave-js-ui (MQTT gateway enabled)

## Backup Plans
- Pre-pulled models; local broker; mock devices if needed
- Scripted MQTT messages if AI misbehaves
- Recorded video of end-to-end demo

## Key Takeaways
- Local AI is practical today; privacy and reliability improve
- MQTT + LangChain tools provide a clean integration surface
- Offline voice is feasible with OpenWakeWord + Whisper + Piper
