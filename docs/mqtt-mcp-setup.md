# MQTT MCP Server Setup Guide

## Overview

This guide shows how to configure the **ezhuk/mqtt-mcp** Model Context Protocol (MCP) server to connect to your existing HiveMQ broker running in Kubernetes.

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
- **Username:** `jrg`
- **Password:** *[Add your HiveMQ password here]*
- **Role:** `superuser` (full access to all topics `#`)
- **RBAC Extension:** hivemq-file-rbac-extension v4.5.3

### Configuration Repository
- GitHub: https://github.com/jrgleason/home-infra/tree/main/mqtt
- Kubernetes: https://github.com/jrgleason/home-infra/tree/main/kubernetes/apps/communications

---

## MCP Server Installation

### Option 1: Using pip (Recommended)

```bash
pip install mqtt-mcp
```

### Option 2: Using npx (from Node.js project)

```bash
npx -y mqtt-mcp
```

---

## Claude Code Configuration (CLI)

**Step 1: Install mqtt-mcp Python package**

```bash
pip install mqtt-mcp
```

**Step 2: Set Environment Variables**

Add these environment variables to your `~/.zshrc` (or `~/.bashrc` if using bash):

```bash
# MQTT Connection Settings for MCP
export MQTT_BROKER_HOST=10.0.0.58
export MQTT_BROKER_PORT=31883
export MQTT_USERNAME=jrg
export MQTT_PASSWORD=<your-hivemq-password>
export MQTT_CLIENT_ID=claude_mcp
```

Then reload your shell:
```bash
source ~/.zshrc
```

**Step 3: Add MCP Server to Claude Code**

Run this command to add the MQTT MCP server to your Claude Code configuration:

```bash
claude mcp add mqtt "python3 -m mqtt_mcp"
```

The MCP server will automatically use the environment variables from your shell.

**Step 4: Restart Claude Code**

Exit and restart Claude Code to load the MCP server.

**Step 5: Verify Connection**

Check that the MCP server loaded without errors. If you see "Failed to reconnect to mqtt", check:
- Environment variables are set: Run the test one-liner below
- mqtt-mcp is installed: `pip show mqtt-mcp`
- HiveMQ broker is running: `nc -zv 10.0.0.58 31883`

**Quick environment variable check:**
```bash
python3 -c 'import os; vars=["MQTT_BROKER_HOST","MQTT_BROKER_PORT","MQTT_USERNAME","MQTT_PASSWORD","MQTT_CLIENT_ID"]; [print(f"{"✅" if os.getenv(v) else "❌"} {v}: {os.getenv(v,"NOT SET") if v!="MQTT_PASSWORD" else (os.getenv(v)[:3]+"***" if os.getenv(v) else "NOT SET")}") for v in vars]'
```

---

## Claude Desktop Configuration

### Add MCP Server to User Settings

**Step 1: Install mqtt-mcp Python package**

```bash
pip install mqtt-mcp
```

**Step 2: Set Environment Variables**

First, add these environment variables to your `~/.zshrc` (or `~/.bashrc` if using bash):

```bash
# MQTT Connection Settings for MCP
export MQTT_BROKER_HOST=10.0.0.58
export MQTT_BROKER_PORT=31883
export MQTT_USERNAME=jrg
export MQTT_PASSWORD=<your-hivemq-password>
export MQTT_CLIENT_ID=claude_mcp
```

Then reload your shell:
```bash
source ~/.zshrc
```

**Step 2: Add MCP Server to Claude Desktop**

Run this command to add the MQTT MCP server to your Claude Desktop configuration:

```bash
claude mcp add -s user mqtt "python -m mqtt_mcp"
```

The MCP server will automatically use the environment variables from your shell.

### Manual Configuration (Alternative)

