# Proposal: Add Voice Interruption Support

## Why

The voice gateway cannot handle barge-in/interruption during TTS playback, preventing natural conversation flow where users can interrupt the system mid-sentence.

## What Changes

- Add `playInterruptible()` method to AudioPlayer with platform-specific process cancellation (afplay/aplay)
- Add `cancelActivePlayback()` method to VoiceInteractionOrchestrator to stop active TTS
- Track active playback handle in orchestrator to enable interruption
- Add AbortController support to streaming TTS for mid-stream cancellation
- Enable wake word detection during cooldown state to trigger interruptions
- Update welcome message to use cancellable playback
- Improve logging clarity: "⏸️ Cooldown (can interrupt)" instead of generic cooldown message
- Remove redundant "Listening for wake word" logs from detector

## Problem Statement

The voice gateway cannot handle barge-in/interruption during TTS playback. Users expect natural conversation where they can interrupt the system mid-sentence (e.g., "Hey Jarvis, not that but this"). This applies to **all TTS playback** including the welcome message, AI responses, and streaming responses.

### Current Behavior

**Scenario 1: Welcome Message**
**System:** "Hello, I am Jarvis..."
**User interrupts:** "Hey Jarvis, what devices do I have?"
**Result:** Welcome continues playing, new interaction queued after welcome finishes

**Scenario 2: AI Response**
**User says:** "Hey Jarvis, what's the weather?"
**System:** Starts speaking response...
**User interrupts:** "Hey Jarvis, actually tell me about devices instead"
**Result:** Wake word is detected but system continues speaking, new interaction queued after current TTS finishes

### Desired Behavior

**Any TTS playback (welcome, AI response, streaming):**
**User interrupts:** "Hey Jarvis, [new command]"
**Result:** System immediately stops speaking, cancels ongoing TTS/streaming, starts new interaction

### Additional Issue: Confusing Logs

```
🔊 Playing audio {durationMs: 2273}
🎧 Listening for wake word...  ← Appears DURING playback (confusing!)
🔎 OWW detection tick           ← Detection IS active (correct)
```

Users see "Listening for wake word..." while TTS is playing, making it unclear if they can interrupt.

## Proposed Solution

Add interruption handling that:
1. ✅ Cancels ongoing TTS when wake word detected during playback
2. ✅ Stops audio playback immediately
3. ✅ Cancels Anthropic streaming (if active)
4. ✅ Starts new interaction with interrupted context
5. ✅ Improves logging clarity ("Playing (can interrupt)" vs "Listening")

### Key Design Principles

- **Wake word detection stays active** during TTS (for interruption)
- **Microphone continues recording** during TTS (for pre-roll buffer)
- **Audio playback is cancellable** (not fire-and-forget)
- **Streaming TTS is cancellable** (AbortController)

## Architecture Changes

### State Machine (Minimal Changes)

**Keep existing states** - no `playback` state needed!

Add **interruption transitions**:
```
listening → recording (TRIGGER) ← Existing
recording → processing → cooldown → listening ← Existing

NEW: Allow TRIGGER event during cooldown:
cooldown → recording (TRIGGER - interruption!)
```

### AudioPlayer Enhancement

Make playback **cancellable**:

**Current (fire-and-forget):**
```javascript
await audioPlayer.play(buffer); // Blocks until complete
```

**Proposed (cancellable):**
```javascript
const playback = await audioPlayer.playInterruptible(buffer);
// Later, if wake word detected:
playback.cancel(); // Stops playback immediately
```

### Streaming TTS Cancellation

**Current:** No way to stop Anthropic streaming mid-response

**Proposed:** Use AbortController:
```javascript
const abortController = new AbortController();
const tts = await streamSpeak('', { signal: abortController.signal });

// If interrupted:
abortController.abort(); // Stops streaming
```

## Implementation Overview

### 1. Add Cancellable Audio Playback

**File:** `src/audio/AudioPlayer.js`

```javascript
async playInterruptible(pcmAudio) {
  this.currentPlayback = { cancelled: false };

  // Platform-specific cancellable playback
  // On cancel: kill child process (afplay/aplay)

  return {
    cancel: () => { this.currentPlayback.cancelled = true; },
    promise: this.play(pcmAudio),
  };
}
```

