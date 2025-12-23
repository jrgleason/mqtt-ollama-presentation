# Microphone Setup Refactoring Guide

## Overview

The monolithic 248-line `setupMic()` function in `main.js` has been refactored into focused, testable classes following the Single Responsibility Principle.

## New Architecture

### Created Classes (in `src/audio/`)

1. **AudioRecordingState** (`AudioRecordingState.js`)
   - Manages all audio buffers (audioBuffer, recordedAudio, preRollBuffer)
   - Handles recording lifecycle (start, append, stop)
   - Provides immutable audio snapshots

2. **VoiceActivityDetector** (`VoiceActivityDetector.js`)
   - Implements VAD logic for silence detection
   - Handles grace period after wake word
   - Enforces minimum speech duration and max recording length
   - Returns structured decisions ({shouldStop, reason, hasSpoken})

3. **WakeWordProcessor** (`WakeWordProcessor.js`)
   - Processes audio chunks through OpenWakeWord detector
   - Evaluates scores against threshold
   - Triggers audio feedback (beeps)
   - Handles detector reset and errors

4. **MicrophoneManager** (`MicrophoneManager.js`)
   - Orchestrates all microphone functionality
   - Integrates with XState voice state machine
   - Coordinates AudioRecordingState, VoiceActivityDetector, and WakeWordProcessor
   - Provides clean interface for main.js

### Configuration Constants (`src/audio/constants.js`)

All VAD magic numbers are now well-documented named constants:
- `PRE_ROLL_MS` (300ms) - Pre-roll buffer duration
- `SILENCE_THRESHOLD` (0.01) - RMS energy threshold
- `MIN_SPEECH_MS` (700ms) - Minimum speech duration
- `DEFAULT_TRAILING_SILENCE_MS` (1500ms) - Silence before stopping
- `DEFAULT_MAX_RECORDING_MS` (10000ms) - Maximum recording length
- `DEFAULT_GRACE_BEFORE_STOP_MS` (1200ms) - Grace period after wake word

## Migration Steps for main.js

### Step 1: Update Imports

Replace the old imports:
```javascript
import mic from 'mic';
import {SAMPLE_RATE, CHUNK_SIZE, getServiceSnapshot, playAudio, safeDetectorReset} from "./util/AudioUtils.js";
```

With:
```javascript
import {MicrophoneManager} from "./audio/MicrophoneManager.js";
```

Keep these imports for backward compatibility (if setupMic is not yet refactored):
```javascript
import {AudioPlayer} from "./audio/AudioPlayer.js";
import {BeepUtil} from "./util/BeepUtil.js";
import {SAMPLE_RATE, CHUNK_SIZE} from "./audio/constants.js";
import {getServiceSnapshot, safeDetectorReset} from "./util/AudioUtils.js";
```

### Step 2: Replace setupMic() Function

Replace the entire 248-line `setupMic()` function (lines 35-283) with:

```javascript
/**
 * Voice Gateway Microphone Setup
 *
 * This function creates and starts a MicrophoneManager instance that
 * orchestrates all microphone-related functionality including:
 * - Audio recording and buffer management (AudioRecordingState)
 * - Wake word detection (WakeWordProcessor)
 * - Voice activity detection (VoiceActivityDetector)
 * - Integration with XState voice state machine
 *
 * The 248-line monolithic function has been refactored into focused classes
 * following the Single Responsibility Principle. See src/audio/ for implementation.
 *
 * @param {Object} voiceService - XState voice state machine service
 * @param {Object} orchestrator - VoiceInteractionOrchestrator instance
 * @param {Object} detector - OpenWakeWord detector instance
 * @returns {Object} Microphone instance (for cleanup/shutdown)
 */
function setupMic(voiceService, orchestrator, detector) {
    // Create microphone manager with all dependencies
    const micManager = new MicrophoneManager(
        config,
        logger,
        voiceService,
        orchestrator,
        detector
    );

    // Start microphone and return instance
    return micManager.start();
}
```

### Step 3: Remove Temporary Variables (if setupMic is fully replaced)

Remove these lines after setupMic is refactored:
```javascript
// Remove these if no longer needed:
const audioPlayer = new AudioPlayer(config, logger);
const beepUtil = new BeepUtil(config);
const BEEPS = beepUtil.BEEPS;
```

Note: Keep audioPlayer if it's used in `startTTSWelcome(detector, audioPlayer)`.

### Step 4: Verify Functionality

After migration:
1. Test wake word detection with actual hardware
2. Test complete voice command flow (wake word → transcription → AI response)
3. Test VAD grace period (user starts speaking after wake word)
4. Test VAD trailing silence detection (stops recording after pause)
5. Test maximum recording length timeout
6. Test pre-roll buffer capture (audio before wake word is included)
7. Test XState integration (state transitions work correctly)
8. Verify no regression in demo script

## Benefits

