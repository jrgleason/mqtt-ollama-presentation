# Phase 2-3 Testing Guide: Oracle MCP Integration

## Overview

This document provides step-by-step instructions for manually testing the Oracle MCP integration. Testing requires a running system with all external dependencies.

**Scope**: Oracle Next.js application with backend and frontend MCP integration

---

## Prerequisites

### Required Services

#### 1. Z-Wave JS UI
```bash
# Verify Z-Wave JS UI is running
curl http://localhost:8091/health

# Expected: {"status":"ok"} or similar
# If not running: Start Z-Wave JS UI service
```

#### 2. MQTT Broker
```bash
# Verify Mosquitto is running
mosquitto_sub -h localhost -p 1883 -t 'zwave/#' -C 1

# Expected: Connection established (may timeout waiting for messages - that's OK)
# If not running: sudo systemctl start mosquitto
```

#### 3. Ollama
```bash
# Verify Ollama is running
curl http://localhost:11434/api/tags

# Expected: JSON with list of models including qwen2.5:3b
# If not running: ollama serve
```

#### 4. Z-Wave Devices
- At least one Z-Wave device configured in Z-Wave JS UI
- Device should be controllable (switch, dimmer, etc.)
- Note device name exactly as shown in Z-Wave JS UI

### Environment Configuration

**Create/update** `apps/oracle/.env`:
```bash
# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b

# Z-Wave JS UI Connection
ZWAVE_UI_URL=http://localhost:8091

# MQTT Configuration
ZWAVE_MQTT_BROKER=mqtt://localhost:1883

# Logging
LOG_LEVEL=debug
NODE_ENV=development
```

---

## Test Execution

### Test Setup

#### Step 1: Start Oracle
```bash
cd /Users/jrg/code/CodeMash/mqtt-ollama-presentation/apps/oracle
npm run dev
```

**Expected Output**:
```
  ▲ Next.js 15.5.6
  - Local:        http://localhost:3000
  - Environments: .env

 ✓ Starting...
 ✓ Ready in 2.3s
```

**Verify**:
- No errors in startup logs
- Server listening on port 3000

#### Step 2: Open Browser
```bash
# Open browser to Oracle
open http://localhost:3000/chat
# or navigate manually to http://localhost:3000/chat
```

**Expected**:
- Chat interface loads
- No errors in browser console (F12)

#### Step 3: Monitor Logs
Open separate terminal windows to monitor logs:

**Terminal 1: Oracle Server Logs**
```bash
# Already running from Step 1
# Watch for MCP initialization messages
```

**Terminal 2: MQTT Messages**
```bash
mosquitto_sub -h localhost -p 1883 -t 'zwave/#' -v
```

**Terminal 3: Z-Wave JS UI Logs** (optional)
```bash
# If running Z-Wave JS UI via systemd
journalctl -u zwave-js-ui.service -f
```

---

## Test Cases

### Test 3.5: Frontend MCP Tool Discovery

**Objective**: Verify Oracle frontend loads without MCP errors

**Steps**:
1. Browser open to `http://localhost:3000/chat`
2. Open browser console (F12) → Console tab
3. Look for any errors

**Expected Results**:
- ✅ No MCP connection errors
- ✅ No JavaScript errors
- ✅ Chat interface fully rendered
- ✅ Input box functional

**Success Criteria**:
- Chat UI loads completely
- No error messages visible
- Console shows no critical errors

**If Failed**:
- Check Oracle server logs for errors
- Verify environment variables are set
- Check Ollama is reachable: `curl http://localhost:11434/api/tags`

---

### Test 3.6: Backend Device List via Chat

**Objective**: Verify MCP `list_zwave_devices` tool works from chat

**Steps**:
1. In chat input, type: `What devices do I have?`
2. Press Enter or click Send
3. Watch chat for response
4. Check Oracle server logs

**Expected Results**:

**In Chat UI**:
```
You: What devices do I have?

🔧 Using tool: list_zwave_devices