# Implementation Tasks: Refactor XState Separation of Concerns

## Task Checklist

### Phase 1: WakeWordMachine - Fix Detector Lifecycle (Week 1)

- [ ] **Task 1.1**: Create WakeWordMachine state machine
  - Create `src/state-machines/WakeWordMachine.js`
  - Define states: off, warming-up, ready, triggered
  - Define events: DETECTOR_INITIALIZED, WARMUP_COMPLETE, WAKE_WORD_DETECTED, TRIGGER_PROCESSED, RESET_DETECTOR
  - Implement state transitions with guards and actions
  - **Validation**: Machine exports createWakeWordMachine() function

- [ ] **Task 1.2**: Connect OpenWakeWordDetector to WakeWordMachine
  - Listen to detector's 'warmup-complete' event
  - Send WARMUP_COMPLETE event to machine
  - Track warm-up state in machine context
  - **Validation**: Machine transitions warming-up → ready when detector emits event

- [ ] **Task 1.3**: Update main.js to use WakeWordMachine for startup
  - Initialize WakeWordMachine before detector
  - Subscribe to machine state changes
  - Wait for 'ready' state before playing welcome message
  - Keep voiceMachine running in parallel (compatibility)
  - **Validation**: Welcome message plays ONLY after detector ready

- [ ] **Task 1.4**: Remove unnecessary detector reset after welcome message
  - Remove `safeDetectorReset(detector, 'post-startup-tts')` call
  - Detector should stay warm after first warm-up completes
  - **Validation**: "Detector warm-up complete" appears exactly once in logs

- [ ] **Task 1.5**: Add WakeWordMachine unit tests
  - Test state transitions (off → warming-up → ready)
  - Test wake word detection (ready → triggered → ready)
  - Test detector reset (ready → warming-up)
  - **Validation**: All tests pass, 100% coverage of machine logic

- [ ] **Task 1.6**: Test startup sequence with new machine
  - Run voice gateway, monitor logs
  - Verify: Welcome message plays after warm-up complete
  - Verify: Only one "Detector warm-up complete" message
  - Verify: User can trigger wake word immediately after welcome message
  - **Validation**: Startup timing is correct and predictable

### Phase 2: PlaybackMachine - Clean Interruption Semantics (Week 2)

- [ ] **Task 2.1**: Create PlaybackMachine state machine
  - Create `src/state-machines/PlaybackMachine.js`
  - Define states: idle, playing, cooldown, interrupted
  - Define events: START_PLAYBACK, PLAYBACK_COMPLETE, COOLDOWN_COMPLETE, INTERRUPT
  - Track active playback handle in context
  - **Validation**: Machine exports createPlaybackMachine() function

- [ ] **Task 2.2**: Migrate cancelActivePlayback to PlaybackMachine
  - Move interruption logic from VoiceInteractionOrchestrator
  - Implement INTERRUPT event handler
  - Cancel active playback on interrupt
  - **Validation**: PlaybackMachine.send({ type: 'INTERRUPT' }) cancels audio

- [ ] **Task 2.3**: Update beep isolation to query PlaybackMachine
  - Modify shouldPlayBeep() to check playback machine state
  - Don't play beeps when machine is in 'playing' state
  - **Validation**: Beeps don't play during TTS playback

- [ ] **Task 2.4**: Connect wake word interruption to PlaybackMachine
  - When wake word detected during playback, send INTERRUPT event
  - Verify playback cancels immediately
  - **Validation**: Barge-in works (speak wake word during TTS response)

- [ ] **Task 2.5**: Add PlaybackMachine unit tests
  - Test playback lifecycle (idle → playing → cooldown → idle)
  - Test interruption (playing → interrupted → idle)
  - Test cooldown timer
  - **Validation**: All tests pass

- [ ] **Task 2.6**: Integration test with WakeWordMachine
  - Trigger wake word during TTS playback
  - Verify playback cancels and recording starts
  - **Validation**: Interruption works end-to-end

### Phase 3: RecordingMachine - Separate Recording Logic (Week 3)

- [ ] **Task 3.1**: Create RecordingMachine state machine
  - Create `src/state-machines/RecordingMachine.js`
  - Define states: idle, recording, processing
  - Define events: START_RECORDING, SILENCE_DETECTED, MAX_LENGTH_REACHED, RECORDING_COMPLETE
  - Track audio buffer in context
  - **Validation**: Machine exports createRecordingMachine() function

- [ ] **Task 3.2**: Refactor setupMic() to use RecordingMachine
  - Move recording state variables to machine context
  - Send START_RECORDING when wake word detected
  - Send SILENCE_DETECTED when VAD detects silence
  - Emit RECORDING_COMPLETE with audio buffer
  - **Validation**: Recording works identically to before

