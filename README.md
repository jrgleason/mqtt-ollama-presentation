# MQTT + Ollama: Building Home Automation That Actually Works (And Doesn't Spy on You)

> **CodeMash 2026 Presentation**
> January 12, 2026

A demonstration of local AI-powered home automation using Ollama, MQTT, and Z-Wave - running entirely on your local network without cloud dependencies.

## 🎯 Project Overview

Tired of smart home devices that need the internet to turn on a light bulb? Fed up with voice assistants that mishear "dim the bedroom" as "order three tons of cat food"?

This project demonstrates how to create a truly intelligent home automation system using:
- **Ollama** for local AI processing (no cloud required)
- **MQTT** for reliable device communication
- **LangChain.js** for AI agent orchestration
- **Z-Wave** devices via zwave-js-ui
- **Next.js** for the web interface

Unlike corporate voice assistants that maintain corporate politeness, your local AI can have personality:
- "Finally going to bed at a reasonable hour? Impressive."
- *sarcastically comments when you ask it to turn the heat up for the third time today*

## ✨ Key Features

- 🤖 **Natural Language Control** - "Make the living room cozy for movie night"
- 🏠 **Local Processing** - Everything runs on your network
- 🎭 **Configurable Personality** - Helpful, sarcastic, enthusiastic, or custom
- 🔐 **Secure** - Auth0 authentication, no cloud data leaks
- 🎤 **Voice Commands** - Using local Whisper transcription (stretch goal)
- 🔌 **ESP32 Support** - Custom IoT devices (stretch goal)
- 🐳 **Containerized** - Docker + Helm charts for easy deployment

## 🏗️ Architecture

```
┌─────────────────┐
│   Next.js App   │  ← User Interface + API
│  (LangChain.js) │
└────────┬────────┘
         │
    ┌────▼────┐
    │  Ollama │  ← Local AI Model
    └────┬────┘
         │
    ┌────▼────┐
    │   MQTT  │  ← Message Broker
    │  Broker │
    └────┬────┘
         │
    ┌────▼──────────┐
    │  zwave-js-ui  │  ← Z-Wave Controller
    └───────────────┘
         │
    ┌────▼────┐
    │ Z-Wave  │  ← Physical Devices
    │ Devices │
    └─────────┘
```

## 📋 Prerequisites

### Software
- **Node.js** 20+
- **Docker** & Docker Compose
- **Git**
- **pnpm** or npm

### Hardware (Choose One)

**Option A: Development on Laptop**
- Modern laptop (8-core CPU, 16GB+ RAM)
- USB Z-Wave controller (optional for physical devices)

**Option B: Raspberry Pi 5 (Recommended)**
- Raspberry Pi 5 8GB RAM
- Active cooling solution
- NVMe SSD via PCIe
- USB Z-Wave controller

### Optional Hardware
- Z-Wave devices (switches, dimmers, sensors)
- ESP32 dev board with sensors/LEDs
- Microphone for voice commands

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/mqtt-ollama-presentation.git
cd mqtt-ollama-presentation
```

### 2. Install Ollama

**Linux/Mac:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**Windows:**
Download from https://ollama.com/download

**Pull Recommended Model:**
```bash
ollama pull qwen2.5:3b
# or
ollama pull gemma2:2b
```

### 3. Setup Environment Variables

Create a `.env.local` file in the `oracle` directory:

```bash
cd oracle
cp .env.example .env.local
# Edit .env.local with your configuration
```

Required variables:
```bash
# Auth0 Configuration (Next.js SDK v4)
AUTH0_SECRET='<generate-with-openssl-rand-hex-32>'
APP_BASE_URL='http://localhost:3000'
AUTH0_DOMAIN='your-tenant.auth0.com'
AUTH0_CLIENT_ID='your_auth0_client_id'
AUTH0_CLIENT_SECRET='your_auth0_client_secret'

# MQTT Configuration
MQTT_BROKER_URL='mqtt://localhost:1883'
MQTT_USERNAME=''
MQTT_PASSWORD=''

# Ollama Configuration
OLLAMA_BASE_URL='http://localhost:11434'
OLLAMA_MODEL='qwen2.5:3b'

# Database
DATABASE_URL='file:./dev.db'
```

**Generate AUTH0_SECRET:**
```bash
openssl rand -hex 32
```

**Auth0 Dashboard Setup:**
- Allowed Callback URLs: `http://localhost:3000/auth/callback`
- Allowed Logout URLs: `http://localhost:3000`

### 4. Start with Docker Compose

```bash
docker-compose up -d
```

This starts:
- zwave-js-ui on port 8091
- Next.js app on port 3000
- Note: MQTT Broker (HiveMQ) runs separately in Kubernetes at 10.0.0.58:31883

### 5. Install Dependencies & Run

```bash
cd apps/oracle
pnpm install
pnpm run build
```

**Then start the server manually:**
```bash
pnpm run dev
```

Navigate to http://localhost:3000

## 📚 Documentation

### Task Tracking
- **[Tasks Overview](docs/tasks.md)** - Current sprint and progress summary
- **[Active Tasks](docs/tasks-active.md)** - Detailed remaining work by phase
- **[Delivered Features](docs/delivered.md)** - Completed work and achievements

