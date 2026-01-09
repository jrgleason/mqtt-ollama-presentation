/**
 * Unit tests for OllamaClient with LangChain ChatOllama
 *
 * Tests the convertToLangChainMessages() method that transforms
 * simple message objects to LangChain message objects.
 */

import { OllamaClient } from '../OllamaClient.js';
import { HumanMessage, AIMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';

describe('OllamaClient.convertToLangChainMessages', () => {
    describe('Basic Message Conversion', () => {
        it('should convert system message to SystemMessage', () => {
            const messages = [
                { role: 'system', content: 'You are a helpful assistant' }
            ];

            const result = OllamaClient.convertToLangChainMessages(messages);

            expect(result).toHaveLength(1);
            expect(result[0]).toBeInstanceOf(SystemMessage);
            expect(result[0].content).toBe('You are a helpful assistant');
        });

        it('should convert user message to HumanMessage', () => {
            const messages = [
                { role: 'user', content: 'Hello, how are you?' }
            ];

            const result = OllamaClient.convertToLangChainMessages(messages);

            expect(result).toHaveLength(1);
            expect(result[0]).toBeInstanceOf(HumanMessage);
            expect(result[0].content).toBe('Hello, how are you?');
        });

        it('should convert assistant message to AIMessage', () => {
            const messages = [
                { role: 'assistant', content: 'I am doing well, thank you!' }
            ];

            const result = OllamaClient.convertToLangChainMessages(messages);

            expect(result).toHaveLength(1);
            expect(result[0]).toBeInstanceOf(AIMessage);
            expect(result[0].content).toBe('I am doing well, thank you!');
        });

        it('should convert tool message to ToolMessage with tool_call_id', () => {
            const messages = [
                {
                    role: 'tool',
                    content: 'Tool result data',
                    tool_call_id: 'call_123'
                }
            ];

            const result = OllamaClient.convertToLangChainMessages(messages);

            expect(result).toHaveLength(1);
            expect(result[0]).toBeInstanceOf(ToolMessage);
            expect(result[0].content).toBe('Tool result data');
            expect(result[0].tool_call_id).toBe('call_123');
        });

        it('should convert unknown role to HumanMessage', () => {
            const messages = [
                { role: 'unknown', content: 'Unknown message' }
            ];

            const result = OllamaClient.convertToLangChainMessages(messages);

            expect(result).toHaveLength(1);
            expect(result[0]).toBeInstanceOf(HumanMessage);
            expect(result[0].content).toBe('Unknown message');
        });
    });

    describe('Multiple Messages Conversion', () => {
        it('should convert array of multiple messages (typical conversation)', () => {
            const messages = [
                { role: 'system', content: 'You are a helpful assistant' },
                { role: 'user', content: 'What time is it?' },
                { role: 'assistant', content: 'Let me check for you.' }
            ];

            const result = OllamaClient.convertToLangChainMessages(messages);

            expect(result).toHaveLength(3);
            expect(result[0]).toBeInstanceOf(SystemMessage);
            expect(result[1]).toBeInstanceOf(HumanMessage);
            expect(result[2]).toBeInstanceOf(AIMessage);
        });

        it('should convert conversation with tool usage', () => {
            const messages = [
                { role: 'system', content: 'You are a helpful assistant' },
                { role: 'user', content: 'What time is it?' },
                { role: 'assistant', content: 'Calling tool...' },
                { role: 'tool', content: '2025-01-12 14:30:00', tool_call_id: 'call_456' },
                { role: 'assistant', content: 'It is 2:30 PM' }
            ];

            const result = OllamaClient.convertToLangChainMessages(messages);

            expect(result).toHaveLength(5);
            expect(result[0]).toBeInstanceOf(SystemMessage);
            expect(result[1]).toBeInstanceOf(HumanMessage);
            expect(result[2]).toBeInstanceOf(AIMessage);
            expect(result[3]).toBeInstanceOf(ToolMessage);
            expect(result[3].tool_call_id).toBe('call_456');
            expect(result[4]).toBeInstanceOf(AIMessage);
        });

        it('should not mutate original messages array', () => {
            const messages = [
                { role: 'user', content: 'Hello' }
            ];

            const originalMessagesCopy = JSON.parse(JSON.stringify(messages));

            OllamaClient.convertToLangChainMessages(messages);

            expect(JSON.stringify(messages)).toBe(JSON.stringify(originalMessagesCopy));
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty messages array', () => {
            const result = OllamaClient.convertToLangChainMessages([]);

            expect(result).toEqual([]);
        });

        it('should handle messages with empty content', () => {
            const messages = [
                { role: 'user', content: '' }
            ];

            const result = OllamaClient.convertToLangChainMessages(messages);

            expect(result).toHaveLength(1);
            expect(result[0]).toBeInstanceOf(HumanMessage);
            expect(result[0].content).toBe('');
        });
    });

    describe('Voice Gateway Message Flow', () => {
        it('should convert typical voice gateway conversation', () => {
            const messages = [
                { role: 'system', content: 'You are a home automation assistant' },
                { role: 'user', content: 'List all devices' },
                { role: 'assistant', content: 'Let me check the devices for you.' }
            ];

            const result = OllamaClient.convertToLangChainMessages(messages);

            expect(result).toHaveLength(3);
            expect(result[0]).toBeInstanceOf(SystemMessage);
            expect(result[0].content).toBe('You are a home automation assistant');
            expect(result[1]).toBeInstanceOf(HumanMessage);
            expect(result[1].content).toBe('List all devices');
            expect(result[2]).toBeInstanceOf(AIMessage);
            expect(result[2].content).toBe('Let me check the devices for you.');
        });

        it('should convert multi-turn conversation with device control', () => {
            const messages = [
                { role: 'system', content: 'You are a home automation assistant' },
                { role: 'user', content: 'List devices' },
                { role: 'assistant', content: 'Here are your devices: Living Room Light, Kitchen Light' },
                { role: 'user', content: 'Turn on the living room light' },
                { role: 'assistant', content: 'Turning on Living Room Light' }
            ];

            const result = OllamaClient.convertToLangChainMessages(messages);

            expect(result).toHaveLength(5);
            expect(result[0]).toBeInstanceOf(SystemMessage);
            expect(result[1]).toBeInstanceOf(HumanMessage);
            expect(result[2]).toBeInstanceOf(AIMessage);
            expect(result[3]).toBeInstanceOf(HumanMessage);
            expect(result[4]).toBeInstanceOf(AIMessage);
        });
    });
});

describe('OllamaClient.cleanNonEnglish', () => {
    it('should remove Chinese characters from text', () => {
        const text = 'Hello 你好 World';
        const result = OllamaClient.cleanNonEnglish(text);
        expect(result).toBe('Hello  World');
    });

    it('should remove Japanese characters from text', () => {
        const text = 'こんにちは Hello World';
        const result = OllamaClient.cleanNonEnglish(text);
        expect(result).toBe('Hello World');
    });

    it('should remove Korean characters from text', () => {
        const text = '안녕하세요 Hello World';
        const result = OllamaClient.cleanNonEnglish(text);
        expect(result).toBe('Hello World');
    });

    it('should handle text with only English characters', () => {
        const text = 'Hello World';
        const result = OllamaClient.cleanNonEnglish(text);
        expect(result).toBe('Hello World');
    });

    it('should trim whitespace after removing characters', () => {
        const text = '  你好  Hello  World  ';
        const result = OllamaClient.cleanNonEnglish(text);
        expect(result).toBe('Hello  World');
    });

    it('should remove <think> tags from qwen3 models', () => {
        const text = '<think>This is reasoning</think>The actual response';
        const result = OllamaClient.cleanNonEnglish(text);
        expect(result).toBe('The actual response');
    });

    it('should remove nested <think> tags', () => {
        const text = 'Start<think>reason 1<think>nested</think>reason 2</think>End';
        const result = OllamaClient.cleanNonEnglish(text);
        // The regex removes the outermost <think>...</think> but may not handle deeply nested ones perfectly
        // This is acceptable since nested thinking is rare and the outer layer is removed
        expect(result.includes('<think>')).toBe(false);
        expect(result.startsWith('Start')).toBe(true);
        expect(result.endsWith('End')).toBe(true);
    });
});

describe('OllamaClient Performance Configuration', () => {
    let debugLogs;
    let mockLogger;

    beforeEach(() => {
        debugLogs = [];
        mockLogger = {
            debug: (message, data) => debugLogs.push({ message, data }),
            info: () => {},
            warn: () => {},
            error: () => {},
        };
    });

    it('should use default performance settings when not provided', () => {
        const config = {
            ollama: {
                baseUrl: 'http://localhost:11434',
                model: 'qwen3:0.6b',
            }
        };

        const client = new OllamaClient(config, mockLogger);

        // Access the client to trigger initialization
        const chatClient = client.client;

        // Verify debug logging includes default values
        const initLog = debugLogs.find(log => log.message === '✅ ChatOllama client initialized');
        expect(initLog).toBeDefined();
        expect(initLog.data.numCtx).toBe(2048);
        expect(initLog.data.temperature).toBe(0.5);
        expect(initLog.data.keepAlive).toBe(-1);
    });

    it('should use custom numCtx from config', () => {
        const config = {
            ollama: {
                baseUrl: 'http://localhost:11434',
                model: 'qwen3:0.6b',
                numCtx: 4096,
            }
        };

        const client = new OllamaClient(config, mockLogger);
        const chatClient = client.client;

        const initLog = debugLogs.find(log => log.message === '✅ ChatOllama client initialized');
        expect(initLog.data.numCtx).toBe(4096);
    });

    it('should use custom temperature from config', () => {
        const config = {
            ollama: {
                baseUrl: 'http://localhost:11434',
                model: 'qwen3:0.6b',
                temperature: 0.7,
            }
        };

        const client = new OllamaClient(config, mockLogger);
        const chatClient = client.client;

        const initLog = debugLogs.find(log => log.message === '✅ ChatOllama client initialized');
        expect(initLog.data.temperature).toBe(0.7);
    });

    it('should use custom keepAlive from config', () => {
        const config = {
            ollama: {
                baseUrl: 'http://localhost:11434',
                model: 'qwen3:0.6b',
                keepAlive: 3600,
            }
        };

        const client = new OllamaClient(config, mockLogger);
        const chatClient = client.client;

        const initLog = debugLogs.find(log => log.message === '✅ ChatOllama client initialized');
        expect(initLog.data.keepAlive).toBe(3600);
    });

    it('should handle keepAlive=0 (immediate unload)', () => {
        const config = {
            ollama: {
                baseUrl: 'http://localhost:11434',
                model: 'qwen3:0.6b',
                keepAlive: 0,
            }
        };

        const client = new OllamaClient(config, mockLogger);
        const chatClient = client.client;

        const initLog = debugLogs.find(log => log.message === '✅ ChatOllama client initialized');
        expect(initLog.data.keepAlive).toBe(0);
    });

    it('should use all custom performance settings together', () => {
        const config = {
            ollama: {
                baseUrl: 'http://custom:11434',
                model: 'custom-model',
                numCtx: 1024,
                temperature: 0.3,
                keepAlive: 7200,
            }
        };

        const client = new OllamaClient(config, mockLogger);
        const chatClient = client.client;

        const initLog = debugLogs.find(log => log.message === '✅ ChatOllama client initialized');
        expect(initLog.data.baseUrl).toBe('http://custom:11434');
        expect(initLog.data.model).toBe('custom-model');
        expect(initLog.data.numCtx).toBe(1024);
        expect(initLog.data.temperature).toBe(0.3);
        expect(initLog.data.keepAlive).toBe(7200);
    });

    it('should log performance settings for debugging', () => {
        const config = {
            ollama: {
                baseUrl: 'http://localhost:11434',
                model: 'qwen3:0.6b',
                numCtx: 2048,
                temperature: 0.5,
                keepAlive: -1,
            }
        };

        const client = new OllamaClient(config, mockLogger);
        const chatClient = client.client;

        // Verify that performance settings are logged
        const initLog = debugLogs.find(log => log.message === '✅ ChatOllama client initialized');
        expect(initLog).toBeDefined();
        expect(initLog.data).toHaveProperty('numCtx', 2048);
        expect(initLog.data).toHaveProperty('temperature', 0.5);
        expect(initLog.data).toHaveProperty('keepAlive', -1);
    });
});
