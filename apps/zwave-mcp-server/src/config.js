/**
 * Shared configuration loader for ZWave MCP Server
 * Loads and validates environment variables for ZWave-JS-UI connection
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

