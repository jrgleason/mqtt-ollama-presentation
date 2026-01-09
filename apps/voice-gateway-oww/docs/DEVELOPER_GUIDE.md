# Voice Gateway Developer Guide

## Wake Word Model Configuration

### Model Alias System

The configuration system supports **short aliases** for wake word models instead of requiring full file paths.

#### Usage

**Short Aliases (Recommended):**
```bash
# In your .env file:
OWW_MODEL_PATH=jarvis    # Instead of models/hey_jarvis_v0.1.onnx
OWW_MODEL_PATH=robot     # Instead of models/hello_robot.onnx
```

**Full Paths (Still Supported):**
```bash
# For custom models:
OWW_MODEL_PATH=models/my_custom_wake_word.onnx
OWW_MODEL_PATH=/absolute/path/to/model.onnx
```

#### Available Aliases

| Alias | File | Path | Embedding Frames | Description |
|-------|------|------|-----------------|-------------|
| `jarvis` | `hey_jarvis_v0.1.onnx` | `models/hey_jarvis_v0.1.onnx` | 16 | Hey Jarvis wake word |
| `robot` | `hello_robot.onnx` | `models/hello_robot.onnx` | 28 | Hello Robot wake word |

#### Benefits

1. **Shorter configuration**: Use `jarvis` instead of `models/hey_jarvis_v0.1.onnx`
2. **Automatic frame detection**: Aliases automatically set the correct embedding frames
3. **Case-insensitive**: `jarvis`, `Jarvis`, and `JARVIS` all work
4. **Backward compatible**: Full paths still work for custom models

#### How It Works

**When you set `OWW_MODEL_PATH=jarvis`:**

1. Config system checks if "jarvis" is a known alias → **YES**
2. Resolves to full path: `models/hey_jarvis_v0.1.onnx`
3. Sets embedding frames: `16`
4. Logs: `✅ Resolved model alias 'jarvis' → models/hey_jarvis_v0.1.onnx`

**When you set `OWW_MODEL_PATH=models/custom.onnx`:**

1. Config system checks if it's an alias → **NO**
2. Uses the path as-is: `models/custom.onnx`
3. Tries to recognize the filename in the registry
4. Falls back to default embedding frames: `16`
5. Logs: `⚠️ Unknown wake word model: models/custom.onnx`

#### Adding New Models

Edit `apps/voice-gateway-oww/src/config.js`:

```javascript
const MODEL_CONFIGS = {
    'jarvis': {
        filename: 'hey_jarvis_v0.1.onnx',
        path: 'models/hey_jarvis_v0.1.onnx',
        embeddingFrames: 16,
        description: 'Hey Jarvis wake word',
    },
    'robot': {
        filename: 'hello_robot.onnx',
        path: 'models/hello_robot.onnx',
        embeddingFrames: 28,
        description: 'Hello Robot wake word',
    },
    // Add your new model:
    'mycroft': {
        filename: 'hey_mycroft.onnx',
        path: 'models/hey_mycroft.onnx',
        embeddingFrames: 16,
        description: 'Hey Mycroft wake word',
    },
};
```

Then use it:
```bash
OWW_MODEL_PATH=mycroft
```

#### Startup Logs

**With Alias:**
```
✅ Resolved model alias 'jarvis' → models/hey_jarvis_v0.1.onnx
```

**With Recognized File:**
```
✅ Recognized model file 'hey_jarvis_v0.1.onnx' (alias: jarvis)
```

**With Unknown Model:**
```
⚠️  Unknown wake word model: models/custom.onnx
   Using default embedding frames: 16
   Available aliases: jarvis, robot
   Recognized filenames: hey_jarvis_v0.1.onnx, hello_robot.onnx
```

---

## Microphone Setup Refactoring

### Overview

The monolithic 248-line `setupMic()` function in `main.js` has been refactored into focused, testable classes following the Single Responsibility Principle.

### New Architecture

#### Created Classes (in `src/audio/`)

**1. AudioRecordingState** (`AudioRecordingState.js`)
- Manages all audio buffers (audioBuffer, recordedAudio, preRollBuffer)
- Handles recording lifecycle (start, append, stop)
- Provides immutable audio snapshots

**2. VoiceActivityDetector** (`VoiceActivityDetector.js`)
- Implements VAD logic for silence detection
- Handles grace period after wake word
- Enforces minimum speech duration and max recording length
- Returns structured decisions ({shouldStop, reason, hasSpoken})

