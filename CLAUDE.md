<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# Claude Code Guidelines for MQTT + Ollama Home Automation

## Project Overview

<<<<<<< HEAD
<<<<<<< HEAD
**Multi-module CodeMash presentation** demonstrating local AI-powered home automation using Next.js, LangChain.js, Ollama, MQTT, Z-Wave devices, and Auth0.
=======
This is a **multi-module CodeMash presentation project** demonstrating local AI-powered home automation using:

- Next.js with LangChain.js and Ollama
- MQTT for device communication
- zwave-js-ui for Z-Wave device control
- SQLite for local database storage
- Auth0 for authentication
>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)
=======
**Multi-module CodeMash presentation** demonstrating local AI-powered home automation using Next.js, LangChain.js, Ollama, MQTT, Z-Wave devices, and Auth0.
>>>>>>> aeee250 (In a working state with the device list working)

**Presentation Date:** January 12, 2026

**Project Structure:**
```
mqtt-ollama-presentation/
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> aeee250 (In a working state with the device list working)
├── docs/           # All documentation
├── apps/
│   ├── oracle/              # Next.js + LangChain
│   ├── voice-gateway-oww/   # Voice command service
│   └── zwave-mcp-server/    # Z-Wave MCP server
└── openspec/       # Change proposals
<<<<<<< HEAD
=======
├── docs/                      # Project documentation
│   ├── TECH-STACK.md          # Technology stack reference
│   ├── EXTERNAL-INTEGRATIONS.md  # Integration guide
│   ├── DEPLOYMENT.md          # Deployment guide
│   ├── GETTING-STARTED.md     # Setup instructions
│   └── tasks.md               # Implementation task list
├── apps/                      # All application modules
│   ├── oracle/                # Next.js + LangChain module (main app)
│   ├── voice-gateway-oww/     # Voice command service
│   └── zwave-mcp-server/      # Z-Wave MCP server
├── openspec/                  # OpenSpec change proposals
│   └── project.md             # Project context for OpenSpec
├── CLAUDE.md                  # This file (AI assistant guidelines)
└── README.md                  # Project overview
>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)
=======
>>>>>>> aeee250 (In a working state with the device list working)
```

---

## Critical Rules

### 1. JavaScript Only - NO TypeScript

**🚫 Forbidden:** `.ts`/`.tsx` files, type annotations, TypeScript-specific syntax

**✅ Required:** `.js`/`.jsx` files, plain ES6+ JavaScript, JSDoc for docs (optional)

**Why:** Converted to JavaScript for simplicity.

### 2. Never Run Server Commands

**DON'T run:** `npm run dev`, `npm start`, `next dev`, `node server.js`, or any long-running process

**User runs these manually** in their own terminal for control.

**Exceptions OK:** `npm install`, `npm run build`, `npm test`, `npm run lint`, one-time scripts

### 3. Local-First Architecture

**Minimize cloud dependencies.** All AI processing, device control, and data storage happen locally.

**Network dependencies** (Auth0, ElevenLabs TTS, model downloads) must be documented in `docs/network-dependencies.md` with rationale and fallback plans.

**Principle:** Local processing > Cloud | Offline-capable > Internet-required | Demo reliability > Feature complexity

### 4. Task & Change Management

**For new features/changes:** Use OpenSpec workflow (see `openspec/AGENTS.md`)

**For task tracking:** Update `docs/tasks.md` with status indicators (⏳ Not Started, 🔄 In Progress, ✅ Completed)

### 5. Git Workflow

**Never commit to `main`** - Always use feature branches

```bash
git checkout -b feature/your-feature-name
git add .
git commit -m "feat: your changes"  # Use: feat|fix|docs|test|refactor|chore
git push -u origin feature/your-feature-name
```

User merges via PR.

### 6. Keep Documentation in Sync

**Update these when making changes:**
- `README.md` - User-facing changes
- `docs/TECH-STACK.md` - Technology changes
- `docs/EXTERNAL-INTEGRATIONS.md` - Integration changes
- `docs/DEPLOYMENT.md` - Deployment changes
- `docs/tasks.md` - ALWAYS update for completed tasks
- `docs/network-dependencies.md` - New network dependencies
<<<<<<< HEAD

---

## Quick Reference

### Key Technologies

<<<<<<< HEAD
See **[docs/TECH-STACK.md](docs/TECH-STACK.md)** for complete details:
- **Models:** Ollama `qwen2.5:0.5b` (voice), `qwen2.5:3b` (oracle), Whisper `ggml-tiny.bin`
- **Stack:** Next.js, LangChain.js, MQTT, Z-Wave, Auth0, ElevenLabs TTS
- **Testing:** Jest + React Testing Library

