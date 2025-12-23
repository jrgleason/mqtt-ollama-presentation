/**
 * Shared MCP Client for ZWave-JS-UI
 *
 * This client can be used by any application to communicate with the zwave-mcp-server.
 * It handles spawning the server process and communicating via JSON-RPC over stdio.
 *
 * IMPORTANT: MCP Client Logging Convention
 * All debug/diagnostic logs MUST use console.warn() to write to stderr.
 * Actual errors should use console.error().
 * This prevents pollution of the JSON-RPC communication channel on stdout.
 */

import {spawn} from 'child_process';
import path from 'path';
import {fileURLToPath} from 'url';

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
            return;
        }

        // Path to zwave-mcp-server index.js (same directory as this file)
        const serverPath = path.resolve(__dirname, 'index.js');

        this.serverProcess = spawn(process.execPath, [serverPath], {
            stdio: ['pipe', 'pipe', 'pipe'],  // stdin, stdout, stderr
            env: {
                ...process.env,
            }
        });

        this.serverProcess.stdout.on('data', (data) => {
            this._onStdoutData(data);
        });

        // Only log stderr if there are actual errors (not info messages)
        this.serverProcess.stderr.on('data', (data) => {
            const message = data.toString().trim();
            // Only log actual errors, not informational messages
            if (message.includes('Error:') || message.includes('error:')) {
                console.error('[mcp-server]', message);
            }
        });

        this.serverProcess.on('exit', (code, signal) => {
            console.warn('[mcp] server exited', {code, signal});
            this.serverProcess = null;
            this.isReady = false;
            // Reject all pending requests on unexpected exit
            for (const {reject} of this.pendingRequests.values()) {
                try {
                    reject(new Error('MCP server exited unexpectedly'));
                } catch (e) { /* ignore */
                }
            }
            this.pendingRequests.clear();
        });

<<<<<<< HEAD
        // Wait for server to be ready (initialization is event-driven, no arbitrary timeout needed)
=======
        // TODO: This seems wrong
        // Give the server a moment to fully initialize its stdio transport
        // await new Promise(resolve => setTimeout(resolve, 500));

        // Wait for server to be ready
