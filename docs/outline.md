# CodeMash 2026 Presentation Outline
## MQTT + Ollama = Building Home Automation That Actually Works (And Doesn't Spy on You)

**Date:** January 12, 2026  
**Duration:** 45 minutes total  
**Format:** Live demo + architecture explanation + Q&A

---

## 1. Introduction & Topic Overview (5 minutes)
- **Hook:** "Tired of smart home devices that need the internet to turn on a light bulb?"
- Present the core problem: Cloud dependency, privacy concerns, unreliable voice assistants
- Introduce the solution: Local AI + MQTT for truly intelligent home automation
- Set expectations: Live demo of conversational AI controlling real Z-Wave devices
- **Key Message:** No cloud dependencies, no monthly subscriptions, no corporate eavesdropping

## 2. Speaker Introduction (2 minutes)
- Brief personal background and experience with home automation
- Why this project matters: Building systems that work offline and respect privacy
- Connection to the audience: Developers who want control over their smart homes

## 3. Ollama & Local LLM Models (10 minutes)

### 3.1 What is Ollama? (3 minutes)
- Local LLM runtime that runs models on your hardware
- No API keys, no cloud calls, complete privacy
- Supports multiple model formats (GGUF, etc.)

### 3.2 The Tool Calling Compatibility Trap (3 minutes)
- **The Problem:** Not all models support function calling!
- **Real-world discovery:** Tried multiple "recommended" models that failed
- **The error message:** `"model does not support tools"`
- **Critical requirement:** Our LangChain ToolCallingAgent NEEDS tool support
- **Models that failed:**
  - ❌ qwen2.5:3b (despite initial research suggesting support)
  - ❌ gemma2:2b
  - ❌ phi3:3.8b
- **Models that work:**
  - ✅ llama3.2:1b (RECOMMENDED for Raspberry Pi)
  - ✅ llama3.2:3b
  - ✅ mistral
- **Key Lesson:** Always test models with your specific use case - documentation can be misleading!
- **How to verify:** Look for log messages like "Using list_devices..." when testing

### 3.3 Hardware Comparison Demo (4 minutes)
- **Raspberry Pi 5 Setup:**
  - Model: llama3.2:1b (UPDATED from Qwen2.5:1.5b)
  - Performance: ~20 tokens/second, <1 second response time
  - Memory usage: ~1.3GB out of 8GB available
  - Tool support: ✅ Confirmed working
  - Use case: Edge deployment, always-on home automation

- **Mac Studio Setup:**
  - Model: DeepSeek-R1 70B or Llama 3.3 70B
  - Performance: ~8 tokens/second, richer reasoning
  - Memory usage: ~42GB out of 96GB available
  - Tool support: ✅ Excellent
  - Use case: Development, complex reasoning, demo showcase

- **Key Insight:** Model selection based on THREE factors: hardware constraints, use case requirements, AND tool calling support

## 4. Next.js + LangChain Integration (10 minutes)

### 4.1 Building a Chatbot with Next.js (4 minutes)
- Next.js 14 App Router for modern React development
- LangChain.js for AI orchestration and tool calling
- Why LangChain over Vercel AI SDK: Advanced agent capabilities, tool ecosystem

### 4.2 Agent Architecture (3 minutes)
- **AgentExecutor:** The brain that coordinates LLM + tools
- **Conversation Memory:** Maintaining context across interactions
- **Personality System:** Configurable AI responses (helpful, sarcastic, enthusiastic)

### 4.3 Why Agents Are Popular (3 minutes)
- Move beyond simple chat: Multi-step reasoning and tool use
- Real-world problem solving: "Make the living room cozy" → multiple device actions
- Extensibility: Easy to add new capabilities via tools

## 5. LangChain Tools: From Simple to Enterprise (12 minutes)

### 5.1 Custom Tool Development - The Simple Approach (5 minutes)
- **The Problem:** How to connect LLMs to real-world hardware?
- **The Solution:** LangChain tools as the bridge between AI and devices
- **Live Code Demo:** Building a simple MQTT tool from scratch (~15 lines)
  ```typescript
  // Complete working example - no libraries needed!
  import mqtt from 'mqtt';
  import { tool } from '@langchain/core/tools';
  import { z } from 'zod';

  const client = mqtt.connect('mqtt://localhost:1883');

  export const mqttPublishTool = tool(
    async ({ topic, message }) => {
      client.publish(topic, message);
      return `Published "${message}" to ${topic}`;
    },
    {
      name: 'mqtt_publish',
      description: 'Control a device by publishing to MQTT',
      schema: z.object({
        topic: z.string().describe('MQTT topic'),
        message: z.string().describe('Message payload'),
      }),
    }
  );
  ```
- **Demonstration:** "Turn on living room light" → Tool call → Physical device responds
- **Key Insight:** The entire bridge between AI and hardware is these 15 lines
- **Universal Pattern:** This same approach works for REST APIs, databases, serial devices, etc.

### 5.2 The Limitations of Custom Tools (2 minutes)
- **Great for prototypes and demos** - Quick to build, easy to understand
- **But production systems need more:**
  - What if 5 different AI tools need MQTT access? (Code duplication)
  - How do you share MQTT connection across Claude Desktop, Cursor, and your app?
  - Credentials management becomes tricky (same .env file everywhere?)
  - Testing MQTT logic requires running your entire AI app
- **The question:** How do we scale this simple pattern for production?

