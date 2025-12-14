# MQTT Client API Documentation

## Overview

The MQTT client (`src/lib/mqtt/client.js`) provides a singleton wrapper around the [mqtt.js library][mqttjs-api] with automatic connection management and full support for all mqtt.js publish options.

**Last Updated:** October 19, 2025

---

## Features

- ✅ **Singleton pattern** - Single shared connection across the application
- ✅ **Auto-connection** - Connects automatically when needed
- ✅ **Auto-reconnection** - Built-in reconnection on connection loss
- ✅ **Full options support** - Preserves all mqtt.js options (retain, dup, properties, etc.)
- ✅ **Message stringification** - Automatically converts objects to JSON
- ✅ **Debug logging** - Comprehensive logging when `LOG_LEVEL=debug`
- ✅ **Wildcard subscriptions** - Support for MQTT wildcards (`+`, `#`)

---

## Installation

The MQTT client is already included in the Oracle module. No additional installation needed.

```javascript
import { mqttClient } from '@/lib/mqtt/client';
```

---

## API Reference

### `publish(topic, message, options)`

Publish a message to an MQTT topic with full options support.

**Parameters:**
- `topic` (string, required) - MQTT topic to publish to
- `message` (string|object, required) - Message payload (objects are automatically stringified)
- `options` (object, optional) - [mqtt.js publish options][mqttjs-api]

**Supported Options:**
- `qos` (0|1|2) - Quality of Service level (default: 0)
- `retain` (boolean) - Retain message on broker (default: false)
- `dup` (boolean) - Mark as duplicate message (default: false)
- `properties` (object) - MQTT 5.0 properties (see below)
- Any other mqtt.js publish options

**MQTT 5.0 Properties:**
- `messageExpiryInterval` (number) - Message expiry in seconds
- `responseTopic` (string) - Topic for response
- `correlationData` (Buffer) - Correlation identifier
- `userProperties` (object) - Custom key-value pairs
- `contentType` (string) - MIME type of payload
- And more... (see [MQTT 5.0 spec][mqtt5-spec])

**Returns:** `Promise<void>` - Resolves when message is published, rejects on error

**Examples:**

```javascript
// Basic publish (QoS 0, no retain)
await mqttClient.publish('home/temperature', '72');

// Publish with retain flag (last value retained for new subscribers)
await mqttClient.publish('home/status', 'online', { retain: true });

// Publish with QoS 1 (at least once delivery)
await mqttClient.publish('home/command', { action: 'on' }, { qos: 1 });

// Publish with QoS 1 + retain (reliable + persistent)
await mqttClient.publish('device/state', { online: true }, {
  qos: 1,
  retain: true
});

// MQTT 5.0 properties
await mqttClient.publish('sensor/data', sensorData, {
  qos: 1,
  properties: {
    messageExpiryInterval: 300, // Expire after 5 minutes
    responseTopic: 'sensor/response',
    userProperties: {
      deviceId: 'sensor-123',
      location: 'living-room'
    }
  }
});
```

---

### `subscribe(topic, callback)`

Subscribe to an MQTT topic and register a callback for incoming messages.

**Parameters:**
- `topic` (string, required) - MQTT topic or pattern (supports wildcards)
- `callback` (function, required) - `(topic, message) => void`

**Returns:** `Promise<void>` - Resolves when subscribed, rejects on error

**Wildcard Support:**
- `+` - Single level wildcard (e.g., `home/+/temperature`)
- `#` - Multi-level wildcard (e.g., `home/#`)

**Examples:**

