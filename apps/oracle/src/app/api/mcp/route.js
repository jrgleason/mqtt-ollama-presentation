/**
 * MCP API Route - Exposes Z-Wave MCP Server via SSE Transport
 *
 * This route provides a Server-Sent Events (SSE) endpoint that bridges
 * the browser to the Z-Wave MCP server running via stdio transport.
 *
 * Architecture:
 * - Browser → SSE → Next.js API Route → stdio → Z-Wave MCP Server
 * - Implements Vercel MCP Adapter for seamless integration
 *
 * @see https://vercel.com/templates/next.js/model-context-protocol-mcp-with-next-js
 */

import {createMcpHandler} from '@vercel/mcp-adapter';
import {fileURLToPath} from 'url';
import {dirname, join} from 'path';

// Get absolute path to zwave-mcp-server
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const zwaveServerPath = join(__dirname, '../../../../../../zwave-mcp-server/src/index.js');

/**
 * Configuration for MCP server connection
 */
const mcpConfig = {
    servers: {
        zwave: {
            transport: 'stdio',
            command: 'node',
            args: [zwaveServerPath],
            env: {
                // Pass through Z-Wave configuration
                ZWAVE_MQTT_BROKER: process.env.ZWAVE_MQTT_BROKER || 'mqtt://localhost:1883',
                ZWAVE_UI_URL: process.env.ZWAVE_UI_URL || 'http://localhost:8091',
                // Pass through logging configuration
                LOG_LEVEL: process.env.LOG_LEVEL || 'info',
                NODE_ENV: process.env.NODE_ENV || 'development',
            },
        },
    },
};

/**
 * MCP Handler for GET requests (SSE connection)
 *
 * Establishes a Server-Sent Events connection that proxies MCP protocol
 * messages between the browser client and the Z-Wave MCP server.
 */
export const GET = createMcpHandler(mcpConfig);

/**
 * MCP Handler for POST requests (tool invocation)
 *
 * Handles tool execution requests from MCP clients, forwarding them
 * to the Z-Wave MCP server and returning results.
 */
export const POST = createMcpHandler(mcpConfig);

/**
 * Runtime configuration for Next.js
 * - nodejs: Required for stdio process spawning
 */
export const runtime = 'nodejs';
