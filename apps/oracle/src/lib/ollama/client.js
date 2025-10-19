/**
 * Ollama Client for Oracle App
 *
 * Creates configured Ollama language model instances for use with LangChain
 */

import { ChatOllama } from '@langchain/ollama';

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const DEFAULT_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:0.5b';

console.log('[ollama/client] Configuration:', {
  baseUrl: OLLAMA_BASE_URL,
  model: DEFAULT_MODEL,
  envLoaded: !!process.env.OLLAMA_BASE_URL,
});

/**
 * Create an Ollama chat model instance
 *
 * @param {number} temperature - Temperature for response generation (0.0-1.0)
 * @param {string} model - Model name to use (optional, defaults to env OLLAMA_MODEL)
 * @returns {ChatOllama} Configured Ollama model instance
 */
export function createOllamaClient(temperature = 0.7, model = DEFAULT_MODEL) {
  return new ChatOllama({
    baseUrl: OLLAMA_BASE_URL,
    model: model,
    temperature: temperature,
  });
}

/**
 * Get available Ollama models
 *
 * @returns {Promise<Array>} List of available models
 */
export async function listOllamaModels() {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    const data = await response.json();
    return data.models || [];
  } catch (error) {
    console.error('[ollama/client] Failed to list models:', error);
    return [];
  }
}

/**
 * Check if Ollama is running and accessible
 *
 * @returns {Promise<boolean>} True if Ollama is accessible
 */
export async function checkOllamaHealth() {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch (error) {
    console.error('[ollama/client] Health check failed:', error.message);
    return false;
  }
}
