/**
 * Tool Executor
 *
 * Centralized tool execution with logging, error handling, and timeout protection.
 * Handles all tool calls from AI models in a consistent manner.
 */

export class ToolExecutor {
    /**
     * @param {ToolRegistry} registry - Tool registry instance
     * @param {Object} logger - Logger instance
     * @param {Object} options - Configuration options
     * @param {number} options.timeout - Timeout in milliseconds (default: 30000)
     */
    constructor(registry, logger, options = {}) {
        this.registry = registry;
        this.logger = logger;
        this.timeout = options.timeout || 30000; // 30 seconds default
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
            // Get executor from registry
            const executor = this.registry.getExecutor(toolName);

            if (!executor) {
                this.logger.warn(`Unknown tool requested: ${toolName}`, {
                    availableTools: this.registry.getToolNames()
                });
                return `Error: Unknown tool "${toolName}". Available tools: ${this.registry.getToolNames().join(', ')}`;
            }

            // Sanitize arguments for logging (redact sensitive fields)
            const sanitizedArgs = this.sanitizeForLogging(args);

            this.logger.debug(`🔧 Executing tool: ${toolName}`, {
                tool: toolName,
                args: sanitizedArgs
            });

            // Execute with timeout protection
            const result = await this.executeWithTimeout(executor, args);

            const duration = Date.now() - startTime;

            // Log successful execution
            this.logger.info(`✅ Tool executed successfully: ${toolName}`, {
                tool: toolName,
                duration: `${duration}ms`,
                resultLength: result?.length || 0
            });

            // Warn on slow tools
            if (duration > 1000) {
                this.logger.warn(`⚠️ Slow tool execution: ${toolName}`, {
                    tool: toolName,
                    duration: `${duration}ms`,
                    threshold: '1000ms'
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
     * Execute a tool function with timeout protection
     * @param {Function} executor - Tool executor function
     * @param {Object} args - Tool arguments
     * @returns {Promise<string>} Execution result
     */
    async executeWithTimeout(executor, args) {
        return Promise.race([
            executor(args),
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
     * Format user-friendly error message based on error type
     * @param {string} toolName - Tool name
     * @param {Error} error - Error object
     * @returns {string} Formatted error message
     */
    formatErrorMessage(toolName, error) {
        const errorMsg = error.message.toLowerCase();

        // Network errors
        if (errorMsg.includes('network') || errorMsg.includes('econnrefused') || errorMsg.includes('enotfound')) {
            return `The ${toolName} service is currently unavailable. Please check your network connection.`;
        }

        // Timeout errors
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
            registeredTools: this.registry.toolCount,
            toolNames: this.registry.getToolNames(),
            timeout: this.timeout
        };
    }
}
