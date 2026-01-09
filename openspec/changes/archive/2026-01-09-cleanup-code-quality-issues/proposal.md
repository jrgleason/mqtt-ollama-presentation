# Proposal: cleanup-code-quality-issues

## Summary

Clean up code quality issues discovered during the prompt extraction refactoring. This proposal addresses logging inconsistencies, deprecated exports, minor performance issues, and stale comments. All changes are low-risk and improve maintainability without changing behavior.

## Problem Statement

After extracting prompts to markdown files, a code review revealed several quality issues:

1. **Inconsistent Logging** - Tool files use `console.log` while the rest of the codebase uses the `logger` utility. This breaks structured logging, prevents log level filtering, and creates inconsistent output.

2. **Deprecated Backward Compatibility Exports** - Both `OllamaClient.js` and `AnthropicClient.js` export deprecated singleton functions (`queryOllama`, `queryAnthropic`, etc.) that are no longer used. These add 40+ lines of dead code per file.

3. **Array Recreation on Every Call** - `datetime-tool.js` recreates `daysOfWeek` and `months` arrays on every function invocation. While not a major performance issue, it's unnecessary allocation.

4. **Stale Comments** - References to archived OpenSpec changes and removed code.

5. **Unarchived Completed Change** - The `improve-search-tool-definition` change (5/9 tasks) should be archived since it's implemented.

## Proposed Changes

### 1. Standardize Logging in Tool Files

Replace `console.log/error/warn` with `logger` in:
- `src/tools/datetime-tool.js` (1 occurrence)
- `src/tools/volume-control-tool.js` (4 occurrences)
- `src/services/ToolManager.js` (4 occurrences)

### 2. Remove Deprecated Exports

Remove backward-compatibility singleton exports from:
- `src/OllamaClient.js` - Remove lines 393-431 (deprecated functions)
- `src/AnthropicClient.js` - Remove lines 438-478 (deprecated functions)

These exports are marked `@deprecated` and have no usages in the codebase.

### 3. Optimize datetime-tool Arrays

Move `daysOfWeek` and `months` arrays to module-level constants instead of recreating them in `getCurrentDateTime()` and `getDateTimeDescription()`.

### 4. Clean Up Stale Comments

Remove or update:
- `src/tools/search-tool.js:12` - Reference to `openspec/changes/improve-search-tool-definition/design.md`
- `src/services/VoiceInteractionOrchestrator.js:49` - Obsolete deprecation comment
- `src/util/InitUtil.js:180-182` - "REMOVED:" comment

### 5. Archive Completed Change

Archive `improve-search-tool-definition` since its implementation is complete.

## Impact Analysis

| Change | Risk | Impact | Lines Changed |
|--------|------|--------|---------------|
| Logging standardization | Low | Consistent log output | ~10 |
| Remove deprecated exports | Low | Less dead code | ~80 deleted |
| Array optimization | Very Low | Minor perf improvement | ~10 |
| Comment cleanup | Very Low | Better readability | ~5 |
| Archive change | None | Cleaner openspec | N/A |

**Total**: ~25 lines modified, ~80 lines deleted

## Non-Goals

The following issues were identified but are **out of scope**:

- **Monolithic `setupMic()` function** - Project.md explicitly notes this is acceptable risk before presentation
- **Large file sizes** - Working well, no issues reported
- **Extracting parameter descriptions to markdown** - Would be scope creep

## Acceptance Criteria

- [ ] All `console.*` calls in tool files replaced with `logger.*`
- [ ] No deprecated exports in AI client files
- [ ] `daysOfWeek`/`months` arrays are module-level constants
- [ ] No stale references to archived OpenSpec changes
- [ ] `improve-search-tool-definition` is archived
- [ ] All tests pass
- [ ] ESLint passes
