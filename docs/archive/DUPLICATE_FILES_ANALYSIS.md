# Voice Gateway Duplicate Files Analysis Report

**Date:** 2025-12-22
**Project:** mqtt-ollama-presentation/apps/voice-gateway-oww
**Branch:** CRAZY_REFACTOR

## Executive Summary

This analysis identifies duplicate and redundant utility files in the voice-gateway-oww module. The project is undergoing a major refactoring that splits monolithic files into organized subdirectories (audio/, services/, ai/, wake-word/, util/). Several old files remain in the root src/ directory while newer, improved versions exist in subdirectories.

**Key Findings:**
- **3 confirmed duplicates** requiring cleanup (ElevenLabsTTS, AudioUtils, BackgroundTranscriber)
- **4 old files** that are still in use but may need migration (audio-feedback, piper-tts, elevenlabs-tts, streaming-tts)
- **1 old file** moved but properly migrated (logger.js → util/Logger.js)
- **No duplicates found** for core classes (OllamaClient, AnthropicClient, ConversationManager - actively used)

---

## Confirmed Duplicates (Requiring Cleanup)

### 1. ElevenLabsTTS - DUPLICATE FOUND

**Old Version (Function-based):**
- **File:** `src/elevenlabs-tts.js`
- **Type:** Function-based module with module-level singleton
- **Status:** Still in use
- **Dependencies:**
  - Imported by: `src/streaming-tts.js` (line 12)
  - Uses: `@elevenlabs/elevenlabs-js`, `./util/Logger.js`, `./config.js`

**New Version (Class-based):**
- **File:** `src/util/ElevenLabsTTS.js`
- **Type:** Class-based with constructor injection
- **Status:** Git status shows `AM` (Added/Modified) - new file not yet committed
- **Dependencies:**
  - Imported by: **NONE** (not used anywhere)
  - Uses: `@elevenlabs/elevenlabs-js`, `../markdown-to-speech.js`

**Key Differences:**
- Old: Function exports with module singleton pattern
- New: Class with dependency injection (config, logger passed in constructor)
- Old: Uses `convertMP3ToPCM()` function
- New: Uses `convertMP3ToPCM()` method with private fields (`#client`)
- New version is cleaner but **NOT INTEGRATED** into the codebase

**Imports Analysis:**
```javascript
// Old version still imported by:
apps/voice-gateway-oww/src/streaming-tts.js:12
  import {synthesizeSpeech as elevenSynthesize} from './elevenlabs-tts.js';

// New version imports: NONE
```

**Recommendation:**
- ⚠️ **New class is not integrated** - old function-based version is still actively used
- Migration needed: Update `streaming-tts.js` to use new class-based `ElevenLabsTTS`
- Delete old `elevenlabs-tts.js` after migration complete

---

### 2. AudioUtils - DUPLICATE FOUND

**Old Version:**
- **File:** `src/util/AudioUtils.js`
- **Status:** Git status shows `AD` (Added then Deleted) - marked for deletion
- **Dependencies:** Unknown (file deleted)

**New Version:**
- **File:** `src/audio/AudioUtils.js`
- **Status:** Active and in use
- **Imports Found:**
  - `src/services/TranscriptionService.js:4`
  - `src/audio/VoiceActivityDetector.js:22`
  - `src/util/InitUtil.js:8`
- **Exports:** `rmsEnergy`, `writeWavFile`, `checkAlsaDevice`

**Imports Analysis:**
```javascript
// New version imported by:
apps/voice-gateway-oww/src/services/TranscriptionService.js:4
  import { rmsEnergy, writeWavFile } from '../audio/AudioUtils.js';

apps/voice-gateway-oww/src/audio/VoiceActivityDetector.js:22
  import { rmsEnergy } from './AudioUtils.js';

apps/voice-gateway-oww/src/util/InitUtil.js:8
  import {checkAlsaDevice} from "../audio/AudioUtils.js";
```

**Recommendation:**
- ✅ **Migration complete** - old file marked for deletion in git
- All imports now reference new location in `audio/` directory
- Safe to remove old file from git index

---

### 3. BackgroundTranscriber - REMOVED (No longer needed)

**Old Version:**
- **File:** `src/util/BackgroundTranscriber.js`
- **Status:** Git status shows `AD` (Added then Deleted) - marked for deletion
- **Dependencies:** None found

