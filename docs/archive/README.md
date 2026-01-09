# Documentation Archive Summary

**Last Updated:** 2026-01-03

This README summarizes all historical documentation that has been archived or removed from the project. Key decisions and findings are preserved here for reference.

---

## Technology Decisions & Replacements

### Piper TTS → ElevenLabs TTS

**Decision Date:** October 2025

**Why Changed:**
- Better voice quality and naturalness
- More voice options available
- Simpler integration via API
- Less resource-intensive than local Piper synthesis

**Piper TTS Key Learnings (Preserved):**
- Local TTS possible with Piper (offline-capable)
- Voice models: `en_US-amy-medium.onnx` worked well
- Synthesis speed on Pi 5: ~3-5 seconds for short responses
- Quality tradeoff: Piper voices less natural than cloud TTS
- Configuration: `TTS_VOLUME=1.0`, `TTS_SPEED=1.0` for optimal playback
- ALSA playback on Linux, speaker.js on macOS
- GLaDOS voice available as custom model (novelty feature)
- Streaming not feasible due to sentence-by-sentence synthesis

**What's Now Active:** ElevenLabs TTS via API (see voice-gateway-oww configuration)

---

### TypeScript → JavaScript

**Decision Date:** September 2025

**Why Changed:**
- Simplified development workflow
- Removed TypeScript compilation overhead
- Using Zod for runtime validation instead
- Easier for presentation/demo purposes

**Key Migration Notes:**
- All `.ts` and `.tsx` files converted to `.js` and `.jsx`
- Type checking replaced with Zod schemas
- JSDoc comments added for documentation
- No breaking changes to functionality

---

### Porcupine → OpenWakeWord

**Decision Date:** September 2025

**Why Changed:**
- Porcupine requires API key (not truly offline)
- OpenWakeWord is fully offline and free
- Better customization options
- Community support for custom wake words

**OpenWakeWord Key Implementation Details:**
- Model architecture: Mel spectrogram → Embedding model → Wake word model
- Input shape: `[1, 16, 96]` (batch, time_steps, features)
- Temporal context: 1.28 seconds (16 × 80ms embeddings)
- Detection threshold: 0.15-0.35 (tunable based on environment)
- Models required: melspectrogram.onnx, embedding_model.onnx, wake_word.onnx
- Custom training possible with 20-50 audio samples

**What's Now Active:** OpenWakeWord in voice-gateway-oww service

---

## Architecture Decisions (Historical)

### Next.js vs React Native

**Decision:** Next.js chosen for Oracle app

**Key Reasons:**
- Server-side rendering for better initial load
- Built-in API routes for LangChain integration
- Better suited for web-based control panel
- React Native would add mobile app complexity not needed for demo

### Database Choice

**Decision:** SQLite with Prisma ORM

**Key Reasons:**
- Local-first architecture (no cloud dependency)
- Prisma provides excellent TypeScript/JavaScript support
- SQLite perfect for single-user/demo scenario
- Easy to seed and reset for demos

### MCP Integration Approach

**Decision:** Custom TypeScript MCP server + direct MQTT integration

**Key Reasons:**
- MCP server useful for Claude Desktop integration
- Direct MQTT faster for real-time control
- Dual approach demonstrates both patterns
- MCP great for presentation "before/after" comparison

---

## Implementation Summaries (Historical)

### Oracle Chatbot (Initial Implementation - October 2025)

**What Was Built:**
- Next.js 15 app with App Router
- LangChain.js integration with Ollama
- Streaming chat interface with SSE
- Mock device control tools (later replaced with real MQTT)
- shadcn/ui components for UI

**Initial Tech Stack:**
- TypeScript (later converted to JavaScript)
- Qwen3:1.7b model (later optimized to qwen2.5:0.5b for speed)
- Mock MQTT implementation (later replaced with real broker)

**Key Learnings:**
- Streaming SSE works well for real-time AI responses
- LangChain tool calling excellent for device control
- Mock data useful for initial development
- TypeScript overhead not worth it for demo project

