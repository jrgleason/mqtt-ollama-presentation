# Implementation Tasks

**Status Legend:**
- ⏳ Not Started
- 🔄 In Progress
- ✅ Completed
- ❌ Blocked
- 🎯 Stretch Goal

**Last Updated:** 2025-09-29

---

## Phase 0: Infrastructure Setup

**Goal:** Set up the foundational infrastructure components that the Next.js app will interact with.

### 0.1 MQTT Broker Setup
- [ ] ⏳ Create Mosquitto Docker configuration
  - [ ] Create `deployment/mqtt/mosquitto.conf`
  - [ ] Configure authentication (username/password)
  - [ ] Configure topic ACLs (if needed)
  - [ ] Configure logging
- [ ] ⏳ Create Mosquitto Dockerfile (if custom config needed)
- [ ] ⏳ Add Mosquitto to docker-compose.yml
  - Port: 1883 (MQTT)
  - Port: 9001 (WebSocket, optional)
- [ ] ⏳ Test MQTT broker connection
  - [ ] Use MQTT.js CLI or MQTT Explorer
  - [ ] Publish test message
  - [ ] Subscribe to test topic
  - [ ] Verify authentication works

### 0.2 zwave-js-ui Setup
- [ ] ⏳ Document recommended deployment method: use the official zwave-js-ui Docker image on the Raspberry Pi (no need to build or run a separate full app)
  - [ ] Document Pi prerequisites: Docker/Podman installed, correct CPU image (arm64 vs armv7), active cooling, NVMe/SSD storage recommendations
  - [ ] Create `docs/raspberry-pi-setup.md` with step-by-step Pi prep (OS image, Docker install, users/permissions, device access rules)
- [ ] ⏳ Create `deployment/zwave-js-ui/` directory for compose/notes (NOT a custom app repository)
  - [ ] Add sample `docker-compose.pi.yml` that:
    - Maps host Z‑Wave USB device (e.g., `--device /dev/ttyUSB0` or device path) into the container
    - Mounts a named volume or host path for persistent zwave-js-ui data
    - Exposes port 8091 to the host
    - Places container on the same Docker network as the MQTT broker (or points to broker address)
  - [ ] Add notes on selecting the correct image tag for Pi CPU architecture
- [ ] ⏳ Document persistence & backups
  - [ ] How to mount/backup the zwave-js-ui data directory
  - [ ] How to snapshot or export the zwave-js-ui state before upgrades
- [ ] ⏳ Document device access and permissions
  - [ ] udev rules or group membership to allow Docker to access serial devices
  - [ ] Example `--device` and `privileged` considerations
- [ ] ⏳ Document MQTT integration for zwave-js-ui
  - [ ] How to configure the MQTT gateway in the zwave-js-ui UI
  - [ ] Example MQTT settings (broker URL, username, password, topic prefix)
  - [ ] Add `docs/zwave-js-ui-deploy.md` that includes sample config and troubleshooting (connecting to remote broker vs local broker)
- [ ] ⏳ Test zwave-js-ui on Pi
  - [ ] Bring up container with `docker compose -f docker-compose.pi.yml up -d`
  - [ ] Ensure web UI reachable on `http://<pi-host>:8091`
  - [ ] Confirm zwave-js identifies the Z‑Wave stick and persists node info
  - [ ] Configure MQTT gateway and verify that Z‑Wave events are published to the broker
- [ ] ⏳ Acceptance criteria
  - [ ] Pi runs zwave-js-ui container and UI is reachable
  - [ ] Z‑Wave stick is accessible from container and devices show up
  - [ ] MQTT messages are emitted for device events and can be subscribed to by other services

### 0.3 Ollama Setup
- [ ] ⏳ Install Ollama on target device (Pi 5 or laptop)
  ```bash
  # Linux/Mac
  curl -fsSL https://ollama.com/install.sh | sh
  ```
- [ ] ⏳ Download recommended models
  - [ ] `ollama pull qwen2.5:3b`
  - [ ] `ollama pull gemma2:2b` (alternative)
  - [ ] Test model inference: `ollama run qwen2.5:3b "Hello"`
- [ ] ⏳ Configure Ollama API endpoint
  - [ ] Set OLLAMA_HOST if needed
  - [ ] Test API: `curl http://localhost:11434/api/tags`
  - [ ] Document API endpoint for Next.js
- [ ] ⏳ Benchmark model performance
  - [ ] Measure inference time on target hardware
  - [ ] Test with typical home automation queries
  - [ ] Document expected latency

