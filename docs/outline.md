# CodeMash 2026 Presentation Outline (Lean)

## MQTT + Ollama = Building Home Automation That Actually Works (And Doesn't Spy on You)

Date: January 12, 2026 • Duration: 60 minutes • Format: Live demo + architecture + Q&A

---

## 0) Opening: Problem & Promise (3 min)

- Cloud assistants fail when the internet hiccups; privacy tradeoffs everywhere
- Promise: Local AI + MQTT → fast, private, reliable smart home

## 1) Architecture Overview (5 min)

- Components: Oracle (Next.js), Ollama (local LLM), HiveMQ, zwave-js-ui, Voice Gateway (OpenWakeWord + Whisper via
  Ollama + Piper)
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

## 5) Voice Command Demo & ASR Technologies (8 min)

### Current Implementation (5 min)
- Wake word: OpenWakeWord → record + VAD → Whisper.cpp → Ollama → ElevenLabs TTS
- Back-pressure: disable wake word during record/transcribe/speak
- Traditional pipeline: ASR (Whisper) → LLM (Ollama) → TTS (ElevenLabs/Piper)

### Technology Choices & Tradeoffs (3 min)
- **ASR Options:** Whisper.cpp (free, offline) vs cloud APIs
- **TTS Options:**
  - Piper: Free, offline, robotic voice
  - ElevenLabs: $5-30/mo, realistic human voices
- **Why this stack:** Pi 5 compatible, mostly offline, cost-effective
- **Next-gen option:** Ultravox (multimodal voice LLM)
  - Combines ASR + LLM in one model (~150ms TTFT)
  - Better conversation quality, preserves audio nuance
  - Requires robust hardware (GPU, 24GB+ VRAM)
  - For those with budget: ~$2000+ GPU server vs $100 Pi 5

## 6) Q&A (12 min)

---

## Stack & Requirements (short)

### Current Demo Stack (Raspberry Pi 5)
- **LLM:** qwen2.5:0.5b (voice optimized) or qwen2.5:3b (Oracle app)
- **ASR:** Whisper.cpp tiny model (~1.5s transcription, offline)
- **Wake Word:** OpenWakeWord ("Hey Jarvis", offline)
- **TTS:** ElevenLabs (realistic voices, $5-30/mo) with Piper fallback (offline, free)
- **Broker:** HiveMQ CE at localhost:1883 (demo mode)
- **Z-Wave:** zwave-js-ui (MQTT gateway enabled)
- **Total Latency:** 6-8s end-to-end (wake word → audio response)

### Alternative: Next-Gen Voice (GPU Required)
- **Multimodal LLM:** Ultravox 8B (combines ASR + LLM, ~150ms TTFT)
- **Hardware:** GPU with 24GB+ VRAM (RTX 3090, A100)
- **Cost:** ~$2000+ hardware vs $100 Pi 5
- **Benefit:** Better conversation quality, lower latency (3-5s total)
- **Can Run Offline:** Yes (self-hosted), or use Ultravox.ai API

## Backup Plans

- Pre-pulled models; local broker; mock devices if needed
- Scripted MQTT messages if AI misbehaves
- Recorded video of end-to-end demo

## Key Takeaways

- Local AI is practical today; privacy and reliability improve
- MQTT + LangChain tools provide a clean integration surface
- Voice AI stack choices depend on budget and quality needs:
  - **Budget ($100):** Pi 5 + free tools (Whisper, Piper) - fully offline capable
  - **Realistic ($100 + $5/mo):** Pi 5 + ElevenLabs - engaging demos
  - **Premium ($2000+):** GPU + Ultravox - best conversation quality
- Traditional ASR pipeline (Whisper → LLM → TTS) works great on edge devices
- Next-gen multimodal voice LLMs (Ultravox) offer better quality but need robust hardware
