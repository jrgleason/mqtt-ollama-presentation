import { TOOL_EXECUTION_TIMEOUT_MS, TOOL_EXECUTION_WARNING_MS } from '../constants/timing.js';

/**
 * Tool Executor
 *
 * Centralized tool execution with logging, error handling, and timeout protection.
 * Handles all tool calls from AI models in a consistent manner.
 *
 * Uses ToolManager to access LangChain tools directly without unnecessary abstraction.
 */

export class ToolExecutor {
    /**
     * @param {ToolManager} toolManager - Tool manager instance
     * @param {Object} logger - Logger instance
     * @param {Object} options - Configuration options
     * @param {number} options.timeout - Timeout in milliseconds (default: TOOL_EXECUTION_TIMEOUT_MS)
     */
    constructor(toolManager, logger, options = {}) {
        this.toolManager = toolManager;
        this.logger = logger;
        this.timeout = options.timeout || TOOL_EXECUTION_TIMEOUT_MS;
    }

    /**
     * Execute a tool by name with arguments
     * @param {string} toolName - Name of the tool to execute
     * @param {Object} args - Tool arguments
     * @returns {Promise<string>} Tool execution result
     */
    async execute(toolName, args) {
        const startTime = Date.now();

        try {
            // Find tool in manager
            const tool = this.toolManager.findTool(toolName);

            if (!tool) {
                this.logger.warn(`Unknown tool requested: ${toolName}`, {
                    availableTools: this.toolManager.getToolNames()
                });
                return `Error: Unknown tool "${toolName}". Available tools: ${this.toolManager.getToolNames().join(', ')}`;
            }

            // Normalize parameters if needed (for MCP tools)
            const normalizedArgs = this.toolManager.normalizeParameters(toolName, args);

            // Sanitize arguments for logging (redact sensitive fields)
            const sanitizedArgs = this.sanitizeForLogging(normalizedArgs);

            this.logger.debug(`🔧 Executing tool: ${toolName}`, {
                tool: toolName,
                args: sanitizedArgs
            });

            // Call LangChain tool directly: tool.invoke({ input: args })
            const result = await this.executeWithTimeout(tool, normalizedArgs);

            const duration = Date.now() - startTime;

            // Log successful execution
            this.logger.info(`✅ Tool executed successfully: ${toolName}`, {
                tool: toolName,
                duration: `${duration}ms`,
                resultLength: result?.length || 0
            });

            // Warn on slow tools
            if (duration > TOOL_EXECUTION_WARNING_MS) {
                this.logger.warn(`⚠️ Slow tool execution: ${toolName}`, {
                    tool: toolName,
                    duration: `${duration}ms`,
                    threshold: `${TOOL_EXECUTION_WARNING_MS}ms`
                });
            }

            return result;
        } catch (error) {
            const duration = Date.now() - startTime;

            // Log execution failure with context
            this.logger.error(`❌ Tool execution failed: ${toolName}`, {
                tool: toolName,
                duration: `${duration}ms`,
                error: error.message,
                stack: error.stack
            });

            // Return user-friendly error message
            return this.formatErrorMessage(toolName, error);
        }
    }

    /**
     * Execute a LangChain tool with timeout protection
     * @param {Object} tool - LangChain tool instance
     * @param {Object} args - Tool arguments
     * @returns {Promise<string>} Execution result
     */
    async executeWithTimeout(tool, args) {
        return Promise.race([
            // LangChain MCP tools expect arguments passed directly (NOT wrapped in { input: args })
            // Custom tools may also use this pattern, so we always pass args directly
            tool.invoke(args),
            new Promise((_, reject) =>
                setTimeout(
                    () => reject(new Error(`Tool execution timeout after ${this.timeout}ms`)),
                    this.timeout
                )
            )
        ]);
    }

    /**
     * Sanitize arguments for logging (redact sensitive data)
     * @param {Object} args - Tool arguments
     * @returns {Object} Sanitized arguments
     */
    sanitizeForLogging(args) {
        if (!args || typeof args !== 'object') {
            return args;
        }

        const sanitized = {...args};
        const sensitiveFields = ['apiKey', 'api_key', 'password', 'token', 'secret', 'auth'];

        for (const field of sensitiveFields) {
            if (field in sanitized) {
                sanitized[field] = '[REDACTED]';
            }
        }

        return sanitized;
    }

    /**
     * Check if tool is a Z-Wave related tool
     * @param {string} toolName - Tool name
     * @returns {boolean} True if Z-Wave tool
     */
    isZWaveTool(toolName) {
        const zwaveTools = ['list_devices', 'control_device', 'verify_device', 'get_device_sensor_data'];
        return zwaveTools.includes(toolName) || toolName.toLowerCase().includes('zwave');
    }

    /**
     * Format user-friendly error message based on error type
     * @param {string} toolName - Tool name
     * @param {Error} error - Error object
     * @returns {string} Formatted error message
     */
    formatErrorMessage(toolName, error) {
        const errorMsg = error.message.toLowerCase();
        const isZWave = this.isZWaveTool(toolName);

        // If the error message is already user-friendly (from MCP server), preserve it
        if (error.message.includes("can't reach") || error.message.includes("smart home")) {
            return error.message;
        }

        // Z-Wave specific error translations
        if (isZWave) {
            // Timeout errors
            if (errorMsg.includes('timeout') || errorMsg.includes('etimedout')) {
                return "The smart home system is taking too long to respond. It might be busy or temporarily unavailable.";
            }

            // Connection refused errors
            if (errorMsg.includes('econnrefused')) {
                return "I can't connect to the smart home controller. It might be offline or restarting.";
            }

            // Host not found errors
            if (errorMsg.includes('enotfound') || errorMsg.includes('getaddrinfo')) {
                return "I can't find the smart home controller on the network. Please check if it's connected.";
            }
        }

        // Generic network errors (non-Z-Wave)
        if (errorMsg.includes('network') || errorMsg.includes('econnrefused') || errorMsg.includes('enotfound')) {
            return `The ${toolName} service is currently unavailable. Please check your network connection.`;
        }

        // Timeout errors (non-Z-Wave)
        if (errorMsg.includes('timeout')) {
            return `The ${toolName} operation timed out. Please try again later.`;
        }

        // Invalid arguments
        if (errorMsg.includes('required') || errorMsg.includes('invalid') || errorMsg.includes('missing')) {
            return `Invalid parameters for ${toolName}. ${error.message}`;
        }

        // Generic error
        return `Error executing ${toolName}: ${error.message}`;
    }

    /**
     * Get execution statistics (for monitoring)
     * @returns {Object} Statistics object
     */
    getStats() {
        return {
            registeredTools: this.toolManager.toolCount,
            toolNames: this.toolManager.getToolNames(),
            timeout: this.timeout
        };
    }
}
