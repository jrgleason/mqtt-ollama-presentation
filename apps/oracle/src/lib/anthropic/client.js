/**
 * Anthropic Client for Oracle App
 *
 * Creates configured Anthropic language model instances for use with LangChain
 */

import {ChatAnthropic} from '@langchain/anthropic';

// Handle case where IntelliJ may truncate the sk-ant-api03- prefix
let ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (ANTHROPIC_API_KEY && !ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
    console.log('[anthropic/client] API key missing sk-ant-api03- prefix, prepending it');
    ANTHROPIC_API_KEY = 'sk-ant-api03-' + ANTHROPIC_API_KEY;
}
const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022';
const DEBUG = process.env.LOG_LEVEL === 'debug' || process.env.NODE_ENV === 'development';

// Only log debug info in development or debug mode
if (DEBUG) {
    console.log('[anthropic/client] ========== ANTHROPIC DEBUG START ==========');
    console.log('[anthropic/client] All ANTHROPIC env vars:', {
        ANTHROPIC_API_KEY: ANTHROPIC_API_KEY ? '***' + ANTHROPIC_API_KEY.slice(-4) : 'NOT SET',
        ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
        NODE_ENV: process.env.NODE_ENV,
    });
    console.log('[anthropic/client] Final Configuration:', {
        model: DEFAULT_MODEL,
        hasApiKey: !!ANTHROPIC_API_KEY,
    });
    console.log('[anthropic/client] ========== ANTHROPIC DEBUG END ==========');
}

/**
 * Create an Anthropic chat model instance
 *
 * @param {number} temperature - Temperature for response generation (0.0-1.0)
 * @param {string} model - Model name to use (optional, defaults to env ANTHROPIC_MODEL)
 * @returns {ChatAnthropic} Configured Anthropic model instance
 */
export function createAnthropicClient(temperature = 0.7, model = DEFAULT_MODEL) {
    if (!ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY environment variable is required but not set');
    }

    console.log('[anthropic/client] Creating ChatAnthropic with:', {
        model: model,
        temperature: temperature,
        apiKeyLength: ANTHROPIC_API_KEY.length,
        apiKeyPrefix: ANTHROPIC_API_KEY.substring(0, 20),
        apiKeySuffix: ANTHROPIC_API_KEY.slice(-10),
        // Check for common issues
        hasLeadingSpace: ANTHROPIC_API_KEY.startsWith(' '),
        hasTrailingSpace: ANTHROPIC_API_KEY.endsWith(' '),
        hasNewline: ANTHROPIC_API_KEY.includes('\n'),
        startsWithSkAnt: ANTHROPIC_API_KEY.startsWith('sk-ant-'),
    });

    return new ChatAnthropic({
        apiKey: ANTHROPIC_API_KEY,
        model: model,
        temperature: temperature,
    });
}

/**
 * Check if Anthropic API key is configured and valid
 *
 * @returns {Promise<boolean>} True if Anthropic is accessible
 */
export async function checkAnthropicHealth() {
    try {
        if (!ANTHROPIC_API_KEY) {
            console.error('[anthropic/client] Health check failed: ANTHROPIC_API_KEY not set');
            return false;
        }

        // Simple test to verify API key is valid
        const client = createAnthropicClient(0.7);
        const testResponse = await client.invoke([
            {role: 'user', content: 'Say "ok" if you can hear me.'}
        ]);

        if (testResponse && testResponse.content) {
            if (DEBUG) {
                console.log('[anthropic/client] ✅ Health check passed', {
                    model: DEFAULT_MODEL,
                });
            }
            return true;
        }

        return false;
    } catch (error) {
        console.error('[anthropic/client] Health check failed:', error.message);
        return false;
    }
}