**3. WakeWordProcessor** (`WakeWordProcessor.js`)
- Processes audio chunks through OpenWakeWord detector
- Evaluates scores against threshold
- Triggers audio feedback (beeps)
- Handles detector reset and errors

**4. MicrophoneManager** (`MicrophoneManager.js`)
- Orchestrates all microphone functionality
- Integrates with XState voice state machine
- Coordinates AudioRecordingState, VoiceActivityDetector, and WakeWordProcessor
- Provides clean interface for main.js

#### Configuration Constants (`src/audio/constants.js`)

All VAD magic numbers are now well-documented named constants:
- `PRE_ROLL_MS` (300ms) - Pre-roll buffer duration
- `SILENCE_THRESHOLD` (0.01) - RMS energy threshold
- `MIN_SPEECH_MS` (700ms) - Minimum speech duration
- `DEFAULT_TRAILING_SILENCE_MS` (1500ms) - Silence before stopping
- `DEFAULT_MAX_RECORDING_MS` (10000ms) - Maximum recording length
- `DEFAULT_GRACE_BEFORE_STOP_MS` (1200ms) - Grace period after wake word

### Migration Steps for main.js

#### Step 1: Update Imports

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

#### Step 2: Replace setupMic() Function

Replace the entire 248-line `setupMic()` function with:

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

#### Step 3: Verify Functionality

After migration:
1. Test wake word detection with actual hardware
2. Test complete voice command flow (wake word → transcription → AI response)
3. Test VAD grace period (user starts speaking after wake word)
4. Test VAD trailing silence detection (stops recording after pause)
5. Test maximum recording length timeout
6. Test pre-roll buffer capture (audio before wake word is included)
7. Test XState integration (state transitions work correctly)
8. Verify no regression in demo script

### Benefits

✅ **Reduced Complexity**: 248 lines → 30 lines in setupMic()
✅ **Single Responsibility**: Each class has one clear purpose
✅ **Testability**: Classes can be unit tested in isolation
✅ **Reusability**: Components can be used independently
✅ **Documentation**: Magic numbers become named constants with explanations
✅ **Maintainability**: Clear separation of concerns
✅ **Debugging**: Easier to trace issues to specific components

### File Structure

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

### Backward Compatibility

The refactored `setupMic()` function maintains the exact same interface:
- Same parameters: `(voiceService, orchestrator, detector)`
- Same return value: microphone instance
- Same event handling: `TRIGGER`, `SILENCE_DETECTED`, `MAX_LENGTH_REACHED`
- Same behavior: Identical audio processing flow

### Troubleshooting

**If wake word detection stops working:**
- Check that `WakeWordProcessor` is correctly initialized
- Verify `config.openWakeWord.threshold` is set
- Check logs for "Wake word detected!" messages

**If recording doesn't start:**
- Check that `AudioRecordingState.startRecording()` is called
- Verify XState transitions to 'recording' state
- Check logs for "Recording started" messages

**If recording doesn't stop:**
- Check `VoiceActivityDetector.processSamples()` logic
- Verify silence threshold and grace period settings
- Check logs for "Silence detected" or "Max recording length" messages

**If audio is cut off:**
- Adjust `MIN_SPEECH_MS` (increase to require more speech)
- Adjust `TRAILING_SILENCE_MS` (increase to wait longer for silence)
- Check pre-roll buffer is capturing correctly

---

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

---

---

## Startup Orchestration & Detector Warm-up

### Problem Statement

The voice gateway was announcing readiness before the wake word detector had fully stabilized, causing:
- User utterances being cut off
- False negatives (wake word not detected)
- Inconsistent initial detection behavior

### Root Cause

The OpenWakeWord detector requires time to stabilize after its embedding buffers fill. The buffers accumulate audio data, but the detector needs additional processing time (2-3 seconds) before it can reliably detect wake words.

### Solution Overview

Implemented a three-part solution:

1. **Detector Warm-up Phase** - Added 2.5 second stabilization period after buffer fill
2. **Promise-based Orchestration** - Sequential async/await initialization
3. **Welcome Message Sequencing** - Welcome plays AFTER warm-up, BEFORE activation

### Implementation Details

#### OpenWakeWordDetector.js - Warm-up Tracking

