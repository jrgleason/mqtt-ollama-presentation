# Proposal: Documentation Cleanup Second Pass

## Summary

Second pass cleanup to fix broken links in app README files, consolidate remaining archive files, and combine voice gateway developer docs into a single file.

## Problem Statement

After the first documentation reorganization pass, there are still:
1. **Broken links** in app README files referencing deleted or non-existent documentation
2. **Redundant archive files** that should be summarized and removed
3. **Fragmented voice gateway docs** - 4 separate files (1,163 lines) that could be 1 comprehensive guide
4. **Minor inconsistencies** in documentation references

## Analysis

### Broken Links Found

**apps/voice-gateway-oww/README.md (lines 756-759):**
- `docs/performance-optimization.md` - File was consolidated into `PERFORMANCE.md`
- `docs/voice-gateway-architecture.md` - File does NOT exist

**apps/oracle/README.md (lines 160-161):**
- `docs/oracle-systemd-setup.md` - File does NOT exist, should reference `DEPLOYMENT.md`

### Archive Files to Consolidate

Three analysis reports remain in docs/archive/ that should be summarized:
1. `TTS_MIGRATION_HISTORY.md` (207 lines) - TTS tag history
2. `TTS_DUPLICATE_ANALYSIS.md` (396 lines) - TTS duplicate code analysis
3. `DUPLICATE_FILES_ANALYSIS.md` (592 lines) - Voice gateway duplicate analysis

These are valuable historical records but add 1195 lines of detail. Key findings should be preserved in archive/README.md.

### Voice Gateway Docs Fragmentation

The `apps/voice-gateway-oww/docs/` folder has 4 separate files that should be consolidated:

| File | Lines | Content |
|------|-------|---------|
| `DEVELOPER_GUIDE.md` | 347 | Wake word config, mic setup, file naming |
| `BEEP_ISOLATION.md` | 192 | Audio feedback isolation system |
| `MCP_RETRY_IMPLEMENTATION.md` | 267 | MCP connection retry logic |
| `STARTUP_AND_ORCHESTRATION.md` | 357 | Startup sequence, detector warm-up |

**Total: 1,163 lines across 4 files** - Can be consolidated to ~800-900 lines in one file.

### Verified Correctly Placed Files

The following .md files in apps/voice-gateway-oww/docs/ are **correctly placed** as app-specific documentation:
- `BEEP_ISOLATION.md` - Audio isolation implementation details
- `DEVELOPER_GUIDE.md` - Voice gateway developer guide
- `MCP_RETRY_IMPLEMENTATION.md` - MCP retry logic docs
- `STARTUP_AND_ORCHESTRATION.md` - Startup sequence docs

These do NOT need to move to top-level docs/ folder.

## Proposed Solution

### 1. Fix Broken Links

Update voice-gateway-oww README.md:
- Change `performance-optimization.md` to `PERFORMANCE.md`
- Remove or update `voice-gateway-architecture.md` reference

Update oracle README.md:
- Change `oracle-systemd-setup.md` to `DEPLOYMENT.md`

### 2. Consolidate Archive Files

Add summary sections to archive/README.md for:
- TTS Migration Timeline (from TTS_MIGRATION_HISTORY.md)
- TTS Duplicate Analysis Results (from TTS_DUPLICATE_ANALYSIS.md)
- Voice Gateway Refactoring Status (from DUPLICATE_FILES_ANALYSIS.md)

Delete the original files after summarization.

### 3. Consolidate Voice Gateway Docs

Merge all 4 files into a single comprehensive `DEVELOPER_GUIDE.md`:

```
DEVELOPER_GUIDE.md (consolidated)
├── Wake Word Configuration
├── Microphone Setup Refactoring
├── File Naming Conventions
├── Startup Orchestration & Detector Warm-up
├── Beep Audio Isolation System
└── MCP Retry Logic
```

Delete the 3 files after consolidation:
- `BEEP_ISOLATION.md`
- `MCP_RETRY_IMPLEMENTATION.md`
- `STARTUP_AND_ORCHESTRATION.md`

## Success Criteria

- [ ] No broken documentation links in app README files
- [ ] Archive folder contains only README.md with comprehensive summaries
- [ ] All historical analysis findings preserved in archive/README.md
- [ ] Voice gateway docs consolidated into single DEVELOPER_GUIDE.md
- [ ] 3 voice gateway doc files deleted after consolidation

## Risks

**Low risk** - These are documentation-only changes with no code impact.

## Effort Estimate

- Fix broken links: 10 minutes
- Summarize and delete archive files: 20 minutes
- Consolidate voice gateway docs: 30 minutes
- Verification: 5 minutes

**Total: ~65 minutes**