---

### CI/Build Fixes (October 2025)

**Problem:** CI failing due to missing package-lock.json files

**Root Cause:**
- `.gitignore` files contained `package-lock.json`
- `npm ci` requires lockfiles to be committed
- Jest configured with non-existent test directories

**Solution:**
- Removed `package-lock.json` from `.gitignore`
- Committed all lockfiles to git
- Fixed Jest configurations (`passWithNoTests: true`)
- Created placeholder test files

**Status:** ✅ CI now passing (though test coverage still 0%)

---

### Dependency Updates (October 2025)

**Major Updates:**
- Prisma 6.16.3 → 6.17.1
- MCP SDK 0.5.0 → 1.20.0 (breaking changes)
- TypeScript 5.3.3 → 5.9.3
- All MQTT packages → 5.14.1

**Decisions:**
- **Kept Zod at v3.x** (v4 breaks LangChain compatibility)
- **Kept UUID at v9.x** (v13 too risky pre-demo)
- All apps now have 0 security vulnerabilities

**Lesson:** Don't update major versions right before demo!

---

### Voice Gateway Evolution

**Phase 1: Porcupine + Whisper.cpp**
- Used Picovoice Porcupine (requires API key)
- Whisper.cpp with local models
- Text-only responses (no TTS)
- **Abandoned:** Not truly offline, complex build

**Phase 2: OpenWakeWord + Whisper via Ollama**
- Fully offline wake word detection
- Whisper transcription via Ollama API
- No TTS initially
- **Issue:** Shape mismatch bugs (embedding buffer)

**Phase 3: Current (OpenWakeWord + Whisper + ElevenLabs)**
- OpenWakeWord for wake word
- Whisper via Ollama for STT
- ElevenLabs for TTS (API-based)
- **Status:** ✅ Working, demo-ready

---

### Critical Bug Fixes (Preserved Learnings)

**Wake Word Shape Mismatch:**
- **Problem:** Model expected `[1, 16, 96]` but got `[1, 1, 96]`
- **Cause:** Not accumulating 16 embeddings over time
- **Fix:** Implemented rolling buffer of embeddings
- **Lesson:** OpenWakeWord needs temporal context (1.28s of audio)

**MQTT Client Options Loss:**
- **Problem:** `publish()` only forwarding `qos`, dropping `retain`, `properties`
- **Fix:** Use spread operator: `{ qos: 0, ...options }`
- **Lesson:** Always preserve user options in wrapper functions

**Voice Gateway State Machine Stuck:**
- **Problem:** System stuck in "transcribing" state on timeout
- **Fix:** Add 10s timeout + always re-enable wake word in error handler
- **Lesson:** Every async operation needs timeout + recovery path

---

## MCP Research Findings

**Initial Research (September 2025):**
- MCP provides clean abstraction for AI ↔ tools integration
- Works with Claude Desktop, Claude Code, and custom clients
- MQTT remains source of truth for device state
- MCP useful for multi-client scenarios

**Testing Results:**
- MCP Inspector excellent for debugging tools
- Tool registration straightforward with @modelcontextprotocol/sdk
- WebSocket transport works well for streaming
- MQTT integration via MCP server maintains separation of concerns

**Architecture Decision:**
- Keep both direct MQTT (Oracle app) and MCP server (Claude Desktop)
- Demonstrates two integration patterns in presentation
- MCP not required for core demo but nice-to-have

---

## App Analysis (October 2025)

**Oracle App Health:**
- ✅ Stable, builds successfully
- ⚠️ Wildcard dependencies ("*") replaced with specific versions
- ⚠️ 0% test coverage (needs improvement)
- ✅ No security vulnerabilities

**zwave-mcp-server Health:**
- ⚠️ MCP SDK outdated (0.5.0 → 1.20.0 updated)
- ✅ Builds successfully
- ⚠️ No tests

**voice-gateway-oww Health:**
- ✅ Core functionality working
- ⚠️ Needs ElevenLabs integration completion
- ⚠️ No tests
- ✅ Audio pipeline stable

