/**
 * Ollama Client Wrapper
 *
 * Provides a configured ChatOllama instance for LangChain integration.
 */

import {ChatOllama} from '@langchain/ollama';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:3b';

/**
 * Creates a configured ChatOllama instance
 *
 * @param temperature - Controls randomness (0-1). Default: 0.1 for consistent responses
 * @returns Configured ChatOllama instance
 */
export function createOllamaClient(temperature: number = 0.1) {
    return new ChatOllama({
        baseUrl: OLLAMA_BASE_URL,
        model: OLLAMA_MODEL,
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
