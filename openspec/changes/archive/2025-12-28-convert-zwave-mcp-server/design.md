# Design: Z-Wave MCP Server Standards Compliance

## Overview

This design converts the Z-Wave MCP Server from a custom stdio-based implementation to a standards-compliant MCP integration compatible with LangChain, Vercel's MCP Adapter, and the AI SDK.

## Architecture Diagrams

### Current Architecture (Before)

```
┌──────────────────────┐         ┌──────────────────────┐
│  voice-gateway-oww   │         │  oracle (Next.js)    │
│                      │         │                      │
│  Custom Client:      │         │  Custom Client:      │
│  ┌────────────────┐  │         │  ┌────────────────┐  │
│  │ MCPZWaveClient │  │         │  │ MCPZWaveClient │  │
│  │ (custom impl)  │  │         │  │ (re-export)    │  │
│  │                │  │         │  │                │  │
│  │ • spawn()      │  │         │  │ • spawn()      │  │
│  │ • stdio JSON-  │  │         │  │ • stdio JSON-  │  │
│  │   RPC          │  │         │  │   RPC          │  │
│  │ • custom tool  │  │         │  │ • custom tool  │  │
│  │   calling      │  │         │  │   calling      │  │
│  └────────┬───────┘  │         │  └────────┬───────┘  │
└───────────┼──────────┘         └───────────┼──────────┘
            │                                │
            │ stdio                          │ stdio
            │ (separate processes)           │ (separate processes)
            ▼                                ▼
   ┌────────────────────┐         ┌────────────────────┐
   │ zwave-mcp-server   │         │ zwave-mcp-server   │
   │ (spawned process 1)│         │ (spawned process 2)│
   └────────────────────┘         └────────────────────┘

Problems:
• Duplicate server processes (resource waste)
• Custom client reinvents MCP protocol
• No LangChain integration
• No frontend/browser support
• No SSE transport for remote access
```

### Proposed Architecture (After)

```
┌──────────────────────────────────────────────────────────────┐
│                    Z-Wave MCP Server                         │
│                  (Single Instance Service)                   │
│                                                               │
│  Transports:                                                  │
│  ┌──────────┐              ┌──────────────┐                  │
│  │  stdio   │              │   SSE/HTTP   │                  │
│  │ (local)  │              │   (remote)   │                  │
│  └─────┬────┘              └──────┬───────┘                  │
└────────┼────────────────────────┼──────────────────────────┘
         │                        │
         │                        │
    ┌────▼────────────────────┐   │
    │                         │   │
┌───▼────────────────┐  ┌─────▼──────────────┐
│ voice-gateway-oww  │  │ oracle (Next.js)   │
│                    │  │                    │
│ LangChain          │  │ Backend:           │
│ Integration:       │  │ ┌────────────────┐ │
│ ┌────────────────┐ │  │ │ Vercel MCP     │ │
│ │ Multi          │ │  │ │ Adapter        │ │
│ │ ServerMCP      │ │  │ │                │ │
│ │ Client         │ │  │ │ /api/mcp route │ │
│ │                │ │  │ └────────────────┘ │
│ │ • stdio        │ │  │                    │
│ │ • getTools()   │ │  │ Frontend:          │
│ │ • LangChain    │ │  │ ┌────────────────┐ │
│ │   agent        │ │  │ │ AI SDK MCP     │ │
│ │   binding      │ │  │ │ Client         │ │
│ └────────────────┘ │  │ │                │ │
│                    │  │ │ • SSE          │ │
│ Tool Executor:     │  │ │ • browser-safe │ │
│ • Calls tools via  │  │ └────────────────┘ │
│   LangChain        │  │                    │
│ • Auto schema      │  │ UI Components:     │
│   conversion       │  │ • Tool discovery   │
└────────────────────┘  │ • Chat interface   │
                        │ • Tool invocation  │
                        └────────────────────┘

Benefits:
✅ Single MCP server instance (SSE mode)
✅ Standard LangChain integration
✅ Browser-compatible frontend
✅ No custom MCP client code
✅ Supports multiple transports
```

