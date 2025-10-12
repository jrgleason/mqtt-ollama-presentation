# MQTT MCP Server Setup Guide (TypeScript)

## Overview

This guide shows how to configure the **custom TypeScript MCP server** using `@modelcontextprotocol/sdk` and `mqtt.js` to connect to your HiveMQ broker running in Kubernetes.

## Your HiveMQ Infrastructure

### Kubernetes Deployment
- **Namespace:** `communications`
- **Deployment:** `comms-hivemq`
- **Image:** `hivemq/hivemq4:latest`
- **Node:** `yoda` (10.0.0.58)

### NodePort Services
| Service | Internal Port | NodePort | External Access |
|---------|--------------|----------|-----------------|
| MQTT (TCP) | 1883 | 31883 | `10.0.0.58:31883` |
| Control Center | 8080 | 30080 | `http://10.0.0.58:30080` |
| WebSocket | 8000 | 30000 | `ws://10.0.0.58:30000` |

### Authentication
- **Current Mode:** Anonymous (demo mode - no credentials required)
- **TECH DEBT:** Install RBAC extension and configure secure authentication
- **Control Center Login:** admin/SuperSecurePassword0!

### Configuration Repository
- GitHub: https://github.com/jrgleason/home-infra/tree/main/mqtt
- Kubernetes: https://github.com/jrgleason/home-infra/tree/main/kubernetes/apps/communications

---

## MCP Server Installation

### Install Dependencies

```bash
npm install @modelcontextprotocol/sdk mqtt zod
npm install -D @types/node typescript
```

---

## Claude Code Configuration (CLI)

**Step 1: Create MCP Server File**

The MCP server is already created at `/Users/jrg/code/CodeMash/mqtt-ollama-presentation/mqtt-mcp-server-v2.js`

**Step 2: Configure Claude Code**

Edit your `~/.claude/settings.local.json`:

```json
{
  "mcpServers": {
    "mqtt": {
      "type": "stdio",
      "command": "node",
      "args": [
        "/Users/jrg/code/CodeMash/mqtt-ollama-presentation/mqtt-mcp-server-v2.js"
      ],
      "env": {
        "MQTT_BROKER_URL": "mqtt://10.0.0.58:31883"
      }
    }
  }
}
```

**Step 3: Restart Claude Code**

Exit and restart Claude Code to load the MCP server.

**Step 4: Verify Connection**

Run `/mcp` command in Claude Code to check server status:
```
✓ mqtt - Custom TypeScript MQTT MCP Server
```

If connection fails, check:
- HiveMQ broker is running: `nc -zv 10.0.0.58 31883`
- MCP server file exists and is executable
- Node.js is installed: `node --version`

---

## Claude Desktop Configuration

Add this to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mqtt": {
      "command": "node",
      "args": ["/Users/jrg/code/CodeMash/mqtt-ollama-presentation/mqtt-mcp-server-v2.js"],
      "env": {
        "MQTT_BROKER_URL": "mqtt://10.0.0.58:31883"
      }
    }
  }
}
```

Restart Claude Desktop to load the MCP server.

---

## For Oracle Project (Next.js + LangChain)

### Environment Variables

Update your `.env` file:

```bash
# MQTT (HiveMQ on Kubernetes - NodePort)
MQTT_BROKER_URL=mqtt://10.0.0.58:31883
MQTT_USERNAME=
MQTT_PASSWORD=

# Optional: WebSocket for browser clients
MQTT_WEBSOCKET_URL=ws://10.0.0.58:30000/mqtt

# Optional: Control Center UI
MQTT_CONTROL_CENTER_URL=http://10.0.0.58:30080
```

### Integration with LangChain

Use the MCP server via LangChain tools:

```typescript
import { MCPClientManager } from '@/lib/mcp-client';

const mcpManager = new MCPClientManager();
await mcpManager.connect('mqtt', {
  command: 'node',
  args: ['/path/to/mqtt-mcp-server-v2.js'],
  env: {
    MQTT_BROKER_URL: process.env.MQTT_BROKER_URL
  }
});

// Call publish_message tool
await mcpManager.callTool('mqtt', 'publish_message', {
  topic: 'test/hello',
  message: 'Hello from Oracle!'
});
```

---

## Available MCP Tools

The custom TypeScript MCP server provides these tools:

### 1. `publish_message`
Publish a message to an MQTT topic.

**Parameters:**
- `topic` (string): MQTT topic to publish to
- `message` (string): Message payload
- `qos` (0|1|2): Quality of Service level (default: 1)
- `retain` (boolean): Retain message on broker (default: false)

**Example:**
```json
{
  "topic": "home/living_room/light/set",
  "message": "{\"state\": \"on\", \"brightness\": 100}",
  "qos": 1,
  "retain": false
}
```

### 2. `subscribe_topic`
Subscribe to an MQTT topic pattern.

**Parameters:**
- `topic` (string): MQTT topic or pattern (supports wildcards: `+` single level, `#` multi-level)
- `qos` (0|1|2): Quality of Service level (default: 1)

**Example:**
```json
{
  "topic": "home/+/temperature",
  "qos": 1
}
```

---

## Testing the Connection

### Using MCP Inspector

```bash
# Install MCP Inspector (if not already installed)
npm install -g @modelcontextprotocol/inspector

# Test the MQTT MCP server
mcp-inspector
```

### Using MQTT Command Line Tools

**Note:** `mosquitto_pub` and `mosquitto_sub` are standard MQTT client tools that work with any MQTT broker, including HiveMQ.

