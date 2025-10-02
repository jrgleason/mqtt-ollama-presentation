# Research Notes: Ollama Model Selection

## Lightest Model (Raspberry Pi 5)

### Recommended: Qwen2.5:1.5b

**Why it would work:**

1. **Performance Metrics**
   - Achieves ~20 tokens/second on Raspberry Pi 5 (0.5B variant)
   - 1.5B variant offers high throughput with low memory consumption
   - Significantly faster than 3B+ models (4-6 tokens/sec range)
   - Uses approximately 5.4GB RAM out of 8GB available on Pi 5

2. **Tool Calling Support**
   - Qwen2.5 has the most robust tool calling support in Ollama
   - Native support for Ollama's OpenAI-compatible function calling API
   - Chat template includes dedicated tool calling template
   - Well-documented support for external tools and APIs

3. **Model Design**
   - Optimized for structured tasks and command parsing
   - Consistently leads in performance benchmarks at this size
   - Efficient on ARM architecture (Raspberry Pi 5's Cortex-A76)
   - Balance of speed and accuracy for simple command parsing

4. **Response Time Analysis**
   - For simple commands like "turn on living room light":
     - Expected output: ~10-20 tokens (JSON tool call)
     - At 20 tokens/sec: **0.5-1 second response time** ✅
     - Meets the <1 second requirement for basic prompts

**Alternative: Mistral 7B-Instruct**
- Better tool calling performance but slower (1-2 tokens/sec on Pi 5)
- Would NOT meet <1 second requirement on Raspberry Pi 5
- Better suited for more powerful hardware

**References:**
- [DFRobot: Run Qwen2.5 on Raspberry Pi 5](https://www.dfrobot.com/blog-15784.html)
- [Qwen2.5 Official Blog](https://qwenlm.github.io/blog/qwen2.5/)
- [Best Ollama Models 2025 Performance Guide](https://collabnix.com/best-ollama-models-in-2025-complete-performance-comparison/)
- [Qwen Function Calling Documentation](https://qwen.readthedocs.io/en/latest/framework/function_call.html)
- [Stratosphere Lab: LLMs on Raspberry Pi 5](https://www.stratosphereips.org/blog/2025/6/5/how-well-do-llms-perform-on-a-raspberry-pi-5)

---

## Max Model (Mac Studio with 96GB Unified Memory)

### Recommended: DeepSeek-R1 70B (Quantized) or Llama 3.3 70B

**Why it would work:**

1. **Hardware Capabilities**
   - Mac Studio with 96GB unified memory can comfortably run 70B models
   - DeepSeek-R1 70B requires ~42.5GB VRAM
   - Llama 3.3 70B has similar requirements
   - Leaves 50GB+ for other applications and OS

2. **Performance Metrics**
   - **DeepSeek-R1 70B:**
     - 8.1 tokens/second with 99% GPU utilization
     - Excellent reasoning capabilities
     - Strong function calling performance

   - **Llama 3.3 70B:**
     - Comparable performance to 405B model
     - More efficient than smaller alternatives
     - Excellent tool calling support (Llama 3.1+ family)

3. **Tool Calling Excellence**
   - Llama 3.1/3.3 family has "significant improvements in tool use capabilities"
   - 70B models provide much better reasoning for complex tool chains
   - Can handle multi-step reasoning and ambiguous commands
   - Better context understanding for natural language commands

4. **Response Time**
   - At 8+ tokens/second, tool calls complete in <2 seconds
   - Much faster than Raspberry Pi while maintaining quality
   - Can handle complex personality responses after tool execution
   - Native Ollama on Mac is 5-6x faster than Docker (GPU acceleration)

5. **Use Case Fit**
   - Perfect for demo environment where showcase quality matters
   - Can handle personality system with rich responses
   - Supports multiple concurrent users if needed
   - Room to run multiple models simultaneously for A/B testing

**Alternative: Phi-4 14B**
- Highly efficient on Apple Silicon
- Would use only ~8-10GB memory
- Could run multiple instances simultaneously
- Good for development/testing before switching to 70B for demos

**Performance Optimization:**
- ✅ Run Ollama natively (NOT in Docker)
- ✅ Docker on Mac doesn't expose Apple GPU → CPU-only inference
- ✅ Native Ollama achieves full GPU utilization on Apple Silicon
- ✅ 96GB allows running multiple models concurrently for testing

**References:**
- [Best Local LLMs on Apple Silicon](https://apxml.com/posts/best-local-llm-apple-silicon-mac)
- [Ollama Performance: Native vs Docker on macOS](https://www.vchalyi.com/blog/2025/ollama-performance-benchmark-macos/)
- [Best Ollama Models for Function Calling 2025](https://collabnix.com/best-ollama-models-for-function-calling-tools-complete-guide-2025/)
- [Ollama Tool Support Blog](https://ollama.com/blog/tool-support)
- [How Much Memory Does Ollama Need? 2025](https://www.byteplus.com/en/topic/405436)

---

## Summary Comparison

| Metric | Raspberry Pi 5 (Qwen2.5:1.5b) | Mac Studio 96GB (DeepSeek-R1 70B) |
|--------|-------------------------------|-----------------------------------|
| Model Size | 1.5B parameters | 70B parameters |
| Memory Usage | ~5.4GB | ~42.5GB |
| Tokens/Second | ~20 | ~8.1 |
| Response Time | 0.5-1 sec | 1-2 sec |
| Tool Calling | Good | Excellent |
| Reasoning | Basic | Advanced |
| Use Case | Edge device, fast responses | Demo showcase, rich interactions |

**Decision Rationale:**
- **Pi 5:** Prioritize speed over reasoning (simple commands only)
- **Mac Studio:** Prioritize quality over raw speed (showcase quality)
- Both models support Ollama's native tool calling
- Both can achieve sub-2-second responses for basic commands
- Qwen2.5 is the only model proven to meet <1 sec on Pi 5

---

## Next.js + Ollama Chatbot Implementation Options

### Research Summary (January 2025)

Based on extensive research, there are three main approaches for building a Next.js chatbot with Ollama:

1. **LangChain.js + Custom Streaming**
2. **Vercel AI SDK**
3. **Hybrid: Vercel AI SDK + LangChain.js**

---

### Option 1: LangChain.js + Custom Streaming

**Overview:**
Use LangChain.js ChatOllama with custom streaming implementation via Next.js Route Handlers.

**Pros:**
- ✅ **Full control over the AI pipeline** - Complete customization of agents, tools, and chains
- ✅ **Built-in RAG support** - Native retrieval augmented generation with vector stores
- ✅ **Advanced agent capabilities** - Multi-step reasoning, tool calling, memory management
- ✅ **Model-agnostic** - Easy to swap between Ollama, OpenAI, Anthropic, etc.
- ✅ **Open-source flexibility** - No vendor lock-in, extensive customization options
- ✅ **Rich ecosystem** - Large community, many integrations, extensive documentation
- ✅ **Production-ready tool calling** - Native support for function calling with Ollama

**Cons:**
- ❌ **More complex setup** - Requires manual streaming implementation with TransformStream
- ❌ **Steeper learning curve** - Need to understand LangChain concepts (chains, agents, tools)
- ❌ **More boilerplate code** - Manual handling of streaming, error handling, state management
- ❌ **UI not included** - Need separate React components for chat interface
- ❌ **May be overkill** - Too complex for simple chatbot use cases

**Best For:**
- Projects requiring advanced AI features (RAG, agents, complex tool chains)
- Teams wanting full control and customization
- Applications needing model flexibility
- Long-term projects with evolving AI requirements

**Implementation Pattern:**
```typescript
// app/api/chat/route.ts
import { ChatOllama } from '@langchain/ollama';
import { HttpResponseOutputParser } from 'langchain/output_parsers';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const model = new ChatOllama({
    baseUrl: 'http://localhost:11434',
    model: 'qwen2.5:3b',
    streaming: true,
  });

  const parser = new HttpResponseOutputParser();
  const stream = await model.pipe(parser).stream(messages);

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' }
  });
}
```

**References:**
- [LangChain.js ChatOllama Docs](https://js.langchain.com/docs/integrations/chat/ollama/)
- [LangChain Next.js Template](https://github.com/langchain-ai/langchain-nextjs-template)
- [Stack Overflow: Streaming with Next.js Route Handlers](https://stackoverflow.com/questions/76298761/how-to-implement-streaming-api-endpoint-with-next-js-13-route-handlers-using-lan)
- [LangChain JavaScript Streaming Guide](https://www.robinwieruch.de/langchain-javascript-streaming/)

---

### Option 2: Vercel AI SDK

**Overview:**
Use Vercel AI SDK with OpenAI-compatible Ollama endpoint for streamlined chat development.

**Pros:**
- ✅ **Extremely simple setup** - Minimal boilerplate, works out of the box
- ✅ **Built-in streaming** - Automatic streaming with `streamText()` function
- ✅ **React hooks included** - `useChat()` hook handles all client-side state
- ✅ **Optimized for Vercel** - Seamless deployment and scaling on Vercel platform
- ✅ **Modern DX** - TypeScript-first, great developer experience
- ✅ **Auto-scroll & UI states** - Built-in handling of loading, error, and streaming states
- ✅ **Well documented** - Comprehensive guides and examples
- ✅ **Production-ready** - Battle-tested by Vercel AI Chatbot template

**Cons:**
- ❌ **Limited customization** - Less flexibility compared to LangChain
- ❌ **Vercel ecosystem lock-in** - Tightly coupled to Vercel's platform
- ❌ **Less advanced features** - No built-in RAG, agents require custom implementation
- ❌ **Ollama via OpenAI compatibility** - Requires Ollama's OpenAI-compatible API mode
- ❌ **Newer ecosystem** - Smaller community compared to LangChain

**Best For:**
- Simple chat applications without complex AI workflows
- Teams prioritizing speed of development
- Projects deploying to Vercel
- Prototypes and MVPs

**Implementation Pattern:**
```typescript
// app/api/chat/route.ts
import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

const ollama = createOpenAI({
  baseURL: 'http://localhost:11434/v1',
  apiKey: 'ollama',
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: ollama('qwen2.5:3b'),
    messages,
  });

  return result.toDataStreamResponse();
}

// Client component
'use client';
import { useChat } from 'ai/react';

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat();
  // UI automatically managed
}
```

**References:**
- [Vercel AI SDK Documentation](https://ai-sdk.dev/docs/introduction)
- [Next.js AI Chatbot Template](https://vercel.com/templates/next.js/nextjs-ai-chatbot)
- [Ollama OpenAI Compatibility](https://ollama.com/blog/openai-compatibility)
- [Building AI Chatbot with Vercel SDK](https://www.thisdot.co/blog/how-to-build-an-ai-assistant-with-openai-vercel-ai-sdk-and-ollama-with-next)

---

### Option 3: Hybrid Approach (Vercel AI SDK + LangChain.js)

**Overview:**
Combine Vercel AI SDK for streaming/UI with LangChain.js for advanced AI features.

**Pros:**
- ✅ **Best of both worlds** - Simple streaming + advanced AI capabilities
- ✅ **Use LangChain tools** - Leverage LangChain's ecosystem for complex logic
- ✅ **Vercel streaming UI** - Get Vercel's excellent streaming hooks and components
- ✅ **Gradual complexity** - Start simple, add LangChain features as needed
- ✅ **Proven pattern** - Used in production apps (see brunnolou/next-ollama-app)

**Cons:**
- ❌ **Two dependencies** - Need to manage both SDK versions
- ❌ **Potential conflicts** - May have overlapping functionality
- ❌ **More complex debugging** - Need to understand both systems
- ❌ **Integration overhead** - Requires bridging between the two libraries

**Best For:**
- Projects that need both simplicity and advanced features
- Teams wanting to start simple but plan for complexity
- Applications requiring LangChain tools with modern streaming UI

**Implementation Pattern:**
```typescript
// Use Vercel AI SDK for streaming + LangChain for tools
import { streamText } from 'ai';
import { ChatOllama } from '@langchain/ollama';
import { createMQTTTool } from '@/lib/langchain-tools';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const model = new ChatOllama({
    model: 'qwen2.5:3b',
  }).bind({
    tools: [createMQTTTool()],
  });

  // Bridge LangChain to Vercel AI SDK streaming
  const result = await streamText({
    model: convertLangChainToAI(model),
    messages,
  });

  return result.toDataStreamResponse();
}
```

**References:**
- [Vercel + LangChain + Ollama Example](https://github.com/brunnolou/next-ollama-app)
- [Vercel AI SDK with LangChain Guide](https://vercel.com/guides/nextjs-langchain-vercel-ai)
- [TemplateHub: LangChain vs Vercel AI SDK Comparison](https://www.templatehub.dev/blog/langchain-vs-vercel-ai-sdk-a-developers-ultimate-guide-2561)

---

### UI Component Options

Regardless of the backend approach, these are the top UI solutions for chat interfaces:

#### 1. **shadcn/ui AI Chat Components** (Recommended)
- **Pros:**
  - ✅ Production-ready ChatGPT-style interface
  - ✅ Built-in streaming states, auto-scroll, proper loading indicators
  - ✅ TypeScript-first with excellent type safety
  - ✅ Customizable design system
  - ✅ Works with both LangChain and Vercel AI SDK
  - ✅ Active community (66k+ GitHub stars)

- **Cons:**
  - ❌ Requires manual component installation (not an npm package)
  - ❌ Need to customize styling for brand consistency

- **Best For:** Production applications requiring polished, customizable chat UI

**References:**
- [shadcn/ui AI Chat Block](https://www.shadcn.io/blocks/ai-chatbot)
- [shadcn/ui AI Components](https://www.shadcn.io/ai)
- [shadcn/ui Conversation Component](https://www.shadcn.io/ai/conversation)

#### 2. **Vercel AI SDK Built-in Components**
- **Pros:**
  - ✅ Zero additional setup if using Vercel AI SDK
  - ✅ `useChat()` hook handles all state automatically
  - ✅ Works seamlessly with streaming responses

- **Cons:**
  - ❌ Basic styling, requires customization
  - ❌ Limited advanced features (no multi-modal, file uploads, etc.)

- **Best For:** Quick prototypes, MVPs, getting started fast

#### 3. **Custom Components with Tailwind**
- **Pros:**
  - ✅ Full control over design
  - ✅ Can integrate any chat library (LangChain, Vercel, custom)

- **Cons:**
  - ❌ More development time
  - ❌ Need to handle streaming states, scroll, etc. manually

- **Best For:** Unique design requirements, specific UX needs

---

### Recommendation for This Project

**Recommended Approach: LangChain.js + shadcn/ui AI Components**

**Rationale:**
1. **Tool calling is essential** - Project requires MQTT device control via LangChain tools
2. **Future RAG capabilities** - May want to add knowledge base for device manuals, troubleshooting
3. **Agent architecture** - Need multi-step reasoning for complex commands
4. **Model flexibility** - Want to easily test different Ollama models (Qwen2.5:3b vs others)
5. **No Vercel lock-in** - Could deploy to Railway, Fly.io, or self-host
6. **Production UI** - shadcn/ui provides polished interface without extra dependencies

**Alternative for Rapid Prototyping:**
If you need a working demo in <4 hours, use **Vercel AI SDK + Vercel AI Chatbot Template** first, then migrate to LangChain when tool calling is needed.

---

### Implementation Checklist

Using LangChain.js + shadcn/ui approach:

**Backend:**
- [ ] Install `@langchain/ollama`, `@langchain/core`, `langchain`
- [ ] Create Next.js API route handler (`/app/api/chat/route.ts`)
- [ ] Implement ChatOllama with streaming via `HttpResponseOutputParser`
- [ ] Set up TransformStream for token streaming
- [ ] Add error handling and timeout logic
- [ ] Create LangChain tools for MQTT device control
- [ ] Test streaming with `curl` or Postman

**Frontend:**
- [ ] Install shadcn/ui base components (`npx shadcn-ui@latest init`)
- [ ] Add shadcn/ui AI chat components (`npx shadcn-ui@latest add chat`)
- [ ] Create chat page component
- [ ] Implement message state management
- [ ] Add auto-scroll on new messages
- [ ] Handle loading/streaming/error states
- [ ] Style with Tailwind CSS
- [ ] Add dark mode support

**Integration:**
- [ ] Connect frontend to `/api/chat` endpoint
- [ ] Test end-to-end streaming
- [ ] Add authentication (Auth0)
- [ ] Implement conversation history (SQLite)
- [ ] Add personality system toggle

---

### Key Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **AI Framework** | LangChain.js | Need tool calling, agents, RAG support |
| **UI Library** | shadcn/ui AI components | Production-ready, customizable, TypeScript |
| **Streaming Method** | Route Handlers + TransformStream | Standard Next.js App Router pattern |
| **State Management** | React hooks (useState/useEffect) | Simple enough, no need for Redux/Zustand |
| **Model Interface** | ChatOllama | Native LangChain Ollama integration |
| **Deployment** | Flexible (Vercel, Railway, self-host) | No vendor lock-in |

---

### Testing Strategy

1. **Unit Tests:**
   - LangChain tool functions
   - Message parsing logic
   - MQTT integration

2. **Integration Tests:**
   - API route streaming
   - End-to-end chat flow
   - Tool calling with Ollama

3. **Manual Tests:**
   - UI responsiveness during streaming
   - Error handling (network failures, Ollama down)
   - Multiple concurrent users

4. **Performance Tests:**
   - Streaming latency measurement
   - Ollama model response time
   - Memory usage during long conversations

---

## Z-Wave JS UI Integration Notes

### Project Overview

**Z-Wave JS UI** is a full-featured Z-Wave Control Panel and MQTT Gateway that will serve as the bridge between Z-Wave devices and our AI-powered home automation system.

- **Current Version:** 11.3.1 (September 2024)
- **Repository:** https://github.com/zwave-js/zwave-js-ui
- **Tech Stack:** Node.js 20.19+, Express, Socket.io, Vue 3, Vuetify 3
- **Z-Wave JS Version:** 15.15.0
- **License:** MIT

### Core Features for Our Integration

1. **MQTT Gateway**
   - Exposes all Z-Wave devices and values to MQTT topics
   - Bidirectional communication (read device state, send commands)
   - Full Z-Wave JS API accessible via MQTT
   - Supports QoS levels and retain flags

2. **WebSocket Server**
   - Alternative to MQTT for real-time communication
   - Used by Home Assistant official Z-Wave integration
   - Can run on port 3000 (default)

3. **Control Panel UI**
   - Web-based management interface (port 8091)
   - Node management, firmware updates, associations
   - Real-time network graph visualization
   - Device configuration and diagnostics

4. **Scene Management**
   - Create and activate scenes via MQTT
   - Timeout support for temporary states
   - Can be triggered by LangChain tools

### MQTT Integration Architecture

#### Gateway Type Options

Z-Wave JS UI supports three MQTT topic structure modes:

**1. ValueID Topics (Recommended for our project)**
```
<prefix>/<location>/<nodeId>/<commandClass>/<endpoint>/<property>/<propertyKey>
```
Example: `zwave/living_room/5/38/0/currentValue`

**Pros:**
- Most precise and structured
- Easy to parse programmatically
- Clear command class identification
- Best for automated tools (LangChain)

**Cons:**
- Less human-readable
- Requires command class knowledge

**2. Named Topics**
```
<prefix>/<location>/<node_name>/<class_name>/<endpoint>/<propertyName>/<propertyKey>
```
Example: `zwave/living_room/ceiling_light/Multilevel_Switch/endpoint_0/currentValue`

**Pros:**
- Human-readable
- Easier debugging
- Good for manual MQTT exploration

**Cons:**
- Longer topic strings
- Name changes require topic updates

**3. Configured Manually**
```
<prefix>/<location>/<node_name>/<custom_topic>
```

Requires manual configuration per device value. Not recommended for our use case.

#### Recommendation: ValueID Topics

**Rationale:**
- LangChain tools can easily parse numeric IDs
- More stable (names can change, IDs don't)
- Cleaner for programmatic access
- Command class numbers are standardized (e.g., 38 = Multilevel Switch)

### MQTT Topic Patterns

#### Device State Updates (Subscribe)

**Topic Pattern:**
```
zwave/<location>/<nodeId>/<commandClass>/<endpoint>/<property>
```

**Payload Types:**
1. **JSON Time-Value:**
```json
{
  "time": 1548683523859,
  "value": 10
}
```

2. **Entire ValueID Object:**
```json
{
  "id": "38-0-targetValue",
  "nodeId": 8,
  "commandClass": 38,
  "commandClassName": "Multilevel Switch",
  "endpoint": 0,
  "property": "targetValue",
  "propertyName": "targetValue",
  "type": "number",
  "readable": true,
  "writeable": true,
  "label": "Target value",
  "min": 0,
  "max": 99,
  "value": 50,
  "lastUpdate": 1604044669393
}
```

3. **Just Value:**
```
50
```

**Recommendation:** Use "JSON Time-Value" for our project
- Includes timestamp for state history
- Lightweight compared to full ValueID object
- Easy to parse

#### Device Control (Publish)

**Write Value:**
```
Topic: zwave/living_room/5/38/0/targetValue/set
Payload: { "value": 100 }
```

**Write Value with Options:**
```
Topic: zwave/living_room/5/38/0/targetValue/set
Payload: {
  "value": 100,
  "options": {
    "transitionDuration": "5s"
  }
}
```

#### Z-Wave APIs via MQTT

**Execute API Function:**
```
Topic: zwave/_CLIENTS/ZWAVE_GATEWAY-<name>/api/<api_name>/set
Payload: { "args": [...] }
```

**Example - Activate Scene:**
```
Topic: zwave/_CLIENTS/ZWAVE_GATEWAY-office/api/_activateScene/set
Payload: { "args": [1] }
```

**Key APIs for Our Project:**
- `getNodes` - List all Z-Wave devices
- `writeValue` - Set device value
- `refreshValues` - Refresh device state
- `_activateScene` - Trigger scene
- `_getScenes` - List available scenes
- `pingNode` - Check if device is responsive

### Broadcast & Multicast Commands

#### Broadcast (All Devices with Matching ValueID)
```
Topic: zwave/_CLIENTS/ZWAVE_GATEWAY-office/broadcast/38/0/targetValue/set
Payload: { "value": 25 }
```
Sends to ALL devices with command class 38, endpoint 0, property targetValue.

#### Multicast (Specific Nodes)
```
Topic: zwave/_CLIENTS/ZWAVE_GATEWAY-office/multicast/set
Payload: {
  "nodes": [2, 3, 4, 6],
  "commandClass": 38,
  "endpoint": 0,
  "property": "targetValue",
  "value": 80
}
```

**Use Case:** "Turn off all lights" command → multicast to all light nodes

### Special MQTT Topics

#### Gateway Status
```
Topic: zwave/_CLIENTS/ZWAVE_GATEWAY-<name>/status
Payload: true/false
```
Monitor if Z-Wave JS UI is connected to MQTT.

#### Node Status
```
Topic: zwave/<location>/<node_name>/status
Payload: {
  "value": true,  // ready/not ready
  "status": "Alive"  // Alive, Awake, Dead
}
```

#### Node Last Active
```
Topic: zwave/<location>/<node_name>/lastActive
Payload: 1610009585743  // timestamp
```

#### Node Information
```
Topic: zwave/<location>/<node_name>/nodeinfo
Payload: {
  "id": 5,
  "deviceId": "271-4098-2049",
  "manufacturer": "Fibargroup",
  "name": "Ceiling Light",
  "loc": "Living Room",
  "ready": true,
  "available": true,
  "failed": false,
  ...
}
```

### Z-Wave Events (Optional)

Enable "Send Z-Wave Events" in settings to publish all Z-Wave events to MQTT:

```
Topic: zwave/_EVENTS_/ZWAVE_GATEWAY-<name>/<driver|node|controller>/<event_name>
Payload: { "data": [...eventArgs] }
```

**Use Cases:**
- Monitor device inclusion/exclusion
- Track network health
- Debug connectivity issues
- Log all Z-Wave activity

### Deployment Options

#### Option 1: Docker (Recommended)

**Official Image:**
```bash
docker run -d \
  --name zwave-js-ui \
  -p 8091:8091 \
  -p 3000:3000 \
  -v /dev/ttyUSB0:/dev/ttyUSB0 \
  -v zwave-config:/usr/src/app/store \
  --device=/dev/ttyUSB0 \
  zwavejs/zwave-js-ui:latest
```

**docker-compose.yml:**
```yaml
version: '3.7'
services:
  zwave-js-ui:
    container_name: zwave-js-ui
    image: zwavejs/zwave-js-ui:latest
    restart: unless-stopped
    tty: true
    stop_signal: SIGINT
    environment:
      - SESSION_SECRET=mysupersecretkey
      - ZWAVEJS_EXTERNAL_CONFIG=/usr/src/app/store/.config-db
      - TZ=America/New_York
    networks:
      - zwave
    devices:
      - '/dev/ttyUSB0:/dev/ttyUSB0'
    volumes:
      - zwave-config:/usr/src/app/store
    ports:
      - '8091:8091' # Web UI
      - '3000:3000' # WebSocket server

  mosquitto:
    image: eclipse-mosquitto:latest
    container_name: mosquitto
    restart: unless-stopped
    ports:
      - '1883:1883'
      - '9001:9001'
    volumes:
      - mosquitto-data:/mosquitto/data
      - mosquitto-logs:/mosquitto/log
      - ./mosquitto.conf:/mosquitto/config/mosquitto.conf
    networks:
      - zwave

networks:
  zwave:
    driver: bridge

volumes:
  zwave-config:
  mosquitto-data:
  mosquitto-logs:
```

**Key Environment Variables:**
- `SESSION_SECRET` - Session encryption key
- `TZ` - Timezone for logs and scheduling
- `ZWAVEJS_EXTERNAL_CONFIG` - External config path

#### Option 2: Native Installation

**Requirements:**
- Node.js 20.19+
- Z-Wave USB stick
- Serial port access

**Installation:**
```bash
npm install -g zwave-js-ui
zwave-js-ui
```

Access UI at http://localhost:8091

### Configuration Checklist

#### 1. Z-Wave Settings

**Serial Port:**
- Linux: `/dev/ttyUSB0` or `/dev/ttyACM0`
- macOS: `/dev/cu.usbserial-*`
- Windows: `COM3` (varies)

**Security Keys:**
- **S0 Legacy:** Required for older devices
- **S2 Unauthenticated:** Basic S2 without DSK verification
- **S2 Authenticated:** For sensors, lighting (recommended)
- **S2 Access Control:** For locks, garage doors (highest security)

**Important:** Generate random keys, backup securely, never commit to Git!

**Generate Keys Script:**
```bash
# Generate 32-character hex key
openssl rand -hex 16
```

#### 2. MQTT Settings

**Recommended Configuration:**
```yaml
Host: mqtt://localhost (or IP of MQTT broker)
Port: 1883
QoS: 1
Retain: true  # Important! Allows Home Assistant to get last value on restart
Prefix: zwave
Clean: true
Store: true  # Persistent message storage
```

**Authentication:**
- Enable if Mosquitto requires auth
- Use environment variables for credentials
- Never hardcode passwords

#### 3. Gateway Settings

**Type:** ValueID Topics
**Payload type:** JSON Time-Value
**Use nodes name instead of numeric nodeIDs:** false (use IDs for stability)
**Send Z-Wave Events:** true (helpful for debugging)
**Ignore status updates:** false
**Ignore location:** false
**Publish node details:** true

### Integration with LangChain Tools

#### Device Control Tool Example

```typescript
import { DynamicTool } from '@langchain/core/tools';
import mqtt from 'mqtt';

export function createDeviceControlTool(mqttClient: mqtt.MqttClient) {
  return new DynamicTool({
    name: 'control_zwave_device',
    description: 'Control a Z-Wave device. Parameters: nodeId (number), commandClass (number), endpoint (number), property (string), value (number|string|boolean)',
    func: async (input: string) => {
      const params = JSON.parse(input);
      const { nodeId, commandClass, endpoint, property, value } = params;

      const topic = `zwave/${nodeId}/${commandClass}/${endpoint}/${property}/set`;
      const payload = JSON.stringify({ value });

      await mqttClient.publish(topic, payload, { qos: 1 });

      return `Device ${nodeId} command sent: ${property} = ${value}`;
    },
  });
}
```

#### Get Device State Tool Example

```typescript
export function createDeviceStateTool(mqttClient: mqtt.MqttClient) {
  return new DynamicTool({
    name: 'get_zwave_device_state',
    description: 'Get current state of a Z-Wave device. Parameters: nodeId (number), commandClass (number), endpoint (number), property (string)',
    func: async (input: string) => {
      const params = JSON.parse(input);
      const { nodeId, commandClass, endpoint, property } = params;

      return new Promise((resolve, reject) => {
        const topic = `zwave/${nodeId}/${commandClass}/${endpoint}/${property}`;

        const timeout = setTimeout(() => {
          reject(new Error('Timeout waiting for device state'));
        }, 5000);

        const handler = (receivedTopic: string, message: Buffer) => {
          if (receivedTopic === topic) {
            clearTimeout(timeout);
            mqttClient.off('message', handler);

            const state = JSON.parse(message.toString());
            resolve(`Device ${nodeId} ${property}: ${state.value}`);
          }
        };

        mqttClient.on('message', handler);
        mqttClient.subscribe(topic, { qos: 1 });
      });
    },
  });
}
```

#### List Devices Tool Example

```typescript
export function createListDevicesTool(mqttClient: mqtt.MqttClient) {
  return new DynamicTool({
    name: 'list_zwave_devices',
    description: 'List all available Z-Wave devices in the network',
    func: async () => {
      return new Promise((resolve, reject) => {
        const apiTopic = 'zwave/_CLIENTS/ZWAVE_GATEWAY-office/api/getNodes/set';
        const resultTopic = 'zwave/_CLIENTS/ZWAVE_GATEWAY-office/api/getNodes';

        const timeout = setTimeout(() => {
          reject(new Error('Timeout waiting for device list'));
        }, 5000);

        const handler = (receivedTopic: string, message: Buffer) => {
          if (receivedTopic === resultTopic) {
            clearTimeout(timeout);
            mqttClient.off('message', handler);

            const nodes = JSON.parse(message.toString());
            const deviceList = nodes.map((node: any) =>
              `${node.id}: ${node.name || 'Unnamed'} (${node.loc || 'No location'})`
            ).join('\n');

            resolve(deviceList);
          }
        };

        mqttClient.on('message', handler);
        mqttClient.subscribe(resultTopic, { qos: 1 });
        mqttClient.publish(apiTopic, JSON.stringify({ args: [] }), { qos: 1 });
      });
    },
  });
}
```

### Common Z-Wave Command Classes

For our LangChain tool prompts, these are the most common command classes:

| Command Class | Number | Description | Example Values |
|---------------|--------|-------------|----------------|
| Basic | 32 | Basic on/off | 0 (off), 255 (on) |
| Switch Binary | 37 | Binary switch | true/false |
| Switch Multilevel | 38 | Dimmer, blinds | 0-99 (percentage) |
| Sensor Binary | 48 | Motion, door/window | true/false |
| Sensor Multilevel | 49 | Temperature, humidity | Numeric + unit |
| Meter | 50 | Energy, power | Numeric + unit |
| Color Switch | 51 | RGB/RGBW lights | Color values |
| Thermostat Mode | 64 | HVAC mode | 0=off, 1=heat, 2=cool |
| Thermostat Setpoint | 67 | Target temperature | Temperature value |
| Lock | 98 | Door locks | 0=unlocked, 255=locked |
| Configuration | 112 | Device settings | Device-specific |

### Network Dependencies

**Local Network Only:**
- ✅ Z-Wave JS UI → MQTT broker (local)
- ✅ Z-Wave JS UI → Z-Wave devices (RF, no WiFi)
- ✅ Next.js app → MQTT broker (local)
- ✅ Next.js app → Ollama (local)

**Internet Required (One-time Setup):**
- ☁️ Initial installation (npm packages, Docker images)
- ☁️ Z-Wave device database updates (optional, pre-cache before demo)

**Internet Required (During Demo):**
- ❌ None! All components run locally.

**Demo Reliability:**
- Zero internet dependencies during presentation
- All processing happens on local network
- Z-Wave uses RF (not WiFi), extremely reliable
- MQTT broker runs locally (no cloud MQTT needed)

### Security Considerations

**MQTT Security:**
- Enable authentication on Mosquitto
- Use TLS for production (optional for demo)
- Don't expose MQTT port to internet
- Use strong passwords for Z-Wave JS UI web interface

**Z-Wave Security:**
- Always use S2 security for new devices
- Backup security keys securely
- Verify DSK during inclusion (prevent man-in-the-middle)
- Don't include devices without encryption in production

**Web UI Security:**
- Enable authentication (default: admin/zwave)
- Change default credentials immediately
- Use HTTPS in production
- Consider reverse proxy (Nginx) for added security

### Troubleshooting Tips

**Z-Wave stick not detected:**
```bash
# Linux: Check device permissions
ls -l /dev/ttyUSB0
sudo usermod -a -G dialout $USER

# Docker: Ensure --device flag is correct
```

**MQTT not connecting:**
```bash
# Test Mosquitto
mosquitto_sub -h localhost -t '#' -v

# Check Z-Wave JS UI logs
docker logs zwave-js-ui
```

**Device not responding:**
- Check device is powered on
- Verify device is included in network
- Try "Ping Node" in Control Panel
- Check "Last Active" timestamp
- Refresh device values manually

**Slow responses:**
- Battery devices sleep (wake manually)
- Check Z-Wave network health
- Reduce MQTT QoS if needed
- Verify controller firmware is updated

### Development Workflow

**1. Initial Setup:**
```bash
# Start Z-Wave JS UI + Mosquitto
docker-compose up -d

# Access Control Panel
open http://localhost:8091

# Include Z-Wave devices via UI
# Configure MQTT settings
# Test device control via MQTT Explorer
```

**2. Integration Development:**
```bash
# Install Next.js dependencies
npm install mqtt @types/mqtt

# Create LangChain tools
# Test MQTT publish/subscribe
# Implement device state caching
```

**3. Testing:**
```bash
# Monitor MQTT messages
mosquitto_sub -h localhost -t 'zwave/#' -v

# Test device control
mosquitto_pub -h localhost -t 'zwave/5/38/0/targetValue/set' -m '{"value":50}'
```

### Production Deployment

**Docker Stack (Recommended):**
- Z-Wave JS UI container
- Mosquitto MQTT broker container
- Next.js application container
- Ollama container (if not running natively)
- PostgreSQL/SQLite for data persistence

**Networking:**
- All containers on same Docker network
- Expose only necessary ports (8091, 3000 for Z-Wave JS UI)
- MQTT broker on internal network only
- Reverse proxy (Traefik/Nginx) for HTTPS

**Persistence:**
- Z-Wave JS UI store volume (contains node database)
- Mosquitto data volume (message persistence)
- Next.js database volume (conversation history)

**Monitoring:**
- Z-Wave JS UI provides network graph
- MQTT broker connection status
- Device last-active timestamps
- Failed node detection

### Reference Links

**Official Documentation:**
- Z-Wave JS UI Docs: https://zwave-js.github.io/zwave-js-ui/
- Z-Wave JS API: https://zwave-js.github.io/node-zwave-js/
- MQTT Guide: https://zwave-js.github.io/zwave-js-ui/#/guide/mqtt
- Home Assistant Integration: https://zwave-js.github.io/zwave-js-ui/#/homeassistant/homeassistant-mqtt

**GitHub:**
- Repository: https://github.com/zwave-js/zwave-js-ui
- Issues: https://github.com/zwave-js/zwave-js-ui/issues
- Discussions: https://github.com/zwave-js/zwave-js-ui/discussions

**Community:**
- Discord: https://discord.gg/HFqcyFNfWd
- Reddit: r/zwave

### Key Takeaways for Presentation

1. **Local-First Architecture:** Z-Wave JS UI perfectly aligns with our local-first approach - zero cloud dependencies during demo
2. **MQTT as Integration Layer:** Clean separation between Z-Wave complexity and our AI layer
3. **Production-Ready:** Battle-tested by thousands of Home Assistant users
4. **Rich API Surface:** Full Z-Wave JS API exposed via MQTT for advanced automation
5. **Easy Testing:** MQTT Explorer makes debugging trivial during development
6. **Reliable RF:** Z-Wave RF is more reliable than WiFi for home automation
7. **Active Development:** Regular updates, responsive maintainers, modern tech stack

### Next Steps

1. Set up Z-Wave JS UI in Docker with Mosquitto
2. Include test Z-Wave devices (or use mock devices for development)
3. Configure ValueID Topics gateway mode
4. Implement LangChain MQTT tools
5. Test basic device control flow: Ollama → LangChain → MQTT → Z-Wave
6. Build device state caching layer
7. Create comprehensive device capability mapping
8. Implement error handling and retry logic