## Component Designs

### 1. Z-Wave MCP Server

**Current State:**
- Implements `@modelcontextprotocol/sdk` ✅
- stdio transport only
- Started via `spawn()` by consumers

**Proposed Changes:**

#### Transport Layer

**stdio Transport (Existing - Keep):**
```javascript
// src/index.js
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new Server({
  name: "zwave-mcp-server",
  version: "1.0.0",
}, {
  capabilities: {
    tools: {},
  },
});

// Register tools (existing code)
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [/* tool definitions */]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  // Tool execution logic
});

// stdio transport (existing)
const transport = new StdioServerTransport();
await server.connect(transport);
```

**SSE Transport (New - Optional):**
```javascript
// src/transports/sse-server.js
import express from 'express';
import cors from 'cors';
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

export function createSSEServer(server, port = 3100) {
  const app = express();
  app.use(cors());

  app.get('/mcp/sse', async (req, res) => {
    const transport = new SSEServerTransport('/mcp/messages', res);
    await server.connect(transport);
  });

  app.post('/mcp/messages', express.json(), async (req, res) => {
    // Handle incoming messages
  });

  app.listen(port, () => {
    console.log(`MCP SSE server listening on port ${port}`);
  });
}
```

**Server Startup Logic:**
```javascript
// src/index.js (enhanced)
const transport = process.env.MCP_TRANSPORT || 'stdio';

if (transport === 'stdio') {
  const stdioTransport = new StdioServerTransport();
  await server.connect(stdioTransport);
} else if (transport === 'sse') {
  const port = process.env.MCP_PORT || 3100;
  createSSEServer(server, port);
}
```

**No Breaking Changes:** Existing stdio behavior preserved by default.

### 2. Voice Gateway Integration (LangChain)

**Current Implementation:**
```javascript
// src/mcpZWaveClient.js (REMOVE THIS)
import { getMCPClient } from 'zwave-mcp-server/client';

const client = getMCPClient();
await client.start();
const devices = await getDevicesForAI();
```

**Proposed Implementation:**

#### Step 1: Install Dependencies
```json
// package.json
{
  "dependencies": {
    "@langchain/mcp-adapters": "latest",
    "@langchain/anthropic": "latest", // or ollama
    "langchain": "latest"
  }
}
```

#### Step 2: Configure MCP Client
```javascript
// src/services/MCPIntegration.js (NEW FILE)
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import path from 'path';

export function createMCPClient(config, logger) {
  const zwaveServerPath = path.resolve(
    __dirname,
    '../../zwave-mcp-server/src/index.js'
  );

  const mcpClient = new MultiServerMCPClient({
    zwave: {
      transport: "stdio",
      command: process.execPath, // node
      args: [zwaveServerPath],
      env: {
        ...process.env,
        // Pass zwave server config
        ZWAVE_UI_URL: config.zwave.uiUrl,
        ZWAVE_UI_USERNAME: config.zwave.username,
        ZWAVE_UI_PASSWORD: config.zwave.password,
      },
    },
  });

  logger.info('MCP client configured', {
    servers: Object.keys(mcpClient.servers)
  });

  return mcpClient;
}
```

#### Step 3: Integrate with ToolRegistry
```javascript
// src/services/ToolRegistry.js (MODIFIED)
import { createMCPClient } from './MCPIntegration.js';

export class ToolRegistry {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.tools = new Map();
    this.mcpClient = null;
  }

  async initializeMCPTools() {
    this.mcpClient = createMCPClient(this.config, this.logger);

    // Get tools from all MCP servers
    const mcpTools = await this.mcpClient.getTools();

    this.logger.info('Discovered MCP tools', {
      count: mcpTools.length,
      tools: mcpTools.map(t => t.name)
    });

    // Register MCP tools (LangChain format)
    for (const tool of mcpTools) {
      this.tools.set(tool.name, {
        definition: tool,
        executor: async (args) => {
          // LangChain handles MCP tool invocation
          return tool.call(args);
        },
      });
    }
  }

  // Keep existing manual tool registration for non-MCP tools
  registerTool(definition, executor) {
    this.tools.set(definition.name, { definition, executor });
  }
}
```

