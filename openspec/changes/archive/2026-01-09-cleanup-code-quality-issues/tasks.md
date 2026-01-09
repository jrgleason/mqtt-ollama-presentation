# Tasks: cleanup-code-quality-issues

## Implementation Tasks

### Phase 1: Standardize Logging

- [x] **1.1** Update datetime-tool.js logging
  - Import `logger` from `../util/Logger.js`
  - Replace `console.log('🕒 DateTime tool executed:', result)` with `logger.debug()`
  - **Validation:** No console.log calls remain in file

- [x] **1.2** Update volume-control-tool.js logging
  - Import `logger` from `../util/Logger.js`
  - Replace `console.log('🔊 Volume control tool called:', args)` with `logger.debug()`
  - Replace `console.log('🔊 Volume changed:...')` with `logger.info()`
  - Replace `console.error('❌ Volume control error:', error)` with `logger.error()`
  - Replace `console.error('❌ Volume control failed:', result.error)` with `logger.error()`
  - **Validation:** No console.* calls remain in file

- [x] **1.3** Update ToolManager.js logging
  - Import `logger` from `../util/Logger.js`
  - Replace all `console.warn`, `console.log`, `console.error` with appropriate `logger.*` calls
  - **Validation:** No console.* calls remain in file

### Phase 2: Remove Deprecated Exports

- [x] **2.1** Clean up OllamaClient.js
  - Remove singleton `defaultClient` variable (line ~396)
  - Remove `getDefaultClient()` function
  - Remove deprecated `createOllamaClient()` function
  - Remove deprecated `queryOllama()` function
  - Remove deprecated `checkOllamaHealth()` function
  - Remove the export block for deprecated functions
  - **Validation:** Only `OllamaClient` class is exported

- [x] **2.2** Clean up AnthropicClient.js
  - Remove singleton `defaultClient` variable (line ~442)
  - Remove `getDefaultClient()` function
  - Remove deprecated `createAnthropicClient()` function
  - Remove deprecated `queryAnthropic()` function
  - Remove deprecated `checkAnthropicHealth()` function
  - Remove the export block for deprecated functions
  - **Validation:** Only `AnthropicClient` class is exported

- [x] **2.3** Verify no usages of deprecated functions
  - Search codebase for `queryOllama`, `queryAnthropic`, `createOllamaClient`, etc.
  - Confirm zero usages before proceeding
  - **Validation:** `grep -r "queryOllama\|queryAnthropic\|createOllamaClient\|createAnthropicClient" src/` returns empty

### Phase 3: Optimize datetime-tool Arrays

- [x] **3.1** Extract arrays to module constants
  - Move `daysOfWeek` array to module-level `const DAYS_OF_WEEK`
  - Move `months` array to module-level `const MONTHS`
  - Update `getCurrentDateTime()` to use module constants
  - Update `getDateTimeDescription()` to use module constants (lines 64-67, 115)
  - **Validation:** No array literals inside functions

### Phase 4: Clean Up Stale Comments

- [ ] **4.1** Update search-tool.js comment (manual - low priority)
  - Line 12: Remove or update `@see openspec/changes/improve-search-tool-definition/design.md`
  - Replace with reference to archived location or remove entirely
  - **Validation:** No references to non-archived change directories

- [ ] **4.2** Review VoiceInteractionOrchestrator.js comment (manual - low priority)
  - Line 49: Check if deprecation comment is still accurate
  - Update or remove based on current state
  - **Validation:** Comment reflects current implementation status

- [ ] **4.3** Remove InitUtil.js "REMOVED" comment (manual - low priority)
  - Lines 180-182: Remove obsolete comment about removed code
  - **Validation:** No "REMOVED:" comments in file

### Phase 5: Archive Completed Change

- [x] **5.1** Archive improve-search-tool-definition
  - Run `openspec archive improve-search-tool-definition --yes`
  - Verify archive completed successfully
  - **Validation:** Change appears in `openspec/changes/archive/`

### Phase 6: Final Validation

- [x] **6.1** Run ESLint (skipped - no lint script configured)

- [x] **6.2** Run test suite
  - Run `npm test` in voice-gateway-oww
  - Ensure all tests pass
  - **Validation:** All tests pass (281 passed)

- [x] **6.3** Verify no console.* in tool files
  - Run `grep -n "console\." src/tools/*.js`
  - Should return empty
  - **Validation:** Zero matches (only Google Console URL in comment)

## Summary

**Completed:** 11/14 tasks
**Remaining:** 3 tasks (all Phase 4 - low priority comment cleanup)

The core implementation is complete. Remaining tasks are cosmetic comment updates that don't affect functionality.
