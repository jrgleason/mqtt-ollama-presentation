# [Archived – Deprecated] Z-Wave JS UI MCP Server – Research Findings (Historical)

We no longer plan to ship an MCP-based path for the demo. The app now publishes directly to MQTT. See:

- docs/requirements.md (Condensed for Demo)
- docs/zwave-integration-plan.md (Demo-Focused)

---

# Z-Wave JS UI MCP Server - Research Findings

**Date:** October 4, 2025
**Objective:** Research Z-Wave JS UI API and MQTT monitoring capabilities to build MCP server for device discovery

---

## Key Findings

### 1. ✅ MQTT MCP CAN Read Messages (EMQX Dashboard)

**IMPORTANT DISCOVERY:** The MQTT MCP limitation is **NOT a protocol issue** - it's a limitation of the specific
`ezhuk/mqtt-mcp` Python implementation we tested.

**EMQX Documentation confirms MQTT brokers CAN:**

- ✅ Monitor subscriptions and received messages
- ✅ Track topic metrics and message flows
- ✅ View retained messages
- ✅ Access message history (via dashboard/API)

**EMQX Monitoring Features:**

- **Subscriptions panel:** View all active subscriptions and topics
- **Retained Messages:** See current retained messages
- **Topic Metrics:** Track performance and usage of specific topics
- **Slow Subscriptions:** Monitor subscribers with performance issues
- **System Topics:** Access system-level message information

**Implication:** We should either:

