# Runtime Test Guide: LangChain MCP Auto-Discovery

## Overview

This guide helps you verify the LangChain MCP auto-discovery implementation through runtime testing. All code implementation is complete; these tests verify the system works correctly with actual hardware.

## Prerequisites

Before testing:

1. **Z-Wave JS UI running** with MQTT enabled
2. **MQTT broker running** (e.g., Mosquitto)
3. **Voice gateway configured** with proper environment variables
4. **Z-Wave devices paired** and visible in Z-Wave JS UI

## Test Environment Setup

```bash
# From project root
cd apps/voice-gateway-oww

# Ensure dependencies installed
npm install

# Verify environment variables
cat .env

# Required variables:
# - MQTT_BROKER_URL=mqtt://localhost:1883
# - ZWAVE_UI_URL=http://localhost:8091
# - AI_PROVIDER=ollama (or anthropic)
# - TTS_PROVIDER=piper (or elevenlabs)
```

## Test Execution

### Test 5.3: List Z-Wave Devices via MCP

**Objective:** Verify MCP auto-discovered tool can list devices

**Steps:**
1. Start voice gateway: `npm run dev`
2. Check startup logs for:
   ```
   🔍 Discovered MCP tools { count: 4, tools: [...] }
   ✅ Tool system initialized { toolCount: 7, tools: [...] }
   ```
3. Trigger wake word
4. Say: "What devices are available?"
5. Verify in logs:
   - Tool call: `list_zwave_devices`
   - Response contains device names from Z-Wave JS UI

**Pass Criteria:**
- ✅ MCP tool discovered and called
- ✅ Device list matches Z-Wave JS UI
- ✅ No errors in logs

**Status:** ⏳ Not Started

---

### Test 5.4: Control Z-Wave Device via MCP

**Objective:** Verify MCP auto-discovered tool can control devices

**Steps:**
1. Start voice gateway: `npm run dev`
2. Trigger wake word
3. Say: "Turn on Switch One" (replace with your device name)
4. Verify in logs:
   - Tool call: `control_zwave_device`
   - MQTT message published to correct topic
5. Check Z-Wave JS UI: Device state changed

**Pass Criteria:**
- ✅ MCP tool called with correct parameters
- ✅ MQTT command published
- ✅ Device state changed in Z-Wave JS UI
- ✅ No errors in logs

**Status:** ⏳ Not Started

---

### Test 5.5: Local Tool Execution (datetime)

**Objective:** Verify local tools still work alongside MCP tools

**Steps:**
1. Start voice gateway: `npm run dev`
2. Trigger wake word
3. Say: "What time is it?"
4. Verify in logs:
   - Tool call: `get_datetime`
   - Response contains current time

**Pass Criteria:**
- ✅ Local tool called (not MCP)
- ✅ Correct time returned
- ✅ No errors in logs

**Status:** ⏳ Not Started

---

### Test 5.6: Local Tool Execution (volume)

**Objective:** Verify volume control tool works

**Steps:**
1. Start voice gateway: `npm run dev`
2. Trigger wake word
3. Say: "Set volume to 50"
4. Verify in logs:
   - Tool call: `control_volume`
   - Volume level changed

**Pass Criteria:**
- ✅ Volume control tool called
- ✅ Volume changed to 50
- ✅ No errors in logs

**Status:** ⏳ Not Started

---

### Test 5.7: MCP Tool with Missing Arguments

**Objective:** Verify graceful error handling for invalid tool calls

**Steps:**
1. Start voice gateway: `npm run dev`
2. Trigger wake word
3. Say: "Turn on the light" (without specifying which device)
4. Verify in logs:
   - AI attempts to call tool
   - Error handled gracefully
   - User receives helpful error message

**Pass Criteria:**
- ✅ No system crash
- ✅ Clear error logged
- ✅ User-friendly response (e.g., "Which device would you like to control?")

**Status:** ⏳ Not Started

---

### Test 5.9: Multiple Rapid Tool Calls

**Objective:** Verify system handles multiple tool calls in one query

