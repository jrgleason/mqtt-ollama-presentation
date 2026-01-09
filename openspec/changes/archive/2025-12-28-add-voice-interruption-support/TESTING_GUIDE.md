# Voice Interruption Support - Testing Guide

**Date:** 2025-12-28
**Feature:** Voice barge-in/interruption during TTS playback

## Prerequisites

Before testing, ensure:
1. Voice gateway is configured properly (see `apps/voice-gateway-oww/.env.example`)
2. Wake word detector is working (test normal wake word detection first)
3. TTS is enabled (`TTS_ENABLED=true`)
4. Audio devices are working (microphone + speaker)

## Test Environment Setup

### Option 1: Ollama (Non-Streaming)
```bash
cd apps/voice-gateway-oww
export AI_PROVIDER=ollama
export TTS_PROVIDER=ElevenLabs  # or Piper
export TTS_STREAMING=false
npm run dev
```

### Option 2: Anthropic (Streaming)
```bash
cd apps/voice-gateway-oww
export AI_PROVIDER=anthropic
export TTS_PROVIDER=ElevenLabs
export TTS_STREAMING=true
npm run dev
```

## Test Cases

### Test 1: Interrupt Welcome Message ✅

**Objective:** Verify wake word detection during startup welcome message triggers interruption

**Steps:**
1. Start voice gateway: `npm run dev`
2. Wait for welcome message to start: "Hello, I am Jarvis..."
3. **IMMEDIATELY** trigger wake word: "Hey Jarvis"
4. Speak a command: "What time is it?"

**Expected Results:**
- ✅ Welcome message stops playing < 100ms after wake word
- ✅ Wake word beep plays (audible confirmation)
- ✅ Recording starts immediately
- ✅ Your command is transcribed and processed
- ✅ Logs show:
  ```
  🎤 Wake word detected!
  🛑 Interrupting welcome message
  🛑 Welcome message interrupted
  🎙️ Recording user speech...
  ```

**Pass Criteria:**
- Welcome message stops immediately (no delay)
- New interaction starts without waiting for welcome to finish
- No errors in logs

---

### Test 2: Interrupt AI Response (Non-Streaming) ✅

**Objective:** Verify interruption during standard TTS playback (Ollama or non-streaming Anthropic)

**Steps:**
1. Configure non-streaming mode (see Test Environment Setup - Option 1)
2. Start voice gateway
3. Ask a question: "Hey Jarvis, what time is it?"
4. Wait for TTS response to start
5. **DURING TTS**, trigger wake word: "Hey Jarvis"
6. Speak a new command: "Tell me about the devices"

**Expected Results:**
- ✅ TTS playback stops < 100ms after wake word
- ✅ Wake word beep plays
- ✅ Recording starts immediately
- ✅ New command is processed
- ✅ Logs show:
  ```
  ⏸️ Cooldown (can interrupt)
  🎤 Wake word detected during playback (interruption)!
  🛑 Cancelling active TTS playback (interrupted by user)
  🛑 Cancelling audio playback (interrupted)
  🛑 TTS playback was interrupted
  🎙️ Recording user speech...
  ```

**Pass Criteria:**
- TTS stops immediately (< 100ms latency)
- No audio glitches or stuttering
- State machine transitions properly (cooldown → recording)
- No process leaks (check with `ps aux | grep afplay` on macOS)

---

### Test 3: Interrupt Streaming TTS (Anthropic) ✅

**Objective:** Verify interruption during streaming TTS (Anthropic provider with streaming enabled)

