/**
 * Shared configuration loader for ZWave MCP Server
 * Loads and validates environment variables for ZWave-JS-UI and MQTT connections
 */

/**
 * @typedef {Object} ZWaveConfig
 * @property {string} url - ZWave-JS-UI WebSocket URL
 * @property {string} [username] - Optional username for authentication
 * @property {string} [password] - Optional password for authentication
 * @property {boolean} authEnabled - Whether authentication is enabled
 * @property {number} [socketTimeoutMs] - Optional socket timeout in milliseconds
 */

/**
 * @typedef {Object} MQTTConfig
 * @property {boolean} enabled - Whether MQTT integration is enabled
 * @property {boolean} preferMqtt - Prefer MQTT over API for sensor data reads
 * @property {string} brokerUrl - MQTT broker URL
 * @property {string} [username] - Optional MQTT username
 * @property {string} [password] - Optional MQTT password
 * @property {string} topicPrefix - MQTT topic prefix (default: 'zwave')
 */

/**
 * @typedef {Object} ServerConfig
 * @property {ZWaveConfig} zwave - Z-Wave JS UI configuration
 * @property {MQTTConfig} mqtt - MQTT configuration
 */

/**
 * Load and validate ZWave configuration from environment variables
 * @returns {ZWaveConfig}
 * @throws {Error} If required configuration is missing or invalid
 */
export function getConfig() {
    const url = process.env.ZWAVE_UI_URL;

    if (!url) {
        throw new Error('ZWAVE_UI_URL environment variable is required');
    }

    const authEnabled = process.env.ZWAVE_UI_AUTH_ENABLED === 'true';
    const username = process.env.ZWAVE_UI_USERNAME;
    const password = process.env.ZWAVE_UI_PASSWORD;

    if (authEnabled && (!username || !password)) {
        throw new Error('ZWAVE_UI_AUTH_ENABLED is true but username/password are missing');
    }

    // Parse and validate socket timeout with proper error handling
    let socketTimeoutMs;
    if (process.env.ZWAVE_UI_SOCKET_TIMEOUT_MS !== undefined) {
        socketTimeoutMs = Number.parseInt(process.env.ZWAVE_UI_SOCKET_TIMEOUT_MS, 10);
        if (Number.isNaN(socketTimeoutMs)) {
            throw new Error('ZWAVE_UI_SOCKET_TIMEOUT_MS must be a valid integer');
        }
    } else {
        socketTimeoutMs = undefined;
    }

    return {
        url,
        username,
        password,
        authEnabled,
        socketTimeoutMs,
    };
}

/**
 * Load and validate MQTT configuration from environment variables
 * @returns {MQTTConfig}
 * @throws {Error} If MQTT is enabled but required configuration is missing
 */
export function getMQTTConfig() {
    const enabled = process.env.MQTT_ENABLED !== 'false'; // Default to true
    const preferMqtt = process.env.PREFER_MQTT !== 'false'; // Default to true
    const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
    const username = process.env.MQTT_USERNAME;
    const password = process.env.MQTT_PASSWORD;
    const topicPrefix = process.env.MQTT_TOPIC_PREFIX || 'zwave';

    if (enabled && !brokerUrl) {
        throw new Error('MQTT_ENABLED is true but MQTT_BROKER_URL is missing');
    }

    return {
        enabled,
        preferMqtt,
        brokerUrl,
        username,
        password,
        topicPrefix,
    };
}

/**
 * Load all server configuration
 * @returns {ServerConfig}
 */
export function getServerConfig() {
    return {
        zwave: getConfig(),
        mqtt: getMQTTConfig(),
    };
}