1. Use the `@emqx-ai/mcp-mqtt-sdk` (TypeScript) which may have better message access
2. Build custom MQTT monitoring into our Z-Wave MCP server
3. Use HiveMQ Control Center (http://10.0.0.58:8080) for topic discovery during development

---

### 2. Z-Wave JS UI REST API Endpoints

**Base URL:** `http://10.0.0.58:8091` (default port)

#### Key API Routes Found in `api/app.ts`:

**Node & Device Management:**

```typescript
// Get all settings (includes devices)
GET /api/settings
// Returns: { devices: {...}, settings: {...}, serial_ports: [...], scales: [...] }

// Export nodes configuration
GET /api/exportConfig
// Returns: { data: { nodeId: { name, loc, hassDevices, ... } } }

// Import nodes configuration
POST /api/importConfig
// Body: { data: { nodeId: { name, loc, hassDevices } } }
```

**WebSocket API (Socket.IO):**

```typescript
// Initialize and get full state
socket.emit('init', {}, (state) => {
  // Returns: { nodes: {...}, driver: {...}, controller: {...} }
})

// Call Z-Wave API methods
socket.emit('zwave', {
  api: 'getNodes', // or any ZwaveClient method
  args: []
}, (result) => {
  // Returns: { success, message, result, api }
})
```

**Available Z-Wave APIs** (from `ZwaveClient.ts`):

- `getNodes()` - Get all nodes
- `getInfo()` - Get controller info
- `getDriverStatistics()` - Get driver stats
- `refreshInfo(nodeId)` - Refresh node info
- `refreshValues(nodeId)` - Refresh node values
- `pollValue(nodeId, valueId)` - Poll specific value
- `writeValue(nodeId, valueId, value)` - Write value to device
- And many more...

**Node Data Structure:**

```typescript
interface Node {
  id: number
  name: string
  loc: string  // location
  values: ValueId[]
  ready: boolean
  status: string
  deviceClass: {...}
  commandClasses: {...}
  hassDevices: {...}  // Home Assistant discovery devices
}
```

---

### 3. Authentication

**Z-Wave JS UI Authentication:**

- Session-based (express-session + FileStore)
- JWT tokens for API access
- Header: `Authorization: Bearer <token>`
- Session cookie: `zwave-js-ui-session`

**Login Flow:**

```typescript
POST /api/authenticate
Body: { username, password }
Response: { success, user: { username, token } }
```

**Protected Routes:**

- All `/api/*` routes require authentication (via `isAuthenticated` middleware)
- WebSocket requires token in query param: `?token=<jwt>`

---

### 4. MQTT Topic Structure (Z-Wave JS UI)

From previous testing session findings:

**Typical patterns:**

```
zwave/<nodeId>/<commandClass>/<endpoint>/<property>/set    # Control
zwave/<nodeId>/<commandClass>/<endpoint>/<property>        # State
```

**Examples:**

```
zwave/5/38/0/targetValue/set    # Binary/Multilevel Switch
zwave/5/38/0/currentValue       # Switch state
zwave/3/64/0/mode/set           # Thermostat mode
zwave/3/64/0/setpoint/1/set     # Thermostat setpoint
```

**Discovery needed:**

- Must query Z-Wave JS UI to get nodeId → device name mapping
- Must know command classes for each device type
- MQTT topics are auto-published by Z-Wave JS UI based on Z-Wave capabilities

---

## Recommended Architecture

### Option 1: Combined MCP Server (RECOMMENDED)

**Single MCP Server with dual capabilities:**

```typescript
// Tools:
- list_devices()          // Query Z-Wave JS UI API
- get_device(name)        // Find device by friendly name
- control_device(name, action, value)  // Publish MQTT command
- get_device_state(name)  // Subscribe to MQTT state topic
- discover_topics()       // Monitor MQTT traffic for active topics
```

**Benefits:**

- ✅ Single integration point for Oracle
- ✅ Friendly name → MQTT topic mapping
- ✅ Device discovery + control in one place
- ✅ TypeScript (same stack as Oracle)

**Architecture Flow:**

```
User: "Turn on office heater"
  ↓
Oracle (LangChain)
  ↓
Z-Wave MCP Server
  ↓ GET /api/settings (get devices)
  ↓ Find nodeId for "office heater"
  ↓ Build MQTT topic: zwave/5/38/0/targetValue/set
  ↓ MQTT publish: {"value": 255}
  ↓
HiveMQ → Z-Wave JS UI → Physical Device
```

### Option 2: Separate MCP Servers

**Z-Wave JS UI MCP Server (Device Discovery):**

- REST API client for Z-Wave JS UI
- Tools: `list_devices()`, `get_device()`, `refresh_node()`
- Resources: `zwave://devices`, `zwave://nodes/{id}`

**MQTT MCP Server (Device Control):**

- MQTT client with pub/sub
- Tools: `publish_message()`, `subscribe_topic()`
- Must use topics from Z-Wave MCP

**Benefits:**

- ✅ Separation of concerns
- ✅ Can reuse MQTT MCP for other MQTT devices

**Drawbacks:**

- ❌ More complex integration
- ❌ Oracle must orchestrate between two MCPs
- ❌ Harder to map friendly names to topics

---

## Implementation Plan

### Phase 1: Z-Wave JS UI MCP Server (No Auth)

```typescript
// File: mqtt-mcp-server/zwave-mcp.ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

const server = new McpServer({
  name: 'zwave-js-ui-mcp',
  version: '1.0.0'
})

// Tool: List all devices
server.tool('list_devices',
  'Get all Z-Wave devices with their names and current states',
  async () => {
    const response = await fetch('http://10.0.0.58:8091/api/settings')
    const { devices } = await response.json()
    return { content: [{ type: 'text', text: JSON.stringify(devices) }] }
  }
)

// Tool: Get device by name
server.tool('get_device',
  'Find device by friendly name and return MQTT topics',
  async ({ name }) => {
    // Query API, find nodeId, build topics
  }
)

// Tool: Control device
server.tool('control_device',
  'Control a Z-Wave device by name',
  async ({ name, action, value }) => {
    // Find device, build MQTT topic, publish message
  }
)

await server.start()
```

### Phase 2: Add Authentication

```typescript
// Add JWT token handling
let authToken: string

async function authenticate() {
  const response = await fetch('http://10.0.0.58:8091/api/authenticate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  const { user } = await response.json()
  authToken = user.token
}

// Add to all requests:
headers: { 'Authorization': `Bearer ${authToken}` }
```

### Phase 3: WebSocket Support (Optional)

```typescript
import { io } from 'socket.io-client'

const socket = io('http://10.0.0.58:8091', {
  query: { token: authToken }
})

socket.emit('init', {}, (state) => {
  // Real-time state updates
})
```

---

## Next Steps

### Immediate (Week 1):

1. ✅ Create `mqtt-mcp-server/` directory structure
2. ✅ Install dependencies: `@modelcontextprotocol/sdk`, `mqtt`, `node-fetch`
3. ✅ Implement basic `list_devices()` tool (no auth)
4. ✅ Test with MCP Inspector
5. ✅ Integrate with Oracle/LangChain

### Short-term (Week 2):

1. Add `control_device()` tool with MQTT publishing
2. Build device name → MQTT topic mapping
3. Add authentication support
4. Create device registry cache

### Long-term (Week 3-4):

1. Add real-time state monitoring via WebSocket
2. Implement topic discovery (monitor MQTT traffic)
3. Add error handling and retry logic
4. Create comprehensive tests
5. Prepare demo scenarios

---

## Questions & Decisions

### Q1: Single MCP vs Separate MCPs?

**Decision:** Start with **Option 1 (Combined MCP Server)**

- Simpler for demo
- Easier to explain in presentation
- Can refactor to separate later if needed

### Q2: Which MQTT SDK to use?

**Decision:** Use **mqtt.js** directly in Z-Wave MCP

- More control over message handling
- Can implement custom topic monitoring
- Proven to work with HiveMQ

### Q3: How to handle device registry?

**Decision:** **Query on-demand + in-memory cache**

- Call `/api/settings` on first `list_devices()` request
- Cache results for 5 minutes
- Invalidate cache on demand via `refresh_devices()` tool

### Q4: Authentication for demo?

**Decision:** **Start without auth, add later**

- Z-Wave JS UI requires auth in production
- For demo, disable auth or use default credentials
- Add auth support as Phase 2 task

---

## Code Examples

### Device Registry Builder

```typescript
interface DeviceRegistry {
  [name: string]: {
    nodeId: number
    topics: {
      control: string
      state: string
    }
    type: 'switch' | 'dimmer' | 'thermostat'
    commandClass: number
  }
}

async function buildDeviceRegistry(): Promise<DeviceRegistry> {
  const response = await fetch('http://10.0.0.58:8091/api/exportConfig')
  const { data } = await response.json()

  const registry: DeviceRegistry = {}

  for (const [nodeId, node] of Object.entries(data)) {
    const deviceName = node.name || `Node ${nodeId}`
    const commandClass = detectCommandClass(node) // 38=Switch, 64=Thermostat

    registry[deviceName] = {
      nodeId: parseInt(nodeId),
      topics: {
        control: `zwave/${nodeId}/${commandClass}/0/targetValue/set`,
        state: `zwave/${nodeId}/${commandClass}/0/currentValue`
      },
      type: detectDeviceType(commandClass),
      commandClass
    }
  }

  return registry
}
```

### MQTT Control Function

```typescript
import mqtt from 'mqtt'

const mqttClient = mqtt.connect('mqtt://localhost:1883', {
  username: 'jrg',
  password: process.env.MQTT_PASSWORD
})

async function controlDevice(deviceName: string, action: 'on' | 'off' | 'dim', value?: number) {
  const registry = await getDeviceRegistry()
  const device = registry[deviceName]

  if (!device) {
    throw new Error(`Device "${deviceName}" not found`)
  }

  let mqttValue: number
  if (action === 'on') mqttValue = 255
  else if (action === 'off') mqttValue = 0
  else mqttValue = value || 128

  return new Promise((resolve, reject) => {
    mqttClient.publish(
      device.topics.control,
      JSON.stringify({ value: mqttValue }),
      { qos: 1 },
      (err) => {
        if (err) reject(err)
        else resolve({ success: true, device: deviceName, action, value: mqttValue })
      }
    )
  })
}
```

---

## Files to Create

**Project Structure:**

```
mqtt-ollama-presentation/
├── mqtt-mcp-server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts           # MCP server entry point
│   │   ├── zwave-client.ts    # Z-Wave JS UI REST client
│   │   ├── mqtt-client.ts     # MQTT connection handler
│   │   ├── device-registry.ts # Device name → topic mapping
│   │   └── types.ts           # TypeScript interfaces
│   └── README.md
├── docs/
│   ├── zwave-mcp-findings.md  # This file
│   └── mqtt-mcp-testing-session.md
└── CLAUDE.md
```

**Dependencies needed:**

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.5.0",
    "mqtt": "^5.0.0",
    "node-fetch": "^3.3.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.3.0"
  }
}
```

---

## Conclusion

**Main Discovery:** MQTT message monitoring IS possible - the limitation was specific to the Python MCP implementation
we tested, not the MQTT protocol itself.

**Recommended Path Forward:**

1. Build a **combined Z-Wave + MQTT MCP server** in TypeScript
2. Use Z-Wave JS UI REST API for device discovery
3. Use MQTT.js for device control
4. Implement device registry mapping (friendly names → MQTT topics)
5. Start without auth, add authentication in Phase 2

**This approach gives us:**

- ✅ Device discovery (via Z-Wave JS UI API)
- ✅ Friendly name mapping (via device registry)
- ✅ Device control (via MQTT)
- ✅ Topic validation (no more guessing topics)
- ✅ Single integration point for Oracle
- ✅ TypeScript (consistent with our stack)

**Next Immediate Action:** Create `mqtt-mcp-server/` module with basic `list_devices()` tool.
