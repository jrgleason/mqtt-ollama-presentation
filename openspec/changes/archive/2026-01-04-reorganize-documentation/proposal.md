# Change: Reorganize and Consolidate Documentation

## Why

The project has 30+ documentation files with significant overlap, outdated information, broken links, and fragmented content across multiple files covering the same topics. This makes it hard for new contributors and the presenter to find accurate information quickly before the January 12, 2026 demo.

**Key Problems Identified:**

1. **Duplicate content** - Performance docs split across 3 files, Z-Wave info in multiple places
2. **Broken links** - GETTING-STARTED.md references 5+ non-existent files
3. **Outdated info** - requirements.md mentions TypeScript, questions.md references deprecated approaches
4. **Fragmented topics** - Voice gateway info scattered across 4+ files
5. **Inconsistent link style** - Direct links everywhere make updates error-prone

## What Changes

### Files to Consolidate (Merge → Single File)

| Source Files | Target File | Rationale |
|-------------|-------------|-----------|
| `performance-analysis.md` + `performance-optimization.md` + `optimization-summary.md` | `PERFORMANCE.md` | All cover same topic |
| `GETTING-STARTED.md` + `SETUP.md` | `SETUP.md` | GETTING-STARTED is broken, SETUP comprehensive |
| `ai-provider-switching.md` content | `apps/voice-gateway-oww/README.md` | Provider config is voice-gateway specific |

### Files to Update

| File | Changes |
|------|---------|
| `docs/README.md` | Convert to reference-style links, update navigation structure |
| `requirements.md` | Remove TypeScript references, update to reflect JavaScript-only |
| `network-dependencies.md` | Add reference to EXTERNAL-INTEGRATIONS.md to avoid duplication |
| `questions.md` | Move remaining open questions to appropriate docs, archive rest |
| `outline.md` | Update to final presentation structure or archive |

### Files to Remove/Archive

| File | Action | Rationale |
|------|--------|-----------|
| `GETTING-STARTED.md` | Archive to `archive/README.md` summary | Broken links, superseded by SETUP.md |
| `performance-analysis.md` | Merge into PERFORMANCE.md then delete | Consolidation |
| `optimization-summary.md` | Merge into PERFORMANCE.md then delete | Consolidation |
| `ai-provider-switching.md` | Merge into voice-gateway README then delete | App-specific content |
| `questions.md` | Archive key decisions then delete | Mostly answered, outdated |

### New Documentation Structure

```
docs/
├── README.md                    # Navigation index with reference links
├── SETUP.md                     # Comprehensive setup (merged from GETTING-STARTED)
├── ARCHITECTURE.md              # System architecture (unchanged)
├── TECH-STACK.md                # Technology reference (unchanged)
├── EXTERNAL-INTEGRATIONS.md     # Integration patterns (unchanged)
├── DEPLOYMENT.md                # Production deployment (unchanged)
├── PERFORMANCE.md               # NEW: Consolidated performance guide
├── TESTING.md                   # Testing guidelines (unchanged)
│
├── zwave-setup-guide.md         # Z-Wave specific (unchanged, referenced from SETUP)
├── openwakeword-guide.md        # OpenWakeWord guide (unchanged)
├── mcp-architecture.md          # MCP details (unchanged)
├── voice-gateway-troubleshooting.md  # Troubleshooting (unchanged)
│
├── network-dependencies.md      # Network deps (minor update)
├── repository-guidelines.md     # Code standards (unchanged)
├── requirements.md              # Project requirements (update)
├── outline.md                   # Presentation outline (update or archive)
│
├── hardware/                    # Hardware docs (unchanged)
├── prompts/                     # Prompt experiments (unchanged)
└── archive/
    └── README.md                # Archive summary (update with consolidated history)
```

### Reference Link Pattern

Convert all docs to use reference-style links at bottom of files:

```markdown
<!-- Current (fragile) -->
See [SETUP.md](SETUP.md) for details.

<!-- Proposed (maintainable) -->
See [SETUP][setup] for details.

[setup]: SETUP.md
[arch]: ARCHITECTURE.md
[tech]: TECH-STACK.md
```

## Impact

- **Affected specs:** `documentation` (9 requirements)
- **Affected code:** None (docs only)
- **Risk level:** Low - Documentation changes only
- **Demo impact:** Positive - Easier to find accurate info before presentation

## Implementation Highlights

### Missing Implementation Check

Verified current implementation status:

1. **Oracle app** - Marked "not currently active" in project.md. The demo focuses on voice-gateway-oww.
2. **MCP server approach** - Archived per outline.md ("MCP server approach archived"). Direct MQTT from app is current approach.
3. **Voice gateway** - Primary focus, all examples should work
4. **Dual MQTT demo** - The "custom tool vs MCP" comparison is **NOT** the current demo plan. The outline shows direct MQTT integration only.

**Recommendation:** Update any docs that mention "dual approach" or "MCP comparison" demo since that's no longer the plan.

### Broken Links to Fix in GETTING-STARTED.md

These referenced files don't exist:
- `raspberry-pi-setup.md` → Should reference `SETUP.md` Part 1
- `mqtt-setup.md` → Should reference `SETUP.md` Part 2
- `zwave-js-ui-deploy.md` → Should reference `zwave-setup-guide.md`
- `oracle-systemd-setup.md` → Should reference `DEPLOYMENT.md`
- `voice-gateway-architecture.md` → Should reference `apps/voice-gateway-oww/README.md`

### Outdated Content to Update

1. **requirements.md line 40:** Says "App: Next.js, TypeScript" but project is JavaScript-only
2. **questions.md:** References browser mic approach (deprecated) and Porcupine (deprecated)
3. **outline.md:** References "dual approach" demo which is no longer planned
4. **EXTERNAL-INTEGRATIONS.md lines 86-91:** References "Week 1-2" and "Week 3" implementation timelines

## Definition of Done

- [ ] All duplicate content consolidated into single source of truth
- [ ] All broken links fixed or files archived
- [ ] All TypeScript references removed from requirements
- [ ] Reference-style links implemented in README.md
- [ ] `openspec validate reorganize-documentation --strict` passes
- [ ] Navigation from docs/README.md works for all paths