### 0.4 Docker Compose Integration
- [ ] ⏳ Create master `docker-compose.yml` in project root
  ```yaml
  services:
    mosquitto:
      # MQTT broker
    zwave-js-ui:
      # Z-Wave gateway
    # Note: Ollama runs natively, not in Docker
  ```
- [ ] ⏳ Create `.env.example` for Docker Compose
  - MQTT credentials
  - Z-Wave USB device path
  - Network configuration
- [ ] ⏳ Add health checks for all services
- [ ] ⏳ Test full infrastructure stack
  - [ ] `docker-compose up -d`
  - [ ] Verify all services start
  - [ ] Check MQTT broker is reachable
  - [ ] Check zwave-js-ui web UI is accessible
  - [ ] Test MQTT → zwave-js-ui integration

### 0.5 Helm Charts (for production/demo deployment)
- [ ] ⏳ Create Helm chart structure
  ```
  deployment/helm/mqtt-ollama-chart/
  ├── Chart.yaml
  ├── values.yaml
  ├── templates/
  │   ├── mosquitto-deployment.yaml
  │   ├── mosquitto-service.yaml
  │   ├── zwave-js-ui-deployment.yaml
  │   ├── zwave-js-ui-service.yaml
  │   └── configmaps.yaml
  ```
- [ ] ⏳ Create Mosquitto Helm templates
  - Deployment
  - Service (ClusterIP)
  - ConfigMap for mosquitto.conf
  - PersistentVolumeClaim (optional)
- [ ] ⏳ Create zwave-js-ui Helm templates
  - Deployment with USB device access
  - Service (ClusterIP + NodePort for web UI)
  - PersistentVolumeClaim for data
- [ ] ⏳ Document Helm installation
  ```bash
  cd deployment/helm
  helm install mqtt-ollama ./mqtt-ollama-chart
  ```
- [ ] ⏳ Test Helm deployment on local K8s (minikube/kind)

### 0.6 Infrastructure Documentation
- [ ] ⏳ Create `docs/infrastructure-setup.md`
  - MQTT broker setup
  - zwave-js-ui configuration
  - Ollama installation
  - Docker Compose usage
  - Helm deployment
  - Troubleshooting guide
- [ ] ⏳ Create network diagram showing infrastructure components
- [ ] ⏳ Document MQTT topic structure and conventions
- [ ] ⏳ Create testing checklist for infrastructure

---

## Phase 1: Project Setup & Documentation

### 1.1 Repository Setup
- [x] ✅ Initialize Git repository
- [x] ✅ Create project folder structure
- [ ] ⏳ Setup .gitignore for Node.js, Python, SQLite
- [ ] ⏳ Create .env.example files
- [ ] ⏳ Setup branch protection rules

### 1.2 Documentation
- [x] ✅ Create docs/questions.md
- [x] ✅ Create docs/requirements.md
- [x] ✅ Create docs/tasks.md
- [x] ✅ Create docs/architecture-decision-nextjs-vs-react-native.md (architectural decision doc)
- [x] ✅ Create docs/network-dependencies.md (track all network requirements)
- [x] ✅ Create README.md (with architecture decisions, setup instructions)
- [x] ✅ Create CLAUDE.md (AI development guidelines)
- [ ] ⏳ Create CONTRIBUTING.md (not needed for demo project)

### 1.3 Development Environment
- [ ] ⏳ Create Docker Compose file for local development
- [ ] ⏳ Document local setup process (partially done in README)
- [ ] ⏳ Create VS Code workspace settings
- [ ] ⏳ Create .editorconfig
- [ ] ⏳ Setup ESLint + Prettier configuration

### 1.3.a Upgrade Tailwind in int-server (remove PostCSS)
**Goal:** Migrate the int-server project so Tailwind CSS is produced without relying on a PostCSS runtime configuration (postcss.config.*). This uses the Tailwind CLI to generate the CSS as part of the build/dev workflow so PostCSS can be removed from the runtime build.

Checklist:
- [ ] ⏳ Inventory current setup
  - [ ] Note Next.js and Tailwind versions in `int-server/package.json`.
  - [ ] Confirm `postcss.config.mjs` exists and is currently used; note any PostCSS plugins (autoprefixer, etc.).
- [ ] ⏳ Decide approach
  - Option A (recommended): Use Tailwind CLI to compile a single generated CSS file during dev/build and serve/import that file from the app.
  - Option B (alternative): Replace PostCSS runtime only with a minimal PostCSS build step (keeps autoprefixer) — useful if you must support older browsers.
