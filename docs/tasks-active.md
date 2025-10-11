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

## Phase 5: Voice Integration 🎯 STRETCH GOAL

**Goal:** Add offline, Alexa-style voice commands using wake word → STT → chat → text response

**Architecture:** Separate `voice-gateway` Node.js service alongside Oracle app
- Wake word detection (Porcupine)
- Audio recording with VAD (WebRTC VAD)
- Speech-to-text (whisper.cpp + base model)
- MQTT integration with Oracle chatbot
- Text-only responses initially (TTS deferred)

**Hardware:**
- Raspberry Pi 5 16GB (same device as Oracle)
- USB Microphone: LANDIBO GSH23 (16kHz, hw:2,0 - "USB PnP Sound Device")
- USB DAC/Speaker: TBD (for future TTS playback)

**MQTT Contract:**
```
voice/req  → {transcription: string, timestamp: ISO8601, session_id: uuid}
voice/res  ← {response: string, session_id: uuid, timestamp: ISO8601}
voice/status → {state: "listening"|"recording"|"processing"|"idle"|"error", wake_word_active: boolean}
```

---

### 5.1: Voice Gateway Project Setup (5 tasks)
- [ ] 🎯 5.1.1: Create `voice-gateway/` directory structure
  - [ ] `src/main.ts` - Entry point
  - [ ] `src/wakeword.ts` - Porcupine integration
  - [ ] `src/recorder.ts` - ALSA capture + VAD
  - [ ] `src/stt.ts` - whisper.cpp wrapper
  - [ ] `src/mqtt.ts` - MQTT client (publish/subscribe)
  - [ ] `src/audio.ts` - ALSA playback utilities (for future TTS)
  - [ ] `src/config.ts` - Environment configuration
  - [ ] `models/` directory (gitignored, for downloaded models)
- [ ] 🎯 5.1.2: Create `voice-gateway/package.json`
  - Dependencies: `@picovoice/porcupine-node`, `node-webrtc-vad`, `mqtt`, `wav`, ALSA bindings
  - Scripts: `dev`, `build`, `start`, `setup` (model downloads)
- [ ] 🎯 5.1.3: Create `voice-gateway/Dockerfile`
  - Base: Node 20 + ALSA dev libraries
  - Copy source + install deps
  - Download models at build time
  - Expose health check port
- [ ] 🎯 5.1.4: Create `voice-gateway/.env.example`
  ```env
  # Porcupine
  PORCUPINE_ACCESS_KEY=your_picovoice_access_key
  PORCUPINE_KEYWORD=computer
  PORCUPINE_SENSITIVITY=0.5

  # Audio (ALSA)
  ALSA_MIC_DEVICE=hw:2,0  # USB PnP Sound Device
  ALSA_SPEAKER_DEVICE=hw:1,0  # TBD
  SAMPLE_RATE=16000

  # VAD
  VAD_TRAILING_SILENCE_MS=1500
  VAD_MAX_UTTERANCE_MS=10000

  # Whisper
  WHISPER_MODEL=base
  WHISPER_MODEL_PATH=./models/ggml-base.bin

  # MQTT
  MQTT_BROKER_URL=mqtt://10.0.0.58:31883
  MQTT_CLIENT_ID=voice-gateway

  # Logging
  LOG_LEVEL=info
  ```
- [ ] 🎯 5.1.5: Create `voice-gateway/scripts/setup.sh`
  - Install system dependencies (libasound2-dev)
  - Download Porcupine wake word model (if not embedded)
  - Download whisper-base model from Hugging Face
  - Test ALSA mic access: `arecord -D hw:2,0 -d 3 -f S16_LE -r 16000 test.wav`
  - Print setup completion + next steps

---

### 5.2: Wake Word Detection (Porcupine) (4 tasks)
- [ ] 🎯 5.2.1: Setup Picovoice account and get access key
  - Create free account at https://console.picovoice.ai
  - Generate Access Key
  - Select "Computer" built-in keyword
  - Document API key in `.env` (not committed)
- [ ] 🎯 5.2.2: Implement `src/wakeword.ts` - Porcupine integration
  - Initialize Porcupine with access key + keyword
  - Open ALSA mic stream (16kHz, mono PCM, 512-frame chunks)
  - Feed audio frames to Porcupine detector
  - Return Promise on wake word detection
  - Cleanup resources on stop
- [ ] 🎯 5.2.3: Implement wake word loop in `src/main.ts`
  - Start Porcupine listener on app start
  - On wake word detection:
    - Log event with timestamp
    - Publish `voice/status` → `{state: "recording", wake_word_active: false}`
    - Trigger recorder (5.3)
  - Auto-restart loop after each detection
- [ ] 🎯 5.2.4: Test wake word detection
  - Say "Computer" → verify console log
  - Measure false positive rate (leave running 5 min)
  - Adjust sensitivity if needed (env var)
  - Document: "Say 'Computer' clearly within 3 feet of mic"

---

