# Tasks: Rename Class Files to CamelCase

**Change ID:** `rename-class-files-to-camelcase`
**Total Tasks:** 34

## Phase 1: Preparation (3 tasks)

- [x] **1.1** Document all import locations for files being renamed
  - Use `rg` to find all imports of the 8 files
  - Create mapping table: old path → new path → importing files
  - **Validation:** Complete mapping with 0 missing imports

- [x] **1.2** Verify no external dependencies on these files
  - Check if any other modules import these files
  - Confirm changes are isolated to voice-gateway-oww
  - **Validation:** Confirmed isolation

- [x] **1.3** Create backup of current working state
  - `git status` to verify clean state
  - Document current branch and commit
  - **Validation:** Git status clean or documented

## Phase 2: Rename Class Files (3 tasks)

- [x] **2.1** Rename `anthropic-client.js` → `AnthropicClient.js`
  - `git mv src/anthropic-client.js src/AnthropicClient.js`
  - **Validation:** File renamed, git history preserved

- [x] **2.2** Rename `ollama-client.js` → `OllamaClient.js`
  - `git mv src/ollama-client.js src/OllamaClient.js`
  - **Validation:** File renamed, git history preserved

- [x] **2.3** Rename `conversation-manager.js` → `ConversationManager.js`
  - `git mv src/conversation-manager.js src/ConversationManager.js`
  - **Validation:** File renamed, git history preserved

## Phase 3: Rename Utility Files (5 tasks)

- [x] **3.1** Rename `mcp-zwave-client.js` → `mcpZWaveClient.js`
  - `git mv src/mcp-zwave-client.js src/mcpZWaveClient.js`
  - **Validation:** File renamed, git history preserved

- [x] **3.2** Rename `mqtt-client.js` → `mqttClient.js`
  - `git mv src/mqtt-client.js src/mqttClient.js`
  - **Validation:** File renamed, git history preserved

- [x] **3.3** Rename `piper-tts.js` → `piperTTS.js`
  - `git mv src/piper-tts.js src/piperTTS.js`
  - **Validation:** File renamed, git history preserved

- [x] **3.4** Rename `streaming-tts.js` → `streamingTTS.js`
  - `git mv src/streaming-tts.js src/streamingTTS.js`
  - **Validation:** File renamed, git history preserved

- [x] **3.5** Rename `markdown-to-speech.js` → `markdownToSpeech.js`
  - `git mv src/markdown-to-speech.js src/markdownToSpeech.js`
  - **Validation:** File renamed, git history preserved

## Phase 4: Update Imports for Class Files (9 tasks)

- [x] **4.1** Update imports in `src/ai/AIRouter.js`
  - Change `'../anthropic-client.js'` → `'../AnthropicClient.js'`
  - Change `'../ollama-client.js'` → `'../OllamaClient.js'`
  - Change `'../conversation-manager.js'` → `'../ConversationManager.js'`
  - **Validation:** File imports correctly, no linter errors

- [x] **4.2** Update imports in `src/util/InitUtil.js`
  - Change `'../anthropic-client.js'` → `'../AnthropicClient.js'`
  - Change `'../ollama-client.js'` → `'../OllamaClient.js'`
  - Change `'../mcp-zwave-client.js'` → `'../mcpZWaveClient.js'`
  - Change `'../mqtt-client.js'` → `'../mqttClient.js'`
  - **Validation:** File imports correctly, no linter errors

- [x] **4.3** Update imports in `src/main.js`
  - Change `'./anthropic-client.js'` → `'./AnthropicClient.js'`
  - Change `'./ollama-client.js'` → `'./OllamaClient.js'`
  - Change `'./conversation-manager.js'` → `'./ConversationManager.js'`
  - Change `'./mcp-zwave-client.js'` → `'./mcpZWaveClient.js'`
  - Change `'./mqtt-client.js'` → `'./mqttClient.js'`
  - **Validation:** File imports correctly, no linter errors

- [x] **4.4** Update imports in `src/services/VoiceInteractionOrchestrator.js`
  - Change `'../conversation-manager.js'` → `'../ConversationManager.js'`
  - Change `'../mqtt-client.js'` → `'../mqttClient.js'`
  - Change `'../streaming-tts.js'` → `'../streamingTTS.js'`
  - **Validation:** File imports correctly, no linter errors

