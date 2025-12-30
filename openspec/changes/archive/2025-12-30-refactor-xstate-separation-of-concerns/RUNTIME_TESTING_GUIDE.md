# Runtime Testing Guide: XState Refactoring

## Purpose

This guide provides comprehensive manual testing procedures to validate the XState refactoring. These tests must pass before the proposal can be marked as complete.

## Prerequisites

1. Voice gateway service must be built and configured
2. Wake word model must be downloaded
3. Microphone must be functional
4. TTS must be configured (ElevenLabs or Piper)
5. AI provider must be available (Ollama or Anthropic)

## Test Environment Setup

```bash
cd apps/voice-gateway-oww

# Ensure dependencies are installed
npm install

# Check configuration
cat .env

# Start the service (in separate terminal)
npm run dev
```

## Phase 1 Tests: WakeWordMachine

### Test 1.1: Startup Sequence Timing
**Objective**: Verify welcome message plays ONLY after detector warm-up completes

**Steps**:
1. Start voice gateway service
2. Observe startup logs

**Expected Behavior**:
```
[WakeWordMachine] State: off - detector not initialized
[WakeWordMachine] State: warming-up - buffers filling
✅ Detector warm-up complete
[WakeWordMachine] State: ready - listening for wake word
🔧 [STARTUP-DEBUG] Phase 6: WakeWordMachine ready, playing welcome message...
✅ Welcome message spoken
```

**Success Criteria**:
- ✅ "Detector warm-up complete" appears exactly ONCE
- ✅ Welcome message starts AFTER "WakeWordMachine ready"
- ✅ No race condition warnings
- ✅ Welcome message is not interrupted by startup processes

**Validation**: PASS / FAIL

---

### Test 1.2: Wake Word Detection After Startup
**Objective**: Verify user can trigger wake word immediately after welcome message

**Steps**:
1. Start voice gateway service
2. Wait for welcome message to complete
3. Immediately say wake word ("Hey Jarvis" or configured phrase)
4. Observe detection latency

**Expected Behavior**:
```
✅ Welcome message spoken
🎤 Wake word detected! { wakeWord: 'Hey Jarvis', score: '0.950' }
🎙️ Recording started
```

**Success Criteria**:
- ✅ Wake word detected within 1 second of speaking
- ✅ No "detector not ready" errors
- ✅ Recording starts immediately
- ✅ No awkward gaps or delays

**Validation**: PASS / FAIL

---

### Test 1.3: Detector State Persistence
**Objective**: Verify detector stays warm after first warm-up (no redundant resets)

**Steps**:
1. Start voice gateway service
2. Complete first interaction (wake word → query → TTS response)
3. Observe logs for detector reset messages
4. Trigger second wake word immediately after first response

**Expected Behavior**:
- First interaction completes normally
- NO "Detector reset" messages in logs
- Second wake word triggers immediately

**Success Criteria**:
- ✅ Only one "Detector warm-up complete" message during entire session
- ✅ No detector resets between interactions
- ✅ Wake word detection works consistently across multiple interactions

**Validation**: PASS / FAIL

---

## Phase 2 Tests: PlaybackMachine

### Test 2.1: TTS Playback State Tracking
**Objective**: Verify PlaybackMachine correctly tracks TTS playback

**Steps**:
1. Trigger wake word
2. Ask a question that generates a long TTS response (>5 seconds)
3. Observe PlaybackMachine state transitions in logs

**Expected Behavior**:
```
[PlaybackMachine] State: playing - tts playback active
✅ AI response playback complete
[PlaybackMachine] State: cooldown - waiting before next interaction
[PlaybackMachine] Cooldown complete
[PlaybackMachine] State: idle - ready for playback
```

**Success Criteria**:
- ✅ PlaybackMachine enters 'playing' state during TTS
- ✅ PlaybackMachine enters 'cooldown' after TTS completes
- ✅ PlaybackMachine returns to 'idle' after cooldown (1.5s default)

**Validation**: PASS / FAIL

---