### Technical Documentation
- **[Requirements](docs/requirements.md)** - Detailed technical requirements
- **[Questions](docs/questions.md)** - Architecture decisions and clarifying questions
- **[Architecture Decision: Next.js vs React Native](docs/architecture-decision-nextjs-vs-react-native.md)** - Detailed comparison and rationale
- **[Network Dependencies](docs/network-dependencies.md)** - Complete list of network/internet requirements and mitigation strategies
- **[CLAUDE.md](CLAUDE.md)** - Guidelines for AI-assisted development

## 🏛️ Architecture Decisions

Key architectural decisions have been documented in [docs/questions.md](docs/questions.md):

### Frontend: Next.js with App Router ✅
After evaluating Next.js vs React Native Web, **Next.js with App Router** was chosen because:
- Browser-based demo preference (simpler for live presentation)
- Superior web dashboard performance and UX
- Native LangChain.js integration via Server Components
- First-class Auth0 Next.js SDK support
- Lower complexity and risk for one-hour live demo
- No mobile app requirement in project scope

See [detailed comparison](docs/architecture-decision-nextjs-vs-react-native.md) for full analysis.

### Authentication: Auth0 Next.js SDK v4 ✅
Using Auth0's official Next.js SDK for authentication:
- **Universal Login** - Auth0 hosted login page
- **Automatic session management** - Server-side sessions with cookies
- **Middleware-based auth** - Protect routes via Next.js middleware
- **React hooks** - Client-side auth state access
- Single demo tenant (internet required)

### Z-Wave Integration: zwave-js-ui MQTT ✅
Using zwave-js-ui's built-in MQTT support (no fork needed):
- Native MQTT gateway functionality
- Well-maintained and documented
- Supports comprehensive Z-Wave device types

### LLM: Ollama with Qwen2.5 or Gemma2 ✅
Running locally on Raspberry Pi 5 or development machine:
- **Recommended models**: Qwen2.5:3b or Gemma2:2b
- Models under 3B parameters for Pi 5 compatibility
- Q5/Q6 quantization, low temperature (~0.1) for deterministic responses

## 🎭 Demo Commands

Try these natural language commands:

### Basic Control
- "Turn on the living room lights"
- "Set the bedroom lights to 50%"
- "Turn off all the lights"
- "What devices are available?"

### Contextual
- "Turn on the lights" → "Make them brighter" → "Now turn them off"

### Complex Scenes
- "Make the living room cozy for movie night"
  → Dims lights, adjusts temperature
- "Good morning"
  → Turns on lights gradually, adjusts thermostat
- "Bedtime"
  → Turns off lights, locks doors, sets temperature

### With Personality
- User: "Turn on the lights"
- AI (Sarcastic): "Oh sure, let me get right on that. What, your fingers broken?"
- AI (Helpful): "Turning on the living room lights now!"
- AI (Enthusiastic): "YOU GOT IT! LIGHTS COMING RIGHT UP! ✨"

## 🛠️ Development

### Project Structure

```
mqtt-ollama-presentation/
├── apps/                          # All application services
│   ├── oracle/                    # Main Next.js chatbot (App Router)
│   │   ├── src/
│   │   │   ├── app/               # Next.js App Router
│   │   │   │   ├── page.tsx       # Landing page
│   │   │   │   ├── layout.tsx     # Root layout
│   │   │   │   ├── dashboard/     # Dashboard pages
│   │   │   │   └── api/           # API routes
│   │   │   │       ├── chat/      # LangChain chat endpoint
│   │   │   │       └── devices/   # Device control API
│   │   │   ├── lib/               # Shared libraries
│   │   │   │   ├── langchain/     # LangChain agent & tools
│   │   │   │   ├── mqtt/          # MQTT client
│   │   │   │   └── db/            # Database (Prisma)
│   │   │   ├── components/        # React components
│   │   │   └── middleware.ts      # Auth0 middleware
│   │   ├── prisma/                # Database schema
│   │   ├── .env.local             # Environment variables
│   │   └── package.json
│   ├── voice-gateway/             # Voice command service (Phase 5)
│   │   ├── src/
│   │   │   ├── main.ts            # Entry point
│   │   │   ├── wakeword.ts        # Porcupine integration
│   │   │   ├── recorder.ts        # Audio capture + VAD
│   │   │   ├── stt.ts             # Whisper.cpp wrapper
│   │   │   ├── mqtt.ts            # MQTT client
│   │   │   └── config.ts          # Configuration
│   │   ├── models/                # Whisper models (gitignored)
│   │   ├── .env                   # Environment variables
│   │   └── package.json
│   ├── zwave-mcp-server/          # Z-Wave MCP server (optional)
│   │   └── package.json
│   └── README.md                  # Apps overview
├── docs/                          # Project documentation
│   ├── requirements.md
│   ├── tasks-active.md
│   ├── voice-gateway-architecture.md
│   ├── alsa-setup.md
│   └── network-dependencies.md
├── deployment/                    # Docker & Kubernetes configs
│   └── mosquitto/                 # MQTT broker config
├── docker-compose.yml             # Multi-service orchestration
└── presentation/                  # Slide deck & demo materials
```

