# Project Context

## Purpose

This is a **multi-module CodeMash presentation project** demonstrating local AI-powered home automation using voice commands, MQTT device communication, and local LLM inference.

**Presentation Date:** January 12, 2026

**Key Demonstration Goals:**
1. Show local-first AI architecture (Ollama) for privacy and offline capability
2. Demonstrate dual MQTT integration approaches (custom tools vs MCP server)
3. Live voice-controlled home automation with Z-Wave devices
4. Highlight the difference between rapid prototyping and production architecture

## Project Conventions

### Important Constraints

**JavaScript Only - NO TypeScript**
- Project was converted from TypeScript to JavaScript for simplicity
- This is a hard constraint enforced across all modules
- See CLAUDE.md Section 0 for detailed rules

**Local-First Architecture**
- Minimize cloud dependencies (except ElevenLabs TTS and Auth0)
- All AI processing must work offline (Ollama)
- MQTT broker is local network only
- Z-Wave is local radio (not even WiFi)
- See `docs/EXTERNAL-INTEGRATIONS.md` for network dependency details

**Presentation Stability**
- Demo must work reliably on January 12, 2026
- Fallback plans required for all network-dependent features
- Test demo script 10+ times before presentation

**No Long-Running Commands in CLI**
- NEVER run server commands like `npm run dev`, `npm start`, `next dev`
- User runs these manually in their own terminal for control/monitoring
- See CLAUDE.md Section 1 for complete list

**Performance Requirements**
- Voice response pipeline: Target <7 seconds (wake word → spoken response)
- Wake word detection: <100ms latency
- Transcription: <2 seconds with ggml-tiny.bin
- AI inference: <2 seconds with qwen2.5:0.5b warm
- See `docs/TECH-STACK.md` for model recommendations and benchmarks

### Code Style Principles

**Modern JavaScript Patterns:**
- Classes: Use ES6 classes with private fields (`#field`)
- Async: Always use async/await (no promise chains)
- Imports: ES6 modules only (no CommonJS)
- Destructuring: Use for function parameters and imports
- Arrow Functions: Prefer for callbacks
- Optional Chaining: Use `?.` and `??` for null safety
- Constants: Named constants for magic numbers with explanatory comments

**Naming Conventions:**
- Variables/Functions: camelCase (`audioBuffer`, `processChunk`)
- Classes: PascalCase (`AudioPlayer`, `VoiceGateway`)
- Constants: UPPER_SNAKE_CASE (`SAMPLE_RATE`, `CHUNK_SIZE`)
- Files: kebab-case (`audio-utils.js`, `voice-gateway.js`)
- Boolean Variables: Prefix with `is`, `has`, `should` (`isRecording`, `hasSpoken`)

**Error Handling:**
- Always use try/catch for async operations
- Log errors with context using structured logging
- Use `errMsg()` utility for consistent error formatting
- Never swallow errors silently
- Provide fallback behavior where appropriate

See `docs/TECH-STACK.md` for complete coding standards, patterns, and examples.

### Git Workflow

**Branching Strategy:**
- **main** - Stable, presentation-ready code
- **feature/[name]** - Feature branches for each major change
- **CRITICAL:** Never commit tasks or WIP directly to main

**Commit Convention:**
```
<type>: <description>

Types:
- feat:     New feature
- fix:      Bug fix
- docs:     Documentation changes
- test:     Adding tests
- refactor: Code refactoring
- chore:    Build/config changes
```

**Workflow:**
1. Create feature branch: `git checkout -b feature/phase-2-langchain`
2. Commit after each completed task (not during)
3. Push feature branch: `git push -u origin feature/phase-2-langchain`
4. User creates PR and merges

See CLAUDE.md Section 5 for complete git workflow rules.

## Architecture Patterns

### Module Organization
```
src/
├── audio/              # Audio processing and playback
├── ai/                 # AI client wrappers
├── services/           # Business logic services
├── tools/              # Tool executors for AI
├── tts/                # Text-to-speech
├── conversation/       # Conversation state management
├── util/               # Shared utilities
└── main.js             # Application entry point
```

### Design Principles

1. **Single Responsibility Principle** - Each class/function has one clear purpose
2. **Dependency Injection** - Pass dependencies (config, logger) to constructors
3. **Lazy Initialization** - Use getters for expensive resources (AI clients)
4. **Local-First Architecture** - All processing happens locally when possible
5. **Functional Core, Imperative Shell** - Pure functions for logic, side effects at edges