#### Step 4: Update AIRouter
```javascript
// src/ai/AIRouter.js (MODIFIED)
export class AIRouter {
  async query(transcription, intent, options = {}) {
    // Build system prompt
    const systemPrompt = await this.buildSystemPrompt(intent.isDeviceQuery);

    // Get conversation messages
    const messages = conversationManager.getMessages(systemPrompt);

    // Get tools (includes MCP tools from registry)
    const tools = this.toolExecutor?.registry?.getTools() || [];

    // Query AI with tools
    const queryOptions = {
      messages,
      systemPrompt,
      tools, // LangChain-compatible tools (including MCP)
      toolExecutor: this.executeTool.bind(this),
      onToken: options.onToken,
    };

    return await this.client.query(transcription, queryOptions);
  }
}
```

#### Step 5: Tool Execution Flow

```javascript
// src/services/ToolExecutor.js (MINIMAL CHANGES)
export class ToolExecutor {
  async executeTool(toolName, args) {
    const tool = this.registry.tools.get(toolName);

    if (!tool) {
      this.logger.warn('Unknown tool requested', { toolName });
      return { error: `Unknown tool: ${toolName}` };
    }

    // Execute tool (works for both MCP and manual tools)
    return await tool.executor(args);
  }
}
```

**Key Design Decisions:**

1. **Gradual Migration:** Keep `ToolRegistry` for manual tools, add MCP tools alongside
2. **Transparent Execution:** `ToolExecutor` doesn't know/care if tool is MCP or manual
3. **LangChain Handles Protocol:** No custom JSON-RPC code needed
4. **Environment Passthrough:** MCP server gets config via env vars

### 3. Oracle Backend Integration (Next.js API)

**Proposed Implementation:**

#### Option A: Vercel MCP Adapter (Recommended)

```javascript
// app/api/mcp/route.js (NEW FILE)
import { createMCPHandler } from '@vercel/mcp-adapter';
import path from 'path';

const zwaveServerPath = path.resolve(
  process.cwd(),
  '../zwave-mcp-server/src/index.js'
);

export const GET = createMCPHandler({
  servers: {
    zwave: {
      transport: 'stdio',
      command: process.execPath,
      args: [zwaveServerPath],
      env: {
        ZWAVE_UI_URL: process.env.ZWAVE_UI_URL,
        ZWAVE_UI_USERNAME: process.env.ZWAVE_UI_USERNAME,
        ZWAVE_UI_PASSWORD: process.env.ZWAVE_UI_PASSWORD,
      },
    },
  },
});

// SSE transport automatically handled by Vercel adapter
export const POST = GET; // Handle both GET (SSE) and POST (messages)
```

**Benefits:**
- Zero boilerplate
- Built-in SSE handling
- Automatic tool discovery
- Compatible with AI SDK frontend

#### Option B: AI SDK MCP Tools (Alternative)

```javascript
// lib/mcp/server.js (NEW FILE)
import { createMCPClient } from '@ai-sdk/mcp';
import path from 'path';

export async function getZWaveTools() {
  const zwaveServerPath = path.resolve(
    process.cwd(),
    '../zwave-mcp-server/src/index.js'
  );

  const client = createMCPClient({
    transport: 'stdio',
    command: process.execPath,
    args: [zwaveServerPath],
  });

  const tools = await client.tools();
  return tools;
}
```

