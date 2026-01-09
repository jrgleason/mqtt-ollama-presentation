/**
 * Simple test script to verify MQTT sensor data caching
 *
 * Usage:
 * 1. Start MQTT broker: mosquitto -v
 * 2. In another terminal, run: node test-mqtt-sensor.js
 * 3. In a third terminal, publish test data:
 *    mosquitto_pub -h localhost -t "zwave/Office/Temp_Sensor_1/sensor_multilevel/endpoint_0/currentValue" \
 *      -m '{"value": 72.5, "unit": "F"}'
 */

import 'dotenv/config';
import { MQTTClientWrapper } from './src/mqtt-client.js';

console.log('=== MQTT Sensor Data Cache Test ===\n');

// Create MQTT client
const mqttClient = new MQTTClientWrapper({
    brokerUrl: process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883',
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
});

console.log('Connecting to MQTT broker...');
console.log('Broker URL:', process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883');

// Wait for connection
setTimeout(() => {
    console.log('\nConnection status:', mqttClient.isConnected() ? 'CONNECTED' : 'DISCONNECTED');

    if (!mqttClient.isConnected()) {
        console.error('\nERROR: Failed to connect to MQTT broker');
        console.error('Make sure mosquitto is running: mosquitto -v');
        process.exit(1);
    }

    console.log('\nNow publish a test message from another terminal:');
    console.log('mosquitto_pub -h localhost -t "zwave/Office/Temp_Sensor_1/sensor_multilevel/endpoint_0/currentValue" \\');
    console.log('  -m \'{"value": 72.5, "unit": "F"}\'');
    console.log('\nWaiting for sensor data...\n');

    // Check cache every 2 seconds
    const intervalId = setInterval(() => {
        const cached = mqttClient.getCachedSensorValue('Temp_Sensor_1');

        if (cached) {
            console.log('\n=== CACHED SENSOR DATA ===');
            console.log('Device:', 'Temp_Sensor_1');
            console.log('Value:', cached.value, cached.unit || '');
            console.log('Age:', Math.round((Date.now() - cached.timestamp) / 1000), 'seconds');
            console.log('Timestamp:', new Date(cached.timestamp).toISOString());
            console.log('Topic:', cached.topic);
            console.log('\nTest PASSED! ✓');

            // Show all cached sensors
            const allSensors = mqttClient.getAllCachedSensors();
            console.log('\nAll cached sensors:', Array.from(allSensors.keys()));

            clearInterval(intervalId);
            mqttClient.close();
            process.exit(0);
        } else {
            console.log('Waiting for sensor data... (publish test message)');
        }
    }, 2000);

    // Timeout after 30 seconds
    setTimeout(() => {
        console.error('\nTIMEOUT: No sensor data received after 30 seconds');
        console.error('Did you publish the test message?');
        clearInterval(intervalId);
        mqttClient.close();
        process.exit(1);
    }, 30000);

}, 2000); // Wait 2 seconds for initial connection
