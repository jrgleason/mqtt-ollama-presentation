/**
<<<<<<< HEAD
 * Ollama AI Client using LangChain ChatOllama
 *
 * Migrated from manual ollama package to @langchain/ollama for:
 * - 60-90% performance improvement (eliminates per-request tool conversion)
 * - Framework-standard patterns (same as oracle app)
 * - Better maintainability (leverages LangChain's optimizations)
 *
 * API Surface (unchanged for backward compatibility):
 * - constructor(config, logger)
 * - query(prompt, options) -> Promise<string>
 * - checkHealth() -> Promise<boolean>
 * - static cleanNonEnglish(text) -> string
 */

import {ChatOllama} from '@langchain/ollama';
import {HumanMessage, AIMessage, SystemMessage, ToolMessage} from '@langchain/core/messages';
=======
 * Ollama AI Client (Class-based)
 *
 * Handles communication with local Ollama instance for AI inference.
 */

import {Ollama} from 'ollama';
>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)
import {logger} from './util/Logger.js';
import {config} from './config.js';
import {loadPrompt} from './util/prompt-loader.js';

export class OllamaClient {
    #client = null;
    // Phase 1: Query position tracking for diagnostics
    #queryCounter = 0;

    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
    }

    /**
     * Get the current query position in this session (1-indexed)
     * @returns {number} Query number (1st, 2nd, 3rd, etc.)
     */
    get queryPosition() {
        return this.#queryCounter;
    }

    /**
     * Reset the query counter (useful for testing or session resets)
     */
    resetQueryCounter() {
        this.#queryCounter = 0;
        this.logger.debug('Query counter reset');
    }

    /** Get or initialize Ollama client */
    get client() {
        if (!this.#client) {
<<<<<<< HEAD
            this.#client = new ChatOllama({
                baseUrl: this.config.ollama.baseUrl,
                model: this.config.ollama.model,
                temperature: this.config.ollama.temperature || 0.5,
                // Performance: Limit response length to prevent runaway generation
                // Increased from 250 to 350 to allow complete tool call JSON generation
                numPredict: 350,
                // Performance optimizations for voice interactions
                numCtx: this.config.ollama.numCtx || 4096,
                keepAlive: this.config.ollama.keepAlive !== undefined ? this.config.ollama.keepAlive : -1,
            });

            this.logger.debug('✅ ChatOllama client initialized', {
                baseUrl: this.config.ollama.baseUrl,
=======
            this.#client = new Ollama({
                host: this.config.ollama.baseUrl,
            });

            this.logger.debug('✅ Ollama client initialized', {
                host: this.config.ollama.baseUrl,
>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)
                model: this.config.ollama.model,
                numCtx: this.config.ollama.numCtx || 2048,
                temperature: this.config.ollama.temperature || 0.5,
                keepAlive: this.config.ollama.keepAlive !== undefined ? this.config.ollama.keepAlive : -1,
            });
        }
        return this.#client;
    }

    /**
<<<<<<< HEAD
     * Clean up non-English characters and thinking blocks that Qwen adds
     * Removes: <think>...</think> blocks, Chinese/Japanese/Korean characters
=======
     * Clean up non-English characters that Qwen sometimes adds
     * Removes Chinese/Japanese/Korean characters and surrounding punctuation
>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)
     * @param {string} text - Text to clean
     * @returns {string} Cleaned text
     */
    static cleanNonEnglish(text) {
<<<<<<< HEAD
        if (!text) return '';

        // Remove <think>...</think> blocks (qwen3 reasoning)
        let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '');

        // Remove Chinese/Japanese/Korean characters and punctuation
        cleaned = cleaned.replace(/[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF。，]/g, '');

        return cleaned.trim();
    }

    /**
     * Try to parse a text-based tool call from model output
     * Some Ollama models output tool calls as JSON text instead of using native tool_calls
     * Handles: raw JSON, JSON after <think> blocks, JSON with surrounding text
     * @param {string} content - Response content to check
     * @returns {Object|null} Parsed tool call {name, arguments} or null if not a tool call
     */
    static parseTextToolCall(content) {
        if (!content || typeof content !== 'string') return null;

        // First, strip <think>...</think> blocks that qwen3 models add
        let cleaned = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

        // Must contain "name" to be a potential tool call
        if (!cleaned.includes('"name"')) return null;

        // Find the first { and try to parse from there
        // Handle nested objects by finding matching braces
        const startIdx = cleaned.indexOf('{');
        if (startIdx === -1) return null;

        // Try to extract valid JSON by finding matching closing brace
        let braceCount = 0;
        let endIdx = -1;
        for (let i = startIdx; i < cleaned.length; i++) {
            if (cleaned[i] === '{') braceCount++;
            else if (cleaned[i] === '}') {
                braceCount--;
                if (braceCount === 0) {
                    endIdx = i;
                    break;
                }
            }
        }

        if (endIdx === -1) return null;

        const jsonStr = cleaned.substring(startIdx, endIdx + 1);

        try {
            const parsed = JSON.parse(jsonStr);
            // Validate it has the expected tool call structure
            if (parsed.name && (parsed.arguments || parsed.args)) {
                return {
                    name: parsed.name,
                    args: parsed.arguments || parsed.args || {},
                    id: `text-tool-${Date.now()}` // Generate an ID for the tool call
                };
            }
        } catch {
            // Not valid JSON, not a tool call
        }

        return null;
    }

    /**
     * Convert simple message objects to LangChain message format
     * @param {Array} messages - Array of {role, content} objects
     * @returns {Array} Array of LangChain message objects
     */
    static convertToLangChainMessages(messages) {
        return messages.map(msg => {
            switch (msg.role) {
                case 'system':
                    return new SystemMessage(msg.content);
                case 'user':
                    return new HumanMessage(msg.content);
                case 'assistant':
                    return new AIMessage(msg.content);
                case 'tool':
                    // Tool messages use ToolMessage with tool_call_id
                    return new ToolMessage({
                        content: msg.content,
                        tool_call_id: msg.tool_call_id
                    });
                default:
                    return new HumanMessage(msg.content);
            }
        });
=======
        return text.replace(/[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF。，]/g, '').trim();
>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)
    }

    /**
     * Send a prompt to Ollama and get AI response
     *
     * @param {string} prompt - The user's transcribed message
     * @param {Object} options - Optional configuration
     * @param {string} options.model - Model to use (overrides config)
     * @param {string} options.systemPrompt - System prompt for context
     * @param {Array} options.messages - Full conversation history (overrides prompt)
     * @param {Array} options.tools - Available tools for function calling
     * @param {Function} options.toolExecutor - Function to execute tool calls
     * @returns {Promise<string>} AI response text
     */
    async query(prompt, options = {}) {
        const model = options.model || this.config.ollama.model;
        // Use simplified prompt for small models - saves context space
        const systemPrompt = options.systemPrompt || loadPrompt('system/ollama-simple');

        // Phase 1: Increment and track query position
        this.#queryCounter++;
        const queryPosition = this.#queryCounter;

        try {
            this.logger.debug('🤖 Sending prompt to Ollama', {
                model,
                prompt: prompt || '[conversation]',
                queryPosition, // Phase 1: Track query position
                hasTools: !!(options.tools && options.tools.length > 0),
                toolCount: options.tools?.length || 0
            });

            const startTime = Date.now();

            // Use provided messages array or build simple single-turn conversation
            const messages = options.messages || [
                {role: 'system', content: systemPrompt},
                {role: 'user', content: prompt}
            ];

<<<<<<< HEAD
            // For qwen3 models, optionally append /no_think to disable thinking mode
            // This significantly speeds up response time (40s -> 2-5s) but may reduce accuracy
            // Controlled by OLLAMA_NO_THINK=true environment variable
            const isQwen3 = model.toLowerCase().includes('qwen3');
            const useNoThink = isQwen3 && this.config.ollama.noThink;
            if (useNoThink) {
                const lastUserIdx = messages.findLastIndex(m => m.role === 'user');
                if (lastUserIdx !== -1 && !messages[lastUserIdx].content.includes('/no_think')) {
                    messages[lastUserIdx] = {
                        ...messages[lastUserIdx],
                        content: messages[lastUserIdx].content + ' /no_think'
                    };
                    this.logger.debug('🔧 Added /no_think to user message (OLLAMA_NO_THINK=true)');
                }
            }

            // Convert to LangChain message objects
            let langChainMessages = OllamaClient.convertToLangChainMessages(messages);

            // Bind tools if provided (LangChain handles format conversion internally)
            let modelToUse = this.client;
            if (options.tools && options.tools.length > 0) {
                modelToUse = this.client.bindTools(options.tools);
                this.logger.debug('🔧 Tools bound to model', {
                    toolCount: options.tools.length,
                    toolNames: options.tools.map(t => t.name || t.lc_name)
                });
            }

            // Invoke the model
            const invokeStartTime = Date.now();
            let response = await modelToUse.invoke(langChainMessages);
            const invokeDuration = Date.now() - invokeStartTime;

            // Phase 1: Enhanced diagnostic logging for raw response
            const hasEmptyToolCallArray = !!response.tool_calls && response.tool_calls.length === 0;
            this.logger.debug('🔍 Raw model response', {
                queryPosition, // Phase 1: Which query in session
                invokeDuration: `${invokeDuration}ms`,
                hasContent: !!response.content,
                contentLength: response.content?.length || 0,
                contentPreview: response.content?.substring(0, 150) || '',
                hasToolCalls: !!response.tool_calls,
                toolCallsLength: response.tool_calls?.length || 0,
                hasEmptyToolCallArray, // Phase 1: Key diagnostic for empty array issue
                toolCallNames: response.tool_calls?.map(tc => tc.name) || [],
                hasToolExecutor: !!options.toolExecutor,
                // Phase 1: Log response metadata if available
                responseMetadata: response.response_metadata ? {
                    model: response.response_metadata.model,
                    done_reason: response.response_metadata.done_reason,
                    total_duration: response.response_metadata.total_duration,
                    eval_count: response.response_metadata.eval_count
                } : null
            });

            // Phase 4: Detect empty tool call array pattern and retry without tools
            const isEmptyToolCallResponse = hasEmptyToolCallArray && !response.content && options.tools?.length > 0;
            if (isEmptyToolCallResponse && options.toolExecutor) {
                this.logger.info('⚠️ Empty tool call array detected, retrying WITHOUT tools', {
                    queryPosition,
                    originalToolCount: options.tools.length
                });

                // Retry without tools - add guidance to answer directly
                const retryMessages = [...messages];
                const lastUserIdx = retryMessages.findLastIndex(m => m.role === 'user');
                if (lastUserIdx !== -1) {
                    const noThinkSuffix = useNoThink ? ' /no_think' : '';
                    retryMessages[lastUserIdx] = {
                        ...retryMessages[lastUserIdx],
                        content: retryMessages[lastUserIdx].content.replace(' /no_think', '') +
                            ' Answer directly without using any tools.' + noThinkSuffix
                    };
                }

                const retryLangChainMessages = OllamaClient.convertToLangChainMessages(retryMessages);
                const retryStartTime = Date.now();
                response = await this.client.invoke(retryLangChainMessages); // No tools bound
                const retryDuration = Date.now() - retryStartTime;

                this.logger.debug('🔍 Retry response (without tools)', {
                    queryPosition,
                    retryDuration: `${retryDuration}ms`,
                    hasContent: !!response.content,
                    contentLength: response.content?.length || 0,
                    contentPreview: response.content?.substring(0, 150) || ''
                });

                // Return the direct response from retry
                const aiResponse = OllamaClient.cleanNonEnglish(response.content);
                const totalDuration = Date.now() - startTime;
                this.logger.debug('✅ Ollama response (retry without tools)', {
                    model,
                    queryPosition,
                    duration: `${totalDuration}ms`,
                    responseLength: aiResponse.length,
                    response: aiResponse.substring(0, 100) + (aiResponse.length > 100 ? '...' : '')
                });
                return aiResponse;
            }

            // Check if the model wants to call a tool (native tool_calls or text-based)
            let toolCalls = response.tool_calls || [];
            let isTextBasedToolCall = false;

            // Fallback: Check if model output a text-based tool call (common with some Ollama models)
            if (toolCalls.length === 0 && response.content && options.toolExecutor) {
                const textToolCall = OllamaClient.parseTextToolCall(response.content);
                this.logger.debug('🔍 Text tool call parse result', {
                    parsed: textToolCall ? { name: textToolCall.name, hasArgs: !!textToolCall.args } : null
                });
                if (textToolCall) {
                    this.logger.debug('🔧 Detected text-based tool call', { name: textToolCall.name });
                    toolCalls = [textToolCall];
                    isTextBasedToolCall = true;
                }
            }

            if (toolCalls.length > 0 && options.toolExecutor) {
                this.logger.debug('🔧 AI requested tool calls', {
                    toolCount: toolCalls.length,
                    tools: toolCalls.map(tc => tc.name),
                    isTextBased: isTextBasedToolCall
                });

                // Execute each tool call and collect results
                const toolResultStrings = [];
                for (const toolCall of toolCalls) {
                    const toolName = toolCall.name;
                    const toolArgs = toolCall.args;

                    this.logger.debug(`🔧 Executing tool: ${toolName}`, toolArgs);

                    try {
                        const toolResult = await options.toolExecutor(toolName, toolArgs);

                        // Normalize tool result to string
                        let normalizedContent;
                        if (typeof toolResult === 'string') {
                            normalizedContent = toolResult;
                        } else if (Array.isArray(toolResult)) {
                            // MCP format: [text_content, artifacts_array]
                            normalizedContent = toolResult[0] || '';
                        } else if (typeof toolResult === 'object' && toolResult !== null) {
                            normalizedContent = JSON.stringify(toolResult);
                        } else {
                            normalizedContent = String(toolResult);
                        }

                        toolResultStrings.push({ name: toolName, result: normalizedContent, id: toolCall.id });
                    } catch (toolError) {
                        this.logger.error(`❌ Tool execution failed: ${toolName}`, {error: toolError.message});
                        toolResultStrings.push({
                            name: toolName,
                            result: `Error: ${toolError instanceof Error ? toolError.message : String(toolError)}`,
                            id: toolCall.id
                        });
                    }
                }

                // For Ollama models (especially smaller ones like qwen3), use simple follow-up approach
                // They don't properly understand ToolMessage format and will try to call tools again
                // Build a follow-up message with the tool result - keep it MINIMAL
                const toolResultSummary = toolResultStrings
                    .map(tr => tr.result)
                    .join(' ');

                // Find the original user question to include in follow-up
                // This prevents the model from confusing different questions in conversation history
                const lastUserIdx = messages.findLastIndex(m => m.role === 'user');
                const originalQuestion = lastUserIdx !== -1
                    ? messages[lastUserIdx].content.replace(' /no_think', '').trim()
                    : '';

                // Add /no_think for qwen3 models to speed up response
                const noThinkSuffix = useNoThink ? ' /no_think' : '';
                // Make the follow-up prompt very explicit about extracting facts
                // IMPORTANT: Don't give the model a "fallback" phrase - it will just use it every time
                const followUpMessage = new HumanMessage(
                    `${toolResultSummary}\n\nQuestion: ${originalQuestion}\n\nAnswer in 1 sentence using the information above.${noThinkSuffix}`
                );

                langChainMessages.push(followUpMessage);
                this.logger.debug('🔧 Sending tool result as follow-up message', {
                    resultLength: toolResultSummary.length,
                    originalQuestion: originalQuestion.substring(0, 50),
                    // Log full follow-up content for debugging
                    followUpContent: followUpMessage.content.substring(0, 300)
                });

                // Get final response WITHOUT tools bound - we already have the data
                // This prevents the model from trying to call tools again
                // TODO: Consider allowing refinement searches - see proposal add-search-refinement-support
                response = await this.client.invoke(langChainMessages);

                // Debug: log raw response before cleaning
                const rawContent = response.content || '';
                this.logger.debug('🔍 Raw Ollama response (before cleaning)', {
                    rawLength: rawContent.length,
                    hasThinkTags: rawContent.includes('<think>'),
                    preview: rawContent.substring(0, 200)
                });

                const aiResponse = OllamaClient.cleanNonEnglish(rawContent);
=======
            const chatOptions = {
                model,
                messages,
                stream: false,
            };

            // Add tools if provided
            if (options.tools && options.tools.length > 0) {
                chatOptions.tools = options.tools;
            }

            const response = await this.client.chat(chatOptions);

            const duration = Date.now() - startTime;

            // Check if the model wants to call a tool
            if (response.message.tool_calls && response.message.tool_calls.length > 0 && options.toolExecutor) {
                this.logger.debug('🔧 AI requested tool calls', {
                    toolCount: response.message.tool_calls.length,
                    tools: response.message.tool_calls.map(tc => tc.function.name)
                });

                // Execute each tool call
                const toolResults = [];
                for (const toolCall of response.message.tool_calls) {
                    const toolName = toolCall.function.name;
                    const toolArgs = toolCall.function.arguments;

                    this.logger.debug(`🔧 Executing tool: ${toolName}`, toolArgs);
                    const toolResult = await options.toolExecutor(toolName, toolArgs);

                    toolResults.push({
                        role: 'tool',
                        content: toolResult
                    });
                }

                // Send tool results back to the model for final response
                const finalMessages = [
                    ...messages,
                    response.message,
                    ...toolResults
                ];

                const finalResponse = await this.client.chat({
                    model,
                    messages: finalMessages,
                    stream: false,
                });

                const aiResponse = OllamaClient.cleanNonEnglish(finalResponse.message.content);
>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)

                this.logger.debug('✅ Ollama response (with tools) received', {
                    model,
                    queryPosition, // Phase 1: Track position
                    duration: `${Date.now() - startTime}ms`,
                    response: aiResponse.substring(0, 100) + (aiResponse.length > 100 ? '...' : ''),
                });

                return aiResponse;
            }

            // No tool calls, return direct response
<<<<<<< HEAD
            const aiResponse = OllamaClient.cleanNonEnglish(response.content);

            const duration = Date.now() - startTime;
=======
            const aiResponse = OllamaClient.cleanNonEnglish(response.message.content);

>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)
            this.logger.debug('✅ Ollama response received', {
                model,
                queryPosition, // Phase 1: Track position
                duration: `${duration}ms`,
                responseLength: aiResponse.length,
                response: aiResponse.substring(0, 100) + (aiResponse.length > 100 ? '...' : ''),
            });

            return aiResponse;
        } catch (error) {
            this.logger.error('❌ Ollama query failed', {
                error: error.message,
                model,
                queryPosition, // Phase 1: Track position in errors too
                prompt: prompt?.substring(0, 50) || '[conversation]',
            });
            throw error;
        }
    }

    /**
     * Check if Ollama is available and the model is downloaded
     *
     * @returns {Promise<boolean>} True if Ollama is ready
     */
    async checkHealth() {
        try {
<<<<<<< HEAD
            // Use fetch to check Ollama API directly
            const response = await fetch(`${this.config.ollama.baseUrl}/api/tags`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000),
            });

            if (!response.ok) {
                this.logger.warn('⚠️ Ollama API not responding', {
                    baseUrl: this.config.ollama.baseUrl,
                    status: response.status
                });
                return false;
            }

            const data = await response.json();
            const models = data.models || [];
            const modelExists = models.some(m => m.name === this.config.ollama.model);
