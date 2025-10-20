# Troubleshooting Session: October 18, 2025

## Issues Discovered and Fixed

### Issue 1: Device Names Not Showing Correctly

**Problem:**

- Oracle web UI showed "Node 1" and "Switch" instead of actual device names
- User expected to see: Living Room Thermostat, Kitchen Light, etc.

**Root Cause:**

- ZWave-JS-UI localhost:8091 only has 2 nodes:
    - Node 1: Controller (no name set, empty string)
    - Node 2: "Switch" in Demo location (STATUS: DEAD)
- This is the CORRECT ZWave-JS-UI instance (not the remote one at 10.0.0.58)
- Node 1 showing as "Node 1" because `node.name === ""` (empty string)
- Node 2 is offline/dead (likely battery died)

**What Was Done:**

1. Modified MCP client to include `includeInactive: true` to show all devices
2. This correctly shows both the controller and the dead switch
3. Updated documentation with troubleshooting steps

**Current Status:**

- User is checking battery on Node 2 (Switch device)
- Once device comes back online, it should show as "Switch" in Demo location
- May need to set a friendly name for Node 1 (controller) in ZWave-JS-UI

**Verification Steps After Battery Replacement:**

```bash
# 1. Check MCP server logs
journalctl -u oracle.service -n 100 --no-pager | grep "MCP DEBUG"

# Look for Node 2 with:
# "ready": true
# "available": true
# "status": "Alive"

# 2. Test in Oracle web UI
# Ask: "What devices are available?"
# Should see: "Switch" in Demo location (Online)
```

---

### Issue 2: Device Control Not Working

**Problem:**

- User asked "Turn off the switch"
- Tool was called: `🔧 Using tool: control_device`
- But AI responded with: "I can't perform actions directly..."
- Device was NOT actually controlled

**Root Cause (NOT YET FULLY DIAGNOSED):**

