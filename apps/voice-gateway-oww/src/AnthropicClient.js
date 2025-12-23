/**
 * Anthropic AI Client (Class-based using LangChain.js)
 *
 * Handles communication with Anthropic's Claude API for AI inference.
 */

import {ChatAnthropic} from '@langchain/anthropic';
import {AIMessage, HumanMessage, SystemMessage, ToolMessage} from '@langchain/core/messages';
import {logger} from './util/Logger.js';
import {config} from './config.js';

export class AnthropicClient {
    #client = null;

    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
    }

    /** Get or initialize Anthropic client */
    get client() {
        if (!this.#client) {
            if (!this.config.anthropic?.apiKey) {
                throw new Error('ANTHROPIC_API_KEY is required but not set in environment variables');
            }

            this.#client = new ChatAnthropic({
                apiKey: this.config.anthropic.apiKey,
                model: this.config.anthropic.model,
                temperature: 0.7,
                maxTokens: 1024,
            });

            this.logger.debug('✅ Anthropic client initialized', {
                model: this.config.anthropic.model,
                hasApiKey: !!this.config.anthropic.apiKey,
            });
        }
        return this.#client;
    }

<<<<<<< HEAD
=======
    /**
     * Convert tool definition from Ollama format to LangChain/Anthropic format
     * @param {Object} tool - Tool in Ollama format
     * @returns {Object} Tool in LangChain format
     */
    static convertToolToLangChainFormat(tool) {
        return {
            name: tool.function.name,
            description: tool.function.description,
            input_schema: {
                type: 'object',
                properties: tool.function.parameters.properties || {},
                required: tool.function.parameters.required || [],
            },
        };
    }