### 2. Track Active Playback in Orchestrator

**File:** `src/services/VoiceInteractionOrchestrator.js`

```javascript
constructor() {
  // ...
  this.activePlayback = null; // Track current TTS playback
}

async _speakResponse(aiResponse) {
  const audioBuffer = await this.elevenLabsTTS.synthesizeSpeech(aiResponse);

  // Start cancellable playback
  this.activePlayback = await this.audioPlayer.playInterruptible(audioBuffer);

  await this.activePlayback.promise;
  this.activePlayback = null;
}

// NEW: Interrupt method
interrupt() {
  if (this.activePlayback) {
    this.logger.info('🛑 Interrupting TTS playback');
    this.activePlayback.cancel();
    this.activePlayback = null;
  }
}
```

### 3. Handle Interruption in main.js

**File:** `src/main.js`

When wake word detected during cooldown:

```javascript
const snapshot = getServiceSnapshot(voiceService);

if (snapshot.matches('cooldown')) {
  // Interrupt ongoing playback
  orchestrator.interrupt();

  logger.info('🎤 Wake word detected during playback (interruption)!');
  // State machine will handle transition to recording
}
```

### 4. Fix Confusing Logs

**Current log sources:**
- `VoiceGateway.js:25` - State machine entry: "🎧 Listening for wake word..."
- `OpenWakeWordDetector.js:108` - Detector ready: "🎧 Listening for wake word..."

**Proposed:**
- Remove redundant detector log
- Update state machine logs to reflect interruptibility:
  - `cooldown` entry: "⏸️ Cooldown (can interrupt)"
  - `listening` entry: "🎧 Listening for wake word"

## Testing Strategy

### Manual Tests

1. **Interruption during welcome message**
   - Start system, trigger wake word during "Hello, I am Jarvis..."
   - **Verify:** Welcome message stops, new interaction starts

2. **Interruption during AI response**
   - Ask question, trigger wake word during AI response TTS
   - **Verify:** TTS stops immediately, new interaction starts

3. **Interruption during streaming TTS (Anthropic)**
   - Configure Anthropic provider
   - Ask question, interrupt during streaming response
   - **Verify:** Streaming stops, audio stops, new interaction starts

4. **No interruption during listening state**
   - Wait for "🎧 Listening for wake word" message
   - Trigger wake word
   - **Verify:** No interruption (normal flow)

5. **Conversation context preserved**
   - Ask "What's the weather?"
   - Interrupt: "Hey Jarvis, actually tell me about devices"
   - **Verify:** Both messages added to conversation history

### Automated Tests (Future)

- Unit test: AudioPlayer.playInterruptible() cancellation
- Unit test: Orchestrator.interrupt() stops active playback
- Integration test: Wake word during cooldown triggers interruption

## Impact Assessment

### Files Modified
- `src/audio/AudioPlayer.js` - Add playInterruptible()
- `src/services/VoiceInteractionOrchestrator.js` - Track/cancel active playback
- `src/main.js` - Handle interruption trigger
- `src/streamingTTS.js` - Add AbortController support
- `src/util/VoiceGateway.js` - Update cooldown log message
- `src/util/OpenWakeWordDetector.js` - Remove redundant log

### Breaking Changes
None. Interruption is additive feature.

### Performance Impact
Minimal. Adds cancellation checks (~1ms overhead).

## Success Criteria

✅ User can interrupt TTS by triggering wake word during playback
✅ TTS stops immediately (< 100ms) upon interruption
✅ Streaming TTS cancels mid-response
✅ Logs clearly indicate when system can be interrupted
✅ No "Listening..." messages appear during TTS playback
✅ Conversation context includes interrupted exchanges
✅ No audio glitches or process leaks from cancellation

## Notes

**Why not block wake word detection during TTS?**
Because that prevents the natural conversational flow users expect. Real assistants (Alexa, Siri, Google) allow interruption - we should too.

**What about echo cancellation?**
Not needed if we handle interruption properly. Speaker-to-mic feedback is actually *desirable* for interruption detection.

**Should we add a "don't interrupt" mode?**
Future enhancement. Some users might want to disable interruption for certain responses (e.g., important alerts).
