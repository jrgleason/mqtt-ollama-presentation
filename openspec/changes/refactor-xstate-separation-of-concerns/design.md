# Design: XState Separation of Concerns

## Architectural Decision

Split the monolithic `voiceMachine` XState machine into three focused, orthogonal state machines to improve maintainability, debuggability, and enable parallel operations.

## Design Principles

### 1. Single Responsibility Principle
Each state machine manages one cohesive lifecycle:
- **WakeWordMachine**: Detector initialization and readiness
- **RecordingMachine**: Audio capture with VAD
- **PlaybackMachine**: TTS and beep playback with interruption

### 2. Event-Driven Communication
Machines communicate via events rather than shared state, following XState's actor model.

### 3. Explicit State Visibility
State queries become more semantic:
```javascript
// Before: Unclear what "cooldown" means
if (voiceService.getSnapshot().matches('cooldown')) { ... }

// After: Clear intent
if (playbackMachine.getSnapshot().matches('playing')) { ... }
if (wakeWordMachine.getSnapshot().matches('ready')) { ... }
```

### 4. Incremental Migration
Implement new machines alongside existing `voiceMachine` to minimize risk, then deprecate old machine after validation.

## State Machine Specifications

### WakeWordMachine

```typescript
// Pseudo-TypeScript for clarity (actual implementation in JavaScript)
type WakeWordState =
  | { value: 'off'; context: { detector: null } }
  | { value: 'warming-up'; context: { detector: OpenWakeWordDetector, warmupStarted: number } }
  | { value: 'ready'; context: { detector: OpenWakeWordDetector } }
  | { value: 'triggered'; context: { detector: OpenWakeWordDetector, score: number } }

type WakeWordEvent =
  | { type: 'DETECTOR_INITIALIZED'; detector: OpenWakeWordDetector }
  | { type: 'WARMUP_COMPLETE' }
  | { type: 'WAKE_WORD_DETECTED'; score: number }
  | { type: 'TRIGGER_PROCESSED' }
  | { type: 'RESET_DETECTOR' }
```

**State Transitions**:
```
off → DETECTOR_INITIALIZED → warming-up
warming-up → WARMUP_COMPLETE (after 2500ms) → ready
ready → WAKE_WORD_DETECTED → triggered
triggered → TRIGGER_PROCESSED → ready
ready → RESET_DETECTOR → warming-up
```

**Integration Points**:
- Listens to `OpenWakeWordDetector.on('warmup-complete')` event
- Emits `wake-word-detected` event to main orchestrator
- Provides `isReady()` query for startup synchronization

### RecordingMachine

```typescript
type RecordingState =
  | { value: 'idle' }
  | { value: 'recording'; context: { startedAt: number, audioBuffer: Float32Array[] } }
  | { value: 'processing'; context: { audioSnapshot: Float32Array } }

type RecordingEvent =
  | { type: 'START_RECORDING' }
  | { type: 'SILENCE_DETECTED' }
  | { type: 'MAX_LENGTH_REACHED' }
  | { type: 'RECORDING_COMPLETE' }
```

**State Transitions**:
```
idle → START_RECORDING → recording
recording → SILENCE_DETECTED → processing
recording → MAX_LENGTH_REACHED → processing
processing → RECORDING_COMPLETE → idle
```

**Integration Points**:
- Receives `START_RECORDING` when wake word detected
- Emits `recording-complete` with audio buffer to orchestrator
- Provides `isRecording()` query for beep isolation

### PlaybackMachine

```typescript
type PlaybackState =
  | { value: 'idle' }
  | { value: 'playing'; context: { playback: AudioPlayback, type: 'tts' | 'beep' } }
  | { value: 'cooldown'; context: { endsAt: number } }
  | { value: 'interrupted'; context: { reason: string } }

type PlaybackEvent =
  | { type: 'START_PLAYBACK'; audio: Buffer, playbackType: 'tts' | 'beep' }
  | { type: 'PLAYBACK_COMPLETE' }
  | { type: 'COOLDOWN_COMPLETE' }
  | { type: 'INTERRUPT' }
  | { type: 'INTERRUPT_HANDLED' }
```

**State Transitions**:
```
idle → START_PLAYBACK → playing
playing → PLAYBACK_COMPLETE → cooldown
playing → INTERRUPT → interrupted
cooldown → COOLDOWN_COMPLETE → idle
interrupted → INTERRUPT_HANDLED → idle
```

