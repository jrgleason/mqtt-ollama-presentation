/**
 * MCP ZWave Client for Voice Gateway
 *
 * Re-exports functionality from the shared zwave-mcp-server package.
 */

import {
    getDevicesForAI as getSharedDevicesForAI,
    getMCPClient as getSharedMCPClient,
    shutdownMCPClient as shutdownSharedMCPClient
} from 'zwave-mcp-server/client';

export {getSharedMCPClient as getMCPClient, shutdownSharedMCPClient as shutdownMCPClient};

/**
 * Initialize the MCP client
 * @returns {Promise<void>}
 */
export async function initializeMCPClient() {
    const client = getSharedMCPClient();
    await client.start();
}

/**
 * Get device list for AI context
 * @returns {Promise<string>}
 */
export async function getDevicesForAI() {
    return getSharedDevicesForAI();
}
