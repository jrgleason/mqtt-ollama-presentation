import {ToolExecutor} from '../services/ToolExecutor.js';

describe('ToolExecutor - Error Translation', () => {
    let toolExecutor;
    let mockToolManager;
    let mockLogger;
    let loggedErrors;
    let loggedWarnings;

    beforeEach(() => {
        loggedErrors = [];
        loggedWarnings = [];

        mockLogger = {
            debug: () => {
            },
            info: () => {
            },
            warn: (...args) => loggedWarnings.push(args),
            error: (...args) => loggedErrors.push(args)
        };

        mockToolManager = {
            findTool: () => null,
            getToolNames: () => ['list_devices', 'control_device'],
            normalizeParameters: (name, args) => args,
            getTools: () => [],
            toolCount: 2
        };

        toolExecutor = new ToolExecutor(mockToolManager, mockLogger, {timeout: 5000});
    });

    describe('formatErrorMessage() - Z-Wave Tool Errors', () => {
        it('should preserve friendly error messages from MCP server', () => {
            const error = new Error("I can't reach the smart home system right now. The Z-Wave controller appears to be offline.");
            const result = toolExecutor.formatErrorMessage('list_devices', error);
            expect(result).toBe(error.message);
        });

        it('should translate timeout errors for Z-Wave tools', () => {
            const error = new Error('ETIMEDOUT: Connection timed out');
            const result = toolExecutor.formatErrorMessage('list_devices', error);
            expect(result).toContain('smart home system');
            expect(result).toContain('taking too long to respond');
            expect(result).not.toContain('ETIMEDOUT');
        });

        it('should translate connection refused errors for Z-Wave tools', () => {
            const error = new Error('connect ECONNREFUSED 192.168.1.100:8091');
            const result = toolExecutor.formatErrorMessage('control_device', error);
            expect(result).toContain("can't connect");
            expect(result).toContain('smart home controller');
            expect(result).not.toContain('ECONNREFUSED');
            expect(result).not.toContain('192.168.1.100');
        });

        it('should translate network not found errors for Z-Wave tools', () => {
            const error = new Error('getaddrinfo ENOTFOUND raspberrypi.local');
            const result = toolExecutor.formatErrorMessage('verify_device', error);
            expect(result).toContain("can't find");
            expect(result).toContain('smart home controller');
            expect(result).not.toContain('ENOTFOUND');
            expect(result).not.toContain('getaddrinfo');
        });

        it('should recognize list_devices as Z-Wave tool', () => {
            const error = new Error('Timeout');
            const result = toolExecutor.formatErrorMessage('list_devices', error);
            expect(result).toContain('smart home system');
        });

        it('should recognize verify_device as Z-Wave tool', () => {
            const error = new Error('Timeout');
            const result = toolExecutor.formatErrorMessage('verify_device', error);
            expect(result).toContain('smart home system');
        });

        it('should recognize control_device as Z-Wave tool', () => {
            const error = new Error('Timeout');
            const result = toolExecutor.formatErrorMessage('control_device', error);
            expect(result).toContain('smart home system');
        });

        it('should recognize get_device_sensor_data as Z-Wave tool', () => {
            const error = new Error('Timeout');
            const result = toolExecutor.formatErrorMessage('get_device_sensor_data', error);
            expect(result).toContain('smart home system');
        });

        it('should recognize tools with "zwave" in name', () => {
            const error = new Error('Timeout');
            const result = toolExecutor.formatErrorMessage('list_zwave_devices', error);
            expect(result).toContain('smart home system');
        });
    });

    describe('formatErrorMessage() - Non-Z-Wave Tools', () => {
        it('should use generic timeout message for non-Z-Wave tools', () => {
            const error = new Error('Request timeout');
            const result = toolExecutor.formatErrorMessage('weather_lookup', error);
            expect(result).toBe('The weather_lookup operation timed out. Please try again later.');
        });

        it('should use generic network error for non-Z-Wave tools', () => {
            const error = new Error('Network error: ECONNREFUSED');
            const result = toolExecutor.formatErrorMessage('api_call', error);
            expect(result).toBe('The api_call service is currently unavailable. Please check your network connection.');
        });
    });

    describe('formatErrorMessage() - Parameter Validation', () => {
        it('should handle invalid parameter errors', () => {
            const error = new Error('Required parameter "deviceName" is missing');
            const result = toolExecutor.formatErrorMessage('control_device', error);
            expect(result).toContain('Invalid parameters');
            expect(result).toContain(error.message);
        });

        it('should handle invalid format errors', () => {
            const error = new Error('Invalid value for parameter "level"');
            const result = toolExecutor.formatErrorMessage('dim_device', error);
            expect(result).toContain('Invalid parameters');
        });
    });

    describe('Error message quality standards', () => {
        const zWaveErrors = [
            {error: new Error('ETIMEDOUT'), toolName: 'list_devices'},
            {error: new Error('ECONNREFUSED'), toolName: 'control_device'},
            {error: new Error('ENOTFOUND'), toolName: 'verify_device'}
        ];

        zWaveErrors.forEach(({error, toolName}) => {
            it(`should produce speakable messages for ${error.message}`, () => {
                const result = toolExecutor.formatErrorMessage(toolName, error);

                // Should not contain technical codes
                expect(result).not.toMatch(/ECONNREFUSED|ETIMEDOUT|ENOTFOUND/);

                // Should be conversational or informative
                const hasConversationalTone =
                    result.includes("can't") ||
                    result.includes("I ") ||
                    result.toLowerCase().includes('please') ||
                    result.includes('system') ||
                    result.includes('might be');
                expect(hasConversationalTone).toBe(true);

                // Should be reasonably short for TTS
                expect(result.length).toBeLessThan(300);
            });
        });
    });

    describe('execute() error handling integration', () => {
        it('should call formatErrorMessage when tool execution fails', async () => {
            const mockTool = {
                invoke: async () => {
                    throw new Error('ETIMEDOUT');
                }
            };

            mockToolManager.findTool = () => mockTool;

            const result = await toolExecutor.execute('list_devices', {});

            expect(result).toContain('smart home system');
            expect(result).not.toContain('ETIMEDOUT');
        });

        it('should log original error for debugging', async () => {
            const mockTool = {
                invoke: async () => {
                    throw new Error('Socket connection failed');
                }
            };

            mockToolManager.findTool = () => mockTool;

            await toolExecutor.execute('control_device', {});

            expect(loggedErrors.length).toBeGreaterThan(0);
            const errorLog = loggedErrors[0];
            expect(errorLog[0]).toContain('Tool execution failed');
            expect(errorLog[1]).toEqual(
                expect.objectContaining({
                    error: 'Socket connection failed'
                })
            );
        });
    });
});
