# Z-Wave Integration Plan: Real Device Data

**Goal:** Replace mock data with real Z-Wave device data from zwave-js-ui MQTT gateway

**Last Updated:** 2025-10-05

---

## Overview

Instead of using mock data, we'll:
1. Connect to zwave-js-ui MQTT gateway
2. Discover real Z-Wave devices
3. Import them into Prisma database
4. Control them via MQTT
5. Update LangChain tools to use real data

---

## Prerequisites

### Hardware/Software Needed
- [ ] Raspberry Pi with zwave-js-ui installed
- [ ] Z-Wave USB controller (e.g., Aeotec Z-Stick 7)
- [ ] At least 1-2 paired Z-Wave devices (lights, switches)
- [ ] zwave-js-ui accessible on network
- [ ] MQTT gateway enabled in zwave-js-ui

### Network Access
- [ ] zwave-js-ui web UI: `http://<pi-ip>:8091`
- [ ] HiveMQ broker: `mqtt://10.0.0.58:31883`

---

## Step 1: Configure zwave-js-ui MQTT Gateway

### 1.1 Enable MQTT in zwave-js-ui
- [ ] Open zwave-js-ui web interface
- [ ] Go to Settings → MQTT
- [ ] Enable MQTT Gateway
- [ ] Configure broker:
  - Host: `10.0.0.58`
  - Port: `31883`
  - No authentication (for now - TECH DEBT)
- [ ] Set MQTT prefix: `zwave`
- [ ] Enable "Send Z-Wave Events"
- [ ] Save and restart

### 1.2 Enable Named Topics (Recommended)
- [ ] Go to Settings → MQTT → Named Topics
- [ ] Enable Named Topics for friendly device names
- [ ] Topic pattern: `zwave/<location>_<name>/<endpoint>/<commandClass>/<property>`

### 1.3 Verify MQTT Connection
- [ ] Use MQTT Explorer or mosquitto_sub to verify topics:
  ```bash
  mosquitto_sub -h 10.0.0.58 -p 31883 -t 'zwave/#' -v
  ```
- [ ] Should see device state updates

---

## Step 2: Understand zwave-js-ui MQTT Topic Structure

### Topic Patterns

**Device State (Read):**
```
zwave/<DeviceName>/<CommandClass>/<Endpoint>/<Property>
```

**Device Control (Write):**
```
zwave/<DeviceName>/<CommandClass>/<Endpoint>/<Property>/set
```

**Examples:**

| Device Type | State Topic | Control Topic |
|-------------|-------------|---------------|
| Switch | `zwave/Bedroom_Light/37/0/currentValue` | `zwave/Bedroom_Light/37/0/targetValue/set` |
| Dimmer | `zwave/Living_Room_Light/38/0/currentValue` | `zwave/Living_Room_Light/38/0/targetValue/set` |
| Sensor | `zwave/Front_Door_Sensor/48/0/Any` | (read-only) |

**Command Classes:**
- `37` = Binary Switch
- `38` = Multilevel Switch (dimmer)
- `48` = Binary Sensor
- `49` = Multilevel Sensor

### Payload Formats

**Control Payload:**
```json
{"value": true}        // Turn on
{"value": false}       // Turn off
{"value": 50}          // Dim to 50%
```

**State Payload (received):**
```json
{
  "time": 1696512345678,
  "value": true
}
```

### API Commands

**Get All Nodes:**
```
Topic: zwave/_CLIENTS/ZWAVE_GATEWAY-<name>/api/getNodes/set
Payload: {"args": []}
```

**Write Value:**
```
Topic: zwave/_CLIENTS/ZWAVE_GATEWAY-<name>/api/writeValue/set
Payload: {
  "args": [
    {
      "nodeId": 2,
      "commandClass": 38,
      "endpoint": 0,
      "property": "targetValue"
    },
    50
  ]
}
```

---

## Step 3: Create Device Discovery Script

### 3.1 Create Discovery Script: `scripts/discover-zwave-devices.ts`

**Purpose:** Fetch devices from zwave-js-ui and populate Prisma database