### Test 2.2: Interruption (Barge-In) During TTS
**Objective**: Verify wake word can interrupt active TTS playback

**Steps**:
1. Trigger wake word
2. Ask a question that generates a long TTS response (>10 seconds)
3. While TTS is playing, say wake word again (interrupt)
4. Observe interruption behavior

**Expected Behavior**:
```
[PlaybackMachine] State: playing - tts playback active
🎤 Wake word detected during playback (interruption)!
🛑 Cancelling active playback via PlaybackMachine
[PlaybackMachine] State: interrupted - playback cancelled
[PlaybackMachine] State: idle - ready for playback
🎙️ Recording started
```

**Success Criteria**:
- ✅ TTS playback stops immediately when wake word detected
- ✅ PlaybackMachine transitions: playing → interrupted → idle
- ✅ New recording session starts without errors
- ✅ No audio artifacts or glitches during interruption

**Validation**: PASS / FAIL

---

### Test 2.3: Beep Isolation During Playback
**Objective**: Verify beeps don't play during TTS playback

**Steps**:
1. Trigger wake word (wake word beep plays)
2. Ask a question (processing beep plays before AI query)
3. Observe TTS playback (should be no beeps during TTS)
4. After TTS completes, response beep should play

**Expected Behavior**:
- Wake word beep: PLAYS
- Processing beep: PLAYS
- Beeps during TTS: DO NOT PLAY
- Response beep: PLAYS

**Success Criteria**:
- ✅ No beeps interrupt TTS playback
- ✅ Beeps play at appropriate times (not during recording or playback)

**Validation**: PASS / FAIL

---

## Phase 3 Tests: RecordingMachine

### Test 3.1: Recording State Tracking
**Objective**: Verify RecordingMachine correctly tracks recording sessions

**Steps**:
1. Trigger wake word
2. Speak a short query (2-3 seconds)
3. Observe RecordingMachine state transitions

**Expected Behavior**:
```
[RecordingMachine] State: recording - capturing audio
✅ Speech detected in recording
[RecordingMachine] Silence detected, stopping recording
[RecordingMachine] State: processing - finalizing audio buffer
[RecordingMachine] State: idle - ready to record
```

**Success Criteria**:
- ✅ RecordingMachine enters 'recording' state after wake word
- ✅ RecordingMachine detects speech
- ✅ RecordingMachine stops on silence (VAD working)
- ✅ RecordingMachine returns to 'idle' after processing

**Validation**: PASS / FAIL

---

### Test 3.2: VAD Silence Detection
**Objective**: Verify Voice Activity Detection stops recording after silence

**Steps**:
1. Trigger wake word
2. Speak query, then pause for 2+ seconds
3. Observe recording stop timing

**Expected Behavior**:
- Recording stops ~1.5 seconds after you stop speaking (trailing silence threshold)
- No audio cutoff mid-sentence

**Success Criteria**:
- ✅ Recording stops after trailing silence period (1500ms default)
- ✅ Full utterance is captured (no cutoff)
- ✅ Recording doesn't wait unnecessarily long

**Validation**: PASS / FAIL

---

### Test 3.3: Max Recording Length
**Objective**: Verify recording stops after maximum utterance length

**Steps**:
1. Trigger wake word
2. Speak continuously for >10 seconds (or configured max length)
3. Observe automatic recording stop

**Expected Behavior**:
```
⏱️ Max recording length reached
[RecordingMachine] Max recording length reached
[RecordingMachine] State: processing - finalizing audio buffer
```

**Success Criteria**:
- ✅ Recording stops at max length (10s default)
- ✅ Audio buffer is processed despite hitting limit
- ✅ No memory overflow or crashes

**Validation**: PASS / FAIL

---

### Test 3.4: Beep Isolation During Recording
**Objective**: Verify beeps don't play during audio recording

**Steps**:
1. Trigger wake word (wake word beep plays)
2. Start speaking immediately
3. Speak for 2-3 seconds
4. Observe no beeps during recording

**Expected Behavior**:
- Wake word beep: PLAYS
- Beeps during recording: DO NOT PLAY
- Processing beep: PLAYS (after recording stops)

