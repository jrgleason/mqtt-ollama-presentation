# Tasks: Reorganize Documentation

## 1. Consolidate Performance Documentation

- [x] 1.1 Create `docs/PERFORMANCE.md` with combined structure
- [x] 1.2 Copy key content from `performance-analysis.md` (industry benchmarks, debug logs)
- [x] 1.3 Copy key content from `performance-optimization.md` (optimization journey, model selection)
- [x] 1.4 Copy key content from `optimization-summary.md` (VAD tuning, recommendations)
- [x] 1.5 Remove duplicate sections and organize into logical flow
- [x] 1.6 Delete original files after consolidation verified

## 2. Fix Broken Links in GETTING-STARTED.md

- [x] 2.1 Update `raspberry-pi-setup.md` reference to `SETUP.md#part-1-hardware-setup-raspberry-pi-5`
- [x] 2.2 Update `mqtt-setup.md` reference to `SETUP.md#part-2-mqtt-broker-setup`
- [x] 2.3 Update `zwave-js-ui-deploy.md` reference to `zwave-setup-guide.md`
- [x] 2.4 Update `oracle-systemd-setup.md` reference to `DEPLOYMENT.md`
- [x] 2.5 Update `voice-gateway-architecture.md` reference to `apps/voice-gateway-oww/README.md`

## 3. Update Outdated Content

- [x] 3.1 Update `requirements.md` line ~40: Change "TypeScript" to "JavaScript"
- [x] 3.2 Remove "dual approach" content from EXTERNAL-INTEGRATIONS.md
- [x] 3.3 Update outline.md (already current - no MCP comparison)
- [x] 3.4 Archive questions.md key decisions in archive/README.md
- [x] 3.5 Delete questions.md (all items answered/archived)

## 4. Move App-Specific Content

- [x] 4.1 Copy AI provider switching guide content to `apps/voice-gateway-oww/README.md`
- [x] 4.2 Add "AI Provider Configuration" section to voice gateway README
- [x] 4.3 Delete `ai-provider-switching.md`

## 5. Implement Reference-Style Links

- [x] 5.1 Create reference link section at bottom of `docs/README.md`
- [x] 5.2 Convert all inline links to reference style in README.md
- [x] 5.3 Update link references in GETTING-STARTED.md footer

## 6. Update Navigation Index

- [x] 6.1 Remove references to deleted/archived files from README.md
- [x] 6.2 Add new PERFORMANCE.md to appropriate section
- [x] 6.3 Update directory tree to match new structure

## 7. Archive Cleanup

- [x] 7.1 Update `archive/README.md` with summaries of archived files
- [x] 7.2 Add GETTING-STARTED.md key learnings to archive summary
- [x] 7.3 Add questions.md final decisions to archive summary
- [x] 7.4 Add performance docs summaries to archive

## 8. Verification

- [x] 8.1 Run `openspec validate reorganize-documentation --strict`
- [x] 8.2 Verify no broken internal links with grep
- [x] 8.3 Confirm all referenced files exist
- [x] 8.4 Update references in ARCHITECTURE.md, TECH-STACK.md, etc. to point to PERFORMANCE.md
