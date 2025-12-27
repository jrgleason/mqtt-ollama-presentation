/**
 * MCP Retry Logic Tests
 *
 * Tests the exponential backoff retry functionality for MCP server connections.
 * Validates retry behavior, timing, error handling, and graceful degradation.
 */

import { jest } from '@jest/globals';

// Mock dependencies before importing the module under test
const mockMultiServerMCPClient = jest.fn();
const mockGetTools = jest.fn();
const mockGetClient = jest.fn();
const mockClose = jest.fn();

jest.unstable_mockModule('@langchain/mcp-adapters', () => ({
    MultiServerMCPClient: mockMultiServerMCPClient
}));

jest.unstable_mockModule('@modelcontextprotocol/sdk/client/stdio.js', () => ({
    StdioClientTransport: class StdioClientTransport {}
}));

// Import after mocking
const { initializeMCPIntegration } = await import('../src/services/MCPIntegration.js');

describe('MCP Retry Logic', () => {
    let mockLogger;
    let mockConfig;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        jest.clearAllTimers();

        // Setup mock logger
        mockLogger = {
            info: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            debug: jest.fn()
        };

        // Setup mock config with retry settings
        mockConfig = {
            mqtt: {
                brokerUrl: 'mqtt://localhost:1883',
                zwaveTopic: 'zwave'
            },
            mcp: {
                retryAttempts: 3,
                retryBaseDelay: 2000
            }
        };

        // Setup default mock client behavior
        mockMultiServerMCPClient.mockImplementation(() => ({
            getTools: mockGetTools,
            getClient: mockGetClient,
            close: mockClose
        }));

        // Use fake timers for controlling async delays
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('Successful Connection', () => {
        test('should succeed on first attempt without retry', async () => {
            // Arrange: Mock successful tool discovery
            const mockTools = [
                { lc_name: 'zwave_control', name: 'zwave_control' },
                { lc_name: 'zwave_status', name: 'zwave_status' }
            ];
            mockGetTools.mockResolvedValue(mockTools);

            // Act: Initialize with promise that resolves immediately
            const resultPromise = initializeMCPIntegration(mockConfig, mockLogger);
            await jest.runAllTimersAsync();
            const result = await resultPromise;

            // Assert: Should succeed without retries
            expect(result).toHaveProperty('mcpClient');
            expect(result).toHaveProperty('tools');
            expect(result.tools).toEqual(mockTools);

            // Should log success on first attempt
            expect(mockLogger.info).toHaveBeenCalledWith(
                '🚀 Initializing MCP integration...',
                expect.objectContaining({ attempt: 1, maxAttempts: 3 })
            );

            expect(mockLogger.info).toHaveBeenCalledWith(
                '✅ MCP integration initialized',
                expect.objectContaining({
                    toolCount: 2,
                    attemptNumber: 1
                })
            );

            // Should NOT log any warnings or errors
            expect(mockLogger.warn).not.toHaveBeenCalled();
            expect(mockLogger.error).not.toHaveBeenCalled();
        });
    });

    describe('Retry on Transient Failure', () => {
        test('should retry and succeed on second attempt', async () => {
            // Arrange: Fail first, succeed second
            mockGetTools
                .mockRejectedValueOnce(new Error('Connection refused'))
                .mockResolvedValueOnce([
                    { lc_name: 'zwave_control', name: 'zwave_control' }
                ]);

            // Act: Initialize and advance timers
            const resultPromise = initializeMCPIntegration(mockConfig, mockLogger);

            // Fast-forward through retry delay (2000ms for attempt 2)
            await jest.advanceTimersByTimeAsync(2000);

            const result = await resultPromise;

            // Assert: Should succeed after retry
            expect(result.tools).toHaveLength(1);

            // Should log first attempt failure
            expect(mockLogger.warn).toHaveBeenCalledWith(
                '❌ MCP connection attempt 1/3 failed',
                expect.objectContaining({
                    error: 'Connection refused'
                })
            );

            // Should log retry message
            expect(mockLogger.info).toHaveBeenCalledWith(
                '⏳ Retrying MCP connection in 2000ms...',
                expect.objectContaining({ nextAttempt: 2, maxAttempts: 3 })
            );

            // Should log final success on attempt 2
            expect(mockLogger.info).toHaveBeenCalledWith(
                '✅ MCP integration initialized',
                expect.objectContaining({ attemptNumber: 2 })
            );
        });

        test('should retry and succeed on third attempt with exponential backoff', async () => {
            // Arrange: Fail twice, succeed third time
            mockGetTools
                .mockRejectedValueOnce(new Error('Temporary failure 1'))
                .mockRejectedValueOnce(new Error('Temporary failure 2'))
                .mockResolvedValueOnce([
                    { lc_name: 'zwave_control', name: 'zwave_control' }
                ]);

            // Act: Initialize
            const resultPromise = initializeMCPIntegration(mockConfig, mockLogger);

            // Fast-forward through first retry (2000ms)
            await jest.advanceTimersByTimeAsync(2000);

            // Fast-forward through second retry (4000ms - exponential backoff)
            await jest.advanceTimersByTimeAsync(4000);

            const result = await resultPromise;

            // Assert: Should succeed on attempt 3
            expect(result.tools).toHaveLength(1);

            // Verify exponential backoff delays
            expect(mockLogger.info).toHaveBeenCalledWith(
                '⏳ Retrying MCP connection in 2000ms...',
                expect.objectContaining({ nextAttempt: 2 })
            );

            expect(mockLogger.info).toHaveBeenCalledWith(
                '⏳ Retrying MCP connection in 4000ms...',
                expect.objectContaining({ nextAttempt: 3 })
            );

            // Should succeed on third attempt
            expect(mockLogger.info).toHaveBeenCalledWith(
                '✅ MCP integration initialized',
                expect.objectContaining({ attemptNumber: 3 })
            );
        });
    });

    describe('Permanent Failure', () => {
        test('should fail permanently after all retries exhausted', async () => {
            // Arrange: Fail all attempts
            mockGetTools.mockRejectedValue(new Error('Permanent connection failure'));

            // Act & Assert: Should throw after all retries
            const resultPromise = initializeMCPIntegration(mockConfig, mockLogger);

            // Advance through all retry delays
            await jest.advanceTimersByTimeAsync(2000); // Retry 1->2
            await jest.advanceTimersByTimeAsync(4000); // Retry 2->3

            await expect(resultPromise).rejects.toThrow(
                'MCP connection failed after 3 attempts'
            );

            // Should log all 3 failures
            expect(mockLogger.warn).toHaveBeenCalledTimes(3);

            // Should log final error with details
            expect(mockLogger.error).toHaveBeenCalledWith(
                '❌ MCP integration permanently failed',
                expect.objectContaining({
                    attempts: 3,
                    originalError: 'Permanent connection failure'
                })
            );
        });

        test('should include stderr in final error when available', async () => {
            // Arrange: Mock client that provides stderr
            const mockStderrStream = {
                on: jest.fn((event, handler) => {
                    if (event === 'data') {
                        // Simulate stderr output
                        handler(Buffer.from('MCP server error: MQTT broker unavailable'));
                    }
                }),
                once: jest.fn()
            };

            const mockTransport = {
                stderr: mockStderrStream
            };

            mockGetClient.mockResolvedValue({
                _transport: mockTransport
            });

            mockGetTools.mockRejectedValue(new Error('Connection failed'));

            // Act: Try to initialize
            const resultPromise = initializeMCPIntegration(mockConfig, mockLogger);

            // Advance through all retry delays
            await jest.advanceTimersByTimeAsync(2000);
            await jest.advanceTimersByTimeAsync(4000);

            // Assert: Error should include stderr
            await expect(resultPromise).rejects.toThrow();

            // Verify stderr was logged
            expect(mockLogger.error).toHaveBeenCalledWith(
                '❌ MCP integration permanently failed',
                expect.objectContaining({
                    stderr: expect.stringContaining('MCP server error')
                })
            );
        });
    });

    describe('Retry Timing', () => {
        test('should use correct exponential backoff delays', async () => {
            // Arrange: Track timing of attempts
            const attemptTimes = [];
            mockGetTools.mockImplementation(() => {
                attemptTimes.push(Date.now());
                return Promise.reject(new Error('Test failure'));
            });

            // Act: Initialize
            const resultPromise = initializeMCPIntegration(mockConfig, mockLogger);

            // Attempt 1: immediate (0ms)
            expect(attemptTimes).toHaveLength(1);
            const startTime = attemptTimes[0];

            // Attempt 2: after 2000ms
            await jest.advanceTimersByTimeAsync(2000);
            expect(attemptTimes).toHaveLength(2);
            expect(attemptTimes[1] - startTime).toBe(2000);

            // Attempt 3: after 4000ms more (total 6000ms)
            await jest.advanceTimersByTimeAsync(4000);
            expect(attemptTimes).toHaveLength(3);
            expect(attemptTimes[2] - attemptTimes[1]).toBe(4000);

            // Clean up
            await expect(resultPromise).rejects.toThrow();
        });

        test('should respect custom retry configuration', async () => {
            // Arrange: Custom config with different retry settings
            const customConfig = {
                ...mockConfig,
                mcp: {
                    retryAttempts: 2,
                    retryBaseDelay: 1000
                }
            };

            mockGetTools.mockRejectedValue(new Error('Test failure'));

            // Act: Initialize with custom config
            const resultPromise = initializeMCPIntegration(customConfig, mockLogger);

            // Should only retry once (2 total attempts)
            await jest.advanceTimersByTimeAsync(1000); // First retry

            await expect(resultPromise).rejects.toThrow(
                'MCP connection failed after 2 attempts'
            );

            // Verify only 2 attempts were made
            expect(mockLogger.warn).toHaveBeenCalledTimes(2);
        });
    });

    describe('Error Handling', () => {
        test('should handle errors during stderr capture gracefully', async () => {
            // Arrange: Mock getClient to throw error
            mockGetClient.mockRejectedValue(new Error('Cannot access client'));
            mockGetTools.mockRejectedValue(new Error('Connection failed'));

            // Act: Initialize
            const resultPromise = initializeMCPIntegration(mockConfig, mockLogger);

            await jest.advanceTimersByTimeAsync(2000);
            await jest.advanceTimersByTimeAsync(4000);

            // Assert: Should still fail gracefully without stderr
            await expect(resultPromise).rejects.toThrow();

            // Should log debug message about stderr capture failure
            expect(mockLogger.debug).toHaveBeenCalledWith(
                'Failed to capture stderr',
                expect.any(Object)
            );
        });

        test('should preserve original error cause in final error', async () => {
            // Arrange: Create specific error
            const originalError = new Error('ECONNREFUSED: Connection refused');
            originalError.code = 'ECONNREFUSED';

            mockGetTools.mockRejectedValue(originalError);

            // Act & Assert
            const resultPromise = initializeMCPIntegration(mockConfig, mockLogger);

            await jest.advanceTimersByTimeAsync(2000);
            await jest.advanceTimersByTimeAsync(4000);

            try {
                await resultPromise;
                fail('Should have thrown error');
            } catch (error) {
                expect(error.cause).toBe(originalError);
                expect(error.cause.code).toBe('ECONNREFUSED');
            }
        });
    });

    describe('Integration Scenarios', () => {
        test('should work correctly with default config values', async () => {
            // Arrange: Config without MCP retry settings
            const minimalConfig = {
                mqtt: {
                    brokerUrl: 'mqtt://localhost:1883'
                }
                // No mcp config - should use defaults
            };

            mockGetTools.mockResolvedValue([]);

            // Act: Initialize
            const resultPromise = initializeMCPIntegration(minimalConfig, mockLogger);
            await jest.runAllTimersAsync();
            await resultPromise;

            // Assert: Should use default values (3 attempts, 2000ms base delay)
            expect(mockLogger.info).toHaveBeenCalledWith(
                '🚀 Initializing MCP integration...',
                expect.objectContaining({ maxAttempts: 3 })
            );
        });

        test('should not retry on immediate success', async () => {
            // Arrange: Success on first try
            mockGetTools.mockResolvedValue([
                { lc_name: 'tool1', name: 'tool1' }
            ]);

            // Act: Initialize
            const startTime = Date.now();
            const resultPromise = initializeMCPIntegration(mockConfig, mockLogger);
            await jest.runAllTimersAsync();
            const result = await resultPromise;
            const endTime = Date.now();

            // Assert: Should complete immediately (no delays)
            expect(endTime - startTime).toBeLessThan(100); // Allow for execution time
            expect(result.tools).toHaveLength(1);

            // Should only attempt once
            expect(mockLogger.info).toHaveBeenCalledWith(
                '🚀 Initializing MCP integration...',
                expect.objectContaining({ attempt: 1 })
            );

            expect(mockLogger.warn).not.toHaveBeenCalled();
        });
    });
});