```javascript
// New state properties
this.warmUpComplete = false;
this._warmUpPromise = null;
this._warmUpResolve = null;

// Warm-up trigger (in detect() method):
if (!this.embeddingBufferFilled && this.embeddingBuffer.length >= this.embeddingFrames) {
    this.embeddingBufferFilled = true;
    logger.debug('Embedding buffer filled, starting warm-up period...');

    setTimeout(() => {
        this.warmUpComplete = true;
        this.emit('warmup-complete');
        if (this._warmUpResolve) {
            this._warmUpResolve();
        }
    }, 2500);
}
```

#### InitUtil.js - Await Detector Warm-up

```javascript
// Phase 5.5: Detector Warm-up Wait
logger.info('Waiting for detector warm-up...');
try {
    await Promise.race([
        detector.getWarmUpPromise(),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Detector warm-up timeout')), 10000)
        )
    ]);
    logger.info('Detector fully warmed up and ready');
} catch (error) {
    logger.warn('Detector warm-up timeout - may experience initial detection issues');
}
```

#### main.js - 7-Phase Sequential Startup

```javascript
async function main() {
    // Phase 1: Services and Health Checks
    await initServices();

    // Phase 2: Wake Word Detector (with warm-up)
    const detector = await setupWakeWordDetector(); // Includes warm-up wait

    // Phase 3: Tool System Initialization
    const toolRegistry = new ToolRegistry();
    const toolExecutor = new ToolExecutor(toolRegistry, logger);

    // Phase 4: Voice Service & Orchestrator
    const voiceService = setupVoiceStateMachine();
    const orchestrator = new VoiceInteractionOrchestrator(...);

    // Phase 5: Microphone Setup
    const micInstance = setupMic(voiceService, orchestrator, detector, ...);

    // Phase 6: Welcome Message BEFORE Activation
    await startTTSWelcome(detector, audioPlayer);

    // Phase 7: Final Activation
    voiceService.send({type: 'READY'});
}
```

### Timeline Comparison

**OLD (Broken):**
```
T+0s:     Mic starts -> audio DISCARDED
T+0.5s:   Welcome message plays
T+2.5s:   Welcome ends
T+3.5s:   Post-welcome reset
T+4.0s:   First warm-up complete (wasted!)
T+7.0s:   ACTUALLY ready (2.5-3.5s gap!)
```

**NEW (Fixed):**
```
T+0s:     Mic starts -> audio FED TO DETECTOR
T+2.5s:   Warm-up complete
T+2.5s:   Welcome: "Hello, I am Jarvis..."
T+4.5s:   Welcome ends, Ready beep
T+4.8s:   ACTUALLY ready (no gap!)
```

### Performance Impact

- **Startup time:** +2.5 seconds (warm-up period)
- **Memory:** Negligible (one promise, one flag)
- **CPU:** None (timer-based, no polling)
- **Reliability:** Significantly improved initial detection accuracy

### Edge Cases Handled

1. **Timeout scenario:** 10-second timeout prevents hang
2. **Multiple getWarmUpPromise() calls:** Returns same promise instance
3. **Already warmed up:** Returns resolved promise immediately
4. **Buffer reset:** Warm-up state persists (no re-warm needed)

---

## Beep Audio Isolation System

### Overview

The beep audio isolation system prevents audio feedback loops caused by the microphone capturing system-generated beeps during recording.

### Problem Statement

**Before beep isolation:**
1. Wake word detected -> System plays beep
2. Microphone still recording -> Beep gets captured
3. Whisper transcribes: "turn on the lights [BEEPING]"
4. AI processes the corrupted transcription

### Solution

The beep isolation system tracks the state machine's recording state and suppresses beep playback during the `recording` state only.

### State Machine States

- `startup` - Initial state, microphone muted
- `listening` - Wake word detection active
- `recording` - User speech being captured (**BEEPS SUPPRESSED**)
- `processing` - Transcription and AI query in progress
- `cooldown` - Brief pause before returning to listening

### Implementation

#### State Tracking (main.js)

```javascript
let stateIsRecording = false;

voiceService.subscribe((state) => {
    stateIsRecording = (state.value === 'recording');
});
```

#### Wake Word Beep Suppression (main.js)

```javascript
if (!stateIsRecording) {
    audioPlayer.play(BEEPS.wakeWord).catch(err => logger.debug('Beep failed'));
} else {
    logger.debug('Suppressed wake word beep (recording in progress)');
}
```

#### Processing/Response Beep Suppression (VoiceInteractionOrchestrator.js)

