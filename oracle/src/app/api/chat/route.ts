/**
 * Chat API Route Handler
 *
 * Handles streaming chat requests using LangChain.js + Ollama.
 * Implements Server-Sent Events (SSE) for real-time streaming responses.
 */

import { NextRequest } from 'next/server';
import { HttpResponseOutputParser } from 'langchain/output_parsers';
import { createOllamaClient } from '@/lib/ollama/client';
import {
  createDeviceListTool,
  createDeviceControlTool,
} from '@/lib/langchain/tools';

export const runtime = 'nodejs';

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

    // Create Ollama client
    const model = createOllamaClient(0.1);

    // Create LangChain tools for device control
    const tools = [createDeviceListTool(), createDeviceControlTool()];

    // Bind tools to model
    const modelWithTools = model.bind({ tools });

    // Create output parser for streaming
    const parser = new HttpResponseOutputParser();

    // Create the chain: model with tools -> parser
    const chain = modelWithTools.pipe(parser);

    // Stream the response
    const stream = await chain.stream(messages);

    // Return streaming response with SSE headers
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
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
      }
    );
  }
}
