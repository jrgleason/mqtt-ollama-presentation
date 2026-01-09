# Tasks: Fix Startup Speech Timing

**Change ID:** `fix-startup-speech-timing`
**Status:** Phase 1 Complete - Awaiting User Testing
**Total Tasks:** 4 (2 completed, 2 pending user testing)

## Phase 1: Code Refactoring (2 tasks) ✅ COMPLETED

- [x] **1.1** Reorder initialization in main.js
  - Move tool system initialization (lines 319-334) to occur BEFORE startTTSWelcome (line 317)
  - Move orchestrator creation (line 337) to occur BEFORE startTTSWelcome
  - Move state machine setup (line 338) to occur BEFORE startTTSWelcome
  - Keep microphone setup AFTER startTTSWelcome (depends on state machine)
  - **Validation:** ✅ Code updated, all imports valid, comments added for clarity

- [x] **1.2** Update log messages for clarity
  - Ensure log sequence accurately reflects new initialization order
  - Add timing context to welcome message log if needed
  - **Validation:** ✅ Added clarifying comments: "BEFORE welcome message", "system is ready!", "Transition to listening mode"

## Phase 2: Testing (2 tasks)

- [ ] **2.1** Test startup sequence
  - Run voice gateway and verify startup completes successfully
  - Check logs show new initialization order (tools → TTS → mic)
  - Confirm all 4 tools registered correctly
  - Verify welcome message plays successfully
  - **Validation:** Startup logs show: tool init → TTS synthesis → welcome spoken → mic started

- [ ] **2.2** Test interactive responsiveness
  - Start voice gateway
  - Wait for welcome message: "Hello, I am Jarvis. How can I help?"
  - Immediately trigger wake word after welcome completes
  - Issue a command that uses tools (e.g., "What time is it?")
  - Verify no delays or "tool not found" errors
  - **Validation:** System responds immediately to first command after welcome

## Dependencies

- **Sequential:** Task 1.1 must complete before testing tasks
- **No external dependencies:** This is a pure code reorganization

## Rollback Plan

If issues arise:
1. Revert main.js to original line order
2. Restart services
3. Debug root cause

This is safe because:
- Single file change
- No API changes
- No new dependencies
- Easy to revert (simple line move)

## Success Metrics

- Welcome message speaks AFTER tool system is ready
- No perceptible delay between welcome and first interaction
- All tools still function correctly
- Startup logs show logical initialization sequence
- User experience improved (system ready when it says it is)

## Critical User Experience Fix

This change fixes a confusing UX issue where the system says "How can I help?" but then takes 1-2 seconds to actually be ready to help. This creates user confusion and makes the system appear broken or unresponsive during demos.

**Before:**
```
[TTS] "Hello, I am Jarvis. How can I help?"
[System] Initializing tools... (1-2s delay)
[System] Ready to listen
[User] (confused why nothing happened)
```

**After:**
```
[System] Initializing tools...
[System] Ready to listen
[TTS] "Hello, I am Jarvis. How can I help?"
[User] Immediately responsive!
```
