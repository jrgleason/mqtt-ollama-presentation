# Quick Start Guide: MQTT Sensor Data Integration

This guide helps you quickly test and verify the new MQTT sensor data functionality.

## 1. Prerequisites

- MQTT broker running (HiveMQ or Mosquitto)
- Z-Wave JS UI configured with MQTT publishing
- Node.js and npm installed

## 2. Quick Test (No Z-Wave Devices Required)

Test MQTT caching with simulated sensor data:

### Terminal 1: Start MQTT Broker
```bash
mosquitto -v
```

### Terminal 2: Run Test Script
```bash
cd apps/zwave-mcp-server
node test-mqtt-sensor.js
```

### Terminal 3: Publish Test Data
```bash
# Wait for test script to show "Waiting for sensor data..."
mosquitto_pub -h localhost -t "zwave/Office/Temp_Sensor_1/sensor_multilevel/endpoint_0/currentValue" \
  -m '{"value": 72.5, "unit": "F"}'
```

**Expected Result:**
```
=== CACHED SENSOR DATA ===
Device: Temp_Sensor_1
Value: 72.5 F
Age: 2 seconds
Timestamp: 2025-12-28T15:30:45.123Z
Topic: zwave/Office/Temp_Sensor_1/sensor_multilevel/endpoint_0/currentValue

Test PASSED! ✓
```

## 3. Configuration

### Default Configuration (.env)
```bash
# MQTT Integration enabled by default
MQTT_ENABLED=true
PREFER_MQTT=true

# MQTT Broker
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=jrg
MQTT_PASSWORD=your_password

# Z-Wave JS UI
ZWAVE_UI_URL=http://localhost:8091
ZWAVE_UI_AUTH_ENABLED=true
ZWAVE_UI_USERNAME=admin
ZWAVE_UI_PASSWORD=your_password
```

### Configuration Modes

**MQTT-First (Recommended):**
```bash
MQTT_ENABLED=true
PREFER_MQTT=true
# Checks MQTT cache first, falls back to API
```

**API-Only:**
```bash
MQTT_ENABLED=false
# OR
PREFER_MQTT=false
# Always uses Z-Wave JS UI API, ignores MQTT
```

## 4. Test with MCP Inspector

```bash
cd apps/zwave-mcp-server
npm run inspector
```

In the inspector UI, call the tool:
```json
{
  "name": "get_device_sensor_data",
  "arguments": {
    "deviceName": "Temp Sensor 1"
  }
}
```

**Expected Response:**
```
Sensor: "Temp Sensor 1"
Value: 72.5 F
Source: MQTT
Age: 15 seconds
Timestamp: 2025-12-28T15:30:45.123Z
```

## 5. Test with Voice Gateway

1. Start all services:
```bash
# Terminal 1: MQTT Broker
mosquitto -v

# Terminal 2: Z-Wave MCP Server
cd apps/zwave-mcp-server
npm start

# Terminal 3: Voice Gateway
cd apps/voice-gateway-oww
npm run dev
```

2. Ask via voice or text:
```
"What's the temperature of temp sensor 1?"
```

**Expected AI Response:**
```
The temperature of temp sensor 1 is 72.5 degrees Fahrenheit.
```

## 6. Monitor MQTT Traffic

Watch all sensor data:
```bash
mosquitto_sub -h localhost -t "zwave/+/+/sensor_multilevel/+/currentValue" -v
```

Watch specific sensor:
```bash
mosquitto_sub -h localhost -t "zwave/Office/Temp_Sensor_1/sensor_multilevel/+/currentValue" -v
```

## 7. Simulate Sensor Data (For Testing)

```bash
# Temperature sensor
mosquitto_pub -h localhost -t "zwave/Office/Temp_Sensor_1/sensor_multilevel/endpoint_0/currentValue" \
  -m '{"value": 72.5, "unit": "F"}'

# Humidity sensor
mosquitto_pub -h localhost -t "zwave/Living_Room/Humidity_Sensor/sensor_multilevel/endpoint_0/currentValue" \
  -m '{"value": 45, "unit": "%"}'

# Light sensor
mosquitto_pub -h localhost -t "zwave/Bedroom/Light_Sensor/sensor_multilevel/endpoint_0/currentValue" \
  -m '{"value": 250, "unit": "lux"}'
```

## 8. Troubleshooting

### MQTT Connection Failed
```bash
# Check broker is running
mosquitto -v

# Check broker URL in .env
MQTT_BROKER_URL=mqtt://localhost:1883
```

### No Sensor Data Found
```bash
# List all devices to verify sensor name
# In MCP inspector, call:
{
  "name": "list_zwave_devices",
  "arguments": {
    "includeInactive": true
  }
}
```

### Cache Always Empty
```bash
# Verify MQTT subscription
mosquitto_sub -h localhost -t "zwave/#" -v

# Check if Z-Wave JS UI is publishing
# In Z-Wave JS UI web interface, verify MQTT gateway is enabled
```

### API Fallback Not Working
```bash
# Check Z-Wave JS UI is running
curl http://localhost:8091/health

# Verify authentication credentials in .env
ZWAVE_UI_AUTH_ENABLED=true
ZWAVE_UI_USERNAME=admin
ZWAVE_UI_PASSWORD=your_password
```

## 9. Verify MQTT-First Strategy

Test that MQTT cache is checked first:

1. Publish sensor data via MQTT
2. Call `get_device_sensor_data` tool
3. Check response shows `Source: MQTT`

Test API fallback:

1. Stop MQTT broker
2. Call `get_device_sensor_data` tool
3. Check response shows `Source: API`

## 10. Performance Check

Monitor MCP server startup time:
```bash
time npm start
# Should be < 2 seconds with MQTT enabled
```

Check memory usage:
```bash
# After caching 100 sensor values
ps aux | grep "node.*index.js"
# Memory increase should be < 1MB
```

## Next Steps

- Test with real Z-Wave sensor devices
- Integrate with voice-gateway for voice queries
- Monitor cache hit rate in logs
- Adjust cache expiration if needed (default: 5 minutes)

## Resources

- Full documentation: `apps/zwave-mcp-server/README.md`
- Implementation details: `openspec/changes/add-mqtt-sensor-data-fallback/IMPLEMENTATION_SUMMARY.md`
- Task tracking: `openspec/changes/add-mqtt-sensor-data-fallback/tasks.md`
