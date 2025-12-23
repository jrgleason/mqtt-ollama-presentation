# Technology Stack Reference

This document provides comprehensive information about the technology stack, model recommendations, coding standards, and performance optimization techniques for the MQTT + Ollama Home Automation project.

## Core Technologies

- **Language:** JavaScript (ES6+) - **NEVER use TypeScript**
- **Runtime:** Node.js (managed via NVM)
- **Framework:** Next.js 14+ with App Router
- **LLM Integration:** LangChain.js + Ollama (primary) / Anthropic Claude API (alternative)
- **Database:** SQLite with Prisma or Drizzle ORM
- **Authentication:** Auth0 Next.js SDK
- **MQTT:** MQTT.js client library
- **Testing:** Jest + React Testing Library

### Voice Processing Stack

- **Wake Word Detection:** OpenWakeWord with ONNX runtime
- **Speech-to-Text:** Whisper (whisper.cpp implementation)
<<<<<<< HEAD
- **Text-to-Speech:** ElevenLabs API (cloud) or Piper TTS (local)
- **Audio I/O:** ALSA (Linux), afplay (macOS), node-mic
- **State Management:** XState v5

### Demo Modes (Voice Gateway)

The voice gateway supports 4 configuration-driven demo modes with independent AI and TTS provider selection:

| Mode | AI Provider | TTS Provider | Dependencies | Use Case |
|------|-------------|--------------|--------------|----------|
| **Offline** | Ollama | Piper | Ollama running, Python + piper-tts | No internet required, complete privacy |
| **Online** | Anthropic | ElevenLabs | API keys (ANTHROPIC_API_KEY, ELEVENLABS_API_KEY) | Best quality, cloud-based |
| **Hybrid A** | Ollama | ElevenLabs | Ollama running, ELEVENLABS_API_KEY | Local AI privacy + cloud TTS quality |
| **Hybrid B** | Anthropic | Piper | ANTHROPIC_API_KEY, Python + piper-tts | Cloud AI quality + local TTS privacy |

**Mode switching:** Use `./scripts/switch-mode.sh [offline|online|hybrid-a|hybrid-b]` to copy preset configurations to `.env.tmp`. No code changes required.

**Provider configuration:**
- AI: Set `AI_PROVIDER=anthropic` or `AI_PROVIDER=ollama`
- TTS: Set `TTS_PROVIDER=ElevenLabs` or `TTS_PROVIDER=Piper`

=======
- **Text-to-Speech:** ElevenLabs API (cloud-based, requires internet)
- **Audio I/O:** ALSA (Linux), afplay (macOS), node-mic
- **State Management:** XState v5

>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)
## Ollama Model Recommendations

### For Voice Gateway (Conversational AI)

**Primary:** `qwen2.5:0.5b` - Fastest response time (~1s warm), suitable for simple queries

**Alternative:** `qwen2.5:1.5b` - Better accuracy (~4.6s warm), recommended if quality matters

**Not Recommended:** `qwen3:1.7b` or larger - Too slow for voice interactions (14s+)

### Performance Benchmarks (Raspberry Pi 5)

| Model | Cold Start | Warm Response | Tool Support | Quality |
|-------|-----------|---------------|--------------|---------|
| qwen2.5:0.5b | ~3.2s | ~1s | Yes (limited) | Good |
| qwen2.5:1.5b | ~16s | ~4.6s | Yes (strong) | Better |
| qwen3:1.7b | ~14s | ~14s | Yes | Best |

### Why qwen2.5:0.5b?

- 93% faster than qwen3:1.7b (warm inference)
- Supports tool calling (for MQTT device control)
- Small enough for fast inference on Pi 5 without GPU
- Total voice pipeline: **~7 seconds** (vs 27s with qwen3:1.7b) - **74% improvement**

### For Next.js/LangChain (Oracle Module)

- **Primary:** `qwen2.5:3b` or `gemma2:2b` - Better for complex reasoning
- **Alternative:** `phi-3.5-mini-instruct` - Good instruction following

## Whisper Model Recommendations

### For Voice Gateway

**Primary:** `ggml-tiny.bin` - Fast transcription (~1.5s), good accuracy for clear speech

**Alternative:** `ggml-base.bin` - Better accuracy in noisy environments (4x slower, ~6s)

**Not Recommended:** `ggml-turbo` - Designed for cloud/GPU, not optimized for edge devices

### Performance Benchmarks (Raspberry Pi 5)

| Model | Size | Memory | Transcription Time | Quality |
|-------|------|--------|-------------------|---------|
| tiny | 75 MB | ~273 MB | ~1.5s | Good |
| base | 142 MB | ~388 MB | ~6s | Better |

### Why ggml-tiny.bin?

- 75% faster than base model
- 47% smaller file size
- Good accuracy for clear voice commands
- Sufficient for home automation queries

## Coding Standards

### JavaScript Only - NO TypeScript

**🚫 CRITICAL: NEVER USE TYPESCRIPT IN THIS PROJECT 🚫**

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

### Modern JavaScript Patterns

