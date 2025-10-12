# MQTT MCP Testing Session Summary

**Date:** October 4, 2025
**Objective:** Test MQTT MCP server integration for device control

---

## What We Tested

### Attempted Command
**Goal:** Turn on office heater using MQTT MCP server

**Command Sent:**
```json
Topic: home/office/heater/set
Message: {"action": "on"}
QoS: 1
```

**Result:** ❌ Failed - device did not respond

---

## Key Findings

### 1. MQTT MCP Server Limitations (Python Implementation Tested)
The tested Python MQTT MCP server (`ezhuk/mqtt-mcp`) provided:
- ✅ `publish_message` - Send messages to topics
- ✅ `subscribe_topic` - Subscribe to topic patterns
- ❌ **No topic discovery** - Cannot list active topics
- ❌ **No message history** - Cannot see recent messages
- ❌ **No message monitoring** - Can subscribe but cannot view received messages
- ❌ **No message retrieval** - No tool/resource to access subscribed messages

**Critical Finding:** The MCP server can subscribe to topics but provides NO way to retrieve or display the messages it receives. This makes it impossible to monitor MQTT traffic through the MCP interface.

**Implication:** We cannot discover device topics OR monitor device communication through the Python MCP implementation alone.

**Solution:** Build custom TypeScript MCP server that integrates both MQTT and Z-Wave JS UI API access.

### 2. Topic Discovery Challenge
**Problem:** We guessed the topic `home/office/heater/set` but it didn't work.

**Why it failed:**
- Unknown actual topic structure used by Z-Wave JS UI
- Z-Wave JS UI uses specific topic patterns (e.g., `zwave/<nodeId>/<commandClass>/<endpoint>/<property>/set`)
- No way to verify topics without external tools

### 3. Z-Wave JS UI Integration Required
**Z-Wave JS UI** is the source of truth for device topics and commands.

**Z-Wave JS UI provides:**
- MQTT gateway for Z-Wave devices
- Topic structure documentation
- Device node IDs and command classes
- Current device states

**Typical topic patterns:**
```
zwave/<nodeId>/38/0/targetValue/set    # Dimmer/Switch (Binary/Multilevel Switch)
zwave/<nodeId>/64/0/mode/set           # Thermostat mode
zwave/<nodeId>/64/0/setpoint/1/set     # Thermostat setpoint (heating)
```

---

## Solutions to Implement

### Option 1: Z-Wave JS UI Web Interface ✅ RECOMMENDED
**Access Z-Wave JS UI directly to find topics:**
1. Open Z-Wave JS UI (likely at `http://10.0.0.58:8091`)
2. Find office heater device
3. Check MQTT settings to see published topics
4. Note the exact topic structure and command format

### Option 2: MQTT Client Monitoring
**Use mosquitto_sub to monitor all topics:**
```bash
mosquitto_sub -h 10.0.0.58 -p 31883 -u jrg -P <password> -t '#' -v
```

**Benefits:**
- See all active topics in real-time
- Observe message formats
- Discover device naming conventions

### Option 3: HiveMQ Control Center
**Access HiveMQ dashboard:**
- URL: `http://10.0.0.58:8080`
- View active topics
- See recent messages
- Monitor subscriptions

### Option 4: Create Device Registry
**Build a device topic mapping in Oracle:**
```typescript
// config/devices.ts
export const DEVICES = {
  officeHeater: {
    name: 'Office Heater',
    nodeId: 5, // From Z-Wave JS UI
    topics: {
      control: 'zwave/5/38/0/targetValue/set',
      state: 'zwave/5/38/0/currentValue'
    }
  }
};
```

---

## Recommended Next Steps

### Immediate (to fix heater control):
1. ✅ **Access Z-Wave JS UI** - Find actual topic for office heater
2. ✅ **Document topic structure** - Create device registry
3. ✅ **Test with correct topic** - Verify MQTT MCP can control device

### Short-term (improve architecture):
1. **Create device discovery tool** - LangChain tool that queries Z-Wave JS UI API
2. **Build device registry** - Map friendly names to Z-Wave topics
3. **Add topic validation** - Prevent guessing topics

### Long-term (production-ready):
1. **Implement Z-Wave JS UI API integration**
   - REST API: `http://<host>:8091/api/nodes`
   - Get device list, node IDs, command classes
   - Auto-generate MQTT topics from device metadata

2. **Create MCP resource endpoints**
   - `device://devices/list` - All available devices
   - `device://devices/{id}` - Specific device details
   - `device://topics/active` - Currently active topics

3. **Add state monitoring**
   - Subscribe to all device state topics
   - Cache current states
   - Provide to AI for context

---

## Architecture Insight

**Current Architecture:**
```
User Request → Oracle (AI) → MQTT MCP → HiveMQ → ??? (unknown topics)
```

**What's Missing:**
```
User Request → Oracle (AI) → MQTT MCP → HiveMQ → Z-Wave JS UI → Device
                                ↑
                                |
                    (needs topic mapping from Z-Wave JS UI)
```

**Solution:**
```
User Request → Oracle (AI) → Device Registry → MQTT MCP → HiveMQ → Z-Wave JS UI → Device
                                ↑
                                |
                    Z-Wave JS UI API provides mapping
```

---

## Technical Debt Identified

1. **No device topic discovery** - Cannot dynamically find topics
2. **No device registry** - Must hardcode or guess topics
3. **No state tracking** - Don't know current device states
4. **No error handling** - Failed publish has no feedback
5. **No topic validation** - Can send to non-existent topics

---

## Questions for Next Session

1. **Z-Wave JS UI Configuration:**
   - What's the current Z-Wave JS UI URL/port?
   - How many devices are configured?
   - What's the MQTT topic prefix setting?

2. **Device Inventory:**
   - What's the office heater's Z-Wave node ID?
   - What command class does it use (38=Switch, 64=Thermostat)?
   - Is it a switch, dimmer, or thermostat?

3. **Integration Approach:**
   - Should we build Z-Wave JS UI API integration?
   - Or manually create device registry from Z-Wave UI?
   - What other devices need control?

---

## Lessons Learned

1. **Python MQTT MCP is limited** - Tested implementation (`ezhuk/mqtt-mcp`) lacks message monitoring
2. **Topic discovery requires device registry** - Need Z-Wave JS UI API integration for topic mapping
3. **Guessing topics doesn't work** - Must query authoritative source (Z-Wave JS UI)
4. **Custom TypeScript MCP is the solution** - Build integrated server with both MQTT and Z-Wave API access

---

## Files to Update

- [ ] `docs/architecture.md` - Add device registry component
- [ ] `docs/requirements.md` - Add Z-Wave JS UI API integration requirement
- [ ] `docs/tasks.md` - Add task for device registry implementation
- [ ] `config/devices.ts` - Create device topic mapping (once we have Z-Wave data)

---

## Conclusion

**The Python MQTT MCP server works for publishing messages**, but lacks message monitoring capabilities and device discovery. The solution is to **build a custom TypeScript MCP server** that:

1. ✅ Queries Z-Wave JS UI REST API for device discovery
2. ✅ Builds device registry (friendly names → MQTT topics)
3. ✅ Publishes MQTT control commands
4. ✅ Provides unified TypeScript stack (no Python dependency)

**Action Required:** Build custom TypeScript MCP server combining MQTT control with Z-Wave JS UI integration.

**See:** `docs/zwave-mcp-findings.md` for complete implementation plan.
