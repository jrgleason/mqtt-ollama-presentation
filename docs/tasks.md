# Implementation Tasks (Lean)

Last Updated: 2025-10-19

---

## Demo-Critical Focus

- LangChain tools → Prisma + MQTT publish (device control)
- MQTT client reliability (singleton, reconnect, QoS 1)
- Voice Gateway stability (OWW → Whisper via Ollama → Piper TTS)
- Z-Wave pairing + zwave-js-ui MQTT gateway verification

---

## Immediate Next Steps

1. Swap mock tools for Prisma queries + MQTT publishes
2. Add MQTT client (reconnect + QoS 1) and topic helpers
3. Voice Gateway: STT timeout + always re-enable wake word; Piper playback
4. One end-to-end demo pass (text + voice)

---

## ⚠️ CRITICAL: Testing Requirements

**Status: 🔴 INCOMPLETE - Zero meaningful tests exist across all apps**

### Testing Status by App (2025-10-19)

#### 1. **apps/oracle** (Next.js + LangChain + Prisma)

- ✅ Jest configured with `passWithNoTests: true`
- ⚠️ **0 real tests** - Only placeholder example.test.js exists
- ❌ No unit tests for utilities or tools
- ❌ No integration tests for API endpoints
- ❌ No tests for MQTT client functionality
- ❌ No tests for LangChain tool implementations
- **Coverage: 0%** (Goal: 60%+)
- **CI Status: ✅ PASSES** (but with no real tests)

#### 2. **apps/voice-gateway-oww** (Wake Word + STT/TTS)

- ✅ Jest configured with `--passWithNoTests` flag
- ⚠️ **0 tests** - No test files exist
- ❌ No tests for wake word detection
- ❌ No tests for STT/TTS integration
- ❌ No tests for MQTT communication
- ❌ No tests for XState machine logic
- **Coverage: 0%**
- **CI Status: ✅ PASSES** (but with no real tests)

#### 3. **apps/voice-gateway-common** (Shared Audio Utils)

- ✅ **FIXED** - Test script now exits with code 0
- ⚠️ **0 tests** - No Jest config, no test files
- ❌ No tests for audio utilities (STT, audio utils)
- **Coverage: 0%**
- **CI Status: ✅ PASSES** (placeholder test script)
- **TODO:** Add Jest config and actual tests

#### 4. **apps/zwave-mcp-server** (MCP Server for Z-Wave)

- ⚠️ No test script defined
- ⚠️ **0 tests** - No Jest config, no test files
- ❌ No tests for MCP tools
- ❌ No tests for MQTT integration
- **Coverage: 0%**
- **CI Status: ✅ N/A** (no test script to run)
- **TODO:** Add test script, Jest config, and tests

---

### Required Tests (Before Demo)

#### Phase 1: Core Functionality Tests (CRITICAL)

**Oracle App:**

- [ ] **MQTT Client Tests** (`apps/oracle/src/lib/mqtt/__tests__/client.test.js`)
    - [ ] Connection establishment and reconnection
    - [ ] Message publishing with QoS 1
    - [ ] Topic subscription and message handling
    - [ ] Error handling and recovery
    - [ ] Singleton pattern validation

- [ ] **LangChain Tools Tests** (`apps/oracle/src/lib/langchain/__tests__/tools.test.js`)
    - [ ] Device listing tool
    - [ ] Device control tool (turn on/off)
    - [ ] Device status query tool
    - [ ] Tool parameter validation (Zod schemas)
    - [ ] Error handling for unavailable devices

- [ ] **Device Service Tests** (`apps/oracle/src/lib/services/__tests__/device-service.test.js`)
    - [ ] Prisma queries (list, get by ID, update status)
    - [ ] MQTT message formatting
    - [ ] Device state synchronization

**Voice Gateway OWW:**

- [ ] **Wake Word Detection Tests** (`apps/voice-gateway-oww/src/__tests__/wake-word.test.js`)
    - [ ] OWW model loading and initialization
    - [ ] Audio buffer processing
    - [ ] Wake word confidence threshold validation
    - [ ] Multiple wake word handling

