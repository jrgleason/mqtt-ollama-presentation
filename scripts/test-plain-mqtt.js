#!/usr/bin/env node
import mqtt from 'mqtt';

console.log('Testing plain MQTT.js connection (anonymous)...');

const client = mqtt.connect('mqtt://localhost:1883', {
    connectTimeout: 5000,
});

client.on('connect', () => {
    console.log('✅ Connected successfully!');

    // Try to publish a test message
    client.publish('test/hello', 'Hello from anonymous MQTT!', (err) => {
        if (err) {
            console.log('❌ Publish failed:', err.message);
        } else {
            console.log('✅ Published test message');
        }
        client.end();
        process.exit(0);
    });
});

client.on('error', (error) => {
    console.log('❌ Connection failed:', error.message);
    console.log('Error code:', error.code);
    client.end();
    process.exit(1);
});

setTimeout(() => {
    console.log('⏱️  Timeout');
    client.end();
    process.exit(1);
}, 5000);
