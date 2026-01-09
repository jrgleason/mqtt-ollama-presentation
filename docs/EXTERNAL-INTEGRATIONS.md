# External Integrations Reference

This document provides detailed information about all external integrations, including Z-Wave, MQTT, Auth0, Ollama, and environment variable configuration.

## Z-Wave (zwave-js-ui)

- **Approach:** Use zwave-js-ui MQTT integration as-is (not forking)
- **Integration:** Subscribe to MQTT topics published by zwave-js-ui
- **Documentation:** https://github.com/zwave-js/zwave-js-ui

### 🚨 CRITICAL: Z-Wave MQTT Topic Format 🚨

**DO NOT change the MQTT topic format in `apps/zwave-mcp-server/src/device-registry.js`**

This project uses **human-readable MQTT topics** that match Z-Wave JS UI's `nodeNames=true` configuration:

#### Correct Format (TESTED AND WORKING)

```
zwave/[Location/]Device_Name/command_class/endpoint_0/targetValue/set
```

#### Example

```bash
# Topic
zwave/Demo/Switch_One/switch_binary/endpoint_0/targetValue/set

# Payload
{"value": true}   # Turn ON
{"value": false}  # Turn OFF
```

#### Why This Format

- ✅ Matches Z-Wave JS UI configuration with `nodeNames=true`
- ✅ Human-readable device names and locations
- ✅ Tested and confirmed working with actual hardware
- ✅ Easier debugging and monitoring

#### WRONG Format (DO NOT USE)

```
zwave/{nodeId}/{commandClass}/0/targetValue/set  # ❌ WRONG - numeric format
```

### Z-Wave JS UI Configuration Required

```json
{
  "gateway": {
    "type": 1,
    "payloadType": 1,
    "nodeNames": true  // ← REQUIRED for human-readable topics
  }
}
```

### Command Class Mapping

- 37 → `switch_binary` (On/Off switches)
- 38 → `switch_multilevel` (Dimmers)
- 49 → `sensor_multilevel` (Sensors)
- 64 → `thermostat_mode` (Thermostats)

### See Also

- `apps/zwave-mcp-server/README.md` - Complete MQTT topic documentation
- `apps/zwave-mcp-server/src/device-registry.js` - Topic building implementation

## MQTT Integration

**Current Approach:** Direct MQTT integration from the app using LangChain tools.

- LangChain tool decorator wraps MQTT.js client
- User request → Tool call → MQTT publish → Physical device responds
- Simple, reliable, and easy to demonstrate

**Note:** The MCP server approach has been archived. See `docs/requirements.md` for details.

### HiveMQ Broker Configuration

