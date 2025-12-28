# Proposal: Refactor XState Separation of Concerns

## Problem Statement

The current voice gateway uses a single monolithic XState machine (`voiceMachine`) that conflates multiple orthogonal concerns:

1. **Wake word detection lifecycle** (startup → listening → triggered)
2. **Audio recording and VAD** (recording → silence detection → completion)
3. **Processing pipeline orchestration** (transcription → AI → TTS)
4. **Playback state management** (TTS playing → cooldown → ready for next interaction)

This tight coupling creates several issues:

- **Timing Issues**: Welcome message plays before detector warm-up completes, causing race conditions during startup
- **State Confusion**: "Detector warm-up complete" appears twice because reset operations trigger buffer refills
- **Limited Concurrency**: Single state machine prevents parallel operations (e.g., can't prepare next interaction while TTS is still playing)
- **Difficult Debugging**: Hard to trace which subsystem is causing state transitions
- **Maintenance Burden**: Changes to one concern (e.g., TTS streaming) require understanding all states and transitions
- **Testing Complexity**: Cannot unit test individual state machines in isolation

## Current Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Single voiceMachine (XState)               │
│                                                         │
│  startup → listening → recording → processing → cooldown│
│                ↑_________________________________|      │
│                                                         │
│  Handles: wake word, recording, STT, AI, TTS, beeps   │
└─────────────────────────────────────────────────────────┘
```

Current states:
- `startup`: Initial state, microphone muted until READY signal
- `listening`: Actively detecting wake word
- `recording`: Capturing user speech with VAD
- `processing`: Transcribing, AI inference, TTS synthesis
- `cooldown`: TTS playing, can be interrupted by wake word

## Proposed Architecture

Separate the monolithic machine into **three focused, orthogonal state machines**:

```
┌──────────────────────────────────┐
│  WakeWordMachine (Detector)      │
│                                  │
│  off → warming-up → ready → ...  │
│          ↑ triggered → ready     │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│  RecordingMachine (STT)          │
│                                  │
│  idle → recording → complete     │
│          ↑ silence/max → idle    │
└──────────────────────────────────┘

┌──────────────────────────────────┐
│  PlaybackMachine (TTS & Beeps)   │
│                                  │
│  idle → playing → cooldown       │
│          ↑ complete → idle       │
└──────────────────────────────────┘
```

### Machine Responsibilities

#### 1. WakeWordMachine
**Purpose**: Manage wake word detector lifecycle and readiness state

**States**:
- `off`: Detector not initialized
- `warming-up`: Detector initialized, buffers filling (embeddings accumulating)
- `ready`: Detector warm and ready for detection
- `triggered`: Wake word detected, processing trigger

**Events**:
- `DETECTOR_INITIALIZED`: Transitions off → warming-up
- `WARMUP_COMPLETE`: Transitions warming-up → ready
- `WAKE_WORD_DETECTED`: Transitions ready → triggered
- `TRIGGER_PROCESSED`: Transitions triggered → ready
- `RESET_DETECTOR`: Transitions ready → warming-up (buffer refill needed)

**Benefits**:
- Clear visibility into detector warm-up state
- Prevents welcome message from playing before ready state
- Easy to track buffer refills after reset operations
- Can emit events to coordinate with other machines

#### 2. RecordingMachine
**Purpose**: Manage audio recording session with VAD

**States**:
- `idle`: Not recording
- `recording`: Actively capturing audio
- `processing`: VAD detected silence/max length, finalizing buffer

**Events**:
- `START_RECORDING`: Transitions idle → recording
- `SILENCE_DETECTED`: Transitions recording → processing
- `MAX_LENGTH_REACHED`: Transitions recording → processing
- `RECORDING_COMPLETE`: Transitions processing → idle

**Benefits**:
- Clean separation of recording logic from wake word detection
- Easy to add pre-roll buffer management
- Clear state for beep isolation (don't play beeps during recording)
- Independent timeout handling for max utterance length

#### 3. PlaybackMachine
**Purpose**: Manage TTS and beep playback with interruption support

**States**:
- `idle`: No audio playing
- `playing`: TTS or beep currently playing
- `cooldown`: Brief pause after TTS before accepting next wake word
- `interrupted`: Playback cancelled by user (barge-in)

**Events**:
- `START_PLAYBACK`: Transitions idle → playing
- `PLAYBACK_COMPLETE`: Transitions playing → cooldown
- `COOLDOWN_COMPLETE`: Transitions cooldown → idle
- `INTERRUPT`: Transitions playing → interrupted
- `INTERRUPT_HANDLED`: Transitions interrupted → idle

**Benefits**:
- Clear interruption semantics (cancel active playback)
- Beep isolation can query playback state
- Easy to add streaming TTS with chunk-by-chunk playback
- Cooldown prevents immediate re-trigger after response

### Communication Between Machines

Machines communicate via events using XState's actor model:

```javascript
// WakeWordMachine detects wake word
wakeWordMachine.send({ type: 'WAKE_WORD_DETECTED', score: 0.95 });

// Main orchestrator listens to wakeWordMachine events
wakeWordMachine.subscribe((state) => {
  if (state.matches('triggered')) {
    // Start recording
    recordingMachine.send({ type: 'START_RECORDING' });
  }
});

// RecordingMachine completes
recordingMachine.subscribe((state) => {
  if (state.matches('processing')) {
    // Start transcription and AI pipeline
    processVoiceInteraction(audioBuffer);
  }
});

// After TTS synthesis
playbackMachine.send({ type: 'START_PLAYBACK', audio: ttsBuffer });
```

## Benefits of Refactoring

### 1. Clearer Startup Orchestration
**Before**:
```javascript
// Unclear when detector is actually ready
const detector = await setupWakeWordDetector();
await startTTSWelcome(detector, audioPlayer); // Might play too early!
voiceService.send({type: 'READY'}); // When is this safe?
```

**After**:
```javascript
// Clear state visibility
const wakeWordMachine = setupWakeWordMachine();
wakeWordMachine.subscribe((state) => {
  if (state.matches('ready')) {
    // NOW it's safe to play welcome message
    await startTTSWelcome(detector, audioPlayer);
  }
});
```

### 2. Easier Debugging
Each machine has clear responsibilities and emits focused logs:
```
[WakeWordMachine] off → warming-up
[WakeWordMachine] warming-up → ready (2500ms elapsed)
[PlaybackMachine] idle → playing (welcome message)
[PlaybackMachine] playing → cooldown
```

### 3. Independent Testing
```javascript
// Test wake word detection in isolation
test('WakeWordMachine warm-up sequence', () => {
  const machine = setupWakeWordMachine();
  machine.send({ type: 'DETECTOR_INITIALIZED' });
  expect(machine.getSnapshot().value).toBe('warming-up');

  machine.send({ type: 'WARMUP_COMPLETE' });
  expect(machine.getSnapshot().value).toBe('ready');
});
```

### 4. Parallel Operations
With separate machines, we can:
- Accept wake word triggers while TTS is still playing (interruption)
- Prepare next recording session while previous AI query is still processing
- Stream TTS chunks while still generating AI response

### 5. Simpler State Diagram
Each machine has 3-5 states instead of one machine with 5+ states and complex guard conditions.

## Implementation Strategy

This refactoring will be done incrementally to minimize risk:

### Phase 1: Extract WakeWordMachine
- Create new `WakeWordMachine` with detector lifecycle states
- Keep existing `voiceMachine` running in parallel (compatibility mode)
- Gradually migrate detector events to new machine
- Use new machine for startup orchestration (fix welcome message timing)

### Phase 2: Extract PlaybackMachine
- Create `PlaybackMachine` for TTS and beeps
- Migrate interruption logic from orchestrator to playback machine
- Update beep isolation to query playback machine state

### Phase 3: Extract RecordingMachine
- Create `RecordingMachine` for audio capture and VAD
- Move recording state and VAD logic to new machine
- Simplify main.js setupMic() function

### Phase 4: Deprecate voiceMachine
- Remove old monolithic state machine
- Update all references to use new machines
- Clean up transition logic

## Success Criteria

- [ ] Welcome message plays ONLY after detector warm-up completes
- [ ] "Detector warm-up complete" appears exactly once in logs
- [ ] Each state machine has clear, focused responsibilities
- [ ] State machines can be tested independently
- [ ] Startup timing issues are resolved
- [ ] No regression in existing functionality (wake word detection, recording, TTS)
- [ ] Logs clearly show which machine is transitioning states
- [ ] Code is easier to understand and maintain

## Risks and Mitigations

**Risk**: Breaking existing functionality during migration
**Mitigation**: Incremental refactoring with parallel compatibility mode, comprehensive testing at each phase

**Risk**: Performance overhead from multiple machines
**Mitigation**: XState actors are lightweight, benchmark to ensure <5ms overhead

**Risk**: More complex orchestration code
**Mitigation**: Clear event-based communication, well-documented actor model usage

## Related Work

This aligns with:
- **refactor-code-quality-improvements**: Extracting magic numbers, improving code organization
- **improve-boot-and-communication-reliability** (archived): Better startup orchestration
- **add-voice-interruption-support**: Clean interruption semantics via PlaybackMachine

## References

- Current implementation: `apps/voice-gateway-oww/src/util/VoiceGateway.js`
- Orchestrator: `apps/voice-gateway-oww/src/services/VoiceInteractionOrchestrator.js`
- Startup sequence: `apps/voice-gateway-oww/src/main.js` (Phase 1-7)
- XState documentation: https://xstate.js.org/docs/