### Demo Modes (Voice Gateway)

The voice gateway supports **4 configuration-driven demo modes** with independent AI and TTS provider selection:

- **Offline:** Ollama + Piper (no internet required)
- **Online:** Anthropic + ElevenLabs (best quality)
- **Hybrid A:** Ollama + ElevenLabs (local AI + cloud TTS)
- **Hybrid B:** Anthropic + Piper (cloud AI + local TTS)

**Important for AI assistants:**
- Provider selection is **configuration-driven** (no code changes)
- Never hardcode AI or TTS provider choices
- Respect `AI_PROVIDER` and `TTS_PROVIDER` environment variables
- See `apps/voice-gateway-oww/.env.example` for all provider options

### Integrations

See **[docs/EXTERNAL-INTEGRATIONS.md](docs/EXTERNAL-INTEGRATIONS.md)** for Z-Wave, MQTT, Auth0, Ollama config.

**🚨 CRITICAL:** Don't change Z-Wave MQTT topic format:
=======
**When making changes, update:**

- `README.md` if user-facing changes
- `docs/TECH-STACK.md` if technology stack changes
- `docs/EXTERNAL-INTEGRATIONS.md` if integration patterns change
- `docs/DEPLOYMENT.md` if deployment procedures change
- `docs/tasks.md` ALWAYS for completed tasks
- `docs/questions.md` when decisions are made
- `docs/network-dependencies.md` when adding network/internet dependencies

---

### 7. Network Dependencies

**ALL network/internet dependencies must be documented and justified**

This project prioritizes **local-first architecture** - all AI processing, device control, and data storage happens locally without cloud dependencies (except for Auth0 authentication and ElevenLabs TTS).

**📍 Central Documentation:** `docs/network-dependencies.md`

**When adding ANY code that requires network access:**

1. **Check if it's truly necessary**
   - Can this be done locally instead?
   - Is there a local-first alternative?

2. **Document in `docs/network-dependencies.md`**
   - What service/endpoint is accessed?
   - Why is network access required?
   - What is the mitigation if network fails?
   - Is it required during demo or just setup?

3. **Defend the decision**
   - Every network dependency must have a clear rationale
   - Consider impact on demo reliability
   - Document backup plan for network failures

**Current network dependencies:**

- ☁️ **Auth0** - Authentication (internet required during demo)
- ☁️ **ElevenLabs TTS** - Text-to-speech (internet required, fallback: disable)
- 🔽 **Ollama models** - One-time download (pre-cache before demo)
- 📦 **npm packages** - One-time install (pre-install before demo)
- 🏠 **MQTT broker** - Local network only
- 🤖 **Ollama runtime** - Local network only
- 📡 **Z-Wave devices** - Local radio (not even WiFi)

**Design principle:**

- ✅ Local processing > Cloud processing
- ✅ Offline-capable > Internet-required
- ✅ Demo reliability > Feature complexity

See `docs/network-dependencies.md` for complete list and rationale.
=======
>>>>>>> aeee250 (In a working state with the device list working)

---

## Quick Reference

### Key Technologies

See **[docs/TECH-STACK.md](docs/TECH-STACK.md)** for complete details:
- **Models:** Ollama `qwen2.5:0.5b` (voice), `qwen2.5:3b` (oracle), Whisper `ggml-tiny.bin`
- **Stack:** Next.js, LangChain.js, MQTT, Z-Wave, Auth0, ElevenLabs TTS
- **Testing:** Jest + React Testing Library

### Demo Modes (Voice Gateway)

The voice gateway supports **4 configuration-driven demo modes** with independent AI and TTS provider selection:

- **Offline:** Ollama + Piper (no internet required)
- **Online:** Anthropic + ElevenLabs (best quality)
- **Hybrid A:** Ollama + ElevenLabs (local AI + cloud TTS)
- **Hybrid B:** Anthropic + Piper (cloud AI + local TTS)

**Important for AI assistants:**
- Provider selection is **configuration-driven** (no code changes)
- Never hardcode AI or TTS provider choices
- Respect `AI_PROVIDER` and `TTS_PROVIDER` environment variables
- See `apps/voice-gateway-oww/.env.example` for all provider options

### Integrations

See **[docs/EXTERNAL-INTEGRATIONS.md](docs/EXTERNAL-INTEGRATIONS.md)** for Z-Wave, MQTT, Auth0, Ollama config.

<<<<<<< HEAD
**📚 [docs/EXTERNAL-INTEGRATIONS.md](docs/EXTERNAL-INTEGRATIONS.md)**

