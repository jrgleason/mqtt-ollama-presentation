/**
 * Ollama AI Client
 *
 * Handles communication with local Ollama instance for AI inference.
 */

import { Ollama } from 'ollama';
import { logger } from './logger.js';
import { config } from './config.js';

/**
 * Create and configure Ollama client
 */
function createOllamaClient() {
  const client = new Ollama({
    host: config.ollama.baseUrl,
  });

  logger.debug('✅ Ollama client initialized', {
    host: config.ollama.baseUrl,
    model: config.ollama.model,
  });

  return client;
}

/**
 * Send a prompt to Ollama and get AI response
 *
 * @param {string} prompt - The user's transcribed message
 * @param {Object} options - Optional configuration
 * @param {string} options.model - Model to use (overrides config)
 * @param {string} options.systemPrompt - System prompt for context
 * @param {Array} options.messages - Full conversation history (overrides prompt)
 * @returns {Promise<string>} AI response text
 */
async function queryOllama(prompt, options = {}) {
  const client = createOllamaClient();
  const model = options.model || config.ollama.model;
  const systemPrompt = options.systemPrompt ||
    'You are a helpful home automation assistant. Provide concise, friendly responses in English only. Do not include non-English text in your responses.';

  try {
    logger.debug('🤖 Sending prompt to Ollama', { model, prompt: prompt || '[conversation]' });

    const startTime = Date.now();

    // Use provided messages array or build simple single-turn conversation
    const messages = options.messages || [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ];

    const response = await client.chat({
      model,
      messages,
      stream: false,
    });

    const duration = Date.now() - startTime;
    let aiResponse = response.message.content;

    // Clean up any non-English characters (Qwen sometimes adds Chinese text)
    // Remove any Chinese/Japanese/Korean characters and surrounding punctuation
    aiResponse = aiResponse.replace(/[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF。，]/g, '').trim();

    logger.debug('✅ Ollama response received', {
      model,
      duration: `${duration}ms`,
      responseLength: aiResponse.length,
      response: aiResponse.substring(0, 100) + (aiResponse.length > 100 ? '...' : ''),
    });

    return aiResponse;
  } catch (error) {
    logger.error('❌ Ollama query failed', {
      error: error.message,
      model,
      prompt: prompt.substring(0, 50),
    });
    throw error;
  }
}

/**
 * Check if Ollama is available and the model is downloaded
 *
 * @returns {Promise<boolean>} True if Ollama is ready
 */
async function checkOllamaHealth() {
  const client = createOllamaClient();

  try {
    // List available models
    const models = await client.list();
    const modelExists = models.models.some(m => m.name === config.ollama.model);

    if (!modelExists) {
      logger.warn('⚠️ Ollama model not found', {
        model: config.ollama.model,
        availableModels: models.models.map(m => m.name),
      });
      return false;
    }

    logger.debug('✅ Ollama health check passed', {
      model: config.ollama.model,
      modelCount: models.models.length,
    });
    return true;
  } catch (error) {
    logger.error('❌ Ollama health check failed', { error: error.message });
    return false;
  }
}

export { queryOllama, checkOllamaHealth, createOllamaClient };
