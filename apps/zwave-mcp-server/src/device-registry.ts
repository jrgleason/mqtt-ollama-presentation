// Device Registry: Maps friendly names to MQTT topics
import { ZWaveConfig, DeviceRegistry, DeviceRegistryEntry } from './types.js';

export class DeviceRegistryBuilder {
  build(zwaveConfig: ZWaveConfig): DeviceRegistry {
    const registry: DeviceRegistry = {};

    for (const [nodeIdStr, node] of Object.entries(zwaveConfig)) {
      if (!node || typeof node !== 'object') continue;

      const nodeId = parseInt(nodeIdStr);
      const deviceName = node.name || `Node ${nodeId}`;

      // Detect device type and command class
      const { type, commandClass } = this.detectDeviceType(node);

      registry[deviceName] = {
        nodeId,
        name: deviceName,
        location: node.loc || '',
        topics: {
          control: this.buildControlTopic(nodeId, commandClass),
          state: this.buildStateTopic(nodeId, commandClass),
        },
        type,
        commandClass,
      };
    }

    return registry;
  }

  private detectDeviceType(node: any): { type: DeviceRegistryEntry['type']; commandClass: number } {
    // This is a simplified detection - in reality, you'd inspect node.values or node.commandClasses
    // For now, we'll default to switch (command class 38)

    // Common Z-Wave command classes:
    // 37 = Binary Switch (on/off)
    // 38 = Multilevel Switch (dimmable)
    // 64 = Thermostat
    // 49 = Sensor Multilevel

    // You would inspect the node object to determine actual command class
    // For now, default to Binary Switch
    return {
      type: 'switch',
      commandClass: 37,
    };
  }

  private buildControlTopic(nodeId: number, commandClass: number): string {
    // Z-Wave JS UI MQTT topic format:
    // zwave/<nodeId>/<commandClass>/<endpoint>/<property>/set
    return `zwave/${nodeId}/${commandClass}/0/targetValue/set`;
  }

  private buildStateTopic(nodeId: number, commandClass: number): string {
    // Z-Wave JS UI MQTT topic format:
    // zwave/<nodeId>/<commandClass>/<endpoint>/<property>
    return `zwave/${nodeId}/${commandClass}/0/currentValue`;
  }

  findDeviceByName(registry: DeviceRegistry, name: string): DeviceRegistryEntry | undefined {
    // Case-insensitive search
    const lowerName = name.toLowerCase();

    // Exact match first
    if (registry[name]) {
      return registry[name];
    }

    // Case-insensitive match
    for (const [deviceName, entry] of Object.entries(registry)) {
      if (deviceName.toLowerCase() === lowerName) {
        return entry;
      }
    }

    // Partial match
    for (const [deviceName, entry] of Object.entries(registry)) {
      if (deviceName.toLowerCase().includes(lowerName)) {
        return entry;
      }
    }

    return undefined;
  }
}
