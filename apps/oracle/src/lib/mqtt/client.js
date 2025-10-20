import mqtt from 'mqtt';

const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const MQTT_USERNAME = process.env.MQTT_USERNAME || '';
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || '';
const DEBUG = process.env.LOG_LEVEL === 'debug' || process.env.NODE_ENV === 'development';

class MQTTClientSingleton {
    constructor() {
        this.client = null;
        this.connecting = false;
        this.subscribers = new Map();
    }

    static getInstance() {
        if (!MQTTClientSingleton.instance) {
            MQTTClientSingleton.instance = new MQTTClientSingleton();
        }
        return MQTTClientSingleton.instance;
    }

    async connect() {
        if (this.client && this.client.connected) {
            return this.client;
        }

        if (this.connecting) {
            return new Promise((resolve, reject) => {
                const checkInterval = setInterval(() => {
                    if (this.client && this.client.connected) {
                        clearInterval(checkInterval);
                        resolve(this.client);
                    } else if (!this.connecting) {
                        clearInterval(checkInterval);
                        reject(new Error('Connection failed'));
                    }
                }, 100);
            });
        }

        this.connecting = true;

        const options = {
            clientId: `oracle-${Math.random().toString(16).slice(2, 10)}`,
            clean: true,
            reconnectPeriod: 5000,
            connectTimeout: 30000,
        };

        if (MQTT_USERNAME) {
            options.username = MQTT_USERNAME;
            options.password = MQTT_PASSWORD;
        }

        return new Promise((resolve, reject) => {
            this.client = mqtt.connect(MQTT_BROKER_URL, options);

            this.client.on('connect', () => {
                if (DEBUG) console.log('[MQTT] Connected to broker:', MQTT_BROKER_URL);
                this.connecting = false;
                resolve(this.client);
            });

            this.client.on('error', (error) => {
                console.error('[MQTT] Connection error:', error);
                this.connecting = false;
                reject(error);
            });

            this.client.on('message', (topic, message) => {
                const topicSubscribers = this.subscribers.get(topic);
                if (topicSubscribers) {
                    topicSubscribers.forEach((callback) => callback(topic, message));
                }

                const wildcardSubscribers = this.subscribers.get('#');
                if (wildcardSubscribers) {
                    wildcardSubscribers.forEach((callback) => callback(topic, message));
                }
            });

            this.client.on('reconnect', () => {
                if (DEBUG) console.log('[MQTT] Reconnecting...');
            });

            this.client.on('close', () => {
                if (DEBUG) console.log('[MQTT] Connection closed');
            });
        });
    }

    async publish(topic, message, options = {}) {
        if (DEBUG) {
            console.log('[MQTT] publish() called', {
                topic,
                message,
                connected: this.client?.connected,
                clientExists: !!this.client
            });
        }

        if (!this.client || !this.client.connected) {
            if (DEBUG) console.log('[MQTT] Not connected, attempting to connect...');
            await this.connect();
            if (DEBUG) console.log('[MQTT] Connected successfully, broker:', MQTT_BROKER_URL);
        }

        const payload = typeof message === 'string' ? message : JSON.stringify(message);

        if (DEBUG) {
            console.log('[MQTT] About to publish:', {
                topic,
                payload,
                qos: options.qos || 0,
                brokerUrl: MQTT_BROKER_URL
            });
        }

        return new Promise((resolve, reject) => {
            // Preserve all caller-provided options (retain, dup, properties, etc.)
            // with qos:0 as default
            this.client.publish(topic, payload, { qos: 0, ...options }, (error) => {
                if (error) {
                    console.error('[MQTT] Publish error:', error);
                    reject(error);
                } else {
                    if (DEBUG) console.log('[MQTT] ✅ Publish SUCCESS to', topic, ':', payload);
                    resolve();
                }
            });
        });
    }

    async subscribe(topic, callback) {
        if (!this.client || !this.client.connected) {
            await this.connect();
        }

        return new Promise((resolve, reject) => {
            this.client.subscribe(topic, {qos: 0}, (error) => {
                if (error) {
                    console.error('[MQTT] Subscribe error:', error);
                    reject(error);
                } else {
                    if (DEBUG) console.log('[MQTT] Subscribed to:', topic);

                    if (!this.subscribers.has(topic)) {
                        this.subscribers.set(topic, new Set());
                    }
                    this.subscribers.get(topic).add(callback);

                    resolve();
                }
            });
        });
    }

    async unsubscribe(topic, callback) {
        if (!this.client || !this.client.connected) {
            return;
        }

        return new Promise((resolve, reject) => {
            this.client.unsubscribe(topic, (error) => {
                if (error) {
                    console.error('[MQTT] Unsubscribe error:', error);
                    reject(error);
                } else {
                    if (DEBUG) console.log('[MQTT] Unsubscribed from:', topic);

                    if (callback && this.subscribers.has(topic)) {
                        this.subscribers.get(topic).delete(callback);
                    } else {
                        this.subscribers.delete(topic);
                    }

                    resolve();
                }
            });
        });
    }

    async disconnect() {
        if (!this.client) {
            return;
        }

        return new Promise((resolve) => {
            this.client.end(false, {}, () => {
                if (DEBUG) console.log('[MQTT] Disconnected');
                this.client = null;
                resolve();
            });
        });
    }

    isConnected() {
        return this.client !== null && this.client.connected;
    }
}

export const mqttClient = MQTTClientSingleton.getInstance();

export async function publishDeviceCommand(deviceName, commandClass, endpoint, property, value) {
    const topic = `zwave/${deviceName}/${commandClass}/${endpoint}/${property}/set`;
    await mqttClient.publish(topic, JSON.stringify({value}));
}

export async function controlBinarySwitch(deviceName, state) {
    await publishDeviceCommand(deviceName, 37, 0, 'targetValue', state);
}

export async function controlMultilevelSwitch(deviceName, level) {
    const clampedLevel = Math.max(0, Math.min(99, level));
    await publishDeviceCommand(deviceName, 38, 0, 'targetValue', clampedLevel);
}

export async function subscribeToDeviceState(deviceName, callback) {
    const topic = `zwave/${deviceName}/+/+/+`;
    await mqttClient.subscribe(topic, (receivedTopic, message) => {
        try {
            const payload = JSON.parse(message.toString());
            callback(payload, receivedTopic);
        } catch (error) {
            console.error('[MQTT] Failed to parse device state:', error);
        }
    });
}

export const ZWave = {
    publishDeviceCommand,
    controlBinarySwitch,
    controlMultilevelSwitch,
    subscribeToDeviceState,
};
