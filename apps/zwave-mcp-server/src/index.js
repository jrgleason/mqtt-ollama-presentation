import 'dotenv/config';
import {Server} from '@modelcontextprotocol/sdk/server/index.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {CallToolRequestSchema, ListToolsRequestSchema,} from '@modelcontextprotocol/sdk/types.js';
import {DeviceRegistryBuilder} from './device-registry.js';
import {ZWaveUIClient} from './zwave-client.js';
import {MQTTClientWrapper} from './mqtt-client.js';
import {getConfig, getMQTTConfig} from './config.js';

/**
 * IMPORTANT: MCP Server Logging Convention
 *
 * All debug/diagnostic logs MUST use console.warn() to write to stderr.
 * Actual errors should use console.error().
 * The MCP SDK stdio transport requires stdout to contain ONLY newline-delimited JSON-RPC messages.
 * Any output to stdout (e.g., console.log, console.debug, console.info) will break the protocol
 * and cause JSON parse failures in the client.
 */

/**
 * IMPORTANT: MCP Server Logging Convention
 *
 * All debug/diagnostic logs MUST use console.warn() to write to stderr.
 * Actual errors should use console.error().
 * The MCP SDK stdio transport requires stdout to contain ONLY newline-delimited JSON-RPC messages.
 * Any output to stdout (e.g., console.log, console.debug, console.info) will break the protocol
 * and cause JSON parse failures in the client.
 */

/** @typedef {import('./types.js').ZWaveNode} ZWaveNode */
/** @typedef {import('./types.js').ZWaveConfig} ZWaveConfig */
/** @typedef {import('./types.js').DeviceRegistry} DeviceRegistry */
/** @typedef {import('./types.js').ToolDeviceSummary} ToolDeviceSummary */


const zwaveConfig = getConfig();
const mqttConfig = getMQTTConfig();
const zwaveClient = new ZWaveUIClient(zwaveConfig);
const registryBuilder = new DeviceRegistryBuilder();

// Initialize MQTT client if enabled
let mqttClient = null;
if (mqttConfig.enabled) {
    try {
        mqttClient = new MQTTClientWrapper({
            brokerUrl: mqttConfig.brokerUrl,
            username: mqttConfig.username,
            password: mqttConfig.password,
        });
        console.warn('[MCP Server] MQTT integration enabled (prefer MQTT:', mqttConfig.preferMqtt, ')');
    } catch (error) {
        console.error('[MCP Server] Failed to initialize MQTT client:', error);
        console.warn('[MCP Server] Continuing without MQTT integration');
    }
} else {
    console.warn('[MCP Server] MQTT integration disabled');
}

/**
 * @param {ZWaveNode[]} nodes
 * @returns {ZWaveConfig}
 */
function toRegistry(nodes) {
    return nodes.reduce((acc, node) => {
        if (node && typeof node.id === 'number') {
            acc[node.id.toString()] = node;
        }
        return acc;
    }, {});
}

/**
 * @param {ZWaveNode} node
 * @param {DeviceRegistry} registry
 * @returns {ToolDeviceSummary}
 */
function buildDeviceSummary(node, registry) {
    const name = node.name || `Node ${node.id}`;
    const entry = registry[name] || registryBuilder.findDeviceByName(registry, name);

    const topics = entry && entry.topics
        ? entry.topics
        : {
            control: `zwave/${node.id}/37/0/targetValue/set`,
            state: `zwave/${node.id}/37/0/currentValue`,
        };

    return {
        name,
        nodeId: node.id,
        location: node.loc,
        available: node.available ?? false,
        ready: node.ready ?? false,
        status: node.status,
        lastActiveIso:
            typeof node.lastActive === 'number'
                ? new Date(node.lastActive).toISOString()
                : undefined,
        primaryValueSummary: extractPrimaryValue(node.values),
        topics,
    };
}

/**
 * @param {Record<string, any>} [values]
 */
function extractPrimaryValue(values) {
    if (!values) {
        return undefined;
    }

    const candidates = Object.values(values);
    if (!candidates.length) {
        return undefined;
    }

    const priority = candidates.find((value) =>
        ['currentValue', 'state', 'value'].includes(String(value.property)),
    );
    const selected = priority || candidates[0];

    const label =
        selected.label || selected.propertyName || selected.property || 'value';

    const renderedValue = selected.value !== undefined ? JSON.stringify(selected.value) : 'null';

    return `${label}: ${renderedValue}`;
}

/**
 * @param {ToolDeviceSummary[]} summaries
 * @param {number} totalNodes
 * @param {boolean} includeInactive
 * @param {string} [filterDisplay]
 */