```typescript
// scripts/discover-zwave-devices.ts
import mqtt from 'mqtt';
import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();
const MQTT_BROKER = process.env.MQTT_BROKER_URL || 'mqtt://10.0.0.58:31883';
const MQTT_PREFIX = 'zwave';

async function discoverDevices() {
  console.log('🔍 Discovering Z-Wave devices...');

  // Connect to MQTT broker
  const client = mqtt.connect(MQTT_BROKER);

  client.on('connect', () => {
    console.log('✅ Connected to MQTT broker');

    // Request node list from zwave-js-ui API
    const apiTopic = `${MQTT_PREFIX}/_CLIENTS/ZWAVE_GATEWAY-oracle/api/getNodes/set`;
    client.publish(apiTopic, JSON.stringify({ args: [] }));

    // Subscribe to response
    client.subscribe(`${MQTT_PREFIX}/_CLIENTS/ZWAVE_GATEWAY-oracle/api/getNodes`);
  });

  client.on('message', async (topic, message) => {
    if (topic.includes('/getNodes')) {
      const nodes = JSON.parse(message.toString());

      console.log(`📦 Found ${nodes.length} nodes`);

      // Clear existing devices
      await prisma.device.deleteMany();

      // Import each node as a device
      for (const node of nodes) {
        await importNode(node);
      }

      console.log('✅ Import complete');
      client.end();
      await prisma.$disconnect();
    }
  });
}

async function importNode(node: any) {
  // Extract device info from node
  const name = node.name || `Node ${node.id}`;
  const location = node.location || 'Unknown';
  const type = determineDeviceType(node);

  // Find control topics
  const controlTopic = findControlTopic(node);

  await prisma.device.create({
    data: {
      name,
      type,
      location,
      nodeId: node.id,
      mqttTopic: controlTopic,
      state: 'unknown',
      metadata: JSON.stringify({
        deviceClass: node.deviceClass,
        manufacturer: node.manufacturerId,
        product: node.productId,
      }),
    },
  });

  console.log(`  ✅ Imported: ${name} (${type})`);
}

function determineDeviceType(node: any): string {
  // Check command classes to determine type
  const values = node.values || [];

  if (values.some((v: any) => v.commandClass === 38)) return 'dimmer';
  if (values.some((v: any) => v.commandClass === 37)) return 'switch';
  if (values.some((v: any) => v.commandClass === 48)) return 'sensor';

  return 'unknown';
}

function findControlTopic(node: any): string {
  // Find the targetValue topic for this device
  const values = node.values || [];
  const targetValue = values.find((v: any) =>
    v.property === 'targetValue' && (v.commandClass === 37 || v.commandClass === 38)
  );

  if (targetValue) {
    return `zwave/${node.name}/${targetValue.commandClass}/${targetValue.endpoint}/targetValue/set`;
  }

  return '';
}

discoverDevices().catch(console.error);
```

### 3.2 Add Script to package.json

```json
{
  "scripts": {
    "discover:devices": "ts-node scripts/discover-zwave-devices.ts"
  }
}
```

### 3.3 Run Discovery

```bash
npm run discover:devices
```

---

## Step 4: Implement MQTT Client

### 4.1 Create MQTT Client Singleton: `src/lib/mqtt/client.ts`

```typescript
import mqtt, { MqttClient } from 'mqtt';

class MQTTClientSingleton {
  private static instance: MQTTClientSingleton;
  private client: MqttClient | null = null;
  private readonly brokerUrl: string;

  private constructor() {
    this.brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://10.0.0.58:31883';
  }

  public static getInstance(): MQTTClientSingleton {
    if (!MQTTClientSingleton.instance) {
      MQTTClientSingleton.instance = new MQTTClientSingleton();
    }
    return MQTTClientSingleton.instance;
  }

  public async connect(): Promise<MqttClient> {
    if (this.client?.connected) {
      return this.client;
    }

    return new Promise((resolve, reject) => {
      this.client = mqtt.connect(this.brokerUrl, {
        reconnectPeriod: 5000,
      });

      this.client.on('connect', () => {
        console.log('✅ MQTT connected');
        resolve(this.client!);
      });

      this.client.on('error', (err) => {
        console.error('❌ MQTT error:', err);
        reject(err);
      });
    });
  }

  public async publish(topic: string, payload: any): Promise<void> {
    const client = await this.connect();
    return new Promise((resolve, reject) => {
      client.publish(topic, JSON.stringify(payload), (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  public async subscribe(topic: string, callback: (topic: string, message: Buffer) => void): Promise<void> {
    const client = await this.connect();
    client.subscribe(topic);
    client.on('message', callback);
  }
}

export const mqttClient = MQTTClientSingleton.getInstance();
```

