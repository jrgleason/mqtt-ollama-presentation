# Design: AudioUtils.js Refactoring

## Context

The voice-gateway-oww module processes audio in real-time for wake word detection and voice commands. AudioUtils.js has grown organically to handle multiple concerns, making it difficult to test and understand.

**Current problems:**
1. Mixed abstraction levels (constants, utilities, state management, platform-specific code)
2. Global side effect (BeepUtil instance creation on module load)
3. Tight coupling between unrelated functionality
4. Difficult to test platform-specific code in isolation
5. Unclear ownership of detector state management

**Constraints:**
- Must maintain performance (real-time audio processing)
- JavaScript only (no TypeScript)
- Support both macOS and Linux platforms
- Preserve existing behavior during refactor
- Follow project conventions (class-based architecture with dependency injection)

**Stakeholders:**
- Voice gateway service (main.js)
- Background transcription service
- OpenWakeWord detector
- Init/setup utilities

## Goals / Non-Goals

**Goals:**
1. Separate concerns into single-responsibility modules
2. Eliminate global side effects (explicit initialization)
3. Improve testability through dependency injection
4. Clarify platform-specific logic with dedicated class
5. Make detector state management explicit

**Non-Goals:**
1. Change audio processing algorithms (preserve existing behavior)
2. Add new features or capabilities
3. Change public API behavior (only import paths change)
4. Optimize performance (unless regression occurs)
5. Add TypeScript (project constraint)

## Decisions

### Decision 1: Five-Module Split

**What:** Split AudioUtils.js into 5 focused modules:
- `audio/constants.js` - Configuration constants
- `audio/AudioUtils.js` - Pure audio functions
- `audio/AudioPlayer.js` - Platform-specific playback
- `wake-word/DetectorStateManager.js` - Detector state
- `util/XStateHelpers.js` - XState compatibility

**Why:**
- Each module has single, clear responsibility
- Easy to locate relevant code
- Testable in isolation
- Follows existing project patterns (e.g., BeepUtil.js is already separate)

**Alternatives considered:**
1. **Two modules (utils + player)** - Still mixes concerns
2. **Three modules (constants, utils, player)** - Doesn't address detector state coupling
3. **Keep as-is** - Technical debt continues to grow

**Chosen:** Five modules provides optimal balance of separation without over-engineering.

### Decision 2: AudioPlayer as Class (Not Function)

**What:** Replace `playAudio()` function with `AudioPlayer` class that is dependency-injected.

**Why:**
- Allows mocking in tests (inject mock player)
- Makes platform detection explicit (constructor logic)
- Encapsulates temp file cleanup logic
- Follows project convention (class-based services)

**Alternatives considered:**
1. **Keep as function** - Harder to test, global platform detection
2. **Strategy pattern** - Over-engineered for two platforms
3. **Factory function** - Less clear lifetime management

**Chosen:** Class with dependency injection aligns with project patterns.

### Decision 3: DetectorStateManager as Class

**What:** Encapsulate detector state functions in `DetectorStateManager` class.

**Why:**
- State creation and manipulation belong together
- Allows configuration (frames, bins) at instantiation
- Explicit ownership of detector lifecycle
- Easier to add state tracking/debugging later

**Alternatives considered:**
1. **Keep as pure functions** - Loses context of state lifecycle
2. **Add to OpenWakeWordDetector** - Violates SRP (detector already complex)
3. **Stateful singleton** - Harder to test

**Chosen:** Lightweight class provides structure without heavy abstractions.

### Decision 4: Extract XState Helpers to Separate Module

**What:** Move XState compatibility helpers to `util/XStateHelpers.js`.

**Why:**
- Unrelated to audio processing
- Logical grouping of state machine utilities
- May grow as more XState patterns emerge
- Clear location for version compatibility shims

**Alternatives considered:**
1. **Keep in AudioUtils** - Mixes state machine with audio concerns
2. **Put in main.js** - Not reusable
3. **Each consumer has own copy** - Code duplication

**Chosen:** Separate module allows reuse and clear responsibility.

### Decision 5: Remove BEEPS Export (Use BeepUtil Directly)

**What:** Remove `export const BEEPS` re-export from AudioUtils.

**Why:**
- BeepUtil.js already exists and exports BEEPS
- Re-exporting creates unclear import paths
- Global instance was side effect on module load
- Consumers should explicitly import from BeepUtil

**Migration:**
```javascript
// Before
import { BEEPS } from './util/AudioUtils.js';

// After
import { BeepUtil } from './util/BeepUtil.js';
const beepUtil = new BeepUtil(config);
const { BEEPS } = beepUtil;
```

### Decision 6: checkAlsaDevice Placement

**What:** Move `checkAlsaDevice` to `audio/AudioUtils.js` (not AudioPlayer).

**Why:**
- It's a validation utility, not playback functionality
- Used during initialization (before player exists)
- Pure function (no state, no side effects)
- Logically similar to writeWavFile (audio I/O utility)

**Alternatives considered:**
1. **AudioPlayer class** - Wrong abstraction (validation vs playback)
2. **Separate module** - Over-engineered for single function
3. **InitUtil** - Not reusable outside initialization

**Chosen:** AudioUtils.js groups audio I/O utilities together.

## Module Structure

### Proposed Directory Layout

```
src/
├── audio/                          # NEW: Audio processing modules
│   ├── constants.js                # Audio configuration constants
│   ├── AudioUtils.js               # Pure audio functions
│   └── AudioPlayer.js              # Platform-specific playback
├── wake-word/                      # NEW: Wake word detection modules
│   └── DetectorStateManager.js     # Detector state management
├── util/
│   ├── AudioUtils.js               # DELETE: Original mixed file
│   ├── BeepUtil.js                 # EXISTING: Beep generation
│   ├── XStateHelpers.js            # NEW: XState compatibility
│   ├── Logger.js                   # EXISTING
│   ├── OpenWakeWordDetector.js     # EXISTING (update imports)
│   ├── BackgroundTranscriber.js    # EXISTING (update imports)
│   └── InitUtil.js                 # EXISTING (update imports)
└── main.js                         # EXISTING (update imports)
```

