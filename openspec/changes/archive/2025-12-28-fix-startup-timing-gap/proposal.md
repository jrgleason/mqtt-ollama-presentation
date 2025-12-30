# Proposal: Fix Startup Timing Gap

## Change ID
`fix-startup-timing-gap`

## Status
**PROPOSED** - Awaiting review and approval

## Problem Statement

Users hear the welcome message "Hello, I am Jarvis. How can I help?" but cannot actually trigger wake word commands for 2.5-3.5 seconds afterward. This creates a confusing and frustrating user experience where the system announces readiness but is not actually ready.

### Root Cause

The current implementation has **two critical issues**:

1. **Code-Documentation Mismatch**: The documentation (`STARTUP_ORCHESTRATION.md`) describes a system that waits for detector warm-up BEFORE playing the welcome message, but the actual code does NOT implement this wait.

2. **Unintended Second Warm-up**: A detector reset scheduled after welcome playback clears the detector buffers, triggering a second 2.5-second warm-up period that happens AFTER "Voice Gateway ready" is logged.

### Current Timeline

```
T+0s:     Detector initialized (no warm-up wait)
T+0s:     Microphone starts → buffers begin filling
T+0.5s:   Welcome TTS: "Hello, I am Jarvis..."
T+1.5s:   Buffers fill → FIRST warm-up starts (2.5s timer)
T+2.5s:   Welcome playback ends
T+3.5s:   Detector reset scheduled (1000ms after playback)
T+3.5s:   Reset executes → clears buffers
T+4.0s:   FIRST warm-up completes (but buffers just cleared!)
T+4.0s:   Buffers refill
T+4.5s:   SECOND warm-up starts (2.5s timer)
T+7.0s:   SECOND warm-up completes → ACTUALLY ready

"Voice Gateway ready" logged at T+3.5s
User hears welcome ending at T+2.5s
Detector actually ready at T+7.0s

GAP: 2.5-4.5 seconds of perceived readiness without actual readiness
```

### Impact on User Experience

1. User starts voice gateway
2. User hears: "Hello, I am Jarvis. How can I help?"
3. User immediately says: "Hey Jarvis, what time is it?"
4. **Nothing happens** (detector not ready)
5. User waits awkwardly, confused
6. 2-3 seconds later, user tries again
7. This time it works

## Proposed Solution

**Remove the post-welcome detector reset and implement single-warm-up flow**

This aligns the code with the documented intent: wait for detector warm-up BEFORE playing welcome message, then activate immediately afterward.

### New Timeline

```
T+0s:     Detector initialized
T+0s:     Microphone starts → buffers fill
T+2.5s:   FIRST (and only) warm-up completes
T+2.5s:   setupWakeWordDetector() returns
T+2.5s:   Welcome TTS: "Hello, I am Jarvis. How can I help?"
T+4.5s:   Welcome playback completes
T+4.5s:   "Voice Gateway ready" logged
T+4.5s:   Detector ACTUALLY ready (no reset, no second warm-up)
```

**User Experience:**
- [4.5 seconds of silence during startup]
- "Hello, I am Jarvis. How can I help?"
- [User can speak IMMEDIATELY - wake word detection works]
- ✅ Fast, clear, unambiguous readiness

### Why This Works

1. **Single warm-up**: Detector stabilizes once, no wasted second warm-up
2. **Welcome timing**: Plays AFTER detector is ready (matches documentation)
3. **Activation timing**: State machine activates AFTER welcome (user expectation aligned)
4. **Beep isolation**: Existing beep isolation prevents TTS audio from triggering detector
5. **Fastest solution**: 4.5 seconds vs 7-9 seconds for alternatives

### Risk Mitigation

**Risk**: Detector buffers contain welcome message audio, causing false triggers
**Mitigation**:
- Beep isolation already prevents TTS audio from being recorded during playback
- State machine is in "startup" state during welcome, so wake word detection is blocked
- Welcome interruption support allows user to interrupt if needed

**Risk**: Unknown critical purpose of post-welcome reset
**Mitigation**:
- Git history and code comments indicate reset was added to "clear noise" during welcome
- This was likely a workaround before beep isolation was implemented
- Comprehensive testing will verify no regressions

## Changes Required

### 1. Update `setupWakeWordDetector()` in `InitUtil.js`

