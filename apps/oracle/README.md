This is a [Next.js](https://nextjs.org) project bootstrapped with [
`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Oracle - AI Home Automation Assistant

Oracle is a conversational AI interface for controlling Z-Wave devices and home automation through natural language.

## Getting Started

### Development Mode

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

### Environment Variables

Create a `.env.local` file for development:

```bash
NODE_ENV=development
LOG_LEVEL=debug
PORT=3000
DATABASE_URL=file:./dev.db
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b
MQTT_BROKER_URL=mqtt://127.0.0.1:1883
ZWAVE_MQTT_BROKER=mqtt://localhost:1883
ZWAVE_UI_URL=http://localhost:8091
```

**Important Environment Variables:**

- `NODE_ENV`: Set to `development` for dev mode or `production` for production
- `LOG_LEVEL`: Controls logging verbosity
    - `info` (production default): Only errors and important events
    - `debug` (development default): Verbose logging including MQTT and MCP operations
- `MQTT_BROKER_URL`: URL to your MQTT broker (e.g., Mosquitto)
- `OLLAMA_BASE_URL`: URL to your Ollama instance for LLM inference
- `ZWAVE_MQTT_BROKER`: MQTT broker for Z-Wave device communication
- `ZWAVE_UI_URL`: URL to Z-Wave JS UI instance for device discovery

### Debugging MQTT Issues

If you're troubleshooting MQTT device control:

```bash
# Enable verbose MQTT logging
LOG_LEVEL=debug npm run dev

# You'll see detailed logs like:
# [MQTT] publish() called { topic: 'zwave/...' }
# [MQTT] About to publish: {...}
# [MQTT] ✅ Publish SUCCESS
```

### Production Deployment

For production deployment on Raspberry Pi or other servers, see:

- [Systemd Service Setup](../../docs/oracle-systemd-setup.md)
- [Getting Started Guide](../../docs/GETTING-STARTED.md)

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Project Structure

- `src/app/` - Next.js app router pages and layouts
  - `src/app/api/chat/` - Chat API with LangChain and MCP tools
  - `src/app/api/mcp/` - MCP server SSE endpoint (Vercel MCP Adapter)
- `src/lib/mqtt/` - MQTT client for device communication ([API docs](../../docs/mqtt-client-api.md))
- `src/lib/langchain/` - LangChain integration with Ollama
- `src/lib/mcp/` - MCP integration module for Z-Wave tools
- `src/hooks/` - React hooks including useMCPClient
- `prisma/` - Database schema and migrations

## MCP Integration

Oracle uses the Model Context Protocol (MCP) for Z-Wave device integration. The architecture follows the standard MCP pattern:

### Backend MCP Integration (Recommended)

The chat API uses LangChain's `MultiServerMCPClient` to auto-discover tools from the Z-Wave MCP server:

```javascript
// src/lib/mcp/integration.js
import { MultiServerMCPClient } from "@langchain/mcp-adapters";

const mcpClient = new MultiServerMCPClient({
  zwave: {
    transport: "stdio",
    command: "node",
    args: ["../zwave-mcp-server/src/index.js"],
    env: { ZWAVE_UI_URL, ZWAVE_MQTT_BROKER }
  }
});

const tools = await mcpClient.getTools(); // Auto-discover Z-Wave tools
```

**Benefits:**
- Auto-discovery of Z-Wave tools (no manual tool definitions)
- Standard MCP protocol compliance
- Easy to add additional MCP servers (weather, calendar, etc.)

### Frontend MCP Integration (Optional)

Oracle also exposes an MCP endpoint at `/api/mcp` for browser-based MCP clients:

```javascript
// src/app/api/mcp/route.js
import { createMcpHandler } from '@vercel/mcp-adapter';

export const GET = createMcpHandler({
  servers: {
    zwave: { /* stdio config */ }
  }
});
```

Use the `useMCPClient` hook for direct frontend access:

```javascript
import { useMCPClient } from '@/hooks/useMCPClient';

function DevicePanel() {
  const { tools, isConnected, callTool } = useMCPClient();

  const listDevices = async () => {
    const result = await callTool('list_zwave_devices', {});
    console.log(result);
  };
}
```

**Note:** The current chat interface uses backend MCP integration for simplicity. Frontend MCP is available for future enhancements like real-time device dashboards.

## API Documentation

- **[MQTT Client API](../../docs/mqtt-client-api.md)** - Complete reference for MQTT client usage
    - Full support for all mqtt.js options (retain, QoS, MQTT 5.0 properties)
    - Z-Wave device control helpers
    - Examples and best practices

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically
optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions
are welcome!
