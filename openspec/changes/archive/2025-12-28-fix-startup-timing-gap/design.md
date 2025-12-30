# Design: Fix Startup Timing Gap

## Overview

This change eliminates the confusing gap between when users hear the welcome message and when the system is actually ready to accept wake word commands. The fix involves two key changes:

1. **Wait for detector warm-up BEFORE welcome message** (code matches documentation)
2. **Remove post-welcome detector reset** (eliminates wasteful second warm-up)

## Architecture

### Current Flow (Problematic)

```
┌─────────────────────────────────────────────────────────────────┐
│ Phase 1: Services Init                                          │
│ - MQTT, AI health checks, TTS health, ALSA                      │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Phase 2: Detector Init (NO WARM-UP WAIT)                        │
│ - Create OpenWakeWordDetector                                   │
│ - detector.initialize() loads ONNX models                       │
│ - Return detector immediately ❌                                 │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Phase 3-5: Tools, Orchestrator, Microphone                      │
│ - In parallel: Mic feeding audio → buffers filling              │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Phase 6: Welcome Message (PREMATURE)                            │
│ - TTS: "Hello, I am Jarvis. How can I help?"                    │
│ - Buffers fill during playback → FIRST warm-up starts           │
│ - Schedule reset after playback ❌                               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Phase 7: Activation                                             │
│ - voiceService.send({type: 'READY'})                            │
│ - Log "Voice Gateway ready" ❌ (Detector NOT actually ready)     │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Post-Activation (HIDDEN FROM USER)                              │
│ - Reset executes after 1000ms                                   │
│ - Buffers cleared, refill starts                                │
│ - SECOND warm-up starts (2.5s)                                  │
│ - SECOND warm-up completes → NOW actually ready                 │
│ - User has been waiting 2.5-3.5 seconds! ❌                      │
└─────────────────────────────────────────────────────────────────┘
```

**Problems**:
1. Welcome message plays before detector is ready
2. "Voice Gateway ready" logged before detector is ready
3. Hidden second warm-up after user hears "How can I help?"
4. 2.5-3.5 second gap between perceived and actual readiness

### Proposed Flow (Fixed)

