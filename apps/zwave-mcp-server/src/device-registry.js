/**
 * Utility for mapping friendly device names to MQTT topics reported by
 * Z-Wave JS UI. Converted from TypeScript to vanilla ESM JavaScript.
 */

/** @typedef {import('./types.js').ZWaveConfig} ZWaveConfig */
/** @typedef {import('./types.js').DeviceRegistry} DeviceRegistry */
/** @typedef {import('./types.js').DeviceRegistryEntry} DeviceRegistryEntry */

export class DeviceRegistryBuilder {
  // Replace human-readable topic scheme with numeric nodeId/commandClass paths for compatibility

  /**
   * Build a registry keyed by friendly device name.
   * @param {ZWaveConfig} zwaveConfig
   * @returns {DeviceRegistry}
   */
  build(zwaveConfig) {
    const registry = {};

    for (const [nodeIdStr, node] of Object.entries(zwaveConfig)) {
      if (!node || typeof node !== 'object') continue;

      const nodeId = Number.parseInt(nodeIdStr, 10);
      const deviceName = node.name || `Node ${nodeId}`;
      const location = node.loc || '';

      const { type, commandClass } = this.detectDeviceType(node);

      registry[deviceName] = {
        nodeId,
        name: deviceName,
        location,
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

  /**
   * Guess the primary device type based on reported command classes.
   * @param {any} node
   * @returns {{ type: DeviceRegistryEntry['type']; commandClass: number }}
   */
  detectDeviceType(node) {
    const values = node && node.values ? Object.values(node.values) : [];
    const commandClasses = new Set();

    for (const raw of values) {
      const cc = Number(raw && raw.commandClass);
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

    const defaultCommandClass = commandClasses.values().next().value;

    return {
      type: 'unknown',
      commandClass: Number.isFinite(defaultCommandClass)
          ? defaultCommandClass
          : 37,
    };
  }

  /**
   * Build control topic using numeric nodeId and commandClass to match Z-Wave JS UI expectations
   * @param {number} nodeId
   * @param {number} commandClass
   * @returns {string}
   */
  buildControlTopic(nodeId, commandClass) {
    return `zwave/${nodeId}/${commandClass}/0/targetValue/set`;
  }

  /**
   * Build state topic using numeric nodeId and commandClass
   * @param {number} nodeId
   * @param {number} commandClass
   * @returns {string}
   */
  buildStateTopic(nodeId, commandClass) {
    return `zwave/${nodeId}/${commandClass}/0/currentValue`;
  }

  // (metadata topic helper intentionally removed — prefer explicit metadata publishing where needed)

  /**
   * Attempt to find a device entry by name.
   * @param {DeviceRegistry} registry
   * @param {string} name
   * @returns {DeviceRegistryEntry | undefined}
   */
  findDeviceByName(registry, name) {
    const lowerName = name.toLowerCase();

    if (registry[name]) {
      return registry[name];
    }

    for (const [deviceName, entry] of Object.entries(registry)) {
      if (deviceName.toLowerCase() === lowerName) {
        return entry;
      }
    }

    for (const [deviceName, entry] of Object.entries(registry)) {
      if (deviceName.toLowerCase().includes(lowerName)) {
        return entry;
      }
    }

    return undefined;
  }
}
