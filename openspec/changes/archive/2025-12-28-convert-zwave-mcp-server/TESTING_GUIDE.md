# Complete Testing Guide: Oracle MCP Integration (Phase 2-3)

## Quick Start

### 1. Prerequisites Check
```bash
# Check all services are running
curl http://localhost:8091/health          # Z-Wave JS UI
curl http://localhost:11434/api/tags       # Ollama
mosquitto_sub -h localhost -t '#' -C 1     # MQTT

# All should succeed without errors
```

### 2. Start Oracle
```bash
cd apps/oracle
npm run dev
# Wait for "Ready in X.Xs"
```

### 3. Open Chat
```bash
open http://localhost:3000/chat
# Or navigate manually in browser
```

---

## Test 3.6: Device List via Chat

### Test Steps
1. Type in chat: **"What devices do I have?"**
2. Press Enter
3. Observe chat response

### Expected Behavior

**Chat UI Shows**:
```
You: What devices do I have?

🔧 Using tool: list_zwave_devices