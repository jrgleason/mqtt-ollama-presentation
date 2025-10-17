// Type definitions for Z-Wave MCP Server

export interface ZWaveNode {
  id: number;
  name?: string;
  loc?: string;
  ready?: boolean;
  available?: boolean;
  failed?: boolean;
  status?: string;
  lastActive?: number;
  values?: Record<string, any>;
  hassDevices?: Record<string, any>;
}

export interface DeviceRegistryEntry {
  nodeId: number;
  name: string;
  location: string;
  topics: {
    control: string;
    state: string;
  };
  type: 'switch' | 'dimmer' | 'thermostat' | 'sensor' | 'unknown';
  commandClass: number;
}

export interface DeviceRegistry {
  [deviceName: string]: DeviceRegistryEntry;
}

export interface ZWaveConfig {
  [nodeId: string]: ZWaveNode;
}

export interface MQTTConfig {
  brokerUrl: string;
  username?: string;
  password?: string;
}

export interface ZWaveUIConfig {
  url: string;
  username?: string;
  password?: string;
  authEnabled: boolean;
  socketTimeoutMs?: number;
}

export interface ToolDeviceSummary {
  name: string;
  nodeId: number;
  location?: string;
  available: boolean;
  ready: boolean;
  status?: string;
  lastActiveIso?: string;
  primaryValueSummary?: string;
  topics: DeviceRegistryEntry['topics'];
}