- [ ] ⏳ Add Tailwind CLI scripts to `int-server/package.json`
  - Add a dev watch script (e.g., `tailwindcss -i ./src/styles/tailwind.css -o ./public/tailwind.css --watch`) and a build script to produce the final CSS before Next.js build.
- [ ] ⏳ Create an entry input CSS file (if not present): `int-server/src/styles/tailwind.css` with the Tailwind directives (`@tailwind base; @tailwind components; @tailwind utilities;`).
- [ ] ⏳ Update imports in the app to use the generated CSS (`public/tailwind.css` or another chosen output path). Replace any import of a PostCSS-processed file if present.
- [ ] ⏳ Update `int-server/tailwind.config.*` content paths to include all app directories (src, pages, components, app) so the CLI tree-shakes correctly.
- [ ] ⏳ Remove PostCSS runtime files and dependencies
  - [ ] Delete `int-server/postcss.config.mjs` (after ensuring build works).
  - [ ] Remove `postcss` and `postcss-loader`/`autoprefixer` from `int-server/package.json` if not needed (keep note if autoprefixer required).
- [ ] ⏳ Wire build scripts into CI and developer workflows
  - [ ] Ensure `npm run build` runs the CSS generation step before `next build` (or add it as part of a combined script: `npm run build:css && next build`).
  - [ ] For local dev, ensure dev script starts Tailwind CLI `--watch` alongside Next.js (using `concurrently`, npm-run-all, or two-terminal instructions).
- [ ] ⏳ Test
  - [ ] Run dev: CSS updates should reflect immediately.
  - [ ] Run production build: `npm run build` should produce the generated CSS and `next build` should succeed without PostCSS config.
  - [ ] Verify no Tailwind directives remain unprocessed in final output.
- [ ] ⏳ Acceptance criteria
  - [ ] `int-server` runs locally in dev and production without a `postcss.config.*` file.
  - [ ] `postcss` and related packages are removed from `int-server/package.json` (unless autoprefixer is explicitly kept).
  - [ ] Generated CSS file exists in the chosen output path and is imported successfully by the app.
  - [ ] CI/build scripts include CSS generation step and pass.

Notes / Caveats:
- Removing PostCSS also removes autoprefixer. If you need automatic vendor prefixes for older browsers, keep autoprefixer in the build step or run a small PostCSS pass as a build-time step.
- Tailwind CLI-based generation means you must ensure the CLI runs in CI and during production build; that is handled by adding the CSS build step to the `build` script.
- If you prefer a fully integrated solution, keep a minimal `postcss.config.*` but move it to a build-only step (not required at runtime).

### 1.4 Decision Making
- [x] ✅ Answer key questions in docs/questions.md (Q2: Next.js, Q8: Auth0)
- [x] ✅ Document architecture decisions (Next.js vs React Native - 20-page analysis)
- [x] ✅ Document network dependencies and justifications
- [ ] ⏳ Answer remaining questions (Q3-Q7, Q9-Q15)
- [ ] ⏳ Create sequence diagrams
- [ ] ⏳ Create component diagrams

### 1.5 Project Initialization
- [ ] ⏳ Create Next.js app with TypeScript
  ```bash
  npx create-next-app@latest langchain-service --typescript --tailwind --app
  ```
- [ ] ⏳ Install core dependencies:
  - langchain
  - @langchain/community
  - @langchain/core
  - ollama
  - mqtt
  - @auth0/nextjs-auth0
  - prisma or drizzle-orm
  - zod

### 1.6 Project Structure
- [ ] ⏳ Create folder structure:
  ```
  src/
  ├── app/
  │   ├── api/
  │   │   ├── auth/
  │   │   ├── chat/
  │   │   ├── devices/
  │   │   ├── voice/
  │   │   └── health/
  │   ├── (dashboard)/
  │   └── layout.tsx
  ├── lib/
  │   ├── langchain/
  │   │   ├── tools/
  │   │   ├── agents/
  │   │   └── prompts/
  │   ├── mqtt/
  │   ├── db/
  │   └── utils/
  ├── components/
  ├── types/
  └── middleware.ts
  ```

### 1.7 Database Setup
- [ ] ⏳ Choose ORM (Prisma vs Drizzle)
- [ ] ⏳ Create Prisma schema or Drizzle schema
- [ ] ⏳ Generate initial migration
- [ ] ⏳ Create database client
- [ ] ⏳ Create seed data script

