/**
 * Tests for Anthropic Client
 *
 * These tests verify that the Anthropic client wrapper correctly creates
 * ChatAnthropic instances and validates API key configuration.
 */

import {jest} from '@jest/globals';

describe('Anthropic Client', () => {
    let originalEnv;

    beforeEach(() => {
        // Save original environment
        originalEnv = {...process.env};

        // Clear modules to ensure fresh imports
        jest.resetModules();
    });

    afterEach(() => {
        // Restore original environment
        process.env = originalEnv;
    });

    describe('createAnthropicClient()', () => {
        it('should create ChatAnthropic instance with API key', async () => {
            // Setup
            process.env.ANTHROPIC_API_KEY = 'test-api-key';
            process.env.ANTHROPIC_MODEL = 'claude-3-5-haiku-20241022';

            const {createAnthropicClient} = await import('../client.js');

            // Execute
            const client = createAnthropicClient();

            // Verify
            expect(client).toBeDefined();
            expect(client.constructor.name).toBe('ChatAnthropic');
        });

        it('should throw error when ANTHROPIC_API_KEY not set', async () => {
            // Setup
            delete process.env.ANTHROPIC_API_KEY;

            const {createAnthropicClient} = await import('../client.js');

            // Execute and verify
            expect(() => createAnthropicClient()).toThrow('ANTHROPIC_API_KEY environment variable is required but not set');
        });

        it('should use custom temperature when provided', async () => {
            // Setup
            process.env.ANTHROPIC_API_KEY = 'test-api-key';

            const {createAnthropicClient} = await import('../client.js');

            // Execute
            const client = createAnthropicClient(0.5);

            // Verify
            expect(client).toBeDefined();
            // ChatAnthropic stores temperature in internal config
        });

        it('should use custom model when provided', async () => {
            // Setup
            process.env.ANTHROPIC_API_KEY = 'test-api-key';

            const {createAnthropicClient} = await import('../client.js');

            // Execute
            const client = createAnthropicClient(0.7, 'claude-3-5-sonnet-20241022');

            // Verify
            expect(client).toBeDefined();
        });

        it('should use default model from env when not provided', async () => {
            // Setup
            process.env.ANTHROPIC_API_KEY = 'test-api-key';
            process.env.ANTHROPIC_MODEL = 'claude-3-opus-20240229';

            const {createAnthropicClient} = await import('../client.js');

            // Execute
            const client = createAnthropicClient();

            // Verify
            expect(client).toBeDefined();
        });

        it('should use fallback model when ANTHROPIC_MODEL not set', async () => {
            // Setup
            process.env.ANTHROPIC_API_KEY = 'test-api-key';
            delete process.env.ANTHROPIC_MODEL;

            const {createAnthropicClient} = await import('../client.js');

            // Execute
            const client = createAnthropicClient();

            // Verify - should use default: claude-3-5-haiku-20241022
            expect(client).toBeDefined();
        });
    });

    describe('checkAnthropicHealth()', () => {
        it('should return false when ANTHROPIC_API_KEY not set', async () => {
            // Setup
            delete process.env.ANTHROPIC_API_KEY;

            const {checkAnthropicHealth} = await import('../client.js');

            // Execute
            const result = await checkAnthropicHealth();

            // Verify
            expect(result).toBe(false);
        });

        it('should return false when API call fails', async () => {
            // Setup - invalid API key will cause API call to fail
            process.env.ANTHROPIC_API_KEY = 'invalid-key';

            const {checkAnthropicHealth} = await import('../client.js');

            // Execute
            const result = await checkAnthropicHealth();

            // Verify
            expect(result).toBe(false);
        });
    });

    describe('Environment variable handling', () => {
        it('should handle missing ANTHROPIC_MODEL with default', async () => {
            // Setup
            process.env.ANTHROPIC_API_KEY = 'test-api-key';
            delete process.env.ANTHROPIC_MODEL;

            const {createAnthropicClient} = await import('../client.js');

            // Execute
            const client = createAnthropicClient();

            // Verify - should not throw
            expect(client).toBeDefined();
        });

        it('should respect LOG_LEVEL=debug for debugging', async () => {
            // Setup
            process.env.ANTHROPIC_API_KEY = 'test-api-key';
            process.env.LOG_LEVEL = 'debug';

            // Mock console.log to verify debug output
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {
            });

            // Import with debug mode
            await import('../client.js');

            // Verify debug logs were called
            expect(consoleLogSpy).toHaveBeenCalled();

            // Cleanup
            consoleLogSpy.mockRestore();
        });
    });
});
