/**
 * Z-Wave Device Control Tool for AI
 *
 * Allows the AI to control Z-Wave devices through the MCP client
 */

import {logger} from '../logger.js';
import {getMCPClient} from '../mcp-zwave-client.js';

/**
 * Control a Z-Wave device
 * @param {string} deviceName - Name of the device to control
 * @param {string} action - Action to perform (on, off, dim)
 * @param {number} [level] - Brightness level for dimming (0-100)
 * @returns {Promise<string>} Result message
 */
async function controlDevice(deviceName, action, level) {
    try {
        const mcpClient = getMCPClient();

        // Ensure client is started
        if (!mcpClient.isReady) {
            await mcpClient.start();
        }

        // Call the MCP client method directly
        const result = await mcpClient.controlDevice(deviceName, action, level);

        logger.info(`✅ Device control successful`, {deviceName, action, level});

        return result;
    } catch (error) {
        logger.error('❌ Device control failed', {error: error.message, deviceName, action});

        // Check if it's a device not found error
        if (error.message.includes('not found') || error.message.includes('No device')) {
            return `Device "${deviceName}" not found. Please check the device name and try again.`;
        }

        // Check if it's a device offline error
        if (error.message.includes('not available') || error.message.includes('offline')) {
            return `Device "${deviceName}" is currently offline or not available.`;
        }

        return `Failed to control ${deviceName}: ${error.message}`;
    }
}

/**
 * Get status of a specific device
 * @param {string} deviceName - Name of the device
 * @returns {Promise<string>} Device status
 */
async function getDeviceStatus(deviceName) {
    try {
        const mcpClient = getMCPClient();

        // Ensure client is started
        if (!mcpClient.isReady) {
            await mcpClient.start();
        }

        // List all devices
        const result = await mcpClient.listDevices();

        logger.debug(`✅ Device status check`, {deviceName});

        // Result is already a formatted string
        return result;
    } catch (error) {
        logger.error('❌ Device status check failed', {error: error.message, deviceName});
        return `Failed to check status of ${deviceName}: ${error.message}`;
    }
}

/**
 * Tool definition for device control
 */
export const zwaveControlTool = {
    type: 'function',
    function: {
        name: 'control_zwave_device',
        description: 'REQUIRED: Control Z-Wave smart home devices (switches, lights, dimmers). You MUST call this function when the user asks to turn on/off a device, dim a light, or control any smart home device. ALWAYS check device status first before attempting control.',
        parameters: {
            type: 'object',
            properties: {
                deviceName: {
                    type: 'string',
                    description: 'The name of the device to control (e.g., "Switch One", "Demo Switch", "Living Room Light")'
                },
                action: {
                    type: 'string',
                    enum: ['on', 'off', 'dim', 'status'],
                    description: 'Action to perform: "on" (turn on), "off" (turn off), "dim" (set brightness), or "status" (check current state)'
                },
                level: {
                    type: 'number',
                    description: 'Brightness level for dimming (0-100). Only used when action is "dim".'
                }
            },
            required: ['deviceName', 'action']
        }
    }
};

/**
 * Execute the Z-Wave control tool
 * @param {Object} args - Tool arguments
 * @param {string} args.deviceName - Device name
 * @param {string} args.action - Action to perform
 * @param {number} [args.level] - Brightness level
 * @returns {Promise<string>} Result message
 */
export async function executeZWaveControlTool(args) {
    if (!args.deviceName || !args.action) {
        return 'Error: deviceName and action are required';
    }

    logger.info(`🏠 Z-Wave control tool executing`, {
        deviceName: args.deviceName,
        action: args.action,
        level: args.level
    });

    // If action is status, get device status
    if (args.action === 'status') {
        return await getDeviceStatus(args.deviceName);
    }

    // Otherwise, control the device
    const result = await controlDevice(args.deviceName, args.action, args.level);
    logger.debug(`✅ Z-Wave control result: ${result.substring(0, 100)}...`);
    return result;
}
