/**
 * Device Control Tool
 *
 * LangChain tool for controlling smart home devices.
 * Supports turning devices on/off and dimming.
 */

import { DynamicTool } from '@langchain/core/tools';

interface DeviceControlInput {
  deviceName: string;
  action: 'on' | 'off' | 'dim';
  level?: number;
}

export function createDeviceControlTool() {
  return new DynamicTool({
    name: 'control_device',
    description: `
      Controls a smart home device by name.

      Parameters (as JSON string):
      - deviceName: The friendly name of the device (e.g., "living room light", "bedroom light")
      - action: "on", "off", or "dim"
      - level: (optional) For dimming, specify brightness 0-100

      Examples:
      - Turn on: {"deviceName": "living room light", "action": "on"}
      - Turn off: {"deviceName": "bedroom light", "action": "off"}
      - Dim: {"deviceName": "kitchen light", "action": "dim", "level": 50}

      The device name is case-insensitive and supports partial matching.
    `,
    func: async (input: string) => {
      try {
        const params: DeviceControlInput = JSON.parse(input);
        const { deviceName, action, level } = params;

        // Validate input
        if (!deviceName || !action) {
          return 'Error: deviceName and action are required';
        }

        if (action === 'dim' && (level === undefined || level < 0 || level > 100)) {
          return 'Error: For dimming, level must be between 0 and 100';
        }

        // TODO: Replace with actual device lookup and MQTT publish
        // 1. Find device by name (fuzzy match)
        // const device = await findDeviceByName(deviceName);
        //
        // 2. Build MQTT message
        // const topic = `home/device/${device.id}/set`;
        // const payload = { action, value: level };
        //
        // 3. Publish to MQTT
        // await mqttClient.publish(topic, JSON.stringify(payload));

        // Mock response for now
        const deviceNameLower = deviceName.toLowerCase();
        let response = '';

        if (action === 'on') {
          response = `Turned on ${deviceName}`;
        } else if (action === 'off') {
          response = `Turned off ${deviceName}`;
        } else if (action === 'dim') {
          response = `Set ${deviceName} to ${level}% brightness`;
        }

        return response;
      } catch (error) {
        if (error instanceof SyntaxError) {
          return 'Error: Invalid JSON format. Please provide parameters as a JSON string.';
        }
        return `Error controlling device: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    },
  });
}
