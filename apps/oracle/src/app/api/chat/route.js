import { createOllamaClient } from '../../../lib/ollama/client.js';
import { createDeviceListTool } from '../../../lib/langchain/tools/device-list-tool.js';
import { createDeviceControlTool } from '../../../lib/langchain/tools/device-control-tool.js';
import { createCalculatorTool } from '../../../lib/langchain/tools/calculator-tool.js';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const { messages, model: selectedModel } = await req.json();

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
                  const errorChunk = `data: ${JSON.stringify({
                    type: 'error',
                    content: `Error using tool "${toolCall.name}": ${toolError instanceof Error ? toolError.message : String(toolError)}`,
                  })}\n\n`;
                  controller.enqueue(encoder.encode(errorChunk));
                  controller.close();
                  return;
                }
              }
            }

            // Add assistant message with tool calls and tool results to conversation
            currentMessages = [
              ...currentMessages,
              { role: 'assistant', content: response.content, tool_calls: response.tool_calls },
              ...toolResults
            ];

            // Get next response from model (might have more tool calls)
            response = await modelWithTools.invoke(currentMessages);
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
