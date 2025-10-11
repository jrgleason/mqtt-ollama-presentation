# Technical Requirements

## Project Overview
CodeMash 2026 presentation demonstrating local AI-powered home automation using MQTT + Ollama, running entirely on local infrastructure without cloud dependencies.

**Presentation Date:** January 12, 2026
**Presentation Title:** MQTT + Ollama = Building Home Automation That Actually Works (And Doesn't Spy on You)

---

## Functional Requirements

### FR1: Natural Language Command Processing
- **FR1.1:** System SHALL accept natural language commands via text input
- **FR1.2:** System SHALL parse commands using local Ollama LLM
- **FR1.3:** System SHALL support contextual/conversational commands (e.g., "turn it off" referring to previously mentioned device)
- **FR1.4:** System SHALL provide conversational responses with configurable personality
- **FR1.5:** System SHALL handle ambiguous commands gracefully with clarifying questions

**Example commands:**
- "Turn off all the lights"
- "Make the living room cozy for movie night"
- "Set the thermostat to 72 degrees"
- "Dim the bedroom lights to 30%"

---

### FR2: MQTT Device Control
- **FR2.1:** System SHALL publish commands to MQTT broker
- **FR2.2:** System SHALL subscribe to device state topics
- **FR2.3:** System SHALL discover available devices by reading MQTT topics
- **FR2.4:** System SHALL maintain device state cache
- **FR2.5:** System SHALL handle device offline/unavailable states

---

### FR3: Z-Wave Integration
- **FR3.1:** System SHALL integrate with zwave-js-ui via MQTT
- **FR3.2:** System SHALL support common Z-Wave device types:
  - Binary switches (on/off)
  - Multilevel switches (dimmers)
  - Sensors (temperature, motion, door/window)
  - Thermostats
- **FR3.3:** System SHALL map Z-Wave devices to friendly names
- **FR3.4:** System SHALL handle Z-Wave device events

---

### FR4: Authentication & Authorization
- **FR4.1:** System SHALL use Auth0 OIDC SPA authentication
- **FR4.2:** System SHALL protect all API endpoints with JWT validation
- **FR4.3:** System SHALL support user sessions
- **FR4.4:** System SHALL handle token refresh
- **FR4.5:** (Optional) System MAY support role-based access control

---

### FR5: Data Persistence
- **FR5.1:** System SHALL store user preferences in SQLite
- **FR5.2:** System SHALL store device mappings (MQTT topic → friendly name → room)
- **FR5.3:** System SHALL optionally store conversation history
- **FR5.4:** System SHALL store command templates/shortcuts
- **FR5.5:** System SHALL support data export/import for backup

---

### FR6: Voice Commands (Stretch Goal)
**Architecture Decision:** Separate `voice-gateway` Node.js service (not integrated into Oracle)

- **FR6.1:** System SHALL accept voice input via USB microphone (LANDIBO GSH23, hw:2,0)
- **FR6.2:** System SHALL detect wake word "Computer" using Porcupine (Picovoice)
- **FR6.3:** System SHALL record audio after wake word with Voice Activity Detection (WebRTC VAD)
  - Trailing silence timeout: 1.5 seconds
  - Max utterance length: 10 seconds
  - 16kHz mono PCM format
- **FR6.4:** System SHALL transcribe speech using local Whisper model (whisper.cpp + base model)
  - Transcription latency target: < 2 seconds
  - Model size: ~74MB (pre-downloaded)
- **FR6.5:** System SHALL publish transcriptions to MQTT `voice/req` topic
  - Payload: `{transcription: string, timestamp: ISO8601, session_id: uuid}`
- **FR6.6:** System SHALL subscribe to MQTT `voice/res` topic for AI responses
  - Payload: `{response: string, session_id: uuid, timestamp: ISO8601}`
- **FR6.7:** System SHALL integrate with Oracle chatbot via MQTT (text-only responses)
  - Voice requests forwarded to `/api/chat` logic
  - No TTS playback (text logging only for MVP)
- **FR6.8:** System SHALL handle background noise and audio errors gracefully
  - Beep on STT failure
  - Auto-restart wake word loop after errors
  - Back-pressure: Disable wake word during processing

---

### FR7: ESP32 Integration (Stretch Goal)
- **FR7.1:** System SHALL support ESP32 devices via MQTT
- **FR7.2:** Demo SHALL include at least one ESP32 example:
  - Temperature/humidity sensor
  - LED strip control
  - Button/switch input
- **FR7.3:** System SHALL provide firmware template for ESP32

---

## Non-Functional Requirements

### NFR1: Performance
- **NFR1.1:** LLM response time SHALL be < 5 seconds for simple commands
- **NFR1.2:** MQTT message latency SHALL be < 500ms
- **NFR1.3:** Device state updates SHALL reflect in UI within 1 second
- **NFR1.4:** Voice transcription SHALL complete within 2 seconds

---

### NFR2: Reliability
- **NFR2.1:** System SHALL handle MQTT broker disconnections gracefully
- **NFR2.2:** System SHALL retry failed device commands (max 3 attempts)
- **NFR2.3:** System SHALL log all errors for debugging
- **NFR2.4:** System SHALL provide health check endpoints
- **NFR2.5:** Demo SHALL have backup/fallback mechanisms for presentation

---

### NFR3: Scalability
- **NFR3.1:** System SHALL support at least 50 concurrent devices
- **NFR3.2:** System SHALL support at least 10 concurrent users
- **NFR3.3:** System SHALL handle conversation context for at least 10 previous messages

---

### NFR4: Security
- **NFR4.1:** All API endpoints SHALL require authentication
- **NFR4.2:** MQTT broker SHALL support authentication (username/password minimum)
- **NFR4.3:** Sensitive configuration SHALL be stored in environment variables
- **NFR4.4:** System SHALL NOT log sensitive data (passwords, tokens)
- **NFR4.5:** Production deployment SHALL support TLS/SSL

---

### NFR5: Maintainability
- **NFR5.1:** Code SHALL follow TypeScript best practices
- **NFR5.2:** Code SHALL include JSDoc/TSDoc comments
- **NFR5.3:** All functions SHALL have type definitions
- **NFR5.4:** Project SHALL include comprehensive README
- **NFR5.5:** Project SHALL include setup/deployment documentation

---

### NFR6: Usability
- **NFR6.1:** Web interface SHALL be responsive (mobile-friendly)
- **NFR6.2:** System SHALL provide clear error messages to users
- **NFR6.3:** AI responses SHALL be conversational and personality-driven
- **NFR6.4:** System SHALL support dark/light theme
- **NFR6.5:** Voice feedback SHALL be clear and natural

---

## Technical Stack Requirements

### Backend
- **Language:** TypeScript/Node.js (v20+)
- **Framework:** Next.js 14+ (App Router or Pages)
- **LLM Integration:** LangChain.js with Ollama
- **Database:** SQLite with Prisma or Drizzle ORM
- **Authentication:** Auth0 SDK for Next.js
- **MQTT Client:** MQTT.js
- **Testing:** Jest + Testing Library

### Frontend
- **Framework:** React 18+ (via Next.js)
- **UI Library:** TailwindCSS + shadcn/ui or Material-UI
- **State Management:** React Context or Zustand
- **Forms:** React Hook Form + Zod validation
- **API Client:** Fetch or Axios

### AI/ML
- **LLM Runtime:** Ollama
- **Recommended Models:**
  - Primary: Qwen2.5:1.5b or Gemma2:2b
  - Alternative: Phi-3.5-mini-instruct
- **Voice Recognition:** Whisper (whisper.cpp + base model, ~74MB)
- **Wake Word:** Porcupine (Picovoice) with "Computer" keyword
- **Voice Activity Detection:** WebRTC VAD (C++ bindings)

### IoT/Hardware
- **MQTT Broker:** Mosquitto
- **Z-Wave:** zwave-js-ui (official or forked)
- **ESP32:** Arduino or ESP-IDF framework
- **Z-Wave Controller:** USB stick (Aeotec Z-Stick 7, Zooz ZST10, etc.)

### DevOps
- **Containerization:** Docker + Docker Compose
- **Orchestration:** Kubernetes with Helm charts
- **CI/CD:** GitHub Actions
- **Registry:** Docker Hub or GitHub Container Registry

---

## Hardware Requirements

### Minimum Development Environment
- **CPU:** 4-core processor (Intel i5/Ryzen 5 or better)
- **RAM:** 16GB minimum
- **Storage:** 20GB free space (for models)
- **OS:** Windows, macOS, or Linux

### Recommended Demo Hardware
- **Option A (Laptop):**
  - Modern laptop (8-core, 32GB RAM)
  - USB Z-Wave stick
  - 1-2 physical Z-Wave devices for demo

- **Option B (Raspberry Pi 5):**
  - Raspberry Pi 5 8GB RAM
  - Active cooling solution
  - NVMe SSD (via PCIe)
  - USB Z-Wave stick
  - Z-Wave devices

- **Option C (Hybrid):**
  - Laptop runs Next.js + MQTT
  - Pi 5 runs Ollama
  - USB Z-Wave stick on Pi

### ESP32 (Stretch Goal)
- ESP32-DevKit-C or similar
- Sensors/actuators (DHT22, LED strip, buttons, etc.)
- USB cable for programming

---

## Deployment Requirements

### Development
- **Docker Compose** with services:
  - Next.js app (port 3000)
  - Ollama (port 11434)
  - Mosquitto MQTT (port 1883)
  - SQLite (file-based)

### Production/Demo
- **Kubernetes cluster** or **standalone Docker**
- **Helm charts** for each service
- **Persistent volumes** for:
  - SQLite database
  - Ollama models
  - MQTT persistence
- **Load balancer** (optional)

---

## Data Requirements

### SQLite Schema (Initial)

```sql
-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  auth0_id TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Devices table
CREATE TABLE devices (
  id TEXT PRIMARY KEY,
  mqtt_topic TEXT UNIQUE NOT NULL,
  friendly_name TEXT NOT NULL,
  device_type TEXT NOT NULL,
  room TEXT,
  capabilities JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User preferences table
CREATE TABLE user_preferences (
  user_id TEXT PRIMARY KEY,
  personality TEXT DEFAULT 'helpful',
  voice_enabled BOOLEAN DEFAULT false,
  theme TEXT DEFAULT 'dark',
  preferences JSON,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Conversation history (optional)
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  message TEXT NOT NULL,
  role TEXT NOT NULL, -- 'user' or 'assistant'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Command shortcuts
CREATE TABLE shortcuts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  command TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## API Requirements

### REST API Endpoints

```
POST   /api/auth/login          - Initiate Auth0 login
POST   /api/auth/logout         - Logout user
GET    /api/auth/me             - Get current user

GET    /api/devices             - List all devices
GET    /api/devices/:id         - Get device details
POST   /api/devices/:id/command - Send command to device
GET    /api/devices/:id/state   - Get device state

POST   /api/chat                - Send natural language command
GET    /api/chat/history        - Get conversation history
DELETE /api/chat/history        - Clear conversation history

POST   /api/voice/transcribe    - Transcribe audio to text
POST   /api/voice/command       - Process voice command

GET    /api/shortcuts           - List user shortcuts
POST   /api/shortcuts           - Create shortcut
PUT    /api/shortcuts/:id       - Update shortcut
DELETE /api/shortcuts/:id       - Delete shortcut

GET    /api/health              - Health check
GET    /api/metrics             - System metrics
```

### WebSocket/Server-Sent Events
```
WS     /api/events              - Real-time device updates
```

---

## Testing Requirements

### Unit Tests
- All utility functions
- All LangChain tools
- Database operations
- MQTT message handlers

### Integration Tests
- API endpoints
- Auth0 integration
- MQTT pub/sub
- Device control flow

### E2E Tests
- Complete user flows
- Voice command processing
- Device discovery and control

### Demo/Manual Tests
- Hardware device integration
- Network reliability
- Presentation walkthrough
- Failure scenarios

---

## Documentation Requirements

### Code Documentation
- README.md with quick start
- API documentation (OpenAPI/Swagger)
- Architecture diagrams
- Database schema documentation
- Environment variable reference

### Presentation Materials
- Slide deck (PowerPoint/Google Slides)
- Live demo script
- Backup demo video
- Code walkthrough notes
- Audience handout (QR codes, links)

### Deployment Documentation
- Docker Compose setup
- Kubernetes/Helm deployment
- Z-Wave controller setup
- MQTT broker configuration
- Troubleshooting guide

---

## Success Criteria

### MVP (Minimum Viable Product)
- ✅ User can authenticate via Auth0
- ✅ User can send text commands
- ✅ System translates commands to MQTT messages
- ✅ Z-Wave devices respond to commands
- ✅ System provides conversational AI responses
- ✅ Demo runs reliably on laptop or Pi

### Stretch Goals
- ✅ Voice commands with Whisper
- ✅ Wake word detection
- ✅ ESP32 integration example
- ✅ Mobile-responsive UI
- ✅ Dark/light theme support

### Presentation Success
- ✅ Live demo completes without major failures
- ✅ Audience engagement (laughs, questions, interest)
- ✅ Code walkthrough is clear and valuable
- ✅ Materials are available for attendees to recreate
- ✅ Positive feedback/reviews