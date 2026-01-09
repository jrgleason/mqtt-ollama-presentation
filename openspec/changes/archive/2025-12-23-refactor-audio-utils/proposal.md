# Change: Refactor AudioUtils.js into Focused Modules

## Why

AudioUtils.js has grown to 176 lines mixing 6 different concerns in a single file:
1. Audio constants (SAMPLE_RATE, CHUNK_SIZE)
2. Pure audio utilities (rmsEnergy, writeWavFile)
3. OpenWakeWord detector state management (newDetectorState, fillMelBufferWithZeros)
4. XState compatibility helpers (getServiceSnapshot)
5. Platform-specific audio playback (playAudio with macOS/Linux branching)
6. ALSA device validation (checkAlsaDevice)

Additionally, the module creates a global BeepUtil instance as a side effect on load (line 17), which violates the principle of explicit initialization and makes testing difficult.

This violates the Single Responsibility Principle and makes the code harder to:
- Test in isolation
- Understand at a glance
- Modify without unintended side effects
- Reuse in other contexts

## What Changes

**BREAKING:** Split AudioUtils.js into 5 focused modules with clear responsibilities:

1. **audio/constants.js** - Audio configuration constants
   - Exports: SAMPLE_RATE, CHUNK_SIZE
   - No dependencies, pure data

2. **audio/AudioUtils.js** - Pure audio processing functions
   - Exports: rmsEnergy, writeWavFile
   - No side effects, functional utilities

3. **audio/AudioPlayer.js** - Platform-specific audio playback class
   - Exports: AudioPlayer class
   - Encapsulates macOS/Linux platform detection and playback logic
   - Dependency injection for config

4. **wake-word/DetectorStateManager.js** - OpenWakeWord detector state
   - Exports: DetectorStateManager class
   - Manages mel buffer and embedding buffer lifecycle
   - Encapsulates detector state initialization and reset

5. **util/XStateHelpers.js** - XState compatibility utilities
   - Exports: getServiceSnapshot, safeDetectorReset
   - Version compatibility layer for XState v4/v5

**Migration:**
- BEEPS constant removed from AudioUtils.js (was already extracted to BeepUtil.js)
- Consumers must update imports to use new module paths
- AudioPlayer must be instantiated instead of using global playAudio function

## Impact

**Affected specs:**
- audio-processing (new spec)
- wake-word-detection (existing spec - will be added to specs/ directory)
- voice-gateway-core (existing patterns - will be added to specs/ directory)

**Affected code:**
- `/apps/voice-gateway-oww/src/util/AudioUtils.js` - Split into 5 modules
- `/apps/voice-gateway-oww/src/main.js` - Update imports (BEEPS, playAudio, SAMPLE_RATE, CHUNK_SIZE, getServiceSnapshot, safeDetectorReset)
- `/apps/voice-gateway-oww/src/util/BackgroundTranscriber.js` - Update imports (rmsEnergy, writeWavFile, playAudio)
- `/apps/voice-gateway-oww/src/util/InitUtil.js` - Update imports (checkAlsaDevice, playAudio, safeDetectorReset)
- `/apps/voice-gateway-oww/src/util/OpenWakeWordDetector.js` - Update imports (fillMelBufferWithZeros, newDetectorState)

**Breaking changes:**
1. Import paths changed for all AudioUtils exports
2. `playAudio()` function replaced with `AudioPlayer` class (requires instantiation)
3. `BEEPS` no longer exported from AudioUtils (use BeepUtil directly)
4. Detector state functions now part of DetectorStateManager class

**Migration effort:** ~30 minutes
- Update 4 files with new import statements
- Replace `playAudio()` calls with `audioPlayer.play()` (where audioPlayer is injected)
- Tests updated to import from specific modules

**Benefits:**
- Clear separation of concerns (easier to understand)
- Better testability (mock individual modules)
- No global side effects (explicit initialization)
- Easier to extend (add platform support without touching other code)
- Follows project conventions (class-based architecture with dependency injection)
