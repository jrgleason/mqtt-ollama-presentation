/**
 * Anthropic AI Client (using LangChain.js)
 *
 * Handles communication with Anthropic's Claude API for AI inference.
 */

import {ChatAnthropic} from '@langchain/anthropic';
import {HumanMessage, SystemMessage, AIMessage, ToolMessage} from '@langchain/core/messages';
import {logger} from './logger.js';
import {config} from './config.js';

/**
 * Create and configure Anthropic client using LangChain
 */
function createAnthropicClient() {
    if (!config.anthropic.apiKey) {
        throw new Error('ANTHROPIC_API_KEY is required but not set in environment variables');
    }

    const client = new ChatAnthropic({
        apiKey: config.anthropic.apiKey,
        model: config.anthropic.model,
        temperature: 0.7,
        maxTokens: 1024,
    });

    logger.debug('✅ Anthropic client initialized', {
        model: config.anthropic.model,
        hasApiKey: !!config.anthropic.apiKey,
    });

    return client;
}

/**
 * Convert tool definition from Ollama format to LangChain/Anthropic format
 * @param {Object} tool - Tool in Ollama format
 * @returns {Object} Tool in LangChain format
 */
function convertToolToLangChainFormat(tool) {
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

/**
 * Normalize Anthropic (LangChain) content into a plain string
 * Handles cases where content is a string, array of content blocks, or an object
 * @param {any} content
 * @returns {string}
 */
function normalizeAnthropicContent(content) {
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
function extractTextOnly(content) {
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
async function queryAnthropic(prompt, options = {}) {
    let client = createAnthropicClient();
    const systemPrompt = options.systemPrompt ||
        'You are a helpful home automation assistant. Answer in 1 sentence or less. Be direct. No explanations. English only.';

    const onToken = options.onToken; // optional streaming callback

    try {
        const overallStartTime = Date.now();
        logger.debug('🤖 Sending prompt to Anthropic', {model: config.anthropic.model, prompt: prompt || '[conversation]'});

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
        logger.debug(`⏱️ Message building took ${messageBuildTime}ms`);

        // Convert tools to Anthropic format and bind to model if provided
        const toolBindStart = Date.now();
        if (options.tools && options.tools.length > 0) {
            const langchainTools = options.tools.map(convertToolToLangChainFormat);
            logger.debug('🔧 Tools provided', {
                toolCount: langchainTools.length,
                tools: langchainTools.map(t => t.name)
            });

            // Bind tools to the model using .bindTools()
            client = client.bindTools(langchainTools);
        }
        const toolBindTime = Date.now() - toolBindStart;
        logger.debug(`⏱️ Tool binding took ${toolBindTime}ms`);

        // First invoke to determine tool calls (don’t stream here to avoid tool_use content in TTS)
        logger.debug('📡 Calling Anthropic API (initial, non-streaming)...');
        const apiCallStart = Date.now();
        const response = await client.invoke(messages);
        const apiCallTime = Date.now() - apiCallStart;
        logger.debug(`⏱️ Anthropic initial call took ${apiCallTime}ms`);

        // Check if the model wants to call tools
        if (response.tool_calls && response.tool_calls.length > 0 && options.toolExecutor) {
            logger.debug('🔧 AI requested tool calls', {
                toolCount: response.tool_calls.length,
                tools: response.tool_calls.map(tc => tc.name)
            });

            // Execute each tool call and create ToolMessages
            const toolExecutionStart = Date.now();
            const toolMessages = [];
            for (const toolCall of response.tool_calls) {
                const toolName = toolCall.name;
                const toolArgs = toolCall.args;

                logger.debug(`🔧 Executing tool: ${toolName}`, toolArgs);
                const singleToolStart = Date.now();
                const toolResult = await options.toolExecutor(toolName, toolArgs);
                const singleToolTime = Date.now() - singleToolStart;
                logger.debug(`⏱️ Tool "${toolName}" execution took ${singleToolTime}ms`);

                // Create a proper ToolMessage with the tool_call_id
                toolMessages.push(new ToolMessage({
                    content: toolResult,
                    tool_call_id: toolCall.id
                }));
            }
            const toolExecutionTime = Date.now() - toolExecutionStart;
            logger.debug(`⏱️ All tool executions took ${toolExecutionTime}ms`);

            // Build final message array with tool results
            const finalMessages = [
                ...messages,
                response,
                ...toolMessages
            ];

            // Get final response from model
            if (onToken) {
                logger.debug('📡 Streaming final Anthropic response after tools...');
                const finalApiStart = Date.now();
                const stream = await client.stream(finalMessages);
                let finalText = '';
                let chunkIndex = 0;
                for await (const chunk of stream) {
                    chunkIndex++;
                    const c = chunk?.content;
                    // Debug: log content block types for first few chunks
                    if (chunkIndex <= 3) {
                        if (Array.isArray(c)) {
                            logger.debug('🔎 Stream chunk types', {idx: chunkIndex, types: c.map(p => p && p.type)});
                        } else {
                            logger.debug('🔎 Stream chunk (non-array)', {idx: chunkIndex, kind: typeof c});
                        }
                    }
                    const piece = extractTextOnly(c);
                    if (piece) {
                        onToken(piece);
                        // Add a space before concatenating to avoid word glue, then trim
                        finalText += (finalText && !finalText.endsWith(' ') ? ' ' : '') + piece;
                    }
                }
                const finalApiTime = Date.now() - finalApiStart;
                logger.debug(`⏱️ Final Anthropic streaming took ${finalApiTime}ms`);
                const totalTime = Date.now() - overallStartTime;
                const normalized = finalText.replace(/\s{2,}/g, ' ').trim();
                logger.info(`✅ Anthropic response (with tools, streamed) received in ${totalTime}ms`, {
                    model: config.anthropic.model,
                    duration: `${totalTime}ms`,
                    responseLength: normalized.length,
                });
                return normalized;
            } else {
                logger.debug('📡 Calling Anthropic API for final response after tools (non-streaming)...');
                const finalApiStart = Date.now();
                const finalResponse = await client.invoke(finalMessages);
                const finalApiTime = Date.now() - finalApiStart;
                logger.debug(`⏱️ Final Anthropic API call took ${finalApiTime}ms`);

                const aiResponse = normalizeAnthropicContent(finalResponse.content);

                const totalTime = Date.now() - overallStartTime;
                logger.info(`✅ Anthropic response (with tools) received in ${totalTime}ms`, {
                    model: config.anthropic.model,
                    duration: `${totalTime}ms`,
                    responseLength: aiResponse.length,
                });

                logger.debug('⏱️ Detailed timing breakdown:', {
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
            logger.debug('📡 Streaming Anthropic response (no tools)...');
            const stream = await client.stream(messages);
            let text = '';
            let chunkIndex = 0;
            for await (const chunk of stream) {
                chunkIndex++;
                const c = chunk?.content;
                if (chunkIndex <= 3) {
                    if (Array.isArray(c)) {
                        logger.debug('🔎 Stream chunk types', {idx: chunkIndex, types: c.map(p => p && p.type)});
                    } else {
                        logger.debug('🔎 Stream chunk (non-array)', {idx: chunkIndex, kind: typeof c});
                    }
                }
                const piece = extractTextOnly(c);
                if (piece) {
                    onToken(piece);
                    text += (text && !text.endsWith(' ') ? ' ' : '') + piece;
                }
            }
            return text.replace(/\s{2,}/g, ' ').trim();
        }

        // Non-stream fallback
        const aiResponse = normalizeAnthropicContent(response.content);

        const totalTime = Date.now() - overallStartTime;
        logger.info(`✅ Anthropic response received in ${totalTime}ms`, {
            model: config.anthropic.model,
            duration: `${totalTime}ms`,
            responseLength: aiResponse.length,
            response: aiResponse.substring(0, 100) + (aiResponse.length > 100 ? '...' : ''),
        });

        logger.debug('⏱️ Detailed timing breakdown:', {
            messageBuild: `${messageBuildTime}ms`,
            toolBinding: `${toolBindTime}ms`,
            apiCall: `${apiCallTime}ms`,
            total: `${totalTime}ms`
        });

        return aiResponse;
    } catch (error) {
        logger.error('❌ Anthropic query failed', {
            error: error.message,
            model: config.anthropic.model,
            prompt: prompt ? prompt.substring(0, 50) : '[conversation]',
        });
        throw error;
    }
}

/**
 * Check if Anthropic API key is configured
 *
 * @returns {Promise<boolean>} True if Anthropic is ready
 */
async function checkAnthropicHealth() {
    try {
        if (!config.anthropic.apiKey) {
            logger.warn('⚠️ Anthropic API key not configured', {
                hint: 'Set ANTHROPIC_API_KEY environment variable'
            });
            return false;
        }

        // Simple test to verify API key is valid
        const client = createAnthropicClient();
        const testResponse = await client.invoke([
            new SystemMessage('You are a helpful assistant.'),
            new HumanMessage('Say "ok" if you can hear me.')
        ]);

        if (testResponse && testResponse.content) {
            logger.debug('✅ Anthropic health check passed', {
                model: config.anthropic.model,
            });
            return true;
        }

        return false;
    } catch (error) {
        logger.error('❌ Anthropic health check failed', {error: error.message});
        return false;
    }
}

export {queryAnthropic, checkAnthropicHealth, createAnthropicClient};
