# startup-timing Specification Delta

## Purpose

Ensure the voice gateway announces readiness (via welcome message and logs) only when truly ready to accept and process user wake word commands without delays, false negatives, or confusing gaps.

## Target Spec

`voice-gateway`

## MODIFIED Requirements

### Requirement: Startup Sequence

The voice gateway SHALL initialize all subsystems in an order that ensures the system is fully ready before announcing readiness to the user, with detector warm-up completing BEFORE the welcome message plays.

#### Scenario: Detector warm-up completes before welcome message

- **GIVEN** the voice gateway is starting up
- **WHEN** the system reaches Phase 6 (welcome message)
- **THEN** the wake word detector warm-up MUST have completed (warmUpComplete = true)
- **AND** the detector getWarmUpPromise() MUST have resolved
- **AND** setupWakeWordDetector() MUST have logged "✅ Detector fully warmed up and ready"
- **AND** only then SHALL the welcome message TTS synthesis begin

**Rationale:** Users hear "How can I help?" and expect to speak immediately. Playing this before detector is ready creates a confusing gap where wake word detection fails.

**Previous Behavior:** Welcome message played during detector warm-up (before ready).

**New Behavior:** Welcome message plays AFTER detector warm-up completes.

#### Scenario: No detector reset after welcome message

- **GIVEN** the welcome message has finished playing
- **WHEN** the welcome playback completion handler executes
- **THEN** the system SHALL NOT schedule a detector reset
- **AND** the detector buffers SHALL remain in their current state
- **AND** no second warm-up period SHALL occur

**Rationale:** Post-welcome reset triggered a second 2.5-second warm-up period that happened AFTER "Voice Gateway ready" was logged, creating a hidden gap between perceived and actual readiness. This reset was a workaround before beep isolation was implemented.

**Previous Behavior:** startTTSWelcome() scheduled detector reset 1000ms after playback, triggering second warm-up.

**New Behavior:** No reset scheduled, detector remains warm and ready.

#### Scenario: Tool system ready before welcome message

- **GIVEN** the voice gateway is starting up
- **WHEN** the system reaches the point of speaking the welcome message
- **THEN** the tool system MUST already be initialized and registered
- **AND** the voice orchestrator MUST be created
- **AND** the state machine MUST be set up
- **AND** the wake word detector MUST be warmed up and stable
- **AND** only the microphone activation remains pending

**Rationale:** The welcome message asks "How can I help?" which implies the system is ready to process commands. Saying this before tools are initialized OR before detector is stable creates user confusion and perceived system lag.

**Note:** This scenario remains unchanged from previous requirements, included here for completeness.

#### Scenario: Immediate responsiveness after welcome

- **GIVEN** the welcome message has finished playing
- **WHEN** the user triggers the wake word immediately after (within 500ms)
- **THEN** the system SHALL respond without delay
- **AND** all tools SHALL be available for command execution
- **AND** no "initializing" or "not ready" errors SHALL occur
- **AND** detector SHALL be fully stable (no cutoffs, no false negatives)

**Rationale:** Users expect to interact immediately after hearing "How can I help?". Any delay creates confusion and breaks user trust in the system.

**Previous Behavior:** User could NOT speak for 2.5-3.5 seconds after welcome (hidden second warm-up).

**New Behavior:** User CAN speak immediately after welcome ends.

#### Scenario: Startup log sequence reflects readiness

- **GIVEN** the voice gateway is starting up
- **WHEN** reviewing the startup logs
- **THEN** "⏳ Waiting for detector warm-up..." SHALL appear before "✅ Detector fully warmed up and ready"
- **AND** "✅ Detector fully warmed up and ready" SHALL appear before tool initialization logs
- **AND** tool initialization logs SHALL appear before welcome message synthesis logs
- **AND** "✅ Welcome message spoken" SHALL appear before "Voice Gateway ready"

**Rationale:** Logs should accurately reflect the initialization order so developers can diagnose timing issues.

**Previous Behavior:** "Voice Gateway ready" appeared before detector was actually ready (second warm-up hidden).

**New Behavior:** "Voice Gateway ready" appears only after detector is truly ready (single warm-up).

#### Scenario: Detector warm-up period enforced with timeout

