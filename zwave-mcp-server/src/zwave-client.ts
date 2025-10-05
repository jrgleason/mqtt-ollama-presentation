// Z-Wave JS UI HTTP Client for device discovery
import fetch from 'node-fetch';
import { ZWaveUIConfig, ZWaveConfig, ZWaveNode } from './types.js';

export class ZWaveUIClient {
  private authToken?: string;

  constructor(private config: ZWaveUIConfig) {}

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

    const data = await response.json() as any;

    if (data.success && data.user?.token) {
      this.authToken = data.user.token;
      console.log('[ZWave UI] Authenticated successfully');
    } else {
      throw new Error('Authentication failed');
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

  async getNodes(): Promise<ZWaveConfig> {
    const response = await fetch(`${this.config.url}/api/exportConfig`, {
      headers: this.getHeaders(),
    });

    const result = await response.json() as any;

    if (result.success) {
      return result.data as ZWaveConfig;
    } else {
      throw new Error('Failed to get nodes from Z-Wave JS UI');
    }
  }

  async getSettings(): Promise<any> {
    const response = await fetch(`${this.config.url}/api/settings`, {
      headers: this.getHeaders(),
    });

    const result = await response.json() as any;

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
