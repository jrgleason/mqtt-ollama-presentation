import fetch from 'node-fetch';
import {io} from 'socket.io-client';

/** @typedef {import('./types.js').ZWaveUIConfig} ZWaveUIConfig */
/** @typedef {import('./types.js').ZWaveConfig} ZWaveConfig */
/** @typedef {import('./types.js').ZWaveNode} ZWaveNode */

const DEFAULT_SOCKET_TIMEOUT_MS = 5000;

export class ZWaveUIClient {
    /**
     * @param {ZWaveUIConfig} config
     */
    constructor(config) {
        this.config = config;
        this.authToken = undefined;
    }

    async authenticate() {
        if (!this.config.authEnabled) {
            return;
        }

        const response = await fetch(`${this.config.url}/api/authenticate`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                username: this.config.username,
                password: this.config.password,
            }),
        });

        const data = await response.json();

        if (data && data.success && data.user && data.user.token) {
            this.authToken = data.user.token;
            console.warn('[ZWave UI] Authenticated successfully');
        } else {
            throw new Error('Authentication failed');
        }
    }

    async ensureAuthenticated(force = false) {
        if (!this.config.authEnabled) {
            return;
        }

        if (force) {
            this.authToken = undefined;
        }

        if (!this.authToken) {
            await this.authenticate();
        }
    }

    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };

        if (this.authToken) {
            headers.Authorization = `Bearer ${this.authToken}`;
        }

        return headers;
    }

    buildSocketConnection() {
        const baseUrl = new URL(this.config.url);
        const trimmedPath = baseUrl.pathname.replace(/\/$/, '');
        const endpoint = trimmedPath ? `${baseUrl.origin}${trimmedPath}` : baseUrl.origin;
        const path = `${trimmedPath || ''}/socket.io` || '/socket.io';

        return {endpoint, path};
    }

    async fetchNodesViaSocket() {
        const {endpoint, path} = this.buildSocketConnection();
        const timeoutMs = this.config.socketTimeoutMs ?? DEFAULT_SOCKET_TIMEOUT_MS;

        const connectionUrl = this.authToken
            ? `${endpoint}?token=${encodeURIComponent(this.authToken)}`
            : endpoint;

        return await new Promise((resolve, reject) => {
            const socket = io(connectionUrl, {
                path,
                transports: ['websocket'],
            });

            const timeout = setTimeout(() => {
                socket.disconnect();
                reject(new Error('Timed out while fetching nodes from Z-Wave JS UI'));
            }, timeoutMs);

            socket.on('connect_error', (error) => {
                clearTimeout(timeout);
                socket.disconnect();
                reject(new Error(`Socket connection failed: ${error.message}`));
            });

            socket.on('error', (error) => {
                clearTimeout(timeout);
                socket.disconnect();
                const err = error instanceof Error ? error : new Error(String(error));
                reject(err);
            });

            socket.on('connect', () => {
                socket.emit('INITED', {}, (state) => {
                    clearTimeout(timeout);
                    socket.disconnect();

                    if (!state || !Array.isArray(state.nodes)) {
                        resolve([]);
                        return;
                    }

                    resolve(state.nodes);
                });
            });
        });
    }

    async getLiveNodes() {
        await this.ensureAuthenticated();

        try {
            return await this.fetchNodesViaSocket();
        } catch (error) {
            if (this.config.authEnabled) {
                await this.ensureAuthenticated(true);
                return await this.fetchNodesViaSocket();
            }

            throw error;
        }
    }

    async getNodes() {
        await this.ensureAuthenticated();

        const response = await fetch(`${this.config.url}/api/exportConfig`, {
            headers: this.getHeaders(),
        });

        const result = await response.json();

        if (result && result.success) {
            return result.data;
        }

        throw new Error('Failed to get nodes from Z-Wave JS UI');
    }

    async getSettings() {
        await this.ensureAuthenticated();

        const response = await fetch(`${this.config.url}/api/settings`, {
            headers: this.getHeaders(),
        });

        const result = await response.json();

        if (result && result.success) {
            return result;
        }

        throw new Error('Failed to get settings from Z-Wave JS UI');
    }

    async getDeviceInfo(nodeId) {
        const nodes = await this.getNodes();
        return nodes[nodeId.toString()] || null;
    }

    async getAllDevices() {
        return await this.getNodes();
    }

    /**
     * Check Z-Wave JS UI health and availability
     * @returns {Promise<{available: boolean, error?: string, lastChecked: Date, nodeCount?: number}>}
     */
    async checkHealth() {
        const lastChecked = new Date();

        try {
            await this.ensureAuthenticated();

            // Try to fetch nodes with a short timeout to check availability
            const nodes = await this.fetchNodesViaSocket();

            return {
                available: true,
                lastChecked,
                nodeCount: nodes.length
            };
        } catch (error) {
            const errorMsg = error.message.toLowerCase();

            let friendlyError = 'The Z-Wave smart home system is currently unavailable.';

            if (errorMsg.includes('timed out') || errorMsg.includes('timeout')) {
                friendlyError = "I can't reach the smart home system right now. The Z-Wave controller appears to be offline. Please check that it's powered on and connected to your network.";
            } else if (errorMsg.includes('econnrefused') || errorMsg.includes('connection refused') || errorMsg.includes('connect_error')) {
                friendlyError = "The Z-Wave service isn't running. Please start the Z-Wave JS UI service on your Raspberry Pi.";
            } else if (errorMsg.includes('enotfound') || errorMsg.includes('not found')) {
                friendlyError = "I can't find the Z-Wave controller on the network. Please check the network configuration.";
            } else if (errorMsg.includes('authentication') || errorMsg.includes('unauthorized')) {
                friendlyError = "The Z-Wave system rejected the authentication. Please check the credentials.";
            }

            return {
                available: false,
                error: friendlyError,
                lastChecked
            };
        }
    }
}
