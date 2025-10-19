# Claude Code Guidelines for MQTT + Ollama Home Automation

## Project Overview
This is a **multi-module CodeMash presentation project** demonstrating local AI-powered home automation using:
- Next.js with LangChain.js and Ollama
- MQTT for device communication
- zwave-js-ui for Z-Wave device control
- SQLite for local database storage
- Auth0 for authentication
- Docker + Helm for deployment

**Presentation Date:** January 12, 2026

---

## Important Project Rules

### 0. JavaScript Only - NO TypeScript!

**🚫 CRITICAL RULE: NEVER USE TYPESCRIPT IN THIS PROJECT 🚫**

**Absolutely forbidden:**
- ❌ NO `.ts` or `.tsx` files
- ❌ NO type annotations (`: string`, `: number`, etc.)
- ❌ NO TypeScript interfaces or types
- ❌ NO `tsconfig.json` files
- ❌ NO TypeScript-specific syntax

**Always use:**
- ✅ JavaScript files (`.js` and `.jsx` only)
- ✅ Plain ES6+ JavaScript
- ✅ Zod for runtime validation (instead of TypeScript types)
- ✅ JSDoc comments for documentation (optional)

**Why:** This project has been converted to pure JavaScript for simplicity and to avoid TypeScript overhead.

---

### 1. Server Commands
**NEVER run server commands like:**
- `npm run dev`
- `npm start`
- `next dev`
- `node server.js`
- Any command that starts a long-running server process

**Why:** These should be run manually by the user in their own terminal so they can control and monitor the server.

**Exceptions:** You MAY run:
- `npm install` or package installation
- `npm run build` for production builds
- `npm test` for running tests
- `npm run lint` for code quality checks
- One-time scripts that complete quickly

---

### 2. Web Research
**ALWAYS use Playwright MCP instead of WebFetch for web research.**

**Why:** Playwright provides better access and avoids permission issues that WebFetch sometimes encounters.

**Example usage:**
```javascript
// Good ✅
await mcp__playwright__browser_navigate({ url: "https://nextjs.org/docs" });
await mcp__playwright__browser_snapshot();

// Avoid ❌
await WebFetch({ url: "https://nextjs.org/docs", prompt: "..." });
```

---

### 3. Multi-Module Project Structure
This is a **multi-module repository** with the following structure:

```
mqtt-ollama-presentation/
├── docs/                      # Project documentation
│   ├── questions.md           # Clarifying questions & decisions
│   ├── requirements.md        # Technical requirements
│   ├── tasks.md               # Implementation task list
│   └── architecture.md        # System architecture
├── apps/                      # All application modules
│   ├── oracle/                # Next.js + LangChain module (main app)
│   │   ├── src/
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   └── helm/
│   ├── voice-gateway-oww/     # Voice command service
│   └── zwave-mcp-server/      # Z-Wave MCP server
├── deployment/
│   └── docker-compose.yml
├── presentation/
│   └── slides/
├── CLAUDE.md                  # This file
└── README.md
```

**Important:**
- Each module may have its own `package.json` and dependencies
- Always specify which module you're working in
- Use relative paths appropriately for each module

---

### 4. Task Management
**ALL tasks must be tracked in `docs/tasks.md`**

**Before starting ANY work:**
1. Check `docs/tasks.md` for the task
2. Update task status to "🔄 In Progress"
3. Complete the work
4. Update task status to "✅ Completed"
5. Update task completion count in the summary

**Task status indicators:**
- ⏳ Not Started
- 🔄 In Progress
- ✅ Completed
- ❌ Blocked
- 🎯 Stretch Goal

**After EVERY task completion, update:**
- The specific task checkbox `[x]`
- The task status symbol
- The summary section at the bottom
- Any related sub-tasks

---

### 5. Git Workflow
**NEVER check tasks into the default branch (main)**

**Workflow:**
1. Create feature branch for each phase/feature
   ```bash
   git checkout -b feature/phase-2-langchain-setup
   ```
2. Commit after each completed task (not during)
   ```bash
   git add .
   git commit -m "feat: complete task 2.1 - Next.js project initialization"
   ```
3. Push feature branch
   ```bash
   git push -u origin feature/phase-2-langchain-setup
   ```
4. User will merge via PR

**Commit message format:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Adding tests
- `refactor:` - Code refactoring
- `chore:` - Build/config changes

---

### 6. Documentation Updates
**Keep documentation in sync with code changes**

