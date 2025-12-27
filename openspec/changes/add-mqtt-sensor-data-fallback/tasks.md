# Implementation Tasks

## 1. MQTT Client Implementation

- [ ] 1.1 Create mqtt-client.js with MQTTClient class structure
- [ ] 1.2 Implement connect() method with connection retry logic (exponential backoff)
- [ ] 1.3 Subscribe to sensor topics using wildcard pattern: `zwave/+/+/sensor_multilevel/+/currentValue`
- [ ] 1.4 Parse MQTT messages and extract sensor values (handle JSON payload `{"value": 72.5}`)
- [ ] 1.5 Implement in-memory cache using Map (key: deviceName, value: {value, timestamp, commandClass, unit})
- [ ] 1.6 Implement getCachedValue(deviceName) method with staleness check (5 minute timeout)
- [ ] 1.7 Add MQTT connection health check method
- [ ] 1.8 Test: MQTT subscription and caching with mock broker

## 2. MCP Tool: get_device_sensor_data

- [ ] 2.1 Add tool definition to MCP server tools list (name, description, input schema)
- [ ] 2.2 Implement handler: check MQTT cache first if PREFER_MQTT=true
- [ ] 2.3 Implement API fallback: query ZWaveJSUI Socket.IO for sensor value
- [ ] 2.4 Return result with source annotation (MQTT vs API) and timestamp
- [ ] 2.5 Handle errors: device not found, no sensor data available, both sources failed
- [ ] 2.6 Test: Sensor query via MCP tool (voice-gateway calls tool, gets temperature)

## 3. Configuration & Integration

- [ ] 3.1 Add PREFER_MQTT and MQTT_ENABLED to .env.example with documentation
- [ ] 3.2 Initialize MQTT client in MCP server startup (conditionally based on MQTT_ENABLED)
- [ ] 3.3 Add mqtt package to package.json dependencies (`npm install mqtt`)
- [ ] 3.4 Document MQTT vs API strategy in MCP server README
- [ ] 3.5 Test: Configuration-driven behavior (PREFER_MQTT=true/false, MQTT_ENABLED=true/false)

## 4. Testing & Validation

- [ ] 4.1 Unit test: MQTT cache stores and retrieves sensor values correctly
- [ ] 4.2 Integration test: MQTT primary mode - sensor reads from MQTT when available
- [ ] 4.3 Integration test: MQTT fallback - sensor reads from API when MQTT down or cache miss
- [ ] 4.4 Integration test: MQTT disabled - sensor reads from API only (MQTT_ENABLED=false)
- [ ] 4.5 End-to-end test: Voice query "What's the temperature of temp sensor 1?" returns correct value
- [ ] 4.6 Performance test: Verify MQTT subscription doesn't impact MCP server startup time