- **GIVEN** the wake word detector embedding buffers are filled (~2.24 seconds)
- **WHEN** the detector emits buffer-filled event
- **THEN** system SHALL wait an additional 2.5 seconds for embeddings to stabilize
- **AND** detector SHALL emit 'warmup-complete' event after stabilization
- **AND** getWarmUpPromise() SHALL resolve after stabilization
- **AND** if warm-up does not complete within 10 seconds, Promise.race() timeout SHALL reject
- **AND** on timeout, system SHALL log warning and continue (graceful degradation)
- **AND** only then SHALL initialization proceed to next steps

**Rationale:** Measured from logs showing initial embedding instability. Warm-up ensures detector is truly ready. Timeout prevents indefinite hang if microphone fails.

**Note:** This scenario remains unchanged from previous requirements, included here for completeness.

---

### Requirement: Startup Readiness Validation

The voice gateway SHALL only announce readiness (via welcome message and "Voice Gateway ready" log) when genuinely ready to accept and process user commands without delays or errors.

#### Scenario: No premature readiness announcements

- **GIVEN** the voice gateway is initializing
- **WHEN** any subsystem is still being set up (detector warming up, tools loading, orchestrator creating)
- **THEN** the welcome message MUST NOT be spoken
- **AND** "Voice Gateway ready" MUST NOT be logged
- **AND** no audio cues suggesting readiness SHALL play

**Rationale:** Announcing readiness before being ready damages user trust and creates perception that the system is slow or broken.

**Note:** This scenario remains unchanged from previous requirements, included here for completeness.

#### Scenario: Welcome message timing validation

- **GIVEN** the voice gateway has spoken the welcome message
- **WHEN** a developer inspects the system state
- **THEN** all of the following MUST be true:
  - Wake word detector is warmed up and stable (warmUpComplete = true)
  - Tool registry is populated with all expected tools (local + MCP if available)
  - ToolExecutor is instantiated and functional
  - VoiceInteractionOrchestrator is created
  - Voice state machine is initialized
- **AND** only microphone activation and wake word listening remain to be started

**Rationale:** Provides clear validation criteria for correct initialization order.

**Previous Behavior:** Welcome played before detector was warmed up (warmUpComplete could be false).

**New Behavior:** Welcome plays only after warmUpComplete = true verified.

#### Scenario: Single warm-up period enforced

- **GIVEN** the voice gateway startup sequence
- **WHEN** the detector completes its warm-up period (first warm-up)
- **THEN** no additional detector resets SHALL be triggered
- **AND** no second warm-up period SHALL occur
- **AND** the detector SHALL remain in warmUpComplete = true state
- **AND** detector buffers SHALL persist through welcome message playback

**Rationale:** Double warm-up was an unintended consequence of post-welcome reset. Single warm-up is sufficient when sequenced correctly.

**Previous Behavior:** Two warm-up periods (first during welcome, second after reset).

**New Behavior:** Single warm-up period before welcome.

#### Scenario: Graceful degradation with clear messaging

- **GIVEN** MCP server connection fails after all retries
- **WHEN** voice gateway continues with local tools only
- **THEN** system SHALL log clear warning message indicating degraded mode
- **AND** welcome message SHALL still be spoken (system is functional, just missing Z-Wave tools)
- **AND** user SHALL NOT be blocked from using local tools (datetime, search, volume control)

**Rationale:** System should work with degraded functionality rather than failing completely.

**Note:** This scenario remains unchanged from previous requirements, included here for completeness.

#### Scenario: Async orchestration with promises

- **GIVEN** initialization sequence uses async/await promises
- **WHEN** each initialization step completes
- **THEN** the promise SHALL resolve and next step SHALL begin
- **AND** errors in any step SHALL be caught and logged with context
- **AND** initialization sequence SHALL be deterministic (no race conditions)

**Rationale:** Promises provide clear dependency ordering and error handling for async initialization.

**Note:** This scenario remains unchanged from previous requirements, included here for completeness.

---

## ADDED Requirements

### Requirement: Detector Warm-up Promise Orchestration

The voice gateway SHALL use promise-based orchestration to ensure detector warm-up completes before proceeding with welcome message and activation.

#### Scenario: setupWakeWordDetector awaits warm-up

- **GIVEN** setupWakeWordDetector() is initializing the detector
- **WHEN** detector.initialize() completes (ONNX models loaded)
- **THEN** the function SHALL await detector.getWarmUpPromise() before returning
- **AND** the function SHALL log "⏳ Waiting for detector warm-up..." before await
- **AND** the function SHALL log "✅ Detector fully warmed up and ready" after await resolves
- **AND** the function SHALL NOT return until warm-up completes OR timeout occurs