**Schema includes:**
- [ ] ⏳ Users table
- [ ] ⏳ Devices table
- [ ] ⏳ User preferences table
- [ ] ⏳ Conversations table (optional)
- [ ] ⏳ Shortcuts table

### 1.8 Auth0 Integration
- [ ] ⏳ Create Auth0 account/tenant
- [ ] ⏳ Configure Auth0 application (SPA)
- [ ] ⏳ Setup Auth0 SDK in Next.js
- [ ] ⏳ Create login/logout routes
- [ ] ⏳ Create protected API middleware
- [ ] ⏳ Implement JWT validation
- [ ] ⏳ Create user profile page
- [ ] ⏳ Handle token refresh

### 1.9 Ollama Integration
- [ ] ⏳ Create Ollama client wrapper
- [ ] ⏳ Implement model selection logic
- [ ] ⏳ Create prompt templates
- [ ] ⏳ Implement streaming responses
- [ ] ⏳ Add error handling and retries
- [ ] ⏳ Create model configuration (temperature, max tokens, etc.)

---

## Phase 2: Next.js LangChain Service

### 2.1 Project Initialization
- [ ] ⏳ Create Next.js app with TypeScript
  ```bash
  npx create-next-app@latest langchain-service --typescript --tailwind --app
  ```
- [ ] ⏳ Install core dependencies:
  - langchain
  - @langchain/community
  - @langchain/core
  - ollama
  - mqtt
  - @auth0/nextjs-auth0
  - prisma or drizzle-orm
  - zod

### 2.2 Project Structure
- [ ] ⏳ Create folder structure:
  ```
  src/
  ├── app/
  │   ├── api/
  │   │   ├── auth/
  │   │   ├── chat/
  │   │   ├── devices/
  │   │   ├── voice/
  │   │   └── health/
  │   ├── (dashboard)/
  │   └── layout.tsx
  ├── lib/
  │   ├── langchain/
  │   │   ├── tools/
  │   │   ├── agents/
  │   │   └── prompts/
  │   ├── mqtt/
  │   ├── db/
  │   └── utils/
  ├── components/
  ├── types/
  └── middleware.ts
  ```

### 2.3 Database Setup
- [ ] ⏳ Choose ORM (Prisma vs Drizzle)
- [ ] ⏳ Create Prisma schema or Drizzle schema
- [ ] ⏳ Generate initial migration
- [ ] ⏳ Create database client
- [ ] ⏳ Create seed data script

**Schema includes:**
- [ ] ⏳ Users table
- [ ] ⏳ Devices table
- [ ] ⏳ User preferences table
- [ ] ⏳ Conversations table (optional)
- [ ] ⏳ Shortcuts table

### 2.4 Auth0 Integration
- [ ] ⏳ Create Auth0 account/tenant
- [ ] ⏳ Configure Auth0 application (SPA)
- [ ] ⏳ Setup Auth0 SDK in Next.js
- [ ] ⏳ Create login/logout routes
- [ ] ⏳ Create protected API middleware
- [ ] ⏳ Implement JWT validation
- [ ] ⏳ Create user profile page
- [ ] ⏳ Handle token refresh

### 2.5 Ollama Integration
- [ ] ⏳ Create Ollama client wrapper
- [ ] ⏳ Implement model selection logic
- [ ] ⏳ Create prompt templates
- [ ] ⏳ Implement streaming responses
- [ ] ⏳ Add error handling and retries
- [ ] ⏳ Create model configuration (temperature, max tokens, etc.)

### 2.6 LangChain Agent
- [ ] ⏳ Create base agent with Ollama
- [ ] ⏳ Implement conversation memory
- [ ] ⏳ Create system prompt with personality
- [ ] ⏳ Add conversation context management
- [ ] ⏳ Implement tool calling

### 2.7 MQTT Tool for LangChain
- [ ] ⏳ Create MQTT tool class
- [ ] ⏳ Implement device discovery from MQTT
- [ ] ⏳ Implement publish command
- [ ] ⏳ Implement read device state
- [ ] ⏳ Implement list all devices
- [ ] ⏳ Add tool descriptions for LLM

**Tool functions:**
- `listDevices()` - Get all available devices
- `getDeviceState(deviceId)` - Get current state
- `controlDevice(deviceId, action, value)` - Send command
- `getDevicesByRoom(room)` - Filter by room
- `getDevicesByType(type)` - Filter by type

