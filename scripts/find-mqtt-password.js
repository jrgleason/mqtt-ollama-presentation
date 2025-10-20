#!/usr/bin/env node
/**
 * Try to find working MQTT password
 */

import mqtt from 'mqtt';

const passwords = [
    'hivemq',
    'adminpw',
    'admin',
    'password',
    'HiveMQ',
    'Hivemq',
    '',  // empty password
];

console.log('Testing MQTT passwords for username: admin\n');

async function testPassword(password) {
    return new Promise((resolve) => {
        const label = password || '(empty)';
        console.log(`Testing: ${label}...`);

        const client = mqtt.connect('mqtt://localhost:1883', {
            username: 'admin',
            password: password,
            connectTimeout: 3000,
        });

        client.on('connect', () => {
            console.log(`✅ SUCCESS: admin/${label}\n`);
            client.end();
            resolve(password);
        });

        client.on('error', (error) => {
            console.log(`❌ FAILED: ${error.message}`);
            client.end();
            resolve(null);
        });

        setTimeout(() => {
            client.end();
            resolve(null);
        }, 3000);
    });
}

(async () => {
    for (const password of passwords) {
        const result = await testPassword(password);
        if (result !== null) {
            console.log(`\n🎉 Found working password: "${result}"`);
            process.exit(0);
        }
    }
    console.log('\n❌ No working password found');
    process.exit(1);
})();