function formatSummaries(summaries, totalNodes, includeInactive, filterDisplay) {
    const headerParts = [
        `Z-Wave JS UI reports ${totalNodes} node(s)`,
        includeInactive ? 'scope: include inactive' : 'scope: active only',
        `matched: ${summaries.length}`,
    ];

    if (filterDisplay) {
        headerParts.push(`filter: "${filterDisplay}"`);
    }

    const header = headerParts.join(' · ');

    if (!summaries.length) {
        return `${header}\nNo matching nodes found.`;
    }

    const lines = summaries.map((summary) => {
        const descriptorParts = [
            `ready: ${summary.ready ? 'yes' : 'no'}`,
            `available: ${summary.available ? 'yes' : 'no'}`,
        ];

        if (summary.status) {
            descriptorParts.push(`status: ${summary.status}`);
        }

        if (summary.lastActiveIso) {
            descriptorParts.push(`last active: ${summary.lastActiveIso}`);
        }

        if (summary.primaryValueSummary) {
            descriptorParts.push(summary.primaryValueSummary);
        }

        const descriptor = descriptorParts.join(' | ');
        const locationSuffix = summary.location ? ` · ${summary.location}` : '';

        const firstLine = `- ${summary.name} (node ${summary.nodeId}${locationSuffix}) — ${descriptor}`;
        const topicsLine = `  topics => control: ${summary.topics.control}, state: ${summary.topics.state}`;

        return `${firstLine}\n${topicsLine}`;
    });

    return [header, '', ...lines].join('\n');
}

const server = new Server(
    {
        name: 'zwave-js-ui-mcp',
        version: '1.0.0',
    },
    {
        capabilities: {
            tools: {},
        },
    },
);