**Rationale:** Promise-based orchestration ensures warm-up completes before caller proceeds. Logs provide visibility into warm-up progress.

#### Scenario: Warm-up timeout handling

- **GIVEN** setupWakeWordDetector() is awaiting warm-up
- **WHEN** warm-up does not complete within 10 seconds
- **THEN** Promise.race() SHALL reject with timeout error
- **AND** the function SHALL catch the error
- **AND** the function SHALL log "⚠️ Detector warm-up timeout - may experience initial detection issues"
- **AND** the function SHALL return the detector anyway (graceful degradation)
- **AND** the system SHALL continue initialization (non-fatal)

**Rationale:** 10-second timeout prevents indefinite hang if microphone fails to start or buffers fail to fill. Graceful degradation allows system to continue (user may experience initial false negatives, acceptable for demo).

#### Scenario: Microphone must start before warm-up wait

- **GIVEN** setupWakeWordDetector() is called
- **WHEN** detector.initialize() completes
- **THEN** microphone MUST already be running and feeding audio to detector
- **AND** audio chunks MUST be flowing to detector.detect() method
- **AND** detector buffers MUST be filling with audio data

**Rationale:** Detector buffers can only fill if microphone is feeding audio. Warm-up promise will never resolve if mic is not running.

**Implementation Note:** Main.js starts microphone in Phase 5, before Phase 6 (welcome message). Microphone start is moved earlier to ensure it runs during warm-up wait. However, since mic is already started in Phase 5 (before setupWakeWordDetector returns), this is already satisfied.

**Correction**: Looking at main.js, microphone is started in Phase 5, which is AFTER Phase 2 (setupWakeWordDetector). This means mic is NOT running during warm-up wait.

**Solution**: Microphone must be started BEFORE calling setupWakeWordDetector(), or setupWakeWordDetector() must start the microphone internally. However, this creates circular dependency (mic needs detector reference, detector needs to wait for warm-up).

**Alternative**: Keep mic start in Phase 5, but have getWarmUpPromise() trigger in detect() method (which happens when mic starts feeding audio). This is the CURRENT implementation - mic starts in Phase 5, feeds audio to detector in Phase 2's detector instance, buffers fill, warm-up triggers.

**Clarification**: Re-reading main.js more carefully:
- Phase 2: detector = await setupWakeWordDetector() - creates detector, initializes ONNX models
- Phase 5: micInstance = setupMic(voiceService, orchestrator, **detector**, ...) - starts mic, passes detector reference
- Mic data handler calls `detector.detect(chunk)` which fills buffers and triggers warm-up

So the sequence SHOULD be:
1. Phase 2: Create detector, initialize models, DON'T wait for warm-up yet
2. Phase 5: Start mic (mic immediately starts feeding detector)
3. Buffers fill during Phase 5 setup
4. Warm-up completes during Phase 5 setup
5. Phase 6: Welcome message (detector is now ready)

BUT, if we add `await detector.getWarmUpPromise()` in setupWakeWordDetector() (Phase 2), it will block BEFORE mic starts (Phase 5), causing a deadlock!

**CORRECTED SOLUTION**: We need to start mic BEFORE waiting for warm-up, or wait for warm-up AFTER mic starts.

**Option A**: Start mic in Phase 2, before returning from setupWakeWordDetector()
- **Problem**: Mic needs orchestrator, which is created in Phase 4
- **Problem**: Circular dependency

**Option B**: Wait for warm-up in Phase 5, AFTER mic starts
- Move `await detector.getWarmUpPromise()` to AFTER `setupMic()` in main.js
- This is cleaner and avoids circular dependency

**Option C**: Start mic in setupWakeWordDetector(), return both detector and mic
- Changes API contract
- More invasive change

**BEST SOLUTION (Option B)**:
- setupWakeWordDetector() does NOT await warm-up (returns detector immediately)
- main.js Phase 5: setupMic() starts mic (feeds detector)
- main.js Phase 5.5 (NEW): await detector.getWarmUpPromise() AFTER setupMic()
- main.js Phase 6: Welcome message (detector is now ready)

This avoids circular dependency and keeps clean separation of concerns.

Let me revise the scenarios to reflect this:

