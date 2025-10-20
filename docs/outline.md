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

## 6) Local vs Cloud Models: The Flexibility Advantage (8 min)

**Part 1: Local Model (Privacy-First)** (3 min)
- Demo with `qwen2.5:0.5b` local model
- Voice query: "Hey Jarvis, what time is it?"
- Show response (~7 seconds total pipeline)
- Highlight: "Everything local - no internet, full privacy, works offline"

**Part 2: Show Limitation** (2 min)
- Ask complex question: "Explain quantum computing in simple terms"
- Local model gives simplified/basic answer
- Point out: "Small models have accuracy limits for complex reasoning"

**Part 3: Switch to Cloud Model** (3 min)
- Stop service, change `OLLAMA_MODEL=qwen3-coder:480b-cloud`
- Restart service (`systemctl restart voice-gateway-oww.service`)
- Ask same complex question
- Show improved response quality
- Highlight: "Same code, just changed environment variable"

**Key Discussion Points:**
- Ollama makes local ⇄ cloud switching trivial
- Start with privacy (local), add performance when needed (cloud)
- Production pattern: Local for sensitive data, cloud for public features
- No vendor lock-in - same API, your choice of deployment

## 7) Q&A (9 min)

---

## Stack & Requirements (short)

**Local Models (Default):**
- LLM: `qwen2.5:0.5b` (voice, Pi) or `qwen2.5:3b` (oracle)
- STT: Whisper via whisper.cpp (`ggml-tiny.bin`)
- Wake Word: OpenWakeWord ("Hey Jarvis")
- TTS: Piper (offline)
- Broker: HiveMQ CE at 10.0.0.58:31883 (demo mode)
- Z-Wave: zwave-js-ui (MQTT gateway enabled)

**Cloud Models (Optional Demo):**
- LLM: `qwen3-coder:480b-cloud` or `gpt-oss:120b-cloud` (requires internet)
- Same infrastructure, just different `OLLAMA_MODEL` env var

## Backup Plans
- Pre-pulled local models; cloud models available if internet works
- Local broker; mock devices if needed
- Scripted MQTT messages if AI misbehaves
- Recorded video of end-to-end demo
- **Cloud model fallback:** If internet fails, instantly switch back to local model

## Key Takeaways
- Local AI is practical today; privacy and reliability improve
- MQTT + LangChain tools provide a clean integration surface
- Offline voice is feasible with OpenWakeWord + Whisper + Piper
- **Ollama's flexibility:** Same code runs local or cloud models - your choice based on needs
- **Hybrid approach:** Start local (privacy), add cloud selectively (performance)