```javascript
if (!this.isRecordingChecker()) {
    await this.audioPlayer.play(this.beep.BEEPS.processing);
} else {
    this.logger.debug('Suppressed processing beep (recording in progress)');
}
```

### Beep Types and States

| Beep Type | Plays In States | Suppressed In State |
|-----------|----------------|---------------------|
| Wake Word | `listening`, `cooldown` | `recording` |
| Processing | `processing` | `recording` |
| Response | `cooldown` | `recording` |
| Error | Any error state | `recording` |

### Key Design Decisions

1. **Only suppress during recording state** - Other states don't risk feedback loops
2. **Wake word interruption still works** - Cooldown is NOT a recording state
3. **Callback-based state sharing** - Avoids tight coupling
4. **Fail-safe default** - If checker is null, beeps play normally

### Testing

Run tests: `npm test tests/beep-isolation.test.js`

14 test cases covering suppression, state tracking, and interruption scenarios.

---

## MCP Retry Logic

### Overview

Exponential backoff retry logic for MCP (Model Context Protocol) server connections to handle transient failures gracefully.

### Configuration

```bash
# Environment variables
MCP_RETRY_ATTEMPTS=3       # Number of attempts before giving up (default: 3)
MCP_RETRY_BASE_DELAY=2000  # Base delay in milliseconds (default: 2000)
```

### Retry Strategy

**Exponential Backoff Timing:**
- Attempt 1: Immediate (0ms delay)
- Attempt 2: 2000ms delay (base delay)
- Attempt 3: 4000ms delay (2x base delay)
- **Total max retry time: 6 seconds**

### Implementation

#### MCPIntegration.js

```javascript
async function initializeMCPIntegration(config, logger) {
    const maxAttempts = config.mcp.retryAttempts;
    const baseDelay = config.mcp.retryBaseDelay;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            logger.info(`Initializing MCP integration... (attempt ${attempt}/${maxAttempts})`);
            // ... connection logic
            return { mcpClient, tools };
        } catch (error) {
            if (attempt < maxAttempts) {
                const delay = baseDelay * (attempt - 1);
                logger.warn(`MCP connection attempt ${attempt}/${maxAttempts} failed`);
                logger.info(`Retrying MCP connection in ${delay}ms...`);
                await sleep(delay);
            } else {
                throw new Error(`MCP connection failed after ${maxAttempts} attempts`);
            }
        }
    }
}
```

### Behavior

**Success on first attempt:**
```
Initializing MCP integration... (attempt 1/3)
MCP integration initialized (toolCount: 2, attemptNumber: 1)
```

**Success after retry:**
```
Initializing MCP integration... (attempt 1/3)
MCP connection attempt 1/3 failed
Retrying MCP connection in 2000ms...
Initializing MCP integration... (attempt 2/3)
MCP integration initialized (toolCount: 2, attemptNumber: 2)
```

**Permanent failure:**
```
Initializing MCP integration... (attempt 1/3)
MCP connection attempt 1/3 failed
Retrying MCP connection in 2000ms...
... (all retries exhausted)
MCP integration permanently failed (attempts: 3)
```

The voice gateway continues with local tools only (datetime, search, volume control).

### Integration with Voice Gateway

```javascript
try {
    const mcpIntegration = await initializeMCPIntegration(config, logger);
    // Register MCP tools
    for (const tool of mcpIntegration.tools) {
        toolRegistry.registerLangChainTool(tool);
    }
} catch (error) {
    logger.error('Failed to initialize MCP tools');
    logger.warn('Continuing with local tools only...');
}
```

### Testing

Run tests: `npm test tests/mcp-retry.test.js`

13 test cases covering successful connections, transient failures, permanent failures, and timing.

---

---

## Quick Start Guide

### Running on Raspberry Pi 5

#### 1. Copy to Raspberry Pi

```bash
# From your development machine
scp -r apps/voice-gateway-oww pi@<raspberry-pi-ip>:/home/pi/
```

#### 2. Install Dependencies

```bash
ssh pi@<raspberry-pi-ip>
cd voice-gateway-oww
npm install
```

#### 3. Configure

```bash
cp .env.example .env.tmp
nano .env.tmp  # Edit if needed (defaults work out of the box)
```

**Default Configuration:**
- Wake Word: "Hey Jarvis"
- Microphone: hw:2,0 (LANDIBO USB mic)
- MQTT Broker: mqtt://localhost:1883
- Threshold: 0.5

#### 4. Run

