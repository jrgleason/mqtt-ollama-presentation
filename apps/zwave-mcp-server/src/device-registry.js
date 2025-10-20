/**
 * Utility for mapping friendly device names to MQTT topics reported by
 * Z-Wave JS UI. Converted from TypeScript to vanilla ESM JavaScript.
 *
 * IMPORTANT: This uses human-readable topic paths (location/device_name/command_class)
 * that match the Z-Wave JS UI MQTT gateway configuration with nodeNames=true.
 *
 * Example topic: zwave/Demo/Switch_One/switch_binary/endpoint_0/targetValue/set
 * Example payload: {"value": true}
 *
 * DO NOT change back to numeric nodeId/commandClass format - this configuration
 * is tested and working with the current Z-Wave JS UI setup.
 */

/** @typedef {import('./types.js').ZWaveConfig} ZWaveConfig */

/** @typedef {import('./types.js').DeviceRegistry} DeviceRegistry */
/** @typedef {import('./types.js').DeviceRegistryEntry} DeviceRegistryEntry */

export class DeviceRegistryBuilder {
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

            const {type, commandClass} = this.detectDeviceType(node);

            registry[deviceName] = {
                nodeId,
                name: deviceName,
                location,
                topics: {
                    control: this.buildControlTopic(location, deviceName, commandClass),
                    state: this.buildStateTopic(location, deviceName, commandClass),
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
            return {type: 'dimmer', commandClass: 38};
        }

        if (commandClasses.has(37)) {
            return {type: 'switch', commandClass: 37};
        }

        if (commandClasses.has(64)) {
            return {type: 'thermostat', commandClass: 64};
        }

        if (commandClasses.has(49)) {
            return {type: 'sensor', commandClass: 49};
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
     * Sanitize a string for use in MQTT topics.
     * Replaces any character that is not alphanumeric, underscore, or hyphen with underscore.
     * @param {string} str
     * @returns {string}
     */
    sanitizeForTopic(str) {
        if (!str) return '';
        // Replace spaces and any non-alphanumeric characters (except _ and -) with underscore
        return str.replace(/[^a-zA-Z0-9_-]/g, '_');
    }

    /**
     * Map command class number to MQTT topic name
     * @param {number} commandClass
     * @returns {string}
     */
    getCommandClassName(commandClass) {
        const mapping = {
            37: 'switch_binary',
            38: 'switch_multilevel',
            49: 'sensor_multilevel',
            64: 'thermostat_mode',
        };
        return mapping[commandClass] || `cc_${commandClass}`;
    }

    /**
     * Build control topic using location and device name to match Z-Wave JS UI MQTT output.
     * Format: zwave/[location/]device_name/command_class/endpoint_0/targetValue/set
     *
     * @param {string} location - Device location (optional, omitted if empty)
     * @param {string} deviceName - Device name
     * @param {number} commandClass - Z-Wave command class ID
     * @returns {string}
     */
    buildControlTopic(location, deviceName, commandClass) {
        const sanitizedLocation = this.sanitizeForTopic(location);
        const sanitizedName = this.sanitizeForTopic(deviceName);
        const commandClassName = this.getCommandClassName(commandClass);

        // Only include location if it exists
        const locationPart = sanitizedLocation ? `${sanitizedLocation}/` : '';

        return `zwave/${locationPart}${sanitizedName}/${commandClassName}/endpoint_0/targetValue/set`;
    }

    /**
     * Build state topic using location and device name to match Z-Wave JS UI MQTT output.
     * Format: zwave/[location/]device_name/command_class/endpoint_0/currentValue
     *
     * @param {string} location - Device location (optional, omitted if empty)
     * @param {string} deviceName - Device name
     * @param {number} commandClass - Z-Wave command class ID
     * @returns {string}
     */
    buildStateTopic(location, deviceName, commandClass) {
        const sanitizedLocation = this.sanitizeForTopic(location);
        const sanitizedName = this.sanitizeForTopic(deviceName);
        const commandClassName = this.getCommandClassName(commandClass);

        // Only include location if it exists
        const locationPart = sanitizedLocation ? `${sanitizedLocation}/` : '';

        return `zwave/${locationPart}${sanitizedName}/${commandClassName}/endpoint_0/currentValue`;
    }

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
