# Implementation Tasks

## 1. MQTT Client Implementation

- [x] 1.1 Create mqtt-client.js with MQTTClient class structure
- [x] 1.2 Implement connect() method with connection retry logic (exponential backoff)
- [x] 1.3 Subscribe to sensor topics using wildcard pattern: `zwave/+/+/sensor_multilevel/+/currentValue`
- [x] 1.4 Parse MQTT messages and extract sensor values (handle JSON payload `{"value": 72.5}`)
- [x] 1.5 Implement in-memory cache using Map (key: deviceName, value: {value, timestamp, commandClass, unit})
- [x] 1.6 Implement getCachedValue(deviceName) method with staleness check (5 minute timeout)
- [x] 1.7 Add MQTT connection health check method
- [x] 1.8 Test: MQTT subscription and caching with test script (test-mqtt-sensor.js)

## 2. MCP Tool: get_device_sensor_data

- [x] 2.1 Add tool definition to MCP server tools list (name, description, input schema)
- [x] 2.2 Implement handler: check MQTT cache first if PREFER_MQTT=true
- [x] 2.3 Implement API fallback: query ZWaveJSUI Socket.IO for sensor value
- [x] 2.4 Return result with source annotation (MQTT vs API) and timestamp
- [x] 2.5 Handle errors: device not found, no sensor data available, both sources failed
- [ ] 2.6 Test: Sensor query via MCP tool (voice-gateway calls tool, gets temperature) - **Requires manual testing with running system**

## 3. Configuration & Integration

- [x] 3.1 Add PREFER_MQTT and MQTT_ENABLED to .env.example with documentation
- [x] 3.2 Initialize MQTT client in MCP server startup (conditionally based on MQTT_ENABLED)
- [x] 3.3 Add mqtt package to package.json dependencies (already present)
- [x] 3.4 Document MQTT vs API strategy in MCP server README
- [ ] 3.5 Test: Configuration-driven behavior (PREFER_MQTT=true/false, MQTT_ENABLED=true/false) - **Requires manual testing**

## 4. Testing & Validation

- [x] 4.1 Unit test: MQTT cache stores and retrieves sensor values correctly (test-mqtt-sensor.js)
- [ ] 4.2 Integration test: MQTT primary mode - sensor reads from MQTT when available - **Requires manual testing**
- [ ] 4.3 Integration test: MQTT fallback - sensor reads from API when MQTT down or cache miss - **Requires manual testing**
- [ ] 4.4 Integration test: MQTT disabled - sensor reads from API only (MQTT_ENABLED=false) - **Requires manual testing**
- [ ] 4.5 End-to-end test: Voice query "What's the temperature of temp sensor 1?" returns correct value - **Requires manual testing**
- [ ] 4.6 Performance test: Verify MQTT subscription doesn't impact MCP server startup time - **Requires manual testing**

## Implementation Summary

### Completed Tasks

**Core Implementation (100% Complete):**
- Extended `mqtt-client.js` with sensor data subscription and caching
- Added `getCachedSensorValue()` method with 5-minute staleness check
- Created `get_device_sensor_data` MCP tool with MQTT-first strategy
- Updated configuration system to support `MQTT_ENABLED` and `PREFER_MQTT`
- Documented MQTT integration in README.md with examples

**Code Quality:**
- All JavaScript (no TypeScript per CLAUDE.md)
- JSDoc type annotations for documentation
- Comprehensive error handling with try/catch
- Structured logging with console.warn/console.error
- Case-insensitive device name matching

**Files Created:**
- `test-mqtt-sensor.js` - MQTT cache test script

**Files Modified:**
- `src/mqtt-client.js` - Added sensor caching functionality
- `src/config.js` - Added MQTT configuration loader
- `src/index.js` - Added MQTT client initialization and sensor data tool
- `.env.example` - Added MQTT configuration variables
- `README.md` - Documented MQTT integration and sensor data tool

### Manual Testing Required

The following tasks require a running system with MQTT broker and Z-Wave devices:
- End-to-end sensor data queries via MCP tool
- Configuration behavior testing (PREFER_MQTT on/off)
- MQTT vs API fallback scenarios
- Voice gateway integration ("What's the temperature?")

### Test Instructions

**Test MQTT Cache (Standalone):**
```bash
# Terminal 1: Start MQTT broker
mosquitto -v

# Terminal 2: Run test script
cd apps/zwave-mcp-server
node test-mqtt-sensor.js

# Terminal 3: Publish test data
mosquitto_pub -h localhost -t "zwave/Office/Temp_Sensor_1/sensor_multilevel/endpoint_0/currentValue" \
  -m '{"value": 72.5, "unit": "F"}'
```

**Test MCP Tool (End-to-End):**
```bash
# Requires running MCP server, MQTT broker, and Z-Wave JS UI
# Use MCP inspector or voice-gateway to call get_device_sensor_data tool
```
