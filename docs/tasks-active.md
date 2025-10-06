# Active Implementation Tasks

**Status Legend:**
- ⏳ Not Started
- 🔄 In Progress
- 🔴 DEMO CRITICAL
- 🎯 Stretch Goal (Optional)

**Last Updated:** 2025-10-05

**See [delivered.md](./delivered.md) for completed tasks.**

---

## Current Sprint Focus

**Goal:** Implement core chatbot features with real database and MQTT integration

**Completed This Week:** ✅
- Phase 1.1, 1.5, 1.6, 1.7, 1.9: Project setup complete
- Phase 2.1.2, 2.1.3: Ollama integration and chat API working
- Database seeded with 4 mock devices
- Chat interface confirmed functional

**Next Up:** 🔴 DEMO CRITICAL
1. Update LangChain tools to use Prisma database
2. Implement MQTT client
3. Connect device control to MQTT
4. Z-Wave integration

---

## Phase 0: Infrastructure Setup

### 0.1 MQTT Broker Documentation
- [ ] ⏳ Document HiveMQ configuration
  - [ ] Create `docs/hivemq-setup.md`
  - [ ] Document Kubernetes deployment
  - [ ] Document anonymous access (temporary for demo)
- [ ] 🔴 TECH DEBT: Enable HiveMQ authentication
  - [ ] Install HiveMQ RBAC extension
  - [ ] Configure secure credentials
  - [ ] Update MCP server to use authentication

### 0.2 zwave-js-ui Setup

- [ ] ⏳ Document recommended deployment: official Docker image on Raspberry Pi
  - [ ] Document Pi prerequisites (Docker, CPU image, cooling, storage)
  - [ ] Create `docs/raspberry-pi-setup.md`
- [ ] ⏳ Create `deployment/zwave-js-ui/` directory
  - [ ] Add sample `docker-compose.pi.yml` with:
    - USB device mapping
    - Persistent volume
    - Port 8091 exposure
    - MQTT broker connection
- [ ] ⏳ Configure MQTT integration in zwave-js-ui
  - [ ] Set broker URL: `mqtt://10.0.0.58:31883`
  - [ ] Configure topic prefix: `zwave/`
  - [ ] Enable MQTT discovery
- [ ] ⏳ Test Z-Wave device discovery via MQTT

### 0.3 Ollama Benchmarking (Remaining)

- [ ] ⏳ Benchmark model performance on target hardware
  - [ ] Test on Raspberry Pi 5 (if using)
  - [ ] Measure tokens/second
  - [ ] Test with different quantizations (Q5 vs Q6)
- [ ] ⏳ Document model performance characteristics

### 0.4 Docker Compose Configuration

- [ ] ⏳ Create `deployment/docker-compose.yml`
- [ ] ⏳ Add services: Next.js app, zwave-js-ui
- [ ] ⏳ Create `.env.example` for Docker Compose
- [ ] ⏳ Add health checks for all services
- [ ] ⏳ Test full infrastructure stack

### 0.5 Helm Charts

- [ ] ⏳ Create Helm chart for Next.js app (Oracle)
- [ ] ⏳ Create zwave-js-ui Helm templates
- [ ] ⏳ Document Helm installation
- [ ] ⏳ Test Helm deployment on K8s cluster

### 0.6 Infrastructure Documentation

- [ ] ⏳ Create `docs/infrastructure-setup.md`
- [ ] ⏳ Create network diagram
- [ ] ⏳ Document MQTT topic structure
- [ ] ⏳ Create testing checklist

---

## Phase 1: Project Setup (Remaining Tasks)

### 1.3 Development Environment

- [ ] ⏳ Create Docker Compose file for local development
- [ ] ⏳ Document local setup process
- [ ] ⏳ Create VS Code workspace settings
- [ ] ⏳ Create .editorconfig
- [ ] ⏳ Setup ESLint + Prettier configuration

### TECH DEBT: Re-enable ESLint during builds (post-demo)

