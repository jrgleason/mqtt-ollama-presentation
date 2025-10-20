import mqtt from 'mqtt';

/** @typedef {import('./types.js').MQTTConfig} MQTTConfig */

export class MQTTClientWrapper {
    /**
     * @param {MQTTConfig} config
     */
    constructor(config) {
        this.config = config;
        this.connected = false;
        this.client = mqtt.connect(config.brokerUrl, {
            username: config.username,
            password: config.password,
            reconnectPeriod: 1000,
        });

        this.client.on('connect', () => {
            console.log('[MQTT] Connected to broker');
            this.connected = true;
        });

        this.client.on('error', (err) => {
            console.error('[MQTT] Error:', err);
        });

        this.client.on('offline', () => {
            console.log('[MQTT] Disconnected');
            this.connected = false;
        });
    }

    isConnected() {
        return this.connected;
    }

    /**
     * @param {string} topic
     * @param {any} message
     * @param {0|1|2} [qos=1]
     */
    async publish(topic, message, qos = 1) {
        if (!this.connected) {
            throw new Error('MQTT client not connected');
        }

        const payload = typeof message === 'string' ? message : JSON.stringify(message);

        await new Promise((resolve, reject) => {
            this.client.publish(topic, payload, {qos}, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });

        console.log(`[MQTT] Published to ${topic}: ${payload}`);
    }

    /**
     * @param {string} topic
     * @param {(topic: string, message: any) => void} callback
     */
    subscribe(topic, callback) {
        this.client.subscribe(topic, (err) => {
            if (err) {
                console.error(`[MQTT] Subscribe error for ${topic}:`, err);
            } else {
                console.log(`[MQTT] Subscribed to ${topic}`);
            }
        });

        this.client.on('message', (t, msg) => {
            if (t === topic || this.topicMatches(topic, t)) {
                try {
                    const parsed = JSON.parse(msg.toString());
                    callback(t, parsed);
                } catch {
                    callback(t, msg.toString());
                }
            }
        });
    }

    topicMatches(pattern, topic) {
        const patternParts = pattern.split('/');
        const topicParts = topic.split('/');

        for (let i = 0; i < patternParts.length; i += 1) {
            if (patternParts[i] === '#') {
                return true;
            }
            if (patternParts[i] === '+') {
                continue;
            }
            if (patternParts[i] !== topicParts[i]) {
                return false;
            }
        }

        return patternParts.length === topicParts.length;
    }

    close() {
        this.client.end();
    }
}
