# Z-Wave MCP Server

A Model Context Protocol (MCP) server that provides tools for interacting with Z-Wave devices through Z-Wave JS UI.

## Features

- **Device Discovery**: List all Z-Wave devices with their status and MQTT topics
- **Node Details**: Get detailed information about specific nodes
- **Value Refresh**: Refresh sensor readings and device states
- **Node Re-interview**: Update device capabilities and information
- **Network Statistics**: Monitor Z-Wave network health
- **Authentication**: Secure access to Z-Wave JS UI API

## Available Tools

### 1. `list_zwave_devices`

Lists all Z-Wave devices reported by Z-Wave JS UI.

**Parameters:**

- `includeInactive` (boolean, optional): Include nodes that are not ready or unavailable
- `filter` (string, optional): Case-insensitive substring to match against name or location

**Example:**

```json
{
  "includeInactive": false,
  "filter": "bedroom"
}
```

### 2. `control_zwave_device`

Control a Z-Wave device by sending commands via MQTT. Supports turning devices on/off and dimming.

**Parameters:**

- `deviceName` (string, required): The name of the device to control (e.g., "Demo Switch" or "Living Room Light")
- `action` (string, required): The action to perform: "on", "off", or "dim"
- `level` (number, optional): For dimming, brightness level 0-100 (required when action is "dim")

**Example:**

```json
{
  "deviceName": "Living Room Light",
  "action": "dim",
  "level": 50
}
```

### 3. `get_device_sensor_data`

Get current sensor readings from a Z-Wave sensor device (temperature, humidity, light level, etc.).

**Data Strategy:**
- **MQTT-First (Default)**: When `PREFER_MQTT=true`, checks MQTT cache first for real-time sensor data
- **API Fallback**: Falls back to Z-Wave JS UI API if MQTT cache miss or stale (> 5 minutes)
- **API-Only**: When `PREFER_MQTT=false`, always queries Z-Wave JS UI API directly

**Parameters:**

- `deviceName` (string, required): The name of the sensor device (e.g., "Temp Sensor 1" or "Office Temperature")

**Example:**

```json
{
  "deviceName": "Temp Sensor 1"
}
```

**Response Format:**

```
Sensor: "Temp Sensor 1"
Value: 72.5 F
Source: MQTT
Age: 15 seconds
Timestamp: 2025-01-10T15:30:45.123Z
```

## MQTT Integration

This MCP server integrates with MQTT for two purposes:
1. **Device Control** - Send commands to Z-Wave devices
2. **Sensor Data** - Subscribe to real-time sensor updates (temperature, humidity, etc.)

### MQTT vs API Strategy

The server uses a **hybrid approach** for sensor data:

**MQTT Cache (Primary - Default)**
- Subscribes to sensor topics: `zwave/+/+/sensor_multilevel/+/currentValue`
- Caches values in memory with timestamps
- Zero latency for cached values (< 5 minutes old)
- Works even if Z-Wave JS UI web interface is down

**Z-Wave JS UI API (Fallback)**
- Used when MQTT cache miss or value is stale
- Queries device values via Socket.IO
- Requires web interface to be running

**Configuration:**
```bash
MQTT_ENABLED=true          # Enable/disable MQTT integration (default: true)
PREFER_MQTT=true           # Prefer MQTT cache over API (default: true)
```

### Benefits of MQTT-First Strategy

1. **Lower Latency** - Instant access to cached sensor values (no API call)
2. **Real-Time Updates** - MQTT broker pushes updates as sensors report
3. **Reliability** - Works if Z-Wave JS UI web interface restarts
4. **Network Efficiency** - Pub/sub model reduces polling overhead

## MQTT Topic Structure

**IMPORTANT**: This MCP server uses human-readable MQTT topics that match Z-Wave JS UI's `nodeNames=true` configuration.

### Topic Format

**Control Topic (Set Values):**

```
zwave/[Location/]Device_Name/command_class/endpoint_0/targetValue/set
```

**State Topic (Read Values):**

