import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const ollamaBaseUrl = process.env.OLLAMA_BASE_URL;

    if (!ollamaBaseUrl) {
      return NextResponse.json(
        { error: 'OLLAMA_BASE_URL not configured' },
        { status: 500 },
      );
    }

    const response = await fetch(`${ollamaBaseUrl}/api/tags`);

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();

    const models = Array.isArray(data.models)
      ? data.models.map((model) => ({
          name: model.name,
          size: model.size,
          modifiedAt: model.modified_at,
        }))
      : [];

    return NextResponse.json({ models });
  } catch (error) {
    console.error('Error fetching Ollama models:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch models',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
