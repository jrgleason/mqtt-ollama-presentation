# Documentation Index

**Last Updated:** 2025-10-23

Use this guide to navigate project documentation. Each section links to detailed guides organized by topic.

---

## 🚀 Quick Start

**New to the project? Start here:**

1. **[GETTING-STARTED.md](GETTING-STARTED.md)** - Step-by-step setup from blank machine to working demo
2. **[SETUP.md](SETUP.md)** - Comprehensive setup guide for all services (Raspberry Pi, MQTT, Z-Wave, Oracle, Voice Gateway)
3. **[requirements.md](requirements.md)** - Project requirements and specifications
4. **[tasks.md](tasks.md)** - Current implementation status and task tracking

---

## 📚 Core Documentation

### Project Guidelines
- **[/CLAUDE.md](/CLAUDE.md)** - Complete project guidelines (in root directory)
- **[repository-guidelines.md](repository-guidelines.md)** - Coding standards and conventions
- **[requirements.md](requirements.md)** - Project requirements and specifications
- **[network-dependencies.md](network-dependencies.md)** - Network dependencies and local-first architecture

### Architecture
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Complete system architecture: components, MQTT, AI, data flow
- **[mcp-architecture.md](mcp-architecture.md)** - Model Context Protocol integration details
- **[performance-optimization.md](performance-optimization.md)** - Performance tuning for Raspberry Pi

### Complete Setup Guide
- **[SETUP.md](SETUP.md)** - 🆕 Comprehensive setup guide covering:
  - Raspberry Pi 5 hardware setup
  - MQTT broker (HiveMQ/Mosquitto)
  - Z-Wave JS UI quick setup (see zwave-setup-guide.md for details)
  - ALSA audio setup
  - Oracle app with systemd
  - Voice Gateway with systemd
  - Z-Wave MCP server
  - Testing and validation
  - Troubleshooting
  - Production security

---

## 🔧 Service-Specific Docs

### Oracle (Next.js + LangChain)
- **[/apps/oracle/README.md](/apps/oracle/README.md)** - Main Oracle app documentation

### Voice Gateway OWW
- **[/apps/voice-gateway-oww/README.md](/apps/voice-gateway-oww/README.md)** - Main voice gateway documentation
- **[voice-gateway-quickstart.md](voice-gateway-quickstart.md)** - Quick setup guide
- **[voice-gateway-troubleshooting.md](voice-gateway-troubleshooting.md)** - Platform-specific diagnostics

### Z-Wave MCP Server
- **[/apps/zwave-mcp-server/README.md](/apps/zwave-mcp-server/README.md)** - MCP server documentation

---

## 📖 Reference & Research

### Voice & Audio
- **[voice-asr-technologies.md](voice-asr-technologies.md)** - ASR technologies explained: Whisper.cpp, ElevenLabs, Piper, Ultravox, hardware/cost tradeoffs
- **[openwakeword-guide.md](openwakeword-guide.md)** - OpenWakeWord integration, setup, and custom training

### Z-Wave Setup
- **[zwave-setup-guide.md](zwave-setup-guide.md)** - Complete Z-Wave setup: zwave-js-ui, devices, MQTT

### MCP Integration
- **[mcp-architecture.md](mcp-architecture.md)** - MCP integration architecture

---

## 📋 Planning & Research

- **[tasks.md](tasks.md)** - Current task tracking and sprint planning
- **[questions.md](questions.md)** - Open questions and decisions
- **[notes.md](notes.md)** - Research notes, model selection, benchmarks, Z-Wave MCP findings (comprehensive, kept as single file)
- **[outline.md](outline.md)** - Presentation structure and slides

---

## 🛠️ Troubleshooting

For troubleshooting help, see:
- **[voice-gateway-troubleshooting.md](voice-gateway-troubleshooting.md)** - Voice gateway diagnostics (macOS & Linux)
- **[SETUP.md](SETUP.md)** - Comprehensive troubleshooting section covering all services

---

## 📦 Supporting Materials

### Hardware
- **[hardware/design.md](hardware/design.md)** - Hardware design and wiring
- **[hardware/requirements.md](hardware/requirements.md)** - Component requirements

### Prompts & Experiments
- **[prompts/](prompts/)** - Prompt engineering experiments for presentation

---

## 🗄️ Archived Documentation

**Historical documentation** has been moved to **[archive/](archive/)** for reference:
- Old implementation summaries
- Superseded setup guides
- CI/build fix reports
- Technology comparison docs (for decisions already made)

See **[archive/README.md](archive/README.md)** for complete index.

---

## 📂 Directory Structure

```
docs/
├── README.md                       # This file - navigation index
├── GETTING-STARTED.md              # Quick start guide
│
├── ARCHITECTURE.md                 # Complete system architecture
├── SETUP.md                        # 🆕 Comprehensive setup guide (all services)
├── mcp-architecture.md             # MCP integration details
├── performance-optimization.md     # Pi 5 performance tuning
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
├── questions.md                    # Open decisions
├── outline.md                      # Presentation slides
│
├── hardware/                       # Hardware docs
├── prompts/                        # Prompt experiments
└── archive/
    └── README.md                   # Comprehensive historical summary
```

**Recent Consolidations:**
- ✅ 5 setup guides → 1 `SETUP.md` (Pi, MQTT, ALSA, Oracle, Voice Gateway)
  - `zwave-setup-guide.md` kept separate due to complexity (453 lines)
  - SETUP.md references zwave-setup-guide.md for detailed Z-Wave instructions
- ✅ 3 architecture docs → 1 `ARCHITECTURE.md`
- ✅ 2 OpenWakeWord docs → 1 `openwakeword-guide.md`
- ✅ 3 Z-Wave docs → 1 `zwave-setup-guide.md` (device pairing, MQTT config, troubleshooting)
- ✅ Voice diagnostics → `voice-gateway-troubleshooting.md`
- ✅ Z-Wave MCP findings → added to `notes.md`
- ✅ Archive → single comprehensive `README.md`
- ✅ Removed: delivered.md, fix summaries, old analysis docs

---

## 🔍 Finding What You Need

**For setup and configuration:**
- Start with `GETTING-STARTED.md`
- Then service-specific READMEs in `/apps/`

**For understanding architecture:**
- Start with `ARCHITECTURE.md` (complete system overview)
- Then `mcp-architecture.md` for MCP details
- Check `performance-optimization.md` for Pi tuning

**For development:**
- Follow `repository-guidelines.md`
- Check `tasks.md` for current work
- Review `/CLAUDE.md` for complete guidelines

**For troubleshooting:**
- Check `voice-gateway-troubleshooting.md` for voice issues
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
