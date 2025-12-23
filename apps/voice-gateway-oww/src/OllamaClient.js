/**
 * Ollama AI Client (Class-based)
 *
 * Handles communication with local Ollama instance for AI inference.
 */

import {Ollama} from 'ollama';
import {logger} from './util/Logger.js';
import {config} from './config.js';

export class OllamaClient {
    #client = null;

    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
    }

    /** Get or initialize Ollama client */
    get client() {
        if (!this.#client) {
            this.#client = new Ollama({
                host: this.config.ollama.baseUrl,
            });

            this.logger.debug('✅ Ollama client initialized', {
                host: this.config.ollama.baseUrl,
                model: this.config.ollama.model,
            });
        }
        return this.#client;
    }

    /**
     * Clean up non-English characters that Qwen sometimes adds
     * Removes Chinese/Japanese/Korean characters and surrounding punctuation
     * @param {string} text - Text to clean
     * @returns {string} Cleaned text
     */
    static cleanNonEnglish(text) {
        return text.replace(/[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF。，]/g, '').trim();
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

                this.logger.debug('✅ Ollama response (with tools) received', {
                    model,
                    duration: `${Date.now() - startTime}ms`,
                    response: aiResponse.substring(0, 100) + (aiResponse.length > 100 ? '...' : ''),
                });

                return aiResponse;
            }

            // No tool calls, return direct response
            const aiResponse = OllamaClient.cleanNonEnglish(response.message.content);

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
            // List available models
            const models = await this.client.list();
            const modelExists = models.models.some(m => m.name === this.config.ollama.model);

            if (!modelExists) {
                this.logger.warn('⚠️ Ollama model not found', {
                    model: this.config.ollama.model,
                    availableModels: models.models.map(m => m.name),
                });
                return false;
            }

            this.logger.debug('✅ Ollama health check passed', {
                model: this.config.ollama.model,
                modelCount: models.models.length,
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
