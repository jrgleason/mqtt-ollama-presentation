# Change: Add MQTT Sensor Data Fallback

## Why

**User reported issue:** "What's the temperature of temp sensor 1?" → AI responds "I don't have access to real-time sensor data"

The Z-Wave MCP server currently provides two tools:
1. `list_zwave_devices` - Lists Z-Wave devices with names, locations, status (online/offline)
2. `control_zwave_device` - Sends control commands (on/off/dim) to devices

**Missing capability:** NO tool exists for reading current sensor values (temperature, humidity, brightness, etc.)

### Current Limitations

1. **No sensor data tool** - MCP server queries Z-Wave JS UI via Socket.IO for device metadata, but doesn't expose sensor readings
2. **Single data source** - Only uses ZWaveJSUI API, ignores MQTT (which publishes real-time sensor data automatically)
3. **No fallback** - If ZWaveJSUI API fails, system has zero Z-Wave capability

### User Requirements

From user feedback:
- **MQTT as primary data source** - User wants MCP server to prefer MQTT for sensor reads
- **ZWaveJSUI API as fallback** - Use API when MQTT unavailable
- **Configurable** - User wants to control preference via environment variables
- **MCP server owns MQTT integration** - NOT voice-gateway (separation of concerns)

### Evidence from Research

[zwave-js/zwave-js-ui](https://github.com/zwave-js/zwave-js-ui) publishes sensor data to MQTT automatically:

**Topic Pattern:**
```
<mqtt_prefix>/<location>/<device_name>/sensor_multilevel/endpoint_0/currentValue
```

**Example Topics:**
- `zwave/office/temp_sensor_1/sensor_multilevel/endpoint_0/currentValue` → `{"value": 72.5}`
- `zwave/living_room/humidity_sensor/sensor_multilevel/endpoint_0/currentValue` → `{"value": 45}`

**Advantages of MQTT:**
- Real-time pub/sub (lower latency than polling API)
- Automatic updates when sensor values change
- No request/response overhead
- Works even if ZWaveJSUI web interface is down (broker + Z-Wave daemon sufficient)

## What Changes

### 1. Add MQTT Integration to Z-Wave MCP Server

**New file:** `apps/zwave-mcp-server/src/mqtt-client.js`

Implement MQTTClient class that:
- Connects to MQTT broker (reuses existing `MQTT_BROKER_URL` config)
- Subscribes to sensor topics: `zwave/+/+/sensor_multilevel/+/currentValue`
- Caches sensor readings in memory: `Map<deviceName, {value, timestamp, commandClass, unit}>`
- Provides `getCachedValue(deviceName)` method for retrieving cached sensor data
- Handles connection retry and reconnection logic

### 2. Add Sensor Data Query Tool

**Modified file:** `apps/zwave-mcp-server/src/index.js`

Add new MCP tool `get_device_sensor_data`:
- **Input:** `deviceName` (string) - e.g., "Temp Sensor 1"
- **Output:** Sensor value with metadata (value, timestamp, unit, source: MQTT or API)
- **Strategy:**
  1. If `PREFER_MQTT=true` (default): Check MQTT cache first
  2. If value found in cache and fresh (< 5 minutes old): Return cached value
  3. If value not in cache or stale: Fall back to ZWaveJSUI API query
  4. If `PREFER_MQTT=false`: Use API only (skip MQTT)

### 3. Configuration

**Modified file:** `apps/zwave-mcp-server/.env.example`

Add new environment variables:
```bash
# MQTT Configuration
MQTT_ENABLED=true                          # Enable/disable MQTT integration
PREFER_MQTT=true                            # Prefer MQTT over API for sensor reads
MQTT_BROKER_URL=mqtt://localhost:1883       # Already exists
MQTT_TOPIC_PREFIX=zwave                     # Already exists
```

## Impact

### Files Created

- `apps/zwave-mcp-server/src/mqtt-client.js` - MQTT client for sensor data subscription

### Files Modified

- `apps/zwave-mcp-server/src/index.js` - Add `get_device_sensor_data` MCP tool, integrate MQTT client
- `apps/zwave-mcp-server/.env.example` - Document PREFER_MQTT and MQTT_ENABLED configuration
- `apps/zwave-mcp-server/package.json` - Add `mqtt` package dependency (if not already present)
- `apps/zwave-mcp-server/README.md` - Document MQTT vs API strategy for sensor data

### Breaking Changes

None. This is purely additive:
- New tool `get_device_sensor_data` (doesn't affect existing tools)
- MQTT integration is optional (`MQTT_ENABLED=false` disables it)
- Default behavior (`PREFER_MQTT=true`) uses best data source

### Performance Impact

- **MQTT subscription:** Minimal overhead (one-time connection, passive listening)
- **Cache lookup:** O(1) Map access (negligible)
- **API fallback:** Only when MQTT unavailable or cache miss (same as current behavior)

### Affected Specifications

- New specification: `zwave-integration` - Documents Z-Wave device integration via MCP server
