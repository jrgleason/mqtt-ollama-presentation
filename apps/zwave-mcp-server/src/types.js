/**
 * Shared type documentation for the Z-Wave MCP server.
 * These JSDoc typedefs replace the previous TypeScript interfaces so the
 * rest of the codebase can remain well-documented while running on vanilla JS.
 */

/**
 * @typedef {Object} ZWaveNode
 * @property {number} id
 * @property {string} [name]
 * @property {string} [loc]
 * @property {boolean} [ready]
 * @property {boolean} [available]
 * @property {boolean} [failed]
 * @property {string} [status]
 * @property {number} [lastActive]
 * @property {Record<string, any>} [values]
 * @property {Record<string, any>} [hassDevices]
 */

/**
 * @typedef {Object} DeviceRegistryEntry
 * @property {number} nodeId
 * @property {string} name
 * @property {string} location
 * @property {{ control: string; state: string }} topics
 * @property {'switch' | 'dimmer' | 'thermostat' | 'sensor' | 'unknown'} type
 * @property {number} commandClass
 */

/**
 * @typedef {Record<string, DeviceRegistryEntry>} DeviceRegistry
 */

/**
 * @typedef {Record<string, ZWaveNode>} ZWaveConfig
 */

/**
 * @typedef {Object} MQTTConfig
 * @property {string} brokerUrl
 * @property {string} [username]
 * @property {string} [password]
 */

/**
 * @typedef {Object} ZWaveUIConfig
 * @property {string} url
 * @property {string} [username]
 * @property {string} [password]
 * @property {boolean} authEnabled
 * @property {number} [socketTimeoutMs]
 */

/**
 * @typedef {Object} ToolDeviceSummary
 * @property {string} name
 * @property {number} nodeId
 * @property {string} [location]
 * @property {boolean} available
 * @property {boolean} ready
 * @property {string} [status]
 * @property {string} [lastActiveIso]
 * @property {string} [primaryValueSummary]
 * @property {{ control: string; state: string }} topics
 */

export {};