```
zwave/[Location/]Device_Name/command_class/endpoint_0/currentValue
```

**Sensor Topic (Multilevel Sensors):**

```
zwave/[Location/]Device_Name/sensor_multilevel/endpoint_0/currentValue
```

### Examples

**Binary Switch (Command Class 37):**

```bash
# Topic
zwave/Demo/Switch_One/switch_binary/endpoint_0/targetValue/set

# Payload to turn ON
{"value": true}

# Payload to turn OFF
{"value": false}
```

**Dimmer/Multilevel Switch (Command Class 38):**

```bash
# Topic
zwave/Bedroom/Lamp/switch_multilevel/endpoint_0/targetValue/set

# Payload (0-99 for brightness percentage)
{"value": 50}  # 50% brightness
{"value": 0}   # Off
{"value": 99}  # Full brightness
```

**Multilevel Sensor (Command Class 49):**

```bash
# Temperature Sensor Topic
zwave/Office/Temp_Sensor_1/sensor_multilevel/endpoint_0/currentValue

# Payload (read-only, published by Z-Wave JS UI)
{"value": 72.5, "unit": "F"}

# Humidity Sensor Topic
zwave/Living_Room/Humidity_Sensor/sensor_multilevel/endpoint_0/currentValue

# Payload
{"value": 45, "unit": "%"}
```

**Without Location:**

```bash
# If device has no location set, it's omitted from the path
zwave/Kitchen_Light/switch_binary/endpoint_0/targetValue/set
zwave/Temp_Sensor_1/sensor_multilevel/endpoint_0/currentValue
```

### Command Class Mapping

| Command Class ID | Topic Name          | Device Type                  |
|------------------|---------------------|------------------------------|
| 37               | `switch_binary`     | On/Off Switch                |
| 38               | `switch_multilevel` | Dimmer                       |
| 49               | `sensor_multilevel` | Sensor (temp, humidity, etc) |
| 64               | `thermostat_mode`   | Thermostat                   |

### Payload Format

All MQTT messages use JSON payloads with a `value` property:

```json
{
  "value": <boolean
  |
  number>
}
```

- **Binary switches**: `true` (on) or `false` (off)
- **Dimmers**: `0` to `99` (percentage)
- **Sensors**: Read-only numeric values

### Testing MQTT Topics

Use mosquitto_pub to test device control:

```bash
# Turn on a switch
mosquitto_pub -h localhost -t "zwave/Demo/Switch_One/switch_binary/endpoint_0/targetValue/set" \
  -m '{"value": true}'

# Turn off a switch
mosquitto_pub -h localhost -t "zwave/Demo/Switch_One/switch_binary/endpoint_0/targetValue/set" \
  -m '{"value": false}'

# Set dimmer to 50%
mosquitto_pub -h localhost -t "zwave/Bedroom/Lamp/switch_multilevel/endpoint_0/targetValue/set" \
  -m '{"value": 50}'
```

Subscribe to state updates:

```bash
# Watch all Z-Wave state changes
mosquitto_sub -h localhost -t "zwave/+/+/+/+/currentValue" -v

# Watch specific device
mosquitto_sub -h localhost -t "zwave/Demo/Switch_One/+/+/currentValue" -v

# Watch all sensor data (temperature, humidity, etc.)
mosquitto_sub -h localhost -t "zwave/+/+/sensor_multilevel/+/currentValue" -v

# Watch specific sensor
mosquitto_sub -h localhost -t "zwave/Office/Temp_Sensor_1/sensor_multilevel/+/currentValue" -v
```

