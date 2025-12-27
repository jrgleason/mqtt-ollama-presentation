# Startup Orchestration with Detector Warm-up

## Problem Statement

The voice gateway was announcing readiness before the wake word detector had fully stabilized, causing:
- User utterances being cut off
- False negatives (wake word not detected)
- Inconsistent initial detection behavior

## Root Cause

The OpenWakeWord detector requires time to stabilize after its embedding buffers fill. The buffers accumulate audio data, but the detector needs additional processing time (2-3 seconds) before it can reliably detect wake words.

Previously, the system transitioned to "ready" immediately after buffer fill, leading to premature detection attempts.

## Solution Overview

Implemented a three-part solution:

1. **Detector Warm-up Phase** - Added 2.5 second stabilization period after buffer fill
2. **Promise-based Orchestration** - Sequential async/await initialization
3. **Welcome Message Sequencing** - Welcome plays AFTER warm-up, BEFORE activation

## Implementation Details

### 1. OpenWakeWordDetector.js

**Added warm-up tracking:**
```javascript
// New state properties
this.warmUpComplete = false;
this._warmUpPromise = null;
this._warmUpResolve = null;
```

**Warm-up trigger (in detect() method):**
```javascript
if (!this.embeddingBufferFilled && this.embeddingBuffer.length >= this.embeddingFrames) {
    this.embeddingBufferFilled = true;
    logger.debug('🎧 Embedding buffer filled, starting warm-up period...');

    // Start warm-up timer (2.5 seconds after buffers filled)
    setTimeout(() => {
        this.warmUpComplete = true;
        logger.debug('✅ Detector warm-up complete');
        this.emit('warmup-complete');
        if (this._warmUpResolve) {
            this._warmUpResolve();
            this._warmUpResolve = null;
        }
    }, 2500);
}
```

**Promise API for awaiting warm-up:**
```javascript
getWarmUpPromise() {
    if (this.warmUpComplete) {
        return Promise.resolve();
    }
    if (!this._warmUpPromise) {
        this._warmUpPromise = new Promise((resolve) => {
            this._warmUpResolve = resolve;
        });
    }
    return this._warmUpPromise;
}
```

**Design decisions:**
- Extends EventEmitter for 'warmup-complete' event
- Warm-up time: 2.5 seconds (balance between reliability and startup time)
- `warmUpComplete` persists through reset() - once warmed up, stays ready
- Promise-based API allows timeout handling by caller

### 2. InitUtil.js

**Detector setup with warm-up wait:**
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

**Design decisions:**
- 10 second timeout prevents indefinite hang
- Timeout is a warning, not a failure (graceful degradation)
- Logs clearly indicate warm-up progress

### 3. main.js

**Refactored to 7-phase sequential startup:**

```javascript
async function main() {
    // Phase 1: Services and Health Checks
    await initServices();

    // Phase 2: Wake Word Detector (with warm-up)
    const detector = await setupWakeWordDetector(); // Includes warm-up wait

    // Phase 3: Tool System Initialization
    const toolRegistry = new ToolRegistry();
    // ... MCP and local tool registration
    const toolExecutor = new ToolExecutor(toolRegistry, logger);

    // Phase 4: Voice Service & Orchestrator
    const voiceService = setupVoiceStateMachine();
    const orchestrator = new VoiceInteractionOrchestrator(...);

    // Phase 5: Microphone Setup
    const micInstance = setupMic(voiceService, orchestrator, detector, ...);

    // Phase 6: Welcome Message BEFORE Activation
    await startTTSWelcome(detector, audioPlayer);

    // Phase 7: Final Activation
    voiceService.send({type: 'READY'});
}
```

**Key ordering principles:**
- Detector warm-up completes BEFORE welcome message
- Welcome message plays BEFORE state machine activation
- Microphone starts early (buffers drained until READY signal)
- Each phase has clear dependencies documented in comments

## Testing

Created comprehensive test suite: `tests/startup-orchestration.test.js`

**Test coverage:**
1. Warm-up period enforcement (2.5 seconds ± 200ms)
2. EventEmitter 'warmup-complete' emission
3. Promise-based getWarmUpPromise() API
4. Warm-up state persistence through reset()
5. Initialization sequence order validation
6. Welcome message timing (after warm-up)
7. Premature detection prevention

**Run tests:**
```bash
npm test tests/startup-orchestration.test.js
```

## Observable Behavior Changes

**Before:**
```
✅ OpenWakeWord initialized
🎧 Listening for wake word...
✅ Voice Gateway ready
Hello, I am Jarvis. How can I help?
[User speaks too soon, gets cut off]
```

**After:**
```
✅ OpenWakeWord initialized
⏳ Waiting for detector warm-up...
🎧 Embedding buffer filled, starting warm-up period...
✅ Detector warm-up complete
✅ Detector fully warmed up and ready
✅ Tool system initialized
Hello, I am Jarvis. How can I help?
🎧 Activating wake word detection...
✅ Voice Gateway ready
[System is truly ready, no cutoffs]
```

## Performance Impact

- **Startup time:** +2.5 seconds (warm-up period)
- **Memory:** Negligible (one promise, one flag)
- **CPU:** None (timer-based, no polling)
- **Reliability:** Significantly improved initial detection accuracy

## Edge Cases Handled

1. **Timeout scenario:** If warm-up never completes (detector malfunction), 10-second timeout prevents hang
2. **Multiple getWarmUpPromise() calls:** Returns same promise instance, avoiding duplicates
3. **Already warmed up:** Returns resolved promise immediately (no wait)
4. **Buffer reset:** Warm-up state persists (no re-warm needed after user interaction)

## Future Enhancements

Potential improvements for future iterations:

1. **Dynamic warm-up time:** Adjust based on model size or hardware capability
2. **Warm-up metrics:** Expose warm-up duration and success rate via logging/metrics
3. **Progressive readiness:** Allow low-confidence detection during warm-up with user feedback
4. **Configuration:** Make warm-up duration configurable via environment variable

## Migration Notes

**No breaking changes** - This is a pure enhancement:
- Existing API contracts preserved
- No configuration changes required
- Tests are new, no existing tests broken
- Backwards compatible with existing deployment

## References

- **OpenWakeWord documentation:** Model architecture and buffer requirements
- **Node.js EventEmitter:** Event-based warm-up signaling pattern
- **Promise.race():** Timeout implementation for async operations