### 2.8 Personality System
- [ ] ⏳ Define personality types (helpful, sarcastic, enthusiastic)
- [ ] ⏳ Create personality prompts
- [ ] ⏳ Implement personality selection
- [ ] ⏳ Store user personality preference
- [ ] ⏳ Add personality to responses

### 2.9 API Endpoints
- [ ] ⏳ POST /api/chat - Send command
- [ ] ⏳ GET /api/chat/history - Get conversation
- [ ] ⏳ DELETE /api/chat/history - Clear conversation
- [ ] ⏳ GET /api/devices - List devices
- [ ] ⏳ GET /api/devices/[id] - Get device
- [ ] ⏳ POST /api/devices/[id]/command - Control device
- [ ] ⏳ GET /api/shortcuts - List shortcuts
- [ ] ⏳ POST /api/shortcuts - Create shortcut
- [ ] ⏳ PUT /api/shortcuts/[id] - Update shortcut
- [ ] ⏳ DELETE /api/shortcuts/[id] - Delete shortcut
- [ ] ⏳ GET /api/health - Health check

### 2.10 Frontend Components
- [ ] ⏳ Create chat interface component
- [ ] ⏳ Create device list component
- [ ] ⏳ Create device card component
- [ ] ⏳ Create command input component
- [ ] ⏳ Create shortcuts management
- [ ] ⏳ Create settings page
- [ ] ⏳ Add loading states
- [ ] ⏳ Add error states
- [ ] ⏳ Implement dark/light theme

### 2.11 Real-time Updates
- [ ] ⏳ Setup Server-Sent Events or WebSocket
- [ ] ⏳ Push device state updates to frontend
- [ ] ⏳ Update UI in real-time

### 2.12 Testing
- [ ] ⏳ Write unit tests for MQTT tool
- [ ] ⏳ Write unit tests for database operations
- [ ] ⏳ Write integration tests for API endpoints
- [ ] ⏳ Write E2E tests for chat flow

### 2.13 Deployment Preparation
- [ ] ⏳ Create Dockerfile for Next.js app
- [ ] ⏳ Create Helm chart
- [ ] ⏳ Setup environment variables
- [ ] ⏳ Document deployment process

---

## Phase 3: MQTT Integration

### 3.1 MQTT Broker Setup
- [ ] ⏳ Choose broker (Mosquitto recommended)
- [ ] ⏳ Create Mosquitto Docker image
- [ ] ⏳ Configure authentication
- [ ] ⏳ Configure ACLs (if needed)
- [ ] ⏳ Setup persistence
- [ ] ⏳ Add to Docker Compose

### 3.2 MQTT Client Implementation
- [ ] ⏳ Create MQTT client singleton
- [ ] ⏳ Implement connection management
- [ ] ⏳ Implement reconnection logic
- [ ] ⏳ Implement subscribe/unsubscribe
- [ ] ⏳ Implement publish
- [ ] ⏳ Handle connection errors

### 3.3 Topic Structure Design
- [ ] ⏳ Define topic naming convention
- [ ] ⏳ Document topic structure
- [ ] ⏳ Create topic constants

**Example structure:**
```
home/
├── zwave/
│   ├── [nodeId]/
│   │   ├── status
│   │   ├── [commandClass]/
│   │   │   └── [property]
├── esp32/
│   ├── [deviceId]/
│   │   ├── status
│   │   ├── sensor/
│   │   └── actuator/
└── system/
    ├── status
    └── errors
```

### 3.4 Device Discovery
- [ ] ⏳ Implement MQTT topic scanning
- [ ] ⏳ Parse device information from topics
- [ ] ⏳ Store discovered devices in database
- [ ] ⏳ Handle device online/offline events
- [ ] ⏳ Auto-refresh device list

### 3.5 State Management
- [ ] ⏳ Subscribe to all device state topics
- [ ] ⏳ Cache device states in memory
- [ ] ⏳ Update cache on MQTT messages
- [ ] ⏳ Persist important state changes to DB

### 3.6 Command Publishing
- [ ] ⏳ Create command formatter
- [ ] ⏳ Publish commands to device topics
- [ ] ⏳ Wait for acknowledgment (if applicable)
- [ ] ⏳ Handle command failures
- [ ] ⏳ Log all commands

### 3.7 Testing
- [ ] ⏳ Test connection/reconnection
- [ ] ⏳ Test publish/subscribe
- [ ] ⏳ Test with mock devices
- [ ] ⏳ Load testing (multiple devices)

---

## Phase 4: Z-Wave Integration

