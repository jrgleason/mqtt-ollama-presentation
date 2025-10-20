# Database Purpose and Alternatives

## The Question: Why Do We Need a Database?

**Short Answer:** You probably **DON'T need a database** for your presentation!

---

## What the Database is Currently For

Looking at your Prisma schema (`apps/oracle/prisma/schema.prisma`), the database stores:

```prisma
model Device {
  id          String   // Unique ID
  name        String   // "Living Room Light"
  type        String   // "switch", "dimmer", "sensor"
  location    String?  // "living room", "bedroom"
  nodeId      Int?     // Z-Wave node ID
  mqttTopic   String?  // "zwave/living-room-light/set"
  state       String?  // "on", "off", "50%"
  metadata    String?  // JSON for extra properties
}
```

### Current Usage:

**In LangChain Tools:**

```typescript
// device-list-tool.ts
const devices = await prisma.device.findMany({
  where: { location: 'living room' }
});
```

**Problem:** This assumes you manually added devices to the database!

---

## The Real Question: Where Do Devices Come From?

### Option 1: Manual Database Entry (Current Approach)

```bash
# You run seed script
npm run db:seed

# This creates mock devices:
- Living Room Light
- Bedroom Light
- Kitchen Light
- Front Door Sensor
```

**Issues:**

- ❌ Devices are hardcoded
- ❌ Out of sync with real Z-Wave devices
- ❌ Manual maintenance nightmare
- ❌ Doesn't scale for demo

### Option 2: zwave-js-ui Auto-Discovery (Recommended!)

**How it works:**

```
1. zwave-js-ui detects Z-Wave devices
   ↓
2. Publishes MQTT discovery messages
   Topic: homeassistant/+/+/config
   ↓
3. Your app subscribes to discovery topic
   ↓
4. App builds device list from MQTT messages
   ↓
5. No database needed!
```

**Example Discovery Message from zwave-js-ui:**

```json
Topic: homeassistant/light/zwave_node_2/config
Payload: {
  "name": "Living Room Light",
  "unique_id": "zwave_node_2_dimmer",
  "device": {
    "identifiers": ["zwave_node_2"],
    "name": "Living Room Dimmer",
    "model": "ZW096",
    "manufacturer": "Aeotec"
  },
  "command_topic": "zwave/livingroom/dimmer/set",
  "state_topic": "zwave/livingroom/dimmer/state",
  "brightness_command_topic": "zwave/livingroom/dimmer/brightness/set",
  "brightness_state_topic": "zwave/livingroom/dimmer/brightness/state",
  "availability_topic": "zwave/status"
}
```

---

## Recommended Architecture: No Database Needed!

### For Your Presentation Demo

**Instead of using a database, build device list from MQTT:**

```javascript
// In-memory device cache
const deviceCache = new Map();

// Subscribe to zwave-js-ui discovery
mqttClient.subscribe('homeassistant/+/+/config');

mqttClient.on('message', (topic, payload) => {
  if (topic.startsWith('homeassistant/')) {
    const device = JSON.parse(payload.toString());

    // Cache device info
    deviceCache.set(device.unique_id, {
      id: device.unique_id,
      name: device.name,
      type: extractType(topic), // 'light', 'switch', 'sensor'
      location: extractLocation(device.name), // parse from name
      commandTopic: device.command_topic,
      stateTopic: device.state_topic
    });
  }
});

// LangChain tool - no database!
export const listDevicesTool = new DynamicTool({
  name: 'list_devices',
  description: 'Lists all available devices',
  func: async () => {
    const devices = Array.from(deviceCache.values());
    return JSON.stringify(devices);
  }
});
```

**Benefits:**

- ✅ No database needed
- ✅ Always in sync with real devices
- ✅ Discovers new devices automatically
- ✅ Simpler architecture
- ✅ Better for live demo

---

## When You WOULD Need a Database

### Use Cases That Require Persistence:

1. **User Preferences**
    - Custom device names ("Bedroom Light" → "Reading Light")
    - Favorite scenes
    - Personality settings

2. **Conversation History**
    - "What did I ask you 5 minutes ago?"
    - Analytics on command usage

3. **Automation Rules**
    - "Turn on lights every day at 6pm"
    - Complex schedules

4. **Multi-User Support**
    - Different users with different permissions
    - User-specific device groups

### For Your Presentation:

**Do you need any of these?**

