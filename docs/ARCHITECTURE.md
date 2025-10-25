# System Architecture

**Last Updated:** 2025-10-22
**Project:** MQTT + Ollama Home Automation Demo

This document describes the complete system architecture including voice gateway, MQTT messaging, AI integration, and Z-Wave devices.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Raspberry Pi 5                            │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Oracle     │  │Voice Gateway │  │ ZWave MCP Server │  │
│  │  (Next.js)   │  │  OWW (Node)  │  │  (JavaScript)    │  │
│  │              │  │              │  │                  │  │
│  │ Port: 3000   │  │ MQTT-based   │  │ MCP Protocol     │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                    │             │
│         └─────────────────┼────────────────────┘             │
│                           │                                  │
│                    ┌──────▼──────┐                          │
│                    │  HiveMQ MQTT │                          │
│                    │    Broker    │                          │
│                    └──────┬───────┘                          │
│                           │                                  │
│                    ┌──────▼──────┐                          │
│                    │ zwave-js-ui  │                          │
│                    │  Z-Wave GW   │                          │
│                    └──────────────┘                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Details

### Oracle (Next.js + LangChain)

**Purpose:** Web-based chat interface for device control

**Tech Stack:**
- Next.js 15 (App Router)
- LangChain.js for AI orchestration
- Ollama for local LLM inference
- Prisma + SQLite for device registry
- MQTT.js for device communication

**Key Features:**
- Streaming chat interface (Server-Sent Events)
- LangChain tool calling for device control
- Device discovery and management
- Real-time MQTT integration

**API Endpoints:**
- `POST /api/chat` - Streaming chat with AI
- Device routes (future)

### Voice Gateway OWW

**Purpose:** Offline voice command processing

**Tech Stack:**
- Node.js 20
- OpenWakeWord (wake word detection)
- Whisper via Ollama (speech-to-text)
- ElevenLabs API (text-to-speech)
- MQTT.js for communication

**Voice Pipeline:**

```
User speaks "Hey Jarvis" → OpenWakeWord detects
↓
Record audio (VAD stops when silence detected)
↓
Whisper via Ollama transcribes → "Turn on living room light"
↓
Publish to voice/req topic
↓
Oracle receives, processes with LangChain
↓
Oracle publishes response to voice/res topic
↓
Voice Gateway receives response
↓
ElevenLabs synthesizes speech
↓
Play audio response to user
```

**State Machine:**

```
IDLE → WAKE_WORD_DETECTED → RECORDING → TRANSCRIBING
→ WAITING_FOR_AI → SPEAKING → IDLE
```

### Z-Wave MCP Server

**Purpose:** MCP interface for Claude Desktop/Code integration

**Tech Stack:**
- JavaScript
- @modelcontextprotocol/sdk
- MQTT.js for device communication
- zwave-js-ui integration

**MCP Tools:**
- `list_zwave_devices` - List all devices
- `control_zwave_device` - Turn on/off or set level
- `get_device_status` - Query current state

---

## MQTT Communication

### Broker

**Service:** HiveMQ CE
**Location:** `mqtt://localhost:1883` (or `10.0.0.58:31883` for external)
**Auth:** Anonymous (demo mode)

### Topic Structure

**Voice Communication:**
```
voice/req       - Voice transcriptions → Oracle
voice/res       - AI responses → Voice Gateway
voice/status    - Gateway status updates
```

**Z-Wave Device Control:**
```
# State updates (subscribe)
zwave/{Location/Device_Name}/command_class/endpoint_0/currentValue

# Control commands (publish)
zwave/{Location/Device_Name}/command_class/endpoint_0/targetValue/set
```

**Examples:**
```bash
# Turn on switch
Topic: zwave/Living_Room/switch_binary/endpoint_0/targetValue/set
Payload: {"value": true}

# Set dimmer to 50%
Topic: zwave/Kitchen_Light/switch_multilevel/endpoint_0/targetValue/set
Payload: {"value": 50}
```

### Message Flow

**Text Command (Oracle):**
```
User types "turn on living room light"
↓
Oracle chat API → LangChain agent
↓
Agent calls control_device tool
↓
Tool publishes MQTT: zwave/Living_Room/switch_binary/.../targetValue/set
↓
zwave-js-ui receives → sends Z-Wave command
↓
Device turns on
↓
Device publishes state: zwave/Living_Room/switch_binary/.../currentValue
↓
Oracle subscribes and updates database
```

**Voice Command:**
```
User says "Hey Jarvis, turn on living room light"
↓
Voice Gateway: Wake word → Record → Transcribe
↓
Publish to: voice/req {"session_id": "...", "text": "turn on..."}
↓
Oracle receives → same flow as text command
↓
Oracle publishes: voice/res {"session_id": "...", "text": "Done!"}
↓
Voice Gateway receives → Synthesize → Speak
```

---

## Data Flow

### Device Registry (Prisma)

**Schema:**
```javascript
model Device {
  id        Int     @id @default(autoincrement())
  name      String
  type      String  // "switch", "dimmer", "sensor"
  location  String
  state     String  // "on", "off"
  level     Int?    // 0-100 for dimmers
  nodeId    Int?    // Z-Wave node ID
  mqttTopic String? // Control topic
}
```

**Data Flow:**
```
zwave-js-ui detects devices
↓
Manual or script imports to Prisma
↓
LangChain tools query Prisma for device list
↓
MQTT state updates sync back to Prisma (optional)
```

