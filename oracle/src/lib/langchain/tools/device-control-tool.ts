/**
 * Device Control Tool
 *
 * LangChain tool for controlling smart home devices.
 * Supports turning devices on/off and dimming.
 */

import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

// Define the input schema using Zod
const DeviceControlSchema = z.object({
  deviceName: z.string().describe("The name of the device to control (e.g. 'living room light')"),
  action: z.enum(['on', 'off', 'dim']).describe("The action to perform: 'on', 'off', or 'dim'"),
  level: z.number().min(0).max(100).optional().describe("For dimming, brightness level 0-100")
});

export function createDeviceControlTool() {
    return new DynamicStructuredTool({
        name: 'control_device',
        description: 'Controls a smart home device by turning it on/off or dimming it',
        schema: DeviceControlSchema,
        func: async ({ deviceName, action, level }) => {
            try {
                console.log(`[device-control-tool] Received params:`, { deviceName, action, level });

                // Validate input
                if (!deviceName || !action) {
                    return 'Error: deviceName and action are required';
                }

                if (action === 'dim' && (level === undefined || level < 0 || level > 100)) {
                    return 'Error: For dimming, level must be between 0 and 100';
                }

                // TODO: Replace with actual device lookup and MQTT publish
                // Mock response for now
                let response = '';

                if (action === 'on') {
                    response = `Turned on ${deviceName}`;
                } else if (action === 'off') {
                    response = `Turned off ${deviceName}`;
                } else if (action === 'dim') {
                    response = `Set ${deviceName} to ${level}% brightness`;
                }

                console.log(`[device-control-tool] Returning response:`, response);
                return response;
            } catch (error) {
                console.error(`[device-control-tool] Error:`, error);
                return `Error controlling device: ${error instanceof Error ? error.message : 'Unknown error'}`;
            }
        },
    });
}