```javascript
// Subscribe to specific topic
await mqttClient.subscribe('home/temperature', (topic, message) => {
  console.log('Temperature:', message.toString());
});

// Subscribe with wildcard (all rooms)
await mqttClient.subscribe('home/+/temperature', (topic, message) => {
  const room = topic.split('/')[1];
  console.log(`${room} temperature:`, message.toString());
});

// Subscribe to all topics under home/
await mqttClient.subscribe('home/#', (topic, message) => {
  console.log('Received:', topic, message.toString());
});

// Parse JSON messages
await mqttClient.subscribe('device/state', (topic, message) => {
  try {
    const state = JSON.parse(message.toString());
    console.log('Device state:', state);
  } catch (err) {
    console.error('Failed to parse message:', err);
  }
});
```

---

### `unsubscribe(topic, callback)`

Unsubscribe from an MQTT topic.

**Parameters:**
- `topic` (string, required) - MQTT topic to unsubscribe from
- `callback` (function, optional) - Specific callback to remove (if omitted, removes all callbacks)

**Returns:** `Promise<void>` - Resolves when unsubscribed, rejects on error

**Examples:**

```javascript
// Unsubscribe from topic (removes all callbacks)
await mqttClient.unsubscribe('home/temperature');

// Unsubscribe specific callback
const handler = (topic, msg) => console.log(msg.toString());
await mqttClient.subscribe('home/temp', handler);
// Later...
await mqttClient.unsubscribe('home/temp', handler);
```

---

### `isConnected()`

Check if the client is currently connected to the broker.

**Returns:** `boolean` - `true` if connected, `false` otherwise

**Example:**

```javascript
if (mqttClient.isConnected()) {
  console.log('MQTT client is connected');
} else {
  console.log('MQTT client is not connected');
}
```

---

### `disconnect()`

Disconnect from the MQTT broker.

**Returns:** `Promise<void>` - Resolves when disconnected

**Example:**

```javascript
await mqttClient.disconnect();
console.log('Disconnected from MQTT broker');
```

---

## Z-Wave Helper Functions

Convenience functions for controlling Z-Wave devices via MQTT.

### `publishDeviceCommand(deviceName, commandClass, endpoint, property, value)`

Publish a command to a Z-Wave device.

**Parameters:**
- `deviceName` (string) - Name of the Z-Wave device
- `commandClass` (number) - Z-Wave command class (e.g., 37 for binary switch)
- `endpoint` (number) - Endpoint number (usually 0)
- `property` (string) - Property to set (e.g., 'targetValue')
- `value` (any) - Value to set

**Example:**

```javascript
import { publishDeviceCommand } from '@/lib/mqtt/client';

// Turn on binary switch
await publishDeviceCommand('Living_Room_Light', 37, 0, 'targetValue', true);

// Set dimmer level
await publishDeviceCommand('Kitchen_Light', 38, 0, 'targetValue', 75);
```

---

### `controlBinarySwitch(deviceName, state)`

Control a binary (on/off) switch.

**Parameters:**
- `deviceName` (string) - Name of the Z-Wave device
- `state` (boolean) - `true` for on, `false` for off

**Example:**

```javascript
import { controlBinarySwitch } from '@/lib/mqtt/client';

// Turn on
await controlBinarySwitch('Living_Room_Light', true);

// Turn off
await controlBinarySwitch('Living_Room_Light', false);
```

---

### `controlMultilevelSwitch(deviceName, level)`

Control a multilevel (dimmer) switch.

**Parameters:**
- `deviceName` (string) - Name of the Z-Wave device
- `level` (number) - Brightness level (0-99)

**Example:**

```javascript
import { controlMultilevelSwitch } from '@/lib/mqtt/client';

// Set to 50% brightness
await controlMultilevelSwitch('Kitchen_Light', 50);

// Set to full brightness
await controlMultilevelSwitch('Kitchen_Light', 99);

// Turn off
await controlMultilevelSwitch('Kitchen_Light', 0);
```

---

### `subscribeToDeviceState(deviceName, callback)`

Subscribe to state updates for a Z-Wave device.

**Parameters:**
- `deviceName` (string) - Name of the Z-Wave device
- `callback` (function) - `(payload, topic) => void`

**Example:**

