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
            console.log('[ZWave UI] Authenticated successfully');
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
                console.warn('[ZWave UI] Live node fetch failed, retrying after re-authentication');
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
}
