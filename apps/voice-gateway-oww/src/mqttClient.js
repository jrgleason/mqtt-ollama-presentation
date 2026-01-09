/**
 * MQTT Client for Voice Gateway
 *
 * Publishes transcriptions and AI responses to MQTT broker.
 */

import mqtt from 'mqtt';
import {logger} from './util/Logger.js';
import {config} from './config.js';
import { MQTT_CONNECTION_TIMEOUT_MS, MQTT_RECONNECT_INTERVAL_MS } from './constants/timing.js';

let client = null;
let isConnected = false;
let connectionFailed = false;
let lastConnectionAttempt = 0;

/**
 * Connect to MQTT broker
 *
 * @returns {Promise<mqtt.MqttClient|null>} Connected MQTT client or null if connection failed
 */
async function connectMQTT() {
    if (client && isConnected) {
        return client;
    }

    // Don't spam connection attempts if we know it's failing
    if (connectionFailed) {
        const now = Date.now();
        if (now - lastConnectionAttempt < MQTT_RECONNECT_INTERVAL_MS) {
            return null;
        }
        lastConnectionAttempt = now;
    }

    const options = {
        clientId: config.mqtt.clientId,
        reconnectPeriod: 0, // Disable automatic reconnection to prevent spam
    };

    if (config.mqtt.username) {
        options.username = config.mqtt.username;
        options.password = config.mqtt.password;
    }

    return new Promise((resolve) => {
        client = mqtt.connect(config.mqtt.brokerUrl, options);

        const timeout = setTimeout(() => {
            connectionFailed = true;
            if (!isConnected) {
                logger.warn('⚠️ MQTT broker not available - continuing without MQTT support');
                client?.end(true);
                resolve(null);
            }
        }, MQTT_CONNECTION_TIMEOUT_MS);

        client.on('connect', () => {
            clearTimeout(timeout);
            isConnected = true;
            connectionFailed = false;
            logger.info('✅ Connected to MQTT broker', {
                broker: config.mqtt.brokerUrl,
                clientId: config.mqtt.clientId,
            });
            resolve(client);
        });

        client.on('error', (error) => {
            // Only log first error, then be silent
            if (!connectionFailed) {
                logger.warn('⚠️ MQTT connection failed - continuing without MQTT support', {
                    error: error.message
                });
                connectionFailed = true;
            }
        });

        client.on('close', () => {
            isConnected = false;
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

        if (!mqttClient) {
            // MQTT not available, skip silently
            return;
        }

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

        if (!mqttClient) {
            // MQTT not available, skip silently
            return;
        }

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
