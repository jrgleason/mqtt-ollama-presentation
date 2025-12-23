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

This is a **multi-module CodeMash presentation project** demonstrating local AI-powered home automation using:

- Next.js with LangChain.js and Ollama
- MQTT for device communication
- zwave-js-ui for Z-Wave device control
- SQLite for local database storage
- Auth0 for authentication

**Presentation Date:** January 12, 2026

---

## Important Project Rules

### 0. JavaScript Only - NO TypeScript!

**🚫 CRITICAL RULE: NEVER USE TYPESCRIPT IN THIS PROJECT 🚫**

**Absolutely forbidden:**

- ❌ NO `.ts` or `.tsx` files
- ❌ NO type annotations (`: string`, `: number`, etc.)
- ❌ NO TypeScript interfaces or types
- ❌ NO `tsconfig.json` files
- ❌ NO TypeScript-specific syntax

**Always use:**

- ✅ JavaScript files (`.js` and `.jsx` only)
- ✅ Plain ES6+ JavaScript
- ✅ Zod for runtime validation (instead of TypeScript types)
- ✅ JSDoc comments for documentation (optional)

**Why:** This project has been converted to pure JavaScript for simplicity and to avoid TypeScript overhead.

---

### 1. Server Commands

**NEVER run server commands like:**

- `npm run dev`
- `npm start`
- `next dev`
- `node server.js`
- Any command that starts a long-running server process

**Why:** These should be run manually by the user in their own terminal so they can control and monitor the server.

**Exceptions:** You MAY run:

- `npm install` or package installation
- `npm run build` for production builds
- `npm test` for running tests
- `npm run lint` for code quality checks
- One-time scripts that complete quickly

---

### 2. Web Research

**ALWAYS use Playwright MCP instead of WebFetch for web research.**

**Why:** Playwright provides better access and avoids permission issues that WebFetch sometimes encounters.

**Example usage:**

```javascript
// Good ✅
await mcp__playwright__browser_navigate({url: "https://nextjs.org/docs"});
await mcp__playwright__browser_snapshot();

// Avoid ❌
await WebFetch({url: "https://nextjs.org/docs", prompt: "..."});
```

---

### 3. Multi-Module Project Structure

This is a **multi-module repository** with the following structure:

```
mqtt-ollama-presentation/
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
```

**Important:**

- Each module may have its own `package.json` and dependencies
- Always specify which module you're working in
- Use relative paths appropriately for each module

---

### 4. Task Management

**ALL tasks must be tracked in `docs/tasks.md`**

**Before starting ANY work:**

1. Check `docs/tasks.md` for the task
2. Update task status to "🔄 In Progress"
3. Complete the work
4. Update task status to "✅ Completed"
5. Update task completion count in the summary

**Task status indicators:**

- ⏳ Not Started
- 🔄 In Progress
- ✅ Completed
- ❌ Blocked
- 🎯 Stretch Goal

**After EVERY task completion, update:**

- The specific task checkbox `[x]`
- The task status symbol
- The summary section at the bottom
- Any related sub-tasks

---

### 5. Git Workflow

**NEVER check tasks into the default branch (main)**

**Workflow:**

1. Create feature branch for each phase/feature
   ```bash
   git checkout -b feature/phase-2-langchain-setup
   ```
2. Commit after each completed task (not during)
   ```bash
   git add .
   git commit -m "feat: complete task 2.1 - Next.js project initialization"
   ```
3. Push feature branch
   ```bash
   git push -u origin feature/phase-2-langchain-setup
   ```
4. User will merge via PR

**Commit message format:**

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Adding tests
- `refactor:` - Code refactoring
- `chore:` - Build/config changes

---

### 6. Documentation Updates

**Keep documentation in sync with code changes**

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

---

## Quick Reference

### Technology Stack

For detailed technology stack information, model recommendations, performance benchmarks, coding standards, and common code patterns, see:

**📚 [docs/TECH-STACK.md](docs/TECH-STACK.md)**

Key highlights:
- **JavaScript only** - NO TypeScript
- **Ollama models:** `qwen2.5:0.5b` (voice gateway, speed), `qwen2.5:3b` (oracle, accuracy)
- **Whisper models:** `ggml-tiny.bin` (speed), `ggml-base.bin` (accuracy)
- **Code patterns:** API routes, LangChain tools, MQTT subscribe
- **Testing:** Jest + React Testing Library

### External Integrations

For Z-Wave, MQTT, Auth0, Ollama configuration, and environment variables, see:

**📚 [docs/EXTERNAL-INTEGRATIONS.md](docs/EXTERNAL-INTEGRATIONS.md)**

**🚨 CRITICAL:** Z-Wave MQTT topic format must NOT be changed:
```
zwave/[Location/]Device_Name/command_class/endpoint_0/targetValue/set
```

This format is tested and working with actual hardware. See the integration guide for complete details.

### Deployment

For systemd service setup, pre-deployment checklists, common issues, and service management, see:

**📚 [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**

Quick service log commands:
```bash
# Oracle service
systemctl status oracle.service
journalctl -u oracle.service -f

# Voice Gateway service
systemctl status voice-gateway-oww.service
journalctl -u voice-gateway-oww.service -f
```

---

## Summary Checklist

Before committing code, verify:

- [ ] All tests pass
- [ ] No console.errors or warnings
- [ ] Code uses JavaScript only (no .ts or .tsx files)
- [ ] Updated docs/tasks.md
- [ ] Updated relevant documentation
- [ ] No secrets in code
- [ ] Feature branch (not main)
- [ ] Meaningful commit message
- [ ] No server commands left running

**Before deploying to production:**

- [ ] Run `npm run build` successfully
- [ ] Verify correct directory paths in systemd service file
- [ ] Test service starts and runs successfully
- [ ] Check logs for errors
- [ ] All environment variables configured correctly

**Remember:** This project is for a presentation. Code quality, demo reliability, and documentation are equally important!

---

## Documentation Index

This project has comprehensive documentation organized by purpose:

### For AI Assistants
- **CLAUDE.md** (this file) - AI assistant guidelines and project rules
- **openspec/project.md** - Project context for OpenSpec workflow

### For Developers
- **README.md** - Project overview and quick start
- **docs/GETTING-STARTED.md** - Detailed setup instructions
- **docs/TECH-STACK.md** - Technology stack reference
- **docs/EXTERNAL-INTEGRATIONS.md** - Integration patterns and configuration
- **docs/DEPLOYMENT.md** - Production deployment guide

### Troubleshooting & Optimization
- **docs/voice-gateway-troubleshooting.md** - Voice gateway debugging
- **docs/performance-analysis.md** - Performance optimization tips
- **docs/optimization-summary.md** - Model selection and benchmarks

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