### 5.3: Audio Recording + VAD (4 tasks)
- [ ] 🎯 5.3.1: Implement `src/recorder.ts` - PCM buffer capture
  - Continue reading from ALSA mic after wake word
  - Buffer audio in memory (16kHz mono PCM)
  - Max buffer size: 10 seconds (VAD_MAX_UTTERANCE_MS)
  - Return captured audio as Buffer
- [ ] 🎯 5.3.2: Integrate WebRTC VAD for silence detection
  - Install `node-webrtc-vad` or `@svanttecnologia/vad` (C++ binding)
  - Initialize VAD with 16kHz sample rate
  - Process each audio frame (10ms = 160 samples at 16kHz)
  - Detect trailing silence: 1.5s continuous silence → stop recording
- [ ] 🎯 5.3.3: Add max utterance length cap
  - If recording exceeds 10 seconds → force stop
  - Log warning: "Utterance truncated at 10s"
  - Prevents memory issues from continuous speech
- [ ] 🎯 5.3.4: Save captured audio as WAV file (temp)
  - Use `wav` npm package to write PCM → WAV
  - Save to `/tmp/voice-recording-{timestamp}.wav`
  - Pass WAV path to STT module
  - Auto-cleanup: Delete WAV after transcription

---

### 5.4: Speech-to-Text (whisper.cpp) (4 tasks)
- [ ] 🎯 5.4.1: Install whisper.cpp + Node.js bindings
  - Clone `https://github.com/ggerganov/whisper.cpp`
  - Build C++ library: `make`
  - Install Node binding: `npm install whisper-node` or compile manually
  - Alternative: Use `@svanttecnologia/whisper` (pre-built bindings)
- [ ] 🎯 5.4.2: Download & cache whisper-base model
  - Download `ggml-base.bin` (~74MB) from Hugging Face
  - Save to `voice-gateway/models/`
  - Verify model loads on app start
  - Fallback: whisper-tiny if base doesn't fit in memory
- [ ] 🎯 5.4.3: Implement `src/stt.ts` - Transcription function
  ```typescript
  async function transcribe(wavFilePath: string): Promise<string> {
    const whisper = new Whisper(WHISPER_MODEL_PATH);
    const result = await whisper.transcribe(wavFilePath, {
      language: 'en',
      temperature: 0.0, // Deterministic output
    });
    return result.text.trim();
  }
  ```
- [ ] 🎯 5.4.4: Test transcription accuracy
  - Record test utterance: "Turn on the living room lights"
  - Verify output: Expected vs actual transcription
  - Measure latency: Recording stop → transcription complete
  - Document: Average transcription time (~1-2s for 5s audio)

---

### 5.5: MQTT Integration (3 tasks)
- [ ] 🎯 5.5.1: Implement `src/mqtt.ts` - MQTT client
  - Connect to HiveMQ broker (`mqtt://10.0.0.58:31883`)
  - Publish function: `publishVoiceRequest(transcription: string, sessionId: string)`
  - Subscribe to `voice/res` topic
  - Handle connection errors + auto-reconnect
- [ ] 🎯 5.5.2: Publish transcriptions to `voice/req` topic
  - On successful transcription:
    - Generate session_id (uuid v4)
    - Publish JSON payload:
      ```json
      {
        "transcription": "turn on the living room lights",
        "timestamp": "2025-10-11T15:30:00Z",
        "session_id": "abc-123-def"
      }
      ```
    - Log: "Sent voice request: {transcription}"
- [ ] 🎯 5.5.3: Subscribe to `voice/res` and log responses
  - Listen for responses matching session_id
  - Log response text: "AI replied: {response}"
  - Publish `voice/status` → `{state: "idle", wake_word_active: true}`
  - Future: Pipe response to TTS (Phase 5.6)

---

### 5.6: Text-to-Speech (Piper) - DEFERRED 🎯
**Note:** TTS implementation deferred per user request. Voice gateway will only handle wake word → STT → MQTT → text response logging. Oracle app will return text responses via MQTT.

- [ ] 🎯 5.6.1: Research Piper TTS installation (FUTURE)
- [ ] 🎯 5.6.2: Implement TTS synthesis (FUTURE)
- [ ] 🎯 5.6.3: Implement ALSA playback queue (FUTURE)

**Current MVP:** Voice gateway logs text responses to console. User reads AI response from Oracle web UI.

---

### 5.7: Resilience & Monitoring (5 tasks)
- [ ] 🎯 5.7.1: Implement health check endpoint
  - Add simple HTTP server on port 3001
  - `GET /health` → `{status: "ok", wake_word_active: boolean, uptime: number}`
  - Used by Docker healthcheck + Kubernetes liveness probe
- [ ] 🎯 5.7.2: Add metrics logging
  - Wake word detections per hour
  - STT latency (median, p95, p99)
  - MQTT publish success rate
  - Failed transcriptions count
  - Log to stdout (structured JSON for Kubernetes)
