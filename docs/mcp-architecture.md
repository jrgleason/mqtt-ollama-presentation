# MCP Architecture: Shared ZWave Device Tools

**Last Updated:** October 18, 2025

---

## Overview

This project uses the **Model Context Protocol (MCP)** to create a single source of truth for Z-Wave device operations. The `zwave-mcp-server` provides tools that are consumed by multiple applications (Oracle and Voice Gateway) via MCP protocol.

### Why MCP?

✅ **Single Source of Truth** - Device logic lives in one place
✅ **Reusable Tools** - Add a tool once, use it everywhere
✅ **Clean Architecture** - Clear separation of concerns
✅ **Easy to Extend** - Add new tools to MCP server, all apps get them automatically

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     ZWave MCP Server                         │
│                  (Single Source of Truth)                    │
│                                                              │
│  Tools:                                                      │
│  ├─ list_zwave_devices                                      │
│  ├─ control_zwave_device                                    │
│  └─ (future tools here...)                                  │
│                                                              │
│  Communicates with:                                          │
│  ├─ ZWave-JS-UI (Socket.IO)                                │
│  └─ MQTT Broker (for device control)                        │
└──────────────────┬───────────────────────────────────────────┘
                   │ MCP Protocol (stdio)
                   │
         ┌─────────┴─────────┐
         │                   │
         ▼                   ▼
┌────────────────┐  ┌────────────────┐
│  Oracle App    │  │ Voice Gateway  │
│  (Next.js)     │  │    (OWW)       │
│                │  │                │
│  LangChain     │  │  Direct MCP    │
│  Tool Wrappers │  │  Integration   │
│                │  │                │
│  - Wraps MCP   │  │  - Calls MCP   │
│    calls in    │  │    tools when  │
│    LangChain   │  │    user asks   │
│    tools       │  │    about       │
│                │  │    devices     │
└────────────────┘  └────────────────┘
```

---

## Component Details

### 1. ZWave MCP Server (`apps/zwave-mcp-server`)

**Purpose:** Centralized server that provides Z-Wave device tools via MCP protocol

**Tools Provided:**

#### `list_zwave_devices`
- Lists all Z-Wave devices from ZWave-JS-UI
- Options:
  - `includeInactive` (boolean): Include offline/not-ready devices
  - `filter` (string): Filter by name or location
- Returns: Formatted device list with MQTT topics

#### `control_zwave_device`
- Controls Z-Wave devices via MQTT
- Parameters:
  - `deviceName` (string): Device name (partial match supported)
  - `action` (enum): `on` | `off` | `dim`
  - `level` (number, 0-100): Brightness level for dimming
- Returns: Success/error message

**How it works:**
1. Communicates with ZWave-JS-UI via Socket.IO to get device information
2. Sends MQTT commands to control devices
3. Exposes tools via MCP protocol (stdio transport)
4. Spawned as child process by client applications

**Configuration:** `apps/zwave-mcp-server/.env`
```bash
ZWAVE_UI_URL=http://localhost:8091
MQTT_BROKER_URL=mqtt://localhost:1883
```

---

### 2. Oracle App (`apps/oracle`)

**Purpose:** Next.js web app with LangChain AI that can control devices

**MCP Integration:**
- **MCP Client:** `src/lib/mcp/zwave-client.js`
  - Spawns zwave-mcp-server as child process
  - Communicates via MCP protocol
  - Provides functions: `listDevices()`, `controlDevice()`

- **LangChain Tool Wrappers:** `src/lib/langchain/tools/`
  - `device-list-tool.js` - Wraps `list_zwave_devices` MCP tool
  - `device-control-tool.js` - Wraps `control_zwave_device` MCP tool
  - These are **thin wrappers** that call MCP tools and format results for LangChain

**How it works:**
1. User chats with AI in web interface
2. LangChain detects when device tools are needed
3. Tool wrappers call MCP server
4. MCP server returns device info/control results
5. AI responds with device information

**Example:**
```
User: "What lights do I have?"
  ↓
LangChain detects need for device list
  ↓
Calls device-list-tool
  ↓
Tool calls MCP client → list_zwave_devices
  ↓
MCP server queries ZWave-JS-UI
  ↓
Returns device list
  ↓
AI: "You have Demo Switch in the Demo location..."
```

---

### 3. Voice Gateway OWW (`apps/voice-gateway-oww`)

**Purpose:** Voice-controlled assistant with wake word detection

**MCP Integration:**
- **MCP Client:** `src/mcp-zwave-client.js`
  - Spawns zwave-mcp-server as child process
  - Direct MCP tool calls (no LangChain wrapper needed)
  - Integrated into main voice pipeline

**How it works:**
1. User says: "Hey Jarvis, what devices do I have?"
2. Wake word detected, speech transcribed
3. System detects device-related keywords
4. Calls `getDevicesForAI()` which uses MCP
5. Device info added to AI context
6. Ollama generates response with device list
7. Response spoken via TTS

**Initialization:**
```javascript
// In main.js
await initializeMCPClient(); // Starts MCP server