**Integration Points**:
- Receives `START_PLAYBACK` after TTS synthesis
- Emits `playback-complete` when audio finishes
- Provides `isPlaying()` query for interruption checks
- Provides `cancelActivePlayback()` method for barge-in

## Orchestration Pattern

The main orchestrator coordinates machines via event subscriptions:

```javascript
// apps/voice-gateway-oww/src/main.js (simplified)

async function main() {
  // Phase 1: Initialize machines
  const wakeWordMachine = setupWakeWordMachine();
  const recordingMachine = setupRecordingMachine();
  const playbackMachine = setupPlaybackMachine();

  // Phase 2: Setup event listeners
  wakeWordMachine.subscribe((state) => {
    if (state.matches('ready') && !welcomeMessagePlayed) {
      // Safe to play welcome message - detector is ready
      startTTSWelcome(detector, audioPlayer, playbackMachine);
      welcomeMessagePlayed = true;
    }

    if (state.matches('triggered')) {
      // Wake word detected - start recording
      recordingMachine.send({ type: 'START_RECORDING' });

      // Cancel active TTS if playing (interruption)
      if (playbackMachine.getSnapshot().matches('playing')) {
        playbackMachine.send({ type: 'INTERRUPT' });
      }
    }
  });

  recordingMachine.subscribe((state) => {
    if (state.matches('processing')) {
      // Recording complete - start voice interaction pipeline
      const audioBuffer = state.context.audioSnapshot;
      orchestrator.processVoiceInteraction(audioBuffer);
    }
  });

  playbackMachine.subscribe((state) => {
    if (state.matches('idle') && state.history?.matches('cooldown')) {
      // Cooldown complete - detector is ready for next interaction
      logger.debug('Ready for next wake word');
    }
  });

  // Phase 3: Initialize detector
  const detector = await setupWakeWordDetector();
  wakeWordMachine.send({ type: 'DETECTOR_INITIALIZED', detector });

  // Detector will emit 'warmup-complete' event, triggering welcome message
}
```

## Beep Isolation Pattern

With separate machines, beep isolation becomes clearer:

```javascript
// Before: Query recording state from voiceService
const isRecording = () => voiceService.getSnapshot().matches('recording');

// After: Query both recording AND playback state
const shouldPlayBeep = () => {
  const notRecording = !recordingMachine.getSnapshot().matches('recording');
  const notPlaying = !playbackMachine.getSnapshot().matches('playing');
  return notRecording && notPlaying;
};

// Usage in wake word detection
if (score > threshold) {
  if (shouldPlayBeep()) {
    audioPlayer.play(BEEPS.wakeWord);
  }
  wakeWordMachine.send({ type: 'WAKE_WORD_DETECTED', score });
}
```

## Startup Sequence with New Machines

```
[Main] Phase 1: Initialize health checks
[Main] Phase 2: Create detector
[Main] Phase 3: Initialize tool system
[Main] Phase 4: Setup machines
  [WakeWordMachine] off → warming-up
[Main] Phase 5: Start microphone
  [Mic] Audio streaming to detector
  [OpenWakeWordDetector] Buffers filling...
  [OpenWakeWordDetector] Embedding buffer filled
  [OpenWakeWordDetector] Starting 2.5s warm-up timer...
  [OpenWakeWordDetector] Warm-up complete! (emit event)
  [WakeWordMachine] warming-up → ready
  [WakeWordMachine] Emit wake-word-ready event
[Main] WakeWordMachine listener: Detector ready, playing welcome
  [PlaybackMachine] idle → playing
  [TTS] Synthesizing welcome message...
  [TTS] Playing audio...
  [PlaybackMachine] playing → cooldown
  [PlaybackMachine] cooldown → idle
[Main] Phase 6: All systems ready
```

## Testing Strategy

### Unit Tests for State Machines

```javascript
// tests/wake-word-machine.test.js
describe('WakeWordMachine', () => {
  test('transitions from off to warming-up', () => {
    const machine = setupWakeWordMachine();
    machine.send({ type: 'DETECTOR_INITIALIZED', detector: mockDetector });
    expect(machine.getSnapshot().value).toBe('warming-up');
  });

  test('transitions to ready after warmup', () => {
    const machine = setupWakeWordMachine();
    machine.send({ type: 'DETECTOR_INITIALIZED', detector: mockDetector });
    machine.send({ type: 'WARMUP_COMPLETE' });
    expect(machine.getSnapshot().value).toBe('ready');
  });

  test('resets to warming-up when detector reset', () => {
    const machine = setupWakeWordMachine();
    // ... transition to ready state ...
    machine.send({ type: 'RESET_DETECTOR' });
    expect(machine.getSnapshot().value).toBe('warming-up');
  });
});
```

