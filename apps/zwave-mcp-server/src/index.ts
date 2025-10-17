import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { DeviceRegistryBuilder } from './device-registry.js';
import { ZWaveUIClient } from './zwave-client.js';
import {
  DeviceRegistry,
  ToolDeviceSummary,
  ZWaveConfig,
  ZWaveNode,
  ZWaveUIConfig,
} from './types.js';

function getConfig(): ZWaveUIConfig {
  const url = process.env.ZWAVE_UI_URL;

  if (!url) {
    throw new Error('ZWAVE_UI_URL environment variable is required');
  }

  const authEnabled = process.env.ZWAVE_UI_AUTH_ENABLED === 'true';
  const username = process.env.ZWAVE_UI_USERNAME;
  const password = process.env.ZWAVE_UI_PASSWORD;

  if (authEnabled && (!username || !password)) {
    throw new Error(
      'ZWAVE_UI_AUTH_ENABLED is true but username/password are missing',
    );
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

function toRegistry(nodes: ZWaveNode[]): ZWaveConfig {
  return nodes.reduce<ZWaveConfig>((acc, node) => {
    if (node && typeof node.id === 'number') {
      acc[node.id.toString()] = node;
    }
    return acc;
  }, {});
}

function buildDeviceSummary(
  node: ZWaveNode,
  registry: DeviceRegistry,
): ToolDeviceSummary {
  const name = node.name || `Node ${node.id}`;
  const entry =
    registry[name] || registryBuilder.findDeviceByName(registry, name);

  const topics = entry?.topics ?? {
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

function extractPrimaryValue(
  values?: Record<string, any>,
): string | undefined {
  if (!values) {
    return undefined;
  }

  const candidates = Object.values(values) as Array<Record<string, any>>;
  if (!candidates.length) {
    return undefined;
  }

  const priority = candidates.find((value) =>
    ['currentValue', 'state', 'value'].includes(String(value.property)),
  );
  const selected = priority ?? candidates[0];

  const label =
    selected.label || selected.propertyName || selected.property || 'value';

  const renderedValue =
    selected.value !== undefined ? JSON.stringify(selected.value) : 'null';

  return `${label}: ${renderedValue}`;
}

function formatSummaries(
  summaries: ToolDeviceSummary[],
  totalNodes: number,
  includeInactive: boolean,
  filterDisplay?: string,
): string {
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

    const locationSuffix = summary.location
      ? ` · ${summary.location}`
      : '';

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
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: rawArgs } = request.params;

  if (name !== 'list_zwave_devices') {
    return {
      content: [
        {
          type: 'text',
          text: `Unknown tool: ${name}`,
        },
      ],
      isError: true,
    };
  }

  const args = (rawArgs ?? {}) as {
    includeInactive?: boolean;
    filter?: string;
  };

  const includeInactive = Boolean(args.includeInactive);
  const filterDisplay = args.filter;
  const filter = filterDisplay ? filterDisplay.toLowerCase() : undefined;

  try {
    const liveNodes = await zwaveClient.getLiveNodes();
    const registry = registryBuilder.build(toRegistry(liveNodes));

    const filteredSummaries = liveNodes
      .filter((node) => {
        const name = (node.name || `Node ${node.id}`).toLowerCase();
        const location = (node.loc || '').toLowerCase();

        const matchesFilter = filter
          ? name.includes(filter) || location.includes(filter)
          : true;

        const isActive = (node.ready ?? false) && (node.available ?? true);

        return matchesFilter && (includeInactive || isActive);
      })
      .map((node) => buildDeviceSummary(node, registry))
      .sort((a, b) => a.name.localeCompare(b.name));

    const responseText = formatSummaries(
      filteredSummaries,
      liveNodes.length,
      includeInactive,
      filterDisplay,
    );

    return {
      content: [
        {
          type: 'text',
          text: responseText,
        },
      ],
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error retrieving nodes';
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