**Replacement:**
- **File:** `src/services/VoiceInteractionOrchestrator.js`
- **Status:** Active and in use
- **Documentation:** Line 17 states "Primary replacement for BackgroundTranscriber"

**Imports Analysis:**
```javascript
// Old version imports: NONE (removed)

// References in comments only:
apps/voice-gateway-oww/src/services/VoiceInteractionOrchestrator.js:17
  * Primary replacement for BackgroundTranscriber. Orchestrates:

apps/voice-gateway-oww/src/audio/MicrophoneManager.js:39
  * @param {Object} orchestrator - VoiceInteractionOrchestrator instance
  * (or BackgroundTranscriber for compatibility)
```

**Recommendation:**
- ✅ **Migration complete** - functionality moved to `VoiceInteractionOrchestrator`
- Old file marked for deletion in git
- Update comment in `MicrophoneManager.js` to remove BackgroundTranscriber reference

---

### 4. Logger - PROPERLY MIGRATED

**Old Version:**
- **File:** `src/logger.js`
- **Status:** Git status shows `RM src/logger.js -> src/util/Logger.js` (Renamed/Moved)

**New Version:**
- **File:** `src/util/Logger.js`
- **Status:** Active and in use
- **Imports Found:** 20+ files import from new location

**Imports Analysis:**
```javascript
// All imports reference new location (20+ files):
apps/voice-gateway-oww/src/main.js:6
  import {errMsg, logger} from './util/Logger.js';

apps/voice-gateway-oww/src/streaming-tts.js:9
  import {logger} from './util/Logger.js';

apps/voice-gateway-oww/src/services/VoiceInteractionOrchestrator.js:12
  import { errMsg } from '../util/Logger.js';

// ... and 17 more files
```

**Recommendation:**
- ✅ **Migration complete and successful**
- All 20+ imports updated to new location
- Git properly tracking as rename/move
- No action needed

---

## Old Files Still in Use (May Need Evaluation)

### 5. audio-feedback.js - OLD LOCATION

**File:** `src/audio-feedback.js`
**Status:** Active
**Purpose:** Plays audio feedback (error sounds, beeps) using sox/afplay
**Imports:** None found

**Functions Exported:**
- `playErrorSound()`
- `playFartSound()` (humorous error feedback)
- `playSuccessSound()`
- Tone generation utilities

**Potential New Location:** `src/audio/AudioFeedback.js` or `src/util/BeepUtil.js`

**Recommendation:**
- ⚠️ **Functionality may overlap with BeepUtil**
- BeepUtil (newer) generates PCM beeps programmatically
- audio-feedback (older) uses external commands (sox/afplay)
- Decision needed: Consolidate into one approach or keep both for different use cases

---

### 6. BeepUtil - NEWLY ADDED (Class-based)

**File:** `src/util/BeepUtil.js`
**Status:** Git status shows `AM` (Added/Modified) - new file
**Purpose:** Pre-generate beep patterns for wake word, processing, response, error

**Imports Found:**
```javascript
apps/voice-gateway-oww/src/services/VoiceInteractionOrchestrator.js:1
  import { BeepUtil } from '../util/BeepUtil.js';

apps/voice-gateway-oww/src/audio/WakeWordProcessor.js:27
  import { BeepUtil } from '../util/BeepUtil.js';

apps/voice-gateway-oww/src/main.js:16
  import {BeepUtil} from "./util/BeepUtil.js";
```

**Key Features:**
- Class-based with constructor accepting config
- Pre-generates common beep patterns (wakeWord, processing, response, error)
- Generates PCM audio programmatically (no external dependencies)
- Uses `generateBeep()` and `generateDualBeep()` methods

**Relationship to audio-feedback.js:**
- **Different approaches:** BeepUtil is programmatic, audio-feedback uses external commands
- **Both active:** BeepUtil is imported by 3 files, audio-feedback has no imports
- **Potential consolidation:** Could replace audio-feedback functionality

**Recommendation:**
- ⚠️ **Evaluate if audio-feedback.js is still needed**
- BeepUtil provides cleaner, more portable solution (no sox/afplay dependency)
- Consider migrating any remaining audio-feedback usage to BeepUtil

---

### 7. piper-tts.js - OLD LOCATION

**File:** `src/piper-tts.js`
**Status:** Active
**Purpose:** Piper TTS integration (local text-to-speech)

