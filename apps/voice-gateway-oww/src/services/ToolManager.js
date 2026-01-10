/**
 * Tool Manager
 *
 * Simplified tool collection manager that maintains an array of LangChain tools
 * without unnecessary abstraction layers.
 *
 * Rationale: LangChain.js MCP adapters provide tools that are ready to use.
 * The previous ToolRegistry added redundant schema conversion and executor wrapping.
 * This simplified version aligns with LangChain patterns.
 */

import {logger} from '../util/Logger.js';

// Static parameter mappings for known MCP tools
// Maps snake_case parameter names (from LangChain adapter) to camelCase (expected by MCP server)
//
// OPTIMIZATION OPPORTUNITY: This normalization may be redundant if LangChain MCP adapters
// handle parameter name conversion automatically. Testing showed parameter normalization is
// still needed for some tools. Could be simplified in future if LangChain adapter is updated.
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

export class ToolManager {
    constructor() {
        this.tools = [];  // Simple array of LangChain tools
        this.paramMappings = new Map();  // Tool name -> parameter mapping
    }

    /**
     * Get the number of registered tools
     * @returns {number} Number of tools
     */
    get toolCount() {
        return this.tools.length;
    }

    /**
     * Add MCP tools from LangChain adapters
     * @param {Array} mcpTools - Array of LangChain tool instances
     */
    addMCPTools(mcpTools) {
        if (!Array.isArray(mcpTools)) {
            throw new Error('mcpTools must be an array');
        }

        for (const tool of mcpTools) {
            const toolName = tool.lc_name || tool.name;

            if (!toolName) {
                logger.warn('Skipping tool with no name', {tool});
                continue;
            }

            // Store parameter mapping if available
            const paramMapping = MCP_PARAMETER_MAPPINGS[toolName];
            if (paramMapping) {
                this.paramMappings.set(toolName, paramMapping);
            }

            this.tools.push(tool);
            logger.info('Added MCP tool', {toolName});
        }
    }

    /**
     * Add a custom tool
     * @param {Object} tool - LangChain-compatible tool with name, description, schema, invoke()
     */
    addCustomTool(tool) {
        if (!tool) {
            throw new Error('Tool cannot be null or undefined');
        }

        const toolName = tool.lc_name || tool.name;

        if (!toolName) {
            throw new Error('Tool must have name or lc_name property');
        }

        if (typeof tool.invoke !== 'function') {
            throw new Error(`Tool ${toolName} must have invoke() method`);
        }

        this.tools.push(tool);
        logger.info('Added custom tool', {toolName});
    }

    /**
     * Get all tools (for passing to AI client)
     * @returns {Array} Array of LangChain tools
     */
    getTools() {
        return this.tools;
    }

    /**
     * Find a tool by name
     * @param {string} name - Tool name to find
     * @returns {Object|undefined} Tool object or undefined if not found
     */
    findTool(name) {
        return this.tools.find(t => {
            const toolName = t.lc_name || t.name;
            return toolName === name;
        });
    }

    /**
     * Get parameter mapping for a tool (for normalization)
     * @param {string} toolName - Tool name
     * @returns {Object|undefined} Parameter mapping or undefined
     */
    getParameterMapping(toolName) {
        return this.paramMappings.get(toolName);
    }

    /**
     * Normalize parameter names using tool's mapping
     * @param {string} toolName - Tool name
     * @param {Object} args - Original arguments
     * @returns {Object} Normalized arguments
     */
    normalizeParameters(toolName, args) {
        const mapping = this.paramMappings.get(toolName);

        if (!mapping || Object.keys(mapping).length === 0) {
            return args; // No mapping needed
        }

        const normalized = {};
        let changed = false;
        for (const [key, value] of Object.entries(args)) {
            const mappedKey = mapping[key] || key;
            if (mappedKey !== key) {
                changed = true;
            }
            normalized[mappedKey] = value;
        }

        // Log if normalization occurred
        if (changed) {
            logger.info('Normalized parameters', {
                toolName,
                original: args,
                normalized
            });
        }

        return normalized;
    }

    /**
     * Get all tool names
     * @returns {Array<string>} Array of tool names
     */
    getToolNames() {
        return this.tools.map(t => t.lc_name || t.name);
    }

    /**
     * Check if a tool exists
     * @param {string} name - Tool name
     * @returns {boolean} True if tool exists
     */
    hasTool(name) {
        return this.findTool(name) !== undefined;
    }

    /**
     * Clear all tools (useful for testing)
     */
    clear() {
        this.tools = [];
        this.paramMappings.clear();
    }
}