- **Classes:** Use ES6 classes with private fields (`#field`)
- **Async:** Always use async/await (no promise chains)
- **Imports:** ES6 modules only (no CommonJS)
- **Destructuring:** Use destructuring for function parameters and imports
- **Arrow Functions:** Prefer arrow functions for callbacks
- **Optional Chaining:** Use `?.` and `??` for null safety
- **Constants:** Named constants for magic numbers with explanatory comments

### React Components

```javascript
// ✅ Good: Server component by default
export default async function DevicesPage() {
    const devices = await getDevices();
    return <DeviceList devices={devices}/>;
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

## Common Code Patterns

### API Route (Next.js App Router)

```javascript
// app/api/devices/route.js
import {NextResponse} from 'next/server';
import {getSession} from '@auth0/nextjs-auth0';

export async function GET(request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({error: 'Unauthorized'}, {status: 401});
    }

    const devices = await deviceService.listAll();
    return NextResponse.json(devices);
}
```

### LangChain Tool with MQTT

```javascript
import {DynamicTool} from '@langchain/core/tools';

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

### MQTT Subscribe Pattern

```javascript
mqttClient.on('connect', () => {
    mqttClient.subscribe('home/+/status', (err) => {
        if (err) {
            logger.error('Subscribe failed', {error: err});
        }
    });
});

mqttClient.on('message', (topic, message) => {
    const deviceId = topic.split('/')[1];
    const state = JSON.parse(message.toString());
    deviceStateCache.set(deviceId, state);
});
```

## Error Handling

**Always handle errors gracefully:**

```javascript
// ✅ Good: Comprehensive error handling
try {
    await mqttClient.publish(topic, message);
} catch (error) {
    logger.error('Failed to publish MQTT message', {topic, error});
    throw new MQTTPublishError('Device control failed', {cause: error});
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
        details: {
            deviceId: '123',
            lastSeen: '2025-09-29T12:00:00Z'
        }
    }
}
```

## Logging

**Use structured logging:**

```javascript
import {logger} from '@/lib/logger';

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

## Performance Optimization

### Next.js

- Use server components for data fetching
- Implement streaming for LLM responses
- Use React Suspense for async components
- Optimize images with next/image

### Ollama

- **Choose the right model size:** Use `qwen2.5:0.5b` for speed, `qwen2.5:1.5b`+ for accuracy
- **System prompts matter:** Explicitly disable verbose output (e.g., `<think>` tags)
- Cache model responses when appropriate
- Use streaming for real-time responses
- All Qwen2.5 models are already quantized (Q4_K_M)
- Monitor token usage
- **Performance tip:** First query after model load is always slower (cold start)

### MQTT

- Batch multiple commands when possible
- Use QoS levels appropriately (0 or 1, not 2)
- Implement connection pooling
- Clean up subscriptions

### Database

- Use indexes on frequently queried fields
- Implement pagination for large lists
- Cache frequent queries
- Use transactions for multi-step operations

## Security Considerations

### Authentication

- All API routes MUST be protected
- Validate JWTs on every request
- Check token expiration
- Handle refresh tokens properly

### MQTT

- Use authentication (even for dev)
- Consider TLS for production
- Validate all incoming messages
- Sanitize device IDs and topics

### Database

- Use parameterized queries (ORM handles this)
- Never store passwords (Auth0 handles auth)
- Encrypt sensitive user data
- Validate all inputs with Zod

### Secrets

- Never commit secrets to Git
- Use environment variables
- Rotate keys regularly
- Use different keys for dev/prod

## Testing

### Strategy

- Unit tests for utilities and tools
- Integration tests for API endpoints
- E2E tests for critical user flows
- Manual tests for hardware integration

### Coverage Goals

- Minimum 60% overall
- 80%+ for critical paths (auth, device control, LangChain tools)

### Running Tests

```bash
# Run unit tests
npm test

# Run with coverage
npm test -- --coverage

# Run E2E tests
npm run test:e2e
```

## Troubleshooting

### If Ollama is slow

- **Switch to smaller model:** `qwen2.5:0.5b` (3s) vs `qwen3:1.7b` (14s)
- **Optimize system prompt:** Add "Keep answers under 2 sentences. Do not include <think> tags"
- Verify CPU/RAM usage with `htop`
- Check if it's cold start (first query is always slower)
- Consider GPU acceleration (if available, but not required for qwen2.5:0.5b)

### If MQTT is unreliable

- Check broker logs
- Verify network connectivity
- Check QoS levels
- Implement reconnection logic

### If Auth0 fails

- Verify callback URLs
- Check environment variables
- Clear browser cookies/cache
- Check Auth0 dashboard logs

### If Z-Wave devices don't respond

- Check zwave-js-ui logs
- Verify device is paired
- Check MQTT topic structure (see `docs/EXTERNAL-INTEGRATIONS.md`)
- Test with MQTT client directly

## External Documentation

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

**Project-Specific Documentation:**
- See `docs/EXTERNAL-INTEGRATIONS.md` for integration details
- See `docs/DEPLOYMENT.md` for production deployment
- See `docs/performance-optimization.md` for detailed benchmarks