```javascript
import { subscribeToDeviceState } from '@/lib/mqtt/client';

await subscribeToDeviceState('Living_Room_Light', (payload, topic) => {
  console.log('Device update:', payload);
  // payload might be: { value: true, time: 1234567890 }
});
```

---

## Configuration

### Environment Variables

```bash
# MQTT Broker URL
MQTT_BROKER_URL=mqtt://localhost:1883

# Optional authentication
MQTT_USERNAME=user
MQTT_PASSWORD=pass

# Enable debug logging
LOG_LEVEL=debug  # or 'info' for production
```

### Connection Options

The client uses these default connection options:

```javascript
{
  clientId: 'oracle-{random}',  // Auto-generated unique ID
  clean: true,                   // Clean session
  reconnectPeriod: 5000,        // Reconnect every 5 seconds
  connectTimeout: 30000,        // 30 second timeout
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD
}
```

---

## Best Practices

### 1. Use Retain for Device State

When publishing device state, use the `retain` flag so new subscribers get the last known state:

```javascript
// ✅ Good - New subscribers get current state
await mqttClient.publish('device/state', { online: true }, { retain: true });

// ❌ Bad - New subscribers miss the state
await mqttClient.publish('device/state', { online: true });
```

See [MQTT Retain Messages][mqtt-retain] for more details.

### 2. Use QoS 1 for Important Commands

For critical commands, use QoS 1 to ensure at-least-once delivery:

```javascript
// ✅ Good - Important command with delivery guarantee
await mqttClient.publish('alarm/arm', { armed: true }, { qos: 1 });

// ⚠️ Acceptable - Non-critical telemetry can use QoS 0
await mqttClient.publish('sensor/temperature', '72');
```

See [MQTT Quality of Service][mqtt-qos] for more details.

### 3. Always Handle Errors

```javascript
try {
  await mqttClient.publish('device/command', { action: 'on' });
} catch (error) {
  console.error('Failed to publish command:', error);
  // Handle error (retry, notify user, etc.)
}
```

### 4. Parse JSON Messages Safely

```javascript
await mqttClient.subscribe('device/data', (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    // Process data
  } catch (err) {
    console.error('Invalid JSON:', message.toString());
  }
});
```

### 5. Use Debug Logging During Development

```bash
# Enable verbose MQTT logging
LOG_LEVEL=debug npm run dev

# You'll see:
# [MQTT] publish() called { topic: '...', message: '...' }
# [MQTT] About to publish: { topic: '...', payload: '...' }
# [MQTT] ✅ Publish SUCCESS
```

---

## Common Patterns

### Device Control Pattern

```javascript
import { controlBinarySwitch } from '@/lib/mqtt/client';

async function handleLightCommand(deviceName, action) {
  try {
    await controlBinarySwitch(deviceName, action === 'on');
    return { success: true, message: `Light ${action}` };
  } catch (error) {
    console.error('Device control failed:', error);
    return { success: false, error: error.message };
  }
}
```

### State Synchronization Pattern

```javascript
import { mqttClient } from '@/lib/mqtt/client';

// Publish state changes with retain
async function updateDeviceState(deviceId, state) {
  await mqttClient.publish(
    `device/${deviceId}/state`,
    JSON.stringify(state),
    { retain: true, qos: 1 }
  );
}

// Subscribe to state changes
await mqttClient.subscribe('device/+/state', (topic, message) => {
  const deviceId = topic.split('/')[1];
  const state = JSON.parse(message.toString());
  updateUI(deviceId, state);
});
```

### Request-Response Pattern (MQTT 5.0)