>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)

    /**
     * Normalize Anthropic (LangChain) content into a plain string
     * Handles cases where content is a string, array of content blocks, or an object
     * @param {any} content
     * @returns {string}
     */
    static normalizeContent(content) {
        if (content == null) return '';
        if (typeof content === 'string') return content;

        // LangChain can return an array of content blocks like [{ type: 'text', text: '...' }, ...]
        if (Array.isArray(content)) {
            try {
                const parts = content.map(part => {
                    if (!part) return '';
                    if (typeof part === 'string') return part;
                    if (typeof part === 'object') {
                        if (typeof part.text === 'string') return part.text;
                        if (typeof part.content === 'string') return part.content;
                        // Some SDKs may use {type, value}
                        if (typeof part.value === 'string') return part.value;
                        return JSON.stringify(part);
                    }
                    return String(part);
                }).filter(Boolean);
                return parts.join(' ').trim();
            } catch {
                return JSON.stringify(content);
            }
        }

        // Fallback for object
        try {
            if (typeof content.text === 'string') return content.text;
            if (typeof content.content === 'string') return content.content;
            return JSON.stringify(content);
        } catch {
            return String(content);
        }
    }

    /**
     * Extract only natural language text from content blocks
     * Ignores tool_use and JSON deltas
     * @param {any} content
     * @returns {string}
     */
    static extractTextOnly(content) {
        // Return only natural language text from content blocks, ignore tool_use and JSON deltas
        if (content == null) return '';
        if (typeof content === 'string') {
            // Skip obvious JSON/tool payloads
            const s = content.trim();
            if (s.startsWith('{') || s.startsWith('[')) return '';
            return s;
        }
        if (Array.isArray(content)) {
            try {
                const texts = [];
                for (const part of content) {
                    if (!part || typeof part !== 'object') continue;
                    const t = part.type || part.kind;
                    if (t === 'text' && typeof part.text === 'string') {
                        texts.push(part.text);
                    }
                    // Ignore: tool_use, input_json_delta, tool_result, etc.
                }
                return texts.join(' ').trim();
            } catch {
                return '';
            }
        }
        // Object fallback
        return '';
    }

    /**
     * Send a prompt to Anthropic and get AI response
     *
     * @param {string} prompt - The user's transcribed message
     * @param {Object} options - Optional configuration
     * @param {string} options.model - Model to use (overrides config)
     * @param {string} options.systemPrompt - System prompt for context
     * @param {Array} options.messages - Full conversation history (overrides prompt)
     * @param {Array} options.tools - Available tools for function calling
     * @param {Function} options.toolExecutor - Function to execute tool calls
     * @param {Function} options.onToken - Optional callback for streaming tokens
     * @returns {Promise<string>} AI response text
     */
    async query(prompt, options = {}) {
        let client = this.client;
        const systemPrompt = options.systemPrompt ||
            'You are a helpful home automation assistant. Answer in 1 sentence or less. Be direct. No explanations. English only.';

        const onToken = options.onToken; // optional streaming callback

        try {
            const overallStartTime = Date.now();
            this.logger.debug('🤖 Sending prompt to Anthropic', {
                model: this.config.anthropic.model,
                prompt: prompt || '[conversation]'
            });

            // Timing: Message building
            const messageBuildStart = Date.now();

            // Build messages array in LangChain format
            const messages = [];

            // Add system message first
            messages.push(new SystemMessage(systemPrompt));

            // Convert from Ollama message format to LangChain format
            if (options.messages) {
                for (const msg of options.messages) {
                    if (msg.role === 'system') {
                        // Skip - already added above
                    } else if (msg.role === 'user') {
                        messages.push(new HumanMessage(msg.content));
                    } else if (msg.role === 'assistant') {
                        messages.push(new AIMessage(msg.content));
                    } else if (msg.role === 'tool') {
                        // Tool results - keep as human message for simplicity
                        messages.push(new HumanMessage(`Tool result: ${msg.content}`));
                    }
                }
            } else if (prompt) {
                messages.push(new HumanMessage(prompt));
            }

            const messageBuildTime = Date.now() - messageBuildStart;
            this.logger.debug(`⏱️ Message building took ${messageBuildTime}ms`);

<<<<<<< HEAD
            // Bind LangChain tools to model if provided
            // Tools from ToolManager are already in LangChain format (no conversion needed)
            const toolBindStart = Date.now();
            if (options.tools && options.tools.length > 0) {
                this.logger.debug('🔧 Tools provided', {
                    toolCount: options.tools.length,
                    tools: options.tools.map(t => t.lc_name || t.name),
                    // Log full tool schema for first tool to debug format issues
                    firstToolSchema: JSON.stringify(options.tools[0], null, 2).substring(0, 500)
                });

                // Bind tools to the model using .bindTools()
                // Tools are already LangChain-compatible from ToolManager
                client = client.bindTools(options.tools);
=======
            // Convert tools to Anthropic format and bind to model if provided
            const toolBindStart = Date.now();
            if (options.tools && options.tools.length > 0) {
                const langchainTools = options.tools.map(AnthropicClient.convertToolToLangChainFormat);
                this.logger.debug('🔧 Tools provided', {
                    toolCount: langchainTools.length,
                    tools: langchainTools.map(t => t.name),
                    // Log full tool schema for first tool to debug format issues
                    firstToolSchema: JSON.stringify(langchainTools[0], null, 2).substring(0, 500)
                });

                // Bind tools to the model using .bindTools()
                client = client.bindTools(langchainTools);
>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)
            }
            const toolBindTime = Date.now() - toolBindStart;
            this.logger.debug(`⏱️ Tool binding took ${toolBindTime}ms`);

            // First invoke to determine tool calls (don't stream here to avoid tool_use content in TTS)
            this.logger.debug('📡 Calling Anthropic API (initial, non-streaming)...');
            const apiCallStart = Date.now();
            const response = await client.invoke(messages);
            const apiCallTime = Date.now() - apiCallStart;
            this.logger.debug(`⏱️ Anthropic initial call took ${apiCallTime}ms`);

            // Check if the model wants to call tools
            if (response.tool_calls && response.tool_calls.length > 0 && options.toolExecutor) {
                this.logger.debug('🔧 AI requested tool calls', {
                    toolCount: response.tool_calls.length,
                    tools: response.tool_calls.map(tc => tc.name)
                });

                // Execute each tool call and create ToolMessages
                const toolExecutionStart = Date.now();
                const toolMessages = [];
                for (const toolCall of response.tool_calls) {
                    const toolName = toolCall.name;
                    const toolArgs = toolCall.args;

                    this.logger.debug(`🔧 Executing tool: ${toolName}`, toolArgs);
                    const singleToolStart = Date.now();
                    const toolResult = await options.toolExecutor(toolName, toolArgs);
                    const singleToolTime = Date.now() - singleToolStart;
                    this.logger.debug(`⏱️ Tool "${toolName}" execution took ${singleToolTime}ms`);

                    // Create a proper ToolMessage with the tool_call_id
                    toolMessages.push(new ToolMessage({
                        content: toolResult,
                        tool_call_id: toolCall.id
                    }));
                }
                const toolExecutionTime = Date.now() - toolExecutionStart;
                this.logger.debug(`⏱️ All tool executions took ${toolExecutionTime}ms`);

                // Build final message array with tool results
                const finalMessages = [
                    ...messages,
                    response,
                    ...toolMessages
                ];

                // Get final response from model
                if (onToken) {
                    this.logger.debug('📡 Streaming final Anthropic response after tools...');
                    const finalApiStart = Date.now();
                    const stream = await client.stream(finalMessages);
                    let finalText = '';
                    let chunkIndex = 0;
                    for await (const chunk of stream) {
                        chunkIndex++;
<<<<<<< HEAD
<<<<<<< HEAD

                        // Debug: log full chunk structure for first few chunks
                        if (chunkIndex <= 3) {
                            this.logger.debug('🔎 Stream chunk details (after tools)', {
                                idx: chunkIndex,
                                chunkKeys: Object.keys(chunk || {}),
                                contentType: typeof chunk?.content,
                                contentIsArray: Array.isArray(chunk?.content),
                                contentLength: Array.isArray(chunk?.content) ? chunk.content.length : 'n/a',
                                rawContent: typeof chunk?.content === 'string'
                                    ? chunk.content.substring(0, 100)
                                    : JSON.stringify(chunk?.content).substring(0, 200)
                            });
                        }

                        const c = chunk?.content;
=======
                        const c = chunk?.content;
                        // Debug: log content block types for first few chunks
=======

                        // Debug: log full chunk structure for first few chunks
>>>>>>> aeee250 (In a working state with the device list working)
                        if (chunkIndex <= 3) {
                            this.logger.debug('🔎 Stream chunk details (after tools)', {
                                idx: chunkIndex,
                                chunkKeys: Object.keys(chunk || {}),
                                contentType: typeof chunk?.content,
                                contentIsArray: Array.isArray(chunk?.content),
                                contentLength: Array.isArray(chunk?.content) ? chunk.content.length : 'n/a',
                                rawContent: typeof chunk?.content === 'string'
                                    ? chunk.content.substring(0, 100)
                                    : JSON.stringify(chunk?.content).substring(0, 200)
                            });
                        }
<<<<<<< HEAD
>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)
=======

                        const c = chunk?.content;
>>>>>>> aeee250 (In a working state with the device list working)
                        const piece = AnthropicClient.extractTextOnly(c);
                        if (piece) {
                            onToken(piece);
                            // Add a space before concatenating to avoid word glue, then trim
                            finalText += (finalText && !finalText.endsWith(' ') ? ' ' : '') + piece;
                        }
                    }
                    const finalApiTime = Date.now() - finalApiStart;
                    this.logger.debug(`⏱️ Final Anthropic streaming took ${finalApiTime}ms`);
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> aeee250 (In a working state with the device list working)

                    this.logger.debug('📊 Stream summary (after tools)', {
                        totalChunks: chunkIndex,
                        extractedTextLength: finalText.length,
                        extractedTextPreview: finalText.substring(0, 100)
                    });

<<<<<<< HEAD
=======
>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)
=======
>>>>>>> aeee250 (In a working state with the device list working)
                    const totalTime = Date.now() - overallStartTime;
                    const normalized = finalText.replace(/\s{2,}/g, ' ').trim();
                    this.logger.info(`✅ Anthropic response (with tools, streamed) received in ${totalTime}ms`, {
                        model: this.config.anthropic.model,
                        duration: `${totalTime}ms`,
                        responseLength: normalized.length,
                    });
                    return normalized;
                } else {
                    this.logger.debug('📡 Calling Anthropic API for final response after tools (non-streaming)...');
                    const finalApiStart = Date.now();
                    const finalResponse = await client.invoke(finalMessages);
                    const finalApiTime = Date.now() - finalApiStart;
                    this.logger.debug(`⏱️ Final Anthropic API call took ${finalApiTime}ms`);

                    const aiResponse = AnthropicClient.normalizeContent(finalResponse.content);

                    const totalTime = Date.now() - overallStartTime;
                    this.logger.info(`✅ Anthropic response (with tools) received in ${totalTime}ms`, {
                        model: this.config.anthropic.model,
                        duration: `${totalTime}ms`,
                        responseLength: aiResponse.length,
                    });

                    this.logger.debug('⏱️ Detailed timing breakdown:', {
                        messageBuild: `${messageBuildTime}ms`,
                        toolBinding: `${toolBindTime}ms`,
                        firstApiCall: `${apiCallTime}ms`,
                        toolExecution: `${toolExecutionTime}ms`,
                        finalApiCall: `${finalApiTime}ms`,
                        total: `${totalTime}ms`
                    });

                    return aiResponse;
                }
            }

            // No tool calls: optionally stream simple text-only response or return directly
            if (onToken) {
                this.logger.debug('📡 Streaming Anthropic response (no tools)...');
                const stream = await client.stream(messages);
                let text = '';
                let chunkIndex = 0;
                for await (const chunk of stream) {
                    chunkIndex++;
<<<<<<< HEAD
<<<<<<< HEAD

                    // Debug: log full chunk structure for first few chunks
                    if (chunkIndex <= 3) {
                        this.logger.debug('🔎 Stream chunk details', {
                            idx: chunkIndex,
                            chunkKeys: Object.keys(chunk || {}),
                            contentType: typeof chunk?.content,
                            contentIsArray: Array.isArray(chunk?.content),
                            contentLength: Array.isArray(chunk?.content) ? chunk.content.length : 'n/a',
                            rawContent: typeof chunk?.content === 'string'
                                ? chunk.content.substring(0, 100)
                                : JSON.stringify(chunk?.content),
                            hasAdditionalKwargs: !!chunk?.additional_kwargs,
                            additionalKwargsKeys: chunk?.additional_kwargs ? Object.keys(chunk.additional_kwargs) : [],
                            fullChunk: JSON.stringify(chunk, null, 2).substring(0, 500)
                        });
                    }

                    const c = chunk?.content;
=======
                    const c = chunk?.content;
=======

                    // Debug: log full chunk structure for first few chunks
>>>>>>> aeee250 (In a working state with the device list working)
                    if (chunkIndex <= 3) {
                        this.logger.debug('🔎 Stream chunk details', {
                            idx: chunkIndex,
                            chunkKeys: Object.keys(chunk || {}),
                            contentType: typeof chunk?.content,
                            contentIsArray: Array.isArray(chunk?.content),
                            contentLength: Array.isArray(chunk?.content) ? chunk.content.length : 'n/a',
                            rawContent: typeof chunk?.content === 'string'
                                ? chunk.content.substring(0, 100)
                                : JSON.stringify(chunk?.content).substring(0, 200),
                            hasAdditionalKwargs: !!chunk?.additional_kwargs,
                            additionalKwargsKeys: chunk?.additional_kwargs ? Object.keys(chunk.additional_kwargs) : []
                        });
                    }
<<<<<<< HEAD
>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)
=======

                    const c = chunk?.content;
>>>>>>> aeee250 (In a working state with the device list working)
                    const piece = AnthropicClient.extractTextOnly(c);
                    if (piece) {
                        onToken(piece);
                        text += (text && !text.endsWith(' ') ? ' ' : '') + piece;
                    }
                }
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> aeee250 (In a working state with the device list working)

                this.logger.debug('📊 Stream summary', {
                    totalChunks: chunkIndex,
                    extractedTextLength: text.length,
                    extractedTextPreview: text.substring(0, 100)
                });

