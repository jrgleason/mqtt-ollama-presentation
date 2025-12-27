# Implementation Tasks

**Last Updated:** 2025-10-22
**Presentation Date:** January 12, 2026

---

## Quick Reference

**Status Legend:**
- ⏳ Not Started
- 🔄 In Progress
- ✅ Completed
- 🔴 DEMO CRITICAL
- 🎯 Stretch Goal
- ❌ Blocked

---

## Current Sprint Focus

**Goal:** Ship end-to-end device control via LangChain tools + MQTT, and stabilize Voice Gateway.

**Demo-Critical Items:**
1. LangChain tools → Prisma + MQTT publish (device control)
2. MQTT client reliability (singleton, reconnect, QoS 1)
3. Voice Gateway stability (OWW → Whisper via Ollama → Piper TTS)
4. Z-Wave pairing + zwave-js-ui MQTT gateway verification

**Immediate Next Steps:**
1. Swap mock tools for Prisma queries + MQTT publishes
2. Add MQTT client (reconnect + QoS 1) and topic helpers
3. Voice Gateway: STT timeout + always re-enable wake word; Piper playback
4. One end-to-end demo pass (text + voice)

---

## Phase 2: AI Chatbot Implementation

### 2.1 Core Chat Functionality
- ✅ Next.js API route with streaming
- ✅ LangChain integration with Ollama
- ✅ Chat UI with message history
- 🔄 Re-enable tools with selective calling (ensure normal chat avoids tools)

### 2.2 Device Control Tools
- 🔴 🔄 Device list tool → switch from mocks to Prisma
- 🔴 🔄 Device control tool → switch from mocks to Prisma + MQTT publish
- ⏳ Device status query tool
- ⏳ Tool parameter validation (Zod schemas)
- ⏳ Error handling for unavailable devices

### 2.3 Database Integration
- ✅ Prisma with SQLite
- ✅ Device schema and seed data
- ✅ Prisma client singleton
- 🔄 Device lookup service
- ⏳ Conversation history storage

---

## Phase 3: MQTT Integration

### 3.1 MQTT Client Setup
- 🔴 🔄 Connect to HiveMQ at `mqtt://localhost:1883`
- 🔴 🔄 MQTT client singleton with reconnect + QoS 1
- 🔴 🔄 Topic utilities and publish helpers
- ⏳ Subscribe to device state topics and update DB (optional for demo)

### 3.2 Device Communication
- ⏳ Publish device commands to `zwave/+/set` topics
- ⏳ Subscribe to device state updates on `zwave/+/status`
- ⏳ Device state synchronization with database
- ⏳ Error handling and retry logic

---

## Phase 4: Z-Wave Integration

### 4.1 zwave-js-ui Setup
- ⏳ Install zwave-js-ui on Raspberry Pi
- ⏳ Configure MQTT gateway (human-readable topics)
- ⏳ Pair test devices (switches, dimmers)
- ⏳ Verify MQTT topics and control loop

### 4.2 Device Registry
- ⏳ Document MQTT topic structure
- ⏳ Map Z-Wave command classes to topics
- ⏳ Test device control end-to-end

---

## Phase 5: Voice Integration

**Architecture:** Separate `voice-gateway-oww` service using offline stack:
- **Wake Word:** OpenWakeWord
- **STT:** Whisper via Ollama
- **TTS:** Piper

### 5.1 Voice Gateway Stability 🔴
- ✅ **Beep Audio Isolation** - Prevent microphone feedback loops (2025-12-26)
  - Suppress beeps during recording state only
  - Preserve wake word interruption during cooldown
  - Comprehensive test coverage (14 test cases)
  - Documentation: `BEEP_ISOLATION.md`
