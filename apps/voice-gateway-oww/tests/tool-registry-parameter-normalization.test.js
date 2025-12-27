/**
 * Test suite for ToolRegistry parameter normalization
 * Validates snake_case to camelCase conversion for MCP tools
 */

import { jest } from '@jest/globals';
import { ToolRegistry } from '../src/services/ToolRegistry.js';

describe('ToolRegistry Parameter Normalization', () => {
    let registry;

    beforeEach(() => {
        registry = new ToolRegistry();
    });

    afterEach(() => {
        registry.clear();
    });

    describe('Helper Functions', () => {
        test('_snakeToCamel converts snake_case to camelCase', () => {
            expect(registry._snakeToCamel('device_name')).toBe('deviceName');
            expect(registry._snakeToCamel('command')).toBe('command');
            expect(registry._snakeToCamel('device_name_id')).toBe('deviceNameId');
            expect(registry._snakeToCamel('new_parameter_name')).toBe('newParameterName');
        });

        test('_normalizeParameters applies parameter mapping', () => {
            const args = { device_name: 'Switch One', command: 'on' };
            const mapping = { device_name: 'deviceName', command: 'action' };

            const result = registry._normalizeParameters(args, mapping);

            expect(result).toEqual({ deviceName: 'Switch One', action: 'on' });
        });

        test('_normalizeParameters passes through when no mapping', () => {
            const args = { deviceName: 'Switch One', action: 'on' };
            const mapping = {};

            const result = registry._normalizeParameters(args, mapping);

            expect(result).toEqual(args);
        });

        test('_normalizeParameters handles unmapped parameters', () => {
            const args = { device_name: 'Switch One', level: 50 };
            const mapping = { device_name: 'deviceName' };

            const result = registry._normalizeParameters(args, mapping);

            expect(result).toEqual({ deviceName: 'Switch One', level: 50 });
        });
    });

    describe('Static Parameter Mappings', () => {
        test('control_zwave_device has correct static mapping', async () => {
            const mockTool = {
                name: 'control_zwave_device',
                lc_name: 'control_zwave_device',
                schema: {
                    description: 'Control Z-Wave device',
                    input_schema: {
                        type: 'object',
                        properties: {
                            device_name: { type: 'string' },
                            command: { type: 'string' },
                            brightness: { type: 'number' }
                        }
                    }
                },
                invoke: jest.fn(async ({ input }) => {
                    return JSON.stringify({ success: true, args: input });
                })
            };

            registry.registerLangChainTool(mockTool);

            const executor = registry.getExecutor('control_zwave_device');
            const result = await executor({ device_name: 'Switch One', command: 'on' });

            expect(mockTool.invoke).toHaveBeenCalledWith({
                input: { deviceName: 'Switch One', action: 'on' }
            });
        });

        test('get_device_sensor_data has correct static mapping', async () => {
            const mockTool = {
                name: 'get_device_sensor_data',
                lc_name: 'get_device_sensor_data',
                schema: {
                    description: 'Get sensor data',
                    input_schema: {
                        type: 'object',
                        properties: {
                            device_name: { type: 'string' }
                        }
                    }
                },
                invoke: jest.fn(async ({ input }) => {
                    return JSON.stringify({ temperature: 72, args: input });
                })
            };

            registry.registerLangChainTool(mockTool);

            const executor = registry.getExecutor('get_device_sensor_data');
            const result = await executor({ device_name: 'Sensor One' });

            expect(mockTool.invoke).toHaveBeenCalledWith({
                input: { deviceName: 'Sensor One' }
            });
        });
    });

    describe('Heuristic Parameter Mapping', () => {
        test('unknown MCP tool uses heuristic conversion', async () => {
            const mockTool = {
                name: 'new_custom_tool',
                lc_name: 'new_custom_tool',
                schema: {
                    description: 'Custom tool',
                    input_schema: {
                        type: 'object',
                        properties: {
                            new_parameter_name: { type: 'string' },
                            another_param: { type: 'number' }
                        }
                    }
                },
                invoke: jest.fn(async ({ input }) => {
                    return JSON.stringify({ success: true, args: input });
                })
            };

            registry.registerLangChainTool(mockTool);

            const executor = registry.getExecutor('new_custom_tool');
            const result = await executor({ new_parameter_name: 'test', another_param: 42 });

            expect(mockTool.invoke).toHaveBeenCalledWith({
                input: { newParameterName: 'test', anotherParam: 42 }
            });
        });

        test('parameters without underscores pass through unchanged', async () => {
            const mockTool = {
                name: 'simple_tool',
                lc_name: 'simple_tool',
                schema: {
                    description: 'Simple tool',
                    input_schema: {
                        type: 'object',
                        properties: {
                            level: { type: 'number' },
                            value: { type: 'string' }
                        }
                    }
                },
                invoke: jest.fn(async ({ input }) => {
                    return JSON.stringify({ success: true, args: input });
                })
            };

            registry.registerLangChainTool(mockTool);

            const executor = registry.getExecutor('simple_tool');
            const result = await executor({ level: 50, value: 'test' });

            expect(mockTool.invoke).toHaveBeenCalledWith({
                input: { level: 50, value: 'test' }
            });
        });
    });

    describe('Built-in Tools (Non-MCP)', () => {
        test('built-in tools are not affected by normalization', async () => {
            const builtInTool = {
                type: 'function',
                function: {
                    name: 'get_current_time',
                    description: 'Get current time',
                    parameters: {
                        type: 'object',
                        properties: {
                            timezone: { type: 'string' }
                        }
                    }
                }
            };

            const executor = jest.fn(async (args) => {
                return JSON.stringify({ time: '12:00 PM', timezone: args.timezone });
            });

            registry.registerTool(builtInTool, executor);

            const toolExecutor = registry.getExecutor('get_current_time');
            const result = await toolExecutor({ timezone: 'America/New_York' });

            expect(executor).toHaveBeenCalledWith({ timezone: 'America/New_York' });
        });
    });

    describe('Edge Cases', () => {
        test('handles empty args object', async () => {
            const mockTool = {
                name: 'no_params_tool',
                lc_name: 'no_params_tool',
                schema: {
                    description: 'Tool with no params',
                    input_schema: {
                        type: 'object',
                        properties: {}
                    }
                },
                invoke: jest.fn(async ({ input }) => {
                    return JSON.stringify({ success: true });
                })
            };

            registry.registerLangChainTool(mockTool);

            const executor = registry.getExecutor('no_params_tool');
            const result = await executor({});

            expect(mockTool.invoke).toHaveBeenCalledWith({ input: {} });
        });

        test('handles parameters with multiple underscores', async () => {
            const mockTool = {
                name: 'complex_tool',
                lc_name: 'complex_tool',
                schema: {
                    description: 'Complex tool',
                    input_schema: {
                        type: 'object',
                        properties: {
                            device_name_id: { type: 'string' },
                            sensor_value_unit: { type: 'string' }
                        }
                    }
                },
                invoke: jest.fn(async ({ input }) => {
                    return JSON.stringify({ success: true, args: input });
                })
            };

            registry.registerLangChainTool(mockTool);

            const executor = registry.getExecutor('complex_tool');
            const result = await executor({
                device_name_id: 'device123',
                sensor_value_unit: 'celsius'
            });

            expect(mockTool.invoke).toHaveBeenCalledWith({
                input: {
                    deviceNameId: 'device123',
                    sensorValueUnit: 'celsius'
                }
            });
        });

        test('preserves parameter values with underscores', async () => {
            const mockTool = {
                name: 'value_test_tool',
                lc_name: 'value_test_tool',
                schema: {
                    description: 'Value test',
                    input_schema: {
                        type: 'object',
                        properties: {
                            device_name: { type: 'string' }
                        }
                    }
                },
                invoke: jest.fn(async ({ input }) => {
                    return JSON.stringify({ success: true, args: input });
                })
            };

            registry.registerLangChainTool(mockTool);

            const executor = registry.getExecutor('value_test_tool');
            const result = await executor({ device_name: 'my_special_device' });

            // Parameter name is normalized, but VALUE is preserved
            expect(mockTool.invoke).toHaveBeenCalledWith({
                input: { deviceName: 'my_special_device' }
            });
        });
    });

    describe('Integration with MCP Tools', () => {
        test('MCP tools are registered and executable', async () => {
            const mockTool = {
                name: 'control_zwave_device',
                lc_name: 'control_zwave_device',
                schema: {
                    description: 'Control Z-Wave device',
                    input_schema: {
                        type: 'object',
                        properties: {
                            device_name: { type: 'string' },
                            command: { type: 'string' }
                        }
                    }
                },
                invoke: jest.fn(async ({ input }) => {
                    return JSON.stringify({ success: true, args: input });
                })
            };

            registry.registerLangChainTool(mockTool);

            // Verify tool is registered and can be executed
            expect(registry.hasTool('control_zwave_device')).toBe(true);

            const executor = registry.getExecutor('control_zwave_device');
            expect(executor).toBeDefined();

            // Execute with snake_case parameters
            await executor({ device_name: 'Test Device', command: 'on' });

            // Verify normalized parameters were passed to MCP tool
            expect(mockTool.invoke).toHaveBeenCalledWith({
                input: { deviceName: 'Test Device', action: 'on' }
            });
        });
    });
});
