# Tasks: Documentation Cleanup Second Pass

## 1. Fix Broken Links in voice-gateway-oww/README.md

- [x] 1.1 Update `docs/performance-optimization.md` reference to `docs/PERFORMANCE.md` (line 756)
- [x] 1.2 Update or remove `docs/voice-gateway-architecture.md` reference (line 757) - file does not exist
- [x] 1.3 Verify all other documentation links in README are valid

## 2. Fix Broken Links in oracle/README.md

- [x] 2.1 Update `docs/oracle-systemd-setup.md` reference to `docs/DEPLOYMENT.md` (line 160)
- [x] 2.2 Verify all other documentation links in README are valid

## 3. Consolidate Archive Files

- [x] 3.1 Add TTS Migration Timeline summary to archive/README.md
  - Key dates: Piper TTS (Oct 13-24, 2025), ElevenLabs (Oct 24-27, 2025)
  - Tag history: v0.0.1, v0.0.2 were pre-ElevenLabs
  - Migration recommendation documented

- [x] 3.2 Add TTS Duplicate Analysis summary to archive/README.md
  - ElevenLabs: function-based migrated to class-based
  - BeepUtil: successfully replaced audio-feedback.js
  - 56% code reduction in new implementations

- [x] 3.3 Add Voice Gateway Refactoring summary to archive/README.md
  - Refactoring ~80% complete at time of analysis
  - Key migrations: Logger, AudioUtils, BackgroundTranscriber
  - New directory structure: ai/, audio/, services/, wake-word/

- [x] 3.4 Delete docs/archive/TTS_MIGRATION_HISTORY.md
- [x] 3.5 Delete docs/archive/TTS_DUPLICATE_ANALYSIS.md
- [x] 3.6 Delete docs/archive/DUPLICATE_FILES_ANALYSIS.md

## 4. Consolidate Voice Gateway Docs

- [x] 4.1 Create consolidated DEVELOPER_GUIDE.md structure with new sections
- [x] 4.2 Add "Startup Orchestration & Detector Warm-up" section from STARTUP_AND_ORCHESTRATION.md
- [x] 4.3 Add "Beep Audio Isolation System" section from BEEP_ISOLATION.md
- [x] 4.4 Add "MCP Retry Logic" section from MCP_RETRY_IMPLEMENTATION.md
- [x] 4.5 Remove duplicate headers and redundant intros
- [x] 4.6 Delete apps/voice-gateway-oww/docs/STARTUP_AND_ORCHESTRATION.md
- [x] 4.7 Delete apps/voice-gateway-oww/docs/BEEP_ISOLATION.md
- [x] 4.8 Delete apps/voice-gateway-oww/docs/MCP_RETRY_IMPLEMENTATION.md

## 5. Verification

- [x] 5.1 Grep for broken .md links in all README files
- [x] 5.2 Verify docs/archive/ only contains README.md
- [x] 5.3 Verify apps/voice-gateway-oww/docs/ only contains DEVELOPER_GUIDE.md
- [x] 5.4 Run `openspec validate cleanup-documentation-second-pass --strict`