**When making changes, update:**
- `README.md` if user-facing changes
- `docs/architecture.md` if architectural changes
- `docs/requirements.md` if requirements change
- `docs/tasks.md` ALWAYS for completed tasks
- `docs/questions.md` when decisions are made
- `docs/network-dependencies.md` when adding network/internet dependencies

---

### 7. Network Dependencies
**ALL network/internet dependencies must be documented and justified**

This project prioritizes **local-first architecture** - all AI processing, device control, and data storage happens locally without cloud dependencies (except for Auth0 authentication).

**📍 Central Documentation:** `docs/network-dependencies.md`

**When adding ANY code that requires network access:**

1. **Check if it's truly necessary**
   - Can this be done locally instead?
   - Is there a local-first alternative?

2. **Document in `docs/network-dependencies.md`**
   - What service/endpoint is accessed?
   - Why is network access required?
   - What is the mitigation if network fails?
   - Is it required during demo or just setup?

3. **Defend the decision**
   - Every network dependency must have a clear rationale
   - Consider impact on demo reliability
   - Document backup plan for network failures

**Current network dependencies:**
- ☁️ **Auth0** - Authentication (internet required during demo)
- 🔽 **Ollama models** - One-time download (pre-cache before demo)
- 📦 **npm packages** - One-time install (pre-install before demo)
- 🏠 **MQTT broker** - Local network only
- 🤖 **Ollama runtime** - Local network only
- 📡 **Z-Wave devices** - Local radio (not even WiFi)

**Design principle:**
- ✅ Local processing > Cloud processing
- ✅ Offline-capable > Internet-required
- ✅ Demo reliability > Feature complexity

See `docs/network-dependencies.md` for complete list and rationale.

---

### 8. Technology Stack

### Core Technologies
- **Language:** JavaScript (ES6+) - **NEVER use TypeScript**
- **Framework:** Next.js 14+ with App Router
- **LLM Integration:** LangChain.js + Ollama
- **Database:** SQLite with Prisma or Drizzle ORM
- **Authentication:** Auth0 Next.js SDK
- **MQTT:** MQTT.js client library
- **Testing:** Jest + React Testing Library

### Ollama Model Recommendations (Updated October 2025)

**For Voice Gateway (Conversational AI):**
- **Primary:** `qwen2.5:0.5b` - Fastest response time (~1s warm), suitable for simple queries
- **Alternative:** `qwen2.5:1.5b` - Better accuracy (~4.6s warm), recommended if quality matters
- **Not Recommended:** `qwen3:1.7b` or larger - Too slow for voice interactions (14s+)

**Performance Benchmarks (Raspberry Pi 5):**
| Model | Cold Start | Warm Response | Tool Support | Quality |
|-------|-----------|---------------|--------------|---------|
| qwen2.5:0.5b | ~3.2s | ~1s | Yes (limited) | Good |
| qwen2.5:1.5b | ~16s | ~4.6s | Yes (strong) | Better |
| qwen3:1.7b | ~14s | ~14s | Yes | Best |

**Why qwen2.5:0.5b?**
- 93% faster than qwen3:1.7b (warm inference)
- Supports tool calling (for future MQTT device control)
- Small enough for fast inference on Pi 5 without GPU
- Total voice pipeline: **~7 seconds** (vs 27s with qwen3:1.7b) - **74% improvement**

**For Next.js/LangChain (Oracle module):**
- **Primary:** `qwen2.5:3b` or `gemma2:2b` - Better for complex reasoning
- **Alternative:** `phi-3.5-mini-instruct` - Good instruction following

### Whisper Model Recommendations (Updated October 2025)

**For Voice Gateway:**
- **Primary:** `ggml-tiny.bin` - Fast transcription (~1.5s), good accuracy for clear speech
- **Alternative:** `ggml-base.bin` - Better accuracy in noisy environments (4x slower, ~6s)
- **Not Recommended:** `ggml-turbo` - Designed for cloud/GPU, not optimized for edge devices

**Performance Benchmarks (Raspberry Pi 5):**
| Model | Size | Memory | Transcription Time | Quality |
|-------|------|--------|-------------------|---------|
| tiny | 75 MB | ~273 MB | ~1.5s | Good |
| base | 142 MB | ~388 MB | ~6s | Better |

**Why ggml-tiny.bin?**
- 75% faster than base model
- 47% smaller file size
- Good accuracy for clear voice commands
- Sufficient for home automation queries

**See [Performance Optimization Guide](docs/performance-optimization.md) for detailed benchmarks and optimization techniques.**

