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

**Status: 🔴 INCOMPLETE - Zero meaningful tests exist**

### Current State (2025-10-19)
- ❌ **0 real tests** - Only placeholder example.test.js exists
- ❌ No unit tests for utilities or tools
- ❌ No integration tests for API endpoints
- ❌ No tests for MQTT client functionality
- ❌ No tests for LangChain tool implementations
- ❌ Coverage: 0% (Goal: 60%+)

### Required Tests (Before Demo)

#### Phase 1: Core Functionality Tests (CRITICAL)
- [ ] **MQTT Client Tests** (`src/lib/mqtt/__tests__/client.test.js`)
  - [ ] Connection establishment and reconnection
  - [ ] Message publishing with QoS 1
  - [ ] Topic subscription and message handling
  - [ ] Error handling and recovery
  - [ ] Singleton pattern validation

- [ ] **LangChain Tools Tests** (`src/lib/langchain/__tests__/tools.test.js`)
  - [ ] Device listing tool
  - [ ] Device control tool (turn on/off)
  - [ ] Device status query tool
  - [ ] Tool parameter validation (Zod schemas)
  - [ ] Error handling for unavailable devices

- [ ] **Device Service Tests** (`src/lib/services/__tests__/device-service.test.js`)
  - [ ] Prisma queries (list, get by ID, update status)
  - [ ] MQTT message formatting
  - [ ] Device state synchronization

#### Phase 2: API Integration Tests
- [ ] **API Route Tests** (`src/app/api/__tests__/`)
  - [ ] `/api/devices` - List all devices
  - [ ] `/api/devices/[id]` - Get device by ID
  - [ ] `/api/chat` - LangChain conversation endpoint
  - [ ] Auth0 session validation on protected routes

#### Phase 3: Component Tests (Lower Priority)
- [ ] **React Component Tests** (`src/components/__tests__/`)
  - [ ] DeviceList component rendering
  - [ ] ChatInput component interaction
  - [ ] Device control UI elements

### Test Coverage Goals
```
Minimum:  60% overall (matches jest.config.mjs)
Critical: 80%+ for MQTT client, LangChain tools, device service
Nice:     90%+ for utilities and helpers
```

### Test Setup Status
- [x] Jest configuration (jest.config.mjs)
- [x] Test scripts in package.json (test, test:watch, test:coverage)
- [x] `passWithNoTests: true` enabled (temporary, until real tests exist)
- [ ] **TODO: Remove `passWithNoTests` after Phase 1 tests are written**

### Action Items
1. **URGENT:** Write MQTT client tests (Phase 1)
2. **URGENT:** Write LangChain tools tests (Phase 1)
3. **HIGH:** Write device service tests (Phase 1)
4. **MEDIUM:** Write API route tests (Phase 2)
5. **LOW:** Write component tests (Phase 3)
6. **BEFORE DEMO:** Achieve 60%+ coverage minimum
7. **BEFORE DEMO:** Remove `passWithNoTests: true` from jest.config.mjs

---

## Quick Links

- Active Tasks: tasks-active.md
- Delivered: delivered.md
- Requirements (condensed): requirements.md
- Network: network-dependencies.md
- Voice: voice-gateway-architecture.md
- Outline (current): outline.md
