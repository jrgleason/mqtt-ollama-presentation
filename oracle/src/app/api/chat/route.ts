import { NextRequest } from 'next/server';
import { createToolCallingAgent } from 'langchain/agents';
import { AgentExecutor } from 'langchain/agents';
import {
    ChatPromptTemplate,
    SystemMessagePromptTemplate,
    HumanMessagePromptTemplate,
    MessagesPlaceholder
} from '@langchain/core/prompts';
import { createOllamaClient } from '@/lib/ollama/client';
import {
    createDeviceListTool,
    createDeviceControlTool,
    createCalculatorTool
} from '@/lib/langchain/tools';
import type { DynamicTool } from '@langchain/core/tools';

// Define the runtime as 'nodejs'
export const runtime = 'nodejs';

// Main API Route Handler
export async function POST(req: NextRequest) {
    try {
        // Parse request body
        const { messages } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return new Response(
                JSON.stringify({ error: 'Messages array is required' }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                }
            );
        }

        // Create Ollama client (replace with actual version if needed)
        const model = createOllamaClient(0.1);

        // Create LangChain tools (typed for better clarity)
        const tools: DynamicTool[] = [
            createDeviceListTool(),
            createDeviceControlTool(),
            createCalculatorTool(),
        ];

        // Wrap tools with logging and type-safe function wrapping
        const wrappedTools = tools.map((tool) => {
            const originalFunc = tool.func as (input: string) => Promise<unknown>;

            tool.func = async (input: string) => {
                try {
                    console.log(`[tool] CALL ${tool.name} input:`, input);
                    const out = await originalFunc(input);
                    console.log(`[tool] RESULT ${tool.name} output:`, out);
                    return out;
                } catch (err) {
                    const message = err instanceof Error ? err.message : String(err);
                    console.error(`[tool] ERROR ${tool.name}:`, message);
                    throw err;
                }
            };

            return tool;
        });

        // Build a chat prompt for the tool-calling agent with better system instructions
        const prompt = ChatPromptTemplate.fromMessages([
            SystemMessagePromptTemplate.fromTemplate(`You are a helpful home automation assistant. 
            
Only use tools when the user explicitly asks to:
- List devices or check device status
- Control devices (turn on/off, adjust settings)
- Perform calculations

For general conversation, greetings, or questions that don't require device interaction or calculations, respond directly without using any tools.`),
            new MessagesPlaceholder('chat_history'),
            HumanMessagePromptTemplate.fromTemplate('{input}'),
            new MessagesPlaceholder('agent_scratchpad'),
        ]);

        // Create the agent using the new tool-calling agent helper
        const agent = createToolCallingAgent({
            llm: model,
            tools: wrappedTools,
            prompt,
        });

        // Create an AgentExecutor from agent+tools
        const agentExecutor = AgentExecutor.fromAgentAndTools({
            agent,
            tools: wrappedTools,
            returnIntermediateSteps: false,
            verbose: true,
        });

        // Prepare input shape: pass chat history and use last message content as input
        const inputForChain = {
            input: messages[messages.length - 1]?.content ?? '',
            chat_history: messages.slice(0, -1),
        };

        // Create a streaming response with proper SSE format
        const encoder = new TextEncoder();
        const readableStream = new ReadableStream({
            async start(controller) {
                try {
                    // Stream the agent response
                    const stream = await agentExecutor.streamEvents(inputForChain, {
                        version: "v2",
                    });

                    let hasContent = false;

                    for await (const event of stream) {
                        // Handle LLM streaming tokens
                        if (event.event === "on_llm_stream" && event.data?.chunk?.content) {
                            hasContent = true;
                            const chunk = `data: ${JSON.stringify({ 
                                type: "content", 
                                content: event.data.chunk.content 
                            })}\n\n`;
                            controller.enqueue(encoder.encode(chunk));
                        }
                        // Handle tool calls
                        else if (event.event === "on_tool_start") {
                            const chunk = `data: ${JSON.stringify({ 
                                type: "tool_start", 
                                tool: event.name,
                                content: `\n🔧 Using ${event.name}...\n` 
                            })}\n\n`;
                            controller.enqueue(encoder.encode(chunk));
                        }
                        // Handle tool results
                        else if (event.event === "on_tool_end") {
                            const chunk = `data: ${JSON.stringify({ 
                                type: "tool_end", 
                                tool: event.name,
                                content: "" 
                            })}\n\n`;
                            controller.enqueue(encoder.encode(chunk));
                        }
                        // Handle final agent output if no streaming occurred
                        else if (event.event === "on_chain_end" && event.name === "AgentExecutor" && !hasContent) {
                            const output = event.data?.output?.output || event.data?.output || "";
                            if (output) {
                                const chunk = `data: ${JSON.stringify({ 
                                    type: "content", 
                                    content: output 
                                })}\n\n`;
                                controller.enqueue(encoder.encode(chunk));
                            }
                        }
                    }

                    // Send done signal
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
                    controller.close();
                } catch (error) {
                    console.error('Streaming error:', error);
                    const errorChunk = `data: ${JSON.stringify({ 
                        type: "error", 
                        content: "Sorry, I encountered an error. Please try again." 
                    })}\n\n`;
                    controller.enqueue(encoder.encode(errorChunk));
                    controller.close();
                }
            },
        });

        // Return streaming response with SSE headers
        return new Response(readableStream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Cache-Control',
            },
        });
    } catch (error) {
        console.error('Chat API error:', error);

        // Return a generic error response in case of an unexpected error
        return new Response(
            JSON.stringify({
                error: 'Internal server error',
                message: error instanceof Error ? error.message : 'Unknown error',
            }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }
}
