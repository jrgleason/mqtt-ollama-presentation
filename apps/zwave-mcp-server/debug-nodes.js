#!/usr/bin/env node
import 'dotenv/config';
import {ZWaveUIClient} from './src/zwave-client.js';
import {getConfig} from './src/config.js';

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