### Coding Standards
- **NEVER use TypeScript** - Always use plain JavaScript (ES6+)
- **NO .ts or .tsx files** - Use .js and .jsx only
- **NO type annotations** - Keep code clean and simple
- Use functional components in React
- Prefer async/await over promises
- Use Zod for runtime validation (not TypeScript types)
- Follow Next.js App Router conventions
- Use server components by default
- Use client components only when needed
- Use JSDoc comments for documentation if needed

---

### 8. External Integrations

### Z-Wave (zwave-js-ui)
- **Approach:** Use zwave-js-ui MQTT integration as-is (not forking)
- **Integration:** Subscribe to MQTT topics published by zwave-js-ui
- **Documentation:** https://github.com/zwave-js/zwave-js-ui

### MQTT Integration (Dual Approach for Presentation)

**Presentation Strategy:** Demonstrate BOTH simple custom tools AND enterprise MCP architecture

**Part 1: Custom Tool (5 minutes)**
- Build simple MQTT tool live on stage (~15 lines)
- Show: User request → Tool call → Physical device responds
- Highlight limitations: code duplication, no reusability across AI clients

**Part 2: MCP Server (5 minutes)**
- Introduce custom TypeScript MCP server (Anthropic's Model Context Protocol)
- Demo same functionality with better architecture
- Show: MCP Inspector, Claude Desktop integration, separation of concerns

**Implementation Requirements:**
- **Week 1-2:** Implement custom mqtt.js tool (for demo Part 1)
- **Week 3:** Add TypeScript MCP server (for demo Part 2)
- **Week 4:** Practice switching between approaches live

**Technical Details:**
- **Broker:** HiveMQ (existing setup at https://github.com/jrgleason/home-infra/tree/main/mqtt)
  - MQTT Port: 31883 (NodePort)
  - WebSocket Port: 30000 (path: /mqtt)
  - Control Center: 30080 (HTTP)
  - Authentication: Anonymous (demo mode, TECH DEBT: Enable RBAC)
- **Custom Tool:** MQTT.js + LangChain tool decorator
- **MCP Server:** Custom TypeScript using @modelcontextprotocol/sdk + mqtt.js
- **Authentication:** Anonymous for demo (TECH DEBT: Configure secure auth)
- **Note:** Using existing HiveMQ broker running in Kubernetes. Custom TypeScript MCP server works with any MQTT broker.

**When to Use Each:**
- Custom Tools: Prototypes, learning, simple integrations
- MCP Servers: Production, multiple AI clients, enterprise systems

See `docs/notes.md` "MQTT Integration - Dual Approach Strategy" for complete implementation guide.

### Auth0
- **Type:** OIDC SPA authentication
- **SDK:** @auth0/nextjs-auth0
- **Storage:** Server-side sessions

### Ollama
- **Connection:** HTTP API (default port 11434)
- **Models:** Downloaded locally, not bundled
- **Configuration:** Model selection configurable via env vars
- **Voice Gateway Model:** `qwen2.5:0.5b` (optimized for speed)
- **Oracle Model:** `qwen2.5:3b` or larger (optimized for accuracy)

---

### 9. Environment Variables

**All environment variables MUST be:**
- Documented in `.env.example`
- Never committed with real values
- Loaded via Next.js env system
- Validated at startup

**Required variables:**
```bash
# Auth0
AUTH0_SECRET=
AUTH0_BASE_URL=
AUTH0_ISSUER_BASE_URL=
AUTH0_CLIENT_ID=
AUTH0_CLIENT_SECRET=

# Database
DATABASE_URL=file:./dev.db

# MQTT (HiveMQ - Kubernetes at 10.0.0.58:31883)
MQTT_BROKER_URL=mqtt://10.0.0.58:31883
MQTT_USERNAME=
MQTT_PASSWORD=
# Optional: WebSocket URL for browser clients
MQTT_WEBSOCKET_URL=ws://10.0.0.58:30000/mqtt

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:0.5b  # For voice-gateway-oww (speed optimized)
# OLLAMA_MODEL=qwen2.5:3b   # For oracle module (accuracy optimized)

# App
NODE_ENV=development
PORT=3000
```

---

### 10. Testing Requirements

**Testing Strategy:**
- Unit tests for utilities and tools
- Integration tests for API endpoints
- E2E tests for critical user flows
- Manual tests for hardware integration

**Coverage Goals:**
- Minimum 60% overall
- 80%+ for critical paths (auth, device control, LangChain tools)

**Running tests:**
```bash
# Run unit tests
npm test

# Run with coverage
npm test -- --coverage

# Run E2E tests
npm run test:e2e
```

---

### 11. Code Style

### JavaScript (NO TypeScript!)
```javascript
// ✅ Good: Clear function with JSDoc comments
/**
 * Controls a smart home device
 * @param {Object} command - Device command object
 * @param {string} command.deviceId - Device identifier
 * @param {'on'|'off'|'dim'} command.action - Action to perform
 * @param {number} [command.value] - Optional value for dimming
 */
async function controlDevice(command) {
  // Implementation with Zod validation
  const schema = z.object({
    deviceId: z.string(),
    action: z.enum(['on', 'off', 'dim']),
    value: z.number().optional()
  });
  const validated = schema.parse(command);
  // ... rest of implementation
}

// ❌ Avoid: TypeScript syntax
async function controlDevice(command: DeviceCommand): Promise<void> {
  // NO! This is TypeScript - NEVER use this!
}
```

### React Components
```javascript
// ✅ Good: Server component by default
export default async function DevicesPage() {
  const devices = await getDevices();
  return <DeviceList devices={devices} />;
}

// ✅ Good: Client component when needed
'use client';
export function ChatInput() {
  const [message, setMessage] = useState('');
  // ... interactive logic
}
```

### LangChain Tools
```javascript
// ✅ Good: Well-documented tool with clear description
export const listDevicesTool = new DynamicTool({
  name: 'list_devices',
  description: 'Lists all available smart home devices. Returns device ID, name, type, and current state.',
  func: async () => {
    const devices = await deviceService.listAll();
    return JSON.stringify(devices);
  },
});
```

---

### 12. Error Handling

**Always handle errors gracefully:**

```javascript
// ✅ Good: Comprehensive error handling
try {
  await mqttClient.publish(topic, message);
} catch (error) {
  logger.error('Failed to publish MQTT message', { topic, error });
  throw new MQTTPublishError('Device control failed', { cause: error });
}

// ❌ Avoid: Swallowing errors
try {
  await mqttClient.publish(topic, message);
} catch (error) {
  console.log('Error:', error);
}
```

**Error response format:**
```javascript
{
  error: {
    code: 'DEVICE_UNAVAILABLE',
    message: 'The device is currently offline',
    details: { deviceId: '123', lastSeen: '2025-09-29T12:00:00Z' }
  }
}
```

---

### 13. Logging

**Use structured logging:**

```javascript
import { logger } from '@/lib/logger';

// ✅ Good: Structured logs with context
logger.info('Device command sent', {
  deviceId: device.id,
  command: 'turn_on',
  user: userId,
});

logger.error('Database connection failed', {
  error: error.message,
  stack: error.stack,
  attempt: retryCount,
});

// ❌ Avoid: Console.log in production code
console.log('Device turned on');
```

---

### 14. Security Considerations

**Authentication:**
- All API routes MUST be protected
- Validate JWTs on every request
- Check token expiration
- Handle refresh tokens properly

**MQTT:**
- Use authentication (even for dev)
- Consider TLS for production
- Validate all incoming messages
- Sanitize device IDs and topics

**Database:**
- Use parameterized queries (ORM handles this)
- Never store passwords (Auth0 handles auth)
- Encrypt sensitive user data
- Validate all inputs with Zod

**Secrets:**
- Never commit secrets to Git
- Use environment variables
- Rotate keys regularly
- Use different keys for dev/prod

---

### 15. Performance Optimization

**Next.js:**
- Use server components for data fetching
- Implement streaming for LLM responses
- Use React Suspense for async components
- Optimize images with next/image

**Ollama:**
- **Choose the right model size:** Use `qwen2.5:0.5b` for speed, `qwen2.5:1.5b`+ for accuracy
- **System prompts matter:** Explicitly disable verbose output (e.g., `<think>` tags)
- Cache model responses when appropriate
- Use streaming for real-time responses
- All Qwen2.5 models are already quantized (Q4_K_M)
- Monitor token usage
- **Performance tip:** First query after model load is always slower (cold start)

**MQTT:**
- Batch multiple commands when possible
- Use QoS levels appropriately (0 or 1, not 2)
- Implement connection pooling
- Clean up subscriptions

**Database:**
- Use indexes on frequently queried fields
- Implement pagination for large lists
- Cache frequent queries
- Use transactions for multi-step operations

---

### 16. Presentation-Specific Guidelines

**Demo Stability:**
- Always have mock devices as fallback
- Test demo script 10+ times
- Have backup video ready
- Document failure recovery steps

**Code for Presentation:**
- Keep code examples clean and readable
- Add comments explaining key concepts
- Use meaningful variable names
- Avoid deeply nested logic in demos

**Personality System:**
- Keep responses family-friendly
- Balance humor with helpfulness
- Avoid offensive content
- Test personality variations

---

### 17. Common Patterns

### API Route (App Router)
```javascript
// app/api/devices/route.js
import { NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';

export async function GET(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const devices = await deviceService.listAll();
  return NextResponse.json(devices);
}
```

### LangChain Tool
```javascript
import { DynamicTool } from '@langchain/core/tools';

export function createDeviceControlTool(mqttClient) {
  return new DynamicTool({
    name: 'control_device',
    description: 'Controls a smart home device. Parameters: deviceId (string), action (on|off|dim), value (number, optional for dim)',
    func: async (input) => {
      const params = JSON.parse(input);
      await mqttClient.publish(`home/device/${params.deviceId}/set`, {
        action: params.action,
        value: params.value,
      });
      return `Device ${params.deviceId} ${params.action} command sent`;
    },
  });
}
```

### MQTT Subscribe
```javascript
mqttClient.on('connect', () => {
  mqttClient.subscribe('home/+/status', (err) => {
    if (err) {
      logger.error('Subscribe failed', { error: err });
    }
  });
});

mqttClient.on('message', (topic, message) => {
  const deviceId = topic.split('/')[1];
  const state = JSON.parse(message.toString());
  deviceStateCache.set(deviceId, state);
});
```

---

### 18. Troubleshooting Tips

**If Ollama is slow:**
- **Switch to smaller model:** `qwen2.5:0.5b` (3s) vs `qwen3:1.7b` (14s)
- **Optimize system prompt:** Add "Keep answers under 2 sentences. Do not include <think> tags"
- Verify CPU/RAM usage with `htop`
- Check if it's cold start (first query is always slower)
- Consider GPU acceleration (if available, but not required for qwen2.5:0.5b)

**If MQTT is unreliable:**
- Check broker logs
- Verify network connectivity
- Check QoS levels
- Implement reconnection logic

**If Auth0 fails:**
- Verify callback URLs
- Check environment variables
- Clear browser cookies/cache
- Check Auth0 dashboard logs

**If Z-Wave devices don't respond:**
- Check zwave-js-ui logs
- Verify device is paired
- Check MQTT topic structure
- Test with MQTT client directly

---

### 19. Resources

**Official Documentation:**
- Next.js: https://nextjs.org/docs
- LangChain.js: https://js.langchain.com/docs
- Ollama: https://ollama.ai/docs
- zwave-js-ui: https://github.com/zwave-js/zwave-js-ui
- Auth0: https://auth0.com/docs/quickstart/webapp/nextjs
- MQTT.js: https://github.com/mqttjs/MQTT.js

**Learning Resources:**
- LangChain University: https://docs.langchain.com/docs/
- Home Assistant Year of Voice: https://www.home-assistant.io/voice_control/
- Ollama Model Library: https://ollama.ai/library

---

### 20. Getting Help

**When stuck:**
1. Check docs/tasks.md for related tasks
2. Review docs/requirements.md for specifications
3. Search official documentation
4. Check GitHub issues for similar problems
5. Ask clarifying questions in docs/questions.md

**Before asking for help:**
- Describe what you tried
- Include error messages
- Specify which module/file
- Note your environment (OS, Node version, etc.)

---

### 21. Deployment & Production

**IMPORTANT: Before deploying to production (systemd service, Docker, etc.):**

### Pre-Deployment Checklist

**For Oracle (Next.js App):**
- [ ] Run `npm run build` in `/apps/oracle` directory
- [ ] Verify `.next` directory was created successfully
- [ ] Test the production build locally with `npm start`
- [ ] Check all environment variables are set correctly
- [ ] Verify database migrations are up to date
- [ ] Test MQTT connection and device control
- [ ] Verify Ollama is accessible and models are downloaded

**For Systemd Service Setup:**
- [ ] Verify working directory path is correct (`/apps/oracle` not `/oracle`)
- [ ] Check Node.js binary path is correct (especially if using NVM)
- [ ] Verify all environment variables are defined in service file
- [ ] Test service starts successfully: `systemctl status oracle.service`
- [ ] Check logs for errors: `journalctl -u oracle.service -n 50`
- [ ] Verify service restarts on failure
- [ ] Test service survives system reboot

**Common Deployment Issues:**

1. **"Could not find a production build in the '.next' directory"**
   - **Cause:** Missing production build
   - **Fix:** Run `npm run build` in the application directory before starting
   - **Prevention:** Add build step to deployment automation

2. **"Changing to the requested working directory failed: No such file or directory"**
   - **Cause:** Incorrect `WorkingDirectory` path in systemd service file
   - **Fix:** Update service file to use correct path (e.g., `/home/pi/code/mqtt-ollama-presentation/apps/oracle`)
   - **Prevention:** Always verify directory structure before creating service files

3. **Service fails silently or restarts continuously**
   - **Check logs:** `journalctl -u oracle.service -n 50 --no-pager`
   - **Common causes:** Missing env vars, database not accessible, MQTT broker unreachable
   - **Debug:** Run the ExecStart command manually to see real-time errors

### Systemd Service Template

**Location:** `/etc/systemd/system/oracle.service`

**Correct configuration:**
```ini
[Unit]
Description=Oracle - AI Home Automation Assistant
After=network.target ollama.service
Wants=ollama.service

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/code/mqtt-ollama-presentation/apps/oracle
Environment="NODE_ENV=production"
Environment="PORT=3000"
Environment="PATH=/usr/local/bin:/usr/bin:/bin"
Environment="OLLAMA_BASE_URL=http://localhost:11434"
Environment="OLLAMA_MODEL=llama3.2:3b"
Environment="DATABASE_URL=file:./dev.db"
Environment="MQTT_BROKER_URL=mqtt://127.0.0.1:1883"
ExecStart=/home/pi/.nvm/versions/node/v24.9.0/bin/node /home/pi/code/mqtt-ollama-presentation/apps/oracle/node_modules/.bin/next start
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

# Security settings
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

**Key points:**
- ✅ `WorkingDirectory` must point to `/apps/oracle` (NOT `/oracle`)
- ✅ `ExecStart` must use absolute path to Node.js binary
- ✅ `ExecStart` must use absolute path to `next` executable
- ✅ Must run `npm run build` BEFORE starting the service
- ✅ All required environment variables must be defined
- ✅ Service should depend on network and ollama being ready

**Service management:**
```bash
# After creating/editing service file
sudo systemctl daemon-reload
sudo systemctl enable oracle.service
sudo systemctl start oracle.service

# Check status
systemctl status oracle.service
journalctl -u oracle.service -n 50 --no-pager

# Restart after code changes
sudo systemctl restart oracle.service
```

**Nginx reverse proxy setup:**

If using nginx to proxy to the Next.js app:
- Next.js runs on port 3000
- Nginx should proxy to `http://127.0.0.1:3000`
- If nginx returns 502 Bad Gateway, check if oracle.service is running
- Check nginx logs: `sudo tail -50 /var/log/nginx/error.log`

**Docker deployment:**

See README.md for Docker Compose and Kubernetes/Helm deployment options.

---

### Voice Gateway OWW Deployment

**IMPORTANT: Voice Gateway requires audio devices and Python dependencies**

### Pre-Deployment Checklist

**For Voice Gateway OWW:**
- [ ] Verify Python virtual environment exists at `/apps/voice-gateway-oww/.venv`
- [ ] Install Piper TTS in venv: `pip install piper-tts`
- [ ] Download Whisper model (e.g., `ggml-tiny.bin` or `ggml-base.bin`)
- [ ] Download OpenWakeWord models (melspectrogram, embedding, wake word model)
- [ ] Download Piper voice model (e.g., `en_US-amy-medium.onnx`)
- [ ] Test audio devices: `arecord -l` and `aplay -l`
- [ ] Verify ALSA device names in `.env` file
- [ ] Test MQTT connection to broker
- [ ] Verify Ollama is running and model is downloaded
- [ ] Test microphone: `arecord -D plughw:3,0 -f S16_LE -r 16000 -d 3 test.wav`

### Systemd Service Template

**Location:** `/etc/systemd/system/voice-gateway-oww.service`

**Correct configuration:**
```ini
[Unit]
Description=Voice Gateway OWW - Wake Word Detection and Voice Commands
After=network.target ollama.service
Wants=ollama.service

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/code/mqtt-ollama-presentation/apps/voice-gateway-oww
Environment="NODE_ENV=production"
Environment="LOG_LEVEL=info"
Environment="VIRTUAL_ENV=/home/pi/code/mqtt-ollama-presentation/apps/voice-gateway-oww/.venv"
Environment="PATH=/home/pi/code/mqtt-ollama-presentation/apps/voice-gateway-oww/.venv/bin:/usr/local/bin:/usr/bin:/bin"

# OpenWakeWord Configuration
Environment="OWW_MODEL_PATH=models/hey_jarvis_v0.1.onnx"
Environment="OWW_THRESHOLD=0.25"
Environment="OWW_INFERENCE_FRAMEWORK=onnx"

# Audio Configuration
Environment="AUDIO_MIC_DEVICE=plughw:3,0"
Environment="AUDIO_SPEAKER_DEVICE=plughw:2,0"
Environment="AUDIO_SAMPLE_RATE=16000"
Environment="AUDIO_CHANNELS=1"

# Voice Activity Detection (VAD)
Environment="VAD_TRAILING_SILENCE_MS=1500"
Environment="VAD_MAX_UTTERANCE_MS=10000"

# Whisper Speech-to-Text
Environment="WHISPER_MODEL=tiny"
Environment="WHISPER_MODEL_PATH=models/ggml-tiny.bin"

# MQTT Broker
Environment="MQTT_BROKER_URL=mqtt://10.0.0.58:31883"
Environment="MQTT_CLIENT_ID=voice-gateway-oww"
Environment="MQTT_USERNAME="
Environment="MQTT_PASSWORD="

# Health Check
Environment="HEALTHCHECK_PORT=3002"

# Ollama AI Configuration
Environment="OLLAMA_BASE_URL=http://localhost:11434"
Environment="OLLAMA_MODEL=qwen2.5:0.5b"

# Text-to-Speech (Piper TTS)
Environment="TTS_ENABLED=true"
Environment="TTS_MODEL_PATH=models/piper/en_US-amy-medium.onnx"
Environment="TTS_VOLUME=1.0"
Environment="TTS_SPEED=3.0"

ExecStart=/home/pi/.nvm/versions/node/v24.9.0/bin/node /home/pi/code/mqtt-ollama-presentation/apps/voice-gateway-oww/src/main.js
Restart=on-failure
RestartSec=10
StandardOutput=journal
StandardError=journal

# Security settings
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

**Key points:**
- ✅ **CRITICAL:** Set `VIRTUAL_ENV` and prepend `.venv/bin` to `PATH` for Piper TTS to work
- ✅ `WorkingDirectory` must point to `/apps/voice-gateway-oww`
- ✅ `ExecStart` must use absolute path to Node.js binary
- ✅ All audio device names must match your hardware (use `arecord -l` to find)
- ✅ Service should depend on network and ollama being ready
- ✅ Adjust `OWW_THRESHOLD` based on your environment (0.01-0.5)

### Installation Steps

```bash
# 1. Create service file in the app directory (for version control)
cd /home/pi/code/mqtt-ollama-presentation/apps/voice-gateway-oww

# 2. Copy service file to systemd directory
sudo cp voice-gateway-oww.service /etc/systemd/system/

# 3. Reload systemd daemon
sudo systemctl daemon-reload

# 4. Enable service to start on boot
sudo systemctl enable voice-gateway-oww.service

# 5. Start the service
sudo systemctl start voice-gateway-oww.service

# 6. Check status
systemctl status voice-gateway-oww.service
```

### Viewing Logs

**Real-time log monitoring:**
```bash
# Follow logs in real-time (most useful)
journalctl -u voice-gateway-oww.service -f

# Follow logs with timestamps
journalctl -u voice-gateway-oww.service -f --output=short-iso
```

**Historical logs:**
```bash
# Show last 50 lines
journalctl -u voice-gateway-oww.service -n 50 --no-pager

# Show last 100 lines
journalctl -u voice-gateway-oww.service -n 100 --no-pager

# Show logs since last boot
journalctl -u voice-gateway-oww.service -b

# Show logs from specific time range
journalctl -u voice-gateway-oww.service --since "2025-10-17 20:00:00" --until "2025-10-17 21:00:00"

# Show logs from last hour
journalctl -u voice-gateway-oww.service --since "1 hour ago"
```

**Filtering logs:**
```bash
# Search for errors only
journalctl -u voice-gateway-oww.service -p err

# Search for specific keywords
journalctl -u voice-gateway-oww.service --no-pager | grep "wake word"
journalctl -u voice-gateway-oww.service --no-pager | grep "TTS"
journalctl -u voice-gateway-oww.service --no-pager | grep "Piper"

# Show logs with context (before/after)
journalctl -u voice-gateway-oww.service --no-pager | grep -C 5 "error"
```

**Exporting logs:**
```bash
# Export to file
journalctl -u voice-gateway-oww.service --no-pager > voice-gateway-logs.txt

# Export last 1000 lines to file
journalctl -u voice-gateway-oww.service -n 1000 --no-pager > voice-gateway-logs.txt
```

### Service Management

```bash
# Start service
sudo systemctl start voice-gateway-oww.service

# Stop service
sudo systemctl stop voice-gateway-oww.service

# Restart service (after config changes)
sudo systemctl restart voice-gateway-oww.service

# Check status
systemctl status voice-gateway-oww.service

# Enable auto-start on boot
sudo systemctl enable voice-gateway-oww.service

# Disable auto-start on boot
sudo systemctl disable voice-gateway-oww.service

# Reload service file after editing
sudo systemctl daemon-reload
sudo systemctl restart voice-gateway-oww.service
```

### Common Deployment Issues

1. **"ModuleNotFoundError: No module named 'piper'"**
   - **Cause:** Python virtual environment not activated in systemd service
   - **Fix:** Ensure `VIRTUAL_ENV` and `PATH` with `.venv/bin` are set in service file
   - **Verify:** Check that piper-tts is installed: `source .venv/bin/activate && pip list | grep piper`

2. **"arecord: device not found" or microphone errors**
   - **Cause:** Incorrect ALSA device name
   - **Fix:** Find correct device with `arecord -l`, update `AUDIO_MIC_DEVICE` in service file
   - **Common devices:** `hw:2,0`, `plughw:3,0`, `default`
   - **Test:** `arecord -D plughw:3,0 -f S16_LE -r 16000 -d 3 test.wav`

3. **Wake word not detected**
   - **Cause:** Threshold too high or microphone level too low
   - **Fix:** Lower `OWW_THRESHOLD` (try 0.01 for testing, then increase to 0.25-0.5)
   - **Check logs:** Look for detection scores in logs to see if wake word is being heard
   - **Test mic:** `arecord -D plughw:3,0 -f S16_LE -r 16000 test.wav` and play back

4. **Service fails silently or restarts continuously**
   - **Check logs:** `journalctl -u voice-gateway-oww.service -n 100 --no-pager`
   - **Common causes:**
     - Missing models (whisper, OpenWakeWord, Piper)
     - MQTT broker unreachable
     - Ollama not running
     - Audio device permissions
   - **Debug:** Run command manually: `cd /home/pi/code/mqtt-ollama-presentation/apps/voice-gateway-oww && node src/main.js`

5. **TTS not working (no spoken responses)**
   - **Cause:** Piper TTS not installed or venv not activated
   - **Fix:** Install piper-tts in venv and verify `VIRTUAL_ENV` is set
   - **Verify:** Check logs for "✅ Welcome message spoken" on startup
   - **Test:** `source .venv/bin/activate && python -c "from piper import PiperVoice"`

6. **High CPU usage or slow responses**
   - **Cause:** Using large Ollama model or Whisper model
   - **Fix:**
     - Use `qwen2.5:0.5b` for Ollama (fastest)
     - Use `ggml-tiny.bin` for Whisper (1.5s vs 6s for base)
   - **Monitor:** `htop` to check CPU usage

### Testing the Deployment

After deploying, verify everything works:

```bash
# 1. Check service is running
systemctl status voice-gateway-oww.service

# 2. Watch logs in real-time
journalctl -u voice-gateway-oww.service -f

# 3. Look for these messages in logs:
# ✅ "Voice Gateway (OpenWakeWord) starting..."
# ✅ "OpenWakeWord initialized"
# ✅ "Voice Gateway (OpenWakeWord) is ready"
# ✅ "Welcome message spoken" (if TTS enabled)
# ✅ "Listening for wake word..."

# 4. Test wake word detection
# Say "Hey Jarvis" followed by a question
# Watch logs for:
# 🎤 "Wake word detected!"
# 📝 "You said: [your question]"
# 🤖 "AI Response: [response]"

# 5. Verify MQTT publishing (if broker configured)
# Use MQTT client to subscribe to topics and verify messages
```

---

## Summary Checklist

Before committing code, verify:
- [ ] All tests pass
- [ ] No console.errors or warnings
- [ ] Code uses JavaScript only (no .ts or .tsx files)
- [ ] Updated docs/tasks.md
- [ ] Updated relevant documentation
- [ ] No secrets in code
- [ ] Feature branch (not main)
- [ ] Meaningful commit message
- [ ] No server commands left running

**Before deploying to production:**
- [ ] Run `npm run build` successfully
- [ ] Verify `.next` directory exists
- [ ] Verify correct directory paths in systemd service file
- [ ] Test service starts and runs successfully
- [ ] Check logs for errors
- [ ] Test the application is accessible

**Remember:** This project is for a presentation. Code quality, demo reliability, and documentation are equally important!