**Overall:** Functional but lacking test coverage across all apps

---

## Project Evolution Timeline

**September 2025:**
- Initial project setup
- TypeScript → JavaScript conversion
- Porcupine → OpenWakeWord migration
- Basic chat interface implemented

**October 2025:**
- MQTT integration completed
- Wake word detection debugged
- CI/build issues resolved
- Dependency updates
- Piper TTS → ElevenLabs migration started

**Current Status (October 2025):**
- ✅ Oracle chat app working
- ✅ Z-Wave MQTT integration functional
- 🔄 Voice gateway needs TTS completion
- 🔄 Test coverage needed across all apps
- 🔄 Final demo polish required

---

## Key Lessons Learned

1. **Start Simple:** Mock implementations useful for initial development
2. **Test Early:** 0% coverage makes changes risky
3. **Lock Dependencies:** Wildcard versions cause instability
4. **Document Decisions:** This archive prevents re-researching solved problems
5. **Offline-First:** Local models (Ollama, OpenWakeWord) work great on Pi 5
6. **Don't Over-Engineer:** TypeScript overhead not worth it for demo
7. **Plan State Management:** Voice gateway state machine needed careful design
8. **Timeouts Everywhere:** Every async operation needs timeout + recovery
9. **Version Carefully:** Don't update major versions right before demo
10. **Archive, Don't Delete:** Preserve decisions and learnings

---

## What's Currently Active

For current documentation, see:

- **Documentation Index:** `/docs/README.md`
- **Setup Guide:** `/docs/SETUP.md` (consolidated from GETTING-STARTED.md)
- **Performance Guide:** `/docs/PERFORMANCE.md` (consolidated from multiple performance docs)
- **Tasks:** `/docs/tasks.md`
- **Requirements:** `/docs/requirements.md`
- **Tech Stack:** `/docs/TECH-STACK.md`
- **Guidelines:** `/CLAUDE.md`
- **Voice Gateway:** `/apps/voice-gateway-oww/README.md` (includes AI provider switching)

---

## Accessing Deleted Files

If you need to recover any archived content:

```bash
# Search git history for deleted files
git log --all --full-history --diff-filter=D -- "docs/archive/*"

# Restore a specific file
git checkout <commit-hash> -- path/to/file.md
```

---

## January 2026 Documentation Consolidation

**Consolidation Date:** January 2026

As part of a major documentation reorganization effort before the CodeMash 2026 presentation (January 12, 2026), several documents were consolidated to reduce redundancy, fix broken links, and improve navigation. The following files were archived:

### GETTING-STARTED.md

**Status:** Content merged into SETUP.md

**Original Purpose:** Quick-start checklist for getting the demo running on laptop/desktop or Raspberry Pi 5.

**Key Content Preserved:**
- Environment setup instructions (Node.js 20+, Docker, Ollama)
- Service configuration steps (Auth0, MQTT, Ollama env vars)
- Stack launch commands with docker compose
- Validation checklist (Oracle UI, zwave-js-ui, MQTT logs)

**Why Archived:** Content was duplicative with other setup documentation. Merged into consolidated SETUP.md with broken links fixed and updated references.

---

### performance-analysis.md

**Status:** Content merged into PERFORMANCE.md

**Original Purpose:** Detailed analysis of voice gateway performance with industry benchmarks and optimization strategies.

**Key Content Preserved:**
- Performance benchmarks: Wake word <50ms, Whisper STT 265-342ms, Anthropic AI 1-2s (no tools), 2-4s (with tools), ElevenLabs TTS 1.2-1.8s
- Industry comparison: Alexa target <1s certification, 3-4s reality
- Finding: <500ms goal NOT achievable with cloud-based LLMs (TTFT alone is 360-700ms)
- Debug logging instructions for performance profiling
- Direct tool bypass strategy for datetime queries (0-1ms vs 2000ms)

**Why Archived:** Consolidated with other performance docs into single PERFORMANCE.md reference.

---

### performance-optimization.md

