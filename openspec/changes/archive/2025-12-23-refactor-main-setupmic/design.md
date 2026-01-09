# Design: setupMic() Refactoring

## Context

The current `setupMic()` function in `main.js` is a 157-line monolithic function that handles:
1. Microphone configuration and initialization
2. Three separate audio buffers with complex state management
3. Wake word detection with detector reset logic
4. Voice Activity Detection (VAD) with multiple thresholds and grace periods
5. XState v5 service integration for state machine transitions
6. Audio format conversion (Int16 → Float32)

The function has 4-5 levels of nesting, extensive mutable state (8+ local variables), and mixes multiple abstraction levels (low-level audio processing with high-level state machine coordination).

**Project Context:**
- Voice Gateway for Raspberry Pi 5
- Performance-critical path (wake word → spoken response must be <7 seconds)
- Hardware testing required (USB microphone, actual Z-Wave devices)
- Presentation demo on January 12, 2026 - stability is critical

**Constraints:**
- JavaScript only (NO TypeScript)
- Must preserve exact behavior (pure refactoring)
- No performance degradation
- Must work with existing XState v5 state machine
- Integration with OpenWakeWord detector, Whisper transcriber

## Goals / Non-Goals

### Goals
1. **Single Responsibility Principle** - Each class handles one clear concern
2. **Testability** - Classes can be unit tested in isolation
3. **Maintainability** - Reduce nesting from 4-5 levels to 1-2 levels
4. **Documentation** - Replace magic numbers with named constants
5. **Reusability** - Components can be used independently
6. **Zero Behavior Change** - Preserve exact same functionality and event flow

### Non-Goals
1. **NOT changing VAD algorithm** - Keep existing RMS energy calculation
2. **NOT adding new features** - Pure refactoring only
3. **NOT introducing TypeScript** - Remain JavaScript-only
4. **NOT changing external APIs** - setupMic() signature stays the same
5. **NOT optimizing performance** - Maintain current performance characteristics

## Decisions

### Decision 1: Four-Class Architecture

**Choice:** Extract into 4 focused classes rather than 2-3 larger classes or 5+ micro-classes.

**Rationale:**
- **AudioRecordingState** - Single responsibility: buffer management (audioBuffer, recordedAudio, preRollBuffer)
- **VoiceActivityDetector** - Single responsibility: silence detection and stopping conditions
- **WakeWordProcessor** - Single responsibility: wake word detection and scoring
- **MicrophoneManager** - Single responsibility: orchestration and coordination

**Alternatives considered:**
- **2 classes (MicManager + AudioProcessor)** - Rejected: Still too many responsibilities per class
- **6+ micro-classes** - Rejected: Over-engineering for current complexity
- **Keep as single function with helper functions** - Rejected: Doesn't solve testability or reusability

### Decision 2: Dependency Injection Pattern

**Choice:** All classes accept dependencies via constructor (config, logger, detector, etc.)

**Rationale:**
- Enables unit testing with mocks
- No hidden global state
- Makes dependencies explicit and traceable
- Aligns with project's stated design principles

**Example:**
```javascript
class VoiceActivityDetector {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        // Extract thresholds from config
    }
}
```

### Decision 3: Immutable Return Values

**Choice:** Methods return new objects/arrays rather than mutating passed parameters.

**Example:**
```javascript
// BAD: Mutates state parameter
processSamples(samples, state) {
    state.silenceCount += samples.length;
}

// GOOD: Returns decision object
processSamples(samples, recordingState) {
    return {
        shouldStop: boolean,
        reason: string,
        hasSpoken: boolean
    };
}
```

**Rationale:**
- Easier to reason about
- Reduces side effects
- Makes data flow explicit
- Aligns with "Functional Core, Imperative Shell" principle

### Decision 4: Constants Module

**Choice:** Create `src/audio/constants.js` for all VAD thresholds with documentation.

**Example:**
```javascript
export const VAD_CONSTANTS = {
    // Pre-roll buffer captures audio BEFORE wake word (for context)
    PRE_ROLL_MS: 300,

    // RMS energy threshold below which audio is considered silence
    // Typical voice: 0.05-0.2, background noise: <0.01
    SILENCE_THRESHOLD: 0.01,

    // Minimum speech duration to avoid false positives (coughs, clicks)
    MIN_SPEECH_MS: 700,

    // ... etc
};
```

**Rationale:**
- Documents the "why" behind magic numbers
- Centralizes configuration
- Makes tuning easier
- Improves code readability

### Decision 5: Preserve XState Integration in MicrophoneManager