```
┌─────────────────────────────────────────────────────────────────┐
│ Phase 1: Services Init                                          │
│ - MQTT, AI health checks, TTS health, ALSA                      │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Phase 2: Detector Init + WARM-UP WAIT ✅                         │
│ - Create OpenWakeWordDetector                                   │
│ - detector.initialize() loads ONNX models                       │
│ - Mic starts feeding audio → buffers fill (~2.2s)              │
│ - await detector.getWarmUpPromise() → wait 2.5s after fill     │
│ - Log "✅ Detector fully warmed up and ready"                   │
│ - Return detector (NOW truly ready) ✅                           │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Phase 3-5: Tools, Orchestrator, State Machine                   │
│ - Tool registry, MCP integration, tool executor                 │
│ - VoiceInteractionOrchestrator                                  │
│ - XState voice state machine                                    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Phase 6: Welcome Message (AFTER WARM-UP) ✅                      │
│ - TTS: "Hello, I am Jarvis. How can I help?"                    │
│ - NO reset scheduled ✅                                           │
│ - Detector is already warmed up and stable ✅                    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ Phase 7: Activation (TRULY READY) ✅                             │
│ - voiceService.send({type: 'READY'})                            │
│ - Log "Voice Gateway ready" ✅ (Detector IS actually ready)      │
│ - User can speak immediately! ✅                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Benefits**:
1. Welcome message plays AFTER detector is ready (honest communication)
2. "Voice Gateway ready" is accurate (detector IS ready)
3. No hidden second warm-up (single warm-up flow)
4. User can speak immediately after welcome ends

## Component Changes

### 1. `OpenWakeWordDetector` (No Changes Required)

The detector already has all necessary infrastructure:

- `warmUpComplete` flag
- `getWarmUpPromise()` method
- Warm-up timer (2.5s after buffers filled)
- Event emission (`'warmup-complete'`)

**No code changes needed** - just need to USE the existing API.

### 2. `InitUtil.js` - `setupWakeWordDetector()`

**Current implementation** (does NOT wait):
```javascript
async function setupWakeWordDetector() {
    const detector = new OpenWakeWordDetector(...);
    await detector.initialize();

    // Warm-up will happen automatically in background once mic starts feeding audio
    logger.info('✅ Detector initialized (warm-up will occur automatically)');

    return detector;  // ❌ Returns immediately, no warm-up wait
}
```

**New implementation** (waits for warm-up):
```javascript
async function setupWakeWordDetector() {
    const modelsDir = path.dirname(config.openWakeWord.modelPath);
    const modelFile = path.basename(config.openWakeWord.modelPath);
    const detector = new OpenWakeWordDetector(
        modelsDir,
        modelFile,
        config.openWakeWord.threshold,
        config.openWakeWord.embeddingFrames
    );
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

**Key changes**:
- Add `await detector.getWarmUpPromise()` with 10-second timeout
- Log "⏳ Waiting for detector warm-up..." (user visibility)
- Log "✅ Detector fully warmed up and ready" (confirmation)
- Graceful degradation if timeout occurs (warning, not error)

### 3. `InitUtil.js` - `startTTSWelcome()`

**Current implementation** (schedules reset):
```javascript
async function startTTSWelcome(detector, audioPlayer) {
    // ... TTS synthesis and playback setup ...

    playback.promise
        .then(() => {
            logger.debug('🔧 [STARTUP-DEBUG] startTTSWelcome: Playback completed');
            logger.info('✅ Welcome message spoken');
            logger.debug('🔧 [STARTUP-DEBUG] startTTSWelcome: Scheduling detector reset in 1000ms...');
            setTimeout(() => {
                logger.debug('🔧 [STARTUP-DEBUG] startTTSWelcome: Executing detector reset now');
                safeDetectorReset(detector, 'post-startup-tts');  // ❌ Triggers second warm-up
            }, 1000);
        })
        .catch(err => {
            // ...error handling...
        });
}
```

**New implementation** (no reset):
```javascript
async function startTTSWelcome(detector, audioPlayer) {
    // ... TTS synthesis and playback setup (unchanged) ...

    playback.promise
        .then(() => {
            logger.debug('🔧 [STARTUP-DEBUG] startTTSWelcome: Playback completed');
            logger.info('✅ Welcome message spoken');
            // REMOVED: Post-welcome reset (no longer needed with beep isolation)
        })
        .catch(err => {
            if (err.message.includes('cancelled')) {
                logger.info('🛑 Welcome message interrupted');
            } else {
                logger.error('❌ Failed to speak welcome message', {error: err.message});
            }
        });
}
```

**Key changes**:
- Remove `setTimeout()` that scheduled detector reset
- Remove `safeDetectorReset(detector, 'post-startup-tts')` call
- Simplify completion handler (just log, no side effects)

### 4. `main.js` - Startup Sequence (No Logic Changes)

The startup sequence in `main.js` does NOT need code changes, but the TIMING changes significantly:

**Before**:
- `await setupWakeWordDetector()` returns immediately (no wait)
- Welcome plays during Phase 6 (before detector is ready)
- Reset happens after Phase 7 (hidden from logs)

**After**:
- `await setupWakeWordDetector()` waits for warm-up (~4.7s total)
- Welcome plays during Phase 6 (AFTER detector is ready)
- No reset happens (single warm-up only)

The code structure remains the same, but behavior changes due to modified `setupWakeWordDetector()`.

## Data Flow

### Detector Warm-up Mechanism

```
Microphone starts feeding audio
         ↓
Audio chunks → detector.detect()
         ↓
Mel spectrogram buffers fill (76 frames)
         ↓
melBufferFilled = true (~2.2 seconds)
         ↓
Embedding buffers fill (16 frames for hey_jarvis)
         ↓
embeddingBufferFilled = true
         ↓
setTimeout(() => {
    warmUpComplete = true;
    emit('warmup-complete');
    _warmUpResolve();
}, 2500);  // Additional 2.5s stabilization
         ↓
getWarmUpPromise() resolves
         ↓
setupWakeWordDetector() returns
```

**Total time**: ~4.7 seconds (2.2s buffer fill + 2.5s stabilization)

### State Machine States During Startup

```
State: "startup"
├─ Microphone: Running, feeding detector
├─ Detector: Buffers filling → Warm-up → Ready
├─ Wake word detection: BLOCKED (startup guard)
├─ Welcome message: Playing (after warm-up completes)
└─ Transitions to: "listening" (via READY event)

State: "listening"
├─ Microphone: Running
├─ Detector: Processing chunks
├─ Wake word detection: ACTIVE
└─ Transitions to: "recording" (via TRIGGER event)
```

**Key insight**: State machine stays in "startup" during welcome playback, so TTS audio CANNOT trigger wake word detection (state guard prevents it).

## Error Handling

### Warm-up Timeout Scenario

```javascript
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
// Continue anyway (graceful degradation)
return detector;
```

**Behavior**:
- 10-second timeout prevents indefinite hang
- Warning logged (not error) - non-fatal
- System continues with potentially unstable detector
- User may experience initial false negatives (acceptable for demo)

### Microphone Not Started Scenario

**Potential issue**: If microphone doesn't start feeding audio, buffers never fill, warm-up never completes.

**Mitigation**: 10-second timeout ensures system doesn't hang forever. Manual testing will verify mic starts correctly.

### Reset Removal Impact

**Concern**: What if reset served a critical purpose we're unaware of?

**Mitigation**:
1. Comprehensive testing before/after removal
2. Git history analysis (reset was added as "clean buffers" workaround)
3. Beep isolation already prevents TTS feedback
4. Rollback plan if issues discovered

## Performance Characteristics

### Startup Time Comparison

| Scenario | Current | Proposed | Improvement |
|----------|---------|----------|-------------|
| Cold start (first run) | ~7.0s | ~4.5s | 36% faster |
| Warm start (subsequent) | ~7.0s | ~4.5s | 36% faster |
| User perceived readiness | Never (always gap) | Immediate | ∞ improvement |

### Memory Impact

**No change** - Removing reset doesn't affect memory usage:
- Detector buffers persist (same memory footprint)
- No additional allocations
- One fewer setTimeout timer

### CPU Impact

**Slight reduction**:
- One fewer detector reset (avoids buffer zeroing)
- One fewer warm-up timer (single vs double warm-up)
- Negligible difference (~1-2ms)

## Testing Strategy

### Unit Tests

1. **`setupWakeWordDetector()` waits for warm-up**:
   - Mock detector with delayed warm-up
   - Verify function doesn't return until warm-up completes
   - Verify timeout handling

2. **`startTTSWelcome()` does NOT reset**:
   - Verify detector.reset() is NOT called after playback
   - Verify no setTimeout scheduled

### Integration Tests

1. **Full startup sequence timing**:
   - Measure time from process start to "Voice Gateway ready"
   - Verify ~4.5 seconds (±0.5s)

2. **Wake word detection after startup**:
   - Trigger wake word immediately after welcome
   - Verify detection within 100ms

3. **No false triggers during welcome**:
   - Monitor wake word scores during welcome playback
   - Verify state machine blocks detection

### Manual Testing

1. **Cold start test**: Boot Raspberry Pi, run voice gateway, trigger wake word after welcome
2. **Stress test**: Rapid successive wake word triggers after startup
3. **Interruption test**: Trigger wake word DURING welcome message (verify interruption works)

## Rollback Plan

If testing reveals detector instability without reset:

1. **Keep warm-up wait** (still an improvement over current)
2. **Restore reset** in `startTTSWelcome()`
3. **Accept 7-9 second startup** as necessary
4. **Update documentation** to explain both warm-ups are needed
5. **Log second warm-up** so users understand the delay

## Migration Path

### Phase 1: Implement Changes
1. Update `setupWakeWordDetector()` to await warm-up
2. Remove reset from `startTTSWelcome()`
3. Update documentation

### Phase 2: Testing
1. Run automated test suite
2. Manual hardware testing (Raspberry Pi 5)
3. Verify no regressions

### Phase 3: Deployment
1. Merge to feature branch
2. Test in demo environment
3. Merge to main after validation

## Open Questions

### Q1: Does beep isolation cover all cases?

**Answer**: Beep isolation prevents audio recording during TTS playback. Additionally, state machine is in "startup" state during welcome, so wake word detection is blocked by state guard. Two layers of protection.

**Verification**: Test wake word scoring during welcome playback (should be zero detections).

### Q2: Are there other hidden purposes of the reset?

**Answer**: Git history and comments suggest reset was added to "clear noise" from welcome message. This was likely before beep isolation was implemented.

**Verification**: Compare detector behavior with/without reset across 100+ wake word triggers.

### Q3: What if microphone doesn't start quickly enough?

**Answer**: Microphone is started in Phase 5 (before detector warm-up). Buffers should fill during warm-up period. If not, 10-second timeout prevents hang.

**Verification**: Add startup timing logs to verify mic → buffer fill → warm-up sequence.

## Success Criteria

1. ✅ **Startup time**: 4.5 seconds (±0.5s) from process start to "Voice Gateway ready"
2. ✅ **Immediate responsiveness**: Wake word detected within 100ms of welcome ending
3. ✅ **No false positives**: Zero wake word triggers during welcome playback
4. ✅ **User satisfaction**: No "system not responding" complaints during presentation demo
5. ✅ **Code-docs alignment**: Implementation matches STARTUP_ORCHESTRATION.md
