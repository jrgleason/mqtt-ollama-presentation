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
    constructor() {
        // Track device activity status
        /** @type {Map<string, number>} - Device name -> last seen timestamp (ms) */
        this.deviceLastSeen = new Map();

        // Default activity threshold: 5 minutes
        this.activityThresholdMs = Number(process.env.DEVICE_ACTIVE_THRESHOLD_MS) || (5 * 60 * 1000);
    }

    /**
     * Update the last seen timestamp for a device
     * @param {string} deviceName - The device name
     */
    updateDeviceActivity(deviceName) {
        this.deviceLastSeen.set(deviceName, Date.now());
    }

    /**
     * Check if a device is currently active (seen recently)
     * @param {string} deviceName - The device name
     * @returns {boolean | null} - true if active, false if inactive, null if unknown
     */
    isDeviceActive(deviceName) {
        const lastSeen = this.deviceLastSeen.get(deviceName);
        if (!lastSeen) {
            return null; // Unknown activity status
        }

        const age = Date.now() - lastSeen;
        return age < this.activityThresholdMs;
    }

    /**
     * Get the last seen timestamp for a device
     * @param {string} deviceName - The device name
     * @returns {number | null} - Timestamp in ms, or null if never seen
     */
    getLastSeen(deviceName) {
        return this.deviceLastSeen.get(deviceName) || null;
    }

    /**
     * Get formatted last seen time for display
     * @param {string} deviceName - The device name
     * @returns {string} - Human-readable time string
     */
    getLastSeenFormatted(deviceName) {
        const lastSeen = this.getLastSeen(deviceName);
        if (!lastSeen) {
            return 'Never';
        }

        const ageSeconds = Math.floor((Date.now() - lastSeen) / 1000);

        if (ageSeconds < 60) {
            return `${ageSeconds} seconds ago`;
        } else if (ageSeconds < 3600) {
            const minutes = Math.floor(ageSeconds / 60);
            return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        } else {
            const hours = Math.floor(ageSeconds / 3600);
            return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        }
    }

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

            // Update activity tracking if device is ready/available
            if (node.ready && node.available) {
                this.updateDeviceActivity(deviceName);
            }

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
                lastSeen: this.getLastSeen(deviceName),
                isActive: this.isDeviceActive(deviceName),
            };
        }

        return registry;
    }

    /**
     * Get total count of devices in registry
     * @param {DeviceRegistry} registry
     * @returns {number}
     */
    getDeviceCount(registry) {
        return Object.keys(registry).length;
    }

    /**
     * Get paginated list of devices from registry
     * @param {DeviceRegistry} registry
     * @param {number} [limit=10] - Number of devices to return
     * @param {number} [offset=0] - Number of devices to skip
     * @returns {{ devices: DeviceRegistryEntry[], total: number, showing: number, hasMore: boolean }}
     */
    getDevices(registry, limit = 10, offset = 0) {
        const allDevices = Object.values(registry);
        const total = allDevices.length;

        // Sort devices alphabetically by name
        allDevices.sort((a, b) => a.name.localeCompare(b.name));

        // Apply pagination
        const paginatedDevices = allDevices.slice(offset, offset + limit);

        return {
            devices: paginatedDevices,
            total,
            showing: paginatedDevices.length,
            hasMore: (offset + limit) < total,
        };
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

    /**
     * Find similar device names for suggestions (fuzzy matching)
     * @param {DeviceRegistry} registry
     * @param {string} name - The device name to match
     * @param {number} [maxSuggestions=3] - Maximum number of suggestions to return
     * @returns {string[]} - Array of similar device names
     */
    findSimilarDevices(registry, name, maxSuggestions = 3) {
        const lowerName = name.toLowerCase();
        const allDevices = Object.keys(registry);

        // Calculate simple similarity score based on common substrings
        const scored = allDevices.map(deviceName => {
            const lowerDevice = deviceName.toLowerCase();
            let score = 0;

            // Exact match (shouldn't happen, but just in case)
            if (lowerDevice === lowerName) {
                score = 1000;
            }
            // Contains the search term
            else if (lowerDevice.includes(lowerName)) {
                score = 100 + (50 - Math.abs(lowerDevice.length - lowerName.length));
            }
            // Search term contains device name
            else if (lowerName.includes(lowerDevice)) {
                score = 90 + (50 - Math.abs(lowerDevice.length - lowerName.length));
            }
            // Check for common words
            else {
                const nameWords = lowerName.split(/\s+/);
                const deviceWords = lowerDevice.split(/\s+/);
                const commonWords = nameWords.filter(word => deviceWords.includes(word));
                score = commonWords.length * 20;
            }

            // Levenshtein distance bonus (simple approximation)
            const lengthDiff = Math.abs(lowerDevice.length - lowerName.length);
            if (lengthDiff < 3) {
                score += 10;
            }

            return { deviceName, score };
        });

        // Sort by score (highest first) and return top matches
        return scored
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, maxSuggestions)
            .map(item => item.deviceName);
    }
}