// When device query detected
const deviceInfo = await getDevicesForAI(); // Calls MCP tool
```

---

## Message Flow: List Devices

**User asks: "What devices do I have?"**

### Oracle App (Web)
```
1. User sends chat message
2. Next.js API route → LangChain
3. LangChain → device-list-tool.func()
4. device-list-tool → listDevices() (MCP client)
5. MCP client → list_zwave_devices (MCP protocol, JSON-RPC over stdio)
6. ZWave MCP Server → ZWave-JS-UI (Socket.IO)
7. ZWave-JS-UI → Returns device data
8. MCP Server → Formats and returns via MCP
9. device-list-tool → Returns to LangChain
10. LangChain → AI generates response
11. Response streamed to user
```

### Voice Gateway (Voice)
```
1. User says "Hey Jarvis, what devices do I have?"
2. Wake word detected → Speech transcribed
3. Detect device keywords in transcription
4. Call getDevicesForAI() → MCP client
5. MCP client → list_zwave_devices (MCP protocol, JSON-RPC over stdio)
6. ZWave MCP Server → ZWave-JS-UI (Socket.IO)
7. ZWave-JS-UI → Returns device data
8. MCP Server → Returns via MCP
9. Device info added to AI context
10. Ollama generates response with device list
11. Response spoken via Piper TTS
```

---

## Adding New Tools

To add a new Z-Wave tool that both apps can use:

### Step 1: Add tool to ZWave MCP Server

**File:** `apps/zwave-mcp-server/src/index.js`

```javascript
// In ListToolsRequestSchema handler
{
  name: 'get_device_status',
  description: 'Get detailed status of a specific device',
  inputSchema: {
    type: 'object',
    properties: {
      deviceName: {
        type: 'string',
        description: 'Name of the device'
      }
    },
    required: ['deviceName']
  }
}

// In CallToolRequestSchema handler
if (name === 'get_device_status') {
  const { deviceName } = rawArgs || {};
  // Implementation here...
  return {
    content: [{ type: 'text', text: statusInfo }]
  };
}
```

### Step 2: Use in Oracle App (Optional LangChain wrapper)

**File:** `apps/oracle/src/lib/langchain/tools/device-status-tool.js`

```javascript
import { DynamicTool } from '@langchain/core/tools';
import { getMCPClient } from '../../mcp/zwave-client.js';

export function createDeviceStatusTool() {
  return new DynamicTool({
    name: 'get_device_status',
    description: 'Get detailed status of a specific Z-Wave device',
    func: async (deviceName) => {
      const client = getMCPClient();
      const result = await client.callTool('get_device_status', { deviceName });
      return result.content[0].text;
    }
  });
}
```

### Step 3: Use in Voice Gateway (Direct MCP call)

**File:** `apps/voice-gateway-oww/src/mcp-zwave-client.js`

```javascript
export async function getDeviceStatus(deviceName) {
  const client = getMCPClient();
  const message = {
    jsonrpc: '2.0',
    id: client.messageId++,
    method: 'tools/call',
    params: {
      name: 'get_device_status',
      arguments: { deviceName }
    }
  };

  const result = await client.sendRequest(message);
  return result.content[0].text;
}
```

**That's it!** Both apps now have access to the new tool.

---

## Benefits of This Architecture

### 1. **Single Source of Truth**
- Device logic lives in one place (zwave-mcp-server)
- No duplication between oracle and voice-gateway
- Bugs fixed once, fixed everywhere

### 2. **Easy to Maintain**
- Update tool behavior in one place
- Add new tools, all apps get them automatically
- Clear separation of concerns

### 3. **Consistent Behavior**
- Both apps use exact same device logic
- Same error handling
- Same device name matching

### 4. **Scalable**
- Add more apps (mobile app, dashboard, etc.) easily
- All apps share the same MCP server
- No code duplication

### 5. **Testable**
- Test MCP server tools independently
- Mock MCP server for app testing
- Clear interfaces

---

## Configuration

### ZWave MCP Server

**File:** `apps/zwave-mcp-server/.env`

```bash
# Z-Wave JS UI Configuration
ZWAVE_UI_URL=http://localhost:8091
ZWAVE_UI_USERNAME=admin
ZWAVE_UI_PASSWORD=change_this_password
ZWAVE_UI_AUTH_ENABLED=false