**LangChain Integration (Backend):**
```javascript
// app/api/chat/route.js
import { ChatAnthropic } from "@langchain/anthropic";
import { getZWaveTools } from '@/lib/mcp/server';

export async function POST(req) {
  const { messages } = await req.json();

  // Get MCP tools
  const mcpTools = await getZWaveTools();

  // Create LangChain agent
  const model = new ChatAnthropic({
    model: "claude-haiku-4-5-20251001",
  });

  const agent = createAgent({
    model,
    tools: mcpTools,
  });

  const response = await agent.invoke({ messages });

  return Response.json(response);
}
```

**Recommendation:** Use Option A (Vercel MCP Adapter) for simpler integration.

### 4. Oracle Frontend Integration (Browser)

**Proposed Implementation:**

#### Install Dependencies
```json
// package.json
{
  "dependencies": {
    "@ai-sdk/react": "latest",
    "@ai-sdk/mcp": "latest",
    "ai": "latest"
  }
}
```

#### Create MCP Client Hook
```javascript
// hooks/useMCPClient.js (NEW FILE)
import { createMCPClient } from '@ai-sdk/mcp';
import { useEffect, useState } from 'react';

export function useMCPClient() {
  const [client, setClient] = useState(null);
  const [tools, setTools] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      // Connect to backend MCP endpoint
      const mcpClient = createMCPClient({
        transport: 'sse',
        url: '/api/mcp', // Vercel MCP Adapter endpoint
      });

      const availableTools = await mcpClient.tools();

      setClient(mcpClient);
      setTools(availableTools);
      setLoading(false);
    }

    init();
  }, []);

  return { client, tools, loading };
}
```

#### Chat Component with MCP Tools
```javascript
// components/AIChat.jsx (MODIFIED)
import { useChat } from '@ai-sdk/react';
import { useMCPClient } from '@/hooks/useMCPClient';

export function AIChat() {
  const { tools, loading: mcpLoading } = useMCPClient();

  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/chat',
    tools, // MCP tools automatically available
  });

  if (mcpLoading) {
    return <div>Loading MCP tools...</div>;
  }

  return (
    <div>
      <div className="tools-available">
        <h3>Available Tools ({tools.length})</h3>
        <ul>
          {tools.map(tool => (
            <li key={tool.name}>{tool.name}: {tool.description}</li>
          ))}
        </ul>
      </div>

      <div className="messages">
        {messages.map(m => (
          <div key={m.id}>
            <strong>{m.role}:</strong> {m.content}

            {/* Show tool calls */}
            {m.toolInvocations?.map(tool => (
              <div key={tool.toolCallId} className="tool-call">
                🔧 {tool.toolName}({JSON.stringify(tool.args)})
                → {tool.result}
              </div>
            ))}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about Z-Wave devices..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
```

#### Device Control UI Component
```javascript
// components/DeviceControl.jsx (NEW)
import { useMCPClient } from '@/hooks/useMCPClient';
import { useState } from 'react';

export function DeviceControl() {
  const { client, tools } = useMCPClient();
  const [devices, setDevices] = useState([]);

  async function listDevices() {
    const tool = tools.find(t => t.name === 'list_zwave_devices');
    if (!tool) return;

    const result = await client.callTool(tool.name, {
      includeInactive: false
    });

    setDevices(result.devices);
  }

  async function controlDevice(deviceName, action) {
    const tool = tools.find(t => t.name === 'control_zwave_device');
    if (!tool) return;

    await client.callTool(tool.name, {
      deviceName,
      action
    });

    // Refresh device list
    await listDevices();
  }

  return (
    <div>
      <button onClick={listDevices}>Refresh Devices</button>

      <div className="devices-grid">
        {devices.map(device => (
          <div key={device.name} className="device-card">
            <h3>{device.name}</h3>
            <p>{device.location}</p>
            <p>Status: {device.status}</p>

            <div className="controls">
              <button onClick={() => controlDevice(device.name, 'on')}>
                Turn On
              </button>
              <button onClick={() => controlDevice(device.name, 'off')}>
                Turn Off
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Data Flow Diagrams

### Voice Gateway Tool Execution Flow

```
User Triggers Wake Word
        ↓
"What devices are available?"
        ↓