- [ ] **Task 3.3**: Update beep isolation to check RecordingMachine
  - Modify shouldPlayBeep() to check recording machine state
  - Don't play beeps when machine is in 'recording' state
  - **Validation**: Beeps don't play during audio capture

- [ ] **Task 3.4**: Connect RecordingMachine to orchestrator
  - Subscribe to recording machine state changes
  - Start transcription when RECORDING_COMPLETE emitted
  - **Validation**: Voice interaction pipeline works end-to-end

- [ ] **Task 3.5**: Add RecordingMachine unit tests
  - Test recording lifecycle (idle → recording → processing → idle)
  - Test VAD silence detection
  - Test max length timeout
  - **Validation**: All tests pass

- [ ] **Task 3.6**: Integration test all three machines
  - Wake word → recording → TTS → cooldown → ready
  - Verify all machines coordinate correctly
  - **Validation**: Full voice interaction works

### Phase 4: Deprecate voiceMachine - Remove Old Code (Week 4)

- [ ] **Task 4.1**: Remove voiceMachine from VoiceGateway.js
  - Delete old monolithic state machine
  - Remove setupVoiceStateMachine() export
  - **Validation**: No references to old machine remain

- [ ] **Task 4.2**: Update all machine references in main.js
  - Replace voiceService with individual machines
  - Update event subscriptions
  - Remove compatibility mode code
  - **Validation**: main.js uses only new machines

- [ ] **Task 4.3**: Clean up transition logic
  - Remove voiceMachine-specific guards and actions
  - Simplify orchestration code
  - **Validation**: Code is cleaner and easier to follow

- [ ] **Task 4.4**: Remove deprecated code and comments
  - Delete commented-out voiceMachine code
  - Remove compatibility mode flags
  - Update documentation
  - **Validation**: No voiceMachine references in codebase

- [ ] **Task 4.5**: Run full test suite
  - All unit tests pass
  - All integration tests pass
  - No regressions in functionality
  - **Validation**: Test suite is green

- [ ] **Task 4.6**: Manual end-to-end testing
  - Test startup sequence (no duplicate messages)
  - Test wake word detection (works immediately after welcome)
  - Test recording (VAD works correctly)
  - Test TTS playback (no awkward gaps)
  - Test interruption (barge-in works)
  - **Validation**: All manual tests pass

### Phase 5: Documentation and Cleanup

- [ ] **Task 5.1**: Update architecture documentation
  - Document three state machines in README
  - Add state diagrams for each machine
  - Explain event-driven communication pattern
  - **Validation**: Docs accurately describe new architecture

- [ ] **Task 5.2**: Add developer guide for state machines
  - How to add new states to existing machines
  - How to create new state machines
  - How to test state machines
  - **Validation**: Guide is clear and helpful

- [ ] **Task 5.3**: Update TECH-STACK.md
  - Document XState usage and patterns
  - Add examples of machine usage
  - **Validation**: TECH-STACK.md reflects new patterns

- [ ] **Task 5.4**: Run linter and fix issues
  - `npm run lint` in voice-gateway-oww
  - Fix any warnings
  - **Validation**: No lint errors

## Dependencies

- **Sequential**: Phase 1 must complete before Phase 2 (WakeWordMachine fixes timing issues first)
- **Sequential**: Phase 2 must complete before Phase 3 (PlaybackMachine needed for interruption)
- **Sequential**: Phase 3 must complete before Phase 4 (all new machines must exist before removing old)
- **Parallel**: Individual tasks within each phase can be parallelized where noted

## Estimated Effort

- Phase 1 (WakeWordMachine): ~16 hours
- Phase 2 (PlaybackMachine): ~12 hours
- Phase 3 (RecordingMachine): ~14 hours
- Phase 4 (Deprecate voiceMachine): ~8 hours
- Phase 5 (Documentation): ~6 hours
- **Total: ~56 hours (~2 weeks with 2 developers or ~3 weeks solo)**

## Success Criteria

All tasks checked ✅ AND:
1. Welcome message plays ONLY after detector warm-up completes
2. "Detector warm-up complete" appears exactly once in startup logs
3. User can trigger wake word immediately after welcome message finishes
4. No awkward gaps between readiness indicators and actual readiness
5. Three focused state machines replace monolithic voiceMachine
6. Each machine has clear responsibilities and can be tested independently
7. All unit tests pass (target: >90% coverage for state machines)
8. All integration tests pass
9. No regression in existing functionality
10. Code is cleaner, easier to understand, and better documented