**Imports Found:**
```javascript
apps/voice-gateway-oww/src/streaming-tts.js:11
  import {synthesizeSpeech as piperSynthesize} from './piper-tts.js';
```

**Recommendation:**
- ⚠️ **Consider moving to** `src/audio/PiperTTS.js` or `src/services/PiperTTS.js`
- Currently only imported by `streaming-tts.js`
- Low priority - only one import, but inconsistent with new structure

---

### 8. streaming-tts.js - OLD LOCATION

**File:** `src/streaming-tts.js`
**Status:** Active
**Purpose:** Streaming TTS adapter that chunks text and streams to TTS providers

**Imports Found:**
```javascript
apps/voice-gateway-oww/src/services/VoiceInteractionOrchestrator.js:10
  import { streamSpeak } from '../streaming-tts.js';
```

**Function Exported:** `streamSpeak(text)`

**Dependencies:**
- Imports: `./piper-tts.js`, `./elevenlabs-tts.js`, `./util/Logger.js`, `./config.js`

**Recommendation:**
- ⚠️ **Consider moving to** `src/services/StreamingTTS.js`
- Orchestration logic fits better in services/ directory
- Would require updating import in VoiceInteractionOrchestrator

---

## Files Properly Organized (No Action Needed)

### AI/LLM Files - PROPERLY LOCATED

**Root Level (Active and Correct):**
- `src/ollama-client.js` - Used by `AIRouter`
- `src/anthropic-client.js` - Used by `AIRouter`
- `src/conversation-manager.js` - Singleton used by `AIRouter` and `VoiceInteractionOrchestrator`

**Why Root is Correct:**
- These are provider implementations, not utilities
- Imported by the new `ai/AIRouter.js` class
- Properly separated: AI routing logic (ai/) vs provider clients (root)

**No Duplicates Found:** These are the only versions of these files.

---

### Services - PROPERLY ORGANIZED

**Location:** `src/services/`

**Files:**
- `TranscriptionService.js` - Whisper STT integration
- `VoiceInteractionOrchestrator.js` - Main orchestrator (replaces BackgroundTranscriber)
- `ToolRegistry.js` - Tool registration and management
- `ToolExecutor.js` - Tool execution with timeout and error handling
- `IntentClassifier.js` - Intent classification (if exists)

**No Duplicates Found:** All service files are unique and properly located.

---

### Audio - PROPERLY ORGANIZED

**Location:** `src/audio/`

**Files:**
- `AudioUtils.js` - ✅ Migrated from util/
- `AudioPlayer.js` - Audio playback
- `AudioRecordingState.js` - Recording state management
- `VoiceActivityDetector.js` - VAD logic
- `MicrophoneManager.js` - Microphone handling
- `WakeWordProcessor.js` - Wake word detection processing
- `constants.js` - Audio constants (SAMPLE_RATE, CHUNK_SIZE, etc.)

**No Duplicates Found:** All audio files are unique and properly located.

---

### Wake Word - PROPERLY ORGANIZED

**Location:** `src/wake-word/`

**Files:**
- `DetectorStateManager.js` - Manages detector state (mel buffer, embedding buffer)
  - Used by: `util/OpenWakeWordDetector.js`

**Related Utility:**
- `src/util/OpenWakeWordDetector.js` - Main detector class that uses `DetectorStateManager`

**No Duplicates Found:** These are complementary, not duplicates.

---

### Utilities - MIXED STATUS

**Location:** `src/util/`

**Files:**
- ✅ `Logger.js` - Migrated from root, all imports updated
- ✅ `BeepUtil.js` - New class-based beep generator (may replace audio-feedback.js)
- ⚠️ `ElevenLabsTTS.js` - New class not yet integrated (duplicate of root elevenlabs-tts.js)
- ✅ `OpenWakeWordDetector.js` - Wake word detector class (uses wake-word/DetectorStateManager)
- ✅ `VoiceGateway.js` - Voice state machine setup
- ✅ `InitUtil.js` - Initialization utilities
- ✅ `XStateHelpers.js` - XState helper functions
- ✅ `tools.js` - Tool executor re-exports (barrel file)

**Duplicates:**
- `AudioUtils.js` - ✅ Deleted, moved to audio/
- `BackgroundTranscriber.js` - ✅ Deleted, replaced by VoiceInteractionOrchestrator

---

### Tools - PROPERLY ORGANIZED

**Location:** `src/tools/`