┌──────────────────────────────────────┐
│ VoiceInteractionOrchestrator         │
│  • Transcription                     │
│  • Intent classification             │
│  • isDeviceQuery = true              │
└──────────┬───────────────────────────┘
           ↓
┌──────────▼───────────────────────────┐
│ AIRouter                             │
│  • Build system prompt (with device  │
│    info request)                     │
│  • Get tools from ToolRegistry       │
└──────────┬───────────────────────────┘
           ↓
┌──────────▼───────────────────────────┐
│ AnthropicClient (LangChain)          │
│  • Receives tools (MCP-discovered)   │
│  • Model decides to call             │
│    "list_zwave_devices" tool         │
└──────────┬───────────────────────────┘
           ↓
┌──────────▼───────────────────────────┐
│ ToolExecutor                         │
│  • Finds tool in registry            │
│  • tool.executor(args)               │
└──────────┬───────────────────────────┘
           ↓
┌──────────▼───────────────────────────┐
│ LangChain MCP Tool Wrapper           │
│  • Sends CallToolRequest via        │
│    MultiServerMCPClient              │
└──────────┬───────────────────────────┘
           ↓ (stdio JSON-RPC)
┌──────────▼───────────────────────────┐
│ zwave-mcp-server                     │
│  • Receives list_zwave_devices       │
│  • Fetches from Z-Wave JS UI API     │
│  • Returns device list               │
└──────────┬───────────────────────────┘
           ↓
AI Response: "You have 2 devices..."
           ↓
TTS Playback to User
```

### Oracle Frontend Tool Execution Flow

```
User Types in Chat: "Turn on Switch One"
        ↓
┌──────────────────────────────────────┐
│ AIChat Component (Browser)           │
│  • useChat hook submits message      │
└──────────┬───────────────────────────┘
           ↓ POST /api/chat
┌──────────▼───────────────────────────┐
│ Next.js API Route (/api/chat)        │
│  • Receives message                  │
│  • Gets MCP tools from backend       │
│  • Creates LangChain agent           │
└──────────┬───────────────────────────┘
           ↓
┌──────────▼───────────────────────────┐
│ LangChain Agent                      │
│  • Model decides to call             │
│    "control_zwave_device" tool       │
│  • Args: {deviceName: "Switch One",  │
│           action: "on"}              │
└──────────┬───────────────────────────┘
           ↓
┌──────────▼───────────────────────────┐
│ MCP Tool Invocation                  │
│  • Backend MCP client                │
│  • Calls zwave-mcp-server            │
└──────────┬───────────────────────────┘
           ↓ (stdio or SSE)
┌──────────▼───────────────────────────┐
│ zwave-mcp-server                     │
│  • Executes control_zwave_device     │
│  • Publishes MQTT command            │
│  • Returns success                   │
└──────────┬───────────────────────────┘
           ↓
AI Response: "I turned on Switch One"
           ↓ (SSE stream)
┌──────────▼───────────────────────────┐
│ AIChat Component                     │
│  • Displays response                 │
│  • Shows tool invocation details     │
└──────────────────────────────────────┘
```

## Error Handling Strategy

### MCP Server Errors

**Scenario:** Z-Wave JS UI is unreachable

**Current Behavior:**
```javascript
// Custom client (zwave-mcp-server/client)
throw new Error('Failed to fetch devices');
```

**Proposed Behavior:**
```javascript
// MCP standard error response
{
  "error": {
    "code": -32001,
    "message": "Z-Wave JS UI unreachable",
    "data": {
      "url": "http://localhost:8091",
      "details": "Connection timeout after 5000ms"
    }
  }
}
```

**Consumer Handling (LangChain):**
```javascript
// AIRouter catches MCP errors
try {
  const result = await tool.call(args);
} catch (error) {
  if (error.code === -32001) {
    logger.error('Z-Wave service unavailable', error.data);
    return "Sorry, I can't reach the Z-Wave devices right now.";
  }
  throw error;
}
```

### Frontend Error Handling

**Scenario:** MCP endpoint not available

```javascript
// hooks/useMCPClient.js
export function useMCPClient() {
  const [error, setError] = useState(null);

  useEffect(() => {
    async function init() {
      try {
        const mcpClient = createMCPClient({
          transport: 'sse',
          url: '/api/mcp',
        });

        const availableTools = await mcpClient.tools();
        setTools(availableTools);
      } catch (err) {
        setError('Failed to connect to MCP server');
        console.error('MCP initialization failed', err);
      }
    }

    init();
  }, []);

  return { tools, error, loading };
}
```

**UI Display:**
```javascript
// components/AIChat.jsx
const { tools, error, loading } = useMCPClient();