### Available Scripts

**Oracle (Main App):**
```bash
cd apps/oracle

# Install dependencies
pnpm install

# Development (run manually)
pnpm run dev

# Build for production
pnpm run build

# Run tests
pnpm test

# Lint code
pnpm run lint
```

**Voice Gateway (Phase 5):**
```bash
cd apps/voice-gateway

# Install dependencies
npm install

# Setup (download models)
npm run setup

# Development
npm run dev

# Production
npm start
```

**All Services (Docker):**
```bash
# Start all services
docker-compose up

# Start specific service
docker-compose up oracle

# Start with voice (Phase 5)
docker-compose --profile voice up
```

### Adding a New Device Type

1. Update MQTT topic mapping in `lib/mqtt/topics.ts`
2. Add device type to LangChain tool descriptions
3. Update device discovery logic
4. Test with mock device or physical device

### Adding a New Personality

1. Edit `lib/langchain/prompts/personalities.ts`
2. Add personality option to UI
3. Test responses across various commands

## 🧪 Testing

### Unit Tests
```bash
pnpm test
```

### Integration Tests
```bash
pnpm run test:integration
```

### E2E Tests
```bash
pnpm run test:e2e
```

### Manual Testing
1. Test with mock devices
2. Test with physical Z-Wave devices
3. Test voice commands (if implemented)
4. Test in presentation environment

## 📦 Deployment

### Docker Compose (Recommended for Demo)

```bash
docker-compose up -d
```

### Kubernetes with Helm

```bash
cd deployment/helm
helm install mqtt-ollama ./mqtt-ollama-chart
```

### Raspberry Pi 5

Follow the [Raspberry Pi Setup Guide](docs/raspberry-pi-setup.md)

## 🎤 Presentation

### Slide Deck
Located in `presentation/slides/`

### Demo Script
1. Show architecture diagram
2. Live demo: natural language commands
3. Show personality switching
4. Code walkthrough: LangChain tool implementation
5. Show MQTT integration
6. Voice command demo (if working)
7. Q&A

### Backup Video
Located in `presentation/backup-demo.mp4`

If live demo fails, play the backup video while explaining the code.

## 🤝 Contributing

This is a presentation project, but contributions are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- **Home Assistant** - For inspiration and the Year of Voice initiative
- **zwave-js-ui** - For excellent Z-Wave integration
- **Ollama** - For making local LLMs accessible
- **LangChain** - For agent orchestration framework
- **CodeMash** - For the opportunity to present

## 📞 Contact

- **Presenter:** [Your Name]
- **Email:** your.email@example.com
- **GitHub:** https://github.com/yourusername
- **LinkedIn:** https://linkedin.com/in/yourprofile

## 🎯 Roadmap

### MVP (For Presentation)
- [x] Documentation and planning
- [ ] Next.js + LangChain setup
- [ ] MQTT integration
- [ ] Z-Wave device control
- [ ] Basic personality system
- [ ] Docker deployment

### Stretch Goals
- [ ] Voice commands with Whisper
- [ ] Wake word detection
- [ ] ESP32 integration example
- [ ] Mobile app
- [ ] Advanced scene creation

### Future Enhancements
- [ ] Multi-language support
- [ ] Integration with Home Assistant
- [ ] Grafana dashboard
- [ ] Webhook triggers
- [ ] Advanced automation rules

## 🐛 Known Issues

- Voice recognition may have latency on slower hardware (stretch goal)
- Some Z-Wave devices require polling for state updates
- **Auth0 requires internet connection** - See [Network Dependencies](docs/network-dependencies.md) for mitigation strategies
  - Backup options: Pre-authenticated session, phone hotspot, or temporary mock auth

See [Issues](https://github.com/yourusername/mqtt-ollama-presentation/issues) for full list

**Note:** This project prioritizes local-first architecture. Only Auth0 authentication requires internet during demo. All AI processing, device control, and data storage happens locally. See [docs/network-dependencies.md](docs/network-dependencies.md) for complete network requirements and offline mitigation strategies.

## 📊 Project Status

**Current Phase:** Phase 1 - Documentation & Planning ✅

**Recent Updates:**
- ✅ Next.js vs React Native architectural decision ([detailed analysis](docs/architecture-decision-nextjs-vs-react-native.md))
- ✅ Auth0 Next.js SDK v4 configuration documented
- ✅ Network dependencies tracked and justified
- ✅ Complete project documentation structure

**Next Up:** Phase 2 - Next.js + LangChain Setup

See [docs/tasks.md](docs/tasks.md) for detailed progress tracking.

**Key Decisions Made:**
1. **Frontend:** Next.js with App Router (vs React Native Web)
2. **Authentication:** Auth0 Next.js SDK v4
3. **LLM:** Ollama with Qwen2.5:3b or Gemma2:2b
4. **Architecture:** Local-first with minimal cloud dependencies

---

**Built with ❤️ for CodeMash 2026**

*No clouds were harmed in the making of this smart home system.*