Simulate sensor data for testing (if you don't have physical sensors):

```bash
# Publish fake temperature reading
mosquitto_pub -h localhost -t "zwave/Office/Temp_Sensor_1/sensor_multilevel/endpoint_0/currentValue" \
  -m '{"value": 72.5, "unit": "F"}'

# Publish fake humidity reading
mosquitto_pub -h localhost -t "zwave/Living_Room/Humidity_Sensor/sensor_multilevel/endpoint_0/currentValue" \
  -m '{"value": 45, "unit": "%"}'
```

**Note:** The MCP server's MQTT cache will store these simulated values just like real sensor data.

### Z-Wave JS UI Configuration

This topic structure requires Z-Wave JS UI to be configured with:

```json
{
  "gateway": {
    "type": 1,
    "payloadType": 1,
    "nodeNames": true
  }
}
```

**DO NOT change to numeric nodeId format** - the human-readable format with device names and locations is tested and
working.

## Setup

### 1. Configure Z-Wave JS UI Authentication

First, enable authentication on your Z-Wave JS UI instance by setting environment variables:

```bash
DEFAULT_USERNAME=admin
DEFAULT_PASSWORD=your_secure_password
```

**IMPORTANT**: Even though Z-Wave JS UI runs locally on the Pi, you **MUST** enable authentication to prevent
unauthorized access to your Z-Wave network.

### 2. Configure MCP Server

Copy the example environment file and configure it:

```bash
cp .env.tmp.example .env.tmp
```

Edit `.env` and set the following variables:

```bash
# Z-Wave JS UI Configuration
ZWAVE_UI_URL=http://localhost:8091
ZWAVE_UI_USERNAME=admin
ZWAVE_UI_PASSWORD=your_secure_password

# Enable authentication (REQUIRED for security)
ZWAVE_UI_AUTH_ENABLED=true

# Optional: Socket connection timeout in milliseconds (default: 5000)
# ZWAVE_UI_SOCKET_TIMEOUT_MS=10000

# MQTT Broker Configuration (if using MQTT features)
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=jrg
MQTT_PASSWORD=your_mqtt_password
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Build

```bash
npm run build
```

### 5. Run

```bash
npm start
```

Or use the MCP Inspector for testing:

```bash
npm run inspector
```

## Development

### Watch mode

```bash
npm run dev
```

This will rebuild the project automatically when you make changes.

## Security

1. **Network Access**: Anyone on your local network could access Z-Wave JS UI without authentication
2. **Home Automation Control**: Unauthorized access means someone could control your lights, locks, thermostats, etc.
3. **Privacy**: Device names and locations may contain sensitive information
4. **Safety**: Some Z-Wave devices control critical systems (locks, thermostats, etc.)

### Best Practices

1. **Always enable authentication** (`ZWAVE_UI_AUTH_ENABLED=true`)
2. **Use strong passwords** for both Z-Wave JS UI and MQTT
3. **Keep credentials in `.env`** file (never commit to git)
4. **Rotate passwords regularly** especially if you suspect unauthorized access
5. **Use HTTPS/TLS** for production deployments (configure in Z-Wave JS UI)

## Z-Wave JS UI API Endpoints Used

- `POST /api/authenticate` - Authenticate and get bearer token
- `GET /api/exportConfig` - Get all nodes configuration
- `GET /api/settings` - Get Z-Wave JS UI settings
- `GET /api/driver/statistics` - Get network statistics
- `POST /api/refreshNodeValues` - Refresh node values
- `POST /api/refreshNodeInfo` - Re-interview node

## Troubleshooting

### Authentication Failed

If you see "Authentication failed" errors:

1. Verify Z-Wave JS UI has authentication enabled
2. Check that `ZWAVE_UI_USERNAME` and `ZWAVE_UI_PASSWORD` match your Z-Wave JS UI credentials
3. Ensure `ZWAVE_UI_AUTH_ENABLED=true` in your `.env` file

### Connection Timeout

If you see "Timed out while fetching nodes":

1. Verify Z-Wave JS UI is running: `curl http://localhost:8091/health`
2. Check the `ZWAVE_UI_URL` in your `.env` file
3. Increase timeout: `ZWAVE_UI_SOCKET_TIMEOUT_MS=10000`

### No Devices Found

If `list_zwave_devices` returns empty:

1. Check that Z-Wave devices are paired in Z-Wave JS UI web UI
2. Try with `includeInactive: true` to see all nodes
3. Verify Z-Wave controller is connected to Z-Wave JS UI

## License

GPL-3.0
