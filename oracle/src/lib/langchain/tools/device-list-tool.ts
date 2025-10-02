/**
 * Device List Tool
 *
 * LangChain tool that returns a list of all available smart home devices.
 * This is a mock implementation that will be replaced with actual database queries.
 */

import { DynamicTool } from '@langchain/core/tools';

// Mock device data for initial testing
const MOCK_DEVICES = [
  {
    id: '1',
    name: 'Living Room Light',
    type: 'dimmer',
    room: 'Living Room',
    state: { isOn: true, level: 75 },
  },
  {
    id: '2',
    name: 'Bedroom Light',
    type: 'switch',
    room: 'Bedroom',
    state: { isOn: false },
  },
  {
    id: '3',
    name: 'Kitchen Light',
    type: 'dimmer',
    room: 'Kitchen',
    state: { isOn: true, level: 100 },
  },
  {
    id: '4',
    name: 'Garage Door',
    type: 'switch',
    room: 'Garage',
    state: { isOn: false },
  },
];

export function createDeviceListTool() {
  return new DynamicTool({
    name: 'list_devices',
    description: `
      Lists all available smart home devices.

      Returns a JSON array of devices with:
      - id: Device unique identifier
      - name: Friendly device name
      - type: Device type (switch, dimmer, sensor)
      - room: Room location
      - state: Current device state (isOn, level, etc.)

      Use this tool when the user asks what devices are available or wants to see all devices.
    `,
    func: async () => {
      try {
        // TODO: Replace with actual database query
        // const devices = await prisma.device.findMany();

        const deviceList = MOCK_DEVICES.map(
          (device) =>
            `${device.id}: ${device.name} (${device.type}) in ${device.room} - ${
              device.state.isOn ? 'ON' : 'OFF'
            }${device.state.level !== undefined ? ` at ${device.state.level}%` : ''}`
        ).join('\n');

        return `Available devices:\n${deviceList}`;
      } catch (error) {
        return `Error listing devices: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
  });
}