### Integration Tests

```javascript
// tests/machine-orchestration.test.js
describe('Machine Orchestration', () => {
  test('wake word triggers recording after detector ready', async () => {
    const { wakeWordMachine, recordingMachine } = setupMachines();

    // Simulate detector warm-up
    wakeWordMachine.send({ type: 'DETECTOR_INITIALIZED' });
    wakeWordMachine.send({ type: 'WARMUP_COMPLETE' });

    // Simulate wake word detection
    wakeWordMachine.send({ type: 'WAKE_WORD_DETECTED', score: 0.95 });

    // Verify recording started
    expect(recordingMachine.getSnapshot().value).toBe('recording');
  });
});
```

## Migration Path

### Phase 1: WakeWordMachine (Week 1)
**Goal**: Fix welcome message timing issue

1. Create `WakeWordMachine.js` with detector lifecycle states
2. Add event listeners for `warmup-complete` from OpenWakeWordDetector
3. Update `main.js` to wait for `ready` state before welcome message
4. Keep `voiceMachine` running for recording/playback logic
5. Test: Welcome message plays after warm-up completes
6. Test: "Detector warm-up complete" appears exactly once

### Phase 2: PlaybackMachine (Week 2)
**Goal**: Clean interruption semantics

1. Create `PlaybackMachine.js` with playback states
2. Migrate `cancelActivePlayback()` from orchestrator to machine
3. Update beep isolation to query playback machine
4. Add interruption events from wake word detection
5. Test: Interruption works (barge-in during TTS)
6. Test: Beeps don't play during TTS

### Phase 3: RecordingMachine (Week 3)
**Goal**: Separate recording logic

1. Create `RecordingMachine.js` with recording states
2. Move VAD state from `setupMic()` to recording machine
3. Emit `recording-complete` event with audio buffer
4. Update orchestrator to subscribe to recording events
5. Test: Recording works identically to before
6. Test: VAD silence detection triggers correctly

### Phase 4: Deprecate voiceMachine (Week 4)
**Goal**: Remove old monolithic machine

1. Remove `voiceMachine` from `VoiceGateway.js`
2. Update all references to use new machines
3. Clean up transition logic in main.js
4. Remove deprecated code
5. Test: Full end-to-end voice interaction works
6. Test: All edge cases (interruption, errors, timeouts)

## Performance Considerations

**XState Actor Overhead**: Each machine adds ~1-2ms per event dispatch. With 3 machines and ~10 events per interaction, total overhead is ~30ms (acceptable for 7-second target).

**Memory Footprint**: Each machine maintains minimal context (~100 bytes). Total additional memory: <1KB.

**Event Bus Latency**: Event subscriptions are synchronous in XState, so cross-machine communication adds negligible latency (<1ms).

## Alternative Designs Considered

### Alternative 1: Nested State Machines
Use XState's nested/parallel states within single machine.

**Rejected because**:
- Still tightly coupled, hard to test in isolation
- Parallel states add complexity without clear benefits
- Doesn't solve startup orchestration issue

### Alternative 2: Simple State Variables
Replace XState with boolean flags (`isRecording`, `isPlaying`, etc.)

**Rejected because**:
- Loses state transition logging and visualization
- No guard conditions or action hooks
- Manual state validation prone to bugs
- XState provides valuable developer tooling

### Alternative 3: Observable Pattern
Use RxJS observables for state management.

**Rejected because**:
- Adds new dependency (RxJS)
- Team is already familiar with XState
- Loses XState's state chart visualization
- Migration effort is higher

## Open Questions

1. **Should machines run in same process or separate threads?**
   - **Decision**: Same process. Overhead is minimal, no need for worker threads.

2. **How to handle machine initialization order dependencies?**
   - **Decision**: WakeWordMachine initializes first (detector), then others. Main orchestrator coordinates.

3. **Should machines persist state across restarts?**
   - **Decision**: No persistence needed. State is ephemeral for voice interactions.

4. **How to visualize machine interactions?**
   - **Decision**: Use XState visualizer during development, structured logging in production.
