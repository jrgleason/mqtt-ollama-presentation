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

export class MCPZWaveClient {
  constructor() {
    this.serverProcess = null;
    this.messageId = 0;
    this.pendingRequests = new Map();
    this.isReady = false;
    this._recvBuffer = Buffer.alloc(0);
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

    this.serverProcess = spawn(process.execPath, [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
      }
    });

    this.serverProcess.stdout.on('data', (data) => this._onStdoutData(data));
    this.serverProcess.stderr.on('data', (data) => console.error('[mcp-server]', data.toString().trim()));

    this.serverProcess.on('exit', (code, signal) => {
      console.warn('[mcp] server exited', { code, signal });
      this.serverProcess = null;
      this.isReady = false;
      // Reject all pending requests on unexpected exit
      for (const { reject } of this.pendingRequests.values()) {
        try { reject(new Error('MCP server exited unexpectedly')); } catch (e) { /* ignore */ }
      }
      this.pendingRequests.clear();
    });

    // Wait for server to be ready
    await this.initialize();
  }

  // Write a framed JSON message with Content-Length header
  _writeMessage(obj) {
    if (!this.serverProcess || !this.serverProcess.stdin.writable) {
      throw new Error('MCP server stdin is not writable');
    }
    const body = JSON.stringify(obj);
    const header = `Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n`;
    this.serverProcess.stdin.write(header + body, 'utf8');
  }

  // Handle incoming stdout data using Content-Length framing
  _onStdoutData(chunk) {
    this._recvBuffer = Buffer.concat([this._recvBuffer, chunk]);

    while (true) {
      const hdrEnd = this._recvBuffer.indexOf('\r\n\r\n');
      if (hdrEnd === -1) break;

      const header = this._recvBuffer.slice(0, hdrEnd).toString('ascii');
      const m = header.match(/Content-Length:\s*(\d+)/i);
      if (!m) {
        // Malformed header: drop until after hdrEnd
        console.error('[mcp] Missing Content-Length header, dropping malformed data');
        this._recvBuffer = this._recvBuffer.slice(hdrEnd + 4);
        continue;
      }

      const len = parseInt(m[1], 10);
      const totalNeeded = hdrEnd + 4 + len;
      if (this._recvBuffer.length < totalNeeded) break; // wait for more data

      const bodyBuf = this._recvBuffer.slice(hdrEnd + 4, totalNeeded);
      this._recvBuffer = this._recvBuffer.slice(totalNeeded);

      try {
        const message = JSON.parse(bodyBuf.toString('utf8'));
        this._handleMessage(message);
      } catch (err) {
        console.error('[mcp] Failed to parse JSON message:', err);
      }
    }
  }

  _handleMessage(message) {
    // Handle JSON-RPC response
    if (message.id !== undefined && this.pendingRequests.has(message.id)) {
      const { resolve, reject } = this.pendingRequests.get(message.id);
      this.pendingRequests.delete(message.id);
      if (message.error) {
        reject(new Error(message.error.message || 'MCP request failed'));
      } else {
        resolve(message.result);
      }
      return;
    }

    // Handle notifications or other messages
    if (message.method) {
      // Emit or handle notifications as needed (application-specific)
      console.debug('[mcp] notification:', message.method, message.params);
    }
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
   * Send a request to the MCP server.
   * @param {Object} message - JSON-RPC request object (must include `id`, `method`, `params`).
   * @param {number} timeoutMs - Timeout in milliseconds for the request (default: 10000).
   * @returns {Promise<any>} Resolves with the JSON-RPC result or rejects on error/timeout.
   */
  sendRequest(message, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      if (!this.serverProcess) return reject(new Error('MCP server not running'));

      const t = setTimeout(() => {
        if (this.pendingRequests.has(message.id)) {
          this.pendingRequests.delete(message.id);
          reject(new Error('MCP request timeout'));
        }
      }, timeoutMs);

      const wrappedResolve = (res) => { clearTimeout(t); resolve(res); };
      const wrappedReject = (err) => { clearTimeout(t); reject(err); };

      // register the pending request with wrappers
      this.pendingRequests.set(message.id, { resolve: wrappedResolve, reject: wrappedReject });

      try {
        this._writeMessage(message);
      } catch (err) {
        this.pendingRequests.delete(message.id);
        clearTimeout(t);
        return reject(err);
      }
    });
  }

  /**
   * Send a notification to the MCP server (no response expected)
   * @param {Object} message
   * @returns {Promise<void>} Resolves when notification is sent, rejects on error
   */
  sendNotification(message) {
    return new Promise((resolve, reject) => {
      if (!this.serverProcess) {
        return reject(new Error('MCP server not running'));
      }

      try {
        this._writeMessage(message);
        resolve();
      } catch (err) {
        console.error('[mcp] failed to send notification:', err);
        reject(err);
      }
    });
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

    console.debug('📡 Sending device control command', { deviceName, action, level });
    const result = await this.sendRequest(message);

    const content = result.content?.[0]?.text;
    if (!content) {
      throw new Error('No content in MCP response');
    }

    console.debug('✅ Device control successful');
    return content;
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
