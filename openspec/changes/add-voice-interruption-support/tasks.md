# Implementation Tasks: Add Voice Interruption Support

## Task Checklist

### Phase 1: AudioPlayer Cancellation

- [ ] **Task 1.1**: Add playInterruptible() method to AudioPlayer
  - File: `src/audio/AudioPlayer.js`
  - Add currentPlayback tracking property
  - Implement playInterruptible(pcmAudio) that returns {cancel, promise}
  - On macOS: Store afplay child process for cancellation
  - On Linux: Store aplay child process for cancellation
  - **Validation**: Method compiles, returns cancellable playback handle

- [ ] **Task 1.2**: Implement cancel() for macOS (afplay)
  - Kill afplay child process when cancel() called
  - Set cancelled flag to prevent promise resolution
  - Clean up temp WAV file
  - **Validation**: afplay process terminates < 100ms

- [ ] **Task 1.3**: Implement cancel() for Linux (aplay)
  - Kill aplay child process when cancel() called
  - Close stdin pipe
  - Set cancelled flag
  - **Validation**: aplay process terminates < 100ms

### Phase 2: Orchestrator Interruption Handling

- [ ] **Task 2.1**: Track active playback in VoiceInteractionOrchestrator
  - File: `src/services/VoiceInteractionOrchestrator.js`
  - Add this.activePlayback = null property to constructor
  - **Validation**: Property exists, initialized to null

- [ ] **Task 2.2**: Use playInterruptible in _speakResponse()
  - Replace audioPlayer.play() with audioPlayer.playInterruptible()
  - Store playback handle in this.activePlayback
  - Set to null after playback completes
  - **Validation**: Active playback is tracked during TTS

- [ ] **Task 2.3**: Add interrupt() method to orchestrator
  - Implement interrupt() method
  - Check if this.activePlayback exists
  - Call activePlayback.cancel() if exists
  - Log "🛑 Interrupting TTS playback"
  - Set activePlayback to null
  - **Validation**: Method can cancel active playback

- [ ] **Task 2.4**: Make welcome message interruptible
  - File: `src/util/InitUtil.js`
  - Update startTTSWelcome() to use playInterruptible()
  - Return playback handle from startTTSWelcome()
  - File: `src/main.js`
  - Store welcome playback handle in variable (e.g., activeWelcomePlayback)
  - In wake word handler, cancel activeWelcomePlayback if exists
  - **Validation**: Welcome message can be interrupted with wake word

### Phase 3: Streaming TTS Cancellation

- [ ] **Task 3.1**: Add AbortController support to streamSpeak
  - File: `src/streamingTTS.js`
  - Add signal parameter to streamSpeak() options
  - Pass signal to Anthropic API call
  - Handle AbortError gracefully
  - **Validation**: Streaming can be aborted mid-response

- [ ] **Task 3.2**: Track streaming playback in orchestrator
  - In _queryAIWithStreaming(), create AbortController
  - Store in this.activeStreamAbort
  - Pass signal to streamSpeak
  - **Validation**: Streaming TTS can be cancelled

- [ ] **Task 3.3**: Cancel streaming in interrupt() method
  - In interrupt(), check if this.activeStreamAbort exists
  - Call activeStreamAbort.abort()
  - Set to null
  - **Validation**: Streaming stops when interrupted

### Phase 4: Wake Word Interruption Handling

- [ ] **Task 4.1**: Handle wake word during cooldown in main.js
  - File: `src/main.js` (setupMic function)
  - In wake word detection block, check if state is cooldown
  - If cooldown + wake word detected: call orchestrator.interrupt()
  - Log "🎤 Wake word detected during playback (interruption)!"
  - Allow TRIGGER event to transition cooldown → recording
  - **Validation**: Wake word during cooldown triggers interruption

- [ ] **Task 4.2**: Test interruption doesn't break normal flow
  - Verify wake word in listening state works normally (no interruption)
  - Verify wake word in recording state is blocked (cooldown)
  - **Validation**: Only cooldown state allows interruption

### Phase 5: Logging Improvements

- [ ] **Task 5.1**: Update cooldown state log message
  - File: `src/util/VoiceGateway.js`
  - Change cooldown entry log to "⏸️ Cooldown (can interrupt)"
  - **Validation**: Log clearly indicates interruptibility

