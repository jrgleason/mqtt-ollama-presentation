# Proposal: refactor-code-quality-improvements

## Priority
**Low** - Quality improvements to be done AFTER all functional issues are resolved. This is technical debt cleanup, not blocking functionality.

## Why

**Goal:** Improve code maintainability, readability, and testability after completing all functional work.

### Current Technical Debt (from openspec/project.md)

While recent refactoring has addressed some issues (BackgroundTranscriber, AudioUtils), remaining technical debt includes:

1. **Monolithic Functions**
   - `main.js` setupMic() - 400+ lines handling setup, event listeners, state machine
   - Complex nested callbacks and state management

2. **Magic Numbers**
   - Scattered constants without explanatory context
   - Example: `1000` (timeout? duration? volume?)
   - Example: `0.01` (threshold? multiplier? percentage?)

3. **Duplicate Code Patterns**
   - Query detection patterns repeated in multiple files
   - Tool executor patterns duplicated between AI clients
   - Error handling boilerplate repeated

4. **TODO Comments**
   - `apps/zwave-mcp-server/src/mcp-client.js:75` - "TODO: This seems wrong" about initialization timing
   - `apps/zwave-mcp-server/src/index.js:423` - "TODO: Send MQTT command" (not implemented)
   - `apps/voice-gateway-oww/src/util/ElevenLabsTTS.js:109` - Speed adjustment not implemented

5. **Large Files Needing Refactoring**
   - `AnthropicClient.js` (489 lines) - Mixed concerns (client, tool binding, streaming)
   - `VoiceInteractionOrchestrator.js` (428 lines) - Orchestration + intent classification + beep management
   - `streamingTTS.js` (312 lines) - Module-level state, could be class-based

6. **Code Organization Issues**
   - Some utilities remain in wrong directories
   - Inconsistent file organization patterns
   - Mixed abstraction levels in some modules

### Why Clean Up Now?

**Timing:** All functional issues MUST be resolved first:
- ✅ Fix MCP tool parameter schema (CRITICAL - blocking)
- ✅ Add MQTT sensor data fallback (HIGH)
- ✅ Skip transcription when silent (LOW)
- ✅ Any other pending functional work

**Then** perform code quality improvements:
- ✅ Code is working correctly
- ✅ All tests pass
- ✅ Demo is functional
- ✅ Safe to refactor without breaking functionality

## What Changes

### 1. Refactor setupMic() Function (main.js)

**Problem:** 400+ line monolithic function with nested callbacks and complex state management

**Solution:** Extract focused helper functions:

```javascript
// Before: One massive function
function setupMic(voiceService, orchestrator, detector, onRecordingCheckerReady) {
    // ... 400 lines of setup, event handlers, state transitions
}

// After: Focused functions
function setupMic(voiceService, orchestrator, detector, onRecordingCheckerReady) {
    const micInstance = createMicrophoneInstance();
    const state = initializeMicrophoneState(detector);

    attachMicrophoneEventHandlers(micInstance, state, voiceService, orchestrator);
    attachStateTransitionHandlers(voiceService, state, orchestrator);

    return micInstance;
}

function createMicrophoneInstance() { /* 10-15 lines */ }
function initializeMicrophoneState(detector) { /* 10-15 lines */ }
function attachMicrophoneEventHandlers(mic, state, service, orchestrator) { /* 50-60 lines */ }
function attachStateTransitionHandlers(service, state, orchestrator) { /* 50-60 lines */ }
```

### 2. Extract and Document Magic Numbers

**Problem:** Constants without context scattered throughout code

**Solution:** Create domain-specific constant modules:

```javascript
// Before
if (duration > 1000) { ... }
if (threshold < 0.01) { ... }

// After: apps/voice-gateway-oww/src/constants/timing.js
export const TIMEOUTS = {
    TOOL_EXECUTION_WARNING_MS: 1000,  // Log warning for slow tools
    MCP_CONNECTION_TIMEOUT_MS: 5000,  // Max time to wait for MCP connection
    WHISPER_TRANSCRIPTION_TIMEOUT_MS: 60000  // Max transcription time
};

// apps/voice-gateway-oww/src/constants/thresholds.js
export const THRESHOLDS = {
    VAD_SILENCE: 0.01,  // RMS energy below this = silence
    MIN_AUDIO_ENERGY: 0.001,  // Skip transcription if below this
    WAKE_WORD_SCORE: 0.5  // Minimum confidence score
};
```

### 3. Consolidate Duplicate Query Detection

**Problem:** Query detection patterns repeated in VoiceInteractionOrchestrator and intent classifiers

**Solution:** Create single source of truth:

```javascript
// apps/voice-gateway-oww/src/services/IntentClassifier.js (NEW)
export class IntentClassifier {
    constructor() {
        this.patterns = {
            device: /list.*device|available.*device|show.*device/i,
            datetime: /time|date|day|month|year/i,
            control: /turn\s+(on|off)|dim|brighten|set.*level/i
        };
    }

    classifyIntent(text) {
        return {
            isDeviceQuery: this.patterns.device.test(text),
            isDateTimeQuery: this.patterns.datetime.test(text),
            isDeviceControlQuery: this.patterns.control.test(text)
        };
    }
}
```

### 4. Resolve TODO Comments

