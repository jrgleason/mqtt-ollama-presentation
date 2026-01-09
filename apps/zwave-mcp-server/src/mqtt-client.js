import mqtt from 'mqtt';

/** @typedef {import('./types.js').MQTTConfig} MQTTConfig */

/**
 * @typedef {Object} SensorCacheEntry
 * @property {number|boolean} value - Sensor reading value
 * @property {number} timestamp - Unix timestamp (ms) when value was received
 * @property {string} commandClass - Command class name (e.g., 'sensor_multilevel')
 * @property {string} [unit] - Unit of measurement (e.g., 'F', '%', 'lux')
 * @property {string} topic - Full MQTT topic where value was received
 */

export class MQTTClientWrapper {
    /**
     * @param {MQTTConfig} config
     * @param {import('./device-registry.js').DeviceRegistryBuilder} [registryBuilder] - Optional registry builder for activity tracking
     */
    constructor(config, registryBuilder = null) {
        this.config = config;
        this.connected = false;
        this.registryBuilder = registryBuilder;
        /** @type {Map<string, SensorCacheEntry>} */
        this.sensorCache = new Map();
        this.sensorTopicPattern = 'zwave/+/+/sensor_multilevel/+/currentValue';

        this.client = mqtt.connect(config.brokerUrl, {
            username: config.username,
            password: config.password,
            reconnectPeriod: 1000,
        });

        this.client.on('connect', () => {
            console.warn('[MQTT] Connected to broker');
            this.connected = true;

            // Subscribe to sensor data topics on connect
            this._subscribeToSensors();
        });

        this.client.on('error', (err) => {
            console.error('[MQTT] Error:', err);
        });

        this.client.on('offline', () => {
            console.warn('[MQTT] Disconnected');
            this.connected = false;
        });

        this.client.on('reconnect', () => {
            console.warn('[MQTT] Reconnecting to broker...');
        });
    }

    /**
     * Subscribe to sensor data topics and cache incoming values
     * @private
     */
    _subscribeToSensors() {
        this.client.subscribe(this.sensorTopicPattern, (err) => {
            if (err) {
                console.error(`[MQTT] Failed to subscribe to sensor topics:`, err);
            } else {
                console.warn(`[MQTT] Subscribed to sensor topic pattern: ${this.sensorTopicPattern}`);
            }
        });

        // Listen for sensor messages and cache them
        this.client.on('message', (topic, payload) => {
            if (this.topicMatches(this.sensorTopicPattern, topic)) {
                try {
                    this._handleSensorMessage(topic, payload);
                } catch (error) {
                    console.error('[MQTT] Error handling sensor message:', error);
                }
            }
        });
    }

    /**
     * Parse sensor MQTT message and update cache
     * Topic format: zwave/[Location/]Device_Name/sensor_multilevel/endpoint_0/currentValue
     * @private
     * @param {string} topic
     * @param {Buffer} payload
     */
    _handleSensorMessage(topic, payload) {
        try {
            const message = JSON.parse(payload.toString());

            // Extract device name from topic
            // Format: zwave/[Location/]Device_Name/sensor_multilevel/endpoint_0/currentValue
            const parts = topic.split('/');

            // Remove 'zwave' prefix and 'sensor_multilevel/endpoint_0/currentValue' suffix
            // This leaves us with either [Location, DeviceName] or [DeviceName]
            const deviceParts = parts.slice(1, -3);

            // If there are multiple parts, the last one is the device name
            // If location is included, it's in the earlier parts
            const deviceName = deviceParts[deviceParts.length - 1];

            if (!deviceName) {
                console.warn('[MQTT] Could not extract device name from topic:', topic);
                return;
            }

            // Cache the sensor value
            const cacheEntry = {
                value: message.value,
                timestamp: Date.now(),
                commandClass: 'sensor_multilevel',
                unit: message.unit,
                topic
            };

            this.sensorCache.set(deviceName, cacheEntry);

            // Update device activity tracking if registry builder is available
            if (this.registryBuilder) {
                this.registryBuilder.updateDeviceActivity(deviceName);
            }

            console.warn(`[MQTT] Cached sensor value for "${deviceName}":`, {
                value: message.value,
                unit: message.unit || 'unknown'
            });
        } catch (error) {
            console.error('[MQTT] Failed to parse sensor message:', error);
        }
    }

    /**
     * Get cached sensor value for a device
     * @param {string} deviceName - Device name (case-insensitive)
     * @param {number} maxAgeMs - Maximum age of cached value in milliseconds (default: 5 minutes)
     * @returns {SensorCacheEntry | null} Cached sensor value or null if not found/stale
     */
    getCachedSensorValue(deviceName, maxAgeMs = 5 * 60 * 1000) {
        // Try exact match first
        let entry = this.sensorCache.get(deviceName);

        // If no exact match, try case-insensitive search
        if (!entry) {
            const lowerName = deviceName.toLowerCase();
            for (const [cachedName, cachedEntry] of this.sensorCache.entries()) {
                if (cachedName.toLowerCase() === lowerName) {
                    entry = cachedEntry;
                    break;
                }
            }
        }

        if (!entry) {
            console.warn(`[MQTT] No cached sensor value for device: ${deviceName}`);
            return null;
        }

        // Check if value is stale
        const age = Date.now() - entry.timestamp;
        if (age > maxAgeMs) {
            console.warn(`[MQTT] Cached value for ${deviceName} is stale (${Math.round(age / 1000)}s old)`);
            return null;
        }

        console.warn(`[MQTT] Found cached sensor value for ${deviceName} (${Math.round(age / 1000)}s old)`);
        return entry;
    }

    /**
     * Get all cached sensor values (for debugging)
     * @returns {Map<string, SensorCacheEntry>}
     */
    getAllCachedSensors() {
        return new Map(this.sensorCache);
    }

    /**
     * Clear the sensor cache
     */
    clearSensorCache() {
        this.sensorCache.clear();
        console.warn('[MQTT] Sensor cache cleared');
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

        console.warn(`[MQTT] Published to ${topic}: ${payload}`);
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
                console.warn(`[MQTT] Subscribed to ${topic}`);
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