**Files:**
- `datetime-tool.js` - Date/time information tool
- `search-tool.js` - Web search tool
- `volume-control-tool.js` - Audio volume control
- `zwave-control-tool.js` - Z-Wave device control

**Barrel Export:** `src/util/tools.js` re-exports all tool executors

**No Duplicates Found:** All tool files are unique and properly located.

---

## Summary of Actions Required

### Immediate Actions (High Priority)

1. **Integrate new ElevenLabsTTS class**
   - File: `src/util/ElevenLabsTTS.js`
   - Action: Update `src/streaming-tts.js` to use new class
   - After: Delete old `src/elevenlabs-tts.js`
   - Effort: Medium (requires refactoring streaming-tts.js)

2. **Confirm AudioUtils deletion**
   - File: `src/util/AudioUtils.js`
   - Action: Finalize git deletion (already marked as deleted)
   - After: Verify no broken imports
   - Effort: Low (git operations only)

3. **Confirm BackgroundTranscriber deletion**
   - File: `src/util/BackgroundTranscriber.js`
   - Action: Finalize git deletion (already marked as deleted)
   - After: Update comment in `MicrophoneManager.js` to remove reference
   - Effort: Low (git operations + 1 comment update)

### Evaluation Needed (Medium Priority)

4. **Evaluate audio-feedback.js vs BeepUtil**
   - Files: `src/audio-feedback.js` (old) vs `src/util/BeepUtil.js` (new)
   - Question: Is audio-feedback still needed?
   - Options:
     - A) Keep both (different use cases: external commands vs programmatic)
     - B) Migrate to BeepUtil (removes sox/afplay dependency)
     - C) Create new `AudioFeedback` class in audio/ directory
   - Effort: Medium (requires decision + possible migration)

5. **Consider moving streaming-tts.js**
   - File: `src/streaming-tts.js`
   - Proposed: `src/services/StreamingTTS.js` (convert to class)
   - Reason: Better fits services/ directory (orchestration logic)
   - Effort: Medium (refactoring + import updates)

### Low Priority (Nice to Have)

6. **Consider moving piper-tts.js**
   - File: `src/piper-tts.js`
   - Proposed: `src/audio/PiperTTS.js` or `src/services/PiperTTS.js`
   - Reason: Consistency with new structure
   - Effort: Low (simple move + 1 import update)

---

## Import Dependency Graph

### Current Active Imports (Non-Duplicate)

```
main.js
├── util/Logger.js (✅ migrated)
├── util/BeepUtil.js (✅ new class)
├── util/InitUtil.js (✅ uses audio/AudioUtils)
├── util/VoiceGateway.js (✅ proper location)
├── services/VoiceInteractionOrchestrator.js
│   ├── util/BeepUtil.js
│   ├── util/Logger.js
│   ├── conversation-manager.js (root - correct)
│   └── streaming-tts.js (⚠️ old location)
│       ├── piper-tts.js (⚠️ old location)
│       ├── elevenlabs-tts.js (⚠️ DUPLICATE - old version)
│       └── util/Logger.js
├── services/ToolRegistry.js
├── services/ToolExecutor.js
├── audio/AudioPlayer.js
│   └── util/Logger.js
└── tools/*.js (datetime, search, volume, zwave)

ai/AIRouter.js
├── ollama-client.js (root - correct)
├── anthropic-client.js (root - correct)
├── conversation-manager.js (root - correct)
└── util/Logger.js

audio/AudioUtils.js (✅ migrated from util/)
└── util/Logger.js

audio/VoiceActivityDetector.js
└── audio/AudioUtils.js

audio/WakeWordProcessor.js
├── util/BeepUtil.js
└── util/Logger.js

services/TranscriptionService.js
├── audio/AudioUtils.js
└── util/Logger.js

util/OpenWakeWordDetector.js
├── wake-word/DetectorStateManager.js
├── audio/constants.js
└── util/Logger.js
```

### Duplicate/Old Files Not Used

```
❌ util/AudioUtils.js (git: AD - deleted, migrated to audio/)
❌ util/BackgroundTranscriber.js (git: AD - deleted, replaced by VoiceInteractionOrchestrator)
⚠️ util/ElevenLabsTTS.js (git: AM - new class, NOT integrated yet)
⚠️ audio-feedback.js (no imports - may be unused or called dynamically)
```

---

## File Organization Status

### ✅ Well Organized (No Changes Needed)

