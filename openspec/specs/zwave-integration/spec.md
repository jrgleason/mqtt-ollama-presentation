# zwave-integration Specification

## Purpose
TBD - created by archiving change add-mqtt-sensor-data-fallback. Update Purpose after archive.
## Requirements
### Requirement: MQTT Sensor Data Subscription

The Z-Wave MCP server SHALL subscribe to MQTT topics for real-time sensor data and cache values in memory for fast retrieval.

#### Scenario: MQTT connection established

- **GIVEN** MQTT_ENABLED=true in configuration
- **WHEN** Z-Wave MCP server starts up
- **THEN** MQTT client connects to broker at MQTT_BROKER_URL
- **AND** subscribes to wildcard topic: `zwave/+/+/sensor_multilevel/+/currentValue`
- **AND** connection status is logged ("✅ MQTT connected" or "❌ MQTT connection failed")

#### Scenario: Sensor value received via MQTT

- **GIVEN** MQTT client is connected and subscribed
- **WHEN** ZWaveJSUI publishes sensor update to MQTT topic
- **THEN** MCP server receives message with topic and payload
- **AND** parses device name from topic path (e.g., `zwave/office/temp_sensor_1/...` → device="temp_sensor_1")
- **AND** extracts value from JSON payload (e.g., `{"value": 72.5}` → value=72.5)
- **AND** stores entry in cache: `{deviceName, value, timestamp: Date.now(), source: "MQTT"}`

#### Scenario: Cache lookup returns cached value

- **GIVEN** sensor value for "Temp Sensor 1" is cached (timestamp within 5 minutes)
- **WHEN** get_device_sensor_data tool is called with deviceName="Temp Sensor 1"
- **THEN** cache returns `{value: 72.5, timestamp: ..., source: "MQTT"}`
- **AND** no API query is made (fast path)

#### Scenario: Cache miss triggers API fallback

- **GIVEN** sensor value for "Humidity Sensor" is NOT in cache
- **WHEN** get_device_sensor_data tool is called with deviceName="Humidity Sensor"
- **THEN** cache returns null
- **AND** tool falls back to querying ZWaveJSUI API
- **AND** API result is returned with source: "API"

#### Scenario: Stale cache value triggers refresh

- **GIVEN** sensor value for "Temp Sensor 1" is cached but older than 5 minutes
- **WHEN** get_device_sensor_data tool is called
- **THEN** cached value is considered stale
- **AND** tool falls back to querying ZWaveJSUI API for fresh value
- **AND** cache is updated with new value

#### Scenario: MQTT reconnection after disconnect

- **GIVEN** MQTT client was connected but broker restarted
- **WHEN** MQTT connection is lost
- **THEN** client attempts reconnection with exponential backoff
- **AND** on successful reconnection, re-subscribes to sensor topics
- **AND** cache is cleared (stale data removed)

---

### Requirement: Sensor Data Query Tool

The Z-Wave MCP server SHALL provide a `get_device_sensor_data` tool for reading current sensor values with configurable data source preference.

#### Scenario: Query sensor via MQTT (preferred)

- **GIVEN** PREFER_MQTT=true (default)
- **AND** sensor value for "Temp Sensor 1" exists in MQTT cache
- **WHEN** get_device_sensor_data({deviceName: "Temp Sensor 1"}) is called
- **THEN** tool returns cached MQTT value
- **AND** response includes: `{value: 72.5, unit: "°F", timestamp, source: "MQTT"}`

#### Scenario: Query sensor via API (fallback)

- **GIVEN** PREFER_MQTT=true
- **AND** sensor value for "New Sensor" is NOT in MQTT cache
- **WHEN** get_device_sensor_data({deviceName: "New Sensor"}) is called
- **THEN** tool queries ZWaveJSUI Socket.IO API for device node
- **AND** extracts sensor value from node.values object
- **AND** response includes: `{value: 68.0, unit: "°F", timestamp, source: "API"}`

#### Scenario: Query sensor with API-only mode

- **GIVEN** PREFER_MQTT=false (or MQTT_ENABLED=false)
- **WHEN** get_device_sensor_data({deviceName: "Temp Sensor 1"}) is called
- **THEN** tool skips MQTT cache entirely
- **AND** queries ZWaveJSUI API directly
- **AND** response includes source: "API"

