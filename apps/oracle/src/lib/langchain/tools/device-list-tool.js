import { DynamicTool } from '@langchain/core/tools';
import { listDevices } from '../../mcp/zwave-client.js';

export function createDeviceListTool() {
  return new DynamicTool({
    name: 'list_devices',
    description: `
      Lists all available Z-Wave smart home devices from ZWave-JS-UI.

      Returns a formatted list of devices with:
      - name: Friendly device name
      - nodeId: Z-Wave node ID
      - location: Room location (if set)
      - available: Whether device is online and reachable
      - ready: Whether device is ready to accept commands
      - topics: MQTT topics for controlling the device

      Use this tool when the user asks what devices are available, wants to see all devices,
      or needs to know device names for control commands.
    `,
    func: async () => {
      try {
        const devices = await listDevices();

        if (devices.length === 0) {
          return 'No devices found. Please pair some Z-Wave devices using ZWave-JS-UI first.';
        }

        const deviceList = devices
          .map((device) => {
            const parts = [
              `Name: ${device.name}`,
              `Node: ${device.nodeId}`,
            ];

            if (device.location) {
              parts.push(`Location: ${device.location}`);
            }

            const status = device.available && device.ready ? 'Online' : 'Offline';
            parts.push(`Status: ${status}`);

            return parts.join(', ');
          })
          .join('\n');

        return `Available Z-Wave devices (${devices.length} total):\n${deviceList}`;
      } catch (error) {
        console.error('[device-list-tool] Error listing devices:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        return `Error listing devices: ${message}. Make sure ZWave-JS-UI is running at http://localhost:8091`;
      }
    },
  });
}
