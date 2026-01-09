# Implementation Tasks

## 1. Project Setup
- [x] 1.1 Create `src/audio/` directory structure
- [x] 1.2 Create empty class files (AudioRecordingState.js, VoiceActivityDetector.js, WakeWordProcessor.js, MicrophoneManager.js)
- [x] 1.3 Create `src/audio/constants.js` for VAD configuration constants

## 2. Extract AudioRecordingState Class
- [x] 2.1 Create AudioRecordingState class with constructor accepting config and logger
- [x] 2.2 Implement buffer initialization (audioBuffer, recordedAudio, preRollBuffer)
- [x] 2.3 Implement startRecording() method (copies pre-roll buffer to recordedAudio)
- [x] 2.4 Implement appendAudio() method for adding samples to appropriate buffers
- [x] 2.5 Implement stopRecording() method (returns Float32Array snapshot, clears buffers)
- [x] 2.6 Implement updatePreRollBuffer() method (maintains sliding window)
- [x] 2.7 Add getter methods for buffer state (isRecording, recordedSampleCount, etc.)
- [x] 2.8 Verify all mutable state is private to the class

## 3. Extract VoiceActivityDetector Class
- [x] 3.1 Create VoiceActivityDetector class with dependency injection (config, logger)
- [x] 3.2 Move VAD constants to constants.js with documentation
- [x] 3.3 Implement processSamples() method that accepts samples and recording state
- [x] 3.4 Implement silence detection logic with RMS energy calculation
- [x] 3.5 Implement grace period handling (first 1200ms after wake word)
- [x] 3.6 Implement minimum speech duration check (700ms threshold)
- [x] 3.7 Implement maximum recording length detection (10000ms limit)
- [x] 3.8 Return decision object: {shouldStop: boolean, reason: string, hasSpoken: boolean}
- [x] 3.9 Add comprehensive JSDoc comments explaining each threshold

## 4. Extract WakeWordProcessor Class
- [x] 4.1 Create WakeWordProcessor class with dependencies (detector, config, logger, beeps)
- [x] 4.2 Implement processChunk() method accepting Float32Array audio chunk
- [x] 4.3 Implement score evaluation against config.openWakeWord.threshold
- [x] 4.4 Implement wake word name detection from config.openWakeWord.modelPath
- [x] 4.5 Integrate safeDetectorReset() utility for detector cleanup
- [x] 4.6 Integrate playAudio(BEEPS.wakeWord) for audio feedback
- [x] 4.7 Return detection result: {detected: boolean, score: number, wakeWord: string}
- [x] 4.8 Add error handling for detector failures

## 5. Create MicrophoneManager Class
- [x] 5.1 Create MicrophoneManager class orchestrating all components
- [x] 5.2 Accept dependencies in constructor (config, logger, voiceService, orchestrator, detector)
- [x] 5.3 Implement initialize() method to create and coordinate sub-components
- [x] 5.4 Implement setupMicrophoneInstance() - creates mic instance with config
- [x] 5.5 Implement setupXStateListeners() - subscribes to voiceService state changes
- [x] 5.6 Implement handleMicrophoneData() - processes incoming audio stream chunks
- [x] 5.7 Delegate wake word detection to WakeWordProcessor
- [x] 5.8 Delegate VAD processing to VoiceActivityDetector
- [x] 5.9 Delegate buffer management to AudioRecordingState
- [x] 5.10 Implement start() method that starts microphone and returns instance
- [x] 5.11 Add error handling for microphone errors

## 6. Refactor main.js setupMic()
- [ ] 6.1 Import MicrophoneManager and related classes
- [ ] 6.2 Replace 248-line function with ~30 lines creating and starting MicrophoneManager
- [ ] 6.3 Preserve exact same function signature: setupMic(voiceService, orchestrator, detector)
- [ ] 6.4 Preserve exact same return value: micInstance object
- [ ] 6.5 Ensure no behavioral changes - identical event handling and state transitions
- [ ] 6.6 Remove now-unused inline helper functions (toFloat32FromInt16Buffer, rmsEnergy)
- [ ] 6.7 Move toFloat32FromInt16Buffer to MicrophoneManager (needed for conversion)
- [ ] 6.8 Import rmsEnergy from AudioUtils (already available)

## 7. Documentation and Constants
- [x] 7.1 Document all VAD thresholds in constants.js with rationale
- [x] 7.2 Add JSDoc comments to all new classes and public methods
- [x] 7.3 Document class responsibilities in module-level comments
- [x] 7.4 Add inline comments for complex logic (grace period, buffer management)
- [x] 7.5 Create REFACTORING_GUIDE.md with architecture overview and migration steps

## 8. Testing and Validation
- [ ] 8.1 Test wake word detection with actual hardware (USB microphone) - READY FOR TESTING
- [ ] 8.2 Test complete voice command flow (wake word → transcription → AI response) - READY FOR TESTING
- [ ] 8.3 Test VAD grace period (user starts speaking after wake word) - READY FOR TESTING
- [ ] 8.4 Test VAD trailing silence detection (stops recording after pause) - READY FOR TESTING
- [ ] 8.5 Test maximum recording length timeout - READY FOR TESTING
- [ ] 8.6 Test pre-roll buffer capture (audio before wake word is included) - READY FOR TESTING
- [ ] 8.7 Test XState integration (state transitions work correctly) - READY FOR TESTING
- [ ] 8.8 Test error handling (microphone disconnection, detector failures) - READY FOR TESTING
- [ ] 8.9 Verify no regression in demo script (compare before/after behavior) - READY FOR TESTING
- [ ] 8.10 Performance test: Verify no increase in latency or CPU usage - READY FOR TESTING

## 9. Code Review and Cleanup
- [x] 9.1 Review all extracted classes for Single Responsibility Principle adherence
- [x] 9.2 Verify proper dependency injection (no global state access)
- [x] 9.3 Check for code duplication across classes
- [x] 9.4 Ensure consistent error handling patterns
- [x] 9.5 Verify all magic numbers are replaced with named constants
- [x] 9.6 Run linter and fix any issues (auto-fixed by IDE)
- [x] 9.7 Check for unused imports
- [x] 9.8 Verify JavaScript-only (no TypeScript syntax)

## Summary

**Implementation Status: PARTIAL - Core classes complete, main.js refactoring NOT applied**

All extracted classes have been implemented and documented. However, the main.js setupMic() function has NOT been refactored to use MicrophoneManager.

**Completed:**
- ✅ AudioRecordingState (215 lines) - Buffer management
- ✅ VoiceActivityDetector (155 lines) - VAD logic
- ✅ WakeWordProcessor (141 lines) - Wake word detection
- ✅ MicrophoneManager (272 lines) - Orchestration
- ✅ constants.js (141 lines) - Well-documented VAD constants
- ✅ Documentation and code review (sections 7 & 9)

**NOT Completed:**
- ❌ Section 6: main.js setupMic() refactoring (still contains original 248-line implementation)
  - setupMic function spans lines 44-292 in main.js (249 lines)
  - MicrophoneManager is not imported or used
  - Function still contains inline VAD_CONSTANTS, toFloat32FromInt16Buffer, rmsEnergy, etc.

**Next Steps:**
1. Apply section 6 refactoring to main.js (see REFACTORING_GUIDE.md)
2. Replace setupMic() implementation with MicrophoneManager
3. Test with actual hardware
4. Verify no regressions in demo script
