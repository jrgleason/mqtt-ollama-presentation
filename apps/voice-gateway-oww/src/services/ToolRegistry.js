/**
 * Tool Registry
 *
 * Centralized registry for managing tool definitions and executor functions.
 * Provides a single source of truth for all available tools in the system.
 */

// Static parameter mappings for known MCP tools
// Maps snake_case parameter names (from LangChain adapter) to camelCase (expected by MCP server)
// Add new mappings here when adding MCP tools to maintain compatibility
const MCP_PARAMETER_MAPPINGS = {
    'control_zwave_device': {
        'device_name': 'deviceName',
        'command': 'action',
        'brightness': 'level'
    },
    'get_device_sensor_data': {
        'device_name': 'deviceName'
    }
};

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
     * Register a LangChain tool from MCP auto-discovery
     * LangChain tools are callable objects with schema and invoke method
     * @param {Object} langchainTool - LangChain tool instance from MCP
     */
    registerLangChainTool(langchainTool) {
        if (!langchainTool) {
            throw new Error('Invalid LangChain tool: tool is null or undefined');
        }

        // Extract tool name from LangChain tool
        const toolName = langchainTool.lc_name || langchainTool.name;

        if (!toolName) {
            throw new Error('Invalid LangChain tool: missing lc_name or name');
        }

        if (typeof langchainTool.invoke !== 'function') {
            throw new Error(`Invalid LangChain tool ${toolName}: missing invoke method`);
        }

        // Warn if overwriting existing tool
        if (this.#tools.has(toolName)) {
            console.warn(`⚠️ Overwriting existing tool: ${toolName}`);
        }

        // Extract parameter mapping for MCP tools
        // Use static mapping if available, otherwise extract from schema
        const paramMapping = MCP_PARAMETER_MAPPINGS[toolName] ||
                             this._extractMCPParameterMapping(langchainTool);

        // Store tool with schema and bound executor
        // LangChain tools expect { input: args } format
        this.#tools.set(toolName, {
            definition: this._convertLangChainSchema(langchainTool),
            executor: async (args) => {
                // Normalize parameter names BEFORE invoking LangChain tool
                const normalizedArgs = this._normalizeParameters(args, paramMapping);

                // Log if normalization occurred
                if (JSON.stringify(args) !== JSON.stringify(normalizedArgs)) {
                    console.log(`🔧 Normalized parameters for ${toolName}:`, {
                        original: args,
                        normalized: normalizedArgs
                    });
                }

                // LangChain tools expect input to be wrapped
                const result = await langchainTool.invoke({ input: normalizedArgs });
                return result;
            },
            paramMapping  // Store for debugging
        });

        console.log(`✅ Registered LangChain MCP tool: ${toolName}`);
    }

    /**
     * Convert LangChain tool schema to Ollama format
     * @param {Object} langchainTool - LangChain tool instance
     * @returns {Object} Tool definition in Ollama format
     * @private
     */
    _convertLangChainSchema(langchainTool) {
        const toolName = langchainTool.lc_name || langchainTool.name;
        const schema = langchainTool.schema || {};

        return {
            type: 'function',
            function: {
                name: toolName,
                description: schema.description || langchainTool.description || '',
                parameters: schema.parameters || schema.input_schema || {
                    type: 'object',
                    properties: {},
                    required: []
                }
            }
        };
    }

    /**
     * Convert snake_case string to camelCase
     * @param {string} snakeStr - String in snake_case format
     * @returns {string} String in camelCase format
     * @private
     */
    _snakeToCamel(snakeStr) {
        return snakeStr.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    }

    /**
     * Extract parameter mapping from LangChain tool schema
     * Builds mapping from snake_case (LangChain) to camelCase (MCP server)
     * @param {Object} langchainTool - LangChain tool instance
     * @returns {Object} Parameter name mapping object
     * @private
     */
    _extractMCPParameterMapping(langchainTool) {
        const schema = langchainTool.schema?.input_schema || langchainTool.schema?.parameters || {};
        const properties = schema.properties || {};

        const mapping = {};
        for (const [key, value] of Object.entries(properties)) {
            // If property has originalName in metadata, use it
            if (value.originalName) {
                mapping[key] = value.originalName;
            } else if (key.includes('_')) {
                // Heuristic: convert snake_case → camelCase
                mapping[key] = this._snakeToCamel(key);
            }
            // else: no underscores, pass through unchanged
        }

        return mapping;
    }

    /**
     * Normalize parameter names using provided mapping
     * @param {Object} args - Original arguments with snake_case parameter names
     * @param {Object} paramMapping - Mapping object {snake_case: camelCase}
     * @returns {Object} Arguments with normalized parameter names
     * @private
     */
    _normalizeParameters(args, paramMapping) {
        if (!paramMapping || Object.keys(paramMapping).length === 0) {
            return args; // No mapping needed
        }

        const normalized = {};
        for (const [key, value] of Object.entries(args)) {
            const mappedKey = paramMapping[key] || key;
            normalized[mappedKey] = value;
        }
        return normalized;
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
