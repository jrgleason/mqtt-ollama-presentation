/**
 * Ollama Client Wrapper
 *
 * Provides a configured ChatOllama instance for LangChain integration.
 */

import {ChatOllama} from '@langchain/ollama';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL;

// Debug: Log configuration on module load
console.log('[ollama/client] Configuration:', {
    baseUrl: OLLAMA_BASE_URL,
    model: OLLAMA_MODEL,
    envLoaded: !!process.env.OLLAMA_BASE_URL
});

/**
 * Creates a configured ChatOllama instance
 *
 * @param temperature - Controls randomness (0-1). Default: 0.1 for consistent responses
 * @param modelOverride - Optional model to use instead of env var default
 * @returns Configured ChatOllama instance
 */
export function createOllamaClient(temperature: number = 0.1, modelOverride?: string) {
    return new ChatOllama({
        baseUrl: OLLAMA_BASE_URL,
        model: modelOverride || OLLAMA_MODEL,
        temperature,
        // Enable streaming for real-time responses
        streaming: true,
    });
}

/**
 * Get Ollama configuration for debugging
 */
export function getOllamaConfig() {
    return {
        baseUrl: OLLAMA_BASE_URL,
        model: OLLAMA_MODEL,
    };
}