- **Priority:** 🔴 High (TECH DEBT)
- **Context:** ESLint checks were temporarily disabled during `next build` and generated Prisma files were ignored/overridden to avoid build-time warnings (see `oracle/next.config.ts`, `oracle/eslint.config.mjs`, and `.eslintignore`). This change reduced noise for the demo but skipped automated lint enforcement.
- **Goal:** Re-enable ESLint in CI and during local builds, and remove ad-hoc ignores/overrides so the codebase is linted consistently.
- **Acceptance criteria:**
  - ESLint runs as part of the build/test pipeline (e.g., `npm run lint` executed in CI) and passes on `main` branch.
  - `next build` does not disable ESLint (i.e., `eslint.ignoreDuringBuilds` is removed or set to false).
  - `oracle/eslint.config.mjs` no longer contains broad overrides that silence linting for `src/generated/**` (generated files should be ignored via `.eslintignore` or handled explicitly in generator step).
  - No remaining lint warnings from source (excluding intentionally ignored generated files) on a fresh clone after `npm ci`.
  - A follow-up PR documents the re-enablement and any fixes required to satisfy the linter.

- **Tasks:**
  - [ ] Create a branch `tech/eslint-reenable`
  - [ ] Revert `eslint.ignoreDuringBuilds` in `oracle/next.config.ts`
  - [ ] Remove or tighten the generated-files override in `oracle/eslint.config.mjs`
  - [ ] Keep `src/generated/**` entries in `.eslintignore` but remove any rules that hide real source problems
  - [ ] Run `npm ci` and `npm run lint` locally, fix lint failures (or produce follow-up tasks for large refactors)
  - [ ] Add `npm run lint` to CI pipeline (or ensure existing CI runs it) and get CI green
  - [ ] Update `docs/tasks-active.md` with any blockers or large refactor estimates

- **Estimated effort:** 1-4 hours (depends on lint errors found)
- **Owner:** @your-team (assign to a developer)

### 1.4 Decision Making (Remaining)

- [ ] ⏳ Q1: Voice solution (Whisper vs cloud STT)
- [ ] ⏳ Q3: ESP32 firmware (ESPHome vs custom)
- [ ] ⏳ Q4: Deployment (Raspberry Pi vs cloud hybrid)

### 1.8 Auth0 Integration 🎯 OPTIONAL

**Note:** Defer until after demo works. All Auth0 tasks consolidated here.

- [ ] 🎯 Create Auth0 account/tenant
- [ ] 🎯 Configure Auth0 application (SPA)
- [ ] 🎯 Setup Auth0 SDK in Next.js
- [ ] 🎯 Create login/logout routes
- [ ] 🎯 Create protected API middleware
- [ ] 🎯 Implement JWT validation
- [ ] 🎯 Add session validation to Chat API route
- [ ] 🎯 Add session validation to Devices API routes
- [ ] 🎯 Create user profile page
- [ ] 🎯 Handle token refresh

---

## Phase 2: AI Chatbot Implementation

### 2.1 Backend Setup (Remaining)

#### 2.1.1 LangChain.js Installation
- [ ] ⏳ Install remaining LangChain dependencies (if any)
- [ ] ⏳ Configure TypeScript types for LangChain

### 2.2 LangChain Tools - UPDATE TO USE DATABASE 🔴 DEMO CRITICAL