=======
            // List available models
            const models = await this.client.list();
            const modelExists = models.models.some(m => m.name === this.config.ollama.model);
>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)

            if (!modelExists) {
                this.logger.warn('⚠️ Ollama model not found', {
                    model: this.config.ollama.model,
<<<<<<< HEAD
                    availableModels: models.map(m => m.name),
=======
                    availableModels: models.models.map(m => m.name),
>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)
                });
                return false;
            }

            this.logger.debug('✅ Ollama health check passed', {
                model: this.config.ollama.model,
<<<<<<< HEAD
                modelCount: models.length,
=======
                modelCount: models.models.length,
>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)
            });
            return true;
        } catch (error) {
            this.logger.error('❌ Ollama health check failed', {error: error.message});
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
        defaultClient = new OllamaClient(config, logger);
    }
    return defaultClient;
}

/**
 * @deprecated Use OllamaClient class instead
 */
function createOllamaClient() {
    return getDefaultClient().client;
}

/**
 * @deprecated Use OllamaClient.query() instead
 */
async function queryOllama(prompt, options = {}) {
    return getDefaultClient().query(prompt, options);
}

/**
 * @deprecated Use OllamaClient.checkHealth() instead
 */
async function checkOllamaHealth() {
    return getDefaultClient().checkHealth();
}

export {
    queryOllama,
    checkOllamaHealth,
    createOllamaClient,
};