<<<<<<< HEAD
=======
>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)
=======
>>>>>>> aeee250 (In a working state with the device list working)
                return text.replace(/\s{2,}/g, ' ').trim();
            }

            // Non-stream fallback
            const aiResponse = AnthropicClient.normalizeContent(response.content);

            const totalTime = Date.now() - overallStartTime;
            this.logger.info(`✅ Anthropic response received in ${totalTime}ms`, {
                model: this.config.anthropic.model,
                duration: `${totalTime}ms`,
                responseLength: aiResponse.length,
                response: aiResponse.substring(0, 100) + (aiResponse.length > 100 ? '...' : ''),
            });

            this.logger.debug('⏱️ Detailed timing breakdown:', {
                messageBuild: `${messageBuildTime}ms`,
                toolBinding: `${toolBindTime}ms`,
                apiCall: `${apiCallTime}ms`,
                total: `${totalTime}ms`
            });

            return aiResponse;
        } catch (error) {
<<<<<<< HEAD
<<<<<<< HEAD
            // Log full error details for debugging
            this.logger.error('❌ Anthropic query failed', {
                error: error.message,
                errorName: error.name,
                errorType: error.constructor.name,
                statusCode: error.status || error.statusCode,
                model: this.config.anthropic.model,
                prompt: prompt ? prompt.substring(0, 50) : '[conversation]',
            });

            // If error has response data, log it too
            if (error.response) {
                this.logger.error('❌ Anthropic API error details', {
                    status: error.response.status,
                    data: JSON.stringify(error.response.data).substring(0, 500)
                });
            }

=======
=======
            // Log full error details for debugging
>>>>>>> aeee250 (In a working state with the device list working)
            this.logger.error('❌ Anthropic query failed', {
                error: error.message,
                errorName: error.name,
                errorType: error.constructor.name,
                statusCode: error.status || error.statusCode,
                model: this.config.anthropic.model,
                prompt: prompt ? prompt.substring(0, 50) : '[conversation]',
            });
<<<<<<< HEAD
>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)
=======

            // If error has response data, log it too
            if (error.response) {
                this.logger.error('❌ Anthropic API error details', {
                    status: error.response.status,
                    data: JSON.stringify(error.response.data).substring(0, 500)
                });
            }