### 4.1 zwave-js-ui Setup
- [ ] ⏳ Use official zwave-js-ui Docker image on Pi or other host; do NOT plan to build a custom full app unless there is a specific requirement
- [ ] ⏳ If forking is considered, document reason and migration path; otherwise document 'run official image' steps
- [ ] ⏳ Create deployment docs (see `docs/zwave-js-ui-deploy.md`) with:
  - [ ] Sample docker-compose for Pi (`docker-compose.pi.yml`) including device mapping and volume mounts
  - [ ] Steps to configure MQTT gateway via UI and sample JSON/env example for automation
  - [ ] Backup and upgrade procedure for zwave-js-ui data
- [ ] ⏳ Add troubleshooting checklist (device permissions, device not found, wrong architecture image, MQTT auth failures)
- [ ] ⏳ Document integration test steps to validate end-to-end (publish/subscribe, command flow)

### 4.2 Z-Wave Controller
- [ ] ⏳ Obtain USB Z-Wave controller
- [ ] ⏳ Document compatible controllers
- [ ] ⏳ Setup controller with zwave-js-ui
- [ ] ⏳ Document pairing process

### 4.3 Device Pairing
- [ ] ⏳ Document inclusion process
- [ ] ⏳ Pair test devices
- [ ] ⏳ Verify MQTT topics are created
- [ ] ⏳ Test device control via MQTT

**Test devices (if available):**
- [ ] ⏳ Smart switch/plug
- [ ] ⏳ Dimmer
- [ ] ⏳ Motion sensor
- [ ] ⏳ Door/window sensor
- [ ] ⏳ Thermostat (if available)

### 4.4 Device Mapping
- [ ] ⏳ Create device friendly names
- [ ] ⏳ Assign devices to rooms
- [ ] ⏳ Define device capabilities
- [ ] ⏳ Store mappings in database

### 4.5 MQTT Topic Mapping
- [ ] ⏳ Map zwave-js-ui topics to our schema
- [ ] ⏳ Create topic translation layer (if needed)
- [ ] ⏳ Document topic mappings

### 4.6 Mock Devices
- [ ] ⏳ Create mock Z-Wave device simulator
- [ ] ⏳ Publish mock device states to MQTT
- [ ] ⏳ Respond to commands
- [ ] ⏳ Support common device types

### 4.7 Integration Testing
- [ ] ⏳ Test device discovery
- [ ] ⏳ Test device control
- [ ] ⏳ Test state updates
- [ ] ⏳ Test error conditions

---

## Phase 5: Voice Commands (Stretch Goal)

### 5.1 Whisper Integration Decision
- [ ] 🎯 Choose Whisper implementation:
  - Option A: transformers.js (browser-based)
  - Option B: whisper.cpp (native)
  - Option C: @whisper/node (Node.js bindings)
  - Option D: OpenAI API (cloud, not local)

### 5.2 Audio Capture
- [ ] 🎯 Implement browser microphone access
- [ ] 🎯 Handle permissions
- [ ] 🎯 Record audio chunks
- [ ] 🎯 Convert audio format (if needed)
- [ ] 🎯 Stream or batch upload

### 5.3 Whisper Transcription
- [ ] 🎯 Setup Whisper model
- [ ] 🎯 Download required model files
- [ ] 🎯 Implement transcription API endpoint
- [ ] 🎯 Handle audio file upload
- [ ] 🎯 Return transcribed text
- [ ] 🎯 Handle errors gracefully

### 5.4 Wake Word Detection (Optional)
- [ ] 🎯 Choose wake word library
- [ ] 🎯 Integrate wake word detection
- [ ] 🎯 Start recording on wake word
- [ ] 🎯 Stop recording after silence
- [ ] 🎯 Or: implement push-to-talk instead

### 5.5 Voice UI
- [ ] 🎯 Create voice input component
- [ ] 🎯 Add microphone button
- [ ] 🎯 Show recording indicator
- [ ] 🎯 Show transcription in progress
- [ ] 🎯 Display transcribed text
- [ ] 🎯 Send to chat API

### 5.6 Audio Feedback
- [ ] 🎯 Implement text-to-speech (optional)
- [ ] 🎯 Play success/error sounds
- [ ] 🎯 Voice confirmation of commands

### 5.7 Testing
- [ ] 🎯 Test in quiet environment
- [ ] 🎯 Test with background noise
- [ ] 🎯 Test with various accents
- [ ] 🎯 Test latency

---

## Phase 6: ESP32 Integration (Stretch Goal)

