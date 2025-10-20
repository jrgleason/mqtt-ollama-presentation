#!/usr/bin/env node
/**
 * MQTT MCP Server for Claude Code
 * Uses @emqx-ai/mcp-mqtt-sdk for TypeScript MCP integration
 */

import {McpMqttServer} from '@emqx-ai/mcp-mqtt-sdk';
import {z} from 'zod';

// MQTT broker configuration
const MQTT_CONFIG = {
    host: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
    username: process.env.MQTT_USERNAME || 'admin',
    password: process.env.MQTT_PASSWORD || 'hivemq',
};

console.error('MQTT Configuration:');
console.error(`  Host: ${MQTT_CONFIG.host}`);
console.error(`  Username: ${MQTT_CONFIG.username}`);
console.error(`  Password: ${MQTT_CONFIG.password.substring(0, 3)}***`);

// Create MCP server (try without credentials first - HiveMQ may allow anonymous)
const serverConfig = {
    host: MQTT_CONFIG.host,
    // Temporarily commenting out credentials to test anonymous access
    // username: MQTT_CONFIG.username,
    // password: MQTT_CONFIG.password,

    // Server identification
    serverId: 'claude-mqtt-server',
    serverName: 'claude/device-control',

    // Server metadata
    name: 'Claude MQTT Server',
    version: '1.0.0',
    description: 'MQTT device control for Claude Code via MCP',
};

console.error('Attempting anonymous connection (no credentials)...');
const server = new McpMqttServer(serverConfig);

// Add publish tool
const publishSchema = z.object({
    topic: z.string().describe('MQTT topic to publish to'),
    message: z.string().describe('Message payload (string or JSON)'),
    qos: z.number().min(0).max(2).default(1).describe('Quality of Service (0, 1, or 2)'),
    retain: z.boolean().default(false).describe('Retain message on broker'),
});

server.tool(
    'publish_message',
    'Publish a message to an MQTT topic',
    publishSchema,
    async (params) => {
        try {
            const client = server.getMqttClient();
            await new Promise((resolve, reject) => {
                client.publish(
                    params.topic,
                    params.message,
                    {qos: params.qos, retain: params.retain},
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });

            return {
                content: [{
                    type: 'text',
                    text: `Published to topic "${params.topic}": ${params.message}`,
                }],
            };
        } catch (error) {
            return {
                content: [{
                    type: 'text',
                    text: `Error publishing to topic "${params.topic}": ${error.message}`,
                }],
                isError: true,
            };
        }
    }
);

// Add subscribe tool
const subscribeSchema = z.object({
    topic: z.string().describe('MQTT topic pattern (supports + and # wildcards)'),
    qos: z.number().min(0).max(2).default(1).describe('Quality of Service (0, 1, or 2)'),
});

server.tool(
    'subscribe_topic',
    'Subscribe to an MQTT topic pattern',
    subscribeSchema,
    async (params) => {
        try {
            const client = server.getMqttClient();
            await new Promise((resolve, reject) => {
                client.subscribe(params.topic, {qos: params.qos}, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });

            return {
                content: [{
                    type: 'text',
                    text: `Subscribed to topic pattern: ${params.topic}`,
                }],
            };
        } catch (error) {
            return {
                content: [{
                    type: 'text',
                    text: `Error subscribing to topic "${params.topic}": ${error.message}`,
                }],
                isError: true,
            };
        }
    }
);

// Start server
console.error('Starting MQTT MCP Server...');
console.error(`Connecting to ${MQTT_CONFIG.host}`);

server.start().then(() => {
    console.error('MQTT MCP Server started successfully');
}).catch((error) => {
    console.error('Failed to start MQTT MCP Server:', error);
    process.exit(1);
});