>>>>>>> aeee250 (In a working state with the device list working)
            throw error;
        }
    }

    /**
     * Check if Anthropic API key is configured
     *
     * @returns {Promise<boolean>} True if Anthropic is ready
     */
    async checkHealth() {
        try {
            if (!this.config.anthropic?.apiKey) {
                this.logger.warn('⚠️ Anthropic API key not configured', {
                    hint: 'Set ANTHROPIC_API_KEY environment variable'
                });
                return false;
            }

            // Simple test to verify API key is valid
            const testResponse = await this.client.invoke([
                new SystemMessage('You are a helpful assistant.'),
                new HumanMessage('Say "ok" if you can hear me.')
            ]);

            if (testResponse && testResponse.content) {
                this.logger.debug('✅ Anthropic health check passed', {
                    model: this.config.anthropic.model,
                });
                return true;
            }

            return false;
        } catch (error) {
            this.logger.error('❌ Anthropic health check failed', {error: error.message});
            return false;
        }
    }
}

// ============================================================================
// Backward Compatibility - Keep existing function exports
// ============================================================================

// Singleton instance for backward compatibility
let defaultClient = null;

function getDefaultClient() {
    if (!defaultClient) {
        defaultClient = new AnthropicClient(config, logger);
    }
    return defaultClient;
}

/**
 * @deprecated Use AnthropicClient class instead
 */
function createAnthropicClient() {
    return getDefaultClient().client;
}

/**
 * @deprecated Use AnthropicClient.query() instead
 */
async function queryAnthropic(prompt, options = {}) {
    return getDefaultClient().query(prompt, options);
}

/**
 * @deprecated Use AnthropicClient.checkHealth() instead
 */
async function checkAnthropicHealth() {
    return getDefaultClient().checkHealth();
}

export {
    queryAnthropic,
    checkAnthropicHealth,
    createAnthropicClient,
    // Also export utility functions as static methods are also available
};