### 6.1 Hardware Setup
- [ ] 🎯 Obtain ESP32 dev board
- [ ] 🎯 Choose sensors/actuators
- [ ] 🎯 Wire components
- [ ] 🎯 Document circuit diagram

### 6.2 Firmware Development
- [ ] 🎯 Setup Arduino IDE or PlatformIO
- [ ] 🎯 Install ESP32 board support
- [ ] 🎯 Install MQTT library (PubSubClient)
- [ ] 🎯 Create firmware template

### 6.3 MQTT Implementation
- [ ] 🎯 Connect to WiFi
- [ ] 🎯 Connect to MQTT broker
- [ ] 🎯 Publish sensor data
- [ ] 🎯 Subscribe to control topics
- [ ] 🎯 Handle commands

### 6.4 Example Implementations
- [ ] 🎯 Temperature/humidity sensor (DHT22)
- [ ] 🎯 LED strip control
- [ ] 🎯 Button/switch input
- [ ] 🎯 Motion sensor

### 6.5 Integration
- [ ] 🎯 Discover ESP32 device via MQTT
- [ ] 🎯 Control via LangChain agent
- [ ] 🎯 Display in UI

### 6.6 Documentation
- [ ] 🎯 Create firmware README
- [ ] 🎯 Document hardware setup
- [ ] 🎯 Create wiring diagrams
- [ ] 🎯 Document firmware upload process

---

## Phase 7: Deployment & DevOps

### 7.1 Docker Setup
- [ ] ⏳ Create Dockerfile for Next.js
- [ ] ⏳ Create Dockerfile for Ollama (or use official)
- [ ] ⏳ Create Dockerfile for Mosquitto (or use official)
- [ ] ⏳ Optimize image sizes
- [ ] ⏳ Use multi-stage builds

### 7.2 Docker Compose
- [ ] ⏳ Create docker-compose.yml
- [ ] ⏳ Define all services
- [ ] ⏳ Setup networking
- [ ] ⏳ Define volumes
- [ ] ⏳ Add environment variables
- [ ] ⏳ Document usage

**Services:**
- nextjs-app
- ollama
- mosquitto
- zwave-js-ui (optional)

### 7.3 Helm Charts
- [ ] ⏳ Create Helm chart for Next.js
- [ ] ⏳ Create Helm chart for Ollama
- [ ] ⏳ Create Helm chart for Mosquitto
- [ ] ⏳ Define values.yaml
- [ ] ⏳ Setup persistent volumes
- [ ] ⏳ Configure secrets
- [ ] ⏳ Document deployment

### 7.4 CI/CD Pipeline
- [ ] ⏳ Create GitHub Actions workflow
- [ ] ⏳ Setup linting and testing
- [ ] ⏳ Build Docker images
- [ ] ⏳ Push to registry
- [ ] ⏳ Tag releases
- [ ] ⏳ Auto-deploy to staging (optional)

### 7.5 Environment Configuration
- [ ] ⏳ Create .env.example
- [ ] ⏳ Document all env variables
- [ ] ⏳ Setup secrets management
- [ ] ⏳ Create development config
- [ ] ⏳ Create production config

### 7.6 Monitoring & Logging
- [ ] ⏳ Add health check endpoints
- [ ] ⏳ Implement structured logging
- [ ] ⏳ Add request logging
- [ ] ⏳ Add error tracking
- [ ] ⏳ Add metrics endpoint (optional)

### 7.7 Documentation
- [ ] ⏳ Create deployment guide
- [ ] ⏳ Document environment setup
- [ ] ⏳ Create troubleshooting guide
- [ ] ⏳ Document backup/restore process

---

## Phase 8: Presentation Materials

### 8.1 Slide Deck
- [ ] ⏳ Create presentation outline
- [ ] ⏳ Design slide template
- [ ] ⏳ Create introduction slides
- [ ] ⏳ Create problem statement slides
- [ ] ⏳ Create architecture diagrams
- [ ] ⏳ Create live demo slides
- [ ] ⏳ Create code walkthrough slides
- [ ] ⏳ Create conclusion/Q&A slides
- [ ] ⏳ Add speaker notes

**Slide outline:**
1. Title + intro
2. The problem with cloud IoT
3. Home Assistant's Year of Voice
4. Architecture overview
5. Component deep dive
6. Live demo
7. Code walkthrough
8. Lessons learned
9. Resources + Q&A

