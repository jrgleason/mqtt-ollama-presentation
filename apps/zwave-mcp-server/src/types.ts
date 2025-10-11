// Type definitions for Z-Wave MCP Server

export interface ZWaveNode {
  id: number;
  name: string;
  loc: string;
  values?: any[];
  ready?: boolean;
  status?: string;
  hassDevices?: any;
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
  username: string;
  password: string;
}

export interface ZWaveUIConfig {
  url: string;
  username?: string;
  password?: string;
  authEnabled: boolean;
}