if (error) {
  return (
    <div className="error">
      ⚠️ {error}
      <button onClick={() => window.location.reload()}>
        Retry
      </button>
    </div>
  );
}
```

## Security Considerations

### 1. Environment Variable Isolation

**Problem:** MCP server needs Z-Wave credentials, but shouldn't expose them

**Solution:**
```javascript
// Voice Gateway (passes env vars to spawned MCP server)
const mcpClient = new MultiServerMCPClient({
  zwave: {
    transport: "stdio",
    command: process.execPath,
    args: [zwaveServerPath],
    env: {
      // Only pass necessary env vars (not entire process.env)
      ZWAVE_UI_URL: config.zwave.uiUrl,
      ZWAVE_UI_USERNAME: config.zwave.username,
      ZWAVE_UI_PASSWORD: config.zwave.password,
      MQTT_BROKER_URL: config.mqtt.brokerUrl,
      // Do NOT pass: API keys, secrets, etc.
    },
  },
});
```

### 2. Frontend Authentication

**Problem:** Browser shouldn't have direct access to MCP server credentials

**Solution (Vercel MCP Adapter):**
```javascript
// app/api/mcp/route.js
import { createMCPHandler } from '@vercel/mcp-adapter';
import { auth } from '@/lib/auth'; // Next.js auth

export const GET = auth(async (req) => {
  // Only authenticated users can access MCP endpoint
  if (!req.auth) {
    return new Response('Unauthorized', { status: 401 });
  }

  return createMCPHandler({
    servers: {
      zwave: {
        transport: 'stdio',
        command: process.execPath,
        args: [zwaveServerPath],
        env: {
          // Backend provides credentials, frontend never sees them
          ZWAVE_UI_URL: process.env.ZWAVE_UI_URL,
          ZWAVE_UI_USERNAME: process.env.ZWAVE_UI_USERNAME,
          ZWAVE_UI_PASSWORD: process.env.ZWAVE_UI_PASSWORD,
        },
      },
    },
  })(req);
});
```

### 3. Tool Execution Validation

**Problem:** Malicious tool arguments could damage Z-Wave network

**Solution (Add validation in MCP server):**
```javascript
// zwave-mcp-server/src/index.js
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Validate arguments before execution
  if (name === 'control_zwave_device') {
    const { deviceName, action } = args;

    // Whitelist validation
    if (!['on', 'off', 'dim', 'brighten'].includes(action)) {
      throw new Error(`Invalid action: ${action}`);
    }

    // Sanitize device name (prevent injection)
    if (!/^[a-zA-Z0-9_\s-]+$/.test(deviceName)) {
      throw new Error(`Invalid device name: ${deviceName}`);
    }
  }

  // Execute tool
  return await executeTool(name, args);
});
```

## Performance Optimization

### 1. MCP Server Caching

**Problem:** Device list fetched repeatedly (slow Z-Wave JS UI API)

**Solution:**
```javascript
// zwave-mcp-server/src/device-cache.js
class DeviceCache {
  constructor(ttlMs = 30000) { // 30 second cache
    this.cache = null;
    this.lastFetch = 0;
    this.ttlMs = ttlMs;
  }

