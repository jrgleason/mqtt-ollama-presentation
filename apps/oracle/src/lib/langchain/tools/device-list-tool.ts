/**
 * Device List Tool
 *
 * LangChain tool that returns a list of all available smart home devices from the database.
 */

import {DynamicTool} from '@langchain/core/tools';
import {prisma} from '../../db/client';

export function createDeviceListTool() {
    return new DynamicTool({
        name: 'list_devices',
        description: `
      Lists all available smart home devices from the database.

      Returns a formatted list of devices with:
      - id: Device unique identifier
      - name: Friendly device name
      - type: Device type (switch, dimmer, sensor)
      - location: Room location
      - state: Current device state
      - nodeId: Z-Wave node ID (if applicable)

      Use this tool when the user asks what devices are available or wants to see all devices.
    `,
        func: async () => {
            try {
                // Query all devices from database
                const devices = await prisma.device.findMany({
                    orderBy: [
                        {location: 'asc'},
                        {name: 'asc'},
                    ],
                });

                if (devices.length === 0) {
                    return 'No devices found in the database. Please pair some Z-Wave devices first.';
                }

                // Format device list for AI consumption
                const deviceList = devices.map((device) => {
                    const parts = [
                        `ID: ${device.id}`,
                        `Name: ${device.name}`,
                        `Type: ${device.type}`,
                    ];

                    if (device.location) {
                        parts.push(`Location: ${device.location}`);
                    }

                    if (device.state) {
                        parts.push(`State: ${device.state}`);
                    }

                    if (device.nodeId) {
                        parts.push(`Node ID: ${device.nodeId}`);
                    }

                    return parts.join(', ');
                }).join('\n');

                return `Available devices (${devices.length} total):\n${deviceList}`;
            } catch (error) {
                console.error('[device-list-tool] Error listing devices:', error);
                return `Error listing devices: ${error instanceof Error ? error.message : 'Unknown error'}`;
            }
        },
    });
}