- ✅ **LangChain MCP Auto-Discovery** - Replace custom MCP client with standard LangChain integration (2025-12-27)
  - Use MultiServerMCPClient from @langchain/mcp-adapters
  - Auto-discover Z-Wave tools from MCP server (eliminates duplicate tool definitions)
  - Mixed tool sources: MCP tools (auto-discovered) + local tools (manual registration)
  - Exponential backoff retry logic with graceful degradation
  - Comprehensive test coverage for MCP integration
  - Deleted obsolete files: mcpZWaveClient.js, zwave-control-tool.js
- ✅ **MCP Tool Parameter Schema Fix** - Resolve snake_case to camelCase parameter mismatch (2025-12-27)
  - Fixed schema impedance mismatch between LangChain adapter (snake_case) and MCP server (camelCase)
  - Added parameter normalization layer in ToolRegistry
  - Static mappings for known MCP tools (control_zwave_device, get_device_sensor_data)
  - Heuristic fallback for unmapped tools
  - Comprehensive test coverage (13 test cases)
  - Device control now works: "Turn on switch one" successfully controls devices
- 🔄 Fix "stuck on transcribing" edge case:
  - Ensure transcription promise resolves/rejects with timeout (10s)
  - On failure: publish `{state: "idle"}`, re-enable wake word
- 🔄 Ensure wake word is re-enabled after transcribing and after speaking
- 🔄 Add state guard to ignore duplicate transitions
- 🔄 Log all state changes for debugging

### 5.2 Recording + Voice Activity Detection
- 🔄 RMS VAD thresholds: `SILENCE_THRESHOLD`, `SILENCE_DURATION_MS`
- ⏳ Cap max utterance duration (safety)
- ✅ PCM audio capture working

### 5.3 Speech-to-Text (Whisper via Ollama)
- 🔄 Convert PCM → WAV → POST to Ollama (`whisper:latest`)
- 🔄 Add request timeout + retries with backoff
- ✅ Basic transcription working

### 5.4 MQTT Contract
- ✅ Publish `voice/req` and `voice/status`
- ✅ Subscribe to `voice/res`
- 🔄 Filter `voice/res` by `session_id`
- ✅ Session ID generation

### 5.5 Text-to-Speech (Piper) 🔴
- 🔄 Add Markdown→speech preprocessor
- 🔄 Synthesize with Piper → 16k PCM
- 🔄 Play via ALSA with volume/speed control
- ⏳ Environment variables: `TTS_VOLUME`, `TTS_SPEED`

### 5.6 Health & Monitoring
- 🔄 `GET /health` endpoint with state, uptime, counts, MQTT status
- 🔄 Structured logs with component tags
- 🔄 State transition logging

---

## Phase 8: Presentation Preparation

### 8.1 Slide Deck
- ⏳ Architecture overview slides
- ⏳ Code highlights (LangChain tools, MQTT)
- ⏳ Live demo walkthrough
- ⏳ Dual approach: Custom tools vs MCP architecture

### 8.2 Demo Preparation
- ⏳ Live demo script (text + voice commands)
- ⏳ Fallback options (scripted MQTT, recorded video)
- ⏳ Hardware checklist (Pi, mic, Z-Wave devices)
- ⏳ Practice demo 10+ times

### 8.3 Documentation
- ⏳ Architecture diagrams
- ⏳ Setup instructions
- ⏳ Troubleshooting guide
- ⏳ Source code cleanup

---

## ⚠️ CRITICAL: Testing Requirements

**Status:** 🔴 INCOMPLETE - Zero meaningful tests exist across all apps

### Testing Status by App

#### apps/oracle (Next.js + LangChain + Prisma)
- ✅ Jest configured with `passWithNoTests: true`
- ⚠️ **0 real tests** - Only placeholder exists
- **Coverage: 0%** (Goal: 60%+)
- **CI Status:** ✅ PASSES (but with no real tests)

**Required Tests:**
- [ ] MQTT Client Tests (connection, reconnect, publish, subscribe)
- [ ] LangChain Tools Tests (list devices, control, validation)
- [ ] Device Service Tests (Prisma queries, MQTT formatting)
- [ ] API Route Tests (chat endpoint, streaming)