### Module API Contracts

#### audio/constants.js
```javascript
// Pure data exports, no dependencies
export const SAMPLE_RATE = 16000;
export const CHUNK_SIZE = 1280;
```

#### audio/AudioUtils.js
```javascript
// Pure functions, no side effects
export const rmsEnergy = (samples) => { /* ... */ };
export const writeWavFile = async (wavPath, samples, options) => { /* ... */ };
export const checkAlsaDevice = async (alsaDevice, rate, channels) => { /* ... */ };
```

#### audio/AudioPlayer.js
```javascript
// Stateful class with dependency injection
export class AudioPlayer {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        this.isMacOS = process.platform === 'darwin';
    }

    async play(pcmAudio) { /* platform-specific playback */ }
}
```

#### wake-word/DetectorStateManager.js
```javascript
// State management class
export class DetectorStateManager {
    constructor({ frames = 76, bins = 32 } = {}) {
        this.frames = frames;
        this.bins = bins;
    }

    createMelBuffer() { /* ... */ }
    newDetectorState() { /* ... */ }
    fillMelBufferWithZeros(melBuffer) { /* ... */ }
    reset(state) { /* ... */ }
}
```

#### util/XStateHelpers.js
```javascript
// XState compatibility utilities
export function getServiceSnapshot(voiceService) { /* ... */ }
export function safeDetectorReset(detector, context = '') { /* ... */ }
```

## Migration Plan

### Phase 1: Create New Modules (No Breaking Changes)
1. Create new directory structure (`audio/`, `wake-word/`)
2. Implement new modules with identical exports
3. Add unit tests for new modules
4. Keep original AudioUtils.js unchanged

**Checkpoint:** New modules exist and pass tests, old code unchanged.

### Phase 2: Update Consumers
1. Update imports in main.js
2. Update imports in BackgroundTranscriber.js
3. Update imports in InitUtil.js
4. Update imports in OpenWakeWordDetector.js
5. Test each file individually after updating

**Checkpoint:** All consumers use new modules, old module not imported.

### Phase 3: Delete Original Module
1. Verify no remaining imports of AudioUtils.js
2. Delete `/apps/voice-gateway-oww/src/util/AudioUtils.js`
3. Run full test suite
4. Test end-to-end voice pipeline

**Checkpoint:** Original module deleted, all tests pass.

### Rollback Plan
If issues arise:
1. Revert consumer imports to original AudioUtils.js
2. Delete new modules
3. Restore original AudioUtils.js from git

**Timeframe:** ~2-3 hours for implementation, ~30 minutes for migration.

## Risks / Trade-offs

### Risk 1: Breaking Existing Behavior
**Likelihood:** Medium
**Impact:** High (voice pipeline stops working)

**Mitigation:**
- Copy exact implementation from original file
- Write unit tests comparing old vs new behavior
- Test on actual hardware before merging
- Keep rollback plan ready

### Risk 2: Import Path Confusion
**Likelihood:** Low
**Impact:** Medium (build errors, runtime failures)

**Mitigation:**
- Clear import examples in PR description
- Update all imports in single commit
- Use IDE search to find all AudioUtils imports
- Add migration guide to CLAUDE.md

### Risk 3: Performance Regression
**Likelihood:** Low
**Impact:** Medium (slower audio processing)

**Mitigation:**
- No algorithmic changes (only organization)
- Measure response time before/after
- Profile if regression detected
- Rollback if >10% performance loss

### Risk 4: Platform-Specific Bugs
**Likelihood:** Low
**Impact:** Medium (playback fails on one platform)

**Mitigation:**
- Test on both macOS and Linux
- Keep platform detection logic identical
- Add platform-specific unit tests
- Manual testing on Raspberry Pi

## Trade-offs

### Simplicity vs. Structure
**Trade-off:** More files/imports vs. clearer responsibilities

**Chosen:** Structure wins - project already has 24 files in `src/`, adding 5 more is acceptable for clarity.

### Class vs. Function
**Trade-off:** Class overhead vs. testability

**Chosen:** Classes win - aligns with project patterns (BeepUtil, ElevenLabsTTS, etc.) and improves testability.

### Immediate vs. Gradual Migration
**Trade-off:** Big-bang refactor vs. incremental changes

**Chosen:** Big-bang wins - small enough scope (~4 files), easier to review as single PR.

## Open Questions

1. **Should checkAlsaDevice be instance method or static function?**
   - **Decision:** Keep as pure function (no state needed)

2. **Should AudioPlayer cache platform detection?**
   - **Decision:** Yes, in constructor (platform won't change at runtime)

3. **Should DetectorStateManager track state instances?**
   - **Decision:** No, keep stateless (consumers manage instances)

4. **Should XStateHelpers include other state machine utilities?**
   - **Decision:** Only add when needed (YAGNI principle)

5. **Should we add barrel exports (index.js) for new directories?**
   - **Decision:** No, explicit imports are clearer for small modules

## Success Criteria

1. ✅ All existing tests pass
2. ✅ New unit tests added for each module (>80% coverage)
3. ✅ End-to-end voice pipeline works on hardware
4. ✅ No performance regression (response time ±5%)
5. ✅ All imports updated (no references to old AudioUtils.js)
6. ✅ Documentation updated (README, CLAUDE.md)
7. ✅ Code review approved
8. ✅ Passes on both macOS and Linux platforms