```bash
# Subscribe to all topics (anonymous connection)
mosquitto_sub -h 10.0.0.58 -p 31883 -t '#' -v

# Publish a test message
mosquitto_pub -h 10.0.0.58 -p 31883 -t 'test/hello' -m 'Hello from MQTT!'
```

### Using HiveMQ Control Center

Open browser to: http://10.0.0.58:30080

Login with:
- **Username:** `admin`
- **Password:** `SuperSecurePassword0!`

---

## Integration with Z-Wave JS UI

When integrating with Z-Wave devices via zwave-js-ui:

### Topic Patterns

**Device Control (Publish):**
```
zwave/<nodeId>/<commandClass>/<endpoint>/<property>/set
```

Example:
```
Topic: zwave/5/38/0/targetValue/set
Payload: {"value": 100}
```

**Device State (Subscribe):**
```
zwave/<nodeId>/<commandClass>/<endpoint>/<property>
```

Example:
```
Topic: zwave/5/38/0/currentValue
Payload: {"time": 1704398400000, "value": 100}
```

### Common Command Classes
- **37:** Binary Switch (on/off)
- **38:** Multilevel Switch (dimming, 0-99)
- **48:** Binary Sensor (motion, door/window)
- **49:** Multilevel Sensor (temperature, humidity)

---

## Troubleshooting

### Connection Issues

**Check if HiveMQ pod is running:**
```bash
kubectl get pods -n communications
```

**Check service endpoints:**
```bash
kubectl get svc -n communications
```

**View HiveMQ logs:**
```bash
kubectl logs -n communications deployment/comms-hivemq -f
```

### Test connectivity from local machine:

```bash
# Test MQTT port
nc -zv 10.0.0.58 31883

# Test Control Center
curl -I http://10.0.0.58:30080
```

### MCP Server Issues

**Check Node.js installation:**
```bash
node --version  # Should be 20+
npm list @modelcontextprotocol/sdk mqtt
```

**Test MCP server directly:**
```bash
node /Users/jrg/code/CodeMash/mqtt-ollama-presentation/mqtt-mcp-server-v2.js
# Should output: "Starting MQTT MCP Server..."
# Press Ctrl+C to exit
```

**Check Claude Code/Desktop logs:**
Run `/mcp` command in Claude Code to see server status

---

## Security Considerations

### Production Recommendations

1. **Use TLS/SSL:**
   - Add TLS listener to HiveMQ config
   - Use port 8883 for MQTTS
   - Generate/install SSL certificates

2. **Rotate Credentials:**
   - Change default passwords
   - Use environment variables (never hardcode)
   - Consider using Kubernetes secrets

3. **Network Security:**
   - Restrict NodePort access via firewall
   - Consider using LoadBalancer or Ingress instead
   - Use VPN for remote access

4. **RBAC:**
   - Create specific users per application
   - Limit topic access per user
   - Use principle of least privilege

### Example: Create Limited User

Edit `credentials.xml` in the hivemq-extensions ConfigMap:

```xml
<user>
    <name>oracle_app</name>
    <password>app-specific-password</password>
    <roles>
        <id>zwave-controller</id>
    </roles>
</user>

<role>
    <id>zwave-controller</id>
    <permissions>
        <permission>
            <topic>zwave/#</topic>  <!-- Only Z-Wave topics -->
        </permission>
    </permissions>
</role>
```

---

## Network Architecture

```
┌─────────────────────┐
│   Claude Desktop    │
│  or Oracle App      │
│                     │
│  - MCP Client       │
└─────────┬───────────┘
          │ MCP Protocol (stdio)
          ↓
┌─────────────────────┐
│  Custom TypeScript  │
│  MCP Server         │
│                     │
│  - @modelcontext... │
│  - mqtt.js          │
└─────────┬───────────┘
          │ MQTT (10.0.0.58:31883)
          ↓
┌─────────────────────┐
│ Kubernetes Cluster  │
│   Node: yoda        │
│                     │
│  ┌───────────────┐  │
│  │ HiveMQ Pod    │  │
│  │ (NodePort)    │  │
│  │               │  │
│  │ Port 1883     │  │
│  │ → 31883       │  │
│  └───────┬───────┘  │
└──────────┼──────────┘
           │ MQTT
           ↓
   ┌───────────────┐
   │ Z-Wave JS UI  │
   │               │
   │ - MQTT Gateway│
   │ - Z-Wave Net  │
   └───────────────┘
```

---

## References

- **@modelcontextprotocol/sdk:** https://github.com/modelcontextprotocol/typescript-sdk
- **mqtt.js:** https://github.com/mqttjs/MQTT.js
- **HiveMQ Config:** https://github.com/jrgleason/home-infra/tree/main/mqtt
- **Kubernetes Deployment:** https://github.com/jrgleason/home-infra/tree/main/kubernetes/apps/communications
- **MCP Documentation:** https://modelcontextprotocol.info/

---

## Quick Start Checklist

- [ ] Install dependencies: `npm install @modelcontextprotocol/sdk mqtt zod`
- [ ] Configure Claude Code settings.local.json
- [ ] Test connection with `/mcp` command
- [ ] Verify HiveMQ Control Center access: http://10.0.0.58:30080
- [ ] Test publish/subscribe with mosquitto tools
- [ ] Update project .env file
- [ ] Test MCP tools from Claude Code
- [ ] Integrate with Z-Wave JS UI (if applicable)

---

**Last Updated:** January 2025
**Cluster:** yoda (10.0.0.58)
**HiveMQ Version:** 4.x (latest)
**MCP Server:** Custom TypeScript using @modelcontextprotocol/sdk + mqtt.js