**Add warm-up wait (match documentation)**:
```javascript
async function setupWakeWordDetector() {
    const detector = new OpenWakeWordDetector(...);
    await detector.initialize();

    // Wait for detector warm-up with timeout (max 10 seconds)
    logger.info('⏳ Waiting for detector warm-up...');
    try {
        await Promise.race([
            detector.getWarmUpPromise(),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Detector warm-up timeout')), 10000)
            )
        ]);
        logger.info('✅ Detector fully warmed up and ready');
    } catch (error) {
        logger.warn('⚠️ Detector warm-up timeout - may experience initial detection issues', {
            error: error.message
        });
    }

    return detector;
}
```

### 2. Remove Post-Welcome Reset in `startTTSWelcome()`

**Remove lines 116-120**:
```javascript
// REMOVED: Post-welcome reset that triggers second warm-up
// setTimeout(() => {
//     logger.debug('🔧 [STARTUP-DEBUG] startTTSWelcome: Executing detector reset now');
//     safeDetectorReset(detector, 'post-startup-tts');
// }, 1000);
```

### 3. Update Documentation

**Update `STARTUP_ORCHESTRATION.md`**:
- Update "Observable Behavior Changes" section to reflect actual implementation
- Remove references to post-welcome reset
- Update timeline diagrams to show single warm-up

**Update analysis document** (`docs/STARTUP_TIMING_GAP_ANALYSIS.md`):
- Add "Resolution" section documenting the fix
- Archive as historical reference for why this change was made

## Validation Criteria

### Functional Tests

1. **Wake word detection after startup**: Trigger wake word immediately after welcome message ends → Must detect successfully
2. **No false positives during welcome**: Monitor wake word detection during welcome playback → Must not trigger
3. **Startup timing**: Measure time from start to "Voice Gateway ready" → Must be ~4.5 seconds (±0.5s)
4. **Detector accuracy**: Compare wake word detection accuracy with/without reset → Must be equivalent or better

### Performance Tests

1. **Cold start**: First run after system boot → ~4.5 seconds
2. **Warm start**: Subsequent runs after crash/restart → ~4.5 seconds
3. **Multiple rapid wake words**: Trigger wake word 5 times in succession after startup → All must detect

### User Experience Tests

1. **User impatience**: Trigger wake word during welcome message → Must interrupt successfully
2. **User timing**: User triggers wake word immediately after welcome → Must respond within 100ms
3. **User confusion**: Observe if users wait awkwardly after welcome → Should not occur

## Alternatives Considered

### Alternative 1: Keep Reset, Add "I'm Ready" Message
- **Pros**: No code changes to detector/reset logic (low risk)
- **Cons**: 9-second startup, verbose (two TTS messages), wasteful second warm-up
- **Rejected**: Poor user experience, slow startup

### Alternative 2: Parallel Welcome + Warm-up, Fix Logging
- **Pros**: Minimal code changes
- **Cons**: 8-second startup, requires "Please wait while I warm up" message (less friendly)
- **Rejected**: Slow startup, confusing messaging

### Alternative 3: Delay Welcome Until After Second Warm-up
- **Pros**: Guarantees readiness
- **Cons**: 7-9 second startup (very slow), second warm-up is still wasteful
- **Rejected**: Too slow for demo/presentation use case

## Dependencies

- **No external dependencies**: This is a self-contained change to voice gateway startup
- **Related changes**: None (can be implemented independently)

## Rollback Plan

If testing reveals the post-welcome reset is critical for detector stability:

1. Revert removal of reset in `startTTSWelcome()`
2. Keep warm-up wait in `setupWakeWordDetector()` (still an improvement)
3. Accept 7-9 second startup time as necessary for reliability
4. Update documentation to explain why both warm-ups are needed

## Success Metrics

1. **Startup time**: 4.5 seconds (±0.5s) from process start to "Voice Gateway ready"
2. **User success rate**: 100% wake word detection within 500ms of welcome message ending
3. **False positive rate**: 0% during welcome message playback
4. **User satisfaction**: No reported "system not responding" issues during presentation

## Related Documentation

- **Analysis**: `/docs/STARTUP_TIMING_GAP_ANALYSIS.md` (comprehensive problem analysis)
- **Current docs**: `/apps/voice-gateway-oww/STARTUP_ORCHESTRATION.md` (to be updated)
- **Specs**: `/openspec/specs/voice-gateway/spec.md` (startup requirements)