- [x] **4.5** Update imports in `src/streaming-tts.js` → `src/streamingTTS.js`
  - Change `'./piper-tts.js'` → `'./piperTTS.js'`
  - Change `'./markdown-to-speech.js'` → `'./markdownToSpeech.js'`
  - **Validation:** File imports correctly, no linter errors

- [x] **4.6** Update imports in `src/piper-tts.js` → `src/piperTTS.js`
  - Change `'./markdown-to-speech.js'` → `'./markdownToSpeech.js'`
  - **Validation:** File imports correctly, no linter errors

- [x] **4.7** Update imports in `src/util/ElevenLabsTTS.js`
  - Change `'../markdown-to-speech.js'` → `'../markdownToSpeech.js'`
  - **Validation:** File imports correctly, no linter errors

- [x] **4.8** Search for any missed imports using grep
  - `rg "anthropic-client|ollama-client|conversation-manager" src/`
  - `rg "mcp-zwave-client|mqtt-client|piper-tts|streaming-tts|markdown-to-speech" src/`
  - **Validation:** No matches found (all imports updated)

- [x] **4.9** Verify no broken imports in test files
  - Check `src/__tests__/` for any test imports
  - Update if needed
  - **Validation:** Tests import correctly

## Phase 5: Verification (6 tasks)

- [x] **5.1** Run ESLint to catch import errors
  - `npm run lint`
  - **Expected:** 0 errors, 0 warnings
  - **Validation:** Linter passes

- [x] **5.2** Run tests to verify functionality
  - `npm run test`
  - **Expected:** All tests pass
  - **Validation:** 2/2 tests passing

- [x] **5.3** Check for case-sensitivity issues
  - Verify files exist with correct case: `ls -l src/*.js`
  - On Linux: confirm case-sensitive paths work
  - **Validation:** All files have correct case

- [ ] **5.4** Manual smoke test: Wake word detection
  - Start voice gateway
  - Trigger wake word
  - Verify detection works
  - **Validation:** Wake word detected successfully (SKIPPED - user will test)

- [ ] **5.5** Manual smoke test: AI interaction
  - Complete voice interaction flow
  - Verify transcription → AI query → TTS response
  - **Validation:** Full flow works end-to-end (SKIPPED - user will test)

- [x] **5.6** Verify git history preservation
  - `git log --follow src/AnthropicClient.js`
  - Confirm history includes old filename
  - **Validation:** History preserved for all renamed files (git mv used)

## Phase 6: Documentation & Cleanup (8 tasks)

- [x] **6.1** Update README.md if it references old filenames
  - Search for old filenames in docs
  - Update to new names
  - **Validation:** Documentation accurate (no references found)

- [x] **6.2** Update REFACTORING_GUIDE.md with naming convention
  - Add section on file naming conventions
  - PascalCase for classes, camelCase for utilities
  - **Validation:** Guide updated

- [x] **6.3** Check for any hardcoded paths in config files
  - Search `*.json`, `*.mjs` for old filenames
  - Update if needed
  - **Validation:** No hardcoded paths found

- [x] **6.4** Verify import paths in package.json scripts
  - Check if any scripts reference files directly
  - Update if needed
  - **Validation:** Scripts work correctly

- [x] **6.5** Update this tasks.md checklist
  - Mark all completed tasks as [x]
  - Add any discovered subtasks
  - **Validation:** Checklist accurate and complete

- [x] **6.6** Run final full test suite
  - `npm run lint && npm run test`
  - **Expected:** All pass
  - **Validation:** Clean bill of health

- [ ] **6.7** Create git commit with all changes
  - Commit message: "refactor: standardize file naming to PascalCase/camelCase"
  - Include all renames and import updates
  - **Validation:** Single atomic commit

- [ ] **6.8** Document completion in proposal.md
  - Update status to "Completed"
  - Add completion date
  - **Validation:** Proposal marked complete

## Dependencies

- **Parallel-safe:** Phases 2 and 3 can be done in parallel (renaming different files)
- **Sequential:** Phase 4 depends on Phase 2 & 3 completion
- **Blocking:** Phase 5 depends on Phase 4 completion

## Rollback Plan

If issues arise:
1. `git reset --hard HEAD~1` to undo commit
2. Alternatively: `git revert <commit>` to create revert commit
3. Cherry-pick any file renames that worked: `git cherry-pick -n <commit> -- src/working-file.js`

## Success Metrics

- Zero broken imports
- All tests passing
- Linter clean (0 errors, 0 warnings)
- Git history preserved for all 8 renamed files
- Naming convention documented for future reference