- `src/ai/` - AI routing logic
- `src/audio/` - Audio processing utilities (AudioUtils migrated here)
- `src/services/` - High-level orchestration services
- `src/wake-word/` - Wake word detection state management
- `src/tools/` - Individual tool implementations
- `src/util/Logger.js` - Logging (migrated)
- `src/util/BeepUtil.js` - Audio beep generation (new)
- `src/util/OpenWakeWordDetector.js` - Wake word detector (uses wake-word/)
- `src/util/VoiceGateway.js` - State machine setup
- `src/util/InitUtil.js` - Initialization helpers
- `src/util/XStateHelpers.js` - XState utilities
- `src/util/tools.js` - Tool barrel export

### ⚠️ Needs Attention

- `src/elevenlabs-tts.js` - Duplicate (old function-based version)
- `src/util/ElevenLabsTTS.js` - Duplicate (new class-based version, not integrated)
- `src/audio-feedback.js` - Old location, no imports found, may overlap with BeepUtil
- `src/piper-tts.js` - Old location, consider moving
- `src/streaming-tts.js` - Old location, consider moving to services/

### ✅ Root-Level Providers (Correct)

- `src/ollama-client.js` - Ollama AI provider
- `src/anthropic-client.js` - Anthropic AI provider
- `src/conversation-manager.js` - Conversation history singleton
- `src/config.js` - Configuration singleton
- `src/mqtt-client.js` - MQTT client singleton
- `src/mcp-zwave-client.js` - Z-Wave MCP client
- `src/markdown-to-speech.js` - Markdown cleanup utility

---

## Refactoring Progress Assessment

### Migration Status: ~80% Complete

**Completed:**
- ✅ Logger moved to util/ (20+ files updated)
- ✅ AudioUtils moved to audio/ (3 files updated)
- ✅ BackgroundTranscriber replaced with VoiceInteractionOrchestrator
- ✅ New BeepUtil class created and integrated (3 files)
- ✅ New directory structure established (ai/, audio/, services/, wake-word/)
- ✅ Tool system refactored (ToolRegistry, ToolExecutor, individual tools)

**In Progress:**
- ⚠️ ElevenLabsTTS class created but not integrated
- ⚠️ Streaming TTS still in root directory
- ⚠️ Piper TTS still in root directory

**Not Started:**
- ❌ audio-feedback.js evaluation (keep vs migrate to BeepUtil)
- ❌ Final cleanup of git deleted files

---

## Recommendations

### Short Term (Complete Current Refactor)

1. **Complete ElevenLabsTTS migration** (highest priority)
   - Refactor `streaming-tts.js` to use new class
   - Delete old `elevenlabs-tts.js`
   - Test TTS functionality

2. **Finalize git cleanup**
   - Commit deletion of `util/AudioUtils.js`
   - Commit deletion of `util/BackgroundTranscriber.js`
   - Update comments referencing old files

3. **Decide on audio-feedback.js**
   - Document decision: keep both or migrate to BeepUtil
   - If keeping both, document use cases clearly
   - If migrating, update any dynamic imports

### Medium Term (Consistency)

4. **Move streaming-tts to services/**
   - Convert to class if beneficial
   - Update import in VoiceInteractionOrchestrator
   - Better aligns with orchestration pattern

5. **Move piper-tts to audio/ or services/**
   - Low priority (only one import)
   - Improves consistency with new structure

### Long Term (Architecture)

6. **Consider TTS abstraction layer**
   - Create `services/TTSService.js` interface
   - Implementations: Piper, ElevenLabs, Streaming
   - Simplifies provider switching
   - Aligns with dependency injection pattern

---

## Conclusion

The refactoring is progressing well with clear improvements in code organization. The main issue is the **incomplete ElevenLabsTTS migration** - the new class exists but isn't integrated, while the old version is still in use. Completing this migration and finalizing git cleanup will bring the refactor to ~90% completion.

The remaining work is primarily organizational (moving files to better directories) rather than structural (replacing implementations). This indicates the core architecture refactoring is largely successful.

**Next Steps:**
1. Integrate new `ElevenLabsTTS` class
2. Finalize git deletions
3. Evaluate `audio-feedback.js` usage
4. Consider moving `streaming-tts.js` and `piper-tts.js`

**No Breaking Changes Expected:** All identified duplicates have clear migration paths that won't break existing functionality.
