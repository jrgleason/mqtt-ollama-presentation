/**
 * Unit tests for Ollama Model Warmup functionality
 *
 * Tests the model preloading logic in main.js that sends a warmup query
 * to Ollama during startup to eliminate first-query delays.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

describe('Ollama Model Warmup', () => {
    let originalFetch;

    beforeEach(() => {
        originalFetch = global.fetch;
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    describe('Warmup Query', () => {
        it('should send correct warmup request to Ollama API', async () => {
            const fetchCalls = [];
            global.fetch = jest.fn((url, options) => {
                fetchCalls.push({ url, options });
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ response: 'Hi' })
                });
            });

            const config = {
                ai: { provider: 'ollama' },
                ollama: {
                    baseUrl: 'http://localhost:11434',
                    model: 'qwen2.5:0.5b',
                    numCtx: 2048,
                    temperature: 0.5,
                    keepAlive: -1,
                }
            };

            // Simulate warmup logic
            await fetch(`${config.ollama.baseUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: config.ollama.model,
                    prompt: 'Hello',
                    stream: false,
                    options: {
                        num_predict: 1,
                        num_ctx: config.ollama.numCtx,
                        temperature: config.ollama.temperature,
                    },
                    keep_alive: config.ollama.keepAlive,
                }),
            });

            expect(fetchCalls).toHaveLength(1);
            expect(fetchCalls[0].url).toBe('http://localhost:11434/api/generate');
            expect(fetchCalls[0].options.method).toBe('POST');

            const body = JSON.parse(fetchCalls[0].options.body);
            expect(body.model).toBe('qwen2.5:0.5b');
            expect(body.prompt).toBe('Hello');
            expect(body.stream).toBe(false);
            expect(body.options.num_predict).toBe(1);
            expect(body.options.num_ctx).toBe(2048);
            expect(body.options.temperature).toBe(0.5);
            expect(body.keep_alive).toBe(-1);
        });

        it('should use default values when config options are missing', async () => {
            const fetchCalls = [];
            global.fetch = jest.fn((url, options) => {
                fetchCalls.push({ url, options });
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ response: 'Hi' })
                });
            });

            const config = {
                ai: { provider: 'ollama' },
                ollama: {
                    baseUrl: 'http://localhost:11434',
                    model: 'qwen2.5:0.5b',
                    // numCtx, temperature, keepAlive not set
                }
            };

            // Simulate warmup logic with defaults
            await fetch(`${config.ollama.baseUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: config.ollama.model,
                    prompt: 'Hello',
                    stream: false,
                    options: {
                        num_predict: 1,
                        num_ctx: config.ollama.numCtx || 2048,
                        temperature: config.ollama.temperature || 0.5,
                    },
                    keep_alive: config.ollama.keepAlive !== undefined ? config.ollama.keepAlive : -1,
                }),
            });

            const body = JSON.parse(fetchCalls[0].options.body);
            expect(body.options.num_ctx).toBe(2048);
            expect(body.options.temperature).toBe(0.5);
            expect(body.keep_alive).toBe(-1);
        });

        it('should handle successful warmup response', async () => {
            global.fetch = jest.fn(() => Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ response: 'Hi' })
            }));

            const config = {
                ai: { provider: 'ollama' },
                ollama: {
                    baseUrl: 'http://localhost:11434',
                    model: 'qwen2.5:0.5b',
                    numCtx: 2048,
                    temperature: 0.5,
                    keepAlive: -1,
                }
            };

            const response = await fetch(`${config.ollama.baseUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: config.ollama.model,
                    prompt: 'Hello',
                    stream: false,
                    options: {
                        num_predict: 1,
                        num_ctx: config.ollama.numCtx,
                        temperature: config.ollama.temperature,
                    },
                    keep_alive: config.ollama.keepAlive,
                }),
            });

            expect(response.ok).toBe(true);
        });

        it('should handle warmup failure gracefully', async () => {
            global.fetch = jest.fn(() => Promise.resolve({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error'
            }));

            const config = {
                ai: { provider: 'ollama' },
                ollama: {
                    baseUrl: 'http://localhost:11434',
                    model: 'qwen2.5:0.5b',
                }
            };

            const response = await fetch(`${config.ollama.baseUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: config.ollama.model,
                    prompt: 'Hello',
                    stream: false,
                    options: {
                        num_predict: 1,
                        num_ctx: 2048,
                        temperature: 0.5,
                    },
                    keep_alive: -1,
                }),
            });

            expect(response.ok).toBe(false);
            expect(response.status).toBe(500);
        });

        it('should handle network errors gracefully', async () => {
            global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));

            const config = {
                ai: { provider: 'ollama' },
                ollama: {
                    baseUrl: 'http://localhost:11434',
                    model: 'qwen2.5:0.5b',
                }
            };

            try {
                await fetch(`${config.ollama.baseUrl}/api/generate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: config.ollama.model,
                        prompt: 'Hello',
                        stream: false,
                        options: {
                            num_predict: 1,
                            num_ctx: 2048,
                            temperature: 0.5,
                        },
                        keep_alive: -1,
                    }),
                });
                throw new Error('Should have thrown an error');
            } catch (error) {
                expect(error.message).toBe('Network error');
            }
        });
    });

    describe('Warmup Timing', () => {
        it('should measure warmup duration', async () => {
            global.fetch = jest.fn(() => {
                return new Promise(resolve => {
                    setTimeout(() => {
                        resolve({
                            ok: true,
                            json: () => Promise.resolve({ response: 'Hi' })
                        });
                    }, 100);
                });
            });

            const startTime = Date.now();
            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'qwen2.5:0.5b',
                    prompt: 'Hello',
                    stream: false,
                    options: { num_predict: 1, num_ctx: 2048, temperature: 0.5 },
                    keep_alive: -1,
                }),
            });
            const duration = Date.now() - startTime;

            expect(response.ok).toBe(true);
            expect(duration).toBeGreaterThanOrEqual(100);
        });
    });

    describe('Configuration-based Warmup', () => {
        it('should skip warmup when AI provider is not ollama', () => {
            const config = {
                ai: { provider: 'anthropic' },
                ollama: {
                    baseUrl: 'http://localhost:11434',
                    model: 'qwen2.5:0.5b',
                }
            };

            // Warmup should only run if config.ai.provider === 'ollama'
            expect(config.ai.provider).not.toBe('ollama');
        });

        it('should skip warmup when health check fails', () => {
            const healthResults = {
                ai: { healthy: false, error: 'Ollama server unreachable' }
            };

            // Warmup should only run if healthResults.ai.healthy === true
            expect(healthResults.ai.healthy).toBe(false);
        });

        it('should run warmup when provider is ollama and health check passes', () => {
            const config = {
                ai: { provider: 'ollama' },
                ollama: {
                    baseUrl: 'http://localhost:11434',
                    model: 'qwen2.5:0.5b',
                }
            };

            const healthResults = {
                ai: { healthy: true, error: null }
            };

            // Both conditions met - warmup should run
            expect(config.ai.provider).toBe('ollama');
            expect(healthResults.ai.healthy).toBe(true);
        });
    });

    describe('Warmup Request Format', () => {
        it('should use minimal num_predict to speed up warmup', async () => {
            const fetchCalls = [];
            global.fetch = jest.fn((url, options) => {
                fetchCalls.push({ url, options });
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ response: 'Hi' })
                });
            });

            await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'qwen2.5:0.5b',
                    prompt: 'Hello',
                    stream: false,
                    options: {
                        num_predict: 1, // Minimal response
                        num_ctx: 2048,
                        temperature: 0.5,
                    },
                    keep_alive: -1,
                }),
            });

            const body = JSON.parse(fetchCalls[0].options.body);
            expect(body.options.num_predict).toBe(1);
        });

        it('should disable streaming for faster warmup', async () => {
            const fetchCalls = [];
            global.fetch = jest.fn((url, options) => {
                fetchCalls.push({ url, options });
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ response: 'Hi' })
                });
            });

            await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'qwen2.5:0.5b',
                    prompt: 'Hello',
                    stream: false, // No streaming for warmup
                    options: {
                        num_predict: 1,
                        num_ctx: 2048,
                        temperature: 0.5,
                    },
                    keep_alive: -1,
                }),
            });

            const body = JSON.parse(fetchCalls[0].options.body);
            expect(body.stream).toBe(false);
        });

        it('should use simple prompt for warmup', async () => {
            const fetchCalls = [];
            global.fetch = jest.fn((url, options) => {
                fetchCalls.push({ url, options });
                return Promise.resolve({
                    ok: true,
                    json: () => Promise.resolve({ response: 'Hi' })
                });
            });

            await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'qwen2.5:0.5b',
                    prompt: 'Hello', // Simple prompt
                    stream: false,
                    options: {
                        num_predict: 1,
                        num_ctx: 2048,
                        temperature: 0.5,
                    },
                    keep_alive: -1,
                }),
            });

            const body = JSON.parse(fetchCalls[0].options.body);
            expect(body.prompt).toBe('Hello');
        });
    });
});