**Success Criteria**:
- ✅ No beeps play during recording session
- ✅ Beep isolation prevents feedback loops

**Validation**: PASS / FAIL

---

## Integration Tests: All Machines Together

### Test INT-1: Full Voice Interaction Cycle
**Objective**: Verify complete interaction works with all machines

**Steps**:
1. Start voice gateway
2. Wait for welcome message
3. Trigger wake word
4. Ask: "What time is it?"
5. Listen to response
6. Trigger wake word again immediately after response
7. Ask another question

**Expected Behavior**:
```
[Startup] All machines initialized
[WakeWordMachine] ready → triggered → ready
[RecordingMachine] idle → recording → processing → idle
[Orchestrator] Processing voice interaction
[PlaybackMachine] idle → playing → cooldown → idle
[WakeWordMachine] ready → triggered → ready
[RecordingMachine] idle → recording → processing → idle
...
```

**Success Criteria**:
- ✅ Entire cycle completes in <7 seconds (target latency)
- ✅ All state machines coordinate correctly
- ✅ No state conflicts or errors
- ✅ Second interaction works smoothly after first

**Validation**: PASS / FAIL

---

### Test INT-2: Multiple Rapid Interactions
**Objective**: Verify system handles rapid successive interactions

**Steps**:
1. Trigger wake word, ask query 1
2. Immediately after TTS starts, trigger wake word again (interrupt)
3. Ask query 2
4. Let query 2 complete normally
5. Trigger wake word, ask query 3

**Expected Behavior**:
- Query 1 TTS is interrupted cleanly
- Query 2 processes without errors
- Query 3 processes without errors
- All state machines remain synchronized

**Success Criteria**:
- ✅ No "state machine conflict" errors
- ✅ Each query is handled correctly
- ✅ Interruption works cleanly
- ✅ System remains responsive throughout

**Validation**: PASS / FAIL

---

### Test INT-3: Error Recovery
**Objective**: Verify system recovers from errors gracefully

**Steps**:
1. Trigger wake word with no speech (false trigger)
2. Observe recovery behavior
3. Trigger wake word again with valid speech
4. Verify normal operation

**Expected Behavior**:
```
⏩ Skipping transcription - no speech detected
[RecordingMachine] State: idle
[WakeWordMachine] State: ready
[Normal operation resumes]
```

**Success Criteria**:
- ✅ False trigger doesn't crash system
- ✅ All machines return to idle/ready states
- ✅ Next interaction works normally
- ✅ No lingering error state

**Validation**: PASS / FAIL

---

## Phase 4 Tests: voiceMachine Removal Validation

### Test 4.1: No Legacy Machine References
**Objective**: Verify voiceMachine is completely removed

**Steps**:
1. Search codebase for `voiceMachine` references
2. Search codebase for `VoiceGateway.js` imports
3. Verify no legacy state checks

**Validation Command**:
```bash
grep -r "voiceMachine" src/
grep -r "VoiceGateway.js" src/
grep -r "voiceService" src/ | grep -v "// Old"
```

**Success Criteria**:
- ✅ No `voiceMachine` references (except in tests/docs)
- ✅ No imports from `VoiceGateway.js`
- ✅ All state checks use new machines

**Validation**: PASS / FAIL

---

### Test 4.2: All States Covered
**Objective**: Verify all functionality previously in voiceMachine is covered

**Coverage Checklist**:
- [ ] Startup → listening transition (WakeWordMachine)
- [ ] Wake word trigger detection (WakeWordMachine)
- [ ] Recording session management (RecordingMachine)
- [ ] VAD silence detection (RecordingMachine)
- [ ] TTS playback tracking (PlaybackMachine)
- [ ] Interruption handling (PlaybackMachine)
- [ ] Cooldown period (PlaybackMachine)
- [ ] Trigger debouncing (voiceMachine guards - WHERE DID THIS GO?)

**Success Criteria**:
- ✅ All functionality accounted for
- ✅ No missing features
- ✅ Trigger cooldown still works

