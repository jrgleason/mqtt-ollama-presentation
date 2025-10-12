/**
 * Device Control Tool
 *
 * LangChain tool for controlling smart home devices via MQTT.
 * Supports turning devices on/off and dimming.
 */

import {DynamicStructuredTool} from '@langchain/core/tools';
import {z} from 'zod';
import {prisma} from '../../db/client';
import {ZWave} from '../../mqtt/client';

// Define the input schema using Zod
const DeviceControlSchema = z.object({
    deviceName: z.string().describe("The name of the device to control (e.g. 'living room light')"),
    action: z.enum(['on', 'off', 'dim']).describe("The action to perform: 'on', 'off', or 'dim'"),
    level: z.number().min(0).max(100).optional().describe("For dimming, brightness level 0-100")
});

export function createDeviceControlTool() {
    return new DynamicStructuredTool({
        name: 'control_device',
        description: `
        Controls a smart home device by turning it on/off or dimming it.

        This tool looks up the device in the database, sends MQTT commands to control it,
        and updates the device state in the database.
        `,
        schema: DeviceControlSchema,
        func: async ({deviceName, action, level}) => {
            try {
                console.log(`[device-control-tool] Received params:`, {deviceName, action, level});

                // Validate input
                if (!deviceName || !action) {
                    return 'Error: deviceName and action are required';
                }

                if (action === 'dim' && (level === undefined || level < 0 || level > 100)) {
                    return 'Error: For dimming, level must be between 0 and 100';
                }

                // Look up device in database (case-insensitive partial match)
                const device = await prisma.device.findFirst({
                    where: {
                        name: {
                            contains: deviceName,
                        },
                    },
                });

                if (!device) {
                    return `Error: Device "${deviceName}" not found in database. Use list_devices to see available devices.`;
                }

                console.log(`[device-control-tool] Found device:`, device.name, `(ID: ${device.id})`);

                // Determine target state based on action
                let targetState: string;
                let mqttValue: boolean | number;

                if (action === 'on') {
                    targetState = 'on';
                    mqttValue = true;
                } else if (action === 'off') {
                    targetState = 'off';
                    mqttValue = false;
                } else if (action === 'dim') {
                    targetState = `${level}%`;
                    mqttValue = level!;
                } else {
                    return `Error: Invalid action "${action}"`;
                }

                // Send MQTT command based on device type
                if (device.type === 'switch' || (device.type === 'dimmer' && action !== 'dim')) {
                    // Binary switch (Command Class 37)
                    await ZWave.controlBinarySwitch(device.name, mqttValue as boolean);
                } else if (device.type === 'dimmer' && action === 'dim') {
                    // Multilevel switch (Command Class 38)
                    await ZWave.controlMultilevelSwitch(device.name, mqttValue as number);
                } else {
                    return `Error: Device type "${device.type}" does not support action "${action}"`;
                }

                // Update device state in database
                await prisma.device.update({
                    where: {id: device.id},
                    data: {state: targetState},
                });

                const response = `Successfully ${action === 'dim' ? `dimmed ${device.name} to ${level}%` : `turned ${action} ${device.name}`}`;
                console.log(`[device-control-tool] ${response}`);
                return response;
            } catch (error) {
                console.error(`[device-control-tool] Error:`, error);
                return `Error controlling device: ${error instanceof Error ? error.message : 'Unknown error'}`;
            }
        },
    });
}