- [ ] **Task 5.2**: Remove/reduce OpenWakeWord detector log
  - File: `src/util/OpenWakeWordDetector.js` line 108
  - Option A: Change logger.info to logger.debug
  - Option B: Remove log entirely
  - **Validation**: Only one "Listening..." message per state transition

### Phase 6: Testing

#### Interruption Tests

- [ ] **Test 6.1**: Interrupt during welcome message
  - Start voice gateway
  - Trigger wake word during "Hello, I am Jarvis..."
  - **Pass criteria**: Welcome stops immediately, new interaction starts

- [ ] **Test 6.2**: Interrupt during AI response (non-streaming)
  - Configure Ollama provider
  - Ask "What time is it?"
  - Trigger wake word during TTS response
  - **Pass criteria**: TTS stops < 100ms, new interaction starts

- [ ] **Test 6.3**: Interrupt during AI response (streaming)
  - Configure Anthropic provider with streaming
  - Ask a question
  - Trigger wake word during streaming TTS
  - **Pass criteria**: Streaming stops, audio stops, new interaction starts

- [ ] **Test 6.4**: Interruption adds to conversation context
  - Ask "What's the weather?"
  - Interrupt: "Hey Jarvis, tell me about devices"
  - Check conversation history includes both
  - **Pass criteria**: Conversation context preserved

- [ ] **Test 6.5**: Multiple rapid interruptions
  - Trigger wake word
  - Ask question
  - Interrupt 3 times in a row
  - **Pass criteria**: Each interruption works, no crashes

#### Normal Flow Tests

- [ ] **Test 6.6**: No interruption during listening state
  - Wait for "🎧 Listening for wake word"
  - Trigger wake word
  - **Pass criteria**: Normal flow (no interruption logic invoked)

- [ ] **Test 6.7**: No interruption during recording
  - Trigger wake word, start speaking
  - Trigger wake word again during recording
  - **Pass criteria**: Second trigger blocked (cooldown protection)

#### Error Handling Tests

- [ ] **Test 6.8**: Cancellation with no active playback
  - Call orchestrator.interrupt() when no TTS playing
  - **Pass criteria**: No errors, graceful handling

- [ ] **Test 6.9**: TTS error during interruption
  - Simulate TTS error
  - Trigger interruption
  - **Pass criteria**: Error logged, system continues

#### Log Clarity Tests

- [ ] **Test 6.10**: Verify single "Listening..." source
  - Start system
  - Count "Listening for wake word" messages during startup
  - **Pass criteria**: Only one message when transitioning to listening

- [ ] **Test 6.11**: Verify cooldown log clarity
  - Trigger interaction
  - Check cooldown entry log
  - **Pass criteria**: Shows "⏸️ Cooldown (can interrupt)"

### Phase 7: Documentation

- [ ] **Task 7.1**: Update voice gateway README
  - Document interruption feature
  - Add examples of barge-in usage
  - **Validation**: README explains interruption capability

- [ ] **Task 7.2**: Add code comments
  - Document why wake word detection stays active during TTS
  - Comment interrupt() method behavior
  - **Validation**: Comments explain interruption design

## Dependencies

- **Sequential**: Phase 1 → Phase 2 (orchestrator needs cancellable playback)
- **Sequential**: Phase 2 → Phase 4 (wake word handler needs orchestrator.interrupt())
- **Parallel**: Phase 3 (streaming) can be done alongside Phase 1-2
- **Sequential**: Phase 6 requires all phases complete

## Estimated Effort

- Phase 1 (AudioPlayer): ~3 hours
- Phase 2 (Orchestrator + Welcome): ~3 hours
- Phase 3 (Streaming): ~2 hours
- Phase 4 (Wake Word): ~1 hour
- Phase 5 (Logging): ~1 hour
- Phase 6 (Testing): ~4 hours
- Phase 7 (Docs): ~1 hour
- **Total: ~15 hours**

## Success Criteria

All tasks checked ✅ AND:
1. User can interrupt **any TTS playback** (welcome, AI response, streaming) by triggering wake word
2. Welcome message stops immediately when interrupted
3. Interruption works for both non-streaming and streaming TTS
4. TTS stops < 100ms after wake word detected
5. Conversation context includes interrupted exchanges
6. Logs clearly indicate when system can be interrupted
7. No audio process leaks from cancellation
8. No crashes from rapid interruptions