**File:** `apps/zwave-mcp-server/src/mcp-client.js:75`
```javascript
// TODO: This seems wrong
// Give the server a moment to fully initialize its stdio transport
// await new Promise(resolve => setTimeout(resolve, 500));
```

**Solution:** Either:
- Remove if proven unnecessary during testing
- Keep with clear explanation if needed
- Replace with proper event-based synchronization

**File:** `apps/zwave-mcp-server/src/index.js:423`
```javascript
// TODO: Send MQTT command - requires MQTT client initialization
```

**Solution:**
- Implement MQTT publishing (blocked by `add-mqtt-sensor-data-fallback`)
- Or remove if not part of MVP scope

**File:** `apps/voice-gateway-oww/src/util/ElevenLabsTTS.js:109`
```javascript
// const speed = options.speed ?? 1.0; // TODO: Implement speed adjustment
```

**Solution:**
- Document that ElevenLabs API doesn't support speed adjustment
- Remove TODO, replace with comment explaining limitation

### 5. Refactor Large Files (If Needed)

**Evaluate after functional work:**
- `AnthropicClient.js` (489 lines) - Consider extracting streaming logic
- `VoiceInteractionOrchestrator.js` (428 lines) - Consider extracting intent classifier
- `streamingTTS.js` (312 lines) - Consider converting to class-based

**Principle:** Only refactor if it improves clarity. Don't over-engineer.

### 6. Code Organization Cleanup

**Review and organize:**
- Ensure all utilities are in correct directories
- Verify consistent import patterns
- Check for unused imports/exports
- Remove commented-out code

## Impact

### Files Modified

**May need changes:**
- `apps/voice-gateway-oww/src/main.js` - Refactor setupMic()
- `apps/voice-gateway-oww/src/constants/` (NEW) - Extract magic numbers
- `apps/voice-gateway-oww/src/services/IntentClassifier.js` (NEW) - Consolidate query detection
- `apps/zwave-mcp-server/src/mcp-client.js` - Resolve TODO
- `apps/zwave-mcp-server/src/index.js` - Resolve TODO or implement MQTT
- `apps/voice-gateway-oww/src/util/ElevenLabsTTS.js` - Resolve TODO
- Various files - Remove magic numbers, use constants

**Scope determined during implementation** - Only refactor what clearly improves maintainability

### Breaking Changes

None. All refactoring is internal:
- External APIs unchanged
- Configuration unchanged
- Behavior unchanged
- Tests should continue passing

### Performance Impact

Neutral or positive:
- Extracted functions may enable better optimization
- Constants in dedicated modules may improve tree-shaking
- No runtime performance changes expected

## Dependencies

**Blocked by:**
- `fix-mcp-tool-parameter-schema` (CRITICAL - must be working)
- `add-mqtt-sensor-data-fallback` (HIGH - affects TODOs in zwave-mcp-server)
- `skip-transcription-when-silent` (LOW - but should be done first)
- All other pending functional work

**Blocks:** Nothing. This is pure quality improvement.

## Risks

### Low Risk

1. **Over-refactoring** - Breaking working code for theoretical improvements
   - **Mitigation:** Only refactor clear pain points
   - **Mitigation:** Keep changes minimal and focused
   - **Mitigation:** Test after each refactoring

2. **Introducing bugs during refactoring**
   - **Mitigation:** Comprehensive testing after each change
   - **Mitigation:** Git commits after each completed refactoring
   - **Mitigation:** Easy to revert if issues found

3. **Scope creep** - Refactoring too much
   - **Mitigation:** Strict scope definition in tasks
   - **Mitigation:** User approval before starting
   - **Mitigation:** Can pause/stop at any point

## Alternatives Considered

### Alternative 1: Don't Refactor (Keep Technical Debt)
**Pros:** Zero risk of breaking working code
**Cons:** Technical debt accumulates, harder to maintain

**Rejected:** Code quality matters for presentation demo and future maintenance

### Alternative 2: Complete Rewrite
**Pros:** Could redesign everything from scratch
**Cons:** Extremely high risk, time-consuming, likely to break things

**Rejected:** Working code should be preserved, only improve what needs improving

### Alternative 3: Partial Refactoring (Chosen)
**Pros:**
- ✅ Address clear pain points
- ✅ Minimal risk
- ✅ Measurable improvements
- ✅ Can stop at any point

**Rationale:** Focus on high-value, low-risk improvements

## Related Work

**Must complete first:**
- `fix-mcp-tool-parameter-schema` (CRITICAL)
- `add-mqtt-sensor-data-fallback` (HIGH)
- `skip-transcription-when-silent` (LOW)

**Previous refactoring work:**
- ✅ `refactor-background-transcriber` (completed)
- ✅ `refactor-audio-utils` (completed)
- ✅ `remove-voice-gateway-common` (completed)

**This proposal:** Final cleanup pass after all functional work

## Success Criteria

1. ✅ All TODO comments resolved (removed, implemented, or documented)
2. ✅ No magic numbers without named constants
3. ✅ setupMic() function under 100 lines (extracted to helpers)
4. ✅ No duplicate query detection patterns
5. ✅ All tests pass after refactoring
6. ✅ Demo works identically before and after refactoring
7. ✅ Code review by user confirms improvements
