/**
 * Provider Health Check Utility
 *
 * Validates AI and TTS provider configurations before starting the voice gateway.
 * Provides warnings for missing dependencies but doesn't crash the service.
 */

import {checkPiperHealth} from '../piperTTS.js';
import {PROVIDER_HEALTH_CHECK_TIMEOUT_MS} from '../constants/timing.js';

/**
 * Validate provider configurations and dependencies
 *
 * @param {Object} config - Application configuration object
 * @param {Object} logger - Logger instance
 * @returns {Promise<Object>} Health check results for AI and TTS providers
 */
async function validateProviders(config, logger) {
    const results = {
        ai: {provider: config.ai.provider, healthy: false, error: null},
        tts: {provider: config.tts.provider, healthy: false, error: null},
    };

    // =================================================================
    // AI Provider Health Check (extracted to separate function)
    // =================================================================
    async function checkAIProvider() {
        logger.info('🔍 Checking AI provider health...', {provider: config.ai.provider});

        if (config.ai.provider === 'anthropic') {
            // Check if Anthropic API key is configured
            if (!config.anthropic.apiKey || config.anthropic.apiKey === 'your_anthropic_api_key_here') {
                results.ai.error = 'ANTHROPIC_API_KEY not set or using placeholder value';
                logger.warn('⚠️ Anthropic API key not configured', {
                    hint: 'Set ANTHROPIC_API_KEY in .env.tmp or use --ollama flag',
                });
            } else {
                results.ai.healthy = true;
                logger.info('✅ Anthropic API key configured', {
                    keyLength: config.anthropic.apiKey.length,
                    model: config.anthropic.model,
                });
            }
        } else if (config.ai.provider === 'ollama') {
            // Check if Ollama server is reachable
            try {
                const response = await fetch(`${config.ollama.baseUrl}/api/tags`, {
                    signal: AbortSignal.timeout(PROVIDER_HEALTH_CHECK_TIMEOUT_MS),
                });

                if (response.ok) {
                    const data = await response.json();
                    results.ai.healthy = true;
                    logger.info('✅ Ollama server reachable', {
                        baseUrl: config.ollama.baseUrl,
                        models: data.models?.length || 0,
                        targetModel: config.ollama.model,
                    });
                } else {
                    results.ai.error = `Ollama server returned status ${response.status}`;
                    logger.warn('⚠️ Ollama server not responding correctly', {
                        baseUrl: config.ollama.baseUrl,
                        status: response.status,
                    });
                }
            } catch (error) {
                results.ai.error = `Ollama server unreachable: ${error.message}`;
                logger.warn('⚠️ Ollama server unreachable', {
                    baseUrl: config.ollama.baseUrl,
                    error: error.message,
                    hint: 'Start Ollama with: ollama serve',
                });
            }
        } else {
            results.ai.error = `Unknown AI provider: ${config.ai.provider}`;
            logger.error('❌ Unknown AI provider', {
                provider: config.ai.provider,
                validProviders: ['anthropic', 'ollama'],
            });
        }
    }

    // =================================================================
    // TTS Provider Health Check (extracted to separate function)
    // =================================================================
    async function checkTTSProvider() {
        logger.info('🔍 Checking TTS provider health...', {provider: config.tts.provider});

        if (!config.tts.enabled) {
            results.tts.healthy = true;
            results.tts.error = 'TTS disabled';
            logger.info('ℹ️ TTS is disabled', {hint: 'Set TTS_ENABLED=true to enable'});
        } else if (config.tts.provider === 'ElevenLabs') {
            // Check if ElevenLabs API key is configured
            if (!config.elevenlabs.apiKey || config.elevenlabs.apiKey === 'your_api_key_here') {
                results.tts.error = 'ELEVENLABS_API_KEY not set or using placeholder value';
                logger.warn('⚠️ ElevenLabs API key not configured', {
                    hint: 'Set ELEVENLABS_API_KEY in .env.tmp or switch to Piper TTS',
                });
            } else {
                results.tts.healthy = true;
                logger.info('✅ ElevenLabs API key configured', {
                    keyLength: config.elevenlabs.apiKey.length,
                    voiceId: config.elevenlabs.voiceId,
                    modelId: config.elevenlabs.modelId,
                });
            }
        } else if (config.tts.provider === 'Piper') {
            // Check if Piper TTS is available
            const piperHealthy = await checkPiperHealth();

            if (piperHealthy) {
                results.tts.healthy = true;
                logger.info('✅ Piper TTS is available', {
                    modelPath: config.tts.modelPath,
                });
            } else {
                results.tts.error = 'Piper TTS not available (check Python + piper-tts installation)';
                logger.warn('⚠️ Piper TTS not available', {
                    hint: 'Install with: pip install piper-tts',
                    modelPath: config.tts.modelPath,
                });
            }
        } else {
            results.tts.error = `Unknown TTS provider: ${config.tts.provider}`;
            logger.error('❌ Unknown TTS provider', {
                provider: config.tts.provider,
                validProviders: ['ElevenLabs', 'Piper'],
            });
        }
    }

    // =================================================================
    // Run health checks in parallel
    // =================================================================
    const [aiResult, ttsResult] = await Promise.allSettled([
        checkAIProvider(),
        checkTTSProvider()
    ]);

    // Log if any check failed unexpectedly (shouldn't happen with current implementation)
    if (aiResult.status === 'rejected') {
        logger.error('❌ AI health check threw unexpected error', {error: aiResult.reason});
    }
    if (ttsResult.status === 'rejected') {
        logger.error('❌ TTS health check threw unexpected error', {error: ttsResult.reason});
    }

    // =================================================================
    // Summary
    // =================================================================

    const allHealthy = results.ai.healthy && results.tts.healthy;

    if (allHealthy) {
        logger.info('✅ All providers are healthy and ready', {
            ai: results.ai.provider,
            tts: results.tts.provider,
        });
    } else {
        logger.warn('⚠️ Some providers have issues (service will continue)', {
            ai: {
                provider: results.ai.provider,
                healthy: results.ai.healthy,
                error: results.ai.error,
            },
            tts: {
                provider: results.tts.provider,
                healthy: results.tts.healthy,
                error: results.tts.error,
            },
        });
    }

    return results;
}

export {validateProviders};
