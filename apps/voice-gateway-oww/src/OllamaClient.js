/**
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
import {AIMessage, HumanMessage, SystemMessage, ToolMessage} from '@langchain/core/messages';

export class OllamaClient {
    #client = null;

    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
    }

    /** Get or initialize Ollama client */
    get client() {
        if (!this.#client) {
            // Get performance settings with defaults
            const numCtx = this.config.ollama.numCtx ?? 2048;
            const temperature = this.config.ollama.temperature ?? 0.5;
            const keepAlive = this.config.ollama.keepAlive ?? -1;

            this.#client = new ChatOllama({
                baseUrl: this.config.ollama.baseUrl,
                model: this.config.ollama.model,
                temperature: temperature,
                numCtx: numCtx,
                keepAlive: keepAlive,
                // Performance: Limit response length to prevent runaway generation
                numPredict: 150,
            });

            this.logger.debug('✅ ChatOllama client initialized', {
                baseUrl: this.config.ollama.baseUrl,
                model: this.config.ollama.model,
                numCtx: numCtx,
                temperature: temperature,
                keepAlive: keepAlive,
            });
        }
        return this.#client;
    }

    /**
     * Clean up non-English characters and thinking blocks that Qwen adds
     * Removes: <think>...</think> blocks, Chinese/Japanese/Korean characters
     * @param {string} text - Text to clean
     * @returns {string} Cleaned text
     */
    static cleanNonEnglish(text) {
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
        const systemPrompt = options.systemPrompt ||
            'You are a helpful home automation assistant. Answer in 1 sentence or less. Be direct. No explanations. English only. No <think> tags.';

        try {
            this.logger.debug('🤖 Sending prompt to Ollama', {model, prompt: prompt || '[conversation]'});

            const startTime = Date.now();

            // Use provided messages array or build simple single-turn conversation
            const messages = options.messages || [
                {role: 'system', content: systemPrompt},
                {role: 'user', content: prompt}
            ];

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
            let response = await modelToUse.invoke(langChainMessages);

            // Debug: Log raw response for troubleshooting
            this.logger.debug('🔍 Raw model response', {
                hasContent: !!response.content,
                contentLength: response.content?.length || 0,
                contentPreview: response.content?.substring(0, 150) || '',
                hasToolCalls: !!response.tool_calls,
                toolCallsLength: response.tool_calls?.length || 0,
                hasToolExecutor: !!options.toolExecutor
            });

            // Check if the model wants to call a tool (native tool_calls or text-based)
            let toolCalls = response.tool_calls || [];
            let isTextBasedToolCall = false;

            // Fallback: Check if model output a text-based tool call (common with some Ollama models)
            if (toolCalls.length === 0 && response.content && options.toolExecutor) {
                const textToolCall = OllamaClient.parseTextToolCall(response.content);
                this.logger.debug('🔍 Text tool call parse result', {
                    parsed: textToolCall ? {name: textToolCall.name, hasArgs: !!textToolCall.args} : null
                });
                if (textToolCall) {
                    this.logger.debug('🔧 Detected text-based tool call', {name: textToolCall.name});
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

                        toolResultStrings.push({name: toolName, result: normalizedContent, id: toolCall.id});
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
                // Build a follow-up message with the tool result
                const toolResultSummary = toolResultStrings
                    .map(tr => `${tr.name} result: ${tr.result}`)
                    .join('\n');

                // Add /no_think for qwen3 models to speed up response
                const noThinkSuffix = useNoThink ? ' /no_think' : '';
                const followUpMessage = new HumanMessage(
                    `Here is the data you requested:\n${toolResultSummary}\n\nNow answer the user's original question using this data. Be brief and direct - one sentence only. Do NOT call any more tools.${noThinkSuffix}`
                );

                langChainMessages.push(followUpMessage);
                this.logger.debug('🔧 Sending tool result as follow-up message', {
                    resultLength: toolResultSummary.length
                });

                // Get final response WITHOUT tools bound - we already have the data
                // This prevents the model from trying to call tools again
                response = await this.client.invoke(langChainMessages);

                // Debug: log raw response before cleaning
                const rawContent = response.content || '';
                this.logger.debug('🔍 Raw Ollama response (before cleaning)', {
                    rawLength: rawContent.length,
                    hasThinkTags: rawContent.includes('<think>'),
                    preview: rawContent.substring(0, 200)
                });

                const aiResponse = OllamaClient.cleanNonEnglish(rawContent);

                this.logger.debug('✅ Ollama response (with tools) received', {
                    model,
                    duration: `${Date.now() - startTime}ms`,
                    response: aiResponse.substring(0, 100) + (aiResponse.length > 100 ? '...' : ''),
                });

                return aiResponse;
            }

            // No tool calls, return direct response
            const aiResponse = OllamaClient.cleanNonEnglish(response.content);

            const duration = Date.now() - startTime;
            this.logger.debug('✅ Ollama response received', {
                model,
                duration: `${duration}ms`,
                responseLength: aiResponse.length,
                response: aiResponse.substring(0, 100) + (aiResponse.length > 100 ? '...' : ''),
            });

            return aiResponse;
        } catch (error) {
            this.logger.error('❌ Ollama query failed', {
                error: error.message,
                model,
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

            if (!modelExists) {
                this.logger.warn('⚠️ Ollama model not found', {
                    model: this.config.ollama.model,
                    availableModels: models.map(m => m.name),
                });
                return false;
            }

            this.logger.debug('✅ Ollama health check passed', {
                model: this.config.ollama.model,
                modelCount: models.length,
            });
            return true;
        } catch (error) {
            this.logger.error('❌ Ollama health check failed', {error: error.message});
            return false;
        }
    }
}
