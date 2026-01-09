# MQTT + Ollama = Home Automation That Actually Works
## (And Doesn't Spy on You)

[![Presentation Slides](https://img.shields.io/badge/View-Presentation%20Slides-blue)](https://docs.google.com/presentation/d/1tRRNnYO50JHrfEF5NropKH8I7REwsic7dhM0d34oBRs/edit?usp=sharing)
[![CodeMash 2026](https://img.shields.io/badge/CodeMash-2026-orange)](https://codemash.org)

> **Local-first AI home automation demo** showcasing privacy-preserving voice control, natural language device management, and real-time sensor monitoring - all running on a $200 Raspberry Pi without cloud dependencies.

**Presentation Date:** January 12, 2026

---

## Table of Contents

- [Overview](#overview)
- [Why This Project?](#why-this-project)
- [The 3 Components](#the-3-components)
  - [1. Oracle Web UI](#1-oracle-web-ui)
  - [2. Voice Gateway](#2-voice-gateway)
  - [3. Z-Wave MCP Server](#3-z-wave-mcp-server)
- [Quick Start](#quick-start)
- [Demo Modes](#demo-modes)
- [Architecture](#architecture)
- [Hardware Requirements](#hardware-requirements)
- [Documentation](#documentation)
- [Contributing](#contributing)

---

## Overview

This project demonstrates **private, local-first home automation** using affordable hardware and open-source AI models. Unlike commercial solutions (Alexa, Google Home) that send your data to the cloud, everything runs locally on a Raspberry Pi 5.

**What you get:**
- 🎤 **Voice control** with wake word detection ("Hey Jarvis")
- 💬 **Natural language** device control ("Turn on the living room lights")
- 🏠 **Z-Wave integration** for smart home devices
- 🤖 **Local AI processing** with [Ollama](https://ollama.ai/) (no cloud APIs required)
- 🔒 **Complete privacy** - your voice never leaves your network
- 💰 **Cost effective** - ~$200 total hardware cost vs $3000/year cloud API costs

---

## Why This Project?

Commercial smart assistants have serious privacy concerns:

| Issue | Example | Status |
|-------|---------|--------|
| **Children's Data Misuse** | Amazon fined $25M for illegal collection of children's voice data | FTC Case 2:23-cv-00811 (Settled) |
| **Unintended Recordings** | Amazon caught recording private conversations and using them for targeted ads | Case 2:21-cv-00750 (Certified Class Action) |
| **Biometric Voice Data** | Collection of voice prints without informed consent | Cases 1:19-cv-05061 / 1:21-cv-06010 (Certified) |

**This project solves these problems** by keeping everything local:
- ✅ Your voice data stays on your network
- ✅ No cloud API calls for basic functionality
- ✅ You control what data is collected
- ✅ Open source and auditable

---

## The 3 Components

This project consists of **3 independent but interconnected services**, each serving a specific purpose. You can run any combination of them based on your needs.

### 1. Oracle Web UI

**What it is:** A Next.js web application providing a chat-based interface to control your smart home using natural language.

**What it does:**
- Provides a browser-based chat interface at `http://localhost:3000`
- Processes natural language commands ("Turn on the living room lights")
- Uses [LangChain.js](https://js.langchain.com/) with [Ollama](https://ollama.ai/) for local AI processing
- Communicates with Z-Wave devices via MQTT
- Auto-discovers Z-Wave control tools via the MCP Server

**Technology Stack:**
- [Next.js 15](https://nextjs.org/) - React framework
- [LangChain.js](https://js.langchain.com/) - AI orchestration
- [Ollama](https://ollama.ai/) - Local LLM inference
- [Prisma](https://www.prisma.io/) - Database ORM
- [MQTT](https://mqtt.org/) - Device communication protocol

**When to use it:**
- You want a web UI to control devices
- You prefer typing commands vs. speaking them
- You're developing/debugging device integrations

**How to start it:**

```bash
# Prerequisites: Ollama and MQTT broker must be running

cd apps/oracle

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your settings (see below)

# Development mode
npm run dev

# Production mode
npm run build && npm start
```

**Configuration:** Edit `apps/oracle/.env.local`:

```bash
# Ollama LLM
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b

# MQTT Broker
MQTT_BROKER_URL=mqtt://localhost:1883

# Z-Wave JS UI
ZWAVE_UI_URL=http://localhost:8091
ZWAVE_MQTT_BROKER=mqtt://localhost:1883

# Port
PORT=3000
```

**📖 Detailed Documentation:** [apps/oracle/README.md](apps/oracle/README.md)

---

### 2. Voice Gateway

**What it is:** An offline voice command system that listens for a wake word, transcribes speech, processes it with AI, and speaks responses back - all without internet (in offline mode).

**What it does:**
- Listens for wake word ("Hey Jarvis") using [OpenWakeWord](https://github.com/dscripka/openWakeWord)
- Transcribes speech locally with [Whisper.cpp](https://github.com/ggerganov/whisper.cpp)
- Processes commands with Ollama (local) or Anthropic Claude (cloud)
- Speaks responses with Piper TTS (local) or ElevenLabs (cloud)
- Controls Z-Wave devices via the MCP Server
- **4 demo modes** showcasing different provider combinations

**Technology Stack:**
- [Node.js 24+](https://nodejs.org/) - Runtime
- [OpenWakeWord](https://github.com/dscripka/openWakeWord) - Wake word detection
- [Whisper.cpp](https://github.com/ggerganov/whisper.cpp) - Speech-to-text
- [Ollama](https://ollama.ai/) or [Anthropic Claude](https://www.anthropic.com/claude) - AI processing
- [Piper](https://github.com/rhasspy/piper) or [ElevenLabs](https://elevenlabs.io/) - Text-to-speech
- [MQTT](https://mqtt.org/) - Device communication

**When to use it:**
- You want hands-free voice control
- You're demonstrating privacy-first AI (offline mode)
- You want to compare local vs. cloud AI quality

**How to start it:**

```bash
# Prerequisites: USB microphone, speaker, Ollama (for offline mode)

cd apps/voice-gateway-oww

# Install dependencies
npm install

# Download models and setup
./scripts/setup.sh

# Configure environment
cp .env.example .env
# Edit .env with your settings (see below)

# Development mode
npm run dev

# Production mode
npm start
```

**Configuration:** Edit `apps/voice-gateway-oww/.env`:

```bash
# Audio Devices (find with: arecord -l)
AUDIO_MIC_DEVICE=hw:2,0
AUDIO_SPEAKER_DEVICE=hw:2,0
AUDIO_SAMPLE_RATE=16000

# Wake Word
OWW_MODEL_PATH=jarvis
OWW_THRESHOLD=0.01

# AI Provider (choose: anthropic or ollama)
AI_PROVIDER=ollama

# Ollama (Local AI)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:0.5b

# Anthropic (Cloud AI - optional)
ANTHROPIC_API_KEY=your_key_here
ANTHROPIC_MODEL=claude-3-5-haiku-20241022

# TTS Provider (choose: ElevenLabs or Piper)
TTS_PROVIDER=Piper

# ElevenLabs (Cloud TTS - optional)
ELEVENLABS_API_KEY=your_key_here
ELEVENLABS_VOICE_ID=JBFqnCBsd6RMkjVDRZzb

# MQTT Broker
MQTT_BROKER_URL=mqtt://localhost:1883

# Z-Wave MCP Server
ZWAVE_UI_URL=http://localhost:8091
```

**Quick Mode Switch:**

```bash
# Switch to offline mode (Ollama + Piper)
./scripts/switch-mode.sh offline && npm run dev

# Switch to online mode (Anthropic + ElevenLabs)
./scripts/switch-mode.sh online && npm run dev

# Switch to hybrid modes
./scripts/switch-mode.sh hybrid-a && npm run dev  # Ollama + ElevenLabs
./scripts/switch-mode.sh hybrid-b && npm run dev  # Anthropic + Piper
```

**📖 Detailed Documentation:** [apps/voice-gateway-oww/README.md](apps/voice-gateway-oww/README.md)

---

### 3. Z-Wave MCP Server

**What it is:** A [Model Context Protocol](https://modelcontextprotocol.io/) server that exposes Z-Wave device control as tools that AI systems can discover and use automatically.

**What it does:**
- Provides 3 MCP tools: `list_zwave_devices`, `control_zwave_device`, `get_device_sensor_data`
- Connects to [Z-Wave JS UI](https://zwave-js.github.io/zwave-js-ui/) for device management
- Uses MQTT for real-time device control and sensor data
- Enables Oracle and Voice Gateway to control Z-Wave devices
- Works with any MCP-compatible AI system ([Claude Desktop](https://claude.ai/download), [Claude Code](https://www.anthropic.com/code), etc.)

**Technology Stack:**
- [Node.js 24+](https://nodejs.org/) - Runtime
- [MCP SDK](https://modelcontextprotocol.io/docs/) - Model Context Protocol
- [Z-Wave JS UI](https://zwave-js.github.io/zwave-js-ui/) - Z-Wave device manager
- [MQTT](https://mqtt.org/) - Real-time device communication

**When to use it:**
- You want AI systems to control Z-Wave devices
- You're using Oracle or Voice Gateway
- You want to integrate Z-Wave with other MCP-compatible tools

**How to use it:**

The MCP Server runs as a **subprocess** spawned by Oracle and Voice Gateway - you don't start it directly. Instead, you configure it:

**1. Configure Z-Wave JS UI Integration:**

Edit `apps/zwave-mcp-server/.env`:

```bash
# Z-Wave JS UI
ZWAVE_UI_URL=http://localhost:8091
ZWAVE_UI_AUTH_ENABLED=true
ZWAVE_UI_USERNAME=admin
ZWAVE_UI_PASSWORD=your_password

# MQTT Broker
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=your_username
MQTT_PASSWORD=your_password
MQTT_TOPIC_PREFIX=zwave
```

**2. Oracle auto-discovers tools:**

Oracle's `src/lib/mcp/integration.js` automatically spawns the MCP server and discovers tools:

```javascript
const mcpClient = new MultiServerMCPClient({
  zwave: {
    transport: "stdio",
    command: "node",
    args: ["../zwave-mcp-server/src/index.js"],
    env: { ZWAVE_UI_URL, MQTT_BROKER_URL }
  }
});

const tools = await mcpClient.getTools();
// Returns: list_zwave_devices, control_zwave_device, get_device_sensor_data
```

**3. Voice Gateway uses it the same way:**

The voice gateway also spawns the MCP server as a subprocess in `src/services/MCPIntegration.js`.

**Testing the MCP Server directly:**

```bash
cd apps/zwave-mcp-server

# Install dependencies
npm install

# Test with MCP Inspector (interactive UI)
npm run inspector

# Or test directly (for debugging)
npm start
```

**Available Tools:**

| Tool | Purpose | Example |
|------|---------|---------|
| `list_zwave_devices` | List all Z-Wave devices with current status | Lists all lights, sensors, switches |
| `control_zwave_device` | Turn devices on/off or dim them | "Living Room Light" → ON |
| `get_device_sensor_data` | Read sensor values (temperature, humidity, etc.) | "Office Temp Sensor" → 72.5°F |

**MQTT Topics:**

The MCP server uses human-readable MQTT topics:

```bash
# Turn on a light
Topic: zwave/Living Room/Living Room Light/switch_binary/endpoint_0/targetValue/set
Payload: {"value": true}

# Dim a light to 50%
Topic: zwave/Bedroom/Bedroom Lamp/switch_multilevel/endpoint_0/targetValue/set
Payload: {"value": 50}

# Read temperature sensor
Topic: zwave/Office/Temp_Sensor_1/sensor_multilevel/endpoint_0/currentValue
Payload: {"value": 72.5, "unit": "F"}
```

**📖 Detailed Documentation:** [apps/zwave-mcp-server/README.md](apps/zwave-mcp-server/README.md)

**📖 Learn More About MCP:** [Model Context Protocol Documentation](https://modelcontextprotocol.io/)

---

## Quick Start

### Prerequisites

**Required:**
- [Node.js 24+](https://nodejs.org/) - JavaScript runtime
- [Ollama](https://ollama.ai/) - Local LLM server
- [Mosquitto](https://mosquitto.org/) or compatible MQTT broker
- [Z-Wave JS UI](https://zwave-js.github.io/zwave-js-ui/) - Z-Wave device manager

**Optional (for Voice Gateway):**
- USB Microphone (16kHz capable)
- USB Speaker or DAC
- [FFmpeg](https://ffmpeg.org/) - Audio processing

<<<<<<< HEAD
**Optional (for cloud features):**
- [Anthropic API Key](https://console.anthropic.com/) - For Claude AI
- [ElevenLabs API Key](https://elevenlabs.io/) - For cloud TTS
=======
1. Clone the repo and install dependencies for the services you plan to run.
   ```bash
   git clone https://github.com/yourusername/mqtt-ollama-presentation.git
   cd mqtt-ollama-presentation
   npm install --prefix apps/oracle
   ```
2. Copy the example environment file and fill in Auth0 + MQTT credentials.
   ```bash
   cp apps/oracle/.env.tmp.example apps/oracle/.env.tmp.local
   ```
3. Start the stack. Mosquitto and zwave-js-ui run locally; Ollama is expected on the host.
   ```bash
   docker compose up --build
   ```
4. Visit `http://localhost:3000` for the Oracle UI and `http://localhost:8091` for zwave-js-ui.
>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)

### Installation

**1. Clone and Install:**

```bash
git clone https://github.com/yourusername/mqtt-ollama-presentation.git
cd mqtt-ollama-presentation

# Install dependencies for all services
cd apps/oracle && npm install
cd ../voice-gateway-oww && npm install
cd ../zwave-mcp-server && npm install
```

**2. Start Infrastructure:**

```bash
# Start MQTT Broker
docker run -p 1883:1883 eclipse-mosquitto

# OR on Raspberry Pi with systemd
sudo systemctl start mosquitto

# Start Ollama and download models
ollama serve
ollama pull qwen2.5:0.5b   # Fast model for voice
ollama pull qwen2.5:3b     # Better model for chat

# Start Z-Wave JS UI (on your Z-Wave hardware device)
# See: https://zwave-js.github.io/zwave-js-ui/#/getting-started/quick-start
```

**3. Configure Services:**

```bash
# Oracle
cd apps/oracle
cp .env.example .env.local
# Edit .env.local with your MQTT and Ollama URLs

# Voice Gateway (optional)
cd apps/voice-gateway-oww
./scripts/setup.sh  # Downloads wake word and Whisper models
cp .env.example .env
# Edit .env with your audio devices and provider preferences

# Z-Wave MCP Server
cd apps/zwave-mcp-server
cp .env.example .env
# Edit .env with Z-Wave JS UI credentials
```

**4. Start Services:**

```bash
# Terminal 1: Oracle (Required)
cd apps/oracle && npm run dev
# Visit: http://localhost:3000

# Terminal 2: Voice Gateway (Optional)
cd apps/voice-gateway-oww && npm run dev
# Say: "Hey Jarvis, turn on the living room lights"
```

**Note:** The Z-Wave MCP Server starts automatically when Oracle or Voice Gateway launch.

**📖 Detailed Setup Guide:** [docs/GETTING-STARTED.md](docs/GETTING-STARTED.md)

---

## Demo Modes

The Voice Gateway supports **4 different configurations** to showcase different AI and TTS providers:

| Mode | AI Provider | TTS Provider | Use Case | Internet Required? |
|------|------------|--------------|----------|-------------------|
| **Offline** | Ollama (local) | Piper (local) | Complete privacy, demo reliability | ❌ No (after setup) |
| **Online** | Anthropic Claude | ElevenLabs | Best AI quality + best TTS | ✅ Yes |
| **Hybrid A** | Ollama (local) | ElevenLabs | Local AI + cloud TTS quality | ✅ Yes (for TTS) |
| **Hybrid B** | Anthropic Claude | Piper (local) | Cloud AI + local TTS privacy | ✅ Yes (for AI) |

**Switch modes instantly:**

```bash
cd apps/voice-gateway-oww

# Offline mode (no internet needed)
./scripts/switch-mode.sh offline && npm run dev

# Online mode (best quality)
./scripts/switch-mode.sh online && npm run dev

# Hybrid modes
./scripts/switch-mode.sh hybrid-a && npm run dev
./scripts/switch-mode.sh hybrid-b && npm run dev
```

**Performance Comparison:**

| Metric | Before Optimization | After Optimization |
|--------|-------------------|-------------------|
| **Wake → Response** | 27 seconds | 7 seconds |
| **Improvement** | - | **74% faster** |
| **False Wake Detection** | 27 seconds wasted | <1 second (smart skip) |

**📖 Demo Mode Details:** [docs/TECH-STACK.md](docs/TECH-STACK.md#demo-modes)

---

## Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                   MQTT BROKER (Port 1883)                        │
│            Central message bus for all communication             │
└─────────────────────────────────────────────────────────────────┘
        ↑                        ↑                        ↑
        │ device control         │ voice requests         │ sensor updates
        │                        │                        │
┌───────▼──────────┐  ┌─────────▼─────────┐   ┌─────────▼────────┐
│  Oracle Web UI   │  │  Voice Gateway    │   │  Z-Wave JS UI    │
│  Port 3000       │  │  Port 3002        │   │  Port 8091       │
│                  │  │                   │   │                  │
│ • Chat interface │  │ • Wake word (OWW) │   │ • Device mgmt    │
│ • Device control │  │ • STT (Whisper)   │   │ • MQTT pub/sub   │
│ • LangChain      │  │ • AI (Ollama or   │   │ • Z-Wave radio   │
│ • Ollama LLM     │  │   Anthropic)      │   │                  │
└─────────┬────────┘  │ • TTS (Piper or   │   └──────────────────┘
          │           │   ElevenLabs)     │
          │  calls    │                   │
          │  MCP      │  calls MCP        │
          │  tools    │  tools            │
          │           │                   │
          └─────┬─────┴───────────────────┘
                │
         ┌──────▼──────────────┐
         │  Z-Wave MCP Server  │
         │  (Subprocess)       │
         │                     │
         │ • list_devices      │
         │ • control_device    │
         │ • sensor_data       │
         │ • MQTT bridge       │
         │ • Z-Wave API        │
         └─────────────────────┘
```

### Communication Flow

1. **User speaks:** "Hey Jarvis, turn on the living room lights"
2. **Voice Gateway:**
   - Detects wake word (OpenWakeWord)
   - Transcribes speech (Whisper.cpp)
   - Sends to AI (Ollama or Anthropic)
3. **AI calls MCP tool:** `control_zwave_device({ deviceName: "Living Room Light", action: "on" })`
4. **MCP Server:**
   - Looks up device in Z-Wave JS UI
   - Publishes MQTT command: `zwave/Living Room/Living Room Light/switch_binary/endpoint_0/targetValue/set` → `{"value": true}`
5. **Z-Wave JS UI:**
   - Receives MQTT command
   - Sends Z-Wave radio signal to physical device
   - Device turns on
   - Publishes state update via MQTT
6. **AI response:** "I've turned on the living room lights"
7. **Voice Gateway:** Speaks response (Piper or ElevenLabs)

**📖 Architecture Details:** [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## Hardware Requirements

### Minimum (Web UI Only)

- Any computer with Node.js 24+
- **Cost:** $0 (use existing hardware)

### Complete Setup (with Voice)

| Component | Model | Purpose | Cost |
|-----------|-------|---------|------|
| **Computer** | Raspberry Pi 5 (16GB) | Main compute | $99 |
| **Microphone** | USB Microphone | Voice input | $15 |
| **Speaker** | USB Speaker | Voice output | $5 |
| **Z-Wave Radio** | ZPi-7 HAT | Z-Wave device communication | $55 |
| **Optional: DAC** | DAC Mini HAT | Better audio quality | $20 |
| **Total** | - | - | **~$200** |

### Alternative: Use Existing Hardware

- **Laptop/Desktop:** Run everything locally (no Raspberry Pi needed)
- **Phone/Tablet:** Connect to Oracle web UI from any device
- **Z-Wave USB Stick:** Use USB dongle instead of HAT ($40-60)

**📖 Hardware Guide:** [docs/hardware/requirements.md](docs/hardware/requirements.md)

---

## Documentation

### Getting Started
- **[Getting Started Checklist](docs/GETTING-STARTED.md)** - Fastest path from zero to working demo
- **[Setup Guide](docs/SETUP.md)** - Complete installation walkthrough (8 phases)
- **[Deployment](docs/DEPLOYMENT.md)** - Production deployment with systemd

### Component Documentation
- **[Oracle README](apps/oracle/README.md)** - Web UI setup and configuration
- **[Voice Gateway README](apps/voice-gateway-oww/README.md)** - Voice features and demo modes
- **[Z-Wave MCP Server README](apps/zwave-mcp-server/README.md)** - MCP integration and tools

### Architecture & Technology
- **[Architecture](docs/ARCHITECTURE.md)** - System design and data flow
- **[Tech Stack](docs/TECH-STACK.md)** - Technology choices and rationale
- **[External Integrations](docs/EXTERNAL-INTEGRATIONS.md)** - Z-Wave, MQTT, Auth0, Ollama

### Specialized Guides
- **[Voice ASR Technologies](docs/voice-asr-technologies.md)** - Speech recognition comparison
- **[Z-Wave Setup](docs/zwave-setup-guide.md)** - Device pairing and troubleshooting
- **[OpenWakeWord Guide](docs/openwakeword-guide.md)** - Wake word detection setup
- **[Voice Gateway Developer Guide](apps/voice-gateway-oww/docs/DEVELOPER_GUIDE.md)** - Setup, troubleshooting, internals

### Reference
- **[Documentation Index](docs/README.md)** - Complete documentation map
- **[Network Dependencies](docs/network-dependencies.md)** - What requires internet and why
- **[CLAUDE.md](CLAUDE.md)** - Guidelines for AI assistants working on this project

---

## Try It Out

Once everything is running, try these commands:

**Via Web UI (Oracle):**
- Type: "Turn on the living room lights"
- Type: "Set bedroom lights to 50%"
- Type: "What's the temperature in the office?"

**Via Voice (Voice Gateway):**
- Say: "Hey Jarvis, turn on the living room lights"
- Say: "Hey Jarvis, make it cozy in the living room"
- Say: "Hey Jarvis, what time is it?"

**Via MCP Inspector (Z-Wave MCP Server):**

```bash
cd apps/zwave-mcp-server
npm run inspector

# In the inspector UI:
# 1. Call: list_zwave_devices
# 2. Call: control_zwave_device with { "deviceName": "Living Room Light", "action": "on" }
```

---

## Contributing

This is a **presentation/demo project** for CodeMash 2026. Contributions are welcome!

**Development Guidelines:**
- JavaScript only (no TypeScript)
- Never commit to `main` - use feature branches
- Follow conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- Update documentation when making changes
- Run tests before committing

**Workflow:**

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes and test
npm test

# Commit with conventional format
git commit -m "feat: add new demo mode"

# Push and create PR
git push -u origin feature/your-feature
```

**📖 Contribution Guide:** [CLAUDE.md](CLAUDE.md)

---

## Project Status

| Component | Status | Priority | Notes |
|-----------|--------|----------|-------|
| **Oracle Web UI** | ✅ Complete | Critical | Production ready |
| **Voice Gateway** | ✅ Complete | Stretch Goal | 4 demo modes working |
| **Z-Wave MCP Server** | ✅ Complete | Core | MCP integration stable |

---

## License

MIT

---

## Acknowledgments

- **[Ollama](https://ollama.ai/)** - Local LLM inference
- **[LangChain](https://js.langchain.com/)** - AI orchestration
- **[OpenWakeWord](https://github.com/dscripka/openWakeWord)** - Wake word detection
- **[Whisper.cpp](https://github.com/ggerganov/whisper.cpp)** - Speech-to-text
- **[Z-Wave JS](https://zwave-js.github.io/)** - Z-Wave protocol library
- **[Model Context Protocol](https://modelcontextprotocol.io/)** - AI tool integration standard

---

**Built for CodeMash 2026** | [View Presentation Slides](https://docs.google.com/presentation/d/1tRRNnYO50JHrfEF5NropKH8I7REwsic7dhM0d34oBRs/edit?usp=sharing)

*Last Updated: 2025-12-29*