### 4.2 Add to .env.local

```
MQTT_BROKER_URL=mqtt://10.0.0.58:31883
```

---

## Step 5: Update LangChain Tools to Use Real Data

### 5.1 Update Device List Tool

**File:** `src/lib/langchain/tools/device-list-tool.ts`

```typescript
import { DynamicTool } from '@langchain/core/tools';
import { prisma } from '@/lib/db/client';

export function createDeviceListTool() {
  return new DynamicTool({
    name: 'list_devices',
    description: `
      Lists all available smart home devices.
      Returns a JSON array of devices with:
      - id: Device unique identifier
      - name: Friendly device name
      - type: Device type (switch, dimmer, sensor)
      - location: Room location
      - state: Current device state

      Use this tool when the user asks what devices are available.
    `,
    func: async () => {
      try {
        // Get real devices from database
        const devices = await prisma.device.findMany();

        if (devices.length === 0) {
          return 'No devices found. Run device discovery first.';
        }

        const deviceList = devices.map(
          (device) =>
            `${device.id}: ${device.name} (${device.type}) in ${device.location || 'unknown location'} - ${device.state}`
        ).join('\n');

        return `Available devices:\n${deviceList}`;
      } catch (error) {
        return `Error listing devices: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
  });
}
```

### 5.2 Update Device Control Tool

**File:** `src/lib/langchain/tools/device-control-tool.ts`

```typescript
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { prisma } from '@/lib/db/client';
import { mqttClient } from '@/lib/mqtt/client';

const DeviceControlSchema = z.object({
  deviceName: z.string().describe("The name of the device to control"),
  action: z.enum(['on', 'off', 'dim']).describe("The action: 'on', 'off', or 'dim'"),
  level: z.number().min(0).max(100).optional().describe("Brightness level 0-100 for dimming")
});

