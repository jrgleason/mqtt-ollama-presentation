import { DynamicTool } from '@langchain/core/tools';
import { listDevices } from '../../mcp/zwave-client.js';

export function createDeviceListTool() {
  return new DynamicTool({
    name: 'list_devices',
    description: `Gets the list of smart home devices. ALWAYS call this tool first before controlling any device to get the exact device names. Returns JSON array with name, nodeId, location, and status for each device.`,
    func: async () => {
      try {
        const devices = await listDevices();

        console.log('[device-list-tool] Devices received from MCP:', JSON.stringify(devices, null, 2));

        if (devices.length === 0) {
          return 'No devices found. Please pair some Z-Wave devices using ZWave-JS-UI first.';
        }

        // Return simple list for AI to parse easily
        const deviceNames = devices.map(d => d.name).join(', ');
        console.log('[device-list-tool] Devices:', JSON.stringify(devices, null, 2));

        return `Available devices: ${deviceNames}. Device details: ${JSON.stringify(devices)}`;
      } catch (error) {
        console.error('[device-list-tool] Error listing devices:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return `Error listing devices: ${message}. Make sure ZWave-JS-UI is running at http://localhost:8091`;
      }
    },
  });
}
