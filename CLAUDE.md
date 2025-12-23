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

**Multi-module CodeMash presentation** demonstrating local AI-powered home automation using Next.js, LangChain.js, Ollama, MQTT, Z-Wave devices, and Auth0.

**Presentation Date:** January 12, 2026

**Project Structure:**
```
mqtt-ollama-presentation/
├── docs/           # All documentation
├── apps/
│   ├── oracle/              # Next.js + LangChain
│   ├── voice-gateway-oww/   # Voice command service
│   └── zwave-mcp-server/    # Z-Wave MCP server
└── openspec/       # Change proposals
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

---

## Quick Reference

### Key Technologies

See **[docs/TECH-STACK.md](docs/TECH-STACK.md)** for complete details:
- **Models:** Ollama `qwen2.5:0.5b` (voice), `qwen2.5:3b` (oracle), Whisper `ggml-tiny.bin`
- **Stack:** Next.js, LangChain.js, MQTT, Z-Wave, Auth0, ElevenLabs TTS
- **Testing:** Jest + React Testing Library

### Integrations

See **[docs/EXTERNAL-INTEGRATIONS.md](docs/EXTERNAL-INTEGRATIONS.md)** for Z-Wave, MQTT, Auth0, Ollama config.

**🚨 CRITICAL:** Don't change Z-Wave MQTT topic format:
```
zwave/[Location/]Device_Name/command_class/endpoint_0/targetValue/set
```

### Deployment

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for systemd setup and service management.

Quick logs:
```bash
journalctl -u oracle.service -f
journalctl -u voice-gateway-oww.service -f
```

---

## Pre-Commit Checklist

- [ ] JavaScript only (no `.ts`/`.tsx` files)
- [ ] Tests pass, no console errors
- [ ] Documentation updated (`docs/tasks.md` always!)
- [ ] No secrets in code
- [ ] Feature branch (not `main`)
- [ ] Conventional commit message

**Pre-Deploy:**
- [ ] `npm run build` succeeds
- [ ] Service files have correct paths
- [ ] All environment variables set

---

## Documentation Index

**For AI:** `CLAUDE.md` (this file), `openspec/project.md`

**For Developers:** `README.md`, `docs/GETTING-STARTED.md`, `docs/TECH-STACK.md`, `docs/EXTERNAL-INTEGRATIONS.md`, `docs/DEPLOYMENT.md`

**Troubleshooting:** `docs/voice-gateway-troubleshooting.md`, `docs/performance-analysis.md`, `docs/optimization-summary.md`

**Modules:** `apps/voice-gateway-oww/README.md`, `apps/zwave-mcp-server/README.md`

**Remember:** This is a presentation project - code quality, demo reliability, and documentation are equally important!