  async getDevices(fetchFn) {
    const now = Date.now();

    if (this.cache && (now - this.lastFetch) < this.ttlMs) {
      return this.cache; // Return cached data
    }

    // Fetch fresh data
    this.cache = await fetchFn();
    this.lastFetch = now;

    return this.cache;
  }

  invalidate() {
    this.cache = null;
  }
}

// Usage in list_zwave_devices tool
const deviceCache = new DeviceCache(30000);

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'list_zwave_devices') {
    return await deviceCache.getDevices(async () => {
      // Expensive API call
      return await fetchDevicesFromZWaveUI();
    });
  }
});

// Invalidate cache after device control
if (request.params.name === 'control_zwave_device') {
  const result = await controlDevice(args);
  deviceCache.invalidate(); // Force refresh on next list
  return result;
}
```

### 2. Lazy MCP Client Initialization

**Problem:** Voice gateway starts slower with MCP client init

**Solution:**
```javascript
// src/services/ToolRegistry.js
export class ToolRegistry {
  async initializeMCPTools() {
    // Initialize in background, don't block startup
    this.mcpClient = createMCPClient(this.config, this.logger);

    // Tools will be available after initialization completes
    this.mcpClient.getTools().then(tools => {
      this.logger.info('MCP tools ready', { count: tools.length });
      for (const tool of tools) {
        this.tools.set(tool.name, { definition: tool, executor: tool.call });
      }
    }).catch(err => {
      this.logger.error('MCP tool initialization failed', err);
    });
  }
}
```

## Testing Strategy

See tasks.md for detailed test cases.

### Unit Tests

- MCP server tool handlers (list_devices, control_device, etc.)
- LangChain MCP adapter configuration
- Tool registry MCP tool registration

### Integration Tests

- Voice gateway → MCP server → Z-Wave JS UI (full flow)
- Oracle backend → MCP server → Z-Wave JS UI
- Oracle frontend → Backend MCP endpoint → MCP server

### End-to-End Tests

- User voice command → Device control (voice gateway)
- User chat message → Device control (oracle)
- Frontend tool discovery and invocation

## Migration Path

### Phase 1: Voice Gateway (Week 1)
1. Add `@langchain/mcp-adapters` dependency
2. Create `MCPIntegration.js`
3. Update `ToolRegistry` to use MCP tools
4. Test with existing tools
5. Remove custom client code

### Phase 2: Oracle Backend (Week 2)
1. Add Vercel MCP Adapter
2. Create `/api/mcp` route
3. Update LangChain backend integration
4. Test SSE transport
5. Remove custom client code

### Phase 3: Oracle Frontend (Week 3)
1. Add AI SDK MCP client
2. Create `useMCPClient` hook
3. Update chat component
4. Create device control UI
5. End-to-end testing

### Phase 4: Z-Wave MCP Server Enhancements (Optional)
1. Add SSE transport support
2. Add systemd service file
3. Performance optimizations (caching)
4. Production deployment guide

## Rollback Plan

If migration fails:

1. **Voice Gateway:** Revert to custom `MCPZWaveClient`
2. **Oracle:** Keep using custom client temporarily
3. **Z-Wave MCP Server:** No changes needed (backward compatible)

**Safety:** No breaking changes to MCP server itself ensures rollback is possible.

## Success Metrics

- **Code Reduction:** Remove ~500 lines of custom MCP client code
- **Startup Time:** MCP tool discovery < 500ms
- **Tool Execution:** Same latency as current implementation
- **Frontend UX:** Tool invocation feedback < 200ms
- **Error Rate:** < 1% tool execution failures

## References

- [LangChain MCP Adapters Docs](https://docs.langchain.com/oss/javascript/langchain/mcp)
- [Vercel MCP Adapter](https://vercel.com/templates/next.js/model-context-protocol-mcp-with-next-js)
- [AI SDK MCP Integration](https://ai-sdk.dev/cookbook/next/mcp-tools)
- [Model Context Protocol Spec](https://modelcontextprotocol.io/)
