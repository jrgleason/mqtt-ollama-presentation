# Documentation Index

**Last Updated:** 2025-10-23

Use this guide to navigate project documentation. Each section links to detailed guides organized by topic.

---

## Quick Start

**New to the project? Start here:**

1. **[GETTING-STARTED][getting-started]** - Step-by-step setup from blank machine to working demo
2. **[SETUP][setup]** - Comprehensive setup guide for all services (Raspberry Pi, MQTT, Z-Wave, Oracle, Voice Gateway)
3. **[requirements][requirements]** - Project requirements and specifications
4. **[tasks][tasks]** - Current implementation status and task tracking

---

## Core Documentation

### Project Guidelines
- **[CLAUDE.md][claude]** - AI assistant guidelines and project rules (in root directory)
- **[project.md][project]** - Project context for OpenSpec workflow
- **[repository-guidelines][repo-guidelines]** - Coding standards and conventions
- **[requirements][requirements]** - Project requirements and specifications
- **[network-dependencies][network-deps]** - Network dependencies and local-first architecture

### Technology & Integration Reference
- **[TECH-STACK][tech-stack]** - Technology stack reference (models, coding standards, patterns)
- **[EXTERNAL-INTEGRATIONS][integrations]** - Integration guide (Z-Wave, MQTT, Auth0, Ollama)
- **[DEPLOYMENT][deploy]** - Production deployment guide (systemd services, troubleshooting)

### Architecture
- **[ARCHITECTURE][arch]** - Complete system architecture: components, MQTT, AI, data flow
- **[mcp-architecture][mcp-arch]** - Model Context Protocol integration details
- **[performance-optimization][perf-opt]** - Performance tuning for Raspberry Pi

### Complete Setup Guide
- **[SETUP][setup]** - Comprehensive setup guide covering:
  - Raspberry Pi 5 hardware setup
  - MQTT broker (HiveMQ/Mosquitto)
  - Z-Wave JS UI quick setup (see [zwave-setup-guide][zwave-setup] for details)
  - ALSA audio setup
  - Oracle app with systemd
  - Voice Gateway with systemd
  - Z-Wave MCP server
  - Testing and validation
  - Troubleshooting
  - Production security

---

## Service-Specific Docs

### Oracle (Next.js + LangChain)
- **[Oracle README][oracle-readme]** - Main Oracle app documentation

### Voice Gateway OWW
- **[Voice Gateway README][voice-readme]** - Main voice gateway documentation
- **[voice-gateway-quickstart][voice-quickstart]** - Quick setup guide
- **[voice-gateway-troubleshooting][voice-troubleshoot]** - Platform-specific diagnostics

### Z-Wave MCP Server
- **[Z-Wave MCP README][zwave-mcp-readme]** - MCP server documentation

---

## Reference & Research

### Voice & Audio
- **[voice-asr-technologies][voice-asr]** - ASR technologies explained: Whisper.cpp, ElevenLabs, Piper, Ultravox, hardware/cost tradeoffs
- **[openwakeword-guide][openwakeword]** - OpenWakeWord integration, setup, and custom training

### Z-Wave Setup
- **[zwave-setup-guide][zwave-setup]** - Complete Z-Wave setup: zwave-js-ui, devices, MQTT

### MCP Integration
- **[mcp-architecture][mcp-arch]** - MCP integration architecture

---

## Planning & Research

- **[tasks][tasks]** - Current task tracking and sprint planning
- **[notes][notes]** - Research notes, model selection, benchmarks, Z-Wave MCP findings (comprehensive, kept as single file)
- **[outline][outline]** - Presentation structure and slides

---

## Troubleshooting

For troubleshooting help, see:
- **[voice-gateway-troubleshooting][voice-troubleshoot]** - Voice gateway diagnostics (macOS & Linux)
- **[SETUP][setup]** - Comprehensive troubleshooting section covering all services

---

## Supporting Materials

### Hardware
- **[hardware/design][hw-design]** - Hardware design and wiring
- **[hardware/requirements][hw-requirements]** - Component requirements

### Prompts & Experiments
- **[prompts/][prompts]** - Prompt engineering experiments for presentation

---

## Archived Documentation

**Historical documentation** has been moved to **[archive/][archive]** for reference:
- Old implementation summaries
- Superseded setup guides
- CI/build fix reports
- Technology comparison docs (for decisions already made)

See **[archive/README][archive-readme]** for complete index.

---

## Directory Structure

