import {DynamicStructuredTool} from '@langchain/core/tools';
import {z} from 'zod';
import {listDevices} from '../../mcp/zwave-client.js';
import {mqttClient} from '../../mqtt/client.js';

const DEBUG = process.env.LOG_LEVEL === 'debug' || process.env.NODE_ENV === 'development';

const DeviceControlSchema = z.object({
    deviceName: z.string().describe("The name of the device to control (e.g. 'Demo Switch' or 'Living Room Light')"),
    action: z.enum(['on', 'off', 'dim']).describe("The action to perform: 'on', 'off', or 'dim'"),
    level: z.number().min(0).max(100).optional().describe('For dimming, brightness level 0-100'),
});

export function createDeviceControlTool() {
    return new DynamicStructuredTool({
        name: 'control_device',
        description: `
        Controls a Z-Wave smart home device by turning it on/off or dimming it.

        This tool looks up the device from ZWave-JS-UI and sends MQTT commands to control it.
        IMPORTANT: Use the exact device name from list_devices tool.
        `,
        schema: DeviceControlSchema,
        func: async ({deviceName, action, level}) => {
            try {
                if (DEBUG) {
                    console.log('[device-control-tool] Received params:', {deviceName, action, level});
                }

                if (!deviceName || !action) {
                    return 'Error: deviceName and action are required';
                }

                if (action === 'dim' && (level === undefined || level < 0 || level > 100)) {
                    return 'Error: For dimming, level must be between 0 and 100';
                }

                // Get devices from MCP server
                const devices = await listDevices();

                // Find device by name (case-insensitive partial match)
                const device = devices.find(d =>
                    d.name.toLowerCase().includes(deviceName.toLowerCase()) ||
                    deviceName.toLowerCase().includes(d.name.toLowerCase())
                );

                if (!device) {
                    return `Error: Device "${deviceName}" not found. Use list_devices to see available devices.`;
                }

                if (!device.available || !device.ready) {
                    return `Error: Device "${device.name}" is offline or not ready.`;
                }

                if (DEBUG) {
                    console.log('[device-control-tool] Found device:', device.name, `(Node: ${device.nodeId})`);
                }

                // Use the control topic from device info
                const controlTopic = device.topics.control;

                let mqttValue;
                if (action === 'on') {
                    mqttValue = true;
                } else if (action === 'off') {
                    mqttValue = false;
                } else if (action === 'dim') {
                    // For dimming, convert 0-100 to 0-99 (Z-Wave multilevel switch range)
                    mqttValue = Math.min(99, level);
                } else {
                    return `Error: Invalid action "${action}"`;
                }

                if (DEBUG) {
                    console.log('[device-control-tool] Publishing to MQTT:', {
                        topic: controlTopic,
                        payload: {value: mqttValue}
                    });
                }

                // Publish to MQTT
                await mqttClient.publish(controlTopic, {value: mqttValue});

                if (DEBUG) {
                    console.log('[device-control-tool] MQTT publish complete');
                }

                const response =
                    action === 'dim'
                        ? `Successfully dimmed ${device.name} to ${level}%`
                        : `Successfully turned ${action} ${device.name}`;

                if (DEBUG) {
                    console.log('[device-control-tool]', response);
                }

                return response;
            } catch (error) {
                console.error('[device-control-tool] Error:', error);
                const message = error instanceof Error ? error.message : 'Unknown error';
                return `Error controlling device: ${message}. Make sure ZWave-JS-UI is running and MQTT is connected.`;
            }
        },
    });
}