export function createDeviceControlTool() {
  return new DynamicStructuredTool({
    name: 'control_device',
    description: `Controls a smart home device by turning it on/off or dimming it`,
    schema: DeviceControlSchema,
    func: async ({ deviceName, action, level }) => {
      try {
        // Find device in database by name
        const device = await prisma.device.findFirst({
          where: {
            name: {
              contains: deviceName,
              mode: 'insensitive',
            },
          },
        });

        if (!device) {
          return `Error: Device "${deviceName}" not found`;
        }

        if (!device.mqttTopic) {
          return `Error: Device "${device.name}" has no MQTT topic configured`;
        }

        // Determine value to send
        let value: boolean | number;
        if (action === 'on') {
          value = true;
        } else if (action === 'off') {
          value = false;
        } else if (action === 'dim') {
          if (device.type !== 'dimmer') {
            return `Error: ${device.name} is not a dimmer`;
          }
          if (level === undefined) {
            return `Error: Brightness level required for dimming`;
          }
          value = level;
        } else {
          return `Error: Unknown action ${action}`;
        }

        // Publish to MQTT
        await mqttClient.publish(device.mqttTopic, { value });

        // Update database state
        const newState = action === 'dim' ? `${level}%` : action;
        await prisma.device.update({
          where: { id: device.id },
          data: { state: newState },
        });

        return `Successfully ${action === 'dim' ? `dimmed ${device.name} to ${level}%` : `turned ${action} ${device.name}`}`;
      } catch (error) {
        console.error('[device-control-tool] Error:', error);
        return `Error controlling device: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
  });
}
```

---

## Step 6: Subscribe to Device State Updates

### 6.1 Create State Subscriber: `src/lib/mqtt/state-subscriber.ts`

```typescript
import { mqttClient } from './client';
import { prisma } from '@/lib/db/client';

export async function subscribeToDeviceStates() {
  await mqttClient.subscribe('zwave/+/+/+/currentValue', async (topic, message) => {
    try {
      const payload = JSON.parse(message.toString());

      // Parse topic to extract device name
      // Example: zwave/Living_Room_Light/38/0/currentValue
      const parts = topic.split('/');
      const deviceName = parts[1].replace(/_/g, ' ');

      // Update device state in database
      await prisma.device.updateMany({
        where: {
          name: {
            contains: deviceName,
            mode: 'insensitive',
          },
        },
        data: {
          state: payload.value === true ? 'on' : payload.value === false ? 'off' : `${payload.value}%`,
        },
      });

      console.log(`📡 Updated ${deviceName} state:`, payload.value);
    } catch (error) {
      console.error('Error updating device state:', error);
    }
  });
}
```

### 6.2 Initialize in App

**File:** `src/app/layout.tsx` or create an initialization script

```typescript
import { subscribeToDeviceStates } from '@/lib/mqtt/state-subscriber';

// Call this on app startup
subscribeToDeviceStates().catch(console.error);
```

---

## Step 7: Testing Plan

### 7.1 Test Device Discovery
- [ ] Run `npm run discover:devices`
- [ ] Verify devices imported to database:
  ```bash
  sqlite3 prisma/dev.db "SELECT id, name, type, location, mqttTopic FROM Device;"
  ```

### 7.2 Test MQTT Control
- [ ] Use mosquitto_pub to test control:
  ```bash
  mosquitto_pub -h 10.0.0.58 -p 31883 \
    -t 'zwave/Bedroom_Light/37/0/targetValue/set' \
    -m '{"value":true}'
  ```
- [ ] Verify physical device responds

### 7.3 Test LangChain Tools
- [ ] Test list_devices tool returns real devices
- [ ] Test control_device tool:
  - "Turn on the bedroom light"
  - "Dim the living room light to 50%"
  - "Turn off all lights"

### 7.4 Test End-to-End
- [ ] Chat interface → LangChain → Prisma → MQTT → Physical device
- [ ] Verify state updates received
- [ ] Verify database state updated

---

## Step 8: Cleanup Mock Data

### 8.1 Remove Mock Arrays
- [ ] Delete MOCK_DEVICES from device-list-tool.ts
- [ ] Remove mock responses from device-control-tool.ts

### 8.2 Update Seed Script (Optional)
- [ ] Keep seed script for testing without hardware
- [ ] Add flag to skip seeding if real devices exist

---

## Troubleshooting

### Common Issues

**MQTT Connection Fails:**
- Verify HiveMQ broker is running: `curl http://10.0.0.58:30080`
- Check network connectivity to broker
- Verify MQTT_BROKER_URL in .env.local

**No Devices Discovered:**
- Check zwave-js-ui MQTT gateway is enabled
- Verify devices are paired in zwave-js-ui
- Check MQTT topic with `mosquitto_sub -h 10.0.0.58 -p 31883 -t 'zwave/#' -v`

**Device Control Not Working:**
- Verify mqttTopic in database is correct
- Test with mosquitto_pub directly first
- Check zwave-js-ui logs for errors

**State Updates Not Received:**
- Verify subscription topic pattern is correct
- Check if zwave-js-ui publishes currentValue updates
- May need to enable state reporting in zwave-js-ui

---

## Next Steps After Integration

1. **Add Error Handling:**
   - Retry logic for MQTT failures
   - Graceful degradation if MQTT offline
   - User-friendly error messages

2. **Add Device Sync:**
   - Periodic re-discovery to catch new devices
   - Handle device removal/rename

3. **Improve State Management:**
   - Real-time state updates via WebSocket to frontend
   - Device availability tracking

4. **Security:**
   - Enable MQTT authentication
   - Add RBAC to HiveMQ
   - Secure credentials in environment

---

**Status:** Ready to implement
**Estimated Time:** 4-6 hours
**Priority:** 🔴 DEMO CRITICAL