```
docs/
├── README.md                       # This file - navigation index
├── GETTING-STARTED.md              # Quick start guide
│
├── TECH-STACK.md                   # Technology stack reference
├── EXTERNAL-INTEGRATIONS.md        # Integration guide (Z-Wave, MQTT, Auth0, Ollama)
├── DEPLOYMENT.md                   # Production deployment guide
│
├── ARCHITECTURE.md                 # Complete system architecture
├── SETUP.md                        # Comprehensive setup guide (all services)
├── mcp-architecture.md             # MCP integration details
├── PERFORMANCE.md                  # Performance guide (consolidated)
│
├── tasks.md                        # Current sprint and task tracking
├── requirements.md                 # Project specifications
├── repository-guidelines.md        # Coding standards
├── network-dependencies.md         # Local-first architecture
│
├── zwave-setup-guide.md            # Complete Z-Wave guide
├── voice-asr-technologies.md       # ASR tech comparison (Whisper, Ultravox, ElevenLabs, Piper)
├── openwakeword-guide.md           # OpenWakeWord consolidated
│
├── notes.md                        # Research & Z-Wave MCP findings (comprehensive)
├── outline.md                      # Presentation slides
│
├── hardware/                       # Hardware docs
├── prompts/                        # Prompt experiments
└── archive/
    └── README.md                   # Comprehensive historical summary
```

**Recent Consolidations:**
- CLAUDE.md & project.md - Consolidated and streamlined (December 2025)
  - CLAUDE.md: 1426 to 367 lines (74% reduction)
  - project.md: 416 to 321 lines (23% reduction)
  - Created 3 new reference docs: TECH-STACK.md, EXTERNAL-INTEGRATIONS.md, DEPLOYMENT.md
  - Eliminated duplication while maintaining single source of truth
- 5 setup guides consolidated into 1 `SETUP.md` (Pi, MQTT, ALSA, Oracle, Voice Gateway)
  - `zwave-setup-guide.md` kept separate due to complexity (453 lines)
  - SETUP.md references zwave-setup-guide.md for detailed Z-Wave instructions
- 3 architecture docs consolidated into 1 `ARCHITECTURE.md`
- 2 OpenWakeWord docs consolidated into 1 `openwakeword-guide.md`
- 3 Z-Wave docs consolidated into 1 `zwave-setup-guide.md` (device pairing, MQTT config, troubleshooting)
- Voice diagnostics consolidated into `apps/voice-gateway-oww/docs/DEVELOPER_GUIDE.md`
- Z-Wave MCP findings added to `notes.md`
- Archive consolidated into single comprehensive `README.md`
- Removed: delivered.md, fix summaries, old analysis docs

---

## Finding What You Need

**For setup and configuration:**
- Start with `GETTING-STARTED.md`
- Then service-specific READMEs in `/apps/`

**For understanding architecture:**
- Start with `ARCHITECTURE.md` (complete system overview)
- Then `mcp-architecture.md` for MCP details
- Check `PERFORMANCE.md` for Pi tuning

**For development:**
- Follow `repository-guidelines.md`
- Check `tasks.md` for current work
- Review `/CLAUDE.md` for complete guidelines

**For troubleshooting:**
- Check `apps/voice-gateway-oww/docs/DEVELOPER_GUIDE.md` for voice issues
- Review `alsa-setup.md` for audio problems
- Search `notes.md` for research and solutions
- Check `archive/README.md` for historical bug fixes

**Can't find it?**
```bash
# Search all docs
rg --files docs | grep -i keyword

# Search content
rg "search term" docs/
```

---

**Presentation Date:** January 12, 2026
**Project:** MQTT + Ollama Home Automation Demo

<!-- Links -->
[getting-started]: GETTING-STARTED.md
[setup]: SETUP.md
[requirements]: requirements.md
[tasks]: tasks.md
[claude]: /CLAUDE.md
[project]: /openspec/project.md
[repo-guidelines]: repository-guidelines.md
[network-deps]: network-dependencies.md
[tech-stack]: TECH-STACK.md
[integrations]: EXTERNAL-INTEGRATIONS.md
[deploy]: DEPLOYMENT.md
[arch]: ARCHITECTURE.md
[mcp-arch]: mcp-architecture.md
[perf-opt]: PERFORMANCE.md
[zwave-setup]: zwave-setup-guide.md
[oracle-readme]: /apps/oracle/README.md
[voice-readme]: /apps/voice-gateway-oww/README.md
[voice-dev-guide]: /apps/voice-gateway-oww/docs/DEVELOPER_GUIDE.md
[zwave-mcp-readme]: /apps/zwave-mcp-server/README.md
[voice-asr]: voice-asr-technologies.md
[openwakeword]: openwakeword-guide.md
[notes]: notes.md
[outline]: outline.md
[hw-design]: hardware/design.md
[hw-requirements]: hardware/requirements.md
[prompts]: prompts/
[archive]: archive/
[archive-readme]: archive/README.md