- ❓ Custom device names? → Probably not
- ❓ Conversation history? → Probably not
- ❓ Automation rules? → Probably not
- ❓ Multi-user? → Definitely not

**Conclusion:** You probably don't need a database!

---

## Recommended Approach for Your Presentation

### Phase 1: Remove Database (Simplify)

**1. Remove Prisma completely:**

```bash
cd apps/oracle
npm uninstall @prisma/client prisma
rm -rf prisma/
rm -rf src/generated/prisma/
```

**2. Update LangChain tools to use MQTT discovery:**

**File:** `apps/oracle/src/lib/mqtt/device-cache.ts`

```typescript
import { EventEmitter } from 'events';

interface Device {
  id: string;
  name: string;
  type: 'light' | 'switch' | 'sensor';
  location?: string;
  commandTopic: string;
  stateTopic: string;
  state?: string;
}

class DeviceCache extends EventEmitter {
  private devices: Map<string, Device> = new Map();

  add(device: Device) {
    this.devices.set(device.id, device);
    this.emit('device:added', device);
  }

  getAll(): Device[] {
    return Array.from(this.devices.values());
  }

  getByLocation(location: string): Device[] {
    return this.getAll().filter(d =>
      d.location?.toLowerCase() === location.toLowerCase()
    );
  }

  updateState(id: string, state: string) {
    const device = this.devices.get(id);
    if (device) {
      device.state = state;
      this.emit('device:updated', device);
    }
  }
}

export const deviceCache = new DeviceCache();
```

**File:** `apps/oracle/src/lib/mqtt/discovery-handler.ts`

```typescript
import { MqttClient } from 'mqtt';
import { deviceCache } from './device-cache';

export function setupDiscoveryHandler(client: MqttClient) {
  // Subscribe to zwave-js-ui discovery
  client.subscribe('homeassistant/+/+/config');

  // Subscribe to state updates
  client.subscribe('zwave/+/+/+/state');

  client.on('message', (topic, payload) => {
    if (topic.startsWith('homeassistant/')) {
      handleDiscovery(topic, payload);
    } else if (topic.includes('/state')) {
      handleStateUpdate(topic, payload);
    }
  });
}

function handleDiscovery(topic: string, payload: Buffer) {
  try {
    const config = JSON.parse(payload.toString());

    // Extract device type from topic
    // homeassistant/light/zwave_node_2/config → 'light'
    const parts = topic.split('/');
    const type = parts[1] as 'light' | 'switch' | 'sensor';

    // Parse location from name
    // "Living Room Light" → "living room"
    const location = extractLocation(config.name);

    deviceCache.add({
      id: config.unique_id,
      name: config.name,
      type,
      location,
      commandTopic: config.command_topic,
      stateTopic: config.state_topic,
      state: 'unknown'
    });

    console.log('✅ Discovered device:', config.name);
  } catch (error) {
    console.error('❌ Failed to parse discovery message:', error);
  }
}

function handleStateUpdate(topic: string, payload: Buffer) {
  // Extract device ID from topic
  // zwave/livingroom/dimmer/state → find matching device
  const state = payload.toString();

  // Update cache
  // (implementation depends on your topic structure)
}

function extractLocation(name: string): string | undefined {
  const lower = name.toLowerCase();

  // Common patterns
  if (lower.includes('living room')) return 'living room';
  if (lower.includes('bedroom')) return 'bedroom';
  if (lower.includes('kitchen')) return 'kitchen';
  if (lower.includes('bathroom')) return 'bathroom';

  // Parse "Location + Device" pattern
  // "Living Room Light" → "living room"
  const match = name.match(/^(.+?)\s+(light|switch|sensor|dimmer)/i);
  return match ? match[1].toLowerCase() : undefined;
}
```

**3. Update LangChain tools:**

**File:** `apps/oracle/src/lib/langchain/tools/device-list-tool.ts`

```typescript
import { DynamicTool } from '@langchain/core/tools';
import { deviceCache } from '../../mqtt/device-cache';

export function createDeviceListTool() {
  return new DynamicTool({
    name: 'list_devices',
    description: 'Lists all available smart home devices from MQTT discovery',
    func: async () => {
      const devices = deviceCache.getAll();

      if (devices.length === 0) {
        return 'No devices discovered yet. Make sure zwave-js-ui is running with MQTT discovery enabled.';
      }

      const deviceList = devices.map(d =>
        `ID: ${d.id}, Name: ${d.name}, Type: ${d.type}, Location: ${d.location || 'unknown'}, State: ${d.state || 'unknown'}`
      ).join('\n');

      return `Available devices (${devices.length} total):\n${deviceList}`;
    }
  });
}
```