**Validation**: PASS / FAIL

---

## Performance Tests

### Test PERF-1: Startup Time
**Objective**: Measure startup time impact

**Steps**:
1. Start voice gateway with timing logs enabled
2. Measure time from start to "Voice Gateway ready"
3. Compare to baseline (if available)

**Expected Timing**:
- Total startup: 3-8 seconds (depends on model download, TTS synthesis)
- Machine initialization: <50ms
- Detector warm-up: 2.5-4 seconds

**Success Criteria**:
- ✅ Machine overhead <100ms
- ✅ No significant regression from baseline

**Validation**: PASS / FAIL

---

### Test PERF-2: Interaction Latency
**Objective**: Measure voice interaction latency

**Steps**:
1. Trigger wake word
2. Ask simple question: "What time is it?"
3. Measure time from wake word to TTS playback start
4. Repeat 5 times, calculate average

**Target Latency Breakdown**:
- Wake word detection: <500ms
- Recording (VAD): 1-3s (depends on speech length)
- Transcription: 500-1000ms
- AI query: 1-3s
- TTS synthesis: 1-2s
- **Total**: <7 seconds

**Success Criteria**:
- ✅ Average total time <7 seconds
- ✅ State machine overhead <100ms
- ✅ Consistent timing across runs

**Validation**: PASS / FAIL

---

## Summary Checklist

Before archiving this proposal, ALL tests must PASS:

### Phase 1 Tests (WakeWordMachine)
- [ ] Test 1.1: Startup sequence timing
- [ ] Test 1.2: Wake word detection after startup
- [ ] Test 1.3: Detector state persistence

### Phase 2 Tests (PlaybackMachine)
- [ ] Test 2.1: TTS playback state tracking
- [ ] Test 2.2: Interruption during TTS
- [ ] Test 2.3: Beep isolation during playback

### Phase 3 Tests (RecordingMachine)
- [ ] Test 3.1: Recording state tracking
- [ ] Test 3.2: VAD silence detection
- [ ] Test 3.3: Max recording length
- [ ] Test 3.4: Beep isolation during recording

### Integration Tests
- [ ] Test INT-1: Full voice interaction cycle
- [ ] Test INT-2: Multiple rapid interactions
- [ ] Test INT-3: Error recovery

### Phase 4 Tests
- [ ] Test 4.1: No legacy machine references
- [ ] Test 4.2: All states covered

### Performance Tests
- [ ] Test PERF-1: Startup time
- [ ] Test PERF-2: Interaction latency

---

## Test Log Template

Use this template to log test results:

```
Test: [Test ID and Name]
Date: [YYYY-MM-DD]
Tester: [Name]
Environment: [Development/Staging/Production]

Result: PASS / FAIL

Notes:
- [Observation 1]
- [Observation 2]
- [Any issues encountered]

Logs:
[Paste relevant log excerpts]

Next Steps:
[If FAIL, list remediation steps]
```

---

## Troubleshooting

### Issue: Welcome message plays before detector ready
**Symptom**: "Welcome message" appears before "Detector warm-up complete"
**Fix**: Check WakeWordMachine integration in main.js Phase 6
**Verify**: Wait For Ready promise should resolve before startTTSWelcome

### Issue: Wake word not detected
**Symptom**: No "Wake word detected" messages
**Check**:
1. Microphone permissions
2. Wake word model path
3. WakeWordMachine state (should be 'ready')
4. Audio device configuration

### Issue: Recording doesn't stop
**Symptom**: Recording continues indefinitely
**Check**:
1. VAD threshold configuration
2. RecordingMachine silence detection
3. Max utterance length timeout

### Issue: TTS doesn't play
**Symptom**: AI response shown but no audio
**Check**:
1. TTS configuration (ElevenLabs API key or Piper setup)
2. PlaybackMachine state
3. Audio player device

---

## Contact

For issues or questions about testing:
- Review IMPLEMENTATION_SUMMARY.md
- Check proposal.md and design.md
- Review code comments in state machine files