If you prefer to edit the config file manually, add this to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mqtt": {
      "command": "python",
      "args": ["-m", "mqtt_mcp"],
      "env": {
        "MQTT_BROKER_HOST": "10.0.0.58",
        "MQTT_BROKER_PORT": "31883",
        "MQTT_USERNAME": "jrg",
        "MQTT_PASSWORD": "<your-password-from-credentials.xml>",
        "MQTT_CLIENT_ID": "claude_mcp"
      }
    }
  }
}
```

---

## For Oracle Project (Next.js + LangChain)

### MCP Client Configuration

Create/update `.claude/mcp-settings.json` in your project:

```json
{
  "mcpServers": {
    "mqtt": {
      "command": "python",
      "args": ["-m", "mqtt_mcp"],
      "env": {
        "MQTT_BROKER_HOST": "10.0.0.58",
        "MQTT_BROKER_PORT": "31883",
        "MQTT_USERNAME": "jrg",
        "MQTT_PASSWORD": "<your-password-from-credentials.xml>",
        "MQTT_CLIENT_ID": "oracle_mcp"
      }
    }
  }
}
```

### Environment Variables

Update your `.env` file:

```bash
# MQTT (HiveMQ on Kubernetes - NodePort)
MQTT_BROKER_URL=mqtt://10.0.0.58:31883
MQTT_USERNAME=jrg
MQTT_PASSWORD=<your-password-from-credentials.xml>

# Optional: WebSocket for browser clients
MQTT_WEBSOCKET_URL=ws://10.0.0.58:30000/mqtt

# Optional: Control Center UI
MQTT_CONTROL_CENTER_URL=http://10.0.0.58:30080
```

---

## Available MCP Tools

The ezhuk/mqtt-mcp server provides these tools:

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

### 3. `unsubscribe_topic`
Remove a topic subscription.

**Parameters:**
- `topic` (string): Topic pattern to unsubscribe from

**Example:**
```json
{
  "topic": "home/+/temperature"
}
```

### 4. `list_subscriptions`
Show all active topic subscriptions.

**Example:** (no parameters)

---

## MCP Resources

The server also provides resources for accessing topic values:

- `mqtt://10.0.0.58:31883/{topic}` - Access current value for a specific topic
- Supports wildcard patterns in topic names

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
# Subscribe to all topics (using mosquitto-clients package)
mosquitto_sub -h 10.0.0.58 -p 31883 -u jrg -P "<your-password>" -t '#' -v

# Publish a test message
mosquitto_pub -h 10.0.0.58 -p 31883 -u jrg -P "<your-password>" -t 'test/hello' -m 'Hello from MQTT!'
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

**Check Python installation:**
```bash
python --version  # Should be 3.9+
pip show mqtt-mcp
```

**Test MCP server directly:**
```bash
python -m mqtt_mcp --help
```

**Check Claude Desktop logs:**
```bash
# macOS
tail -f ~/Library/Logs/Claude/mcp*.log
```

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
          │ MCP Protocol (stdio/HTTP)
          ↓
┌─────────────────────┐
│  mqtt-mcp Server    │
│  (ezhuk/mqtt-mcp)   │
│                     │
│  - FastMCP 2.0      │
│  - paho-mqtt        │
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

- **ezhuk/mqtt-mcp:** https://github.com/ezhuk/mqtt-mcp
- **HiveMQ Config:** https://github.com/jrgleason/home-infra/tree/main/mqtt
- **Kubernetes Deployment:** https://github.com/jrgleason/home-infra/tree/main/kubernetes/apps/communications
- **MCP Documentation:** https://modelcontextprotocol.info/
- **FastMCP Framework:** https://github.com/gofastmcp/fastmcp

---

## Quick Start Checklist

- [ ] Install mqtt-mcp: `pip install mqtt-mcp`
- [ ] Run Claude MCP add command (see above)
- [ ] Test connection with MCP Inspector
- [ ] Verify HiveMQ Control Center access: http://10.0.0.58:30080
- [ ] Test publish/subscribe with mosquitto tools
- [ ] Configure Oracle project MCP settings
- [ ] Update project .env file
- [ ] Test MCP tools from Claude Desktop
- [ ] Integrate with Z-Wave JS UI (if applicable)

---

**Last Updated:** January 2025
**Cluster:** yoda (10.0.0.58)
**HiveMQ Version:** 4.x (latest)
**MCP Server:** ezhuk/mqtt-mcp (FastMCP 2.0)