**Status:** Content merged into PERFORMANCE.md

**Original Purpose:** Chronicle of the optimization journey from 27 seconds to 7 seconds (74% improvement).

**Key Content Preserved:**
- Optimization phases: qwen3:1.7b -> qwen2.5:1.5b -> qwen2.5:0.5b (93% faster)
- Whisper model: ggml-base.bin -> ggml-tiny.bin (75% faster, 75MB vs 142MB)
- System prompt engineering: Removed <think> tags, 85% reduction in response length
- Final pipeline: Wake word 100ms, VAD 2.7s, Whisper 1.5s, Ollama 1s, TTS 1.7s
- Model selection guidelines for voice gateway vs Oracle chatbot
- Hardware-appropriate selection for Raspberry Pi 5

**Why Archived:** Consolidated with other performance docs into single PERFORMANCE.md reference.

---

### optimization-summary.md

**Status:** Content merged into PERFORMANCE.md

**Original Purpose:** Summary of optimization changes and their impact on responsiveness.

**Key Content Preserved:**
- VAD silence detection optimization: 1500ms -> 800ms (700ms faster)
- Search query bypass removal fix (Anthropic now handles searches properly)
- Extended thinking NOT recommended for voice (adds 1-2s latency)
- Final pipeline timeline: ~5-6 seconds total (down from 7-8 seconds)
- Tuning guide for VAD settings (500ms-1500ms range)

**Why Archived:** Consolidated with other performance docs into single PERFORMANCE.md reference.

---

### ai-provider-switching.md

**Status:** Content moved to apps/voice-gateway-oww/README.md

**Original Purpose:** Guide for switching between Anthropic and Ollama AI providers in the voice gateway.

**Key Content Preserved:**
- Provider configuration: AI_PROVIDER env var, --ollama flag
- Anthropic models: claude-3-5-haiku (fast), claude-3-5-sonnet (balanced), claude-3-opus (capable)
- Ollama models: qwen2.5:0.5b (1s), qwen2.5:1.5b (4.6s), qwen3:1.7b (14s, not recommended)
- Cost comparison: Anthropic ~$0.50-1.00/1000 queries vs Ollama free
- Recommendations: Anthropic for production/demo, Ollama for development/offline

**Why Archived:** Documentation was specific to voice-gateway-oww app and belongs in that module's README rather than top-level docs.

---

### questions.md

**Status:** All questions answered, decisions documented

**Original Purpose:** Clarifying questions for CodeMash 2026 presentation with decision tracking.

**Final Decisions Preserved:**
- **Q1 (Z-Wave Integration):** Use zwave-js-ui as-is with built-in MQTT
- **Q2 (Frontend):** Next.js with App Router
- **Q4 (Wake Word):** OpenWakeWord (ONNX, offline), wake word "Hey Jarvis", Porcupine deprecated
- **Q5 (Ollama Models):** Prefer llama3.2/mistral for reliable tool-calling; avoid qwen/gemma/phi for tool-calling
- **Q6 (MQTT Broker):** HiveMQ CE at mqtt://localhost:1883
- **Q7 (Voice Input):** Dedicated voice-gateway-oww service, browser mic approach deprecated
- **Q8 (Auth):** Auth0 recommended but optional/deferred for demo to stay offline-friendly
- **Database:** Start minimal (Users optional, Devices, UserPreferences); ConversationHistory is stretch goal
- **Hardware:** Raspberry Pi 5 + Z-Wave daughter board + 2-3 physical devices
- **Live Demo:** Yes, with offline/backup flows prepared

**Status Summary at Archive:** 6/15 fully answered (Q1, Q2, Q4, Q5, Q6, Q7), 1 optional/deferred (Q8), remainder implementation details resolved during development.

**Why Archived:** All questions answered and decisions made. Key decisions preserved above; remaining implementation choices documented in respective module READMEs.

---

---

## TTS Migration Timeline

**Analysis Date:** December 2025

**Summary:** Analysis of the TTS system migration from Piper (local) to ElevenLabs (cloud).

### Key Dates

