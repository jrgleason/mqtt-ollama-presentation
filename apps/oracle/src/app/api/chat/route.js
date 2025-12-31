import {createOllamaClient} from '../../../lib/ollama/client.js';
import {createAnthropicClient} from '../../../lib/anthropic/client.js';
import {createCalculatorTool} from '../../../lib/langchain/tools/calculator-tool.js';
import {initializeMCPIntegration, shutdownMCPClient} from '../../../lib/mcp/integration.js';
import {AIMessage, HumanMessage, SystemMessage, ToolMessage} from '@langchain/core/messages';

export const runtime = 'nodejs';

// Global MCP client instance (reused across requests for performance)
let globalMCPClient = null;
let globalMCPTools = [];

/**
 * Convert raw message objects to LangChain BaseMessage instances
 */
function convertToLangChainMessages(messages) {
    return messages.map(msg => {
        if (msg.role === 'system') {
            return new SystemMessage(msg.content);
        } else if (msg.role === 'user') {
            return new HumanMessage(msg.content);
        } else if (msg.role === 'assistant') {
            // AIMessage with optional tool_calls
            return new AIMessage({
                content: msg.content || '',
                tool_calls: msg.tool_calls || []
            });
        } else if (msg.role === 'tool') {
            return new ToolMessage({
                content: msg.content,
                tool_call_id: msg.tool_call_id
            });
        }
        // Fallback for unknown message types
        return new HumanMessage(msg.content || '');
    });
}