#### Scenario: Device not found error

- **GIVEN** device "Nonexistent Device" does not exist in Z-Wave network
- **WHEN** get_device_sensor_data({deviceName: "Nonexistent Device"}) is called
- **THEN** MQTT cache has no entry
- **AND** API query returns no matching device
- **AND** tool returns error: "Device 'Nonexistent Device' not found in Z-Wave network"

#### Scenario: No sensor data available error

- **GIVEN** device "Binary Switch" exists but has no sensor capabilities (it's a switch, not a sensor)
- **WHEN** get_device_sensor_data({deviceName: "Binary Switch"}) is called
- **THEN** tool returns error: "Device 'Binary Switch' does not have sensor data (command class 49 not found)"

#### Scenario: Both data sources unavailable error

- **GIVEN** MQTT broker is down AND ZWaveJSUI API is unreachable
- **WHEN** get_device_sensor_data({deviceName: "Temp Sensor 1"}) is called
- **THEN** MQTT cache returns null (no recent data)
- **AND** API query fails with connection error
- **AND** tool returns error: "Unable to retrieve sensor data from any source (MQTT: disconnected, API: timeout)"

---

### Requirement: Configurable Data Source Preference

The Z-Wave MCP server SHALL support configuration for enabling MQTT and choosing data source preference.

#### Scenario: MQTT enabled and preferred (default)

- **GIVEN** MQTT_ENABLED=true AND PREFER_MQTT=true
- **WHEN** MCP server starts
- **THEN** MQTT client is initialized and connects to broker
- **AND** sensor queries check MQTT cache first, fall back to API

#### Scenario: MQTT enabled but not preferred

- **GIVEN** MQTT_ENABLED=true AND PREFER_MQTT=false
- **WHEN** MCP server starts
- **THEN** MQTT client is initialized (for caching)
- **AND** sensor queries use API only (skip MQTT cache lookup)

**Rationale:** MQTT cache still built in background, but not used for queries. Useful for testing API path while MQTT is running.

#### Scenario: MQTT disabled entirely

- **GIVEN** MQTT_ENABLED=false
- **WHEN** MCP server starts
- **THEN** MQTT client is NOT initialized
- **AND** sensor queries use API only
- **AND** no MQTT connection attempts are made

#### Scenario: Invalid configuration fallback

- **GIVEN** MQTT_ENABLED=true but MQTT_BROKER_URL is invalid or missing
- **WHEN** MCP server attempts MQTT connection
- **THEN** connection fails with clear error message
- **AND** MCP server continues with API-only mode (graceful degradation)
- **AND** error log indicates: "MQTT disabled due to connection failure, using API-only mode"

---

### Requirement: MQTT Topic Pattern Support

The Z-Wave MCP server SHALL parse MQTT topics following the zwave-js-ui topic pattern and extract device metadata.

#### Scenario: Parse temperature sensor topic

- **GIVEN** MQTT message received on topic: `zwave/office/temp_sensor_1/sensor_multilevel/endpoint_0/currentValue`
- **WHEN** topic is parsed
- **THEN** deviceName is extracted as "temp_sensor_1"
- **AND** location is extracted as "office"
- **AND** commandClass is identified as "sensor_multilevel" (49)
- **AND** property is "currentValue" (read sensor value, not setpoint)

#### Scenario: Parse sensor with no location

- **GIVEN** MQTT message received on topic: `zwave//humidity_sensor/sensor_multilevel/endpoint_0/currentValue`
- **WHEN** topic is parsed
- **THEN** deviceName is extracted as "humidity_sensor"
- **AND** location is empty string or null (no location configured in ZWaveJSUI)
- **AND** commandClass is "sensor_multilevel"

#### Scenario: Parse payload with value and unit

- **GIVEN** MQTT payload: `{"value": 72.5, "unit": "°F"}`
- **WHEN** payload is parsed
- **THEN** value is extracted as 72.5 (number)
- **AND** unit is extracted as "°F" (string)
- **AND** cache entry includes both value and unit

#### Scenario: Ignore non-sensor MQTT topics

- **GIVEN** MQTT message received on topic: `zwave/office/light/switch_binary/endpoint_0/currentValue`
- **WHEN** topic is evaluated
- **THEN** commandClass "switch_binary" is not "sensor_multilevel"
- **AND** message is ignored (not cached)
- **AND** only sensor data (command class 49) is cached

**Rationale:** We only cache sensor readings, not switch states. Switch control is handled separately.

#### Scenario: Handle MQTT wildcard subscription

- **GIVEN** MCP server subscribes to `zwave/+/+/sensor_multilevel/+/currentValue`
- **WHEN** ZWaveJSUI publishes to any matching topic
- **THEN** MCP server receives all sensor updates across all devices and locations
- **AND** wildcard `+` matches any single path segment (location, device name, endpoint)

**Rationale:** Wildcard subscription allows dynamic discovery of new sensors without reconfiguring MCP server.

---

### Requirement: Tool Definition and Integration

The `get_device_sensor_data` tool SHALL be registered with the MCP server and exposed to voice-gateway for AI tool calling.

#### Scenario: Tool registered in MCP tools list

- **GIVEN** MCP server initialization completes
- **WHEN** voice-gateway queries MCP server for available tools
- **THEN** `get_device_sensor_data` appears in tools list
- **AND** tool definition includes name, description, and input schema

**Tool Definition:**
```json
{
  "name": "get_device_sensor_data",
  "description": "Get current sensor data from a Z-Wave device (temperature, humidity, etc.)",
  "inputSchema": {
    "type": "object",
    "properties": {
      "deviceName": {
        "type": "string",
        "description": "Name of the Z-Wave device (e.g., 'Temp Sensor 1')"
      }
    },
    "required": ["deviceName"]
  }
}
```

#### Scenario: Tool called by AI

- **GIVEN** user asks "What's the temperature of temp sensor 1?"
- **WHEN** AI decides to call get_device_sensor_data tool
- **THEN** tool is invoked with input: `{deviceName: "Temp Sensor 1"}`
- **AND** tool returns result: "The current temperature is 72.5°F (read from MQTT cache 30 seconds ago)"
- **AND** AI uses result to formulate natural language response

#### Scenario: Tool result format

- **GIVEN** get_device_sensor_data tool succeeds
- **WHEN** tool returns result
- **THEN** result is a string description suitable for AI consumption
- **AND** format: "The current [property] is [value] [unit] (source: [MQTT|API], [age])"
- **AND** example: "The current temperature is 72.5°F (source: MQTT, updated 1 minute ago)"

**Rationale:** AI works best with natural language descriptions, not raw JSON. Tool returns human-readable string.

#### Scenario: Tool error handling in AI context

- **GIVEN** get_device_sensor_data tool fails (device not found, no data)
- **WHEN** tool returns error
- **THEN** error message is clear and actionable
- **AND** AI can convey error to user: "I couldn't find that device" or "That device doesn't have sensor data"

### Requirement: Device List Pagination

The Z-Wave MCP server SHALL provide a `list_devices` tool that returns paginated device listings with status information.

#### Scenario: List devices with default pagination

- **GIVEN** Z-Wave network has 25 registered devices
- **WHEN** `list_devices()` is called with no parameters
- **THEN** tool returns first 10 devices
- **AND** response includes: `{ devices: [...], total: 25, showing: 10, hasMore: true }`
- **AND** response message indicates "Showing 10 of 25 devices. Use offset parameter to see more."

#### Scenario: List devices with custom limit

- **GIVEN** Z-Wave network has 25 registered devices
- **WHEN** `list_devices({ limit: 5 })` is called
- **THEN** tool returns first 5 devices
- **AND** response includes: `{ devices: [...], total: 25, showing: 5, hasMore: true }`

#### Scenario: List devices with offset for pagination

- **GIVEN** Z-Wave network has 25 registered devices
- **WHEN** `list_devices({ limit: 10, offset: 10 })` is called
- **THEN** tool returns devices 11-20
- **AND** response includes: `{ devices: [...], total: 25, showing: 10, hasMore: true }`

#### Scenario: List all devices when count is small

- **GIVEN** Z-Wave network has 5 registered devices
- **WHEN** `list_devices()` is called with no parameters
- **THEN** tool returns all 5 devices
- **AND** response includes: `{ devices: [...], total: 5, showing: 5, hasMore: false }`
- **AND** no "more devices" message is shown

#### Scenario: Device entry includes status information

- **GIVEN** device "Living Room Light" exists and was seen 30 seconds ago
- **WHEN** device is included in `list_devices` response
- **THEN** device entry includes: `{ name: "Living Room Light", type: "switch", location: "Living Room", isActive: true, lastSeen: "30 seconds ago" }`

#### Scenario: Device entry shows inactive status

- **GIVEN** device "Garage Sensor" exists but hasn't responded in 10 minutes
- **WHEN** device is included in `list_devices` response
- **THEN** device entry includes: `{ name: "Garage Sensor", type: "sensor", location: "Garage", isActive: false, lastSeen: "10 minutes ago" }`

---

### Requirement: Device Verification

The Z-Wave MCP server SHALL provide a `verify_device` tool to check if a device exists and report its current status.

#### Scenario: Verify existing device

- **GIVEN** device "Kitchen Light" exists in Z-Wave network
- **AND** device responded to MQTT/API within last 2 minutes
- **WHEN** `verify_device({ deviceName: "Kitchen Light" })` is called
- **THEN** tool returns: `{ exists: true, name: "Kitchen Light", type: "switch", location: "Kitchen", isActive: true, lastSeen: "2 minutes ago" }`

#### Scenario: Verify existing but inactive device

- **GIVEN** device "Basement Sensor" exists in Z-Wave network
- **AND** device has not responded in 15 minutes
- **WHEN** `verify_device({ deviceName: "Basement Sensor" })` is called
- **THEN** tool returns: `{ exists: true, name: "Basement Sensor", type: "sensor", location: "Basement", isActive: false, lastSeen: "15 minutes ago" }`
- **AND** response includes warning: "Device exists but may not be responding"

#### Scenario: Verify non-existent device with suggestions

- **GIVEN** device "Kichen Light" (misspelled) does NOT exist
- **AND** device "Kitchen Light" DOES exist
- **WHEN** `verify_device({ deviceName: "Kichen Light" })` is called
- **THEN** tool returns: `{ exists: false, suggestions: ["Kitchen Light"] }`
- **AND** response message: "Device 'Kichen Light' not found. Did you mean: Kitchen Light?"

#### Scenario: Verify non-existent device with no similar names

- **GIVEN** device "Nonexistent Device XYZ" does NOT exist
- **AND** no similar device names exist
- **WHEN** `verify_device({ deviceName: "Nonexistent Device XYZ" })` is called
- **THEN** tool returns: `{ exists: false, suggestions: [] }`
- **AND** response message: "Device 'Nonexistent Device XYZ' not found. No similar devices found."

#### Scenario: Case-insensitive device verification

- **GIVEN** device "Living Room Light" exists
- **WHEN** `verify_device({ deviceName: "living room light" })` is called
- **THEN** tool finds the device (case-insensitive match)
- **AND** returns the canonical name: `{ exists: true, name: "Living Room Light", ... }`

---

### Requirement: Device Activity Tracking

The Z-Wave MCP server SHALL track device activity status based on recent MQTT messages or API responses.

#### Scenario: Device marked active on MQTT message

- **GIVEN** device "Temp Sensor 1" receives MQTT update
- **WHEN** MQTT message is processed
- **THEN** device lastSeen timestamp is updated to current time
- **AND** device isActive returns true (within 5 minute threshold)

#### Scenario: Device marked inactive after timeout

- **GIVEN** device "Motion Sensor" last seen 6 minutes ago
- **WHEN** isActive status is queried
- **THEN** device isActive returns false (exceeded 5 minute threshold)

#### Scenario: Activity threshold is configurable

- **GIVEN** DEVICE_ACTIVE_THRESHOLD_MS environment variable is set to 600000 (10 minutes)
- **WHEN** device "Sensor A" was seen 7 minutes ago
- **THEN** device isActive returns true (within custom 10 minute threshold)

#### Scenario: New device has unknown activity status

- **GIVEN** device "New Switch" was just discovered via API
- **AND** no MQTT messages have been received for this device
- **WHEN** activity status is queried
- **THEN** device isActive returns null (unknown)
- **AND** lastSeen is null or "Never"

### Requirement: Z-Wave Unavailability Error Handling

The Z-Wave MCP server SHALL provide clear, user-friendly error messages when the Z-Wave JS UI is unavailable.

#### Scenario: Z-Wave JS UI connection timeout

- **GIVEN** Z-Wave JS UI server is unreachable (network down, Pi offline, service stopped)
- **WHEN** any Z-Wave tool is called (list_devices, verify_device, control_zwave_device, etc.)
- **THEN** tool returns error with user-friendly message
- **AND** error message is suitable for TTS playback
- **AND** error message includes: problem description, likely cause, suggested action
- **AND** example: "I can't reach the smart home system right now. The Z-Wave controller appears to be offline. Please check that it's powered on and connected to your network."

#### Scenario: Z-Wave JS UI connection refused

- **GIVEN** Z-Wave JS UI service is not running on the Pi
- **WHEN** any Z-Wave tool is called
- **THEN** tool returns error: "The Z-Wave service isn't running. Please start the Z-Wave JS UI service on your Raspberry Pi."

#### Scenario: Z-Wave JS UI partial failure

- **GIVEN** Z-Wave JS UI is reachable but returns internal error
- **WHEN** any Z-Wave tool is called
- **THEN** tool returns error: "The Z-Wave system encountered an error. Please try again in a moment, or restart the Z-Wave service if the problem persists."

---

### Requirement: Voice Gateway Error Translation

The voice gateway SHALL translate technical tool errors into speakable, user-friendly responses.

#### Scenario: Tool timeout translated to friendly message

- **GIVEN** ToolExecutor receives timeout error from Z-Wave tool
- **WHEN** error contains "Timed out" or "ETIMEDOUT"
- **THEN** ToolExecutor returns: "The smart home system is taking too long to respond. It might be offline or experiencing issues."
- **AND** log contains original technical error for debugging

#### Scenario: Connection refused translated to friendly message

- **GIVEN** ToolExecutor receives connection error from Z-Wave tool
- **WHEN** error contains "ECONNREFUSED" or "connection refused"
- **THEN** ToolExecutor returns: "I can't connect to the smart home controller. Please check that it's running and connected to your network."

#### Scenario: AI receives clear error context

- **GIVEN** Z-Wave tool fails with user-friendly error message
- **WHEN** AIRouter processes tool result
- **THEN** AI receives error message that clearly explains the situation
- **AND** AI can formulate a helpful response to user
- **AND** AI does NOT try to call another tool as a "workaround" (avoids cascade failures)

---

### Requirement: Z-Wave Health Check Tool

The Z-Wave MCP server SHALL provide a `check_zwave_health` tool for proactively checking system availability.

#### Scenario: Health check when Z-Wave is available

- **GIVEN** Z-Wave JS UI is running and reachable
- **WHEN** `check_zwave_health()` is called
- **THEN** tool returns: `{ available: true, nodeCount: 15, lastChecked: "2 seconds ago" }`
- **AND** response is fast (cached result, <100ms)

#### Scenario: Health check when Z-Wave is unavailable

- **GIVEN** Z-Wave JS UI is unreachable
- **WHEN** `check_zwave_health()` is called
- **THEN** tool returns: `{ available: false, error: "Cannot reach Z-Wave controller", lastChecked: "30 seconds ago" }`
- **AND** cached result used to avoid repeated timeout delays

#### Scenario: Health check cache expiry

- **GIVEN** Health check was performed 60+ seconds ago
- **WHEN** `check_zwave_health()` is called
- **THEN** fresh check is performed (not cached)
- **AND** cache is updated with new result

#### Scenario: AI uses health check proactively

- **GIVEN** User asks about smart home devices
- **AND** previous Z-Wave call failed recently
- **WHEN** AI processes the request
- **THEN** AI MAY call `check_zwave_health` first
- **AND** if unavailable, AI responds immediately with helpful message
- **AND** avoids waiting for tool timeout

