import { createOllamaClient } from '../../../lib/ollama/client.js';
import { createDeviceListTool } from '../../../lib/langchain/tools/device-list-tool.js';
import { createDeviceControlTool } from '../../../lib/langchain/tools/device-control-tool.js';
import { createCalculatorTool } from '../../../lib/langchain/tools/calculator-tool.js';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const { messages, model: selectedModel } = await req.json();

    console.log('[chat/route] ========== REQUEST DEBUG START ==========');
    console.log('[chat/route] Selected model from request:', selectedModel);
    console.log('[chat/route] Environment variables:', {
      OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL,
      OLLAMA_MODEL: process.env.OLLAMA_MODEL,
    });
    console.log('[chat/route] ========== REQUEST DEBUG END ==========');

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    const model = createOllamaClient(0.1, selectedModel);
    console.log('[chat/route] Created model with:', { temperature: 0.1, selectedModel });

    // Test Ollama connectivity
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

    // Create tools
    const tools = [
        createDeviceListTool(),
        createDeviceControlTool(),
        createCalculatorTool(),
    ];

    // Bind tools to the model
    const modelWithTools = model.bindTools(tools);

    // Prepare messages with system prompt
    const systemMessage = {
      role: 'system',
      content: `You are a helpful home automation assistant.

IMPORTANT RULES:
1. When user asks to list devices, you MUST call the list_devices tool. DO NOT make up device names.
2. When user asks to control a device, you MUST:
   a. First call list_devices to get exact device names
   b. Then call control_device with the EXACT name from the list
3. NEVER invent or guess device names. Always use list_devices first.
4. For greetings or general questions, respond normally without tools.`
    };

    const allMessages = [systemMessage, ...messages];

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          let currentMessages = allMessages;
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
                  toolResults.push({
                    role: 'tool',
                    content: toolResult,
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
            console.log('[chat/route] Tool calls count:', response.tool_calls.length);
            console.log('[chat/route] Tool results count:', toolResults.length);
            console.log('[chat/route] Tool calls:', JSON.stringify(response.tool_calls, null, 2));
            console.log('[chat/route] Tool results:', JSON.stringify(toolResults, null, 2));

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
              { role: 'assistant', content: response.content, tool_calls: response.tool_calls },
              ...toolResults
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
                console.log('[chat/route] Retrying without tool binding...');
                const plainModel = createOllamaClient(0.1, selectedModel);
                response = await plainModel.invoke(currentMessages);
              } else {
                throw invokeError;
              }
            }
          }

          // Final response (no more tool calls)
          if (response.content) {
            const data = `data: ${JSON.stringify({
              type: 'content',
              content: response.content
            })}\n\n`;
            controller.enqueue(encoder.encode(data));
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
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
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}