#### 2.2.0 TECH DEBT: Re-enable Tools with Selective Calling 🔴 CRITICAL
- [ ] 🔴 **TEMPORARILY DISABLED:** Tools removed to test raw model speed
- [ ] 🔴 Re-implement agent with proper system prompt:
  ```typescript
  SystemMessagePromptTemplate.fromTemplate(`You are a helpful home automation assistant.

  Only use tools when the user explicitly asks to:
  - List devices or check device status
  - Control devices (turn on/off, adjust settings)
  - Perform calculations

  For general conversation, greetings, or questions that don't require device interaction or calculations, respond directly without using any tools.`)
  ```
- [ ] 🔴 Test that "Hi how are you" does NOT trigger tools
- [ ] 🔴 Test that "Turn on the light" DOES trigger device_control tool
- [ ] 🔴 Verify tool calling with llama3.2:1b (confirmed compatible)
- [ ] ⏳ Document system prompt best practices in `docs/langchain-setup.md`

**Current Status:** Tools commented out in `oracle/src/app/api/chat/route.ts` (lines 40-48)
**Reason:** Testing raw model performance without agent overhead
**Priority:** Must re-enable before demo - device control is core functionality

#### 2.2.1 MQTT Tool
- [ ] 🔄 Create `lib/langchain/tools/mqtt-tool.ts`
- [ ] 🔄 Implement DynamicTool with:
  - [ ] Name: `mqtt_publish`
  - [ ] Description: Clear instructions for AI
  - [ ] Function: Publish to MQTT broker
  - [ ] Input validation: JSON schema
  - [ ] Error handling
- [ ] ⏳ Test MQTT tool independently

#### 2.2.2 Update Device List Tool 🔴 DEMO CRITICAL
- [ ] 🔄 Replace mock data with Prisma query:
  ```typescript
  const devices = await prisma.device.findMany();
  ```
- [ ] ⏳ Format output for AI consumption
- [ ] ⏳ Test with real database

#### 2.2.3 Update Device Control Tool 🔴 DEMO CRITICAL
- [ ] 🔄 Add device lookup from database:
  ```typescript
  const device = await prisma.device.findFirst({
    where: { name: { contains: deviceName, mode: 'insensitive' } }
  });
  ```
- [ ] 🔄 Publish MQTT command using device.mqttTopic
- [ ] 🔄 Update device state in database
- [ ] ⏳ Test end-to-end device control

#### 2.2.4 Tool Error Handling 🔴 DEMO CRITICAL
- [ ] ⏳ Implement graceful error messages
- [ ] ⏳ Handle device not found errors
- [ ] ⏳ Handle MQTT connection errors
- [ ] ⏳ Handle database errors

### 2.3 Frontend Components

#### 2.3.1 Chat Interface
- [x] ✅ ChatInput component exists
- [x] ✅ MessageList component exists (via ChatInterface)
- [x] ✅ ChatMessage component with streaming support
- [x] ✅ Streaming message display working
- [x] ✅ Loading states implemented
- [x] ✅ **NEW:** Collapsible thinking section for model reasoning
  - Hides `<think>` tags during streaming
  - Shows "View thinking" button after completion
  - Clean UX without exposing reasoning by default

#### 2.3.2 Device Dashboard (Optional)
- [ ] 🎯 Create DeviceCard component
- [ ] 🎯 Create DeviceList component
- [ ] 🎯 Add real-time device state updates via MQTT
- [ ] 🎯 Manual device control toggles

#### 2.3.3 Layout & Navigation
- [ ] ⏳ Create main layout with navigation
- [ ] ⏳ Add page transitions
- [ ] ⏳ Mobile-responsive design

### 2.4 Conversation History - SIMPLIFIED FOR DEMO

#### 2.4.3 Session Storage (DEMO CRITICAL)
- [ ] 🔄 Implement client-side sessionStorage for chat history
  ```typescript
  const [messages, setMessages] = useState([]);
  useEffect(() => {
    sessionStorage.setItem('chat-history', JSON.stringify(messages));
  }, [messages]);
  ```
- [ ] ⏳ Load messages on mount
- [ ] ⏳ Clear history button

**Note:** Full database persistence deferred to post-demo (2.4.1, 2.4.2)

### 2.5 Streaming Implementation 🔴 DEMO CRITICAL

- [x] ✅ Backend streaming working (streamEvents v2)
- [ ] ⏳ Verify frontend SSE consumption
- [ ] ⏳ Display tool call indicators in UI
- [ ] ⏳ Handle connection errors gracefully
- [ ] ⏳ Add reconnection logic

### 2.6 Error Handling - SIMPLIFIED

#### 2.6.1 API Error Responses
- [ ] ⏳ Implement basic try/catch in API routes
- [ ] ⏳ Return user-friendly error messages
- [ ] ⏳ Log errors for debugging

#### 2.6.2 Frontend Error Handling
- [ ] ⏳ Display error messages in chat UI
- [ ] ⏳ Retry failed messages button
- [ ] ⏳ Handle network disconnection

**Note:** Advanced error handling (rate limiting, validation, fallbacks) deferred to post-demo (2.6.3, 2.6.4)

### 2.7-2.9 Testing, Performance, Documentation 🎯 OPTIONAL

**Note:** These sections deferred to post-demo polish

---

## Phase 3: MQTT Integration 🔴 DEMO CRITICAL

**Goal:** Enable real device communication via MQTT

### 3.1 MQTT Broker Connection
- [x] ✅ HiveMQ broker running (see Phase 0.1)
- [ ] 🔄 Verify connection details in .env.local:
  ```
  MQTT_BROKER_URL=mqtt://10.0.0.58:31883
  ```

### 3.2 MQTT Client Implementation
- [ ] 🔄 Create `lib/mqtt/client.ts`
- [ ] 🔄 Implement MQTT singleton with:
  - [ ] Connection to HiveMQ broker
  - [ ] Reconnection logic
  - [ ] Event handlers (connect, error, message)
  - [ ] Topic subscription management
- [ ] ⏳ Create `lib/mqtt/topics.ts` - Topic mapping utilities
- [ ] ⏳ Test MQTT client connection

### 3.3 Device State Management
- [ ] 🔄 Subscribe to device state topics:
  ```
  zwave/+/status
  home/+/status
  ```
- [ ] 🔄 Update database on state changes
- [ ] ⏳ Emit events to frontend (optional: WebSocket or polling)

### 3.4 Device Control via MQTT
- [ ] 🔄 Implement publish functions in `lib/mqtt/client.ts`:
  - [ ] `publishDeviceCommand(topic, payload)`
  - [ ] `publishZWaveCommand(nodeId, command, value)`
- [ ] 🔄 Integrate with device-control-tool
- [ ] ⏳ Test end-to-end: Chat → LangChain → MQTT → Device

### 3.5 MQTT Testing
- [ ] ⏳ Test with MQTT.fx or similar client
- [ ] ⏳ Verify message delivery
- [ ] ⏳ Test reconnection scenarios
- [ ] ⏳ Load testing (optional)

---

## Phase 4: Z-Wave Integration 🔴 DEMO CRITICAL

**Goal:** Control physical Z-Wave devices via zwave-js-ui MQTT gateway

### 4.1 zwave-js-ui Configuration
- [ ] ⏳ Install zwave-js-ui on Raspberry Pi
- [ ] ⏳ Configure Z-Wave USB controller
- [ ] ⏳ Enable MQTT gateway
- [ ] ⏳ Point to HiveMQ: `mqtt://10.0.0.58:31883`
- [ ] ⏳ Configure topic prefix: `zwave/`

