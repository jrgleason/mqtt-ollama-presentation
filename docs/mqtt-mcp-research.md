# MQTT Integration via MCP Server - Comprehensive Research

## Research Summary (Updated October 2025)

**Decision: Build Custom TypeScript MCP Server (No Python)**

After extensive research, we've decided to **build a custom TypeScript MCP server** that combines MQTT control with Z-Wave JS UI device discovery. This approach provides clean separation of concerns, full type safety, and aligns perfectly with our Next.js/TypeScript stack - **no Python dependencies**.

**Key Finding:** While `@emqx-ai/mcp-mqtt-sdk` provides excellent MQTT MCP capabilities, we need to combine it with Z-Wave JS UI API access for device discovery. A custom TypeScript implementation gives us full control over both aspects.

## Why MCP for MQTT?

**Key Benefits:**
- **Separation of Concerns:** AI orchestration (Oracle) separate from device communication (MCP server)
- **Standardization:** Anthropic's official protocol with growing ecosystem (100+ servers)
- **Reusability:** Same MCP server works with Claude Desktop, Cursor, Cline, etc.
- **Security:** MQTT credentials isolated in MCP config, not in app code
- **Debugging:** MCP Inspector for independent testing, easier troubleshooting

## Implementation Approach: Custom TypeScript MCP Server

### Core Technologies (All TypeScript/Node.js)

**No Python. No external MCP servers. Pure TypeScript stack.**

**MCP Framework:**
- `@modelcontextprotocol/sdk` - Official Anthropic MCP SDK
- Stdio transport for Claude Desktop/Oracle integration
- Full TypeScript type safety

**MQTT Client:**
- `mqtt` (mqtt.js) - Battle-tested MQTT client
- Direct connection to HiveMQ broker
- QoS support, topic wildcards, retained messages

**Z-Wave Integration:**
- HTTP client (`node-fetch`) for Z-Wave JS UI REST API
- WebSocket (Socket.IO client) for real-time updates (optional)
- Device registry building and caching

**Validation:**
- `zod` - Runtime type validation for tool parameters
- TypeScript compile-time validation

### Why Custom TypeScript Implementation?

**✅ Advantages:**
- **Single Language** - No Python runtime, no language context switching
- **Full Control** - Combine MQTT + Z-Wave API in one server
- **Type Safety** - End-to-end TypeScript from Oracle to MCP server
- **Simpler Deployment** - One Node.js process, no Python dependencies
- **Better Integration** - Direct access to both MQTT and Z-Wave JS UI
- **Easier Debugging** - Same toolchain, same debugger, same stack traces
- **Lighter Weight** - No Python interpreter, faster startup

**❌ What We Avoid:**
- Python runtime requirements
- Language/toolchain mixing
- Python-to-Node.js bridge complexity
- Separate MCP server processes
- Additional deployment dependencies

## Integration Architecture

### Recommended Architecture Pattern

```
┌─────────────────────────────┐
│   Oracle App                │
│   (Next.js + AI)            │
│                             │
│  - LangChain.js             │
│  - Ollama                   │
│  - Auth0                    │
└─────────────┬───────────────┘
              │ MCP Protocol (stdio)
              ↓
┌─────────────────────────────┐
│   Custom TypeScript         │
│   MCP Server                │
│                             │
│  - @modelcontextprotocol/sdk│
│  - mqtt.js (MQTT client)    │
│  - node-fetch (HTTP client) │
│  - Zod validation           │
│                             │
│  Tools:                     │
│  - list_devices()           │
│  - control_device()         │
│  - get_device_state()       │
└──────┬──────────────────┬───┘
       │                  │
       │ MQTT             │ HTTP/WebSocket
       │ (31883)          │ (8091)
       ↓                  ↓
┌────────────┐      ┌──────────────────┐
│  HiveMQ    │←────→│  Z-Wave JS UI    │
│  Broker    │      │                  │
│            │      │  - Device Info   │
│            │      │  - MQTT Gateway  │
└────────────┘      │  - Z-Wave Radio  │
                    └──────────────────┘
                              ↓
                    ┌──────────────────┐
                    │  Z-Wave Devices  │
                    │  (Physical)      │
                    └──────────────────┘
```

**Key Points:**
- **TypeScript-Only Stack:** No Python, single language across entire stack
- **Local-first:** All components on local network, zero internet during demo
- **Dual Integration:** MCP server queries Z-Wave JS UI (HTTP) and controls via MQTT
- **Security:** MQTT and Z-Wave credentials in MCP server, isolated from Oracle app

## Quick Start Example