export async function POST(req) {
    try {
        const {messages, model: selectedModel} = await req.json();

        const isDebug = process.env.NODE_ENV !== 'production' || process.env.LOG_LEVEL === 'debug';
        const aiProvider = process.env.AI_PROVIDER || 'anthropic'; // Default to anthropic

        // ALWAYS log AI provider selection (even in production)
        console.log('═══════════════════════════════════════════════════════════');
        console.log('🤖 AI PROVIDER DEBUG');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('process.env.AI_PROVIDER:', process.env.AI_PROVIDER);
        console.log('Resolved aiProvider:', aiProvider);
        console.log('Selected model from request:', selectedModel);
        console.log('Using:', aiProvider === 'anthropic' ? 'ANTHROPIC ☁️' : 'OLLAMA 🏠');
        console.log('═══════════════════════════════════════════════════════════');

        if (isDebug) {
            console.log('[chat/route] ========== REQUEST DEBUG START ==========');
            console.log('[chat/route] AI Provider:', aiProvider);
            console.log('[chat/route] Selected model from request:', selectedModel);
            console.log('[chat/route] Environment variables:', {
                AI_PROVIDER: process.env.AI_PROVIDER,
                OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
                OLLAMA_MODEL: process.env.OLLAMA_MODEL,
                ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
                ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? '***' + process.env.ANTHROPIC_API_KEY.slice(-4) : 'NOT SET',
            });
            console.log('[chat/route] ========== REQUEST DEBUG END ==========');
        }

        if (!messages || !Array.isArray(messages)) {
            return new Response(
                JSON.stringify({error: 'Messages array is required'}),
                {
                    status: 400,
                    headers: {'Content-Type': 'application/json'},
                },
            );
        }

        // Create model based on AI_PROVIDER
        let model;
        if (aiProvider === 'anthropic') {
            model = createAnthropicClient(0.1, selectedModel);
            if (isDebug) {
                console.log('[chat/route] Created Anthropic model with:', {temperature: 0.1, selectedModel});
            }
        } else {
            model = createOllamaClient(0.1, selectedModel);
            if (isDebug) {
                console.log('[chat/route] Created Ollama model with:', {temperature: 0.1, selectedModel});
            }

            // Test Ollama connectivity
            if (isDebug) {
                try {
                    const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
                    console.log('[chat/route] Testing Ollama connectivity at:', baseUrl);
                    const testResponse = await fetch(`${baseUrl}/api/tags`, {
                        method: 'GET',
                        signal: AbortSignal.timeout(5000),
                    });
                    const testData = await testResponse.json();
                    console.log('[chat/route] Ollama is reachable! Available models:', testData.models?.map(m => m.name).join(', ') || 'none');
                } catch (connectError) {
                    console.error('[chat/route] ⚠️ WARNING: Cannot reach Ollama:', connectError.message);
                }
            }
        }

        // Initialize MCP client and get tools (only once per process)
        if (!globalMCPClient) {
            if (isDebug) {
                console.log('[chat/route] Initializing MCP integration...');
            }
            try {
                const { mcpClient, tools: mcpTools } = await initializeMCPIntegration({ debug: isDebug });
                globalMCPClient = mcpClient;
                globalMCPTools = mcpTools;
                if (isDebug) {
                    console.log('[chat/route] MCP tools discovered:', mcpTools.map(t => t.lc_name || t.name));
                }
            } catch (error) {
                console.error('[chat/route] Failed to initialize MCP integration:', error);
                // Fallback: Continue without MCP tools
                globalMCPTools = [];
            }
        }

        // Create tools: MCP tools + custom tools
        const tools = [
            ...globalMCPTools,
            createCalculatorTool(),
        ];

        // Bind tools to the model
        const modelWithTools = model.bindTools(tools);

        // Prepare messages with system prompt
        const systemMessage = {
            role: 'system',
            content: `You are a helpful home automation assistant.

IMPORTANT RULES:
1. When user asks to list devices, you MUST call the list_zwave_devices tool. DO NOT make up device names.
2. When user asks to control a device, you MUST:
   a. First call list_zwave_devices to get exact device names
   b. Then call control_zwave_device with the EXACT name from the list
3. When user asks about sensor data (temperature, etc), use get_device_sensor_data with the device name.
4. NEVER invent or guess device names. Always use list_zwave_devices first.
5. For greetings or general questions, respond normally without tools.
6. list_zwave_devices takes NO parameters - just call it directly.`
        };

        const allMessages = [systemMessage, ...messages];

        // Convert to LangChain message objects
        const langChainMessages = convertToLangChainMessages(allMessages);

        const encoder = new TextEncoder();
        const readableStream = new ReadableStream({
            async start(controller) {
                try {
                    let currentMessages = langChainMessages;
                    let response = await modelWithTools.invoke(currentMessages);
                    const maxIterations = 5; // Prevent infinite loops
                    let iteration = 0;

                    // Keep processing tool calls until the model stops requesting tools
                    while (response.tool_calls && response.tool_calls.length > 0 && iteration < maxIterations) {
                        iteration++;

                        // Execute all tool calls in this iteration
                        const toolResults = [];

                        for (const toolCall of response.tool_calls) {
                            const tool = tools.find(t => t.name === toolCall.name);
                            if (tool) {
                                // Show tool usage
                                const toolData = `data: ${JSON.stringify({
                                    type: 'tool_start',
                                    content: `🔧 Using tool: ${toolCall.name}\n`
                                })}\n\n`;
                                controller.enqueue(encoder.encode(toolData));

                                // Execute the tool
                                let toolResult;
                                try {
                                    toolResult = await tool.func(toolCall.args);

                                    // Normalize tool result to string (LangChain requires string content)
                                    // MCP tools may return [text, artifacts] arrays - extract just the text
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

                                    toolResults.push({
                                        role: 'tool',
                                        content: normalizedContent,
                                        tool_call_id: toolCall.id
                                    });
                                } catch (toolError) {
                                    console.error(`Error executing tool "${toolCall.name}":`, toolError);
                                    // Add error as tool result so we maintain 1:1 correspondence
                                    toolResults.push({
                                        role: 'tool',
                                        content: `Error: ${toolError instanceof Error ? toolError.message : String(toolError)}`,
                                        tool_call_id: toolCall.id
                                    });
                                }
                            } else {
                                // Unknown tool - add placeholder result to maintain correspondence
                                console.warn(`Unknown tool called: ${toolCall.name}`);
                                toolResults.push({
                                    role: 'tool',
                                    content: `Error: Unknown tool "${toolCall.name}"`,
                                    tool_call_id: toolCall.id
                                });
                            }
                        }

                        // Validate tool calls and results match
                        if (isDebug) {
                            console.log('[chat/route] Tool calls count:', response.tool_calls.length);
                            console.log('[chat/route] Tool results count:', toolResults.length);
                            console.log('[chat/route] Tool calls:', JSON.stringify(response.tool_calls, null, 2));
                            console.log('[chat/route] Tool results:', JSON.stringify(toolResults, null, 2));
                        }

                        // Ensure we have a tool result for every tool call
                        if (response.tool_calls.length !== toolResults.length) {
                            console.error('[chat/route] Tool call/result mismatch! Adding placeholder results...');
                            // Add placeholder results for missing tool calls
                            while (toolResults.length < response.tool_calls.length) {
                                const missingIndex = toolResults.length;
                                const missingCall = response.tool_calls[missingIndex];
                                toolResults.push({
                                    role: 'tool',
                                    content: `Error: Tool execution failed for "${missingCall.name}"`,
                                    tool_call_id: missingCall.id
                                });
                            }
                        }

                        // Add assistant message with tool calls and tool results to conversation
                        currentMessages = [
                            ...currentMessages,
                            new AIMessage({
                                content: response.content || '',
                                tool_calls: response.tool_calls
                            }),
                            ...toolResults.map(tr => new ToolMessage({
                                content: tr.content,
                                tool_call_id: tr.tool_call_id
                            }))
                        ];

                        // Get next response from model (might have more tool calls)
                        try {
                            response = await modelWithTools.invoke(currentMessages);
                        } catch (invokeError) {
                            // Handle model-specific tool calling errors gracefully
                            console.error('[chat/route] Error invoking model with tool results:', invokeError);

                            // Check if this is a tool call mismatch error
                            if (invokeError.message && invokeError.message.includes('mismatch')) {
                                // Try without tools as fallback
                                if (isDebug) {
                                    console.log('[chat/route] Retrying without tool binding...');
                                }
                                const plainModel = aiProvider === 'anthropic'
                                    ? createAnthropicClient(0.1, selectedModel)
                                    : createOllamaClient(0.1, selectedModel);
                                response = await plainModel.invoke(currentMessages);
                            } else {
                                throw invokeError;
                            }
                        }
                    }

                    // Final response (no more tool calls) - stream token by token for better UX
                    if (response.content) {
                        // If response already has content from invoke, send it
                        const data = `data: ${JSON.stringify({
                            type: 'content',
                            content: response.content
                        })}\n\n`;
                        controller.enqueue(encoder.encode(data));
                    } else {
                        // Stream the final response token by token
                        try {
                            const stream = await model.stream(currentMessages);

                            for await (const chunk of stream) {
                                if (chunk.content) {
                                    const data = `data: ${JSON.stringify({
                                        type: 'content',
                                        content: chunk.content
                                    })}\n\n`;
                                    controller.enqueue(encoder.encode(data));
                                }
                            }
                        } catch (streamError) {
                            console.error('[chat/route] Streaming error, falling back to non-streamed response:', streamError);
                            // Fallback: if streaming fails, invoke and send complete response
                            const fallbackResponse = await model.invoke(currentMessages);
                            if (fallbackResponse.content) {
                                const data = `data: ${JSON.stringify({
                                    type: 'content',
                                    content: fallbackResponse.content
                                })}\n\n`;
                                controller.enqueue(encoder.encode(data));
                            }
                        }
                    }

                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({type: 'done'})}\n\n`));
                    controller.close();
                } catch (error) {
                    console.error('Streaming error:', error);
                    const errorChunk = `data: ${JSON.stringify({
                        type: 'error',
                        content: 'Sorry, I encountered an error. Please try again.',
                    })}\n\n`;
                    controller.enqueue(encoder.encode(errorChunk));
                    controller.close();
                }
            },
        });

        return new Response(readableStream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Cache-Control',
            },
        });
    } catch (error) {
        console.error('Chat API error:', error);

        return new Response(
            JSON.stringify({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error',
            }),
            {
                status: 500,
                headers: {'Content-Type': 'application/json'},
            },
        );
    }
}
