#!/usr/bin/env node
import 'dotenv/config';
import { ZWaveUIClient } from './src/zwave-client.js';

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

async function main() {
  const config = getConfig();
  console.log('Connecting to ZWave-JS-UI at:', config.url);

  const client = new ZWaveUIClient(config);

  try {
    const nodes = await client.getLiveNodes();
    console.log('\n=== All Nodes ===');
    console.log(JSON.stringify(nodes, null, 2));

    console.log('\n=== Node Summary ===');
    nodes.forEach(node => {
      const name = node.name || `Node ${node.id}`;
      console.log(`\n${name} (Node ${node.id}):`);
      console.log(`  ready: ${node.ready}`);
      console.log(`  available: ${node.available}`);
      console.log(`  failed: ${node.failed}`);
      console.log(`  status: ${node.status}`);
      console.log(`  lastActive: ${node.lastActive ? new Date(node.lastActive).toISOString() : 'N/A'}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
