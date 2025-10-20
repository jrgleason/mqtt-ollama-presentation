import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { DeviceRegistryBuilder } from './device-registry.js';
import { ZWaveUIClient } from './zwave-client.js';

/** @typedef {import('./types.js').ZWaveNode} ZWaveNode */
/** @typedef {import('./types.js').ZWaveConfig} ZWaveConfig */
/** @typedef {import('./types.js').DeviceRegistry} DeviceRegistry */
/** @typedef {import('./types.js').ToolDeviceSummary} ToolDeviceSummary */

function getConfig() {
  const url = process.env.ZWAVE_UI_URL;

  if (!url) {
    throw new Error('ZWAVE_UI_URL environment variable is required');
  }

  const authEnabled = process.env.ZWAVE_UI_AUTH_ENABLED === 'true';
  const username = process.env.ZWAVE_UI_USERNAME;
  const password = process.env.ZWAVE_UI_PASSWORD;

  if (authEnabled && (!username || !password)) {
    throw new Error('ZWAVE_UI_AUTH_ENABLED is true but username/password are missing');
  }

  const socketTimeoutMs = process.env.ZWAVE_UI_SOCKET_TIMEOUT_MS
    ? Number(process.env.ZWAVE_UI_SOCKET_TIMEOUT_MS)
    : undefined;

  return {
    url,
    username,
    password,
    authEnabled,
    socketTimeoutMs,
  };
}

const zwaveConfig = getConfig();
const zwaveClient = new ZWaveUIClient(zwaveConfig);
const registryBuilder = new DeviceRegistryBuilder();

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
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: rawArgs } = request.params;

  if (name === 'list_zwave_devices') {
    const args = rawArgs || {};
    const includeInactive = Boolean(args.includeInactive);
    const filterDisplay = args.filter;
    const filter = filterDisplay ? String(filterDisplay).toLowerCase() : undefined;

    try {
      const liveNodes = await zwaveClient.getLiveNodes();
      console.error('[MCP DEBUG] Raw nodes from ZWave-JS-UI:', JSON.stringify(liveNodes.slice(0, 2), null, 2));
      const registry = registryBuilder.build(toRegistry(liveNodes));

      const filteredSummaries = liveNodes
        .filter((node) => {
          const nameLower = (node.name || `Node ${node.id}`).toLowerCase();
          const locationLower = (node.loc || '').toLowerCase();

          const matchesFilter = filter
            ? nameLower.includes(filter) || locationLower.includes(filter)
            : true;

          const isActive = (node.ready ?? false) && (node.available ?? true);

          return matchesFilter && (includeInactive || isActive);
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

      // Return JSON for programmatic use
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(filteredSummaries),
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
    const { deviceName, action, level } = args;

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

      // TODO: Send MQTT command - requires MQTT client initialization
      // For now, return success message with the topic/value that would be sent
      const response = action === 'dim'
        ? `Dry-run: Would dim ${device.name} to ${level}% (would publish ${JSON.stringify({value: mqttValue})} to ${controlTopic}). Device control is not yet implemented.`
        : `Dry-run: Would turn ${action} ${device.name} (would publish ${JSON.stringify({value: mqttValue})} to ${controlTopic}). Device control is not yet implemented.`;

      return {
        content: [
          {
            type: 'text',
            text: response,
          },
        ],
      };
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
  console.error('Z-Wave MCP server ready on stdio');
}

main().catch((error) => {
  console.error('Fatal error starting MCP server:', error);
  process.exit(1);
});
