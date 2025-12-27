# Tasks: refactor-code-quality-improvements

## Prerequisites (Blocking Dependencies)

**These MUST be complete before starting this proposal:**
- [ ] `fix-mcp-tool-parameter-schema` is complete and tested
- [ ] `add-mqtt-sensor-data-fallback` is complete and tested
- [ ] `skip-transcription-when-silent` is complete and tested
- [ ] All other pending functional work is complete
- [ ] Demo is working correctly end-to-end
- [ ] All tests pass

---

## 1. Extract Magic Numbers to Constants (8 tasks)

- [ ] 1.1 Create `apps/voice-gateway-oww/src/constants/timing.js` with timeout constants
- [ ] 1.2 Create `apps/voice-gateway-oww/src/constants/thresholds.js` with threshold constants
- [ ] 1.3 Create `apps/voice-gateway-oww/src/constants/audio.js` for audio-related constants (if not already in audio/constants.js)
- [ ] 1.4 Search codebase for magic numbers: `rg -n '\b\d+\b' apps/voice-gateway-oww/src --type js`
- [ ] 1.5 Replace timing magic numbers with constants from timing.js
- [ ] 1.6 Replace threshold magic numbers with constants from thresholds.js
- [ ] 1.7 Add JSDoc comments explaining each constant's purpose
- [ ] 1.8 Test: Verify behavior unchanged after constant extraction

## 2. Resolve TODO Comments (6 tasks)

- [ ] 2.1 Review `apps/zwave-mcp-server/src/mcp-client.js:75` TODO - Determine if setTimeout is needed
- [ ] 2.2 Either remove setTimeout or replace with event-based sync + clear comment
- [ ] 2.3 Review `apps/zwave-mcp-server/src/index.js:423` TODO - Implement MQTT publishing OR remove if out of scope
- [ ] 2.4 Review `apps/voice-gateway-oww/src/util/ElevenLabsTTS.js:109` TODO - Document ElevenLabs API limitation
- [ ] 2.5 Search codebase for remaining TODOs: `rg -n 'TODO|FIXME|HACK' apps/voice-gateway-oww apps/zwave-mcp-server`
- [ ] 2.6 Resolve or document all remaining TODOs

## 3. Refactor setupMic() Function (7 tasks)

- [ ] 3.1 Read current `setupMic()` implementation in main.js (lines ~41-458)
- [ ] 3.2 Create `createMicrophoneInstance()` helper function (10-15 lines)
- [ ] 3.3 Create `initializeMicrophoneState(detector)` helper function (10-15 lines)
- [ ] 3.4 Create `attachMicrophoneEventHandlers(mic, state, service, orchestrator)` helper (50-70 lines)
- [ ] 3.5 Create `attachStateTransitionHandlers(service, state, orchestrator)` helper (50-70 lines)
- [ ] 3.6 Refactor setupMic() to orchestrate helpers (target: <100 lines)
- [ ] 3.7 Test: Verify voice gateway works identically before/after refactoring

## 4. Consolidate Query Detection (5 tasks)

- [ ] 4.1 Create `apps/voice-gateway-oww/src/services/IntentClassifier.js` class
- [ ] 4.2 Move query detection patterns from VoiceInteractionOrchestrator to IntentClassifier
- [ ] 4.3 Add `classifyIntent(text)` method returning {isDeviceQuery, isDateTimeQuery, isDeviceControlQuery}
- [ ] 4.4 Update VoiceInteractionOrchestrator to use IntentClassifier instance
- [ ] 4.5 Test: Verify intent classification works identically

## 5. Code Organization Cleanup (6 tasks)

- [ ] 5.1 Run: `rg -l '^import.*from.*\.\./\.\./\.\.' apps/voice-gateway-oww/src` - Check for deep relative imports
- [ ] 5.2 Simplify any overly complex import paths
- [ ] 5.3 Search for unused imports: `rg -n '^import.*from' apps/voice-gateway-oww/src` and verify usage
- [ ] 5.4 Remove commented-out code: `rg -n '^[ ]*//' apps/voice-gateway-oww/src --type js` (evaluate each)
- [ ] 5.5 Verify consistent export patterns (named exports vs default exports)
- [ ] 5.6 Run: `npm run lint` (if available) or manual code review

## 6. Optional Large File Refactoring (4 tasks)

**Only do if clearly beneficial, otherwise skip:**

- [ ] 6.1 Review `AnthropicClient.js` (489 lines) - Consider extracting streaming logic to separate module
- [ ] 6.2 Review `VoiceInteractionOrchestrator.js` (428 lines) - IntentClassifier already extracted (Task 4)
- [ ] 6.3 Review `streamingTTS.js` (312 lines) - Consider class-based refactoring
- [ ] 6.4 DECISION: Only refactor if it clearly improves maintainability (discuss with user)

## 7. Testing & Validation (5 tasks)

- [ ] 7.1 Run all tests: `npm test` (if test suite exists)
- [ ] 7.2 Manual testing: Complete voice interaction flow (wake word → query → response)
- [ ] 7.3 Manual testing: Device control ("Turn on switch one")
- [ ] 7.4 Manual testing: Sensor query ("What's the temperature?") - if implemented
- [ ] 7.5 Verify demo script works end-to-end

## 8. Documentation Updates (3 tasks)

- [ ] 8.1 Update `openspec/project.md` - Remove resolved technical debt items
- [ ] 8.2 Update code comments to reflect new organization (if needed)
- [ ] 8.3 Update README.md if architecture changed significantly

---

**Total: 44 tasks**

**Estimated Duration:** 4-6 hours (spread over multiple sessions for safety)

**Critical Path:**
1. Prerequisites must be complete FIRST
2. Extract constants (Task 1) - Low risk, high value
3. Resolve TODOs (Task 2) - Clarifies intentions
4. Refactor setupMic() (Task 3) - Highest impact on maintainability
5. Testing (Task 7) - Verify no regressions

**Parallelizable Work:**
- Task 1 (constants) and Task 2 (TODOs) can be done in parallel
- Task 4 (intent classifier) can be done independently
- Task 5 (cleanup) can be done anytime

**Safe Stopping Points:**
- After Task 1: Constants extracted, immediate value delivered
- After Task 2: TODOs resolved, no confusing comments
- After Task 3: setupMic() refactored, major improvement
- After Task 7: All testing complete, safe to stop

**Skip if Time-Constrained:**
- Task 6 (optional large file refactoring) - Only if clearly beneficial
- Task 5.4 (remove commented code) - Nice to have, not critical
