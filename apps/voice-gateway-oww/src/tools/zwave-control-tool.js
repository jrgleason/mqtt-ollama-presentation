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
        description: 'Control Z-Wave smart home devices (switches, lights, dimmers). Only use when the user explicitly asks to control a device or check device status.',
        parameters: {
            type: 'object',
            description: 'Parameters to perform a Z-Wave device control action.',
            properties: {
                deviceName: {
                    type: 'string',
                    minLength: 1,
                    description: 'Exact device name (e.g., "Switch One", "Living Room Light").'
                },
                action: {
                    type: 'string',
                    enum: ['on', 'off', 'dim', 'status'],
                    description: 'Action to perform.'
                },
                level: {
                    type: 'number',
                    minimum: 0,
                    maximum: 100,
                    description: 'Brightness level (0-100). Used only when action is "dim".'
                }
            },
            required: ['deviceName', 'action'],
            additionalProperties: false
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