**File:** `apps/oracle/src/lib/langchain/tools/device-control-tool.ts`

```typescript
import { DynamicTool } from '@langchain/core/tools';
import { deviceCache } from '../../mqtt/device-cache';
import { mqttClient } from '../../mqtt/client';

export function createDeviceControlTool() {
  return new DynamicTool({
    name: 'control_device',
    description: 'Controls a smart home device. Input: { deviceId: string, command: "on" | "off" | number }',
    func: async (input: string) => {
      const { deviceId, command } = JSON.parse(input);

      const device = deviceCache.getAll().find(d => d.id === deviceId);
      if (!device) {
        return `Device ${deviceId} not found`;
      }

      // Publish MQTT command
      mqttClient.publish(device.commandTopic, command.toString());

      return `Sent ${command} to ${device.name}`;
    }
  });
}
```

---

## Migration Steps

### If You Want to Remove the Database:

1. **Backup current code** (just in case)
   ```bash
   git commit -am "Before removing database"
   ```

2. **Remove Prisma:**
   ```bash
   cd apps/oracle
   npm uninstall @prisma/client prisma
   rm -rf prisma/
   rm -rf src/generated/prisma/
   ```

3. **Create MQTT device cache** (code above)

4. **Update LangChain tools** to use cache instead of Prisma

5. **Update environment variables:**
   ```bash
   # Remove from .env.local
   DATABASE_URL=...

   # Add if needed
   MQTT_DISCOVERY_PREFIX=homeassistant
   ```

6. **Test with zwave-js-ui:**
   ```bash
   # Start zwave-js-ui
   docker-compose up zwave-js-ui

   # Enable MQTT Discovery in zwave-js-ui settings
   # Start your Oracle app
   npm run dev

   # Check if devices are discovered
   # Look for console logs: "✅ Discovered device: ..."
   ```

---

## Alternative: Keep Database for Demo Safety

### If You're Worried About Live Demo Reliability:

**Hybrid Approach:**

1. Use **in-memory cache** as primary source (MQTT discovery)
2. Keep **SQLite database** as backup with seed data
3. If MQTT discovery fails during demo, fall back to database

**Implementation:**

```typescript
export function createDeviceListTool() {
  return new DynamicTool({
    name: 'list_devices',
    func: async () => {
      // Try MQTT cache first
      let devices = deviceCache.getAll();

      // Fallback to database if cache is empty
      if (devices.length === 0) {
        console.warn('⚠️ No devices in cache, falling back to database');
        devices = await prisma.device.findMany();
      }

      return formatDevices(devices);
    }
  });
}
```

**Benefits:**

- ✅ Real devices when available (MQTT)
- ✅ Mock devices as backup (database)
- ✅ Demo can't fail due to discovery issues

---

## Recommendation

### For Your January 12, 2026 Presentation:

**Option A: Remove Database** ✅ (Recommended if you have real Z-Wave devices)

- Simpler architecture
- Shows real-world approach
- Better story for presentation

**Option B: Keep Database as Backup** ⚠️ (Safer for demo)

- Use MQTT discovery when available
- Fall back to mock devices if needed
- More complex but more reliable

**Option C: Pure Mock Devices** ❌ (Not recommended)

- Keep database, skip MQTT discovery
- Simpler but not realistic
- Less impressive demo

### My Recommendation: **Option A**

Use MQTT discovery with real or simulated Z-Wave devices. It's the cleanest architecture and makes for a better
presentation story.

If you're worried about demo reliability, add a backup plan:

- Have mock devices ready in code (not database)
- If MQTT fails, switch to mock mode
- Takes 5 minutes to add safety switch

---

## Summary

**Current State:**

- ✅ You have Prisma database with mock devices
- ❌ Database is disconnected from real devices
- ❌ Manual maintenance required

**Recommended State:**

- ✅ Use MQTT discovery from zwave-js-ui
- ✅ In-memory device cache
- ✅ No database needed
- ✅ Devices automatically discovered

**When to Keep Database:**

- ⏸️ If you need user preferences
- ⏸️ If you need conversation history
- ⏸️ If you need automation rules
- ✅ If you want backup mock devices for demo safety

For a **one-hour presentation** showing **home automation**, you probably don't need persistent storage at all!
