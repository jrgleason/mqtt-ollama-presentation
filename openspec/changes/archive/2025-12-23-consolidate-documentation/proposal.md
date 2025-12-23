# Change: Consolidate and Shorten CLAUDE.md and project.md

## Why

CLAUDE.md and project.md have grown to 416 lines each with significant overlap and duplication. Both files repeat the same information about:
- JavaScript-only rules
- Technology stack
- Git workflow conventions
- Network dependencies
- Model performance benchmarks
- External integrations (Auth0, Ollama, MQTT, Z-Wave)
- Deployment procedures

This duplication creates maintenance burden and makes it harder for both AI assistants and human developers to find authoritative information. When rules or conventions change, they must be updated in multiple places, increasing the risk of inconsistency.

## What Changes

This change reorganizes project documentation to eliminate duplication while maintaining clear, focused guidance for AI assistants (CLAUDE.md) and OpenSpec context (project.md).

### High-Level Strategy

1. **CLAUDE.md** (AI assistant guidelines) - Focus on immediate coding rules and workflows
   - JavaScript-only rules (critical for AI behavior)
   - Server command restrictions
   - Task management workflow
   - Git workflow and commit conventions
   - Quick reference sections
   - Links to detailed docs instead of duplicating content

2. **project.md** (OpenSpec context) - Focus on project structure and domain context
   - Project overview and purpose
   - Architecture patterns and conventions
   - Domain context (voice automation, MQTT communication)
   - Current project status and technical debt
   - Presentation strategy

3. **New Reference Documents** in `docs/` folder:
   - `docs/TECH-STACK.md` - Technology stack, model recommendations, performance benchmarks
   - `docs/EXTERNAL-INTEGRATIONS.md` - Auth0, Ollama, MQTT, Z-Wave integration details
   - `docs/DEPLOYMENT.md` - Systemd service setup, pre-deployment checklists, common issues

### Specific Changes

**CLAUDE.md reductions:**
- Extract tech stack details → `docs/TECH-STACK.md` (save ~150 lines)
- Extract deployment procedures → `docs/DEPLOYMENT.md` (save ~400 lines)
- Extract external integration details → `docs/EXTERNAL-INTEGRATIONS.md` (save ~150 lines)
- Keep: Critical AI rules (JavaScript-only, no servers, task management, git workflow)
- Target: Reduce from 1426 lines to ~400 lines (70% reduction)

**project.md reductions:**
- Extract tech stack details → reference `docs/TECH-STACK.md` (save ~100 lines)
- Extract external dependencies → reference `docs/EXTERNAL-INTEGRATIONS.md` (save ~120 lines)
- Remove duplicate JavaScript rules → reference CLAUDE.md (save ~30 lines)
- Keep: Project context, architecture patterns, domain context, conventions
- Target: Reduce from 416 lines to ~200 lines (50% reduction)

**New documents created:**
- `docs/TECH-STACK.md` - Comprehensive technology reference
- `docs/EXTERNAL-INTEGRATIONS.md` - Integration patterns and configurations
- `docs/DEPLOYMENT.md` - Production deployment guide

## Impact

### Affected Files

**Modified:**
- `CLAUDE.md` - Streamlined to ~400 lines (from 1426)
- `openspec/project.md` - Streamlined to ~200 lines (from 416)

**Created:**
- `docs/TECH-STACK.md` - New comprehensive tech stack reference
- `docs/EXTERNAL-INTEGRATIONS.md` - New integration guide
- `docs/DEPLOYMENT.md` - New deployment guide (extracted from CLAUDE.md)

### Benefits

1. **Single Source of Truth** - Each piece of information lives in exactly one place
2. **Easier Maintenance** - Update once, reference everywhere
3. **Better Navigation** - Clear file names make information easier to find
4. **Reduced Cognitive Load** - Shorter files are easier to scan and understand
5. **Clearer Separation of Concerns** - AI rules vs project context vs technical reference

### Risks

1. **Link Maintenance** - References between files must stay current
   - Mitigation: Use clear link format, validate during reviews
2. **Discovery** - Developers may not find new docs
   - Mitigation: README.md includes documentation index
3. **Migration Effort** - Existing AI agents may reference old structure
   - Mitigation: This is a documentation-only change, no code impact

## Implementation Approach

1. Create new reference documents in `docs/` folder
2. Extract content from CLAUDE.md and project.md
3. Add cross-references and links
4. Update README.md with documentation index
5. Validate all links work
6. No code changes required (documentation-only)