**Steps:**
1. Start voice gateway: `npm run dev`
2. Trigger wake word
3. Say: "What devices are available? What time is it? Turn on Switch One"
4. Verify in logs:
   - Three tool calls executed:
     1. `list_zwave_devices` (MCP)
     2. `get_datetime` (local)
     3. `control_zwave_device` (MCP)
   - All tools execute successfully
   - Response addresses all three queries

**Pass Criteria:**
- ✅ All three tools called
- ✅ Mix of MCP and local tools works
- ✅ No errors or conflicts
- ✅ Complete response to user

**Status:** ⏳ Not Started

---

## Expected Log Output

### Successful Startup
```
🔧 Configuring MCP client { serverPath: '...', mqttBroker: '...' }
✅ MCP client configured successfully { server: 'zwave' }
🔍 Discovering MCP tools...
✅ MCP integration initialized {
  toolCount: 4,
  tools: [
    'list_zwave_devices',
    'control_zwave_device',
    'get_device_sensor_data',
    'get_device_info'
  ],
  attemptNumber: 1
}
✅ Added MCP tool: list_zwave_devices
✅ Added MCP tool: control_zwave_device
✅ Added MCP tool: get_device_sensor_data
✅ Added MCP tool: get_device_info
✅ Added custom tool: get_datetime
✅ Added custom tool: search_web
✅ Added custom tool: control_volume
✅ Tool system initialized { toolCount: 7, tools: [...] }
```

### Successful Tool Call
```
🔧 Executing tool: list_zwave_devices
✅ Tool executed successfully: list_zwave_devices
Response: [list of devices]
```

## Troubleshooting

### Issue: MCP tools not discovered

**Symptoms:**
- Tool count is 3 instead of 7
- Logs show "Failed to initialize MCP tools"

**Solutions:**
1. Check Z-Wave JS UI is running: `curl http://localhost:8091`
2. Check MQTT broker: `mosquitto_sub -t 'zwave/#' -v`
3. Verify zwave-mcp-server path in logs
4. Check environment variables: `ZWAVE_UI_URL`, `MQTT_BROKER_URL`

### Issue: Tool execution fails

**Symptoms:**
- Tool called but returns error
- Device doesn't respond

**Solutions:**
1. Check MQTT topic format in Z-Wave JS UI
2. Verify device name matches exactly (case-sensitive)
3. Check device is online in Z-Wave JS UI
4. Review parameter mapping in ToolManager.js

### Issue: Local tools not working

**Symptoms:**
- datetime, search, or volume tools fail
- "Tool not found" errors

**Solutions:**
1. Verify tools registered in main.js startup logs
2. Check tool name matches exactly
3. Review invoke() method implementation

## Test Results Template

Copy and fill out after testing:

```markdown
## Test Results

**Date:** YYYY-MM-DD
**Tester:** [Name]
**Environment:** [Development/Production]

### Test 5.3: List Z-Wave Devices
- Status: [PASS/FAIL]
- Notes: [Any observations]

### Test 5.4: Control Z-Wave Device
- Status: [PASS/FAIL]
- Device tested: [Device name]
- Notes: [Any observations]

### Test 5.5: Local Tool (datetime)
- Status: [PASS/FAIL]
- Notes: [Any observations]

### Test 5.6: Local Tool (volume)
- Status: [PASS/FAIL]
- Notes: [Any observations]

### Test 5.7: Missing Arguments
- Status: [PASS/FAIL]
- Notes: [Error handling observations]

### Test 5.9: Multiple Tool Calls
- Status: [PASS/FAIL]
- Notes: [Any observations]

## Overall Assessment
- All tests passed: [YES/NO]
- Issues found: [List any issues]
- Ready for archival: [YES/NO]
```

## Next Steps

After completing all runtime tests:

1. **If all tests pass:**
   - Update tasks.md marking tests as ✅
   - Archive proposal: `openspec archive use-langchain-mcp-auto-discovery --yes`

2. **If any tests fail:**
   - Document failures in test results
   - Create bug fix tasks
   - Fix issues before archiving

## Notes

- These tests require physical hardware and cannot be automated
- Each test should be run at least twice to verify consistency
- Test in both Ollama (offline) and Anthropic (online) modes if possible
- Document any unexpected behavior for future reference