---

## AI Integration

### LangChain Tools

**Device List Tool:**
```javascript
{
  name: "list_devices",
  description: "Lists all smart home devices",
  func: async () => {
    const devices = await prisma.device.findMany();
    return JSON.stringify(devices);
  }
}
```

**Device Control Tool:**
```javascript
{
  name: "control_device",
  description: "Controls a device by name",
  schema: z.object({
    deviceName: z.string(),
    action: z.enum(['on', 'off', 'dim']),
    level: z.number().optional()
  }),
  func: async ({ deviceName, action, level }) => {
    const device = await findDeviceByName(deviceName);
    const value = action === 'on' ? true :
                  action === 'off' ? false : level;
    await mqttClient.publish(device.mqttTopic, { value });
    return `Turned ${action} ${device.name}`;
  }
}
```

### Ollama Models

**For Voice Gateway (Speed Priority):**
- Model: `qwen2.5:0.5b`
- Performance: ~1s response time (warm)
- Use Case: Simple commands, conversational AI

**For Oracle (Accuracy Priority):**
- Model: `qwen2.5:3b` or `llama3.2:3b`
- Performance: ~2-4s response time
- Use Case: Complex reasoning, tool orchestration

---

## Security Considerations

### Current (Demo Mode)

- MQTT: Anonymous access
- zwave-js-ui: No authentication
- Network: Local LAN only

### Production Recommendations

- **MQTT:** Enable username/password auth, TLS encryption
- **zwave-js-ui:** Set admin password, restrict network access
- **Z-Wave:** Use S2 security for sensitive devices
- **Voice Gateway:** Implement wake word confirmation for critical commands
- **Oracle:** Add rate limiting, input validation

---

## Performance Characteristics

### Latency

| Component | Latency |
|-----------|---------|
| Wake word detection | ~30ms |
| Voice recording (VAD) | 1-3s |
| Whisper transcription | 1-2s |
| LangChain tool execution | 0.5-1s |
| MQTT publish | <10ms |
| Z-Wave command | 100-500ms |
| ElevenLabs TTS | 1-2s |
| Total (voice → action) | **4-9 seconds** |

### Resource Usage (Raspberry Pi 5)

| Service | CPU | Memory |
|---------|-----|--------|
| Ollama (idle) | 1-2% | 500MB |
| Ollama (inference) | 60-80% | 1.5GB |
| Oracle (Next.js) | 5-10% | 300MB |
| Voice Gateway | 5-10% | 100MB |
| OpenWakeWord | 2-5% | 80MB |
| MQTT Broker | <1% | 50MB |
| zwave-js-ui | 1-2% | 100MB |

---

## System Boundaries

### What Runs Locally

✅ **AI Processing:** Ollama models (fully local)
✅ **Wake Word:** OpenWakeWord (fully offline)
✅ **Speech-to-Text:** Whisper via Ollama (local)
✅ **Device Control:** MQTT + Z-Wave (local network)
✅ **Database:** SQLite (local file)

### What Requires Network

☁️ **Text-to-Speech:** ElevenLabs API (internet required)
☁️ **Model Downloads:** Ollama models, OpenWakeWord models (one-time)
☁️ **Package Installation:** npm packages (one-time)

### Fallback Strategy

**If Internet Unavailable:**
- Voice Gateway can still detect wake word
- Transcription still works (Whisper local)
- Device control still works (MQTT local)
- **Only TTS fails** - could add Piper TTS as offline fallback

---

## Deployment Options

### Development (macOS/Linux)

```bash
# Start Ollama
ollama serve

# Start MQTT broker (Docker)
docker run -p 1883:1883 hivemq/hivemq-ce

# Start Oracle
cd apps/oracle && npm run dev

# Start Voice Gateway (optional)
cd apps/voice-gateway-oww && node src/main.js
```

### Production (Raspberry Pi 5)

**Systemd Services:**
- `ollama.service` - Ollama runtime
- `oracle.service` - Next.js app
- `voice-gateway-oww.service` - Voice processing
- `hivemq.service` - MQTT broker
- `zwave-js-ui.service` - Z-Wave gateway

**See:**
- `/docs/oracle-systemd-setup.md` - Oracle service setup
- `/CLAUDE.md` - Voice Gateway systemd configuration

---

## Scaling Considerations

### Single Device (Current)

- All services on one Raspberry Pi 5
- Works for demo and home use
- Performance: Good for 5-10 devices

### Multi-Device

**Option 1: Separate MQTT Broker**
- Move HiveMQ to dedicated machine
- Reduces Pi load, improves reliability

**Option 2: Separate Ollama**
- Run Ollama on powerful desktop
- Pi only runs web interface
- Faster inference, better models possible

**Option 3: Distributed**
- MQTT broker on NAS/server
- Ollama on desktop GPU
- Oracle on Pi (lightweight)
- Voice Gateway on Pi (needs local audio)

---

## Related Documentation

- **Getting Started:** `/docs/GETTING-STARTED.md`
- **MQTT Setup:** `/docs/mqtt-setup.md`
- **Z-Wave Setup:** `/docs/zwave-setup-guide.md`
- **OpenWakeWord Guide:** `/docs/openwakeword-guide.md`
- **MCP Architecture:** `/docs/mcp-architecture.md`
- **Performance Tuning:** `/docs/performance-optimization.md`
- **Network Dependencies:** `/docs/network-dependencies.md`
