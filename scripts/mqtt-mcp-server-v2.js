#!/usr/bin/env node
/**
 * MQTT MCP Server for Claude Code
 * Custom MCP server using @modelcontextprotocol/sdk + mqtt.js
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import mqtt from 'mqtt';

// MQTT broker configuration
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://10.0.0.58:31883';

console.error('Starting MQTT MCP Server...');
console.error(`MQTT Broker: ${MQTT_BROKER_URL}`);

// Create MQTT client
const mqttClient = mqtt.connect(MQTT_BROKER_URL, {
  connectTimeout: 5000,
});

let isConnected = false;

mqttClient.on('connect', () => {
  console.error('✅ Connected to MQTT broker');
  isConnected = true;
});

mqttClient.on('error', (error) => {
  console.error('❌ MQTT connection error:', error.message);
});

mqttClient.on('close', () => {
  console.error('MQTT connection closed');
  isConnected = false;
});

// Create MCP server
const server = new Server(
  {
    name: 'mqtt-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'publish_message',
        description: 'Publish a message to an MQTT topic',
        inputSchema: {
          type: 'object',
          properties: {
            topic: {
              type: 'string',
              description: 'MQTT topic to publish to',
            },
            message: {
              type: 'string',
              description: 'Message payload',
            },
            qos: {
              type: 'number',
              description: 'Quality of Service (0, 1, or 2)',
              enum: [0, 1, 2],
              default: 1,
            },
            retain: {
              type: 'boolean',
              description: 'Retain message on broker',
              default: false,
            },
          },
          required: ['topic', 'message'],
        },
      },
      {
        name: 'subscribe_topic',
        description: 'Subscribe to an MQTT topic pattern',
        inputSchema: {
          type: 'object',
          properties: {
            topic: {
              type: 'string',
              description: 'MQTT topic pattern (supports + and # wildcards)',
            },
            qos: {
              type: 'number',
              description: 'Quality of Service (0, 1, or 2)',
              enum: [0, 1, 2],
              default: 1,
            },
          },
          required: ['topic'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (!isConnected) {
    return {
      content: [
        {
          type: 'text',
          text: 'Error: Not connected to MQTT broker',
        },
      ],
      isError: true,
    };
  }

  const { name, arguments: args } = request.params;

  if (name === 'publish_message') {
    try {
      await new Promise((resolve, reject) => {
        mqttClient.publish(
          args.topic,
          args.message,
          { qos: args.qos || 1, retain: args.retain || false },
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      return {
        content: [
          {
            type: 'text',
            text: `Published to topic "${args.topic}": ${args.message}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error publishing to topic "${args.topic}": ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  if (name === 'subscribe_topic') {
    try {
      await new Promise((resolve, reject) => {
        mqttClient.subscribe(args.topic, { qos: args.qos || 1 }, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      return {
        content: [
          {
            type: 'text',
            text: `Subscribed to topic pattern: ${args.topic}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error subscribing to topic "${args.topic}": ${error.message}`,
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

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
