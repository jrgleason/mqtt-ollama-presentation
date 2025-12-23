/**
 * Z-Wave Device Control Tool for AI
 *
 * Allows the AI to control Z-Wave devices through the MCP client
 */

import {logger} from '../util/Logger.js';
import {getMCPClient} from '../mcpZWaveClient.js';

/**
 * Control a Z-Wave device
 * @param {string} deviceName - Name of the device to control
 * @param {string} action - Action to perform (on, off, dim)
 * @param {number} [level] - Brightness level for dimming (0-100)
 * @returns {Promise<string>} Result message
 */
async function controlDevice(deviceName, action, level) {
    try {
        logger.debug('🎮 controlDevice called', {deviceName, action, level});

        const mcpClient = getMCPClient();

        // Ensure client is started
        if (!mcpClient.isReady) {
            logger.debug('⏳ MCP client not ready, starting...');
            await mcpClient.start();
            logger.debug('✅ MCP client started');
        }

        logger.debug('📞 Calling MCP client controlDevice...', {deviceName, action, level});

        // Call the MCP client method directly
        const result = await mcpClient.controlDevice(deviceName, action, level);

        logger.info('✅ Device control successful', {
            deviceName,
            action,
            level,
            resultLength: result.length,
            resultPreview: result.substring(0, 100)
        });

        return result;
    } catch (error) {
        logger.error('❌ Device control failed', {
            error: error.message,
            stack: error.stack,
            deviceName,
            action,
            level
        });

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

        logger.debug('🔍 Checking device status', {deviceName});

        // List devices filtered by the specific device name
        const result = await mcpClient.listDevices({
            includeInactive: true,  // Include even offline devices
            filter: deviceName      // Filter to the specific device
        });

        logger.debug('✅ Device status check complete', {
            deviceName,
            resultLength: result.length,
            resultPreview: result.substring(0, 100)
        });

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
    logger.info('🏠 Z-Wave control tool called', {
        args,
        argsType: typeof args,
        argsKeys: Object.keys(args || {}),
        deviceName: args?.deviceName,
        action: args?.action,
        level: args?.level
    });

    if (!args || !args.deviceName || !args.action) {
        logger.error('❌ Missing required arguments', {args});
        return 'Error: deviceName and action are required';
    }

    logger.info('🏠 Z-Wave control tool executing', {
        deviceName: args.deviceName,
        action: args.action,
        level: args.level
    });

    try {
        // If action is status, get device status
        if (args.action === 'status') {
            logger.debug('📊 Getting device status...');
            const statusResult = await getDeviceStatus(args.deviceName);
            logger.debug('📊 Status result', {
                resultLength: statusResult.length,
                resultPreview: statusResult.substring(0, 150)
            });
            return statusResult;
        }

        // Otherwise, control the device
        logger.debug('🎮 Controlling device...');
        const result = await controlDevice(args.deviceName, args.action, args.level);
        logger.debug('✅ Z-Wave control result', {
            resultLength: result.length,
            resultPreview: result.substring(0, 100)
        });
        return result;
    } catch (error) {
        logger.error('❌ Z-Wave control tool execution failed', {
            error: error.message,
            stack: error.stack,
            args
        });
        return `Error executing Z-Wave control: ${error.message}`;
    }
}
