# Proposal: Rename Class Files to CamelCase

**Change ID:** `rename-class-files-to-camelcase`
**Status:** Completed
**Created:** 2025-12-22
**Completed:** 2025-12-22
**Affects:** Code Organization

## Summary

Standardize JavaScript file naming conventions in the voice-gateway-oww module to follow industry best practices:
- **Class files** (files that export ES6 classes) should use **PascalCase** (e.g., `AnthropicClient.js`)
- **Utility modules** (files that export functions/constants) should use **camelCase** (e.g., `mqttClient.js`)
- **Conventional files** (entry points, config, constants) remain **lowercase** (e.g., `config.js`, `main.js`, `index.js`)

This eliminates confusion between file naming and class naming, making the codebase more intuitive and aligning with JavaScript ecosystem conventions (React, TypeScript, modern ES modules).

## Motivation

### Current Problem
The codebase currently mixes naming conventions:
- Class files use kebab-case: `anthropic-client.js`, `ollama-client.js`, `conversation-manager.js`
- But they export PascalCase classes: `AnthropicClient`, `OllamaClient`, `ConversationManager`
- This creates cognitive overhead: `import {AnthropicClient} from './anthropic-client.js'`

### Why This Matters
1. **Clarity:** File name should hint at what it exports (class vs utilities)
2. **Consistency:** Already using PascalCase for newer files (`AudioPlayer.js`, `AIRouter.js`)
3. **Convention:** Matches React components, TypeScript, modern JS patterns
4. **Maintainability:** Easier onboarding, less "where is this class defined?"

### Examples from Codebase
**Current (Inconsistent):**
```javascript
import {AnthropicClient} from './anthropic-client.js';  // Class from kebab-case file
import {AudioPlayer} from './audio/AudioPlayer.js';      // Class from PascalCase file
```

**After (Consistent):**
```javascript
import {AnthropicClient} from './AnthropicClient.js';    // Class from PascalCase file
import {AudioPlayer} from './audio/AudioPlayer.js';      // Class from PascalCase file
```

## Proposed Changes

### Files to Rename (Class Exports → PascalCase)

1. **`src/anthropic-client.js`** → **`src/AnthropicClient.js`**
   - Exports: `AnthropicClient` class
   - Imports: 3 files (AIRouter, InitUtil, main)

2. **`src/ollama-client.js`** → **`src/OllamaClient.js`**
   - Exports: `OllamaClient` class
   - Imports: 3 files (AIRouter, InitUtil, main)

3. **`src/conversation-manager.js`** → **`src/ConversationManager.js`**
   - Exports: `ConversationManager` class (singleton instance)
   - Imports: 3 files (AIRouter, VoiceInteractionOrchestrator, main)

### Files to Rename (Utility Exports → camelCase)

4. **`src/mcp-zwave-client.js`** → **`src/mcpZWaveClient.js`**
   - Exports: Utility functions (`initializeMCPClient`, `getDevicesForAI`)
   - Imports: 2 files (InitUtil, main)

5. **`src/mqtt-client.js`** → **`src/mqttClient.js`**
   - Exports: Utility functions (`connectMQTT`, `publishTranscription`, `publishAIResponse`)
   - Imports: 3 files (InitUtil, VoiceInteractionOrchestrator, main)

6. **`src/piper-tts.js`** → **`src/piperTTS.js`**
   - Exports: Utility functions (`synthesizeSpeech`)
   - Imports: 1 file (streaming-tts)

7. **`src/streaming-tts.js`** → **`src/streamingTTS.js`**
   - Exports: Utility functions (`streamSpeak`)
   - Imports: 1 file (VoiceInteractionOrchestrator)

8. **`src/markdown-to-speech.js`** → **`src/markdownToSpeech.js`**
   - Exports: Utility function (`markdownToSpeech`)
   - Imports: 3 files (piper-tts, ElevenLabsTTS, streaming-tts)

### Files to Keep As-Is (Conventional)

- `src/config.js` - Configuration module (conventional lowercase)
- `src/main.js` - Entry point (conventional lowercase)
- `src/audio/constants.js` - Constants module (conventional lowercase)
- `src/tools/*.js` - Tool modules (conventional kebab-case for tools)
- `src/util/tools.js` - Barrel export (conventional lowercase)

## Impact Analysis

### Import Updates Required
**Total Files Affected:** ~15 files with import statements

**Breaking Change:** Yes (all imports must be updated)
- Risk: Medium (automated with careful testing)
- Scope: Limited to voice-gateway-oww module only

### Git History
- Files will be moved using `git mv` to preserve history
- Single atomic commit to avoid partial migration state

## Implementation Strategy

### Phase 1: Preparation
1. Document all files to rename with current import locations
2. Create mapping of old → new filenames
3. Identify all files that import renamed files

### Phase 2: Rename Files
1. Use `git mv` for each file to preserve history
2. Maintain alphabetical grouping (all renames in one commit)

### Phase 3: Update Imports
1. Update all import statements to reference new filenames
2. Run linter to catch any missed imports
3. Run tests to verify functionality

### Phase 4: Verification
1. `npm run lint` - Must pass with 0 errors
2. `npm run test` - Must pass all tests
3. Manual smoke test of key flows (wake word → transcription → AI → TTS)

## Risks & Mitigation

### Risk 1: Missed Import Updates
**Severity:** High
**Likelihood:** Medium
**Mitigation:**
- Use `rg` to search for all import statements
- Run linter to catch broken imports
- Automated testing

### Risk 2: Case-Sensitive Filesystems
**Severity:** Low
**Likelihood:** Low
**Mitigation:**
- Test on both macOS (case-insensitive) and Linux (case-sensitive)
- Use `git mv` which handles case changes correctly

### Risk 3: External Dependencies
**Severity:** Low
**Likelihood:** None
**Mitigation:**
- This module is not imported by other modules
- Changes are internal to voice-gateway-oww

## Success Criteria

- [x] All class files use PascalCase
- [x] All utility modules use camelCase
- [x] All conventional files remain lowercase
- [x] `npm run lint` passes with 0 errors
- [x] `npm run test` passes all tests
- [x] No broken imports detected
- [x] Git history preserved for all renamed files

## Related Changes

- Builds on previous refactoring work (class-based architecture)
- Aligns with directory organization (ai/, audio/, services/, util/)
- Complements duplicate file cleanup (completed 2025-12-22)

## References

- JavaScript Style Guide: https://github.com/airbnb/javascript#naming-conventions
- React File Naming: https://react.dev/learn#components
- TypeScript Conventions: PascalCase for files exporting classes