| Phase | Date | Event |
|-------|------|-------|
| Piper TTS Only | Oct 13-24, 2025 | Piper TTS added (commit c3b0817) |
| Tag 0.0.1 | Oct 13, 2025 | First stable version (Piper only) |
| Tag 0.0.2 | Oct 19, 2025 | Improvements and fixes (still Piper only) |
| ElevenLabs Added | Oct 24, 2025 | ElevenLabs TTS added (commit 54c4423) |
| ElevenLabs Default | Oct 27, 2025 | ElevenLabs becomes default (commit ec14a0d) |

### Migration Highlights

- **Neither tag 0.0.1 nor 0.0.2 reflect ElevenLabs** - both use Piper only
- ElevenLabs introduced `TTS_PROVIDER` env var for switching providers
- `TTS_STREAMING=true` enabled for streaming TTS
- Piper still available for offline use via `TTS_PROVIDER=Piper`

### Tag Recommendation

Consider creating new tags:
- `0.0.3` - ElevenLabs TTS added (commit 54c4423)
- `0.1.0` - ElevenLabs default with streaming (commit ec14a0d)

---

## TTS Duplicate Analysis Results

**Analysis Date:** December 22, 2025

**Summary:** Analysis of duplicate TTS implementations during the class-based refactoring.

### ElevenLabs TTS Duplicates

| Implementation | File | Lines | Status |
|---------------|------|-------|--------|
| OLD (function-based) | `src/elevenlabs-tts.js` | 502 | In use by 3 files |
| NEW (class-based) | `src/util/ElevenLabsTTS.js` | 222 | Not yet integrated |

**Code Reduction:** New implementation is 56% smaller (222 vs 502 lines)

### Audio Feedback Migration

| Implementation | File | Status |
|---------------|------|--------|
| OLD (function-based) | `src/audio-feedback.js` | No active imports |
| NEW (class-based) | `src/util/BeepUtil.js` | Fully migrated (3 imports) |

**Result:** BeepUtil successfully replaced audio-feedback.js - old file can be safely deleted.

### Recommended Priority

1. **IMMEDIATE:** Delete `audio-feedback.js` (safe, no imports)
2. **HIGH:** Migrate ElevenLabs TTS to class-based implementation
3. **TESTING:** Comprehensive testing of voice interaction pipeline

---

## Voice Gateway Refactoring Status

**Analysis Date:** December 22, 2025

**Summary:** Analysis of voice gateway refactoring from monolithic to modular architecture.

### Refactoring Progress: ~80% Complete

**Completed Migrations:**
- Logger moved to `util/` (20+ files updated)
- AudioUtils moved to `audio/` (3 files updated)
- BackgroundTranscriber replaced with VoiceInteractionOrchestrator
- BeepUtil class created and integrated (3 files)
- New directory structure: `ai/`, `audio/`, `services/`, `wake-word/`
- Tool system refactored (ToolRegistry, ToolExecutor, individual tools)

**In Progress:**
- ElevenLabsTTS class created but not integrated
- Streaming TTS still in root directory
- Piper TTS still in root directory

**Not Started:**
- audio-feedback.js evaluation (keep vs migrate to BeepUtil)
- Final cleanup of git-deleted files

### New Directory Structure

```
apps/voice-gateway-oww/src/
├── ai/           # AI routing logic
├── audio/        # Audio processing (AudioUtils, VoiceActivityDetector)
├── services/     # High-level orchestration (VoiceInteractionOrchestrator)
├── wake-word/    # Wake word state management (DetectorStateManager)
├── tools/        # Individual tool implementations
└── util/         # Utilities (Logger, BeepUtil, OpenWakeWordDetector)
```

### Key Learnings

- Class-based implementations are ~50% more concise
- Module-level singletons replaced with dependency injection
- XState v5 for state machine management
- No breaking changes - all identified duplicates have clear migration paths

---

**This archive README is the ONLY file preserved in docs/archive/.**
**All other historical documentation has been summarized above and deleted to reduce repository bloat.**
