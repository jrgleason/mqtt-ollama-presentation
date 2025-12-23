# Tasks: Remove voice-gateway-common

**Change ID:** `remove-voice-gateway-common`
**Total Tasks:** 14

## Phase 1: Preparation (2 tasks)

- [ ] **1.1** Document current `transcribeWithWhisper` implementation
  - Read `voice-gateway-common/src/stt.js`
  - Document function signature, parameters, return value
  - Document current behavior (no timeout, basic error handling)
  - **Validation:** Implementation documented

- [ ] **1.2** Identify all call sites
  - Search for `transcribeWithWhisper` imports
  - Verify only TranscriptionService.js imports it
  - Document import path and usage
  - **Validation:** All call sites identified (expect only 1)

## Phase 2: Implement Timeout Support (5 tasks)

- [ ] **2.1** Create `_transcribeWithWhisper()` private method in TranscriptionService
  - Copy implementation from voice-gateway-common/src/stt.js
  - Make it a private method (prefix with `_`)
  - Accept same parameters: `whisperModel`, `wavPath`, `options`
  - **Validation:** Method created with correct signature

- [ ] **2.2** Implement AbortController for subprocess timeout
  - Create AbortController instance
  - Pass `signal` to `spawn()` options
  - Set timeout using `setTimeout(() => controller.abort(), timeoutMs)`
  - **Validation:** AbortController integrated correctly

- [ ] **2.3** Add timeout error handling
  - Catch `AbortError` from subprocess
  - Log timeout event with audio file path
  - Return empty string on timeout (matches existing fallback)
  - **Validation:** Timeout errors handled gracefully

- [ ] **2.4** Update call site to use private method
  - Change `transcribeWithWhisper(...)` to `this._transcribeWithWhisper(...)`
  - Remove import of `transcribeWithWhisper` from '@jrg-voice/common'
  - Keep all other behavior the same
  - **Validation:** Call site updated, no import errors

- [ ] **2.5** Test timeout behavior
  - Create test with 31-second silence audio file
  - Verify timeout triggers after 30 seconds
  - Verify subprocess is killed
  - Verify empty string is returned
  - **Validation:** Timeout works as expected

## Phase 3: Remove voice-gateway-common (3 tasks)

- [ ] **3.1** Remove package dependency
  - Edit `apps/voice-gateway-oww/package.json`
  - Remove line: `"@jrg-voice/common": "workspace:*"`
  - **Validation:** Dependency removed from package.json

- [ ] **3.2** Delete voice-gateway-common directory
  - Delete `apps/voice-gateway-common/` directory
  - Use `rm -rf` or equivalent
  - **Validation:** Directory no longer exists

- [ ] **3.3** Clean up node_modules
  - Run `npm install` in voice-gateway-oww
  - Verify `@jrg-voice/common` is removed from node_modules
  - **Validation:** Clean install completes successfully

## Phase 4: Validation (4 tasks)

- [ ] **4.1** Run ESLint
  - `npm run lint` in voice-gateway-oww
  - **Expected:** 0 errors, 0 warnings
  - **Validation:** Linter passes

- [ ] **4.2** Run tests
  - `npm run test` in voice-gateway-oww
  - **Expected:** All tests pass
  - **Validation:** Tests passing

- [ ] **4.3** Manual test: Full voice pipeline
  - Start voice gateway
  - Trigger wake word
  - Speak voice command
  - Verify transcription works
  - Verify AI response works
  - Verify TTS playback works
  - **Validation:** Full pipeline works end-to-end

- [ ] **4.4** Test timeout functionality
  - Modify config to set very short timeout (e.g., 100ms)
  - Speak normal voice command
  - Verify timeout triggers and is logged
  - Verify graceful fallback (empty transcription)
  - Restore normal timeout
  - **Validation:** Timeout triggers and handles gracefully

## Dependencies

- **Sequential:** Phase 2 must complete before Phase 3
- **Parallel-safe:** Tasks within each phase can be done in parallel
- **Blocking:** Phase 4 depends on Phase 3 completion

## Rollback Plan

If issues arise:
1. Restore voice-gateway-common directory from git history
2. Restore package.json dependency
3. Restore import in TranscriptionService.js
4. Run `npm install` to restore package

Alternatively:
- Keep timeout implementation but restore voice-gateway-common
- Test each component separately (timeout vs module removal)

## Success Metrics

- Zero import errors after removal
- All tests passing
- Linter clean (0 errors, 0 warnings)
- Full voice pipeline functional
- Timeout protection working correctly
- No orphaned dependencies in node_modules

## Critical Bug Fix

This change fixes a critical security bug where `TranscriptionService` passes a `timeoutMs` parameter that is completely ignored by `transcribeWithWhisper`. The current code has NO timeout protection, allowing Whisper processes to run indefinitely.

**Before:**
```javascript
// TranscriptionService.js:80-83
const transcription = await transcribeWithWhisper(
    this.whisperModel,
    wavPath,
    { timeoutMs: this.timeoutMs }  // IGNORED! Bug!
);

// voice-gateway-common/src/stt.js
export async function transcribeWithWhisper(whisperModel, wavPath) {
    // No timeout parameter, no protection
}
```

**After:**
```javascript
// TranscriptionService.js
const transcription = await this._transcribeWithWhisper(
    this.whisperModel,
    wavPath,
    { timeoutMs: this.timeoutMs }  // Actually used!
);

// TranscriptionService.js (private method)
async _transcribeWithWhisper(whisperModel, wavPath, options = {}) {
    const { timeoutMs = 30000 } = options;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
        // Spawn Whisper with signal: controller.signal
        // ...
    } finally {
        clearTimeout(timeout);
    }
}
```