```typescript
// Custom TypeScript MCP Server
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import mqtt from 'mqtt';
import fetch from 'node-fetch';
import { z } from 'zod';

// Initialize MCP Server
const server = new Server(
  {
    name: 'zwave-device-control',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Connect to MQTT broker
const mqttClient = mqtt.connect('mqtt://10.0.0.58:31883', {
  username: 'jrg',
  password: process.env.MQTT_PASSWORD
});

// Tool: List devices from Z-Wave JS UI
server.setRequestHandler('tools/list', async () => ({
  tools: [
    {
      name: 'list_devices',
      description: 'Get all Z-Wave devices with names and states',
      inputSchema: z.object({}).passthrough(),
    },
    {
      name: 'control_device',
      description: 'Control a Z-Wave device by friendly name',
      inputSchema: z.object({
        name: z.string(),
        action: z.enum(['on', 'off', 'dim']),
        value: z.number().optional(),
      }).passthrough(),
    },
  ],
}));

// Tool: Get devices from Z-Wave JS UI API
server.setRequestHandler('tools/call', async (request) => {
  if (request.params.name === 'list_devices') {
    const response = await fetch('http://10.0.0.58:8091/api/exportConfig');
    const { data } = await response.json();

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(data, null, 2)
      }],
    };
  }

  if (request.params.name === 'control_device') {
    const { name, action, value } = request.params.arguments;

    // Find device, build MQTT topic, publish command
    // (implementation in actual server)

    return {
      content: [{
        type: 'text',
        text: `Device ${name} ${action} command sent`
      }],
    };
  }
});

// Start server with stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);
```

## Decision: MCP Server vs Direct MQTT

| Key Factors | MCP Server (Recommended) | Direct MQTT.js |
|-------------|-------------------------|----------------|
| **Architecture** | ✅ Clean separation, testable | ❌ Mixed concerns |
| **Reusability** | ✅ Works with Claude Desktop, Cursor, etc. | ❌ Oracle-only |
| **Setup** | ✅ TypeScript (same stack) | ✅ Simple (fewer parts) |
| **Learning** | ⚠️ Need to learn MCP | ✅ Standard MQTT |
| **Security** | ✅ Credentials isolated | ⚠️ In Oracle .env |
| **Type Safety** | ✅ Full TS + Zod validation | ⚠️ Manual typing |
| **Performance** | ⚠️ +5-10ms, +50MB | ✅ Minimal overhead |
| **Future-proof** | ✅ Industry standard | ⚠️ Custom integration |

**Winner: MCP Server** - Better architecture, reusability, and future-proofing outweigh slight complexity increase.

## Why TypeScript SDK?

1. **Language Consistency** - Same TypeScript stack as Oracle (Next.js), no Python runtime needed
2. **Clean Architecture** - Separation of concerns, easier to explain in presentation
3. **Type Safety** - Full TypeScript + Zod validation prevents runtime errors
4. **Reusability** - Works with Claude Desktop, Cursor, Cline (not locked to LangChain)
5. **Local-First** - Zero internet during demo, all components local

## Network Dependencies

**Setup (one-time, requires internet):**
- `npm install @emqx-ai/mcp-mqtt-sdk`
- Docker images: hivemq, ollama, zwave-js-ui
- Ollama model: qwen2.5:3b

**Demo (local only, zero internet):**
- ✅ All components on local network
- ✅ Fully offline-capable

## References

**Primary:**
- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk) - Official TypeScript MCP SDK
- [Model Context Protocol](https://modelcontextprotocol.info/) - Official MCP documentation
- [mqtt.js](https://github.com/mqttjs/MQTT.js) - MQTT client for Node.js
- [Z-Wave JS UI](https://github.com/zwave-js/zwave-js-ui) - Z-Wave controller with MQTT gateway
- [MCP Servers Directory](https://github.com/modelcontextprotocol/servers) - Community MCP servers

## Next Steps

1. **Install Dependencies**
   ```bash
   npm install @modelcontextprotocol/sdk mqtt node-fetch zod
   npm install -D @types/node typescript
   ```

2. **Create MCP Server Module** (`zwave-mcp-server/`)
   - Implement custom TypeScript MCP server
   - Add Z-Wave JS UI HTTP client
   - Add MQTT client for device control
   - Build device registry mapping

3. **Implement Core Tools**
   - `list_devices()` - Query Z-Wave JS UI API
   - `control_device(name, action, value)` - Publish MQTT commands
   - `get_device_state(name)` - Read current device states

4. **Update Oracle Integration**
   - Add MCP client to LangChain tools
   - Configure stdio transport
   - Test tool calling from Oracle

5. **Update Architecture Diagram** (`docs/architecture.md`)
   - Show TypeScript-only stack
   - Illustrate MCP stdio transport
   - Document tool calling flow

6. **Test Integration**
   - Verify MCP server starts with stdio
   - Test device discovery and control
   - Validate Oracle → MCP → Device flow

7. **Prepare for CodeMash Demo** (January 12, 2026)
   - Practice full integration 10+ times
   - Create fallback scenarios (mock devices)
   - Record backup demo video
   - Prepare architecture explanation slides

**Research Complete ✅** - Custom TypeScript MCP approach finalized, ready to implement!
