# Design Document: Boot and Communication Reliability

## Context

The voice gateway has three reliability issues that degrade user experience:
1. Beep feedback loops (beeps captured by mic, transcribed, trigger false interactions)
2. Silent MCP failures (Z-Wave tools unavailable, users unaware)
3. Premature readiness (system says ready before actually ready)

These issues were discovered through production logs and user testing sessions.

## Goals

- Eliminate beep feedback loops without breaking wake word interruption UX
- Provide clear error messages and retry logic for MCP connection failures
- Ensure system is truly ready before announcing readiness to users
- Maintain current startup performance (<10 seconds total)

## Non-Goals

- Persistent MCP connection retry in background (restart service if MCP permanently down)
- Recording quality improvements (VAD tuning, noise suppression) - separate concern
- Wake word model accuracy improvements - separate concern

## Decisions

### Decision 1: Beep Suppression Strategy

**Choice:** Suppress beep playback during `recording` state only

**Rationale:**
- Prevents beeps from being captured and transcribed during active recording
- Maintains wake word interruption UX (beeps still play during `cooldown` for user feedback)
- Simple state check (`if (!isRecording) playBeep()`) minimal code change
- No need for complex mic muting hardware control (platform-specific, fragile)

**Alternatives Considered:**
1. **Mic muting during all playback** - Simpler but breaks wake word interruption feature
2. **Post-processing transcription filter** - Reactive (filter "[BEEPING]" after transcription) instead of preventive
3. **Hardware mic mute** - Platform-specific (ALSA on Linux, CoreAudio on macOS), complex, fragile

**Trade-offs:**
- Pro: Minimal code change, maintains existing UX
- Con: Beeps still audible during recording (but not captured), may confuse users slightly

### Decision 2: MCP Retry Count and Delays

**Choice:** 3 attempts with exponential backoff (0s, 2s, 4s delays)

**Rationale:**
- Handles common transient failures (broker restart takes 1-3 seconds, network blips resolve quickly)
- Total retry time: 6 seconds maximum - acceptable startup delay for reliability
- Exponential backoff prevents overwhelming broker during restarts
- Industry standard pattern (AWS SDK, K8s controllers use similar)

**Alternatives Considered:**
1. **Infinite retry** - Hangs startup indefinitely, bad UX
2. **Single attempt (current)** - Too fragile, fails on transient issues
3. **Linear backoff (1s, 2s, 3s)** - Similar but exponential is more standard

**Trade-offs:**
- Pro: Recovers from transient failures automatically
- Con: Adds up to 6 seconds to startup if all retries fail (rare case)

### Decision 3: Detector Warm-up Duration

**Choice:** 2-3 seconds after embedding buffers filled

**Rationale:**
- Measured from logs: detector embedding buffer fills in ~2.24 seconds (28 frames × 80ms)
- Additional 2-3 seconds allows embeddings to stabilize (remove startup noise)
- Total warm-up: ~4-5 seconds from mic start to ready - acceptable for reliability
- Evidence: User reports cutoffs suggest detector not ready when welcome message plays

**Alternatives Considered:**
1. **No warm-up (current)** - Causes cutoffs and false triggers
2. **Longer warm-up (5+ seconds)** - Unnecessary delay, no evidence of benefit beyond 3 seconds
3. **Dynamic warm-up** - Measure embedding variance, stop when stable (complex, over-engineering)

**Trade-offs:**
- Pro: Prevents premature wake word detection, eliminates user cutoffs
- Con: +2-3 seconds startup delay (acceptable for reliability)

### Decision 4: Initialization Orchestration

**Choice:** Use async/await promises for sequential initialization

**Rationale:**
- Clear, readable initialization flow (no callback nesting)
- Easy to debug (stack traces show awaited calls)
- Explicit dependencies (can't speak welcome until tools loaded)
- Standard JavaScript pattern for async orchestration

**Implementation:**
```javascript
async function main() {
    await initServices();
    const detector = await setupWakeWordDetector(); // includes warm-up
    await initToolSystem(); // includes MCP retry
    const orchestrator = await createOrchestrator();
    const voiceService = setupStateMachine();
    const mic = setupMic(voiceService, orchestrator, detector);
    await speakWelcomeMessage(); // ONLY after all ready
    voiceService.send({type: 'READY'});
}
```

**Alternatives Considered:**
1. **Event-driven** - Complex, harder to debug, race conditions
2. **Callback-based** - Callback hell, unmaintainable
3. **Current sequential without await** - Doesn't wait for completion, causes race conditions

**Trade-offs:**
- Pro: Clear dependencies, prevents race conditions, easy to understand
- Con: Requires refactoring main.js initialization (moderate code change)

## Risks / Trade-offs

### Risk: Startup Time Increase

**Impact:** +2-3 seconds for detector warm-up, +6 seconds max for MCP retry (rare)

**Mitigation:**
- Detector warm-up runs in parallel with user seeing "starting" logs
- MCP retry only delays tool initialization (other systems continue)
- Total startup still <15 seconds in worst case (acceptable for reliability)

### Risk: Beep Timing Confusion

**Impact:** Beeps play during recording but aren't captured, may confuse users

**Mitigation:**
- Beeps are short (<200ms), user's own speech dominates recording
- Test with real users to validate UX
- Can revisit if user feedback indicates confusion

### Risk: MCP Retry Doesn't Solve Permanent Failures

**Impact:** If MCP server binary missing or broker permanently down, retries won't help

**Mitigation:**
- Clear error messages tell user what's wrong (stderr captured, logged)
- System continues with local tools (graceful degradation)
- User can restart service after fixing issue

## Migration Plan

**No migration needed** - these are internal improvements, no data migration, no config changes required.

**Deployment:**
1. Deploy code changes
2. Restart voice-gateway service
3. Monitor logs for "MCP retry" messages (should be rare)
4. Monitor for "[BEEPING]" transcriptions (should be eliminated)
5. Collect user feedback on startup timing and responsiveness

**Rollback:**
- If issues arise, revert to previous version
- No data loss, no state corruption possible

## Open Questions

None - design is clear, implementation is straightforward.