- Tool is being called (✓)
- But response suggests tool execution failed or returned error
- Likely causes:
    1. Device is dead/offline (can't control dead device)
    2. Tool returned error but AI didn't properly relay it
    3. LangChain tool binding issue

**Next Steps to Diagnose:**

1. Wait for device to come back online
2. Try control command again with live device
3. Check oracle service logs for tool execution:
   ```bash
   journalctl -u oracle.service -f | grep -E "(device-control-tool|control_device)"
   ```
4. Verify MQTT client is properly initialized in device-control-tool

**Expected Behavior:**

```
User: "Turn off the switch"
  ↓
🔧 Using tool: control_device
  ↓
[device-control-tool] Received params: { deviceName: "switch", action: "off" }
[device-control-tool] Found device: Switch (Node: 2)
[device-control-tool] Successfully turned off Switch
  ↓
AI: "I've turned off the Switch in the Demo location."
```

---

## Key Learnings

### 1. ZWave-JS-UI Instance Confusion

- **Correct instance:** localhost:8091 (local ZWave-JS-UI)
- **Not to use:** 10.0.0.58 (remote MQTT broker, different ZWave network)
- Always verify which ZWave-JS-UI you're connecting to

### 2. MCP Debug Logging is Helpful

- Added `console.error('[MCP DEBUG] Raw nodes from ZWave-JS-UI:', ...)` to MCP server
- This logs to systemd journal via stderr
- Viewable with: `journalctl -u oracle.service | grep "MCP DEBUG"`
- Shows exact data returned from ZWave-JS-UI Socket.IO connection

### 3. includeInactive Parameter

- `includeInactive: false` (default) - Only returns ready + available devices
- `includeInactive: true` - Returns ALL devices including dead/offline ones
- Changed MCP client to use `includeInactive: true` for better visibility
- Trade-off: AI may mention offline devices to users

### 4. Empty Device Names

- If `node.name === ""`, code falls back to `"Node ${node.id}"`
- This is why controller shows as "Node 1" instead of friendly name
- Fix: Set friendly name in ZWave-JS-UI for Node 1 (controller)

### 5. Dead Device Diagnosis

- ZWave-JS-UI shows:
    - `"ready": false`
    - `"available": false`
    - `"status": "Dead"`
    - `"eventsQueue": [{"event": "dead", ...}]`
    - Last active timestamp
- Most common cause: Battery died
- Solution: Replace battery, wait 30-60 seconds for device to reconnect

---

## Files Modified

### 1. `/apps/zwave-mcp-server/src/mcp-client.js`

**Change:** Added `includeInactive: true` to list_zwave_devices arguments

```javascript
params: {
    name: 'list_zwave_devices',
        arguments
:
    {
        includeInactive: true  // Include all devices, not just active ones
    }
}
```

### 2. `/apps/zwave-mcp-server/src/index.js`

**Change:** Added debug logging for raw nodes

```javascript
console.error('[MCP DEBUG] Raw nodes from ZWave-JS-UI:', JSON.stringify(liveNodes.slice(0, 2), null, 2));
```

### 3. `/docs/mcp-architecture.md`

**Change:** Added comprehensive troubleshooting section

- MCP Server Won't Start (PATH issues in systemd)
- Can't List Devices (connection issues)
- Z-Wave Devices Showing as Dead (battery, network, interview issues)
- Step-by-step troubleshooting guide
- Verification commands

### 4. `/etc/systemd/system/oracle.service` (Previously)

**Change:** Added NVM node to PATH for MCP server spawning

```ini
Environment="PATH=/home/pi/.nvm/versions/node/current/bin:/usr/local/bin:/usr/bin:/bin"
Environment="ZWAVE_UI_URL=http://localhost:8091"
Environment="ZWAVE_UI_AUTH_ENABLED=false"
```

### 5. `/etc/systemd/system/voice-gateway-oww.service` (Previously)

**Change:** Same PATH fix for voice gateway

```ini
Environment="PATH=/home/pi/.nvm/versions/node/current/bin:..."
Environment="ZWAVE_UI_URL=http://localhost:8091"
Environment="ZWAVE_UI_AUTH_ENABLED=false"
```

---

## Outstanding Issues

### 1. Device Control Tool Not Working (HIGH PRIORITY)

**Status:** Waiting for device to come online to test
**Next Steps:**

1. Replace battery on Node 2 (Switch)
2. Verify device shows as "Alive" in ZWave-JS-UI
3. Test control command: "Turn off the switch"
4. Check logs for tool execution details
5. If still failing, investigate MQTT client initialization

### 2. Node 1 Name Not Set (LOW PRIORITY)

**Status:** Cosmetic issue
**Fix:** Set friendly name for controller in ZWave-JS-UI
**Impact:** Controller shows as "Node 1" instead of "Z-Wave Controller" or similar

### 3. MCP Client Spawns Multiple Server Processes (MINOR)

**Observation:**

```
pi 41208 node .../zwave-mcp-server/src/index.js
pi 45298 node .../zwave-mcp-server/src/index.js
```

Two MCP server processes running (one from voice-gateway, one from oracle)

**Expected Behavior:** Each app spawns its own MCP server process
**This is OK:** MCP servers are lightweight and stateless
**Alternative Design:** Could use a single shared MCP server daemon, but current approach is simpler

---

## Helpful Commands

### Monitor Oracle Service Logs

```bash
# Real-time logs
journalctl -u oracle.service -f

# Last 100 lines
journalctl -u oracle.service -n 100 --no-pager

# Filter for MCP debug output
journalctl -u oracle.service -n 100 --no-pager | grep "MCP DEBUG"

# Filter for device tool calls
journalctl -u oracle.service -f | grep -E "(device-list-tool|device-control-tool)"
```

### Check ZWave-JS-UI Status

```bash
# Check service status
curl -sI http://localhost:8091/

# Check logs
tail -100 /home/pi/code/zwave-js-ui/store/logs/zwavejs_current.log

# Search for specific node
grep "node 2" /home/pi/code/zwave-js-ui/store/logs/zwavejs_current.log | tail -20
```

### Rebuild and Restart Oracle

```bash
cd /home/pi/code/mqtt-ollama-presentation/apps/oracle
export NODE_OPTIONS="--max-old-space-size=1024"
npm run build
sudo systemctl restart oracle.service
systemctl status oracle.service
```

---

## Timeline of Session

1. **20:58** - Rebuilt oracle service with `includeInactive: true` change
2. **20:59** - User tested: "What devices are available?"
    - Result: "Node 1" (Online) and "Switch" (Offline) ✓
3. **21:00** - User tested: "Can you turn off the switch"
    - Result: Tool called but AI said "I can't perform actions" ✗
4. **21:02** - User tested: "Turn off the switch"
    - Same result: Tool called but not executed ✗
5. **21:05** - Diagnosed device as DEAD (battery likely died)
6. **21:08** - User checking battery on physical device
7. **21:10** - Updated documentation with troubleshooting guide
8. **October 19, 2025** - Added MQTT client conditional debug logging

---

## Lessons for Future

1. **Always check device status first** - A "dead" device can't be controlled
2. **Debug logging is essential** - MCP server logs helped identify the issue quickly
3. **Use systemd journal for MCP servers** - Console.error from child process goes to systemd
4. **Test with live devices** - Can't properly test control tools with dead devices
5. **Document while troubleshooting** - Easier to write docs with fresh context

---

## Additional Improvements Made

### MQTT Client Debug Logging (October 19, 2025)

**Problem:** MQTT client was flooding production logs with verbose debug output on every publish operation.

**Solution:** Added conditional debug logging controlled by environment variables:

```javascript
// In apps/oracle/src/lib/mqtt/client.js
const DEBUG = process.env.LOG_LEVEL === 'debug' || process.env.NODE_ENV === 'development';

// Verbose logs now gated:
if (DEBUG) console.log('[MQTT] publish() called', {...});
if (DEBUG) console.log('[MQTT] About to publish:', {...});

// Error logs always shown:
console.error('[MQTT] Publish error:', error);  // Always logged
```

**Usage:**

- **Production mode** (default): `NODE_ENV=production` → Only errors logged
- **Debug mode**: `LOG_LEVEL=debug` → Full verbose logging enabled
- **Development mode**: `NODE_ENV=development` → Full verbose logging enabled

**To enable debug logging in systemd services:**

```bash
# Edit oracle service
sudo nano /etc/systemd/system/oracle.service

# Change:
Environment="LOG_LEVEL=info"
# To:
Environment="LOG_LEVEL=debug"

# Restart and view logs
sudo systemctl restart oracle.service
journalctl -u oracle.service -f
```

---