### 4.2 Device Discovery & Pairing
- [ ] ⏳ Pair test Z-Wave devices
- [ ] ⏳ Document node IDs and device types
- [ ] ⏳ Verify MQTT topics published by zwave-js-ui

### 4.3 Database Integration
- [ ] ⏳ Create script to import Z-Wave devices to database:
  ```typescript
  // Listen to MQTT discovery topics
  // Create Device records with nodeId, type, mqttTopic
  ```
- [ ] ⏳ Map Z-Wave node IDs to Device table
- [ ] ⏳ Update seed script with real device data

### 4.4 Device Control Integration
- [ ] ⏳ Test device control via MQTT:
  ```
  Topic: zwave/livingroom-light/set
  Payload: {"value": true}
  ```
- [ ] ⏳ Verify state updates received:
  ```
  Topic: zwave/livingroom-light/status
  Payload: {"state": "on", "level": 100}
  ```
- [ ] ⏳ Update LangChain tools to handle Z-Wave devices

### 4.5 End-to-End Testing
- [ ] ⏳ Test: "Turn on the living room light"
- [ ] ⏳ Test: "Dim the bedroom light to 50%"
- [ ] ⏳ Test: "Turn off all lights"
- [ ] ⏳ Test: "What devices are available?"

---

## Phase 5: Voice Commands 🎯 STRETCH GOAL

**Note:** Optional - defer until core demo works

### 5.1 Whisper Integration
- [ ] 🎯 Research Whisper.cpp vs OpenAI API
- [ ] 🎯 Install Whisper.cpp locally (if chosen)
- [ ] 🎯 Create audio recording component
- [ ] 🎯 Implement STT endpoint `/api/voice/transcribe`
- [ ] 🎯 Test transcription accuracy

### 5.2 Voice UI
- [ ] 🎯 Add microphone button to chat interface
- [ ] 🎯 Visualize recording state
- [ ] 🎯 Send transcribed text to chat

