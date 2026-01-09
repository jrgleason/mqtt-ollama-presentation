# Test Coverage Mapping

This document tracks test coverage across all modules and maps test files to OpenSpec Gherkin scenarios.

**Generated:** 2026-01-09
**Status:** Coverage data complete, scenario mapping requires manual review

---

## Coverage Summary

### voice-gateway-oww

| Metric | Coverage |
|--------|----------|
| **Statements** | 12.8% |
| **Branches** | 13.24% |
| **Functions** | 20.33% |
| **Lines** | 12.5% |

**Test Statistics:**
- Test Suites: 15 passed, 1 skipped (16 total)
- Tests: 281 passed, 11 skipped (292 total)

**High Coverage Areas (80%+):**
- `src/constants/` - 100%
- `src/state-machines/` - 100% statements
- `src/util/Logger.js` - 93.75%
- `src/util/prompt-loader.js` - 88%
- `src/services/WebSearchFallback.js` - 89.53%
- `src/services/ToolExecutor.js` - 79.24%

**Low Coverage Areas (needs attention):**
- `src/audio/` - 3.15% (AudioPlayer, MicrophoneManager, etc.)
- `src/tools/` - 0% (datetime-tool, search-tool, etc.)
- `src/services/MCPIntegration.js` - 2.38%
- `src/services/VoiceInteractionOrchestrator.js` - 0%
- `src/wake-word/` - 0%

### zwave-mcp-server

| Metric | Coverage |
|--------|----------|
| **Tests** | 92 passed |
| **Suites** | 4 passed |

*Note: Coverage percentage not configured. Add `--coverage` to test script.*

### oracle

| Metric | Coverage |
|--------|----------|
| **Tests** | 26 passed |
| **Suites** | 3 passed |

*Note: Coverage percentage not configured. Add `--coverage` to test script.*

---

## Test File Inventory

### voice-gateway-oww (16 test files)

| Test File | Target | Tests |
|-----------|--------|-------|
| `src/__tests__/AIRouter.test.js` | AIRouter.js | AI routing logic |
| `src/__tests__/config.test.js` | config.js | Configuration loading |
| `src/__tests__/example.test.js` | - | Example/template |
| `src/__tests__/IntentClassifier.test.js` | IntentClassifier.js | Intent classification |
| `src/__tests__/modelWarmup.test.js` | Model warmup | Pre-loading models |
| `src/__tests__/OllamaClient.test.js` | OllamaClient.js | Ollama API client |
| `src/__tests__/PlaybackMachine.test.js` | PlaybackMachine.js | Audio playback state |
| `src/__tests__/prompt-loader.test.js` | prompt-loader.js | Prompt template loading |
| `src/__tests__/RecordingMachine.test.js` | RecordingMachine.js | Recording state |
| `src/__tests__/ToolExecutor.test.js` | ToolExecutor.js | Tool execution |
| `src/__tests__/WakeWordMachine.test.js` | WakeWordMachine.js | Wake word state |
| `src/__tests__/WebSearchFallback.test.js` | WebSearchFallback.js | Web search |
| `tests/beep-isolation.test.js` | Beep audio | Sound isolation |
| `tests/mcp-retry.test.js` | MCP retry | Retry logic |
| `tests/skip-transcription-when-silent.test.js` | Transcription | Silent handling |
| `tests/startup-orchestration.test.js` | Startup | Initialization |

### zwave-mcp-server (4 test files)

| Test File | Target | Tests |
|-----------|--------|-------|
| `src/__tests__/device-registry.test.js` | Device registry | Device management |
| `src/__tests__/error-translation.test.js` | Error handling | Error messages |
| `src/__tests__/format-device-state.test.js` | Device state | State formatting |
| `src/__tests__/zwave-client-health.test.js` | Health check | Connection health |

### oracle (3 test files)

| Test File | Target | Tests |
|-----------|--------|-------|
| `src/lib/__tests__/example.test.js` | - | Example/template |
| `src/lib/anthropic/__tests__/client.test.js` | Anthropic client | Claude API |
| `src/lib/mqtt/__tests__/client.test.js` | MQTT client | MQTT messaging |

---

## Spec-to-Test Mapping

### Summary by Spec

| Spec | Scenarios | Coverage Status |
|------|-----------|-----------------|
| voice-gateway | 88 | Partial - state machines tested |
| tool-execution | 58 | Partial - ToolExecutor.test.js |
| zwave-integration | 50 | Partial - 4 test files |
| documentation | 39 | Manual verification |
| microphone-management | 35 | Low - audio tests missing |
| voice-activity-detection | 25 | Low - VAD tests missing |
| code-organization | 20 | Structural verification |
| audio-processing | 18 | Low - AudioPlayer untested |
| ollama-client-integration | 13 | Partial - OllamaClient.test.js |
| ai-provider-configuration | 12 | Partial - config.test.js |
| oracle-chat-ui | 10 | Manual verification |
| mcp-integration | 10 | Partial - mcp-retry.test.js |
| voice-gateway-state-management | 8 | Good - state machine tests |
| transcription-service | 8 | Low - service untested |
| datetime-awareness | 4 | Low - datetime-tool untested |
| response-validation | 4 | Not implemented yet |

**Total Scenarios:** 402
**Estimated Coverage:** ~30% (scenario-to-test verification pending)

---

## High-Priority Gaps

### Critical (blocks demo reliability)

1. **Audio Processing** - 0% coverage
   - AudioPlayer.js handles TTS playback
   - MicrophoneManager.js handles voice capture
   - Risk: Audio bugs could break demo

2. **Voice Interaction Orchestrator** - 0% coverage
   - Central coordination of all voice interactions
   - Risk: Integration bugs could break entire flow

3. **Tool Implementations** - 0% coverage
   - datetime-tool.js, search-tool.js, volume-control-tool.js
   - Risk: Tool execution failures during demo

### Medium (affects specific features)

4. **MCP Integration** - 2.38% coverage
   - Z-Wave device control via MCP
   - Partially covered by mcp-retry.test.js

5. **Transcription Service** - 0% coverage
   - Whisper transcription handling
   - Speech-to-text reliability

### Low Priority (documentation/structure)

6. **Documentation spec** - Manual verification
7. **Code organization spec** - Structural validation

---

## Manual Verification Required

The following areas require manual review to complete scenario-to-test mapping:

1. **Cross-reference each Gherkin scenario** in `openspec/specs/*/spec.md` with test assertions
2. **Validate integration scenarios** - many scenarios describe end-to-end behavior
3. **Identify missing test coverage** for specific scenarios
4. **Update this document** with detailed mapping tables per spec

### Process for Manual Mapping

For each spec:
1. Open `openspec/specs/<spec-name>/spec.md`
2. For each `#### Scenario:`, find the corresponding test
3. Document in the mapping table below:

```markdown
| Scenario | Test File | Test Name | Status |
|----------|-----------|-----------|--------|
| Scenario: User says wake word | WakeWordMachine.test.js | "transitions to listening on wake word" | Covered |
```

---

## Recommendations

### Before Presentation (January 12, 2026)

1. **Add tests for tools** - datetime-tool, search-tool critical for demo
2. **Add audio playback tests** - mock-based tests for AudioPlayer
3. **Add VoiceInteractionOrchestrator tests** - integration tests for voice flow

### Post-Presentation

1. Complete scenario-to-test mapping for all 402 scenarios
2. Add coverage scripts to zwave-mcp-server and oracle
3. Set up CI coverage thresholds (recommend 80%+)
4. Automate coverage reporting in PR workflow