### 5.3 Enter Model Context Protocol (MCP) (5 minutes)
- **What is MCP?** Anthropic's standard protocol for connecting AI to external systems
- **The Architecture Evolution:**
  ```
  Before: AI App → Custom MQTT Tool → Devices (coupled)
  After:  AI App → MCP Server → Devices (decoupled)
  ```
- **Live Demo Comparison:**
  1. Show custom tool working (already running)
  2. Switch to MCP server (same functionality, better architecture)
  3. Show MCP Inspector testing MQTT without running AI app
  4. Demonstrate same MCP server controlling devices from Claude Desktop
- **Key Benefits:**
  - **Reusability:** One MCP server, multiple AI clients (Claude Desktop, Cursor, your app)
  - **Separation:** MQTT logic isolated from AI logic
  - **Testing:** MCP Inspector tests tools independently
  - **Security:** MQTT credentials in MCP config, not AI app code
  - **Standardization:** Part of growing ecosystem (100+ MCP servers)
- **The Trade-off:** +5 minutes setup, +5-10ms latency, but worth it for production
- **When to use each:**
  - Custom Tools: Prototypes, demos, learning, simple integrations
  - MCP Servers: Production, shared tools, enterprise systems, reusable components

## 6. MQTT for IoT Communication (7 minutes)

### 6.1 Why MQTT for Smart Homes? (3 minutes)
- **Lightweight:** Perfect for resource-constrained devices
- **Reliable:** QoS levels ensure message delivery
- **Scalable:** Pub/sub pattern handles many devices efficiently
- **Local-first:** No internet required for device communication

### 6.2 MQTT Topic Structure (2 minutes)
- Topic hierarchy: `home/device/action`
- Device state updates vs. command topics
- Retained messages for device state persistence

### 6.3 Live MQTT Demo (2 minutes)
- Show MQTT messages flowing in real-time
- Demonstrate bidirectional communication (state updates + commands)

## 7. Z-Wave JS UI Integration (8 minutes)

### 7.1 Z-Wave JS UI Overview (3 minutes)
- **What it is:** Full-featured Z-Wave control panel + MQTT gateway
- **Why we use it:** Mature, reliable, excellent MQTT integration
- **Architecture:** Z-Wave USB stick → Z-Wave JS UI → MQTT → Our AI system

### 7.2 Device Communication Flow (3 minutes)
- **Device Discovery:** How Z-Wave devices appear in MQTT
- **Command Translation:** Natural language → MQTT topics → Z-Wave commands
- **State Synchronization:** Real-time updates from physical devices

### 7.3 Live Z-Wave Demo (2 minutes)
- Show physical Z-Wave devices responding to AI commands
- Demonstrate different device types: switches, dimmers, sensors

## 8. Complete System Demo (5 minutes)

### 8.1 End-to-End Flow (3 minutes)
- **User:** "Turn off all the lights in the living room"
- **AI Processing:** LangChain agent parses intent
- **Tool Execution:** MQTT commands sent to Z-Wave devices
- **Physical Response:** Lights actually turn off
- **AI Feedback:** Conversational confirmation with personality

### 8.2 Complex Scenarios (2 minutes)
- **Scene Control:** "Make it cozy for movie night"
- **Contextual Commands:** "Turn it off" (referring to previous device)
- **Error Handling:** What happens when devices are offline

## 9. Wrap-up & Architecture Summary (2 minutes)
- **Key Benefits:** Privacy, reliability, extensibility, no subscriptions
- **Architecture Recap:** Next.js → LangChain → Ollama + MQTT → Z-Wave devices
- **Takeaways:** Local-first AI is practical and powerful today

## 10. Q&A Session (10 minutes)
- Open floor for technical questions
- Discussion of deployment options, scaling, security
- Alternative approaches and trade-offs

---

## Technical Requirements for Demo

### Hardware Setup
- **Laptop:** Mac Studio with Ollama running DeepSeek-R1 70B
- **Z-Wave Devices:** 2-3 physical devices (switches, dimmers, motion sensor)
- **Z-Wave USB Stick:** Connected to laptop running Z-Wave JS UI
- **Network:** Local WiFi for MQTT broker (HiveMQ CE)

### Software Stack
- **Frontend:** Next.js 14 with TypeScript and TailwindCSS
- **AI:** LangChain.js + Ollama (local inference)
- **Communication:** MQTT.js client + HiveMQ Community Edition
- **Z-Wave:** Z-Wave JS UI Docker container
- **Database:** SQLite for user preferences and device mappings

### Backup Plans
- **Mock Devices:** Software simulation if hardware fails
- **Recorded Demo:** Video backup of working system
- **Simplified Flow:** Manual MQTT commands if AI fails
- **Presentation Slides:** Architecture diagrams and code examples

### Timing Breakdown
- **Setup/Introduction:** 7 minutes
- **Technical Deep Dive:** 28 minutes (includes tool calling compatibility section)
- **Live Demo:** 7 minutes
- **Q&A:** 8 minutes
- **Total:** 45 minutes (with 5-minute buffer)

---

## Key Messages

1. **Local AI is Ready:** Modern hardware can run capable LLMs locally
2. **Privacy Matters:** Your smart home doesn't need to phone home
3. **MQTT is Powerful:** Perfect protocol for IoT device communication  
4. **Integration is Key:** LangChain + MCP make complex systems manageable
5. **It Actually Works:** Live demo proves the concept is production-ready

## Call to Action

- **Source Code:** Complete project available on GitHub
- **Documentation:** Step-by-step setup guide for attendees
- **Community:** Join the discussion on local-first smart homes
- **Next Steps:** How to get started with your own setup
