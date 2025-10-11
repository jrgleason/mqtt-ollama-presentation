# Apps Directory

This directory contains all application services for the MQTT + Ollama home automation system.

## Applications

### 1. Oracle (`apps/oracle/`)

**Description:** Main Next.js chatbot application with LangChain.js and Ollama integration

**Technology:** Next.js 15 + TypeScript + Prisma + LangChain.js

**Purpose:**
- Web-based chat interface
- Natural language command processing
- Device control via LangChain tools
- MQTT integration for device communication
- SQLite database for device management

**Port:** 3000

**Documentation:** [apps/oracle/README.md](oracle/README.md)

---

### 2. Voice Gateway (`apps/voice-gateway/`)

**Description:** Offline voice command gateway with wake word detection and speech-to-text

**Technology:** Node.js 20 + TypeScript + Porcupine + Whisper.cpp

**Purpose:**
- Wake word detection ("Computer")
- Voice Activity Detection (VAD)
- Local speech-to-text (Whisper)
- MQTT integration with Oracle
- Text-only responses (TTS deferred)

**Port:** 3001 (health check)

**Status:** 🎯 Stretch Goal (Phase 5)

**Documentation:** [apps/voice-gateway/README.md](voice-gateway/README.md)

---

### 3. Z-Wave MCP Server (`apps/zwave-mcp-server/`)

**Description:** Model Context Protocol server for Z-Wave device integration

**Technology:** TypeScript + MCP SDK + zwave-js-ui MQTT

**Purpose:**
- MCP server for Z-Wave device access
- Integration with Claude Desktop / Claude Code
- MQTT-based device control
- Alternative to custom LangChain tools

**Status:** 🔧 In Development

**Documentation:** [apps/zwave-mcp-server/README.md](zwave-mcp-server/README.md)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Raspberry Pi 5                            │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Oracle     │  │Voice Gateway │  │ ZWave MCP Server │  │
│  │  (Next.js)   │  │  (Node.js)   │  │  (TypeScript)    │  │
│  │              │  │              │  │                  │  │
│  │ Port: 3000   │  │ Port: 3001   │  │ MCP Protocol     │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                    │             │
│         └─────────────────┼────────────────────┘             │
│                           │                                  │
│                    ┌──────▼──────┐                          │
│                    │  HiveMQ MQTT │                          │
│                    │    Broker    │                          │
│                    └──────────────┘                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Communication

All services communicate via **MQTT** (except MCP Server which uses MCP protocol):

**Oracle ↔ Voice Gateway:**
- `voice/req` - Voice transcriptions → Oracle
- `voice/res` - AI responses → Voice Gateway
- `voice/status` - Gateway status updates

**Oracle ↔ Z-Wave Devices:**
- `zwave/+/status` - Device state updates
- `zwave/+/set` - Device commands

---

## Running All Services

### Development (Separate Terminals)

```bash
# Terminal 1: Oracle
cd apps/oracle && npm run dev

# Terminal 2: Voice Gateway (optional)
cd apps/voice-gateway && npm run dev

# Terminal 3: MCP Server (if using)
cd apps/zwave-mcp-server && npm run dev
```

### Production (Docker Compose)

```bash
# From project root
docker-compose up
```

See `deployment/docker-compose.yml` for configuration.

---

## Quick Start

### 1. Oracle (Required)

```bash
cd apps/oracle
npm install
cp .env.example .env.local
# Edit .env.local with Auth0, MQTT, Ollama settings
npm run db:seed
npm run dev
```

Access at: http://localhost:3000

### 2. Voice Gateway (Optional - Phase 5)

```bash
cd apps/voice-gateway
npm install
npm run setup  # Downloads Whisper model
cp .env.example .env
# Edit .env with Porcupine API key
npm run dev
```

Health check: http://localhost:3001/health

### 3. MCP Server (Optional)

```bash
cd apps/zwave-mcp-server
npm install
npm start
```

Configure in Claude Desktop/Code MCP settings.

---

## Dependencies

### Shared Infrastructure

- **MQTT Broker:** HiveMQ at `mqtt://10.0.0.58:31883`
- **Ollama:** Running at `http://localhost:11434`
- **zwave-js-ui:** Running at `http://localhost:8091`

### Hardware

- **Oracle:** None (web-based)
- **Voice Gateway:** USB microphone (LANDIBO GSH23, hw:2,0)
- **MCP Server:** None (connects to zwave-js-ui)

---

## Development Guidelines

### Adding a New Service

1. Create directory: `apps/new-service/`
2. Add `package.json` with proper `name` and `scripts`
3. Add `README.md` documenting purpose and usage
4. Update `apps/README.md` (this file)
5. Update `docker-compose.yml` if needed
6. Document MQTT topics or communication protocol

### Testing

Each service has its own test suite:

```bash
# Run all tests
cd apps/oracle && npm test
cd apps/voice-gateway && npm test
cd apps/zwave-mcp-server && npm test
```

### Linting

Each service follows TypeScript + ESLint standards:

```bash
npm run lint
npm run type-check
```

---

## Documentation

- **Main README:** [../README.md](../README.md)
- **Architecture:** [../docs/voice-gateway-architecture.md](../docs/voice-gateway-architecture.md)
- **Tasks:** [../docs/tasks-active.md](../docs/tasks-active.md)
- **Requirements:** [../docs/requirements.md](../docs/requirements.md)
- **Network Dependencies:** [../docs/network-dependencies.md](../docs/network-dependencies.md)

---

## Project Status

| Service | Status | Priority | Phase |
|---------|--------|----------|-------|
| **Oracle** | 🔄 In Progress | 🔴 CRITICAL | Phase 2-4 |
| **Voice Gateway** | 📋 Planned | 🎯 Stretch | Phase 5 |
| **MCP Server** | 🔧 Experimental | 🎯 Optional | - |

---

**Last Updated:** 2025-10-11
