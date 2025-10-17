// Z-Wave JS UI HTTP + Socket.IO client for device discovery
import fetch from 'node-fetch';
import { io, Socket } from 'socket.io-client';
import { ZWaveUIConfig, ZWaveConfig, ZWaveNode } from './types.js';

export class ZWaveUIClient {
  private authToken?: string;

  constructor(private readonly config: ZWaveUIConfig) {}

  async authenticate(): Promise<void> {
    if (!this.config.authEnabled) {
      return;
    }

    const response = await fetch(`${this.config.url}/api/authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: this.config.username,
        password: this.config.password,
      }),
    });

    const data = (await response.json()) as any;

    if (data.success && data.user?.token) {
      this.authToken = data.user.token;
      console.log('[ZWave UI] Authenticated successfully');
    } else {
      throw new Error('Authentication failed');
    }
  }

  private async ensureAuthenticated(force = false): Promise<void> {
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

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  private buildSocketConnection(): { endpoint: string; path: string } {
    const baseUrl = new URL(this.config.url);
    const trimmedPath = baseUrl.pathname.replace(/\/$/, '');
    const endpoint = trimmedPath ? `${baseUrl.origin}${trimmedPath}` : baseUrl.origin;
    const path = `${trimmedPath || ''}/socket.io` || '/socket.io';

    return { endpoint, path }; // Socket.IO expects leading slash in path
  }

  private async fetchNodesViaSocket(): Promise<ZWaveNode[]> {
    const { endpoint, path } = this.buildSocketConnection();
    const timeoutMs = this.config.socketTimeoutMs ?? 5000;

    const connectionUrl = this.authToken
      ? `${endpoint}?token=${encodeURIComponent(this.authToken)}`
      : endpoint;

    return await new Promise<ZWaveNode[]>((resolve, reject) => {
      const socket: Socket = io(connectionUrl, {
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

      socket.on('error', (error: any) => {
        clearTimeout(timeout);
        socket.disconnect();
        const err = error instanceof Error ? error : new Error(String(error));
        reject(err);
      });

      socket.on('connect', () => {
        socket.emit('INITED', {}, (state: any) => {
          clearTimeout(timeout);
          socket.disconnect();

          if (!state || !Array.isArray(state.nodes)) {
            resolve([]);
            return;
          }

          resolve(state.nodes as ZWaveNode[]);
        });
      });
    });
  }

  async getLiveNodes(): Promise<ZWaveNode[]> {
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

  async getNodes(): Promise<ZWaveConfig> {
    await this.ensureAuthenticated();

    const response = await fetch(`${this.config.url}/api/exportConfig`, {
      headers: this.getHeaders(),
    });

    const result = (await response.json()) as any;

    if (result.success) {
      return result.data as ZWaveConfig;
    } else {
      throw new Error('Failed to get nodes from Z-Wave JS UI');
    }
  }

  async getSettings(): Promise<any> {
    await this.ensureAuthenticated();

    const response = await fetch(`${this.config.url}/api/settings`, {
      headers: this.getHeaders(),
    });

    const result = (await response.json()) as any;

    if (result.success) {
      return result;
    } else {
      throw new Error('Failed to get settings from Z-Wave JS UI');
    }
  }

  async getDeviceInfo(nodeId: number): Promise<ZWaveNode | null> {
    const nodes = await this.getNodes();
    return nodes[nodeId.toString()] || null;
  }
}
