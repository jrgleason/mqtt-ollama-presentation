# Change: Refactor setupMic() Into Focused Classes

## Why

The `setupMic()` function in `main.js` is a 157-line monolithic function with 4-5 levels of nesting that handles multiple concerns:
- Microphone configuration and initialization
- Audio buffer management (audioBuffer, recordedAudio, preRollBuffer)
- Wake word detection event handling
- Voice Activity Detection (VAD) with complex state logic
- XState service integration and state transitions
- Audio format conversion (Int16 to Float32)

This violates the Single Responsibility Principle and makes the code:
- Hard to test in isolation
- Difficult to understand and maintain
- Prone to bugs due to shared mutable state
- Impossible to reuse components in other contexts

The project conventions (documented in `openspec/project.md`) explicitly identify this as a target for refactoring.

## What Changes

- **Extract AudioRecordingState class** - Manages recording state and all three audio buffers (audioBuffer, recordedAudio, preRollBuffer) with clear buffer management APIs
- **Extract WakeWordProcessor class** - Encapsulates wake word detection logic, score evaluation, and detector reset handling
- **Extract VoiceActivityDetector class** - Implements VAD logic with documented thresholds and grace period handling
- **Extract MicrophoneManager class** - Orchestrates microphone setup, coordinates the above classes, and handles XState integration
- **Refactor setupMic() function** - Reduce from 157 lines to ~30 lines of clean orchestration code
- **Document VAD thresholds** - Make magic numbers (0.01, 300ms, 1500ms, etc.) into well-documented named constants

This is a **pure refactoring** with no behavioral changes - all existing functionality is preserved.

## Impact

- **Affected specs:** microphone-management (new capability)
- **Affected code:**
  - `apps/voice-gateway-oww/src/main.js` - setupMic() function refactored
  - `apps/voice-gateway-oww/src/audio/` - New directory with extracted classes
  - `apps/voice-gateway-oww/src/util/AudioUtils.js` - Potentially import new buffer utilities
- **Testing:** Existing manual testing with hardware should continue to work identically
- **Risk:** Low - Pure refactoring with same inputs/outputs, tested with actual hardware before merging
- **Dependencies:** None - This change is self-contained within the voice-gateway-oww module

## Benefits

1. **Testability** - Each class can be unit tested in isolation
2. **Maintainability** - Clear separation of concerns makes code easier to understand
3. **Reusability** - Classes can be used independently (e.g., VAD in other audio contexts)
4. **Documentation** - Magic numbers become named constants with explanatory comments
5. **Debugging** - Easier to trace issues to specific components
6. **Code Quality** - Aligns with project's stated design principles (SRP, DI, Functional Core)
