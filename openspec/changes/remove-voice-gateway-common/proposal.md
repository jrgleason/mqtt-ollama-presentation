# Proposal: Remove voice-gateway-common Module

**Change ID:** `remove-voice-gateway-common`
**Status:** Draft
**Created:** 2025-12-22
**Affects:** Transcription Service, Module Dependencies

## Summary

Complete the consolidation of `voice-gateway-common` into `voice-gateway-oww` by:
1. Migrating the `transcribeWithWhisper` function with proper timeout support (fixing critical bug)
2. Removing the `voice-gateway-common` directory
3. Removing the package dependency from `voice-gateway-oww/package.json`
4. Testing the full voice pipeline to ensure no regressions

## Motivation

### Current Problem

The `voice-gateway-common` directory still exists despite being marked for consolidation:
- **Directory exists:** `apps/voice-gateway-common/` (78 lines total)
- **Still imported:** Listed in `voice-gateway-oww/package.json` as `@jrg-voice/common`
- **Partial migration:** Audio utils copied but Whisper transcription still imported
- **Critical Bug:** `transcribeWithWhisper` doesn't support `timeoutMs` parameter but `TranscriptionService` passes it

### Why This Matters

1. **Security Risk:** Transcription has no timeout protection
   - Long-running Whisper processes can hang indefinitely
   - No protection against denial-of-service via audio input
   - `TranscriptionService` passes `timeoutMs: 30000` but parameter is ignored

2. **Code Duplication:** Similar functionality exists in multiple places
   - `audioUtils.js` was copied from voice-gateway-common to voice-gateway-oww
   - Creates maintenance burden and potential inconsistencies

3. **Incomplete Refactoring:** Previous work left this module behind
   - No OpenSpec proposal exists for this consolidation
   - Work was partially done but never completed
   - Creates technical debt and confusion

### Current Code Issue

**In TranscriptionService.js (lines 80-83):**
```javascript
const transcription = await transcribeWithWhisper(
    this.whisperModel,
    wavPath,
    { timeoutMs: this.timeoutMs }  // <-- This parameter has NO effect!
);
```

**In voice-gateway-common/src/stt.js:**
```javascript
export async function transcribeWithWhisper(whisperModel, wavPath) {
    // Note: No timeout parameter accepted or used
    // Whisper process can run indefinitely
}
```

## Proposed Changes

### Files to Migrate

**From `voice-gateway-common/src/stt.js` (77 lines):**
- Migrate `transcribeWithWhisper` function to `voice-gateway-oww/src/services/TranscriptionService.js`
- **Add timeout support** using `AbortController` and `setTimeout`
- **Add proper error handling** for timeout scenarios
- Update all call sites to use new location

### Files to Delete

1. **`apps/voice-gateway-common/`** - Entire directory (3 files, 95 lines total)
   - `index.js` - Module entry point
   - `src/stt.js` - Whisper transcription (77 lines)
   - `src/audioUtils.js` - Detector state (18 lines, UNUSED)
   - `package.json` - Package manifest

### Files to Update

**`apps/voice-gateway-oww/package.json`:**
- Remove dependency: `"@jrg-voice/common": "workspace:*"`

**`apps/voice-gateway-oww/src/services/TranscriptionService.js`:**
- Remove import: `import { transcribeWithWhisper } from '@jrg-voice/common'`
- Implement `_transcribeWithWhisper()` as private method with timeout support
- Update call site to use `this._transcribeWithWhisper()`

## Impact Analysis

### Import Updates Required

**Total Files Affected:** 1 file (TranscriptionService.js)

**Breaking Change:** No (internal implementation detail)
- Risk: Low (single consumer, well-tested)
- Scope: Limited to TranscriptionService class

### Timeout Implementation

New timeout behavior:
- Whisper process will timeout after `config.transcription.timeout` (default: 30000ms)
- Timeout will kill Whisper subprocess via `AbortController`
- Timeout error will be caught and logged
- Transcription will return empty string on timeout (existing fallback)

## Implementation Strategy

### Phase 1: Preparation (2 tasks)
1. Document current `transcribeWithWhisper` implementation
2. Identify all call sites (only TranscriptionService.js)

### Phase 2: Implement Timeout Support (5 tasks)
1. Add `_transcribeWithWhisper()` private method to TranscriptionService
2. Implement AbortController for subprocess timeout
3. Add timeout error handling
4. Update call site from imported function to private method
5. Test timeout behavior with long audio files

### Phase 3: Remove voice-gateway-common (3 tasks)
1. Remove `@jrg-voice/common` dependency from package.json
2. Delete `apps/voice-gateway-common/` directory
3. Run `npm install` to clean up node_modules

### Phase 4: Validation (4 tasks)
1. Run linter - Must pass with 0 errors
2. Run tests - Must pass all tests
3. Manual test: Wake word → transcription → AI → TTS pipeline
4. Verify timeout triggers correctly (test with 31-second silence)

## Risks & Mitigation

### Risk 1: Timeout Breaks Legitimate Long Transcriptions

**Severity:** Medium
**Likelihood:** Low
**Mitigation:**
- Default timeout is 30 seconds (generous for voice commands)
- Timeout is configurable via `config.transcription.timeout`
- Long transcriptions are rare in voice command context
- If needed, timeout can be increased or disabled via config

### Risk 2: Whisper Subprocess Cleanup Fails

**Severity:** Low
**Likelihood:** Low
**Mitigation:**
- Use `AbortController` for proper signal handling
- Add fallback `subprocess.kill()` on timeout
- Test with actual Whisper processes to verify cleanup

### Risk 3: Import Path Changes Break Code

**Severity:** Low
**Likelihood:** None
**Mitigation:**
- Only one import site (TranscriptionService.js)
- Change is to private method (no external callers)
- Comprehensive testing before deletion

## Success Criteria

- [x] `transcribeWithWhisper` migrated with timeout support
- [x] Timeout parameter is actually used (fixes bug)
- [x] voice-gateway-common directory deleted
- [x] Package dependency removed from package.json
- [x] `npm run lint` passes with 0 errors
- [x] `npm run test` passes all tests
- [x] Wake word → transcription → AI → TTS pipeline works
- [x] Timeout triggers correctly on long audio input

## Related Changes

- Builds on: `refactor-background-transcriber` (created TranscriptionService class)
- Fixes technical debt from incomplete consolidation
- Improves security posture of voice gateway

## References

- TranscriptionService implementation: `apps/voice-gateway-oww/src/services/TranscriptionService.js`
- Current bug location: TranscriptionService.js:80-83
- voice-gateway-common location: `apps/voice-gateway-common/`
- AbortController docs: https://nodejs.org/api/globals.html#class-abortcontroller