#### Scenario: Warm-up wait occurs after microphone starts (REVISED)

- **GIVEN** the voice gateway main() function is executing
- **WHEN** setupMic() completes (microphone is running and feeding detector)
- **THEN** main() SHALL await detector.getWarmUpPromise() before proceeding
- **AND** main() SHALL log "⏳ Waiting for detector warm-up..." before await
- **AND** main() SHALL log "✅ Detector fully warmed up and ready" after await resolves
- **AND** main() SHALL NOT proceed to welcome message until warm-up completes

**Rationale:** Warm-up can only complete after microphone starts feeding audio. Waiting in main() after setupMic() ensures proper sequencing.

---

### Requirement: No Post-Welcome Detector Reset

The voice gateway SHALL NOT reset the detector after welcome message playback, avoiding wasteful second warm-up and maintaining detector readiness.

#### Scenario: Welcome completion handler does not reset

- **GIVEN** startTTSWelcome() playback promise has resolved (welcome finished)
- **WHEN** the promise completion handler executes
- **THEN** the handler SHALL log "✅ Welcome message spoken"
- **AND** the handler SHALL NOT call safeDetectorReset()
- **AND** the handler SHALL NOT schedule any setTimeout() callbacks
- **AND** the detector state SHALL remain unchanged (warmUpComplete = true, buffers intact)

**Rationale:** Post-welcome reset was added to "clear noise" from TTS audio, but beep isolation already prevents TTS audio from being recorded. Reset is unnecessary and triggers wasteful second warm-up.

#### Scenario: Detector buffers persist through welcome playback

- **GIVEN** welcome message is playing
- **WHEN** TTS audio is being played through speakers
- **THEN** detector buffers (melBuffer, embeddingBuffer) SHALL remain populated
- **AND** detector state (melBufferFilled, embeddingBufferFilled) SHALL remain true
- **AND** warmUpComplete SHALL remain true
- **AND** detector SHALL remain in ready state throughout playback

**Rationale:** Detector doesn't need to be reset during TTS because:
1. State machine is in "startup" or "cooldown" during TTS (blocks wake word detection)
2. Beep isolation prevents TTS audio from being recorded
3. Buffers only contain microphone audio (not TTS audio)

#### Scenario: State machine prevents wake word detection during welcome

- **GIVEN** welcome message is playing
- **WHEN** state machine is in "startup" state
- **THEN** wake word detection SHALL be blocked by state guard
- **AND** detector.detect() SHALL return 0 for all chunks (even if buffers indicate wake word)
- **AND** state machine SHALL only transition to "listening" AFTER welcome completes

**Rationale:** State machine guard prevents TTS audio from triggering wake word, even if detector buffers somehow contained TTS audio. This is a second layer of protection beyond beep isolation.

---

## REMOVED Requirements

None. All existing requirements remain valid.

---

## Related Specs

- `voice-gateway` (target spec - modified)
- `audio-processing` (beep isolation prevents TTS feedback)
- `microphone-management` (mic timing critical for warm-up)

## Dependencies

- Microphone must start BEFORE warm-up wait (Phase 5 before Phase 5.5)
- Detector warm-up infrastructure already exists (getWarmUpPromise, warmUpComplete flag)
- State machine guards already prevent wake word detection during startup

## Backward Compatibility

**No breaking changes**:
- API contracts unchanged (setupWakeWordDetector() still returns detector)
- Configuration unchanged (no new env vars)
- Existing tests should pass (just faster startup)
- Observable behavior improvement (no regressions)

**Behavior changes**:
- Startup time: 7 seconds → 4.5 seconds (faster)
- User responsiveness: 2.5-3.5s gap → immediate (better)
- Log sequence: Different order, but more accurate

## Testing Requirements

### Unit Tests
1. Verify setupWakeWordDetector() does NOT await warm-up (returns immediately)
2. Verify startTTSWelcome() does NOT call safeDetectorReset()
3. Verify main.js awaits getWarmUpPromise() after setupMic()

### Integration Tests
1. Measure startup time (should be ~4.5s ±0.5s)
2. Verify wake word detection works immediately after welcome
3. Verify no false positives during welcome playback

### Manual Tests
1. Cold start on Raspberry Pi 5 (first run)
2. Warm start (subsequent runs)
3. Rapid wake word triggers after startup
4. Welcome interruption (trigger wake word during welcome)