```javascript
import { mqttClient } from '@/lib/mqtt/client';

// Send request with response topic
async function sendRequest(requestData) {
  const correlationId = crypto.randomUUID();
  const responseTopic = `response/${correlationId}`;

  // Subscribe to response
  const responsePromise = new Promise((resolve) => {
    mqttClient.subscribe(responseTopic, (topic, message) => {
      resolve(JSON.parse(message.toString()));
      mqttClient.unsubscribe(responseTopic);
    });
  });

  // Publish request
  await mqttClient.publish('request/topic', requestData, {
    qos: 1,
    properties: {
      responseTopic,
      correlationData: Buffer.from(correlationId)
    }
  });

  return responsePromise;
}
```

---

## Testing

The MQTT client has comprehensive unit tests in `src/lib/mqtt/__tests__/client.test.js`.

### Running Tests

```bash
# Run all tests
npm test

# Run MQTT client tests only
npm test -- src/lib/mqtt/__tests__/client.test.js

# Run with coverage
npm test:coverage
```

### Test Coverage

- ✅ Options preservation (retain, qos, dup, properties)
- ✅ Default options behavior
- ✅ MQTT 5.0 properties support
- ✅ Auto-connection behavior
- ✅ Error handling
- ✅ Message stringification
- ✅ Edge cases (falsy values, empty options, etc.)

---

## Troubleshooting

### Connection Issues

```bash
# 1. Verify MQTT broker is running
nc -zv localhost 1883

# 2. Check environment variables
echo $MQTT_BROKER_URL

# 3. Enable debug logging
LOG_LEVEL=debug npm run dev

# 4. Test with mosquitto_pub/sub
mosquitto_pub -h localhost -t test/topic -m "hello"
mosquitto_sub -h localhost -t test/topic
```

### Publish Not Working

1. Check if client is connected: `mqttClient.isConnected()`
2. Enable debug logging to see full publish details
3. Verify topic format matches broker configuration
4. Check QoS level and broker QoS limits
5. Verify retain permissions on broker

### Messages Not Received

1. Verify subscription topic and wildcards are correct
2. Check if topic matches published topic exactly
3. Enable debug logging to see incoming messages
4. Test with mosquitto_sub to isolate issue

---

## Migration Guide

### From Direct mqtt.js Usage

**Before:**
```javascript
import mqtt from 'mqtt';

const client = mqtt.connect('mqtt://localhost:1883');
client.on('connect', () => {
  client.publish('topic', 'message', { qos: 1 });
});
```

**After:**
```javascript
import { mqttClient } from '@/lib/mqtt/client';

// Auto-connects when needed
await mqttClient.publish('topic', 'message', { qos: 1 });
```

### From Old MQTT Client (if options weren't preserved)

The new client preserves ALL options, so you can now safely use:

```javascript
// Now works! Previously these would be dropped
await mqttClient.publish('topic', 'message', {
  qos: 1,
  retain: true,
  properties: { messageExpiryInterval: 60 }
});
```

---

## Changelog

### October 19, 2025
- ✅ **BREAKING FIX:** Preserve all mqtt.js options (retain, dup, properties, etc.)
- ✅ Added comprehensive test suite (13 test cases)
- ✅ Updated Jest configuration for ES modules support
- ✅ Improved API documentation

### Previous
- Initial implementation with basic QoS support

---

## References

- [mqtt.js Documentation][mqttjs-api]
- [MQTT 5.0 Specification][mqtt5-spec]
- [MQTT Quality of Service][mqtt-qos]
- [MQTT Retain Messages][mqtt-retain]

---

## Support

For issues or questions:
- Check the troubleshooting section above
- Review the test suite for usage examples
- See [project guidelines][claude-md] for development standards
- Create an issue in the project repository

---

<!-- Reference Links -->
[mqttjs-api]: https://github.com/mqttjs/MQTT.js#api
[mqtt5-spec]: https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html
[mqtt-qos]: https://www.hivemq.com/blog/mqtt-essentials-part-6-mqtt-quality-of-service-levels/
[mqtt-retain]: https://www.hivemq.com/blog/mqtt-essentials-part-8-retained-messages/
[claude-md]: ../../../CLAUDE.md
