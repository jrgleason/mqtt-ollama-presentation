/**
 * Tool Registry
 *
 * Centralized registry for managing tool definitions and executor functions.
 * Provides a single source of truth for all available tools in the system.
 */

export class ToolRegistry {
    #tools = new Map();

    /**
     * Register a tool with its definition and executor function
     * @param {Object} definition - Tool definition in Ollama format
     * @param {Function} executor - Async function to execute the tool
     */
    registerTool(definition, executor) {
        if (!definition || !definition.function || !definition.function.name) {
            throw new Error('Invalid tool definition: missing function.name');
        }

        if (typeof executor !== 'function') {
            throw new Error('Tool executor must be a function');
        }

        const toolName = definition.function.name;

        // Warn if overwriting existing tool
        if (this.#tools.has(toolName)) {
            console.warn(`⚠️ Overwriting existing tool: ${toolName}`);
        }

        this.#tools.set(toolName, {
            definition,
            executor
        });

        console.log(`✅ Registered tool: ${toolName}`);
    }

    /**
     * Get the executor function for a tool by name
     * @param {string} name - Tool name
     * @returns {Function|undefined} Executor function or undefined if not found
     */
    getExecutor(name) {
        const tool = this.#tools.get(name);
        return tool?.executor;
    }

    /**
     * Get all tool definitions for AI model
     * @returns {Array<Object>} Array of tool definitions
     */
    getDefinitions() {
        return Array.from(this.#tools.values()).map(t => t.definition);
    }

    /**
     * Check if a tool exists
     * @param {string} name - Tool name
     * @returns {boolean} True if tool is registered
     */
    hasTool(name) {
        return this.#tools.has(name);
    }

    /**
     * Get the number of registered tools
     * @returns {number} Number of tools
     */
    get toolCount() {
        return this.#tools.size;
    }

    /**
     * Get all registered tool names
     * @returns {Array<string>} Array of tool names
     */
    getToolNames() {
        return Array.from(this.#tools.keys());
    }

    /**
     * Clear all registered tools (useful for testing)
     */
    clear() {
        this.#tools.clear();
    }
}