#### apps/voice-gateway-oww (Wake Word + STT/TTS)
- ✅ Jest configured with ESM support (NODE_OPTIONS="--experimental-vm-modules")
- ✅ **Beep Isolation Tests** - 14 tests covering audio feedback prevention
- **Coverage: ~5%** (beep isolation system fully covered)
- **CI Status:** ✅ PASSES with real tests

**Completed Tests:**
- [x] Beep isolation tests (14 test cases) - Prevents microphone feedback loops
  - Wake word beep suppression during recording
  - Processing/response beep suppression during recording
  - State machine recording flag tracking
  - Wake word interruption during cooldown
  - Complete interaction scenario testing

**Required Tests:**
- [ ] Wake word detection tests
- [ ] STT/TTS integration tests
- [ ] MQTT communication tests
- [ ] XState machine state transition tests
- [ ] Audio processing tests (mocked)

#### apps/voice-gateway-common (Shared Utils)
- ✅ Test script exits with code 0
- ⚠️ **0 tests** - No Jest config
- **Coverage: 0%**

**Required Tests:**
- [ ] Audio utilities tests
- [ ] STT helper tests

#### apps/zwave-mcp-server (MCP Server)
- ⚠️ No test script defined
- ⚠️ **0 tests**
- **Coverage: 0%**

**Required Tests:**
- [ ] MCP tools tests
- [ ] MQTT integration tests
- [ ] Device registry tests

---

## Deprecated: Old Voice Architecture

**Do NOT implement the following** (kept for historical reference):
- ❌ Porcupine (Picovoice) wake word + API key validation
- ❌ WebRTC VAD C++ bindings
- ❌ whisper.cpp build + direct bindings
- ❌ Text-only responses (replaced with Piper TTS)

All old voice subsections are deprecated. Use current offline stack above.

---

## Progress Snapshot

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 0: Infrastructure | 🟡 Partial | HiveMQ running, Ollama configured |
| Phase 1: Project Setup | ✅ Complete | Next.js app, Prisma, basic structure |
| Phase 2: AI Chatbot | 🔄 In Progress | API + streaming done; tools need DB |
| Phase 3: MQTT | 🔄 In Progress | Broker up; client wiring needed |
| Phase 4: Z-Wave | ⏳ Not Started | Pending device pairing |
| Phase 5: Voice | 🔄 In Progress | Core path done; stability + TTS needed |
| Phase 8: Presentation | ⏳ Not Started | Pending demo completion |

---

## Completed Work Summary

See `docs/delivered.md` for detailed list of completed features.

**Key Achievements:**
- ✅ Next.js app with LangChain + Ollama
- ✅ Prisma + SQLite with seed devices
- ✅ Chat API with streaming SSE
- ✅ HiveMQ broker connectivity verified
- ✅ Voice Gateway service skeleton
- ✅ OpenWakeWord + Whisper integration
- ✅ MQTT contracts defined

---

## Immediate Action Items (This Week)

**Priority 1 (DEMO CRITICAL):**
1. Device tools → Prisma + MQTT command publish
2. MQTT client singleton with reconnect logic
3. Voice Gateway: STT timeout + re-enable wake word
4. Piper TTS playback integration

**Priority 2:**
5. End-to-end demo pass (text + voice)
6. Z-Wave device pairing and testing
7. Write critical path tests (60%+ coverage)

**Priority 3:**
8. Presentation slide deck
9. Demo script and practice runs
10. Documentation updates

---

## Related Documentation

- **Architecture:** `docs/voice-gateway-architecture.md`
- **Requirements:** `docs/requirements.md`
- **Completed Work:** `docs/delivered.md`
- **Network Dependencies:** `docs/network-dependencies.md`
- **Repository Guidelines:** `docs/repository-guidelines.md`
- **Main Project README:** `../README.md`