// Error handler - only log actual errors
server.onerror = (error) => console.error('[server] Error:', error);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: 'list_zwave_devices',
            description:
                'List Z-Wave devices reported by Z-Wave JS UI along with their readiness and MQTT topics',
            inputSchema: {
                type: 'object',
                properties: {
                    includeInactive: {
                        type: 'boolean',
                        description: 'Include nodes that are not ready or unavailable',
                        default: false,
                    },
                    filter: {
                        type: 'string',
                        description:
                            'Optional case-insensitive substring to match against name or location',
                    },
                },
                required: [],
            },
        },
        {
            name: 'control_zwave_device',
            description:
                'Control a Z-Wave device by sending commands via MQTT. Supports turning devices on/off and dimming.',
            inputSchema: {
                type: 'object',
                properties: {
                    deviceName: {
                        type: 'string',
                        description: 'The name of the device to control (e.g. "Demo Switch" or "Living Room Light")',
                    },
                    action: {
                        type: 'string',
                        enum: ['on', 'off', 'dim'],
                        description: 'The action to perform: "on", "off", or "dim"',
                    },
                    level: {
                        type: 'number',
                        minimum: 0,
                        maximum: 100,
                        description: 'For dimming, brightness level 0-100 (optional for on/off)',
                    },
                },
                required: ['deviceName', 'action'],
            },
        },
        {
            name: 'get_device_sensor_data',
            description:
                'Get current sensor readings from a Z-Wave sensor device (temperature, humidity, light level, etc.). ' +
                'Uses MQTT cache for real-time data when available, falls back to Z-Wave JS UI API if needed.',
            inputSchema: {
                type: 'object',
                properties: {
                    deviceName: {
                        type: 'string',
                        description: 'The name of the sensor device (e.g. "Temp Sensor 1" or "Office Temperature")',
                    },
                },
                required: ['deviceName'],
            },
        },
    ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const {name, arguments: rawArgs} = request.params;

    if (name === 'list_zwave_devices') {
        const args = rawArgs || {};
        const includeInactive = Boolean(args.includeInactive);
        const filterDisplay = args.filter;
        const filter = filterDisplay ? String(filterDisplay).toLowerCase() : undefined;

        console.warn('[mcp-server] list_zwave_devices called', {
            args,
            includeInactive,
            filter,
            filterDisplay
        });

        try {
            console.warn('[mcp-server] Fetching live nodes from Z-Wave JS UI...');
            const liveNodes = await zwaveClient.getLiveNodes();
            console.warn('[mcp-server] Got live nodes', {
                totalNodes: liveNodes.length,
                nodeIds: liveNodes.map(n => n.id)
            });
            const registry = registryBuilder.build(toRegistry(liveNodes));

            console.warn('[mcp-server] Filtering nodes...', {filter, includeInactive});
            const filteredSummaries = liveNodes
                .filter((node) => {
                    const nameLower = (node.name || `Node ${node.id}`).toLowerCase();
                    const locationLower = (node.loc || '').toLowerCase();

                    const matchesFilter = filter
                        ? nameLower.includes(filter) || locationLower.includes(filter)
                        : true;

                    const isActive = (node.ready ?? false) && (node.available ?? true);

                    const passes = matchesFilter && (includeInactive || isActive);

                    // Log each node evaluation if filter is active
                    if (filter) {
                        console.warn('[mcp-server] Node filter check', {
                            nodeId: node.id,
                            name: node.name,
                            nameLower,
                            filter,
                            matchesFilter,
                            isActive,
                            passes
                        });
                    }

                    return passes;
                })
                .map((node) => {
                    // Simplified device summary for AI - only essential fields
                    const name = node.name || `Node ${node.id}`;
                    const status = (node.ready && node.available) ? 'online' : 'offline';
                    return {
                        name,
                        nodeId: node.id,
                        location: node.loc || undefined,
                        status
                    };
                })
                .sort((a, b) => a.name.localeCompare(b.name));

            console.warn('[mcp-server] Filtered to', {
                matchedCount: filteredSummaries.length,
                devices: filteredSummaries.map(d => d.name)
            });

            // Build a clear, formatted response for the AI
            let responseText;
            if (filteredSummaries.length === 0) {
                responseText = filter
                    ? `No Z-Wave devices found matching "${filterDisplay}".`
                    : 'No Z-Wave devices are currently available.';
            } else {
                const deviceList = filteredSummaries
                    .map(d => {
                        const location = d.location ? ` in ${d.location}` : '';
                        return `- "${d.name}"${location} is ${d.status}`;
                    })
                    .join('\n');

                const filterNote = filter ? ` matching "${filterDisplay}"` : '';
                responseText = `Available Z-Wave devices${filterNote} (${filteredSummaries.length} total):\n${deviceList}`;
            }

            console.warn('[mcp-server] Returning response', {
                responseLength: responseText.length,
                responsePreview: responseText.substring(0, 150)
            });

            return {
                content: [
                    {
                        type: 'text',
                        text: responseText,
                    },
                ],
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error retrieving nodes';
            return {
                content: [
                    {
                        type: 'text',
                        text: `Failed to list Z-Wave devices: ${message}`,
                    },
                ],
                isError: true,
            };
        }
    }

    if (name === 'control_zwave_device') {
        const args = rawArgs || {};
        const {deviceName, action, level} = args;

        if (!deviceName || !action) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'Error: deviceName and action are required',
                    },
                ],
                isError: true,
            };
        }

        try {
            // Get devices to find the target device
            const liveNodes = await zwaveClient.getLiveNodes();
            const registry = registryBuilder.build(toRegistry(liveNodes));

            const device = liveNodes.find(node => {
                const name = node.name || `Node ${node.id}`;
                return name.toLowerCase().includes(deviceName.toLowerCase()) ||
                    deviceName.toLowerCase().includes(name.toLowerCase());
            });

            if (!device) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error: Device "${deviceName}" not found. Use list_zwave_devices to see available devices.`,
                        },
                    ],
                    isError: true,
                };
            }

            if (!(device.ready && device.available)) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error: Device "${device.name}" is offline or not ready.`,
                        },
                    ],
                    isError: true,
                };
            }

            // Get MQTT topics for the device
            const summary = buildDeviceSummary(device, registry);
            const controlTopic = summary.topics.control;

            // Determine the value to send
            let mqttValue;
            if (action === 'on') {
                mqttValue = true;
            } else if (action === 'off') {
                mqttValue = false;
            } else if (action === 'dim') {
                if (level === undefined || level < 0 || level > 100) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: 'Error: For dimming, level must be between 0 and 100',
                            },
                        ],
                        isError: true,
                    };
                }
                mqttValue = Math.min(99, level);
            } else {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error: Invalid action "${action}". Must be "on", "off", or "dim".`,
                        },
                    ],
                    isError: true,
                };
            }

            // Publish MQTT command to control the device
            if (mqttClient && mqttClient.connected) {
                try {
                    await mqttClient.publish(controlTopic, {value: mqttValue});
                    const response = action === 'dim'
                        ? `Successfully sent command to dim ${device.name} to ${level}%`
                        : `Successfully sent command to turn ${action} ${device.name}`;

                    return {
                        content: [
                            {
                                type: 'text',
                                text: response,
                            },
                        ],
                    };
                } catch (error) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `Error sending MQTT command: ${error.message}`,
                            },
                        ],
                        isError: true,
                    };
                }
            } else {
                // MQTT not available - return informative message
                const response = action === 'dim'
                    ? `MQTT not connected. Would dim ${device.name} to ${level}% (topic: ${controlTopic}, value: ${mqttValue})`
                    : `MQTT not connected. Would turn ${action} ${device.name} (topic: ${controlTopic}, value: ${mqttValue})`;

                return {
                    content: [
                        {
                            type: 'text',
                            text: response,
                        },
                    ],
                };
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error controlling device';
            return {
                content: [
                    {
                        type: 'text',
                        text: `Failed to control device: ${message}`,
                    },
                ],
                isError: true,
            };
        }
    }

    if (name === 'get_device_sensor_data') {
        const args = rawArgs || {};
        const {deviceName} = args;

        if (!deviceName) {
            return {
                content: [
                    {
                        type: 'text',
                        text: 'Error: deviceName is required',
                    },
                ],
                isError: true,
            };
        }

        try {
            let sensorData = null;
            let source = 'unknown';

            // Strategy: Try MQTT cache first if PREFER_MQTT is enabled, then fall back to API
            if (mqttClient && mqttConfig.preferMqtt) {
                console.warn(`[MCP Server] Checking MQTT cache for sensor: ${deviceName}`);
                const cachedValue = mqttClient.getCachedSensorValue(deviceName);

                if (cachedValue) {
                    sensorData = {
                        value: cachedValue.value,
                        unit: cachedValue.unit,
                        timestamp: new Date(cachedValue.timestamp).toISOString(),
                        age: Math.round((Date.now() - cachedValue.timestamp) / 1000),
                        commandClass: cachedValue.commandClass,
                    };
                    source = 'MQTT';
                    console.warn(`[MCP Server] Found sensor data in MQTT cache (${sensorData.age}s old)`);
                }
            }

            // Fall back to ZWave JS UI API if MQTT cache miss or MQTT disabled
            if (!sensorData) {
                console.warn(`[MCP Server] Querying Z-Wave JS UI API for sensor: ${deviceName}`);
                const liveNodes = await zwaveClient.getLiveNodes();

                // Find device by name (case-insensitive partial match)
                const device = liveNodes.find(node => {
                    const name = node.name || `Node ${node.id}`;
                    return name.toLowerCase().includes(deviceName.toLowerCase()) ||
                        deviceName.toLowerCase().includes(name.toLowerCase());
                });

                if (!device) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `Error: Sensor device "${deviceName}" not found. Use list_zwave_devices to see available devices.`,
                            },
                        ],
                        isError: true,
                    };
                }

                if (!(device.ready && device.available)) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `Error: Sensor device "${device.name}" is offline or not ready.`,
                            },
                        ],
                        isError: true,
                    };
                }

                // Extract sensor value from device values
                // Look for sensor_multilevel command class (49)
                if (device.values) {
                    const sensorValues = Object.values(device.values).filter(v =>
                        v.commandClass === 49 || // sensor_multilevel
                        v.commandClassName === 'Multilevel Sensor' ||
                        String(v.property).toLowerCase().includes('temperature') ||
                        String(v.property).toLowerCase().includes('humidity') ||
                        String(v.property).toLowerCase().includes('luminance')
                    );

                    if (sensorValues.length > 0) {
                        // Use the first sensor value found (or prioritize currentValue)
                        const primarySensor = sensorValues.find(v => v.property === 'currentValue') || sensorValues[0];

                        sensorData = {
                            value: primarySensor.value,
                            unit: primarySensor.unit || 'unknown',
                            timestamp: new Date().toISOString(),
                            age: 0,
                            commandClass: primarySensor.commandClassName || 'sensor_multilevel',
                        };
                        source = 'API';
                        console.warn(`[MCP Server] Found sensor data from API:`, sensorData);
                    }
                }

                if (!sensorData) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: `Error: Device "${device.name}" does not have any sensor data available. It may not be a sensor device.`,
                            },
                        ],
                        isError: true,
                    };
                }
            }

            // Format response for AI
            const responseText = `Sensor: "${deviceName}"\nValue: ${sensorData.value}${sensorData.unit ? ' ' + sensorData.unit : ''}\nSource: ${source}\nAge: ${sensorData.age} seconds\nTimestamp: ${sensorData.timestamp}`;

            return {
                content: [
                    {
                        type: 'text',
                        text: responseText,
                    },
                ],
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error getting sensor data';
            console.error('[MCP Server] Error getting sensor data:', error);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Failed to get sensor data: ${message}`,
                    },
                ],
                isError: true,
            };
        }
    }

    return {
        content: [
            {
                type: 'text',
                text: `Unknown tool: ${name}`,
            },
        ],
        isError: true,
    };
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch((error) => {
    console.error('Fatal error starting MCP server:', error);
    process.exit(1);
});
