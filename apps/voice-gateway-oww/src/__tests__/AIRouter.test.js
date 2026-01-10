/**
 * AIRouter.test.js - Tests for AIRouter system prompt building
 *
 * Tests include:
 * - System prompt construction with device hints
 * - System prompt construction with datetime hints
 * - Combined hints
 * - Configuration validation
 */

import {AIRouter} from '../ai/AIRouter.js';

describe('AIRouter', () => {
    let mockConfig;
    let mockLogger;
    let mockToolExecutor;

    beforeEach(() => {
        // Mock configuration
        mockConfig = {
            ai: {
                provider: 'ollama',
                systemPrompt: 'You are a helpful assistant.'
            },
            ollama: {
                model: 'qwen3:0.6b',
                baseUrl: 'http://localhost:11434'
            },
            tts: {
                enabled: false,
                streaming: false
            }
        };

        // Mock logger with call tracking
        const debugCalls = [];
        const infoCalls = [];
        const errorCalls = [];
        const warnCalls = [];

        mockLogger = {
            debug: (...args) => debugCalls.push(args),
            info: (...args) => infoCalls.push(args),
            error: (...args) => errorCalls.push(args),
            warn: (...args) => warnCalls.push(args),
            _calls: {debug: debugCalls, info: infoCalls, error: errorCalls, warn: warnCalls}
        };

        // Mock tool executor
        mockToolExecutor = {
            toolManager: {
                getTools: () => []
            },
            execute: async (toolName, args) => {
                return `Mock result for ${toolName}`;
            }
        };
    });

    describe('Constructor', () => {
        it('should initialize with valid config', () => {
            expect(() => {
                new AIRouter(mockConfig, mockLogger, mockToolExecutor);
            }).not.toThrow();
        });

        it('should throw error if config.ai is missing', () => {
            delete mockConfig.ai;
            expect(() => {
                new AIRouter(mockConfig, mockLogger, mockToolExecutor);
            }).toThrow('AIRouter requires config.ai.provider');
        });

        it('should throw error if config.ai.provider is missing', () => {
            delete mockConfig.ai.provider;
            expect(() => {
                new AIRouter(mockConfig, mockLogger, mockToolExecutor);
            }).toThrow('AIRouter requires config.ai.provider');
        });

        it('should use default system prompt if not provided', () => {
            delete mockConfig.ai.systemPrompt;
            const router = new AIRouter(mockConfig, mockLogger, mockToolExecutor);
            expect(router.defaultSystemPrompt).toContain('helpful home automation assistant');
        });

        it('should use config system prompt if provided', () => {
            mockConfig.ai.systemPrompt = 'Custom prompt';
            const router = new AIRouter(mockConfig, mockLogger, mockToolExecutor);
            expect(router.defaultSystemPrompt).toBe('Custom prompt');
        });

        it('should add "no think tags" hint for Ollama', () => {
            mockConfig.ai.provider = 'ollama';
            delete mockConfig.ai.systemPrompt;
            const router = new AIRouter(mockConfig, mockLogger, mockToolExecutor);
            expect(router.defaultSystemPrompt).toContain('Do NOT use <think> tags');
        });

        it('should not add "no think tags" hint for Anthropic', () => {
            mockConfig.ai.provider = 'anthropic';
            delete mockConfig.ai.systemPrompt;
            const router = new AIRouter(mockConfig, mockLogger, mockToolExecutor);
            expect(router.defaultSystemPrompt).not.toContain('Do NOT use <think> tags');
        });
    });

    describe('buildSystemPrompt', () => {
        let router;

        beforeEach(() => {
            router = new AIRouter(mockConfig, mockLogger, mockToolExecutor);
        });

        it('should return default prompt with no hints', async () => {
            const prompt = await router.buildSystemPrompt(false, false);
            expect(prompt).toBe(router.defaultSystemPrompt);
            expect(mockLogger._calls.debug.length).toBe(0);
        });

        it('should add device hint when includeDevices is true', async () => {
            const prompt = await router.buildSystemPrompt(true, false);
            expect(prompt).toContain(router.defaultSystemPrompt);
            expect(prompt).toContain('tools available to query and control Z-Wave devices');
            expect(mockLogger._calls.debug.length).toBe(1);
            expect(mockLogger._calls.debug[0][0]).toBe('AIRouter: Added device tool hint to system prompt');
        });

        it('should add datetime hint when includeDateTime is true', async () => {
            const prompt = await router.buildSystemPrompt(false, true);
            expect(prompt).toContain(router.defaultSystemPrompt);
            expect(prompt).toContain('get_current_datetime tool available');
            expect(prompt).toContain('Use it for any time/date questions');
            expect(mockLogger._calls.debug.length).toBe(1);
            expect(mockLogger._calls.debug[0][0]).toBe('AIRouter: Added datetime tool hint to system prompt');
        });

        it('should add both hints when both flags are true', async () => {
            const prompt = await router.buildSystemPrompt(true, true);
            expect(prompt).toContain(router.defaultSystemPrompt);
            expect(prompt).toContain('tools available to query and control Z-Wave devices');
            expect(prompt).toContain('get_current_datetime tool available');
            expect(mockLogger._calls.debug.length).toBe(2);
            expect(mockLogger._calls.debug[0][0]).toBe('AIRouter: Added device tool hint to system prompt');
            expect(mockLogger._calls.debug[1][0]).toBe('AIRouter: Added datetime tool hint to system prompt');
        });

        it('should structure hints as separate paragraphs', async () => {
            const prompt = await router.buildSystemPrompt(true, true);
            // Should have newlines separating the hints
            expect(prompt).toMatch(/\n\n.*Z-Wave devices/);
            expect(prompt).toMatch(/\n\n.*get_current_datetime/);
        });

        it('should preserve default prompt at the beginning', async () => {
            const prompt = await router.buildSystemPrompt(true, true);
            expect(prompt.startsWith(router.defaultSystemPrompt)).toBe(true);
        });
    });

    describe('executeTool', () => {
        let router;

        beforeEach(() => {
            router = new AIRouter(mockConfig, mockLogger, mockToolExecutor);
        });

        it('should delegate to toolExecutor', async () => {
            const result = await router.executeTool('test_tool', {arg: 'value'});
            expect(result).toBe('Mock result for test_tool');
        });

        it('should return error if toolExecutor not available', async () => {
            const routerNoExecutor = new AIRouter(mockConfig, mockLogger, null);
            const result = await routerNoExecutor.executeTool('test_tool', {});
            expect(result).toContain('Error: Tool execution not configured');
            expect(mockLogger._calls.error.length).toBe(1);
            expect(mockLogger._calls.error[0][0]).toBe('AIRouter: ToolExecutor not available');
        });
    });

    describe('isStreamingEnabled', () => {
        it('should return true for Anthropic with streaming enabled', () => {
            mockConfig.ai.provider = 'anthropic';
            mockConfig.tts.enabled = true;
            mockConfig.tts.streaming = true;
            const router = new AIRouter(mockConfig, mockLogger, mockToolExecutor);
            expect(router.isStreamingEnabled()).toBe(true);
        });

        it('should return false for Ollama', () => {
            mockConfig.ai.provider = 'ollama';
            mockConfig.tts.enabled = true;
            mockConfig.tts.streaming = true;
            const router = new AIRouter(mockConfig, mockLogger, mockToolExecutor);
            expect(router.isStreamingEnabled()).toBe(false);
        });

        it('should return false if TTS not enabled', () => {
            mockConfig.ai.provider = 'anthropic';
            mockConfig.tts.enabled = false;
            mockConfig.tts.streaming = true;
            const router = new AIRouter(mockConfig, mockLogger, mockToolExecutor);
            expect(router.isStreamingEnabled()).toBe(false);
        });

        it('should return false if streaming not enabled', () => {
            mockConfig.ai.provider = 'anthropic';
            mockConfig.tts.enabled = true;
            mockConfig.tts.streaming = false;
            const router = new AIRouter(mockConfig, mockLogger, mockToolExecutor);
            expect(router.isStreamingEnabled()).toBe(false);
        });
    });

    describe('healthCheck', () => {
        it('should return healthy status for Ollama', async () => {
            mockConfig.ai.provider = 'ollama';
            const router = new AIRouter(mockConfig, mockLogger, mockToolExecutor);
            const health = await router.healthCheck();
            expect(health.healthy).toBe(true);
            expect(health.provider).toBe('ollama');
            expect(health.model).toBe('qwen3:0.6b');
            expect(health.streamingEnabled).toBe(false);
        });

        it('should return healthy status for Anthropic', async () => {
            mockConfig.ai.provider = 'anthropic';
            mockConfig.anthropic = {model: 'claude-3-5-haiku-20241022'};
            const router = new AIRouter(mockConfig, mockLogger, mockToolExecutor);
            const health = await router.healthCheck();
            expect(health.healthy).toBe(true);
            expect(health.provider).toBe('anthropic');
            expect(health.model).toBe('claude-3-5-haiku-20241022');
        });
    });
});
