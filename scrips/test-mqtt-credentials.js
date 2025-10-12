#!/usr/bin/env node
/**
 * Test MQTT broker credentials
 */

import mqtt from 'mqtt';

const configs = [
  { username: 'admin', password: 'adminpw', label: 'admin/adminpw (from K8s)' },
];

console.log('Testing MQTT credentials at mqtt://10.0.0.58:31883\n');

async function testCredentials(config) {
  return new Promise((resolve) => {
    console.log(`Testing ${config.label}...`);

    const client = mqtt.connect('mqtt://10.0.0.58:31883', {
      username: config.username,
      password: config.password,
      connectTimeout: 5000,
    });

    client.on('connect', () => {
      console.log(`✅ SUCCESS: ${config.label} works!\n`);
      client.end();
      resolve(true);
    });

    client.on('error', (error) => {
      console.log(`❌ FAILED: ${config.label} - ${error.message}\n`);
      client.end();
      resolve(false);
    });

    setTimeout(() => {
      console.log(`⏱️  TIMEOUT: ${config.label}\n`);
      client.end();
      resolve(false);
    }, 5000);
  });
}

(async () => {
  for (const config of configs) {
    await testCredentials(config);
  }
  process.exit(0);
})();
