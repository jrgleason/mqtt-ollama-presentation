<<<<<<< HEAD
import { TOOL_EXECUTION_TIMEOUT_MS, TOOL_EXECUTION_WARNING_MS } from '../constants/timing.js';

=======
>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)
/**
 * Tool Executor
 *
 * Centralized tool execution with logging, error handling, and timeout protection.
 * Handles all tool calls from AI models in a consistent manner.
<<<<<<< HEAD
 *
 * Uses ToolManager to access LangChain tools directly without unnecessary abstraction.
=======
>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)
 */

export class ToolExecutor {
    /**
<<<<<<< HEAD
     * @param {ToolManager} toolManager - Tool manager instance
     * @param {Object} logger - Logger instance
     * @param {Object} options - Configuration options
     * @param {number} options.timeout - Timeout in milliseconds (default: TOOL_EXECUTION_TIMEOUT_MS)
     */
    constructor(toolManager, logger, options = {}) {
        this.toolManager = toolManager;
        this.logger = logger;
        this.timeout = options.timeout || TOOL_EXECUTION_TIMEOUT_MS;
=======
     * @param {ToolRegistry} registry - Tool registry instance
     * @param {Object} logger - Logger instance
     * @param {Object} options - Configuration options
     * @param {number} options.timeout - Timeout in milliseconds (default: 30000)
     */
    constructor(registry, logger, options = {}) {
        this.registry = registry;
        this.logger = logger;
        this.timeout = options.timeout || 30000; // 30 seconds default
>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)
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
<<<<<<< HEAD
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
=======
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
>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)

            this.logger.debug(`🔧 Executing tool: ${toolName}`, {
                tool: toolName,
                args: sanitizedArgs
            });

<<<<<<< HEAD
            // Call LangChain tool directly: tool.invoke({ input: args })
            const result = await this.executeWithTimeout(tool, normalizedArgs);
=======
            // Execute with timeout protection
            const result = await this.executeWithTimeout(executor, args);
>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)

            const duration = Date.now() - startTime;

            // Log successful execution
            this.logger.info(`✅ Tool executed successfully: ${toolName}`, {
                tool: toolName,
                duration: `${duration}ms`,
                resultLength: result?.length || 0
            });

            // Warn on slow tools
<<<<<<< HEAD
            if (duration > TOOL_EXECUTION_WARNING_MS) {
                this.logger.warn(`⚠️ Slow tool execution: ${toolName}`, {
                    tool: toolName,
                    duration: `${duration}ms`,
                    threshold: `${TOOL_EXECUTION_WARNING_MS}ms`
=======
            if (duration > 1000) {
                this.logger.warn(`⚠️ Slow tool execution: ${toolName}`, {
                    tool: toolName,
                    duration: `${duration}ms`,
                    threshold: '1000ms'
>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)
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
<<<<<<< HEAD
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
=======
     * Execute a tool function with timeout protection
     * @param {Function} executor - Tool executor function
     * @param {Object} args - Tool arguments
     * @returns {Promise<string>} Execution result
     */
    async executeWithTimeout(executor, args) {
        return Promise.race([
            executor(args),
>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)
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
<<<<<<< HEAD
            registeredTools: this.toolManager.toolCount,
            toolNames: this.toolManager.getToolNames(),
=======
            registeredTools: this.registry.toolCount,
            toolNames: this.registry.getToolNames(),
>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)
            timeout: this.timeout
        };
    }
}
