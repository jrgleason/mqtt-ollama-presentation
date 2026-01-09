/**
 * MCP Integration Module for Oracle Backend
 *
 * Provides LangChain MCP client integration for auto-discovering Z-Wave MCP tools.
 * Uses the same approach as voice-gateway-oww for consistency.
 *
 * Features:
 * - Auto-discovery of MCP tools via MultiServerMCPClient
 * - Stdio transport for local process communication
 * - Environment variable configuration
 * - Error handling and logging
 */

import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create and configure MCP client for auto-discovering tools from MCP servers
 *
 * @param {Object} options - Configuration options
 * @param {boolean} options.debug - Enable debug logging
 * @returns {Promise<MultiServerMCPClient>} Configured MCP client
 */
export async function createMCPClient(options = {}) {
    const debug = options.debug || process.env.LOG_LEVEL === 'debug';

    // Resolve path to zwave-mcp-server (relative to this file)
    // From: apps/oracle/src/lib/mcp/integration.js
    // To:   apps/zwave-mcp-server/src/index.js
    const mcpServerPath = path.resolve(__dirname, '../../../../zwave-mcp-server/src/index.js');

    if (debug) {
        console.log('[mcp/integration] Configuring MCP client', {
            serverPath: mcpServerPath,
            zwaveUiUrl: process.env.ZWAVE_UI_URL || 'http://localhost:8091',
            mqttBroker: process.env.ZWAVE_MQTT_BROKER || 'mqtt://localhost:1883'
        });
    }

    try {
        // Build environment variables object, filtering out undefined values
        const serverEnv = {};

        // MQTT configuration
        if (process.env.ZWAVE_MQTT_BROKER) {
            serverEnv.ZWAVE_MQTT_BROKER = process.env.ZWAVE_MQTT_BROKER;
        }

        // ZWave-JS-UI connection (required)
        if (process.env.ZWAVE_UI_URL) {
            serverEnv.ZWAVE_UI_URL = process.env.ZWAVE_UI_URL;
        }

        // Logging configuration
        serverEnv.LOG_LEVEL = process.env.LOG_LEVEL || 'info';
        serverEnv.NODE_ENV = process.env.NODE_ENV || 'development';

        const client = new MultiServerMCPClient({
            zwave: {
                transport: "stdio",
                command: "node",
                args: [mcpServerPath],
                env: serverEnv,
                stderr: 'pipe' // Enable stderr capture for debugging
            }
        });

        if (debug) {
            console.log('[mcp/integration] MCP client configured successfully');
        }

        return client;
    } catch (error) {
        console.error('[mcp/integration] Failed to create MCP client', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

/**
 * Initialize MCP client and discover tools
 *
 * @param {Object} options - Configuration options
 * @param {boolean} options.debug - Enable debug logging
 * @returns {Promise<{mcpClient: MultiServerMCPClient, tools: Array}>} MCP client and discovered tools
 * @throws {Error} If initialization fails
 */
export async function initializeMCPIntegration(options = {}) {
    const debug = options.debug || process.env.LOG_LEVEL === 'debug';

    try {
        if (debug) {
            console.log('[mcp/integration] Initializing MCP integration...');
        }

        // Create MCP client
        const mcpClient = await createMCPClient(options);

        // Discover tools from MCP server
        if (debug) {
            console.log('[mcp/integration] Discovering MCP tools...');
        }

        const tools = await mcpClient.getTools();

        if (debug) {
            console.log('[mcp/integration] MCP integration initialized', {
                toolCount: tools.length,
                tools: tools.map(t => t.lc_name || t.name)
            });
        }

        return { mcpClient, tools };

    } catch (error) {
        console.error('[mcp/integration] MCP initialization failed', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

/**
 * Shutdown MCP client gracefully
 *
 * @param {MultiServerMCPClient} mcpClient - MCP client instance
 */
export async function shutdownMCPClient(mcpClient) {
    if (!mcpClient) {
        return;
    }

    try {
        console.log('[mcp/integration] Shutting down MCP client...');
        await mcpClient.close();
        console.log('[mcp/integration] MCP client shutdown complete');
    } catch (error) {
        console.error('[mcp/integration] Error shutting down MCP client', {
            error: error.message
        });
    }
}
