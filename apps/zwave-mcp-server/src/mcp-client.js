/**
 * Shared MCP Client for ZWave-JS-UI
 *
 * This client can be used by any application to communicate with the zwave-mcp-server.
 * It handles spawning the server process and communicating via JSON-RPC over stdio.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @typedef {{name: string, nodeId: number, location?: string, available: boolean, ready: boolean, topics: {control: string, state: string}}} Device */

export class MCPZWaveClient {
  constructor() {
    this.serverProcess = null;
    this.messageId = 0;
    this.pendingRequests = new Map();
    this.isReady = false;
  }

  /**
   * Start the MCP server process
   * @returns {Promise<void>}
   */
  async start() {
    if (this.serverProcess) {
      console.debug('MCP server already running');
      return;
    }

    // Path to zwave-mcp-server index.js (same directory as this file)
    const serverPath = path.resolve(__dirname, 'index.js');

    console.log('🚀 Starting ZWave MCP server', { serverPath });

    this.serverProcess = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
      }
    });

    // Handle stdout (MCP protocol messages)
    this.serverProcess.stdout.on('data', (data) => {
      this.handleServerMessage(data);
    });

    // Handle stderr (logs)
    this.serverProcess.stderr.on('data', (data) => {
      console.error('MCP server log:', data.toString().trim());
    });

    // Handle process exit
    this.serverProcess.on('exit', (code, signal) => {
      console.warn('MCP server exited', { code, signal });
      this.serverProcess = null;
      this.isReady = false;
      this.pendingRequests.forEach((_, id) => {
        const req = this.pendingRequests.get(id);
        if (req) req.reject(new Error('MCP server exited unexpectedly'));
      });
      this.pendingRequests.clear();
    });

    // Wait for server to be ready
    await this.initialize();
  }

  /**
   * Initialize MCP connection
   * @returns {Promise<void>}
   */
  async initialize() {
    const initMessage = {
      jsonrpc: '2.0',
      id: this.messageId++,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'zwave-mcp-client',
          version: '1.0.0'
        }
      }
    };

    try {
      await this.sendRequest(initMessage);

      // Send initialized notification
      this.sendNotification({
        jsonrpc: '2.0',
        method: 'notifications/initialized'
      });

      this.isReady = true;
      console.log('✅ MCP server initialized');
    } catch (error) {
      console.error('❌ Failed to initialize MCP server:', error.message);
      throw error;
    }
  }

  /**
   * Handle messages from the MCP server
   * @param {Buffer} data
   */
  handleServerMessage(data) {
    const messages = data.toString().trim().split('\n');

    for (const line of messages) {
      if (!line.trim()) continue;

      try {
        const message = JSON.parse(line);

        if (message.id !== undefined && this.pendingRequests.has(message.id)) {
          const { resolve, reject } = this.pendingRequests.get(message.id);
          this.pendingRequests.delete(message.id);

          if (message.error) {
            reject(new Error(message.error.message || 'MCP request failed'));
          } else {
            resolve(message.result);
          }
        }
      } catch (error) {
        console.error('Failed to parse MCP message:', error.message);
      }
    }
  }

  /**
   * Send a request to the MCP server
   * @param {Object} message
   * @returns {Promise<any>}
   */
  sendRequest(message) {
    return new Promise((resolve, reject) => {
      if (!this.serverProcess) {
        return reject(new Error('MCP server not running'));
      }

      this.pendingRequests.set(message.id, { resolve, reject });

      const data = JSON.stringify(message) + '\n';
      this.serverProcess.stdin.write(data);

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(message.id)) {
          this.pendingRequests.delete(message.id);
          reject(new Error('MCP request timeout'));
        }
      }, 10000);
    });
  }

  /**
   * Send a notification to the MCP server (no response expected)
   * @param {Object} message
   */
  sendNotification(message) {
    if (!this.serverProcess) {
      throw new Error('MCP server not running');
    }
    const data = JSON.stringify(message) + '\n';
    this.serverProcess.stdin.write(data);
  }

  /**
   * Get list of all Z-Wave devices
   * @returns {Promise<Device[]>}
   */
  async listDevices() {
    if (!this.isReady) {
      await this.start();
    }

    const message = {
      jsonrpc: '2.0',
      id: this.messageId++,
      method: 'tools/call',
      params: {
        name: 'list_zwave_devices',
        arguments: {
          includeInactive: true  // Include all devices, not just active ones
        }
      }
    };

    try {
      console.debug('📡 Requesting device list from MCP server');
      const result = await this.sendRequest(message);

      // Parse the result content
      const content = result.content?.[0]?.text;
      if (!content) {
        console.warn('No content in MCP response');
        return [];
      }

      const devices = JSON.parse(content);
      console.debug(`✅ Received ${devices.length} devices from MCP server`);

      return devices;
    } catch (error) {
      console.error('❌ Failed to list devices:', error.message);
      throw error;
    }
  }

  /**
   * Control a Z-Wave device
   * @param {string} deviceName - Name of the device
   * @param {'on'|'off'|'dim'} action - Action to perform
   * @param {number} [level] - Brightness level for dim action (0-100)
   * @returns {Promise<string>} - Result message
   */
  async controlDevice(deviceName, action, level) {
    if (!this.isReady) {
      await this.start();
    }

    const args = { deviceName, action };
    if (level !== undefined) {
      args.level = level;
    }

    const message = {
      jsonrpc: '2.0',
      id: this.messageId++,
      method: 'tools/call',
      params: {
        name: 'control_zwave_device',
        arguments: args
      }
    };

    try {
      console.debug('📡 Sending device control command', { deviceName, action, level });
      const result = await this.sendRequest(message);

      const content = result.content?.[0]?.text;
      if (!content) {
        throw new Error('No content in MCP response');
      }

      console.debug('✅ Device control successful');
      return content;
    } catch (error) {
      console.error('❌ Failed to control device:', error.message);
      throw error;
    }
  }

  /**
   * Get devices formatted for AI context
   * @returns {Promise<string>}
   */
  async getDevicesForAI() {
    const devices = await this.listDevices();

    if (devices.length === 0) {
      return 'No Z-Wave devices found.';
    }

    return `Available Z-Wave devices:\n${devices
      .map(
        (d) =>
          `- ${d.name}${d.location ? ` (${d.location})` : ''}: ${d.available ? 'online' : 'offline'} - ${d.ready ? 'ready' : 'not ready'}`
      )
      .join('\n')}`;
  }

  /**
   * Stop the MCP server
   */
  async stop() {
    if (this.serverProcess) {
      console.log('🛑 Stopping MCP server');
      this.serverProcess.kill('SIGTERM');
      this.serverProcess = null;
      this.isReady = false;
      this.pendingRequests.clear();
    }
  }
}

// Singleton instance
let mcpClient = null;

/**
 * Get or create the MCP client instance
 * @returns {MCPZWaveClient}
 */
export function getMCPClient() {
  if (!mcpClient) {
    mcpClient = new MCPZWaveClient();
  }
  return mcpClient;
}

/**
 * Get list of devices from MCP server
 * @returns {Promise<Device[]>}
 */
export async function listDevices() {
  const client = getMCPClient();
  return client.listDevices();
}

/**
 * Control a device via MCP server
 * @param {string} deviceName
 * @param {'on'|'off'|'dim'} action
 * @param {number} [level]
 * @returns {Promise<string>}
 */
export async function controlDevice(deviceName, action, level) {
  const client = getMCPClient();
  return client.controlDevice(deviceName, action, level);
}

/**
 * Get devices formatted for AI context
 * @returns {Promise<string>}
 */
export async function getDevicesForAI() {
  const client = getMCPClient();
  return client.getDevicesForAI();
}

/**
 * Cleanup MCP client on shutdown
 */
export async function shutdownMCPClient() {
  if (mcpClient) {
    await mcpClient.stop();
    mcpClient = null;
  }
}
