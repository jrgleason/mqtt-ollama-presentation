/**
 * MCP Integration Module
 *
 * Integrates LangChain's MultiServerMCPClient for auto-discovery of MCP tools.
 * Replaces the custom MCP client wrapper with the standard LangChain approach.
 *
 * Features:
 * - Exponential backoff retry logic for transient connection failures
 * - stderr capture from MCP server subprocess for debugging
 * - Graceful degradation when MCP server is unavailable
 */

import {MultiServerMCPClient} from "@langchain/mcp-adapters";
import {StdioClientTransport} from "@modelcontextprotocol/sdk/client/stdio.js";
import path from 'path';
import {fileURLToPath} from 'url';
import {MCP_RETRY_BASE_DELAY_MS, MCP_STDERR_CAPTURE_MS} from '../constants/timing.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Sleep utility for retry delays
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Capture stderr from MCP server process
 * @param {MultiServerMCPClient} mcpClient - MCP client instance
 * @param {Object} logger - Logger instance
 * @returns {Promise<string[]>} Array of stderr lines captured
 */
async function captureStderr(mcpClient, logger) {
    const stderrLines = [];

    try {
        // Access the underlying client to get the transport
        // Note: This relies on internal MCP SDK structure
        const client = await mcpClient.getClient('zwave');
        if (!client || !client._transport) {
            logger.debug('Cannot access MCP transport for stderr capture');
            return stderrLines;
        }

        const transport = client._transport;
        if (transport instanceof StdioClientTransport && transport.stderr) {
            const stderrStream = transport.stderr;

            // Set up stderr listener with timeout
            const capturePromise = new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    resolve();
                }, MCP_STDERR_CAPTURE_MS);

                stderrStream.on('data', (chunk) => {
                    const text = chunk.toString().trim();
                    if (text) {
                        stderrLines.push(text);
                        logger.debug('MCP stderr:', {line: text});
                    }
                });

                stderrStream.once('error', () => {
                    clearTimeout(timeout);
                    resolve();
                });
            });

            await capturePromise;
        }
    } catch (error) {
        logger.debug('Error capturing stderr', {error: error.message});
    }

    return stderrLines;
}

/**
 * Create and configure MCP client for auto-discovering tools from MCP servers
 *
 * @param {Object} config - Application configuration
 * @param {Object} logger - Logger instance
 * @returns {Promise<MultiServerMCPClient>} Configured MCP client
 */
