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
        const { messages, model: selectedModel } = await req.json();

        if (!messages || !Array.isArray(messages)) {
            return new Response(
                JSON.stringify({ error: 'Messages array is required' }),
                {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' },
                }
            );
        }

        // Create Ollama client with optional model override
        const model = createOllamaClient(0.1, selectedModel);

        // ═══════════════════════════════════════════════════════════════════════
        // 🔴 TECH DEBT: TOOLS TEMPORARILY DISABLED FOR PERFORMANCE TESTING
        // ═══════════════════════════════════════════════════════════════════════
        //
        // Current state: Direct model invocation (no agent, no tools)
        // Reason: Testing raw llama3.2:1b performance without agent overhead
        //
        // TODO: Re-enable tools with selective calling via system prompt:
        //
        // const tools: DynamicTool[] = [
        //     createDeviceListTool(),
        //     createDeviceControlTool(),
        //     createCalculatorTool(),
        // ];
        //
        // const prompt = ChatPromptTemplate.fromMessages([
        //     SystemMessagePromptTemplate.fromTemplate(`You are a helpful home automation assistant.
        //
        //     Only use tools when the user explicitly asks to:
        //     - List devices or check device status
        //     - Control devices (turn on/off, adjust settings)
        //     - Perform calculations
        //
        //     For general conversation, greetings, or questions that don't require device interaction
        //     or calculations, respond directly without using any tools.`),
        //     new MessagesPlaceholder('chat_history'),
        //     HumanMessagePromptTemplate.fromTemplate('{input}'),
        //     new MessagesPlaceholder('agent_scratchpad'),
        // ]);
        //
        // const agent = createToolCallingAgent({ llm: model, tools, prompt });
        // const agentExecutor = AgentExecutor.fromAgentAndTools({ agent, tools });
        //
        // Test criteria when re-enabling:
        // ✅ "Hi how are you" should NOT call tools
        // ✅ "Turn on the living room light" SHOULD call device_control tool
        // ✅ "What devices do I have?" SHOULD call list_devices tool
        //
        // See: docs/tasks-active.md section 2.2.0
        // ═══════════════════════════════════════════════════════════════════════

        // Direct model invocation without agent
        const inputForChain = messages[messages.length - 1]?.content ?? '';

        // Create a streaming response with proper SSE format
        const encoder = new TextEncoder();
        const readableStream = new ReadableStream({
            async start(controller) {
                try {
                    // Direct model streaming (no agent)
                    const stream = await model.stream(inputForChain);

                    for await (const chunk of stream) {
                        if (chunk.content) {
                            const data = `data: ${JSON.stringify({
                                type: "content",
                                content: chunk.content
                            })}\n\n`;
                            controller.enqueue(encoder.encode(data));
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