- [ ] 🎯 5.7.3: Implement auto-restart logic after errors
  - If Porcupine crashes → restart wake word loop
  - If STT fails → log error, beep (optional), restart loop
  - If MQTT disconnects → queue requests (max 10), reconnect
  - Max consecutive failures before process exit: 5
- [ ] 🎯 5.7.4: Add back-pressure protection
  - Disable wake word detection during:
    - Active recording
    - STT processing
    - TTS playback (future)
  - Prevents overlapping commands
  - Re-enable wake word only when `state === "idle"`
- [ ] 🎯 5.7.5: Write end-to-end test script
  - `scripts/test-voice-e2e.sh`:
    - Start voice-gateway in background
    - Play pre-recorded audio: "Computer, what devices are available?"
    - Verify MQTT message published to `voice/req`
    - Mock Oracle response on `voice/res`
    - Verify voice-gateway logs response
  - Document: "Run before live demo"

---

### 5.8: Oracle Integration (3 tasks)
- [ ] 🎯 5.8.1: Update Oracle to subscribe to `voice/req` MQTT topic
  - Add subscription in `oracle/src/lib/mqtt/client.ts`
  - On message received:
    - Extract `transcription` and `session_id`
    - Log: "Voice request: {transcription}"
    - Forward to existing `/api/chat` logic
- [ ] 🎯 5.8.2: Update Oracle to publish responses to `voice/res`
  - After LangChain agent generates response:
    - Publish to `voice/res`:
      ```json
      {
        "response": "Turning on the living room lights now.",
        "session_id": "abc-123-def",
        "timestamp": "2025-10-11T15:30:02Z"
      }
      ```
  - Keep web UI response unchanged
  - Voice and text chat use same backend logic
- [ ] 🎯 5.8.3: Test end-to-end voice → chat → MQTT flow
  - Say "Computer, turn on the living room lights"
  - Verify Oracle logs transcription
  - Verify device control MQTT message sent
  - Verify response published to `voice/res`
  - Verify voice-gateway logs AI response

---

### 5.9: Documentation & Demo (4 tasks)
- [ ] 🎯 5.9.1: Write `voice-gateway/README.md`
  - Architecture overview
  - Hardware requirements (LANDIBO GSH23 mic)
  - Installation instructions (`npm install` + `npm run setup`)
  - Configuration (`.env` variables)
  - Running: `npm run dev` (development) or `npm start` (production)
  - Troubleshooting: ALSA device not found, Porcupine API errors
- [ ] 🎯 5.9.2: Document ALSA device configuration
  - Create `docs/alsa-setup.md`
  - How to find USB mic device: `arecord -l`
  - How to test mic: `arecord -D hw:2,0 -f S16_LE -r 16000 -d 3 test.wav && aplay test.wav`
  - Setting correct device in `.env`
  - Troubleshooting: Permissions, device busy, wrong format
- [ ] 🎯 5.9.3: Add voice demo to presentation materials
  - Update `presentation/slides/` with voice architecture diagram
  - Add demo script: Live voice command during presentation
  - Backup plan: If voice fails, show pre-recorded video
  - Practice saying "Computer, turn on the living room lights" clearly
- [ ] 🎯 5.9.4: Update main README.md with voice instructions
  - Add "Voice Commands (Optional)" section
  - Link to `voice-gateway/README.md`
  - Document: "Say 'Computer' followed by your command"
  - Note: TTS responses not implemented (text only)

---

### 5.10: Network Dependencies (1 task)
- [ ] 🎯 5.10.1: Document voice model downloads in `docs/network-dependencies.md`
  - **Porcupine wake word model**: Embedded in SDK (~5MB, one-time)
  - **Whisper base model**: 74MB download from Hugging Face (one-time, cached)
  - **Pre-demo checklist**: Run `npm run setup` with internet, verify models cached
  - **Demo mitigation**: Models downloaded at Docker build time, no internet needed at runtime

---

## Phase 5 Summary

**Total Tasks:** 30 tasks across 10 subsections
**Estimated Time:** ~25-30 hours
**Priority:** 🎯 Stretch Goal (Optional for CodeMash demo)

**Key Decisions Made:**
1. ✅ Separate `voice-gateway` service (not integrated into Oracle)
2. ✅ Porcupine for wake word ("Computer")
3. ✅ whisper.cpp + base model for STT
4. ✅ WebRTC VAD for silence detection
5. ✅ Text-only responses (TTS deferred to future)
6. ✅ MQTT integration with Oracle chatbot
7. ✅ ALSA for audio I/O (USB PnP Sound Device hw:2,0)

**Pre-Demo Requirements:**
- [ ] Picovoice account created + access key obtained
- [ ] Whisper base model downloaded (~74MB)
- [ ] USB microphone tested: `arecord -l` shows hw:2,0
- [ ] MQTT broker accessible from Pi
- [ ] End-to-end test passing (5.7.5)

**Phase 5 Completion:** 0/30 (0%)

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
- **Phase 5:** Voice - 0/30 (0%) - Stretch Goal
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