**Steps:**
1. Configure streaming mode (see Test Environment Setup - Option 2)
2. Start voice gateway
3. Ask a question requiring long response: "Hey Jarvis, tell me about all the devices in the house"
4. Wait for streaming TTS to start (you'll hear partial sentences)
5. **DURING STREAMING**, trigger wake word: "Hey Jarvis"
6. Speak a new command: "Actually, just tell me the time"

**Expected Results:**
- ✅ Streaming TTS stops immediately (mid-sentence)
- ✅ Wake word beep plays
- ✅ Recording starts immediately
- ✅ New command is processed
- ✅ Logs show:
  ```
  ⏸️ Cooldown (can interrupt)
  🎤 Wake word detected during playback (interruption)!
  🛑 Cancelling active TTS playback (interrupted by user)
  🛑 Aborting streaming TTS
  🛑 streamSpeak: cancelling streaming TTS
  🛑 Streaming TTS was cancelled
  🎙️ Recording user speech...
  ```

**Pass Criteria:**
- Streaming stops immediately (no queued chunks play)
- AbortController properly cancels Anthropic API call
- No memory leaks from unclosed streams
- No "unhandled promise rejection" errors

---

### Test 4: Multiple Rapid Interruptions ✅

**Objective:** Verify system handles rapid successive interruptions without crashes

**Steps:**
1. Start voice gateway
2. Ask: "Hey Jarvis, what time is it?"
3. Interrupt: "Hey Jarvis, tell me about devices"
4. Interrupt again: "Hey Jarvis, what's the weather?"
5. Interrupt again: "Hey Jarvis, actually just say hello"

**Expected Results:**
- ✅ Each interruption works
- ✅ No crashes or errors
- ✅ No audio glitches
- ✅ Final command completes successfully
- ✅ Logs show 3 cancellation events

**Pass Criteria:**
- System remains stable after 3+ interruptions
- Memory usage doesn't grow excessively
- All playback processes properly cleaned up
- No zombie processes (check with `ps aux | grep afplay`)

---

### Test 5: No Interruption During Listening State ✅

**Objective:** Verify normal wake word flow still works (not everything is an interruption)

**Steps:**
1. Start voice gateway
2. Wait for "🎧 Listening for wake word" log
3. Trigger wake word: "Hey Jarvis"
4. Ask: "What time is it?"
5. Let TTS complete fully (don't interrupt)

**Expected Results:**
- ✅ Wake word detected normally
- ✅ Recording starts
- ✅ AI processes question
- ✅ TTS plays to completion
- ✅ Logs show:
  ```
  🎧 Listening for wake word
  🎤 Wake word detected!
  🎙️ Recording user speech...
  📝 You said: "What time is it?"
  ⚙️ Processing voice interaction...
  🤖 AI Response: "..."
  ✅ AI response playback complete
  ⏸️ Cooldown (can interrupt)
  🎧 Listening for wake word
  ```

**Pass Criteria:**
- No "interruption" logs appear
- Normal conversation flow works
- Cooldown period completes before listening state

---

### Test 6: Conversation Context Preserved ✅

**Objective:** Verify interrupted exchanges are added to conversation history

**Steps:**
1. Start voice gateway
2. Ask: "Hey Jarvis, what's the weather?"
3. Interrupt during TTS: "Hey Jarvis, what devices do I have?"
4. Let this response complete
5. Ask a follow-up: "Hey Jarvis, turn on the first one"

**Expected Results:**
- ✅ Conversation history includes all 3 exchanges
- ✅ AI has context from interrupted question
- ✅ Follow-up question correctly references "first one" from device list
- ✅ Logs show conversation turns incrementing

**Pass Criteria:**
- Conversation manager tracks interrupted exchanges
- AI responses show awareness of conversation context
- No context loss from interruption

---

### Test 7: Edge Case - Interrupt During Processing ✅

**Objective:** Verify wake word is blocked during recording/processing states

**Steps:**
1. Start voice gateway
2. Trigger wake word: "Hey Jarvis"
3. Start speaking immediately
4. **WHILE SPEAKING**, try to trigger wake word again: "Hey Jarvis"

**Expected Results:**
- ✅ Second wake word is ignored (cooldown protection)
- ✅ Logs show:
  ```
  🎙️ Recording user speech...
  🔎 OWW detection tick
  ⛔ Trigger blocked (cooldown)
  ```

**Pass Criteria:**
- Wake word detection is blocked during recording
- No interruption of current recording
- System waits for current interaction to complete

---

### Test 8: Cancellation With No Active Playback ✅

**Objective:** Verify graceful handling when cancellation is called but nothing is playing

**Steps:**
1. Start voice gateway
2. Wait for listening state
3. Verify no TTS is active
4. Trigger wake word (which internally calls cancelActivePlayback)

**Expected Results:**
- ✅ No errors logged
- ✅ Normal wake word flow proceeds
- ✅ No "failed to cancel" errors

**Pass Criteria:**
- Graceful handling of null/undefined playback
- No crashes or exceptions
- Normal operation continues

---

## Performance Verification

### Interruption Latency Test

**Objective:** Measure interruption latency (should be < 100ms)

**Method:**
1. Record screen with audio using QuickTime/OBS
2. Interrupt TTS with wake word
3. Measure time between wake word trigger and TTS stop
4. Use video editing software (iMovie, Final Cut, etc.) to measure frames

**Expected:** < 100ms (< 6 frames at 60fps)

**How to verify in logs:**
```
[timestamp1] 🎤 Wake word detected during playback
[timestamp2] 🛑 Cancelling audio playback
```
Calculate: `timestamp2 - timestamp1` should be < 100ms

---

### Resource Leak Test

**Objective:** Verify no memory or process leaks from interruptions

**Method (macOS):**
```bash
# Before test
ps aux | grep afplay  # Should be empty
ps aux | grep node    # Note memory usage

# Run 10 interruption cycles
# (interrupt TTS 10 times)

# After test
ps aux | grep afplay  # Should still be empty
ps aux | grep node    # Memory should be stable (within 10MB)
```

**Method (Linux):**
```bash
# Before test
ps aux | grep aplay   # Should be empty
ps aux | grep node    # Note memory usage

# Run 10 interruption cycles

# After test
ps aux | grep aplay   # Should still be empty
ps aux | grep node    # Memory should be stable
```

**Pass Criteria:**
- No zombie afplay/aplay processes
- Memory usage stable (< 10MB growth)
- No temp WAV files left in `/tmp` or project root

---

## Troubleshooting

### Issue: TTS Doesn't Stop on Interruption

**Symptoms:**
- Wake word detected but TTS continues playing
- No "Cancelling audio playback" log

**Possible Causes:**
1. State machine missing TRIGGER handler in cooldown state
   - **Fix:** Verify VoiceGateway.js has `on: { TRIGGER }` in cooldown state

2. orchestrator.cancelActivePlayback() not called
   - **Fix:** Verify main.js wake word handler calls cancellation

3. playInterruptible() not used
   - **Fix:** Verify _speakResponse() uses playInterruptible(), not play()

**Verification:**
```bash
# Check VoiceGateway.js
grep -A 5 "cooldown:" apps/voice-gateway-oww/src/util/VoiceGateway.js
# Should show: on: { TRIGGER: [...] }

# Check main.js
grep "cancelActivePlayback" apps/voice-gateway-oww/src/main.js
# Should appear in wake word detection block
```

---

### Issue: Welcome Message Can't Be Interrupted

**Symptoms:**
- Wake word during welcome is ignored
- Welcome plays to completion

**Possible Causes:**
1. startTTSWelcome() not returning playback handle
   - **Fix:** Verify InitUtil.js returns playback from startTTSWelcome()

2. activeWelcomePlayback not tracked in main()
   - **Fix:** Verify main.js stores playback handle

3. getWelcomePlayback() not passed to setupMic()
   - **Fix:** Verify setupMic() receives welcome playback getter

**Verification:**
```bash
# Check InitUtil.js
grep "return playback" apps/voice-gateway-oww/src/util/InitUtil.js
# Should appear at end of startTTSWelcome()

# Check main.js
grep "activeWelcomePlayback" apps/voice-gateway-oww/src/main.js
# Should appear 3+ times (declaration, assignment, getter)
```

---

### Issue: Streaming TTS Doesn't Cancel

**Symptoms:**
- Wake word during streaming is detected
- Audio stops but queue continues processing

**Possible Causes:**
1. AbortController not created
   - **Fix:** Verify _queryAIWithStreaming() creates AbortController

2. streamSpeak() not receiving abortController
   - **Fix:** Verify abortController passed to streamSpeak()

3. streamSpeak() cancel() not clearing queue
   - **Fix:** Verify streamingTTS.js cancel() sets queue.length = 0

**Verification:**
```bash
# Check VoiceInteractionOrchestrator.js
grep "new AbortController" apps/voice-gateway-oww/src/services/VoiceInteractionOrchestrator.js
# Should appear in _queryAIWithStreaming()

# Check streamingTTS.js
grep "queue.length = 0" apps/voice-gateway-oww/src/streamingTTS.js
# Should appear in cancel() function
```

---

## Log Analysis

### Healthy Interruption Logs

**Interrupt during non-streaming:**
```
⏸️ Cooldown (can interrupt)
🔎 OWW detection tick {inferMs: 15}
🎤 Wake word detected during playback (interruption)! {wakeWord: 'Hey Jarvis', score: '0.982'}
🛑 Cancelling active TTS playback (interrupted by user)
🛑 Cancelling audio playback (interrupted)
🎙️ Recording user speech...
✅ Speech detected in recording
📝 You said: "tell me the time"
```

**Interrupt during streaming:**
```
⏸️ Cooldown (can interrupt)
🔎 OWW detection tick {inferMs: 12}
🎤 Wake word detected during playback (interruption)! {wakeWord: 'Hey Jarvis', score: '0.975'}
🛑 Cancelling active TTS playback (interrupted by user)
🛑 Aborting streaming TTS
🛑 streamSpeak: cancelling streaming TTS
🛑 streamSpeak: flush aborted
🛑 Streaming TTS was cancelled
🎙️ Recording user speech...
```

### Unhealthy Logs (Errors)

**Missing TRIGGER handler:**
```
⏸️ Cooldown (can interrupt)
🎤 Wake word detected during playback (interruption)!
🛑 Cancelling active TTS playback
# ... but no transition to recording (stuck in cooldown)
```
**Fix:** Add `on: { TRIGGER }` to cooldown state

**Process not killed:**
```
🛑 Cancelling audio playback (interrupted)
# ... but audio continues playing
```
**Fix:** Verify child process kill is working (check platform-specific code)

**Promise rejection:**
```
UnhandledPromiseRejectionWarning: Error: Playback cancelled
```
**Fix:** Add `.catch()` handler to playback.promise

---

## Success Checklist

Before considering testing complete, verify:

- [ ] ✅ Test 1: Welcome message interruption works
- [ ] ✅ Test 2: Non-streaming TTS interruption works
- [ ] ✅ Test 3: Streaming TTS interruption works
- [ ] ✅ Test 4: Multiple rapid interruptions work
- [ ] ✅ Test 5: Normal wake word flow still works
- [ ] ✅ Test 6: Conversation context preserved
- [ ] ✅ Test 7: Wake word blocked during recording
- [ ] ✅ Test 8: Graceful handling of no active playback
- [ ] ✅ Interruption latency < 100ms
- [ ] ✅ No memory leaks after 10+ interruptions
- [ ] ✅ No zombie processes (afplay/aplay)
- [ ] ✅ No temp files left behind
- [ ] ✅ Logs show clear interruption events
- [ ] ✅ No "unhandled promise rejection" errors

---

## Reporting Issues

If tests fail, provide:
1. **Test case number** (e.g., Test 3)
2. **Full logs** (from startup to failure)
3. **Environment details:**
   - OS (macOS/Linux)
   - Node.js version
   - AI provider (Ollama/Anthropic)
   - TTS provider (ElevenLabs/Piper)
   - Streaming enabled/disabled
4. **Steps to reproduce**
5. **Expected vs actual behavior**

**Example issue report:**
```
Test 3 Failed: Streaming TTS Interruption

Environment:
- macOS 14.1
- Node.js v20.10.0
- AI: Anthropic (streaming enabled)
- TTS: ElevenLabs

Steps:
1. Asked "tell me about devices"
2. Triggered wake word during streaming
3. Audio stopped but queue kept processing

Logs:
[paste relevant logs]

Expected: Queue should clear immediately
Actual: 2 more chunks played after interruption
```

---

**Testing completed by:** _________________
**Date:** _________________
**All tests passed:** ☐ Yes  ☐ No (see issues above)
