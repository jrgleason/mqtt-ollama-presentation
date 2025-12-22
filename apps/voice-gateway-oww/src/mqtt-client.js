/**
 * MQTT Client for Voice Gateway
 *
 * Publishes transcriptions and AI responses to MQTT broker.
 */

import crypto from 'crypto';
import mqtt from 'mqtt';
import {logger} from './logger.js';
import {config} from './config.js';

let client = null;
let isConnected = false;

/**
 * Connect to MQTT broker
 *
 * @returns {Promise<mqtt.MqttClient>} Connected MQTT client
 */
async function connectMQTT() {
    if (client && isConnected) {
        return client;
    }

    // Append random suffix to client ID to allow multiple instances
    const uniqueSuffix = crypto.randomBytes(4).toString('hex');
    const uniqueClientId = `${config.mqtt.clientId}-${uniqueSuffix}`;

    const options = {
        clientId: uniqueClientId,
    };

    if (config.mqtt.username) {
        options.username = config.mqtt.username;
        options.password = config.mqtt.password;
    }

    return new Promise((resolve, reject) => {
        client = mqtt.connect(config.mqtt.brokerUrl, options);

        client.on('connect', () => {
            isConnected = true;
            logger.debug('✅ Connected to MQTT broker', {
                broker: config.mqtt.brokerUrl,
                clientId: uniqueClientId,
            });
            resolve(client);
        });

        client.on('error', (error) => {
            logger.error('❌ MQTT connection error', {error: error.message});
            reject(error);
        });

        client.on('close', () => {
            isConnected = false;
            logger.debug('⚠️ MQTT connection closed');
        });

        client.on('reconnect', () => {
            logger.debug('🔄 Reconnecting to MQTT broker...');
        });
    });
}

/**
 * Publish transcription to MQTT
 *
 * @param {string} text - Transcribed text
 * @param {Object} metadata - Additional metadata (timestamp, duration, etc.)
 */
async function publishTranscription(text, metadata = {}) {
    try {
        const mqttClient = await connectMQTT();

        const payload = {
            text,
            timestamp: new Date().toISOString(),
            source: 'voice-gateway-oww',
            ...metadata,
        };

        const topic = 'voice/transcription';

        mqttClient.publish(topic, JSON.stringify(payload), {qos: 1}, (err) => {
            if (err) {
                logger.error('❌ Failed to publish transcription', {error: err.message, topic});
            } else {
                logger.debug('📤 Published transcription', {topic, text: text.substring(0, 50)});
            }
        });
    } catch (error) {
        logger.error('❌ MQTT publish error', {error: error.message});
    }
}

/**
 * Publish AI response to MQTT
 *
 * @param {string} question - Original user question
 * @param {string} answer - AI response
 * @param {Object} metadata - Additional metadata (model, duration, etc.)
 */
async function publishAIResponse(question, answer, metadata = {}) {
    try {
        const mqttClient = await connectMQTT();

        const payload = {
            question,
            answer,
            timestamp: new Date().toISOString(),
            source: 'voice-gateway-oww',
            ...metadata,
        };

        const topic = 'voice/ai-response';

        mqttClient.publish(topic, JSON.stringify(payload), {qos: 1}, (err) => {
            if (err) {
                logger.error('❌ Failed to publish AI response', {error: err.message, topic});
            } else {
                logger.debug('📤 Published AI response', {
                    topic,
                    question: question.substring(0, 30),
                    answer: answer.substring(0, 50),
                });
            }
        });
    } catch (error) {
        logger.error('❌ MQTT publish error', {error: error.message});
    }
}

/**
 * Disconnect from MQTT broker
 */
async function disconnectMQTT() {
    if (client) {
        return new Promise((resolve) => {
            client.end(false, () => {
                isConnected = false;
                logger.debug('👋 Disconnected from MQTT broker');
                resolve();
            });
        });
    }
}

export {connectMQTT, publishTranscription, publishAIResponse, disconnectMQTT};