✅ **Reduced Complexity**: 248 lines → 30 lines in setupMic()
✅ **Single Responsibility**: Each class has one clear purpose
✅ **Testability**: Classes can be unit tested in isolation
✅ **Reusability**: Components can be used independently
✅ **Documentation**: Magic numbers become named constants with explanations
✅ **Maintainability**: Clear separation of concerns
✅ **Debugging**: Easier to trace issues to specific components

## File Structure

```
apps/voice-gateway-oww/src/
├── audio/
│   ├── constants.js              # VAD configuration constants (NEW)
│   ├── AudioRecordingState.js    # Buffer management (NEW)
│   ├── VoiceActivityDetector.js  # VAD logic (NEW)
│   ├── WakeWordProcessor.js      # Wake word detection (NEW)
│   ├── MicrophoneManager.js      # Orchestration (NEW)
│   ├── AudioUtils.js             # Audio utilities (moved from util/)
│   └── AudioPlayer.js            # Audio playback
├── main.js                       # setupMic() refactored to use MicrophoneManager
└── ...
```

## Backward Compatibility

The refactored `setupMic()` function maintains the exact same interface:
- Same parameters: `(voiceService, orchestrator, detector)`
- Same return value: microphone instance
- Same event handling: `TRIGGER`, `SILENCE_DETECTED`, `MAX_LENGTH_REACHED`
- Same behavior: Identical audio processing flow

## Testing Checklist

- [ ] Wake word detection works
- [ ] Voice commands are transcribed
- [ ] AI responses are generated and spoken
- [ ] VAD grace period allows user to start speaking
- [ ] VAD stops recording after silence
- [ ] Max recording length timeout works
- [ ] Pre-roll buffer captures audio before wake word
- [ ] XState transitions work correctly
- [ ] No errors in logs
- [ ] Performance is equivalent (latency, CPU usage)

## Troubleshooting

### If wake word detection stops working:
- Check that `WakeWordProcessor` is correctly initialized
- Verify `config.openWakeWord.threshold` is set
- Check logs for "Wake word detected!" messages

### If recording doesn't start:
- Check that `AudioRecordingState.startRecording()` is called
- Verify XState transitions to 'recording' state
- Check logs for "Recording started" messages

### If recording doesn't stop:
- Check `VoiceActivityDetector.processSamples()` logic
- Verify silence threshold and grace period settings
- Check logs for "Silence detected" or "Max recording length" messages

### If audio is cut off:
- Adjust `MIN_SPEECH_MS` (increase to require more speech)
- Adjust `TRAILING_SILENCE_MS` (increase to wait longer for silence)
- Check pre-roll buffer is capturing correctly

## File Naming Conventions

This project follows JavaScript ecosystem best practices for file naming:

### Class Files → PascalCase
Files that export ES6 classes use **PascalCase** (matching the class name):
- `AnthropicClient.js` exports `AnthropicClient` class
- `OllamaClient.js` exports `OllamaClient` class
- `ConversationManager.js` exports `ConversationManager` class
- `AudioPlayer.js` exports `AudioPlayer` class

**Import example:**
```javascript
import { AnthropicClient } from './AnthropicClient.js';
```

### Utility Modules → camelCase
Files that export functions/utilities use **camelCase**:
- `mqttClient.js` exports `connectMQTT()`, `publishTranscription()`, etc.
- `mcpZWaveClient.js` exports `initializeMCPClient()`, `getDevicesForAI()`, etc.
- `piperTTS.js` exports `synthesizeSpeech()` function
- `streamingTTS.js` exports `streamSpeak()` function
- `markdownToSpeech.js` exports `markdownToSpeech()` function

**Import example:**
```javascript
import { connectMQTT, publishTranscription } from './mqttClient.js';
```

### Conventional Files → lowercase
Entry points, config, and constants remain **lowercase** (JavaScript conventions):
- `main.js` - Entry point
- `config.js` - Configuration module
- `constants.js` - Constants module
- `index.js` - Barrel exports (if used)

### Tool Files → kebab-case
Tool modules follow LangChain convention of **kebab-case**:
- `datetime-tool.js`
- `search-tool.js`
- `volume-control-tool.js`
- `zwave-control-tool.js`

### Rationale
- **Clarity:** File name hints at what it exports (class vs utilities)
- **Consistency:** Matches React components, TypeScript, modern JS patterns
- **Maintainability:** Easier onboarding, less "where is this class defined?"
- **Cross-platform:** Works correctly on both case-sensitive (Linux) and case-insensitive (macOS) filesystems

## Related Files

- OpenSpec proposal: `openspec/changes/refactor-main-setupmic/proposal.md`
- Implementation tasks: `openspec/changes/refactor-main-setupmic/tasks.md`
- Spec deltas: `openspec/changes/refactor-main-setupmic/specs/microphone-management/spec.md`
- File naming proposal: `openspec/changes/rename-class-files-to-camelcase/proposal.md`
