import {ZWaveUIClient} from './src/zwave-client.js';
import {DeviceRegistryBuilder} from './src/device-registry.js';

const client = new ZWaveUIClient({url: 'http://localhost:8091', authEnabled: false});
const builder = new DeviceRegistryBuilder();

console.log('🔍 Fetching devices from ZWave-JS-UI (live)...\n');

const nodes = await client.getLiveNodes();
const registry = builder.build(nodes.reduce((acc, node) => {
    if (node && typeof node.id === 'number') {
        acc[node.id.toString()] = node;
    }
    return acc;
}, {}));

console.log('📋 Discovered devices:\n');
for (const [name, device] of Object.entries(registry)) {
    console.log(`Device: ${name}`);
    console.log(`  Node ID: ${device.nodeId}`);
    console.log(`  Location: ${device.location || '(none)'}`);
    console.log(`  Type: ${device.type}`);
    console.log(`  Control topic: ${device.topics.control}`);
    console.log(`  State topic: ${device.topics.state}`);
    console.log('');
}

console.log('✅ All devices discovered dynamically - no hardcoded values!');
console.log('💡 Add a new device in ZWave-JS-UI and run this again to see it appear automatically.');
