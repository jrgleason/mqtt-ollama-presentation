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

Only use tools when the user explicitly asks to:
- List devices or check device status (use list_devices tool)
- Control devices (use control_device tool)
- Perform calculations (use calculator tool)

For general conversation, greetings, or questions that don't require device interaction
or calculations, respond directly without using any tools.`
    };

    const allMessages = [systemMessage, ...messages];

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          // First, invoke the model to see if it wants to use tools
          const response = await modelWithTools.invoke(allMessages);

          // Check if model wants to call tools
          if (response.tool_calls && response.tool_calls.length > 0) {
            // Execute tool calls
            for (const toolCall of response.tool_calls) {
              const tool = tools.find(t => t.name === toolCall.name);
              if (tool) {
                // Show tool usage
                const toolData = `data: ${JSON.stringify({
                  type: 'tool_start',
                  content: `🔧 Using tool: ${toolCall.name}\n`
                })}\n\n`;
                controller.enqueue(encoder.encode(toolData));

                // Execute the tool with specific error handling
                // For DynamicStructuredTool, pass args directly (not JSON string)
                let toolResult;
                try {
                  toolResult = await tool.func(toolCall.args);
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

                // Add tool result to messages and get final response
                const messagesWithToolResult = [
                  ...allMessages,
                  { role: 'assistant', content: response.content, tool_calls: response.tool_calls },
                  { role: 'tool', content: toolResult, tool_call_id: toolCall.id }
                ];

                // Get final response from model
                const finalResponse = await model.invoke(messagesWithToolResult);

                const data = `data: ${JSON.stringify({
                  type: 'content',
                  content: finalResponse.content
                })}\n\n`;
                controller.enqueue(encoder.encode(data));
              }
            }
          } else {
            // No tools needed, stream the response directly
            const stream = await model.stream(allMessages);

            for await (const chunk of stream) {
              if (chunk.content) {
                const data = `data: ${JSON.stringify({
                  type: 'content',
                  content: chunk.content
                })}\n\n`;
                controller.enqueue(encoder.encode(data));
              }
            }
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