export async function createMCPClient(config, logger) {
    // Resolve path to zwave-mcp-server (relative to this file)
    // From: apps/voice-gateway-oww/src/services/MCPIntegration.js
    // To:   apps/zwave-mcp-server/src/index.js
    const mcpServerPath = path.resolve(__dirname, '../../../zwave-mcp-server/src/index.js');

    logger.info('🔧 Configuring MCP client', {
        serverPath: mcpServerPath,
        mqttBroker: config.mqtt?.brokerUrl || process.env.MQTT_BROKER_URL
    });

    try {
        // Build environment variables object, filtering out undefined values
        // The MCP SDK uses Zod validation which rejects undefined values
        const serverEnv = {};

        // MQTT configuration (optional but recommended)
        if (config.mqtt?.brokerUrl || process.env.MQTT_BROKER_URL) {
            serverEnv.MQTT_BROKER_URL = config.mqtt?.brokerUrl || process.env.MQTT_BROKER_URL;
        }
        serverEnv.ZWAVE_MQTT_TOPIC = config.mqtt?.zwaveTopic || 'zwave';

        // ZWave-JS-UI connection (required)
        if (process.env.ZWAVE_UI_URL) {
            serverEnv.ZWAVE_UI_URL = process.env.ZWAVE_UI_URL;
        }

        // ZWave-JS-UI authentication (optional)
        serverEnv.ZWAVE_UI_AUTH_ENABLED = process.env.ZWAVE_UI_AUTH_ENABLED || 'false';
        if (process.env.ZWAVE_UI_USERNAME) {
            serverEnv.ZWAVE_UI_USERNAME = process.env.ZWAVE_UI_USERNAME;
        }
        if (process.env.ZWAVE_UI_PASSWORD) {
            serverEnv.ZWAVE_UI_PASSWORD = process.env.ZWAVE_UI_PASSWORD;
        }

        const client = new MultiServerMCPClient({
            zwave: {
                transport: "stdio",
                command: "node",
                args: [mcpServerPath],
                env: serverEnv,
                // Enable stderr capture for debugging
                stderr: 'pipe'
            }
        });

        logger.info('✅ MCP client configured successfully', {server: 'zwave'});
        return client;
    } catch (error) {
        logger.error('❌ Failed to create MCP client', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

/**
 * Initialize MCP client and discover tools with exponential backoff retry
 *
 * Retry strategy:
 * - Attempt 1: Immediate (0ms delay)
 * - Attempt 2: 2s delay (base delay)
 * - Attempt 3: 4s delay (exponential: 2 * base delay)
 * - Total max retry time: 6 seconds
 *
 * @param {Object} config - Application configuration
 * @param {Object} logger - Logger instance
 * @returns {Promise<{mcpClient: MultiServerMCPClient, tools: Array}>} MCP client and discovered tools
 * @throws {Error} If all retry attempts fail
 */
export async function initializeMCPIntegration(config, logger) {
    const maxAttempts = config.mcp?.retryAttempts || 3;
    const baseDelay = config.mcp?.retryBaseDelay || MCP_RETRY_BASE_DELAY_MS;

    let lastError = null;
    let stderrOutput = [];
    let mcpClient = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            logger.info('🚀 Initializing MCP integration...', {
                attempt,
                maxAttempts
            });

            // Create MCP client
            mcpClient = await createMCPClient(config, logger);

            // Discover tools from MCP server
            logger.info('🔍 Discovering MCP tools...');
            const tools = await mcpClient.getTools();

            // Success - log and return
            logger.info('✅ MCP integration initialized', {
                toolCount: tools.length,
                tools: tools.map(t => t.lc_name || t.name),
                attemptNumber: attempt
            });

            return {mcpClient, tools};

        } catch (error) {
            lastError = error;

            // Try to capture stderr for debugging (if client was created)
            if (mcpClient) {
                try {
                    const stderrLines = await captureStderr(mcpClient, logger);
                    stderrOutput = stderrOutput.concat(stderrLines);
                } catch (stderrError) {
                    logger.debug('Failed to capture stderr', {error: stderrError.message});
                }
            }

            // Log the failure
            logger.warn(`❌ MCP connection attempt ${attempt}/${maxAttempts} failed`, {
                error: error.message,
                stderr: stderrOutput.length > 0 ? stderrOutput : undefined
            });

            // If this was the last attempt, throw with comprehensive error
            if (attempt === maxAttempts) {
                const finalError = new Error(
                    `MCP connection failed after ${maxAttempts} attempts: ${error.message}`
                );
                finalError.cause = error;
                finalError.stderr = stderrOutput;

                logger.error('❌ MCP integration permanently failed', {
                    error: finalError.message,
                    attempts: maxAttempts,
                    stderr: stderrOutput.length > 0 ? stderrOutput.join('\n') : 'No stderr captured',
                    originalError: error.message,
                    stack: error.stack
                });

                throw finalError;
            }

            // Calculate exponential backoff delay
            // Attempt 1 -> 0ms (no delay)
            // Attempt 2 -> baseDelay (e.g., 2000ms)
            // Attempt 3 -> 2 * baseDelay (e.g., 4000ms)
            const delay = attempt === 1 ? 0 : baseDelay * (attempt - 1);

            if (delay > 0) {
                logger.info(`⏳ Retrying MCP connection in ${delay}ms...`, {
                    nextAttempt: attempt + 1,
                    maxAttempts
                });
                await sleep(delay);
            }
        }
    }

    // This should never be reached due to throw in loop, but TypeScript/linters like it
    throw lastError || new Error('MCP initialization failed for unknown reason');
}

/**
 * Shutdown MCP client gracefully
 *
 * @param {MultiServerMCPClient} mcpClient - MCP client instance
 * @param {Object} logger - Logger instance
 */
export async function shutdownMCPClient(mcpClient, logger) {
    if (!mcpClient) {
        return;
    }

    try {
        logger.info('🛑 Shutting down MCP client...');
        await mcpClient.close();
        logger.info('✅ MCP client shutdown complete');
    } catch (error) {
        logger.error('❌ Error shutting down MCP client', {
            error: error.message
        });
    }
}
