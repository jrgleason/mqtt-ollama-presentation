import {NextResponse} from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
    try {
        const aiProvider = process.env.AI_PROVIDER || 'anthropic';

        // Return models based on AI provider
        if (aiProvider === 'anthropic') {
            // Return available Anthropic Claude models
            const models = [
                {
                    name: 'claude-3-5-haiku-20241022',
                    size: 0, // Not applicable for API models
                    modifiedAt: null,
                    description: 'Fast, cost-effective (recommended for most tasks)'
                },
                {
                    name: 'claude-3-5-sonnet-20241022',
                    size: 0,
                    modifiedAt: null,
                    description: 'Balanced, better reasoning'
                },
                {
                    name: 'claude-sonnet-4-5-20250929',
                    size: 0,
                    modifiedAt: null,
                    description: 'Latest Sonnet model'
                },
                {
                    name: 'claude-opus-4-5-20251101',
                    size: 0,
                    modifiedAt: null,
                    description: 'Most capable (slower, expensive)'
                },
            ];

            return NextResponse.json({
                models,
                provider: 'anthropic'
            });
        }

        // Ollama provider - fetch from Ollama API
        const ollamaBaseUrl = process.env.OLLAMA_BASE_URL;

        if (!ollamaBaseUrl) {
            return NextResponse.json(
                {error: 'OLLAMA_BASE_URL not configured'},
                {status: 500},
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

        return NextResponse.json({
            models,
            provider: 'ollama'
        });
    } catch (error) {
        console.error('Error fetching models:', error);
        return NextResponse.json(
            {
                error: 'Failed to fetch models',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            {status: 500},
        );
    }
}