### State Management

- **XState v5** - For complex state machines (voice recording workflow)
- **Class Properties** - For service state (clients, config)
- **Singletons** - For shared resources (conversation manager, MQTT clients)
- **Local Variables** - For temporary processing state

## Domain Context

### Voice-Controlled Home Automation

This project implements a complete voice-controlled smart home system:

1. **Wake Word Detection** - "Hey Jarvis" triggers recording
2. **Speech-to-Text** - Whisper transcribes user command
3. **Intent Classification** - Pattern matching detects query type
4. **AI Processing** - Ollama/Anthropic generates response with tool calling
5. **Device Control** - MQTT commands sent to Z-Wave devices
6. **Text-to-Speech** - ElevenLabs speaks AI response
7. **Audio Feedback** - Beeps provide interaction feedback

### MQTT Device Communication

**Z-Wave Topic Format (CRITICAL - DO NOT CHANGE):**
```
zwave/[Location/]Device_Name/command_class/endpoint_0/targetValue/set
```

**Example:**
```bash
# Topic
zwave/Demo/Switch_One/switch_binary/endpoint_0/targetValue/set

# Payload
{"value": true}   # Turn ON
{"value": false}  # Turn OFF
```

**Why This Format:**
- Human-readable device names (not node IDs)
- Matches Z-Wave JS UI configuration with `nodeNames=true`
- Tested and confirmed working with actual hardware

**Command Class Mapping:**
- 37 → `switch_binary` (On/Off switches)
- 38 → `switch_multilevel` (Dimmers)
- 49 → `sensor_multilevel` (Sensors)
- 64 → `thermostat_mode` (Thermostats)

See `docs/EXTERNAL-INTEGRATIONS.md` for complete MQTT integration details.

### Voice Activity Detection (VAD)

**Critical Thresholds:**
- **Pre-roll buffer:** 300ms (capture before wake word)
- **Silence threshold:** 0.01 RMS energy (typical voice is 0.05-0.2)
- **Min speech duration:** 700ms (avoid false positives like coughs)
- **Trailing silence:** 1500ms (pause before stopping recording)
- **Max utterance:** 10000ms (prevent infinite recording)
- **Grace period:** 1200ms (allow user to start speaking after wake word)

## Technology Stack

### Core Technologies

- **Language:** JavaScript (ES6+) - **NEVER TypeScript**
- **Runtime:** Node.js (managed via NVM)
- **AI/LLM:** Ollama (local, primary) / Anthropic Claude API (alternative)
- **Framework:** Next.js 14+ with App Router (oracle module)
- **Voice:** OpenWakeWord, Whisper, ElevenLabs TTS
- **Home Automation:** MQTT.js, zwave-js-ui
- **State:** XState v5
- **Testing:** Jest + React Testing Library

### Application Modules

- `apps/oracle/` - Next.js + LangChain web UI (main app, not currently active)
- `apps/voice-gateway-oww/` - Voice command service with OpenWakeWord (primary focus)
- `apps/zwave-mcp-server/` - Z-Wave MCP server for device control

### Performance-Optimized Models

**Voice Gateway:** `qwen2.5:0.5b` (optimized for speed, ~1s warm inference)
**Oracle App:** `qwen2.5:3b` or larger (optimized for accuracy)
**Whisper:** `ggml-tiny.bin` (~1.5s transcription, good for clear speech)

See `docs/TECH-STACK.md` for complete model recommendations, benchmarks, and rationale.

## External Dependencies

### Cloud Services (Internet Required)

1. **ElevenLabs API** (Text-to-Speech)
   - Required for voice output during demo
   - Fallback: Set `TTS_ENABLED=false` to disable
   - Risk: Network failure = no spoken responses

2. **Anthropic API** (Optional AI Provider)
   - Alternative to Ollama for AI processing
   - Fallback: Use Ollama (local, no internet needed)

### Local Services (No Internet Required)

1. **Ollama** (Local LLM Inference)
   - Port: 11434 (HTTP API)
   - Pre-download models before demo

2. **HiveMQ MQTT Broker** (Device Communication)
   - MQTT Port: 31883, WebSocket: 30000
   - Auth: Anonymous (demo mode - TECH DEBT)