### 8.2 Demo Script
- [ ] ⏳ Write step-by-step demo script
- [ ] ⏳ Define demo commands
- [ ] ⏳ Plan personality showcase
- [ ] ⏳ Prepare failure recovery steps
- [ ] ⏳ Practice demo timing (5-10 minutes max)

### 8.3 Backup Demo Video
- [ ] ⏳ Record full demo video
- [ ] ⏳ Add captions/annotations
- [ ] ⏳ Edit for presentation
- [ ] ⏳ Prepare to play if live demo fails

### 8.4 Code Walkthrough
- [ ] ⏳ Prepare code snippets
- [ ] ⏳ Highlight key integration points
- [ ] ⏳ Create syntax-highlighted slides
- [ ] ⏳ Explain LangChain tool implementation
- [ ] ⏳ Show MQTT integration
- [ ] ⏳ Show personality system

### 8.5 Handout Materials
- [ ] ⏳ Create one-page architecture diagram
- [ ] ⏳ List of resources and links
- [ ] ⏳ QR code to GitHub repository
- [ ] ⏳ QR code to live demo (if available)
- [ ] ⏳ Contact information

### 8.6 Repository Preparation
- [ ] ⏳ Clean up code
- [ ] ⏳ Add comprehensive README
- [ ] ⏳ Add LICENSE file
- [ ] ⏳ Add CONTRIBUTING guide
- [ ] ⏳ Remove sensitive data
- [ ] ⏳ Tag release version

### 8.7 Practice & Rehearsal
- [ ] ⏳ Practice full presentation (3x minimum)
- [ ] ⏳ Time the presentation
- [ ] ⏳ Practice demo (10x minimum)
- [ ] ⏳ Test in presentation environment
- [ ] ⏳ Prepare for Q&A

---

## Optional Enhancements

### Nice-to-Have Features
- [ ] 🎯 Mobile app (React Native)
- [ ] 🎯 Advanced personality customization
- [ ] 🎯 Scene/routine creation
- [ ] 🎯 Scheduling commands
- [ ] 🎯 Multi-language support
- [ ] 🎯 Voice synthesis for responses
- [ ] 🎯 Integration with other platforms (Home Assistant, etc.)
- [ ] 🎯 Webhooks for external triggers
- [ ] 🎯 Grafana dashboard for metrics

### Code Quality
- [ ] ⏳ Achieve >80% test coverage
- [ ] ⏳ Setup Dependabot
- [ ] ⏳ Add security scanning
- [ ] ⏳ Performance profiling
- [ ] ⏳ Accessibility audit

---

## Progress Tracking

### Summary
- **Total Tasks:** ~200+
- **Completed:** 12 ✅
- **In Progress:** 0
- **Not Started:** ~185
- **Stretch Goals:** ~40

### Phase Progress
- **Phase 1:** 12/24 completed (50%) - Core documentation ✅
  - Repository setup: 2/5
  - Documentation: 7/8 ✅
  - Development environment: 0/5
  - Decision making: 3/6
- **Phase 2:** 0/~60 (Not started)
- **Phase 3:** 0/~30 (Not started)
- **Phase 4:** 0/~20 (Not started)
- **Phase 5:** 0/~20 (Stretch goals)
- **Phase 6:** 0/~15 (Stretch goals)
- **Phase 7:** 0/~25 (Not started)
- **Phase 8:** 0/~30 (Not started)

### Weekly Goals
**Week 1-2:** Phase 1 documentation complete ✅ (DONE)
**Week 3-4:** Phase 2 complete
**Week 5-6:** Phase 3-4 complete
**Week 7-8:** Phase 5-6 (stretch goals)
**Week 9-10:** Phase 7 complete
**Week 11-12:** Phase 8 + rehearsal

### Current Sprint
**Status:** Phase 1 core documentation COMPLETE ✅

**Completed This Sprint:**
1. ✅ Next.js vs React Native architectural decision (20-page analysis)
2. ✅ Auth0 Next.js SDK v4 configuration documented
3. ✅ Network dependencies tracking system created
4. ✅ README.md with architecture decisions
5. ✅ CLAUDE.md with development guidelines
6. ✅ Answered key questions (Q2: Next.js, Q8: Auth0)

**Next Sprint Goals:**
1. Complete remaining Phase 1 tasks (Docker Compose, .gitignore, .env.example)
2. Begin Phase 2: Initialize Next.js project
3. Answer remaining questions in docs/questions.md

**Blockers:**
- None currently

**Notes:**
- Core architectural decisions made and documented
- Network dependencies tracked with mitigation strategies
- Ready to begin implementation phase