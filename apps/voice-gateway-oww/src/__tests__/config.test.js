/**
 * Configuration Tests
 *
 * Tests for Ollama performance configuration options:
 * - OLLAMA_NUM_CTX
 * - OLLAMA_TEMPERATURE
 * - OLLAMA_KEEP_ALIVE
 *
 * Note: These tests import the live config module, so they test
 * the actual configuration values from the environment at test time.
 */

import { config } from '../config.js';

describe('Ollama Configuration Defaults', () => {
    describe('Performance Settings', () => {
        it('should have numCtx setting', () => {
            expect(config.ollama.numCtx).toBeDefined();
            expect(typeof config.ollama.numCtx).toBe('number');
        });

        it('should have temperature setting', () => {
            expect(config.ollama.temperature).toBeDefined();
            expect(typeof config.ollama.temperature).toBe('number');
        });

        it('should have keepAlive setting', () => {
            expect(config.ollama.keepAlive).toBeDefined();
            expect(typeof config.ollama.keepAlive).toBe('number');
        });

        it('should use sensible defaults when env vars not set', () => {
            // If env vars are not set, should use defaults from config.js
            // Default values: numCtx=2048, temperature=0.5, keepAlive=-1
            if (!process.env.OLLAMA_NUM_CTX) {
                expect(config.ollama.numCtx).toBe(2048);
            }
            if (!process.env.OLLAMA_TEMPERATURE) {
                expect(config.ollama.temperature).toBe(0.5);
            }
            if (!process.env.OLLAMA_KEEP_ALIVE) {
                expect(config.ollama.keepAlive).toBe(-1);
            }
        });
    });

    describe('Configuration Structure', () => {
        it('should have all required Ollama config properties', () => {
            expect(config.ollama).toHaveProperty('baseUrl');
            expect(config.ollama).toHaveProperty('model');
            expect(config.ollama).toHaveProperty('noThink');
            expect(config.ollama).toHaveProperty('numCtx');
            expect(config.ollama).toHaveProperty('temperature');
            expect(config.ollama).toHaveProperty('keepAlive');
        });

        it('should have sensible value ranges', () => {
            // numCtx should be between 512-8192 (reasonable range)
            expect(config.ollama.numCtx).toBeGreaterThanOrEqual(512);
            expect(config.ollama.numCtx).toBeLessThanOrEqual(8192);

            // temperature should be between 0-1
            expect(config.ollama.temperature).toBeGreaterThanOrEqual(0);
            expect(config.ollama.temperature).toBeLessThanOrEqual(1);

            // keepAlive can be -1 (never unload) or positive (seconds)
            expect(config.ollama.keepAlive).toBeGreaterThanOrEqual(-1);
        });
    });

    describe('Backward Compatibility', () => {
        it('should preserve existing Ollama settings', () => {
            expect(config.ollama.baseUrl).toBeDefined();
            expect(config.ollama.model).toBeDefined();
            expect(config.ollama.noThink).toBeDefined();

            expect(typeof config.ollama.baseUrl).toBe('string');
            expect(typeof config.ollama.model).toBe('string');
            expect(typeof config.ollama.noThink).toBe('boolean');
        });
    });

    describe('Type Safety', () => {
        it('should parse environment variables to correct types', () => {
            // All numeric settings should be numbers, not strings
            expect(typeof config.ollama.numCtx).toBe('number');
            expect(typeof config.ollama.temperature).toBe('number');
            expect(typeof config.ollama.keepAlive).toBe('number');
        });

        it('should not have NaN values', () => {
            expect(config.ollama.numCtx).not.toBeNaN();
            expect(config.ollama.temperature).not.toBeNaN();
            expect(config.ollama.keepAlive).not.toBeNaN();
        });
    });
});

/**
 * Configuration Parsing Tests
 *
 * Tests that verify environment variables are parsed correctly.
 * These test the actual parsing logic in config.js.
 */
describe('Configuration Parsing Logic', () => {
    it('should parse OLLAMA_NUM_CTX as number', () => {
        // If OLLAMA_NUM_CTX is set, it should be parsed to a number
        const envValue = process.env.OLLAMA_NUM_CTX;
        if (envValue) {
            const parsed = Number(envValue);
            expect(config.ollama.numCtx).toBe(parsed);
        }
    });

    it('should parse OLLAMA_TEMPERATURE as number', () => {
        // If OLLAMA_TEMPERATURE is set, it should be parsed to a number
        const envValue = process.env.OLLAMA_TEMPERATURE;
        if (envValue) {
            const parsed = Number(envValue);
            expect(config.ollama.temperature).toBe(parsed);
        }
    });

    it('should parse OLLAMA_KEEP_ALIVE as number', () => {
        // If OLLAMA_KEEP_ALIVE is set, it should be parsed to a number
        const envValue = process.env.OLLAMA_KEEP_ALIVE;
        if (envValue) {
            const parsed = Number(envValue);
            expect(config.ollama.keepAlive).toBe(parsed);
        }
    });

    it('should handle default values correctly', () => {
        // Default values are defined in config.js as:
        // numCtx: 2048, temperature: 0.5, keepAlive: -1
        if (!process.env.OLLAMA_NUM_CTX) {
            expect(config.ollama.numCtx).toBe(2048);
        }
        if (!process.env.OLLAMA_TEMPERATURE) {
            expect(config.ollama.temperature).toBe(0.5);
        }
        if (!process.env.OLLAMA_KEEP_ALIVE) {
            expect(config.ollama.keepAlive).toBe(-1);
        }
    });
});
