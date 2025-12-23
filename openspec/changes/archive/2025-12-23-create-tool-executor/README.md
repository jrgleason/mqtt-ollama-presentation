# OpenSpec Change Proposal: Create Centralized Tool Executor

**Change ID:** `create-tool-executor`
**Status:** Awaiting Approval
**Created:** 2025-12-22

## Quick Summary

This proposal creates a centralized tool execution system to eliminate duplicate tool execution logic across 3 files (BackgroundTranscriber.js, AnthropicClient.js, OllamaClient.js).

**Impact:**
- Eliminates ~45 lines of duplicate code
- Reduces "add new tool" from 3 file changes to 1 file change
- Provides consistent logging and error handling
- Adds timeout protection and performance monitoring

**Breaking Changes:** None - This is an internal refactoring

## Files in This Proposal

- **`proposal.md`** - High-level overview (Why, What, Impact)
- **`tasks.md`** - Step-by-step implementation checklist (8 sections, 37 tasks)
- **`design.md`** - Detailed technical design decisions and architecture
- **`ARCHITECTURE.md`** - Visual diagrams and code comparisons
- **`specs/tool-execution/spec.md`** - OpenSpec requirements (8 requirements, 26 scenarios)

## How to Review

### 1. Start with the Visual Overview
Read **`ARCHITECTURE.md`** first for diagrams showing:
- Current architecture (duplicated logic)
- Proposed architecture (centralized)
- Before/after code comparison
- Initialization and execution flows

### 2. Understand the "Why"
Read **`proposal.md`** for:
- Problem statement
- Benefits of centralization
- Migration strategy

### 3. Review Technical Decisions
Read **`design.md`** for:
- 5 key architectural decisions (with rationales)
- Risks and trade-offs
- Migration plan (6 phases)
- Success criteria

### 4. Check Requirements
Read **`specs/tool-execution/spec.md`** for:
- Centralized Tool Execution requirement
- Tool Registry requirement
- Tool Definition Format requirement
- Tool Executor Interface requirement
- Performance Monitoring requirement
- AI Client Integration requirement
- Logging Context requirement
- Error Recovery requirement

### 5. Review Implementation Plan
Read **`tasks.md`** for:
- 8 sections covering all work
- 37 checkboxes for tracking progress
- Clear dependencies between tasks

## Key Design Decisions

### 1. ToolRegistry for Tool Management
- Central registry mapping tool names → executor functions
- Provides single source of truth
- Simplifies testing with mock tools

### 2. ToolExecutor as Stateful Class
- Enables dependency injection (logger, config)
- Supports timeout protection (30s default)
- Facilitates testing with mocked dependencies

### 3. Initialize at Application Startup
- All tools registered in main.js during startup
- Fails fast if registration has issues
- No lazy loading complexity

### 4. Pass ToolExecutor via Options
- No changes to AI client constructors (backward compatible)
- Allows different instances for testing
- Clear dependency flow

### 5. Keep Tool Definitions Co-located
- Tool definition + executor in same file
- Single file to edit when modifying a tool
- Follows existing project structure

## Benefits Summary

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Duplicate code | ~45 lines | 0 lines | **100% reduction** |
| Files to update for new tool | 3 files | 1 file | **67% less work** |
| Consistent logging | ❌ No | ✅ Yes | **Unified** |
| Consistent error handling | ❌ No | ✅ Yes | **Unified** |
| Testability | ⚠️ Hard | ✅ Easy | **Single point** |
| Timeout protection | ❌ No | ✅ Yes (30s) | **Added** |
| Performance monitoring | ❌ No | ✅ Yes | **Added** |

## Migration Strategy

The migration is designed to be **safe and incremental**:

1. **Phase 1:** Create infrastructure (no behavior change)
2. **Phase 2:** Update tool exports (preparation)
3. **Phase 3:** Integrate with BackgroundTranscriber
4. **Phase 4:** Integrate with AnthropicClient
5. **Phase 5:** Integrate with OllamaClient
6. **Phase 6:** Cleanup and verification

Each phase is independently testable. Old `toolExecutor` methods remain as fallback during migration.

## Success Criteria

This refactoring succeeds if:
- ✅ All tool execution works identically to before
- ✅ Adding a new tool requires changes in 1 place (not 3)
- ✅ Tool execution logging is consistent
- ✅ Error handling is consistent
- ✅ No performance degradation (<1% slower)
- ✅ Code coverage improves
- ✅ Code duplication eliminated

## Next Steps

1. **Review this proposal** - Read the files above
2. **Ask questions** - Use GitHub PR comments or discussions
3. **Approve** - Once satisfied, approve the proposal
4. **Implementation begins** - After approval, work through tasks.md

## Questions?

- **What problem does this solve?** - Eliminates duplicate tool execution logic in 3 files
- **Will this break anything?** - No, it's an internal refactoring with no API changes
- **How long will implementation take?** - Estimated 4-6 hours of focused work
- **What testing is required?** - Test all 4 tools (datetime, search, volume, zwave) with voice commands
- **Can we revert if needed?** - Yes, old code remains until final cleanup phase

## Validation

```bash
# Validate this proposal
openspec validate create-tool-executor --strict

# Show proposal details
openspec show create-tool-executor

# Show delta details
openspec show create-tool-executor --json --deltas-only
```

**Status:** ✅ Valid (verified 2025-12-22)