- [ ] **STT/TTS Tests** (`apps/voice-gateway-oww/src/__tests__/speech.test.js`)
    - [ ] Whisper transcription via Ollama
    - [ ] Piper TTS audio generation
    - [ ] Audio format conversion
    - [ ] Error handling for unavailable services

- [ ] **State Machine Tests** (`apps/voice-gateway-oww/src/__tests__/state-machine.test.js`)
    - [ ] XState transitions (idle → listening → processing → speaking)
    - [ ] Timeout handling in listening state
    - [ ] Wake word re-enable after speech playback
    - [ ] Error recovery transitions

**Voice Gateway Common:**

- [ ] **Audio Utils Tests** (`apps/voice-gateway-common/__tests__/audioUtils.test.js`)
    - [ ] Audio format conversions
    - [ ] Buffer manipulations
    - [ ] Sample rate conversions

- [ ] **STT Module Tests** (`apps/voice-gateway-common/__tests__/stt.test.js`)
    - [ ] Ollama Whisper integration
    - [ ] Transcription accuracy validation
    - [ ] Error handling

**Z-Wave MCP Server:**

- [ ] **MCP Tools Tests** (`apps/zwave-mcp-server/src/__tests__/tools.test.js`)
    - [ ] Device discovery tool
    - [ ] Device control tool
    - [ ] Parameter validation
    - [ ] MQTT message formatting

#### Phase 2: API Integration Tests

- [ ] **API Route Tests** (`apps/oracle/src/app/api/__tests__/`)
    - [ ] `/api/devices` - List all devices
    - [ ] `/api/devices/[id]` - Get device by ID
    - [ ] `/api/chat` - LangChain conversation endpoint
    - [ ] Auth0 session validation on protected routes

#### Phase 3: Component Tests (Lower Priority)

- [ ] **React Component Tests** (`apps/oracle/src/components/__tests__/`)
    - [ ] DeviceList component rendering
    - [ ] ChatInput component interaction
    - [ ] Device control UI elements

---

### Test Coverage Goals

```
Minimum:  60% overall (matches jest.config.mjs)
Critical: 80%+ for MQTT client, LangChain tools, device service, wake word detection
Nice:     90%+ for utilities and helpers
```

### Test Setup Status

- [x] **Oracle**: Jest configured, passWithNoTests enabled, placeholder test exists
- [x] **Voice Gateway OWW**: Jest configured, --passWithNoTests flag enabled
- [x] **Voice Gateway Common**: Test script fixed to not fail CI
- [ ] **Voice Gateway Common**: TODO - Add Jest config and actual tests
- [ ] **Z-Wave MCP Server**: TODO - Add test script, Jest config, and tests
- [ ] **TODO: Remove all passWithNoTests flags after Phase 1 tests are written**

---

### Action Items (Prioritized)

**URGENT (CI was failing):**

1. ✅ **DONE:** Fix oracle Jest config - Added passWithNoTests
2. ✅ **DONE:** Create placeholder test in oracle - example.test.js created
3. ✅ **DONE:** Fix voice-gateway-common test script - Now exits with code 0

**HIGH (Phase 1 - Core Tests):**

4. **Oracle:** Write MQTT client tests
5. **Oracle:** Write LangChain tools tests
6. **Oracle:** Write device service tests
7. **Voice Gateway OWW:** Write wake word detection tests
8. **Voice Gateway OWW:** Write STT/TTS tests
9. **Voice Gateway OWW:** Write state machine tests

**MEDIUM (Phase 2):**

10. **Oracle:** Write API route tests
11. **Voice Gateway Common:** Add Jest config
12. **Voice Gateway Common:** Write audio utils tests
13. **Z-Wave MCP Server:** Add test infrastructure

**LOW (Phase 3):**

14. **Oracle:** Write component tests

**BEFORE DEMO:**

15. Achieve 60%+ coverage minimum on oracle app
16. Achieve 60%+ coverage on voice-gateway-oww app
17. Remove all `passWithNoTests` flags from configs

---

## Quick Links

- Active Tasks: tasks-active.md
- Delivered: delivered.md
- Requirements (condensed): requirements.md
- Network: network-dependencies.md
- Voice: voice-gateway-architecture.md
- Outline (current): outline.md