### 5.3 Wake Word Detection (Super Stretch)
- [ ] 🎯 Research Porcupine or Snowboy
- [ ] 🎯 Implement wake word listener
- [ ] 🎯 Test: "Hey Oracle, turn on the lights"

---

## Phase 6: ESP32 Integration 🎯 STRETCH GOAL

**Note:** Optional demonstration of custom IoT devices

### 6.1 ESP32 Firmware
- [ ] 🎯 Decide: ESPHome vs custom firmware
- [ ] 🎯 Create example: LED strip control
- [ ] 🎯 Publish to MQTT: `esp32/led-strip/status`
- [ ] 🎯 Subscribe to: `esp32/led-strip/set`

### 6.2 Database Integration
- [ ] 🎯 Add ESP32 devices to Device table
- [ ] 🎯 Create device types: `led_strip`, `sensor`

### 6.3 Demo Script
- [ ] 🎯 "Set the LED strip to blue"
- [ ] 🎯 "What's the temperature sensor reading?"

---

## Phase 7: Deployment & DevOps 🎯 OPTIONAL

### 7.1 Docker Containerization
- [ ] 🎯 Create `oracle/Dockerfile`
- [ ] 🎯 Multi-stage build for production
- [ ] 🎯 Test Docker image locally

### 7.2 Kubernetes Deployment
- [ ] 🎯 Create Helm chart for Oracle app
- [ ] 🎯 Deploy to existing K8s cluster
- [ ] 🎯 Configure ingress/load balancer
- [ ] 🎯 Test in production-like environment

### 7.3 CI/CD Pipeline
- [ ] 🎯 GitHub Actions workflow
- [ ] 🎯 Automated testing
- [ ] 🎯 Automated Docker builds
- [ ] 🎯 Deployment automation

---

## Phase 8: Presentation 🔴 DEMO CRITICAL

**Note:** Must start 2 weeks before presentation date

### 8.1 Slide Deck
- [ ] ⏳ Create presentation outline
- [ ] ⏳ Design slides in `presentation/slides/`
- [ ] ⏳ Architecture diagrams
- [ ] ⏳ Code snippets and explanations
- [ ] ⏳ Live demo plan

### 8.2 Demo Script
- [ ] ⏳ Write demo script with exact commands
- [ ] ⏳ Practice demo 10+ times
- [ ] ⏳ Create fallback scenarios
- [ ] ⏳ Record backup video

### 8.3 Demo Environment
- [ ] ⏳ Setup demo hardware (Pi 5, Z-Wave devices)
- [ ] ⏳ Test on demo WiFi/network
- [ ] ⏳ Prepare mobile hotspot backup
- [ ] ⏳ Test all devices day-before presentation

### 8.4 Code Walkthrough
- [ ] ⏳ Prepare code snippets to show
- [ ] ⏳ Highlight key LangChain tool implementation
- [ ] ⏳ Explain MQTT integration
- [ ] ⏳ Show streaming response code

---

## Progress Tracking

### Phase Completion
- **Phase 0:** Infrastructure - 7/23 (30%)
- **Phase 1:** Project Setup - 28/36 (78%)
- **Phase 2:** AI Chatbot - 6/~95 (6%)
- **Phase 3:** MQTT - 2/~15 (13%)
- **Phase 4:** Z-Wave - 0/~20 (0%)
- **Phase 5:** Voice - 0/~20 (0%) - Stretch Goal
- **Phase 6:** ESP32 - 0/~15 (0%) - Stretch Goal
- **Phase 7:** Deployment - 1/~25 (4%) - Optional
- **Phase 8:** Presentation - 0/~30 (0%)

### Next Immediate Actions

**This Week (DEMO CRITICAL):**
1. 🔴 Update device-list-tool to use Prisma database
2. 🔴 Update device-control-tool to use Prisma + MQTT
3. 🔴 Create MQTT client singleton
4. 🔴 Test end-to-end: Chat → Tool → Database → MQTT

**Next Week:**
5. 🔴 Setup zwave-js-ui on Raspberry Pi
6. 🔴 Pair Z-Wave devices
7. 🔴 Import devices to database
8. 🔴 Test full device control loop

**Week After:**
9. 🔴 Complete frontend polish
10. 🔴 Begin presentation materials
11. ⏳ Practice demo script

---

**See [delivered.md](./delivered.md) for all completed tasks.**
