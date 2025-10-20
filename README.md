# MQTT + Ollama Home Automation

Local-first automation demo that pairs Ollama with MQTT, Z-Wave, and a Next.js control surface. Run everything on your LAN with local AI models for privacy, or optionally use Ollama cloud models for enhanced performance - same code, your choice.

## Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose
- **Ollama running on the host** with at least one chat model
  - **Local models:** `ollama pull qwen2.5:0.5b` (for voice) or `qwen2.5:3b` (for oracle)
  - **Cloud models:** No download needed! Just use `:cloud` suffix (e.g., `qwen3-coder:480b-cloud`)
- Optional hardware: Z-Wave USB controller, microphones, speakers

### Local Development (Laptop or Desktop)
1. Clone the repo and install dependencies for the services you plan to run.
   ```bash
   git clone https://github.com/yourusername/mqtt-ollama-presentation.git
   cd mqtt-ollama-presentation
   npm install --prefix apps/oracle
   ```
2. Copy the example environment file and fill in Auth0 + MQTT credentials.
   ```bash
   cp apps/oracle/.env.example apps/oracle/.env.local
   ```
3. Start the stack. Mosquitto and zwave-js-ui run locally; Ollama is expected on the host.
   ```bash
   docker compose up --build
   ```
4. Visit `http://localhost:3000` for the Oracle UI and `http://localhost:8091` for zwave-js-ui.

### Raspberry Pi 5 Deployment
1. Prepare the Pi 5 (OS flash, updates, audio devices, Z-Wave hat/USB stick).
2. Install Node.js 20, Docker, and Ollama (or point to another host running Ollama).
3. Follow the service setup checklist in [Getting Started][get-started] to configure MQTT, zwave-js-ui, Oracle, and optional voice features.

## Project Layout
- `apps/oracle` – Next.js 14 UI + LangChain agent that talks to MQTT
- `apps/voice-gateway-oww` – Wake-word + STT bridge that can publish MQTT intents (optional)
- `apps/voice-gateway-common` – Shared audio helpers
- `apps/zwave-mcp-server` – MCP bridge for Z-Wave data
- `deployment` – Docker, Mosquitto, and broker configuration
- `docs` – All runbooks, research notes, and hardware guides (see [Documentation Index][docs-index])

## Workflow Tips
- The Docker Compose file targets local development. Disable the `voice` profile if you do not need microphone/speaker passthrough.
- Ollama must be reachable at `http://host.docker.internal:11434` from containers; adjust `OLLAMA_BASE_URL` if you host it elsewhere.
- Use `npm test` within service directories to run Jest suites. Feature specs live alongside code in `__tests__` folders.

## Try It Out
- "Turn on the living room lights"
- "Set bedroom lights to 50%"
- "Make the living room cozy for movie night"

## Local vs Cloud Models

This project demonstrates Ollama's flexibility - you can run **local models** for privacy or **cloud models** for performance with zero code changes.

### Local Models (Privacy-First)
```bash
# Download model once
ollama pull qwen2.5:0.5b

# Configure in .env or systemd service
OLLAMA_MODEL=qwen2.5:0.5b
```

**Benefits:**
- ✅ Full privacy - data never leaves your network
- ✅ Works offline
- ✅ No usage costs
- ✅ Predictable performance

**Trade-offs:**
- ⚠️ Limited by local hardware (slower on Raspberry Pi)
- ⚠️ Smaller models = lower accuracy for complex queries

### Cloud Models (Performance-First)
```bash
# NO download needed! Just configure the model name
OLLAMA_MODEL=qwen3-coder:480b-cloud
```

**Benefits:**
- ✅ Much faster inference (offload to powerful servers)
- ✅ Access to huge models (120B+ parameters)
- ✅ No disk space required
- ✅ Same code - just change env var

**Trade-offs:**
- ⚠️ Requires internet connection
- ⚠️ Data leaves your local network
- ⚠️ Potential usage costs

### Switching Models
Change `OLLAMA_MODEL` environment variable:
```bash
# In .env file
nano apps/voice-gateway-oww/.env

# Or in systemd service
sudo nano /etc/systemd/system/voice-gateway-oww.service
sudo systemctl daemon-reload
sudo systemctl restart voice-gateway-oww.service
```

**Presentation Strategy:** Start with local model to show privacy/offline capability, then switch to cloud model to demonstrate performance improvement - same code, different deployment choice.

## Documentation
- [Getting Started Checklist][get-started] – fastest path from blank Pi/laptop to working demo
- [Documentation Index][docs-index] – curated map of detailed runbooks, research, and historical notes
- [Voice Gateway Overview][voice-doc] – how wake-word, transcription, and TTS pieces fit together

[get-started]: docs/GETTING-STARTED.md
[docs-index]: docs/README.md
[voice-doc]: docs/voice-gateway-architecture.md
