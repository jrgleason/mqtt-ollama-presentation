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
    const values = node?.values ? Object.values(node.values) : [];
    const commandClasses = new Set<number>();

    for (const value of values) {
      const valueObj = value as any;
      const cc = Number(valueObj?.commandClass);
      if (Number.isFinite(cc)) {
        commandClasses.add(cc);
      }
    }

    if (commandClasses.has(38)) {
      return { type: 'dimmer', commandClass: 38 };
    }

    if (commandClasses.has(37)) {
      return { type: 'switch', commandClass: 37 };
    }

    if (commandClasses.has(64)) {
      return { type: 'thermostat', commandClass: 64 };
    }

    if (commandClasses.has(49)) {
      return { type: 'sensor', commandClass: 49 };
    }

    const defaultCommandClass = commandClasses.values().next().value as number | undefined;

    return {
      type: 'unknown',
      commandClass: Number.isFinite(defaultCommandClass) && defaultCommandClass !== undefined
        ? defaultCommandClass
        : 37,
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
