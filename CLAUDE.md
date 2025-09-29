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
```typescript
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
├── langchain-service/         # Next.js + LangChain module
│   ├── src/
│   ├── package.json
│   ├── Dockerfile
│   └── helm/
├── zwave-js-ui/               # Z-Wave integration (submodule or reference)
├── esp32-example/             # Optional ESP32 firmware
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

---

### 7. Technology Stack

### Core Technologies
- **Language:** TypeScript (strict mode)
- **Framework:** Next.js 14+ with App Router
- **LLM Integration:** LangChain.js + Ollama
- **Database:** SQLite with Prisma or Drizzle ORM
- **Authentication:** Auth0 Next.js SDK
- **MQTT:** MQTT.js client library
- **Testing:** Jest + React Testing Library

### Ollama Model Recommendations
**Primary:** Qwen2.5:1.5b-3b or Gemma2:2b
**Alternative:** Phi-3.5-mini-instruct
**Why:** Best for command parsing, runs on Raspberry Pi 5

### Coding Standards
- Always use TypeScript with strict typing
- Use functional components in React
- Prefer async/await over promises
- Use Zod for runtime validation
- Follow Next.js App Router conventions
- Use server components by default
- Use client components only when needed

---

### 8. External Integrations

### Z-Wave (zwave-js-ui)
- **Approach:** Use zwave-js-ui MQTT integration as-is (not forking)
- **Integration:** Subscribe to MQTT topics published by zwave-js-ui
- **Documentation:** https://github.com/zwave-js/zwave-js-ui

### MQTT Broker
- **Broker:** Mosquitto
- **Client:** MQTT.js
- **Pattern:** Pub/Sub with topic-based routing
- **Authentication:** Basic username/password minimum

### Auth0
- **Type:** OIDC SPA authentication
- **SDK:** @auth0/nextjs-auth0
- **Storage:** Server-side sessions

### Ollama
- **Connection:** HTTP API (default port 11434)
- **Models:** Downloaded locally, not bundled
- **Configuration:** Model selection configurable via env vars

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

# MQTT
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=
MQTT_PASSWORD=

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b

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

### TypeScript
```typescript
// ✅ Good: Explicit types, clear function signatures
interface DeviceCommand {
  deviceId: string;
  action: 'on' | 'off' | 'dim';
  value?: number;
}

async function controlDevice(command: DeviceCommand): Promise<void> {
  // Implementation
}

// ❌ Avoid: Implicit any, unclear types
async function controlDevice(command) {
  // Implementation
}
```

### React Components
```typescript
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
```typescript
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

```typescript
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
```typescript
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

```typescript
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
- Cache model responses when appropriate
- Use streaming for real-time responses
- Consider model quantization for speed
- Monitor token usage

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
```typescript
// app/api/devices/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@auth0/nextjs-auth0';

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const devices = await deviceService.listAll();
  return NextResponse.json(devices);
}
```

### LangChain Tool
```typescript
import { DynamicTool } from '@langchain/core/tools';

export function createDeviceControlTool(mqttClient: MQTTClient) {
  return new DynamicTool({
    name: 'control_device',
    description: 'Controls a smart home device. Parameters: deviceId (string), action (on|off|dim), value (number, optional for dim)',
    func: async (input: string) => {
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
```typescript
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
- Check model size (use smaller models)
- Verify CPU/RAM usage
- Try different quantization levels
- Consider GPU acceleration (if available)

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

## Summary Checklist

Before committing code, verify:
- [ ] All tests pass
- [ ] No console.errors or warnings
- [ ] TypeScript compiles without errors
- [ ] Updated docs/tasks.md
- [ ] Updated relevant documentation
- [ ] No secrets in code
- [ ] Feature branch (not main)
- [ ] Meaningful commit message
- [ ] No server commands left running

**Remember:** This project is for a presentation. Code quality, demo reliability, and documentation are equally important!