**🚨 CRITICAL:** Z-Wave MQTT topic format must NOT be changed:
>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)
=======
**🚨 CRITICAL:** Don't change Z-Wave MQTT topic format:
>>>>>>> aeee250 (In a working state with the device list working)
```
zwave/[Location/]Device_Name/command_class/endpoint_0/targetValue/set
```

<<<<<<< HEAD
<<<<<<< HEAD
### Deployment

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for systemd setup and service management.

Quick logs:
```bash
journalctl -u oracle.service -f
=======
This format is tested and working with actual hardware. See the integration guide for complete details.

=======
>>>>>>> aeee250 (In a working state with the device list working)
### Deployment

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for systemd setup and service management.

Quick logs:
```bash
journalctl -u oracle.service -f
<<<<<<< HEAD

# Voice Gateway service
systemctl status voice-gateway-oww.service
>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)
=======
>>>>>>> aeee250 (In a working state with the device list working)
journalctl -u voice-gateway-oww.service -f
```

---

<<<<<<< HEAD
<<<<<<< HEAD
## Pre-Commit Checklist

- [ ] JavaScript only (no `.ts`/`.tsx` files)
- [ ] Tests pass, no console errors
- [ ] Documentation updated (`docs/tasks.md` always!)
=======
## Summary Checklist

Before committing code, verify:

- [ ] All tests pass
- [ ] No console.errors or warnings
- [ ] Code uses JavaScript only (no .ts or .tsx files)
- [ ] Updated docs/tasks.md
- [ ] Updated relevant documentation
>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)
=======
## Pre-Commit Checklist

- [ ] JavaScript only (no `.ts`/`.tsx` files)
- [ ] Tests pass, no console errors
- [ ] Documentation updated (`docs/tasks.md` always!)
>>>>>>> aeee250 (In a working state with the device list working)
- [ ] No secrets in code
- [ ] Feature branch (not `main`)
- [ ] Conventional commit message

**Pre-Deploy:**
- [ ] `npm run build` succeeds
- [ ] Service files have correct paths
- [ ] All environment variables set
<<<<<<< HEAD

<<<<<<< HEAD
---

## Documentation Index

**For AI:** `CLAUDE.md` (this file), `openspec/project.md`

**For Developers:** `README.md`, `docs/GETTING-STARTED.md`, `docs/TECH-STACK.md`, `docs/EXTERNAL-INTEGRATIONS.md`, `docs/DEPLOYMENT.md`

**Troubleshooting:** `docs/voice-gateway-troubleshooting.md`, `docs/performance-analysis.md`, `docs/optimization-summary.md`

**Modules:** `apps/voice-gateway-oww/README.md`, `apps/zwave-mcp-server/README.md`

**Remember:** This is a presentation project - code quality, demo reliability, and documentation are equally important!
=======
- [ ] Run `npm run build` successfully
- [ ] Verify correct directory paths in systemd service file
- [ ] Test service starts and runs successfully
- [ ] Check logs for errors
- [ ] All environment variables configured correctly

**Remember:** This project is for a presentation. Code quality, demo reliability, and documentation are equally important!
=======
>>>>>>> aeee250 (In a working state with the device list working)

---

## Documentation Index

**For AI:** `CLAUDE.md` (this file), `openspec/project.md`

**For Developers:** `README.md`, `docs/GETTING-STARTED.md`, `docs/TECH-STACK.md`, `docs/EXTERNAL-INTEGRATIONS.md`, `docs/DEPLOYMENT.md`

**Troubleshooting:** `docs/voice-gateway-troubleshooting.md`, `docs/performance-analysis.md`, `docs/optimization-summary.md`

**Modules:** `apps/voice-gateway-oww/README.md`, `apps/zwave-mcp-server/README.md`

<<<<<<< HEAD
### Module-Specific
- **apps/voice-gateway-oww/README.md** - Voice gateway architecture
- **apps/zwave-mcp-server/README.md** - Z-Wave MQTT integration

### Getting Help

**When stuck:**

1. Check docs/tasks.md for related tasks
2. Review appropriate documentation (TECH-STACK, EXTERNAL-INTEGRATIONS, DEPLOYMENT)
3. Search official documentation (links in docs/TECH-STACK.md)
4. Check GitHub issues for similar problems
5. Ask clarifying questions in docs/questions.md

**Before asking for help:**

- Describe what you tried
- Include error messages
- Specify which module/file
- Note your environment (OS, Node version, etc.)
>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)
=======
**Remember:** This is a presentation project - code quality, demo reliability, and documentation are equally important!
>>>>>>> aeee250 (In a working state with the device list working)
