# Beep Audio Isolation System

## Overview

The beep audio isolation system prevents audio feedback loops caused by the microphone capturing system-generated beeps during recording. Without this system, beeps would be recorded along with user speech and transcribed by Whisper as `[BEEPING]`, potentially triggering false interactions.

## Problem Statement

**Before beep isolation:**
1. Wake word detected → System plays beep
2. Microphone still recording → Beep gets captured in audio
3. Whisper transcribes: "turn on the lights [BEEPING]"
4. AI processes the transcription including `[BEEPING]` text
5. Potential for feedback loops or corrupted transcriptions

## Solution

The beep isolation system tracks the state machine's recording state and suppresses beep playback during the `recording` state only.

## Architecture

### State Machine States

The voice gateway uses XState v5 with these states:
- `startup` - Initial state, microphone muted
- `listening` - Wake word detection active
- `recording` - User speech being captured (BEEPS SUPPRESSED)
- `processing` - Transcription and AI query in progress
- `cooldown` - Brief pause before returning to listening

### Implementation Components

#### 1. State Tracking (`main.js`)

```javascript
// Track state machine recording state for beep isolation
let stateIsRecording = false;

voiceService.subscribe((state) => {
    const value = state.value;
    // Track recording state for beep isolation (prevent beep feedback loops)
    stateIsRecording = (value === 'recording');
    // ... rest of state handling
});
```

#### 2. Recording Checker Callback (`main.js`)

```javascript
// Create isRecording checker callback for beep isolation
let isRecordingChecker = null;
const getIsRecording = () => isRecordingChecker ? isRecordingChecker() : false;

// Pass to orchestrator
const orchestrator = new VoiceInteractionOrchestrator(
    config, logger, toolExecutor, voiceService, getIsRecording
);

// setupMic provides the checker after state subscription is established
const micInstance = setupMic(voiceService, orchestrator, detector, (checker) => {
    isRecordingChecker = checker;
});
```

#### 3. Wake Word Beep Suppression (`main.js`, line 260)

```javascript
// Only play wake word beep if not currently recording (prevents beep feedback)
if (!stateIsRecording) {
    audioPlayer.play(BEEPS.wakeWord).catch(err => logger.debug('Beep failed', {error: errMsg(err)}));
} else {
    logger.debug('🔇 Suppressed wake word beep (recording in progress)');
}
```

#### 4. Processing/Response Beep Suppression (`VoiceInteractionOrchestrator.js`)

```javascript
// Processing beep (line 109)
if (!this.isRecordingChecker()) {
    await this.audioPlayer.play(this.beep.BEEPS.processing);
} else {
    this.logger.debug('🔇 Suppressed processing beep (recording in progress)');
}

// Response beep (line 143)
if (!this.isRecordingChecker()) {
    await this.audioPlayer.play(this.beep.BEEPS.response);
} else {
    this.logger.debug('🔇 Suppressed response beep (recording in progress)');
}
```

## Beep Types and States

| Beep Type | Plays In States | Suppressed In State | Purpose |
|-----------|----------------|---------------------|---------|
| Wake Word | `listening`, `cooldown` | `recording` | Confirms wake word detection |
| Processing | `processing` | `recording` | Indicates AI is thinking |
| Response | `cooldown` | `recording` | Marks end of AI response |
| Error | Any error state | `recording` | Signals an error occurred |

## Key Design Decisions

### 1. Only Suppress During Recording State

Beeps are ONLY suppressed during the `recording` state. All other states (listening, processing, cooldown) allow beep playback normally.

**Rationale:** The recording state is the only time the microphone is actively capturing audio for transcription. Other states don't have this risk.

### 2. Wake Word Interruption Still Works

Wake word detection during `cooldown` state (TTS playback) is a feature that allows users to interrupt the AI mid-response. The beep still plays because:
- Cooldown is NOT a recording state
- The beep acknowledges the interruption
- No feedback loop risk (not recording yet)

### 3. Callback-Based State Sharing

The `isRecording` checker is passed as a callback rather than shared state to avoid tight coupling and ensure the orchestrator always has the latest state.

### 4. Fail-Safe Default

If the `isRecordingChecker` is null, it defaults to returning `false`, allowing beeps to play. This ensures the system degrades gracefully if initialization fails.

## Testing

The beep isolation system is tested in `/tests/beep-isolation.test.js` with 14 test cases covering:

- Wake word beep suppression during recording
- Processing beep suppression during recording
- Response beep suppression during recording
- State machine recording flag tracking
- Wake word interruption during cooldown (should NOT suppress)
- Error beep suppression
- Complete interaction scenario

**Run tests:**
```bash
npm test tests/beep-isolation.test.js
```

## Monitoring and Debugging

### Log Messages

When beeps are suppressed, debug logs indicate:
```
🔇 Suppressed wake word beep (recording in progress)
🔇 Suppressed processing beep (recording in progress)
🔇 Suppressed response beep (recording in progress)
```

### Verification

To verify beep isolation is working:
1. Trigger wake word
2. Check logs for beep suppression messages during recording state
3. Verify transcriptions don't contain `[BEEPING]` text
4. Confirm beeps play normally in non-recording states

## Performance Impact

**Minimal:** The beep isolation adds:
- One boolean flag check per beep playback (~4 checks per interaction)
- One state update per state machine transition (~4 transitions per interaction)
- No audio processing overhead
- No latency impact

## Future Enhancements

Potential improvements:
1. **Audio ducking:** Reduce microphone gain during beep playback instead of suppression
2. **Beep filtering:** Apply DSP to filter beep frequencies from recorded audio
3. **Adaptive thresholds:** Adjust VAD thresholds based on beep playback timing
4. **Beep alternatives:** Use visual indicators (LED) instead of audio beeps

## Related Files

- `/apps/voice-gateway-oww/src/main.js` - State tracking and wake word beep
- `/apps/voice-gateway-oww/src/services/VoiceInteractionOrchestrator.js` - Processing/response beep suppression
- `/apps/voice-gateway-oww/src/util/VoiceGateway.js` - State machine definition
- `/apps/voice-gateway-oww/tests/beep-isolation.test.js` - Comprehensive tests
- `/apps/voice-gateway-oww/src/util/BeepUtil.js` - Beep audio generation
- `/apps/voice-gateway-oww/src/audio/AudioPlayer.js` - Beep playback

## References

- XState v5 documentation: https://stately.ai/docs/xstate
- Voice Activity Detection (VAD) thresholds in `main.js` lines 69-144
- State machine diagram in `docs/voice-gateway-troubleshooting.md`