**Choice:** Keep XState subscription logic in MicrophoneManager rather than extracting to separate class.

**Rationale:**
- XState integration is orchestration logic (belongs in manager)
- State machine is tightly coupled to microphone lifecycle
- Extracting would create unnecessary indirection
- Current coupling is appropriate for this use case

### Decision 6: Directory Structure

**Choice:** Create `src/audio/` directory for new classes.

**Structure:**
```
src/
├── audio/
│   ├── constants.js                # VAD configuration constants
│   ├── AudioRecordingState.js      # Buffer management
│   ├── VoiceActivityDetector.js    # VAD logic
│   ├── WakeWordProcessor.js        # Wake word detection
│   └── MicrophoneManager.js        # Orchestration
├── util/
│   ├── AudioUtils.js               # Shared utilities (rmsEnergy, playAudio)
│   └── ...
└── main.js                          # Entry point with refactored setupMic()
```

**Rationale:**
- Follows project convention for module organization
- `audio/` groups related concerns
- `util/` remains for shared utilities
- Clear separation between domain logic and utilities

### Decision 7: Maintain Helper Functions in AudioUtils

**Choice:** Keep `rmsEnergy()` in AudioUtils.js, add `toFloat32FromInt16Buffer()` if not present.

**Rationale:**
- These are pure utility functions used in multiple places
- AudioUtils already contains audio-related helpers
- Avoids code duplication
- Consistent with existing architecture

## Risks / Trade-offs

### Risk 1: Regression in Demo Behavior
**Impact:** High - Demo must work perfectly on January 12, 2026
**Mitigation:**
- Comprehensive hardware testing before merging
- Test all demo script scenarios 10+ times
- Keep original main.js in git history for easy rollback
- Manual verification checklist (wake word, VAD, transcription, etc.)

### Risk 2: Performance Degradation
**Impact:** Medium - Voice pipeline must stay under 7 seconds
**Mitigation:**
- Benchmark before/after with actual hardware
- Monitor CPU usage during testing
- Profile hot paths if degradation detected
- Simple object creation should have negligible overhead

### Risk 3: Increased Complexity for Simple Changes
**Impact:** Low - More files to navigate
**Mitigation:**
- Clear module naming and documentation
- Centralized orchestration in MicrophoneManager
- README.md architecture diagram showing class relationships
- Well-documented public APIs

### Trade-off: More Files vs Better Organization
**Choice:** Accept 4 new files for better separation of concerns
**Reasoning:**
- Current 157-line function is harder to navigate than 4 focused classes
- File navigation in modern IDEs is trivial
- Benefits (testability, maintainability) outweigh costs
- Aligns with project's stated goals for code quality

## Migration Plan

### Phase 1: Extraction (Tasks 1-5)
1. Create directory structure and empty class files
2. Extract classes one at a time (AudioRecordingState → VAD → WakeWordProcessor → MicrophoneManager)
3. Each class should compile and pass basic smoke tests before moving to next

### Phase 2: Integration (Task 6)
1. Refactor main.js to use MicrophoneManager
2. Preserve exact same setupMic() signature and return value
3. Ensure no changes to event handling or state transitions

### Phase 3: Testing (Task 8)
1. Hardware testing with USB microphone on Raspberry Pi 5
2. Complete voice command flow testing
3. Performance benchmarking
4. Demo script validation

### Phase 4: Cleanup (Task 9)
1. Code review for SRP violations
2. Remove unused code
3. Update documentation

### Rollback Plan
If issues are discovered:
1. Revert main.js to original implementation
2. Keep extracted classes for future use
3. Investigate issues in isolation
4. Re-attempt integration when issues resolved

## Open Questions

1. **Should AudioRecordingState expose buffers directly or only via methods?**
   - Recommendation: Methods only (better encapsulation)
   - Getters like `getRecordedAudio()` return copies/snapshots

2. **Should we add unit tests as part of this refactoring?**
   - Recommendation: Not in this change (scope creep)
   - Create separate change proposal for adding tests after refactoring
   - Current focus: Pure refactoring with manual hardware testing

3. **Should constants be configurable via config.js or hardcoded in constants.js?**
   - Recommendation: Read from config.js (already configurable via env vars)
   - constants.js defines defaults and documentation
   - Classes read from config in constructor

4. **Should we extract toFloat32FromInt16Buffer() to AudioUtils?**
   - Recommendation: Yes, if it's used in multiple places
   - Check current usage in codebase
   - Move to AudioUtils if reusable, keep in AudioRecordingState if specific to buffer management