>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)
        await this.initialize();
    }

    // Write a newline-delimited JSON message (MCP SDK protocol)
    _writeMessage(obj) {
        if (!this.serverProcess || !this.serverProcess.stdin.writable) {
            throw new Error('MCP server stdin is not writable');
        }
        const body = JSON.stringify(obj);
        this.serverProcess.stdin.write(body + '\n', 'utf8');
    }

    // Handle incoming stdout data using newline-delimited JSON (MCP SDK protocol)
    _onStdoutData(chunk) {
        this._recvBuffer = Buffer.concat([this._recvBuffer, chunk]);

        while (true) {
            // Look for newline-delimited messages
            const newlineIndex = this._recvBuffer.indexOf('\n');
            if (newlineIndex === -1) break; // No complete message yet

            // Extract the line (remove trailing \r if present)
            const line = this._recvBuffer.slice(0, newlineIndex).toString('utf8').replace(/\r$/, '');
            this._recvBuffer = this._recvBuffer.slice(newlineIndex + 1);

            // Skip empty lines
            if (line.trim().length === 0) continue;

            try {
                const message = JSON.parse(line);
                this._handleMessage(message);
            } catch (err) {
                console.error('[mcp] Failed to parse JSON message:', err, 'Line:', line.slice(0, 100));
            }
        }
    }

    _handleMessage(message) {
        // Handle JSON-RPC response
        if (message.id !== undefined && this.pendingRequests.has(message.id)) {
            const {resolve, reject} = this.pendingRequests.get(message.id);
            this.pendingRequests.delete(message.id);
            if (message.error) {
                reject(new Error(message.error.message || 'MCP request failed'));
            } else {
                resolve(message.result);
            }
            return;
        }

        // Handle notifications or other messages (silently ignore)
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
            await this.sendRequest(initMessage, 30000);

            // Send initialized notification
            await this.sendNotification({
                jsonrpc: '2.0',
                method: 'notifications/initialized'
            });

            this.isReady = true;
        } catch (error) {
            console.error('❌ Failed to initialize MCP server:', error.message);
            throw error;
        }
    }

    /**
     * Send a request to the MCP server.
     * @param {Object} message - JSON-RPC request object (must include `method`, `params`).
     * @param {number} timeoutMs - Timeout in milliseconds for the request (default: 10000).
     * @returns {Promise<any>} Resolves with the JSON-RPC result or rejects on error/timeout.
     */
    sendRequest(message, timeoutMs = 10000) {
        return new Promise((resolve, reject) => {
            if (!this.serverProcess) return reject(new Error('MCP server not running'));

            // Auto-assign id and jsonrpc if not present (defensive programming)
            if (message.id == null) {
                message.id = this.messageId++;
            }
            if (!message.jsonrpc) {
                message.jsonrpc = '2.0';
            }

            const t = setTimeout(() => {
                if (this.pendingRequests.has(message.id)) {
                    this.pendingRequests.delete(message.id);
                    reject(new Error('MCP request timeout'));
                }
            }, timeoutMs);

            const wrappedResolve = (res) => {
                clearTimeout(t);
                resolve(res);
            };
            const wrappedReject = (err) => {
                clearTimeout(t);
                reject(err);
            };

            // register the pending request with wrappers
            this.pendingRequests.set(message.id, {resolve: wrappedResolve, reject: wrappedReject});

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
     * @param {Object} [options] - Options for listing devices
     * @param {boolean} [options.includeInactive=true] - Include inactive devices
     * @param {string} [options.filter] - Filter devices by name or location
     * @returns {Promise<string>} Human-readable device list
     */
    async listDevices(options = {}) {
        if (!this.isReady) {
            await this.start();
        }

        const args = {
            includeInactive: options.includeInactive !== undefined ? options.includeInactive : true
        };

        if (options.filter) {
            args.filter = options.filter;
        }

        console.warn('[mcp-client] listDevices called with:', args);

        const message = {
            jsonrpc: '2.0',
            id: this.messageId++,
            method: 'tools/call',
            params: {
                name: 'list_zwave_devices',
                arguments: args
            }
        };

        try {
            const result = await this.sendRequest(message);
            console.warn('[mcp-client] listDevices result:', {
                hasContent: !!result.content,
                contentLength: result.content?.length,
                isError: result.isError
            });

            // The MCP server now returns human-readable text, not JSON
            // Just return the text content for the AI to use
            const content = result.content?.[0]?.text;
            if (!content) {
                console.warn('[mcp-client] No content in result, returning default message');
                return 'No devices found.';
            }

            console.warn('[mcp-client] Device list preview:', content.substring(0, 200));
            return content;  // Return the formatted text directly
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

        const args = {deviceName, action};
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

        const result = await this.sendRequest(message);

        const content = result.content?.[0]?.text;
        if (!content) {
            throw new Error('No content in MCP response');
        }

        return content;
    }

    /**
     * Get devices formatted for AI context
     * @param {Object} [options] - Options for listing devices
     * @param {boolean} [options.includeInactive=true] - Include inactive devices
     * @param {string} [options.filter] - Filter devices by name or location
     * @returns {Promise<string>}
     */
    async getDevicesForAI(options) {
        try {
            // listDevices() now returns human-readable text directly from the MCP server
            const deviceText = await this.listDevices(options);
            return deviceText;
        } catch (error) {
            console.error('[getDevicesForAI] Error:', error.message);
            throw error;
        }
    }

    /**
     * Stop the MCP server
     */
    async stop() {
        if (this.serverProcess) {
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
 * @param {Object} [options] - Options for listing devices
 * @param {boolean} [options.includeInactive=true] - Include inactive devices
 * @param {string} [options.filter] - Filter devices by name or location
 * @returns {Promise<string>} Human-readable device list
 */
export async function listDevices(options) {
    const client = getMCPClient();
    return client.listDevices(options);
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
 * @param {Object} [options] - Options for listing devices
 * @param {boolean} [options.includeInactive=true] - Include inactive devices
 * @param {string} [options.filter] - Filter devices by name or location
 * @returns {Promise<string>}
 */
export async function getDevicesForAI(options) {
    const client = getMCPClient();
    return client.getDevicesForAI(options);
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