```bash
npm run dev
```

#### 5. Install Piper TTS

```bash
python3 -m venv venvs/piper-tts
source venvs/piper-tts/bin/activate
pip install piper-tts
python3 -m piper.download_voices en_US-amy-medium
mkdir -p models/piper
ln -s ~/.local/share/piper_tts/en_US-amy-medium.onnx models/piper/
ln -s ~/.local/share/piper_tts/en_US-amy-medium.onnx.json models/piper/
deactivate
```

### Demo Mode Switching

| Mode | AI | TTS | Command |
|------|-----|-----|---------|
| **Offline** | Ollama | Piper | `./scripts/switch-mode.sh offline` |
| **Online** | Anthropic | ElevenLabs | `./scripts/switch-mode.sh online` |
| **Hybrid A** | Ollama | ElevenLabs | `./scripts/switch-mode.sh hybrid-a` |
| **Hybrid B** | Anthropic | Piper | `./scripts/switch-mode.sh hybrid-b` |

### Quick Configuration Changes

```bash
# Wake word
OWW_MODEL_PATH=jarvis  # or alexa, mycroft

# Sensitivity
OWW_THRESHOLD=0.3  # Lower = more sensitive

# Microphone
AUDIO_MIC_DEVICE=hw:X,Y  # From `arecord -l`

# Voice Activity Detection
VAD_TRAILING_SILENCE_MS=1500  # Silence before stopping
VAD_MAX_UTTERANCE_MS=10000    # Max recording length
```

---

## Troubleshooting

### Quick Diagnostics

```bash
# Check service status
systemctl status voice-gateway-oww.service
journalctl -u voice-gateway-oww.service -n 100 --no-pager

# Check dependencies
curl http://localhost:11434/api/tags  # Ollama
arecord -l                             # Audio devices
ls models/                             # Models
```

### Common Issues Checklist

- [ ] Is Ollama running?
- [ ] Is MQTT broker accessible?
- [ ] Are audio devices detected?
- [ ] Are models downloaded?
- [ ] Is Python venv activated for Piper TTS?

### Platform-Specific Issues

#### macOS
- Grant microphone permissions to Terminal
- Uses speaker.js instead of ALSA

#### Linux/Raspberry Pi

**Audio device not found:**
```bash
arecord -l  # List devices
# Update AUDIO_MIC_DEVICE in .env
# Use plughw:X,0 format for auto format conversion
```

**Permission denied:**
```bash
sudo usermod -a -G audio $USER
# Logout and login again
```

### Wake Word Issues

**Not detected:**
- Lower threshold: `OWW_THRESHOLD=0.3`
- Check microphone: `arecord -D hw:2,0 -f S16_LE -r 16000 -d 3 test.wav`
- Verify models exist in `models/`

**Score interpretation:**
- `0.00-0.05`: Background noise
- `0.15-0.25`: Close but below threshold
- `0.25+`: Detected ✅

### Recording Issues

**Cutting off mid-sentence:**
```bash
VAD_TRAILING_SILENCE_MS=2000  # Increase silence wait
```

**Not stopping when finished:**
```bash
VAD_TRAILING_SILENCE_MS=1000  # Decrease silence wait
```

### TTS Issues

**Piper not working:**
```bash
source venvs/piper-tts/bin/activate
python3 -c "import piper"  # Should return nothing if installed
ls models/piper/           # Check voice model exists
```

### Network Issues

**MQTT:**
```bash
mosquitto_sub -h localhost -p 1883 -t 'test' -v
```

**Ollama:**
```bash
curl http://localhost:11434/api/version
ollama list  # Check model is downloaded
```

### Enable Debug Logging

```bash
LOG_LEVEL=debug npm run dev
```

---

## System Requirements

- **Raspberry Pi 5** (16GB RAM recommended, 8GB minimum)
- **USB Microphone** (16kHz capable)
- **Speaker** (USB or 3.5mm)
- **MQTT Broker** (HiveMQ or Mosquitto)
- **Python 3.8+** (for Piper TTS)

---

## Related Resources

- OpenSpec proposal: `openspec/changes/refactor-main-setupmic/proposal.md`
- Implementation tasks: `openspec/changes/refactor-main-setupmic/tasks.md`
- Spec deltas: `openspec/changes/refactor-main-setupmic/specs/microphone-management/spec.md`
- File naming proposal: `openspec/changes/rename-class-files-to-camelcase/proposal.md`