3. **zwave-js-ui** (Z-Wave Device Management)
   - Integration via MQTT with `nodeNames=true`

See `docs/EXTERNAL-INTEGRATIONS.md` for complete configuration details.

## Project Status

### Current Phase

**Refactoring Phase** - Preparing for code quality improvements before presentation

### Recent Work (CRAZY_REFACTOR branch)

- ✅ Converted codebase from TypeScript to JavaScript
- ✅ Refactored AI clients to class-based architecture
- ✅ Updated to XState v5 API
- ✅ Fixed TTS integration
- ✅ Added ElevenLabs TTS support
- ✅ Optimized for Raspberry Pi 5 performance

### Known Technical Debt

<<<<<<< HEAD
**Recently Resolved (refactor-code-quality-improvements):**
- ~~Magic numbers without context~~ - RESOLVED: Constants extracted to `timing.js` and `thresholds.js`
- ~~Duplicate code patterns (query detection)~~ - RESOLVED: IntentClassifier service created
- ~~TODO comments~~ - RESOLVED: All TODOs resolved or documented
- ~~File organization~~ - RESOLVED: Docs and scripts moved to dedicated directories

**Remaining (acceptable for presentation):**
- Monolithic functions (setupMic - 400+ lines) - KEPT: Refactoring deemed too risky before demo
- Anonymous MQTT authentication (should use RBAC) - DEFERRED: Not critical for demo
- Large files (AnthropicClient, VoiceInteractionOrchestrator) - ACCEPTABLE: Working well, no issues

### Next Steps

**Before Presentation (January 12, 2026):**
1. Test all demo modes (offline, online, hybrid-a, hybrid-b)
2. Verify voice gateway end-to-end flow (wake word → response)
3. Test device control commands with actual Z-Wave devices
4. Practice demo script 10+ times
5. Prepare fallback plans for network-dependent features

**Post-Presentation (Optional Improvements):**
1. Implement MQTT RBAC authentication
2. Consider refactoring setupMic() if time permits
3. Add comprehensive test coverage
4. Performance profiling for optimization opportunities
=======
- God classes (BackgroundTranscriber, AudioUtils)
- Monolithic functions (setupMic - 157 lines)
- Duplicate code patterns (query detection, tool execution)
- Magic numbers without context
- Anonymous MQTT authentication (should use RBAC)
- Mixed abstraction levels in utilities

### Next Steps

1. Create OpenSpec change proposals for refactoring
2. Split BackgroundTranscriber into focused services
3. Refactor main.js setupMic() function
4. Organize AudioUtils.js into focused modules
5. Test refactored code with actual hardware
6. Merge to main when stable
>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)

## Presentation Strategy

### Demo Flow (10 minutes)

**Part 1:** Custom MQTT tool (5 min)
- Live coding a simple MQTT tool (~15 lines)
- Show: User request → Tool call → Device responds
- Highlight limitations: code duplication, no reusability

**Part 2:** MCP Server architecture (5 min)
- Introduce TypeScript MCP server
- Demo same functionality with better architecture
- Show: MCP Inspector, Claude Desktop integration
- Emphasize: Separation of concerns, reusability

### Key Messages

- Local AI (Ollama) = Privacy + Offline capability
- Custom tools = Quick prototyping
- MCP servers = Production architecture
- JavaScript simplicity vs TypeScript safety tradeoffs

## Documentation Structure

### Primary Documentation

- `CLAUDE.md` - AI assistant guidelines and project rules
- `README.md` - Project overview and quick start
- `docs/GETTING-STARTED.md` - Detailed setup instructions
- `docs/TECH-STACK.md` - Technology stack reference
- `docs/EXTERNAL-INTEGRATIONS.md` - Integration patterns
- `docs/DEPLOYMENT.md` - Production deployment guide
- `openspec/project.md` - This file (project context for OpenSpec)

### Troubleshooting Guides

- `docs/voice-gateway-troubleshooting.md` - Voice gateway debugging
- `docs/performance-analysis.md` - Performance optimization tips
- `docs/optimization-summary.md` - Model selection and benchmarks

### Module-Specific

- `apps/voice-gateway-oww/README.md` - Voice gateway architecture
- `apps/zwave-mcp-server/README.md` - Z-Wave MQTT integration

See CLAUDE.md "Documentation Index" section for complete listing.
