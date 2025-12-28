# Tasks Migration Summary

**Date:** 2025-12-27
**Action:** Migrated from `/docs/tasks.md` to OpenSpec workflow

## Migration Overview

The project has transitioned from the centralized `docs/tasks.md` file to the OpenSpec change proposal system. All outstanding work is now tracked via OpenSpec proposals in `openspec/changes/`.

## Outstanding Tasks Status

### ✅ Completed via Recent OpenSpec Changes

- **Beep Audio Isolation** → `improve-boot-and-communication-reliability` (100% complete)
- **LangChain MCP Auto-Discovery** → `use-langchain-mcp-auto-discovery` (75% complete, needs runtime testing)
- **MCP Tool Parameter Schema Fix** → `fix-mcp-tool-parameter-schema` (100% complete)
- **Skip Transcription When Silent** → `skip-transcription-when-silent` (100% complete)
- **MCP Retry Logic** → `improve-boot-and-communication-reliability` (100% complete)
- **Startup Orchestration** → `improve-boot-and-communication-reliability` (100% complete)

### 🔄 Covered by Existing OpenSpec Proposals (Not Yet Started)

- **Voice Interruption Support** → `add-voice-interruption-support` (0% complete)
  - Covers: TTS interruption, wake word during playback

- **Demo Mode Switching** → `add-demo-mode-switching` (0% complete)
  - Covers: Offline/Online/Hybrid modes, Piper TTS integration

- **MQTT Sensor Data Fallback** → `add-mqtt-sensor-data-fallback` (0% complete)
  - Covers: MQTT subscriptions, device state updates

- **Z-Wave MCP Server Conversion** → `convert-zwave-mcp-server` (11% complete, Phase 1 done)
  - Covers: Oracle backend integration, MCP standard compliance

### ⏸️ Deferred (Low Priority)

**Oracle Backend Integration** - Deferred until voice gateway is 100% complete
- Device tools → Prisma + MQTT
- Conversation history storage
- Device status query tool
- Oracle-specific testing

**Presentation Preparation** - Will be handled separately when ready
- Slide deck
- Demo script
- Architecture diagrams
- Practice runs

### 🔬 Testing Strategy

Testing requirements are being integrated into each OpenSpec change:
- Each proposal's `tasks.md` includes testing tasks
- No separate "comprehensive testing" proposal needed
- Current approach: Test as you build

**Testing Status:**
- Voice Gateway: ~15% coverage (beep isolation, MCP retry, startup orchestration, skip-transcription)
- Oracle: 0% coverage (deferred)
- ZWave MCP Server: 0% coverage (in progress via convert-zwave-mcp-server)

## Minor Tasks / Tech Debt

The following minor items from the old tasks.md are NOT tracked in OpenSpec (too small for proposals):

- Cap max utterance duration safety guard
- Filter MQTT voice/res by session_id
- Add Markdown→speech preprocessor
- Environment variables for TTS volume/speed
- Health endpoint improvements
- Enhanced state transition logging

**Recommendation:** Address these incrementally during regular development or add to existing OpenSpec proposals if they become important.

## How to Track Work Going Forward

1. **For New Features/Changes:** Create OpenSpec proposal in `openspec/changes/`
   - Follow workflow in `openspec/AGENTS.md`
   - Include proposal.md, tasks.md, specs/, and optional design.md

2. **For Bug Fixes:** Fix directly, no proposal needed (unless architectural)

3. **For Progress Tracking:** Check OpenSpec task files:
   - `openspec/changes/[change-name]/tasks.md` - Implementation checklist
   - `openspec list` - View all active changes
   - `openspec show [change]` - View specific change details

4. **For Presentation Prep:** Create separate doc when ready (not OpenSpec)

## Files Affected

**Deleted:**
- `/docs/tasks.md` - Superseded by OpenSpec workflow

**Preserved:**
- `/openspec/changes/` - All active and archived proposals
- `/docs/TASKS_MIGRATION.md` - This migration summary

## Next Steps

1. Complete existing OpenSpec changes with runtime testing
2. Prioritize voice gateway completion (use-langchain-mcp-auto-discovery, add-voice-interruption-support)
3. Address Oracle backend only after voice gateway is 100%
4. Add testing incrementally to each OpenSpec change