# MQTT Broker (for device control)
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=
MQTT_PASSWORD=
```

### Oracle App

**File:** `apps/oracle/.env`

```bash
# No additional config needed!
# MCP client automatically starts zwave-mcp-server
```

### Voice Gateway

**File:** `apps/voice-gateway-oww/.env`

```bash
# No additional config needed!
# MCP client automatically starts zwave-mcp-server
```

---

## Troubleshooting

### MCP Server Won't Start

**Symptoms:**
```
❌ ZWave MCP client initialization failed
Error: spawn ENOENT
```

**Solution:**
- Verify Node.js is in PATH (especially for systemd services)
- For systemd services, ensure PATH includes NVM node location:
  ```ini
  Environment="PATH=/home/pi/.nvm/versions/node/current/bin:/usr/local/bin:/usr/bin:/bin"
  ```
- Check zwave-mcp-server path in client code
- Ensure zwave-mcp-server dependencies are installed:
  ```bash
  cd apps/zwave-mcp-server
  npm install
  ```

### Can't List Devices

**Symptoms:**
```
Failed to list devices: Connection refused
```

**Solution:**
- Ensure ZWave-JS-UI is running: `curl http://localhost:8091`
- Check `ZWAVE_UI_URL` in zwave-mcp-server/.env
- Verify ZWave-JS-UI authentication settings
- Confirm you're connecting to the correct ZWave-JS-UI instance:
  - Use **localhost:8091** for local ZWave-JS-UI
  - Do NOT use remote instances unless intentional

### Z-Wave Devices Showing as "Dead" or Offline

**Symptoms:**
```
Device showing as "Status: Dead" in ZWave-JS-UI
Only getting "Node 1" (controller) and offline devices
MCP returns devices but they're all marked unavailable=false, ready=false
```

**Common Causes:**
1. **Battery Died** - Replace batteries in battery-powered devices
2. **Out of Range** - Device too far from controller or no mesh routing path
3. **Network Needs Healing** - Z-Wave mesh network degraded
4. **Interview Incomplete** - Device paired but never fully interviewed
5. **Device Firmware Crashed** - Requires power cycle
6. **Device Excluded** - Device was removed but not cleaned up in ZWave-JS-UI

**Troubleshooting Steps:**

1. **Check Device Status in ZWave-JS-UI**
   - Open http://localhost:8091
   - Navigate to Control Panel → Nodes
   - Check node status: Alive, Asleep, Dead, Unknown
   - Review last active timestamp

2. **Power Cycle the Device**
   - For battery devices: Remove and reinsert battery
   - For powered devices: Unplug for 10 seconds, plug back in
   - Wait 30-60 seconds for device to reconnect

3. **Check ZWave-JS-UI Logs**
   ```bash
   tail -100 /home/pi/code/zwave-js-ui/store/logs/zwavejs_current.log
   ```
   Look for:
   - Connection attempts from the device
   - Interview status updates
   - Error messages about the node

4. **Heal Z-Wave Network**
   - In ZWave-JS-UI: Advanced → Heal Network
   - This rebuilds routing tables and neighbor lists
   - Can take 10-30 minutes for large networks

5. **Re-interview Device**
   - In ZWave-JS-UI: Right-click node → Re-interview Node
   - Forces fresh interview to get device capabilities
   - Useful after firmware updates or device issues

6. **Remove and Re-add Device (Last Resort)**
   - Exclude device: Advanced → Remove Node → Follow device instructions
   - Include device: Advanced → Add Node → Follow device instructions
   - Device will get new node ID and fresh configuration

**Verification After Fix:**
```bash
# Check MCP server returns the device
journalctl -u oracle.service -n 100 | grep "MCP DEBUG"

# Should see device with:
# "ready": true
# "available": true
# "status": "Alive" or "Asleep"
```

**Note:** The `includeInactive: true` parameter in MCP client will show ALL devices, even dead ones. This is useful for troubleshooting but may return offline devices to the AI.

### Device Control Not Working

**Symptoms:**
```
Successfully turned on Demo Switch (would publish...)
```

**Note:** The current implementation shows what MQTT command *would* be sent but doesn't actually send it yet. To enable actual device control, the zwave-mcp-server needs to initialize an MQTT client.

**To implement:**
```javascript
// In zwave-mcp-server/src/index.js main()
import { MQTTClientWrapper } from './mqtt-client.js';

const mqttConfig = {
  brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
  username: process.env.MQTT_USERNAME || '',
  password: process.env.MQTT_PASSWORD || ''
};

const mqttClient = new MQTTClientWrapper(mqttConfig);

// Then in control_zwave_device handler:
await mqttClient.publish(controlTopic, { value: mqttValue });
```

---

## Next Steps

1. **Enable MQTT control** - Initialize MQTT client in zwave-mcp-server
2. **Add more tools**:
   - `get_device_history` - Query device state history
   - `set_device_scene` - Activate Z-Wave scenes
   - `get_battery_status` - Check battery-powered device status
3. **Add caching** - Cache device list to reduce ZWave-JS-UI queries
4. **Add monitoring** - Log all MCP tool calls for debugging

---

## References

- **Model Context Protocol**: https://modelcontextprotocol.io/
- **ZWave-JS-UI**: https://github.com/zwave-js/zwave-js-ui
- **MCP SDK**: https://github.com/modelcontextprotocol/typescript-sdk
- **LangChain Tools**: https://js.langchain.com/docs/modules/agents/tools/

---

**Questions?** See the main [README.md](../README.md) or check [CLAUDE.md](../CLAUDE.md) for project guidelines.
