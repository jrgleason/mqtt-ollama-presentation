# Startup Timing Gap - Resolution

## Issue
Users heard the welcome message "Hello, I am Jarvis. How can I help?" but could not trigger wake word commands for 2.5-3.5 seconds afterward due to a second detector warm-up period.

## Root Cause
1. Audio was being **discarded** during startup state instead of fed to detector
2. Post-welcome detector reset triggered unnecessary second warm-up
3. Warm-up wait was missing from main.js startup sequence

## Solution Implemented (2025-12-28)

### Code Changes

**1. Feed audio to detector during startup** (`main.js:247-256`)
```javascript
// During startup: feed audio to detector for warm-up, but don't check for wake words
if (inStartup) {
    const chunk = new Float32Array(audioBuffer.slice(0, CHUNK_SIZE));
    audioBuffer = audioBuffer.slice(CHUNK_SIZE);
    try {
        await detector.detect(chunk); // Feed audio for warm-up, ignore score
    } catch (err) {
        logger.error('Wake word detection error during startup', {error: errMsg(err)});
    }
    continue; // Don't check for wake words during startup
}
```

**2. Add warm-up wait in main.js** (`main.js:469-488`)
```javascript
// Phase 5.5: Detector Warm-up Wait
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
```

**3. Remove post-welcome reset** (`InitUtil.js:116-118`)
```javascript
// REMOVED: Post-welcome detector reset (no longer needed with warm-up wait)
// The detector is already warmed up before welcome message plays
// Beep isolation prevents TTS audio from being recorded
```

**4. Add ready-to-listen beep** (`BeepUtil.js:22`, `InitUtil.js:120-131`)
- Added 1000Hz, 300ms beep after welcome message
- Provides auditory confirmation system is ready

**5. Fix state machine stuck on quiet audio** (`main.js:224`)
```javascript
// Transition back to listening state when no speech detected
voiceService.send({type: 'INTERACTION_COMPLETE'});
```

### Results

**Before:**
- Startup: ~7 seconds
- Two warm-up periods (2.5s each)
- Gap: 2.5-3.5s after welcome before ready
- State machine could get stuck

**After:**
- Startup: ~4.5 seconds ✅
- One warm-up period (2.5s)
- Ready immediately after beep ✅
- State machine properly recovers ✅

## Timeline Comparison

**OLD (Broken):**
```
T+0s:     Mic starts → audio DISCARDED
T+0.5s:   Welcome message plays
T+2.5s:   Welcome ends
T+3.5s:   Post-welcome reset
T+4.0s:   First warm-up complete (wasted!)
T+4.0s:   Buffers refill
T+4.5s:   Second warm-up starts
T+7.0s:   ACTUALLY ready (2.5-3.5s gap!)
```

**NEW (Fixed):**
```
T+0s:     Mic starts → audio FED TO DETECTOR
T+2.5s:   Warm-up complete ✅
T+2.5s:   Welcome: "Hello, I am Jarvis..."
T+4.5s:   Welcome ends
T+4.5s:   Ready beep 🔔
T+4.8s:   ACTUALLY ready (no gap!)
```

## Testing Performed
- ✅ Warm-up completes before welcome message
- ✅ Ready beep plays at correct time
- ✅ Wake word detection works immediately after beep
- ✅ State machine recovers from quiet audio
- ✅ Startup time: ~4.5 seconds (down from 7s)

## Related Changes
- Proposal: `openspec/changes/archive/2025-12-28-fix-startup-timing-gap/`
- Also archived: `simplify-tool-management` (same session)