**Broker:** HiveMQ (existing setup at https://github.com/jrgleason/home-infra/tree/main/mqtt)

**Ports:**
- MQTT Port: 31883 (NodePort)
- WebSocket Port: 30000 (path: /mqtt)
- Control Center: 30080 (HTTP)

**Authentication:** Anonymous (demo mode)
- **TECH DEBT:** Enable RBAC for production

**Connection Details:**
- MQTT.js + LangChain tool decorator
- Using existing HiveMQ broker running in Kubernetes

## Auth0 Authentication

- **Type:** OIDC SPA authentication
- **SDK:** @auth0/nextjs-auth0
- **Storage:** Server-side sessions

### Required Environment Variables

```bash
AUTH0_SECRET=<random-secret-min-32-chars>
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://YOUR_DOMAIN.auth0.com
AUTH0_CLIENT_ID=<your-client-id>
AUTH0_CLIENT_SECRET=<your-client-secret>
```

### Configuration Steps

1. Create Auth0 application (Regular Web Application)
2. Configure Allowed Callback URLs: `http://localhost:3000/api/auth/callback`
3. Configure Allowed Logout URLs: `http://localhost:3000`
4. Copy Client ID and Client Secret to environment variables
5. Generate random secret for AUTH0_SECRET (min 32 characters)

### Troubleshooting

- Verify callback URLs in Auth0 dashboard
- Check environment variables are set correctly
- Clear browser cookies/cache if authentication fails
- Check Auth0 dashboard logs for errors

## Ollama Local LLM

- **Connection:** HTTP API (default port 11434)
- **Models:** Downloaded locally, not bundled
- **Configuration:** Model selection configurable via env vars

### Setup

```bash
# Install Ollama
# See: https://ollama.ai/download

# Pull recommended models
ollama pull qwen2.5:0.5b    # For voice gateway (speed)
ollama pull qwen2.5:3b      # For oracle app (accuracy)

# Verify Ollama is running
curl http://localhost:11434/api/tags
```

### Model Selection by Module

- **Voice Gateway:** `qwen2.5:0.5b` (optimized for speed, ~1s response)
- **Oracle App:** `qwen2.5:3b` or larger (optimized for accuracy)

### Environment Variables

```bash
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:0.5b  # For voice-gateway-oww (speed optimized)
# OLLAMA_MODEL=qwen2.5:3b   # For oracle module (accuracy optimized)
```

### See Also

- `docs/TECH-STACK.md` - Detailed model recommendations and performance benchmarks
- `docs/PERFORMANCE.md` - Optimization techniques

## Environment Variables Reference

### All Modules

**All environment variables MUST be:**
- Documented in `.env.example`
- Never committed with real values
- Loaded via Next.js env system or process.env
- Validated at startup

### Oracle Module (Next.js App)

```bash
# Auth0
AUTH0_SECRET=<random-secret-min-32-chars>
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://YOUR_DOMAIN.auth0.com
AUTH0_CLIENT_ID=<your-client-id>
AUTH0_CLIENT_SECRET=<your-client-secret>

# Database
DATABASE_URL=file:./dev.db

# MQTT (Local Mosquitto broker or HiveMQ)
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=
MQTT_PASSWORD=

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b   # For oracle module (accuracy optimized)

# App
NODE_ENV=development
PORT=3000
```

### Voice Gateway OWW Module

```bash
# Node Environment
NODE_ENV=production
LOG_LEVEL=info

# OpenWakeWord Configuration
OWW_MODEL_PATH=models/hey_jarvis_v0.1.onnx
OWW_THRESHOLD=0.25
OWW_INFERENCE_FRAMEWORK=onnx

# Audio Configuration
AUDIO_MIC_DEVICE=plughw:3,0
AUDIO_SPEAKER_DEVICE=plughw:2,0
AUDIO_SAMPLE_RATE=16000
AUDIO_CHANNELS=1

# Voice Activity Detection (VAD)
VAD_TRAILING_SILENCE_MS=1500
VAD_MAX_UTTERANCE_MS=10000

# Whisper Speech-to-Text
WHISPER_MODEL=tiny
WHISPER_MODEL_PATH=models/ggml-tiny.bin

# MQTT Broker
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_CLIENT_ID=voice-gateway-oww
MQTT_USERNAME=
MQTT_PASSWORD=

# Health Check
HEALTHCHECK_PORT=3002

# Ollama AI Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:0.5b  # For voice-gateway-oww (speed optimized)

# Text-to-Speech (ElevenLabs)
TTS_ENABLED=true
TTS_VOLUME=1.0
TTS_SPEED=1.0
ELEVENLABS_API_KEY=<your-api-key>
ELEVENLABS_VOICE_ID=JBFqnCBsd6RMkjVDRZzb
ELEVENLABS_MODEL_ID=eleven_multilingual_v2
```

### Getting ElevenLabs API Key

1. Sign up at https://elevenlabs.io
2. Navigate to Settings > API Keys
3. Create new API key
4. Add to environment variables or systemd service file

### Network Dependencies

See `docs/network-dependencies.md` for complete documentation of all network/internet dependencies.

**Summary of network dependencies:**
- ☁️ **Auth0** - Authentication (internet required during demo)
- ☁️ **ElevenLabs TTS** - Text-to-speech (internet required, fallback: disable TTS)
- 🔽 **Ollama models** - One-time download (pre-cache before demo)
- 📦 **npm packages** - One-time install (pre-install before demo)
- 🏠 **MQTT broker** - Local network only
- 🤖 **Ollama runtime** - Local network only
- 📡 **Z-Wave devices** - Local radio (not even WiFi)

## Local-First Architecture Principles

This project prioritizes **local-first architecture** - all AI processing, device control, and data storage happens locally without cloud dependencies (except for Auth0 authentication and ElevenLabs TTS).

**Design Principles:**
- ✅ Local processing > Cloud processing
- ✅ Offline-capable > Internet-required
- ✅ Demo reliability > Feature complexity

**When adding ANY code that requires network access:**
1. Check if it's truly necessary
2. Document in `docs/network-dependencies.md`
3. Defend the decision with clear rationale
4. Document backup plan for network failures
