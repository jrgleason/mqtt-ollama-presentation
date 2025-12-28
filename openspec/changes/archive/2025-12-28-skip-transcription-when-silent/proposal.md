# Proposal: skip-transcription-when-silent

## Priority
**Low** - Quality-of-life improvement, not blocking demo

## Why
**Problem:** When wake word is triggered without actual speech (false positive or beep feedback), the system still sends the silent audio to Whisper for transcription, wasting ~2-3 seconds and getting back noise transcriptions like "(bell dings)".

**Evidence from logs:**
```
🎤 Wake word detected! (score: 0.987)
🎙️ Recording started
🛑 Recording stopped (samples: 29376)
📝 You said: "(bell dings)"  ← Beep was transcribed!
🤖 AI Response: "Hello ! I'm Jarvis, your AI assistant..."
Total duration: 8.96s (over the <7s target)
```

**Impact:**
- Wastes 2-3 seconds per false trigger (transcription + AI processing)
- Confuses the AI (responds to noise instead of staying silent)
- Poor user experience (system "hears" things that weren't said)
- Increases overall interaction latency

**Root Cause:**
- VAD already detects if speech occurred (`hasSpokenDuringRecording` flag)
- But this information is **not checked** before calling `processVoiceInteraction()`
- System unconditionally transcribes any audio buffer `length > 0`

## What Changes

### 1. Check Speech Detection Before Transcription

**Current Behavior:**
```javascript
// main.js lines ~18-25
} else if (value !== 'recording' && isRecording) {
    isRecording = false;
    const audioSnapshot = new Float32Array(recordedAudio);
    recordedAudio = [];

    // Always processes if audio exists (PROBLEM!)
    if (audioSnapshot.length > 0) {
        orchestrator.processVoiceInteraction(audioSnapshot).catch(...);
    }
}
```

**New Behavior:**
```javascript
} else if (value !== 'recording' && isRecording) {
    isRecording = false;
    const audioSnapshot = new Float32Array(recordedAudio);
    recordedAudio = [];

    // Check if speech was detected during recording
    if (audioSnapshot.length > 0 && hasSpokenDuringRecording) {
        orchestrator.processVoiceInteraction(audioSnapshot).catch(...);
    } else if (audioSnapshot.length > 0 && !hasSpokenDuringRecording) {
        logger.info('⏩ Skipping transcription - no speech detected');
        // State machine automatically returns to listening (no action needed)
    }
}
```

### 2. Apply Same Logic to MicrophoneManager (Future-Proof)

When `MicrophoneManager.js` is eventually adopted, ensure it also checks `hasSpoken`:

```javascript
// MicrophoneManager.js lines 118-127
} else if (value !== 'recording' && this.recordingState.isRecording) {
    const audioSnapshot = this.recordingState.stopRecording();
    const hasSpoken = this.vadDetector.getState().hasSpokenDuringRecording;

    if (audioSnapshot.length > 0 && hasSpoken) {
        this.orchestrator.processVoiceInteraction(audioSnapshot).catch(...);
    } else if (audioSnapshot.length > 0 && !hasSpoken) {
        this.logger.info('⏩ Skipping transcription - no speech detected');
    }
}
```

## Impact

**Files Modified:**
- `apps/voice-gateway-oww/src/main.js` - Add speech detection check (current implementation)
- `apps/voice-gateway-oww/src/audio/MicrophoneManager.js` - Add speech detection check (future implementation)

**Breaking Changes:** None

**Performance Impact:**
- **Positive:** Saves 2-3 seconds on false wake word triggers
- **Positive:** Reduces unnecessary AI API calls
- **Positive:** Improves overall interaction latency

**User-Visible Changes:**
- System no longer responds to false wake word triggers
- Faster return to listening state when no speech detected
- Log message: "⏩ Skipping transcription - no speech detected"

## Dependencies

- Depends on existing `hasSpokenDuringRecording` flag in VAD logic ✅ (already exists)
- No new dependencies needed

## Risks

**Low Risk:**
- VAD already tracks `hasSpokenDuringRecording` reliably
- Change is additive (only adds a condition check)
- State machine handles missing transcription gracefully (transitions to listening automatically)

**Edge Cases to Consider:**
1. User whispers very quietly (below silence threshold) → Will skip transcription
   - **Mitigation:** This is correct behavior (VAD couldn't detect speech)
2. Very short utterances (<700ms) during grace period → May skip transcription
   - **Mitigation:** Existing `MIN_SPEECH_SAMPLES` check handles this

## Alternatives Considered

### Alternative 1: Lower VAD sensitivity
- **Rejected:** Would increase false positives, making wake word too sensitive

### Alternative 2: Add pre-transcription energy check
- **Rejected:** Redundant - VAD already does this check in real-time during recording

### Alternative 3: Let TranscriptionService handle it
- **Status:** Already implemented! `TranscriptionService` checks audio energy before transcription
- **Why still needed:** That check happens AFTER state transition to `processing`, wasting time

## Related Work

- ✅ **improve-boot-and-communication-reliability** - Addresses beep feedback loop (prevents false wake words)
- This proposal addresses the **consequence** when false wake words still occur

## Success Criteria

1. ✅ False wake word triggers do NOT transcribe or query AI
2. ✅ Log shows "⏩ Skipping transcription - no speech detected" for silent recordings
3. ✅ Valid speech interactions still process normally (no regression)
4. ✅ Average false trigger latency reduced from ~8s to <1s (just state transition time)
