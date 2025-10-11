import mqtt, { MqttClient, IClientOptions } from 'mqtt';

const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://10.0.0.58:31883';
const MQTT_USERNAME = process.env.MQTT_USERNAME || '';
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || '';

/**
 * MQTT Client Singleton
 * Provides a single MQTT connection for the application
 */
class MQTTClientSingleton {
  private static instance: MQTTClientSingleton;
  private client: MqttClient | null = null;
  private connecting: boolean = false;
  private subscribers: Map<string, Set<(topic: string, message: Buffer) => void>> = new Map();

  private constructor() {}

  static getInstance(): MQTTClientSingleton {
    if (!MQTTClientSingleton.instance) {
      MQTTClientSingleton.instance = new MQTTClientSingleton();
    }
    return MQTTClientSingleton.instance;
  }

  /**
   * Connect to MQTT broker
   */
  async connect(): Promise<MqttClient> {
    if (this.client && this.client.connected) {
      return this.client;
    }

    if (this.connecting) {
      // Wait for existing connection attempt
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

    const options: IClientOptions = {
      clientId: `oracle-${Math.random().toString(16).slice(2, 10)}`,
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 30000,
    };

    // Add credentials if provided
    if (MQTT_USERNAME) {
      options.username = MQTT_USERNAME;
      options.password = MQTT_PASSWORD;
    }

    return new Promise((resolve, reject) => {
      this.client = mqtt.connect(MQTT_BROKER_URL, options);

      this.client.on('connect', () => {
        console.log('[MQTT] Connected to broker:', MQTT_BROKER_URL);
        this.connecting = false;
        resolve(this.client!);
      });

      this.client.on('error', (error) => {
        console.error('[MQTT] Connection error:', error);
        this.connecting = false;
        reject(error);
      });

      this.client.on('message', (topic, message) => {
        // Call all subscribers for this topic
        const topicSubscribers = this.subscribers.get(topic);
        if (topicSubscribers) {
          topicSubscribers.forEach(callback => callback(topic, message));
        }

        // Call wildcard subscribers
        const wildcardSubscribers = this.subscribers.get('#');
        if (wildcardSubscribers) {
          wildcardSubscribers.forEach(callback => callback(topic, message));
        }
      });

      this.client.on('reconnect', () => {
        console.log('[MQTT] Reconnecting...');
      });

      this.client.on('close', () => {
        console.log('[MQTT] Connection closed');
      });
    });
  }

  /**
   * Publish a message to a topic
   */
  async publish(topic: string, message: string | object, options?: { qos?: 0 | 1 | 2 }): Promise<void> {
    if (!this.client || !this.client.connected) {
      await this.connect();
    }

    const payload = typeof message === 'string' ? message : JSON.stringify(message);

    return new Promise((resolve, reject) => {
      this.client!.publish(topic, payload, { qos: options?.qos || 0 }, (error) => {
        if (error) {
          console.error('[MQTT] Publish error:', error);
          reject(error);
        } else {
          console.log('[MQTT] Published to', topic, ':', payload);
          resolve();
        }
      });
    });
  }

  /**
   * Subscribe to a topic with a callback
   */
  async subscribe(topic: string, callback: (topic: string, message: Buffer) => void): Promise<void> {
    if (!this.client || !this.client.connected) {
      await this.connect();
    }

    return new Promise((resolve, reject) => {
      this.client!.subscribe(topic, { qos: 0 }, (error) => {
        if (error) {
          console.error('[MQTT] Subscribe error:', error);
          reject(error);
        } else {
          console.log('[MQTT] Subscribed to:', topic);

          // Add callback to subscribers map
          if (!this.subscribers.has(topic)) {
            this.subscribers.set(topic, new Set());
          }
          this.subscribers.get(topic)!.add(callback);

          resolve();
        }
      });
    });
  }

  /**
   * Unsubscribe from a topic
   */
  async unsubscribe(topic: string, callback?: (topic: string, message: Buffer) => void): Promise<void> {
    if (!this.client || !this.client.connected) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.client!.unsubscribe(topic, (error) => {
        if (error) {
          console.error('[MQTT] Unsubscribe error:', error);
          reject(error);
        } else {
          console.log('[MQTT] Unsubscribed from:', topic);

          // Remove callback from subscribers map
          if (callback && this.subscribers.has(topic)) {
            this.subscribers.get(topic)!.delete(callback);
          } else {
            this.subscribers.delete(topic);
          }

          resolve();
        }
      });
    });
  }

  /**
   * Disconnect from MQTT broker
   */
  async disconnect(): Promise<void> {
    if (!this.client) {
      return;
    }

    return new Promise((resolve) => {
      this.client!.end(false, {}, () => {
        console.log('[MQTT] Disconnected');
        this.client = null;
        resolve();
      });
    });
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.client !== null && this.client.connected;
  }
}

// Export singleton instance
export const mqttClient = MQTTClientSingleton.getInstance();

/**
 * Publish a Z-Wave device control command
 * Topic format: zwave/<DeviceName>/<CommandClass>/<Endpoint>/<Property>/set
 */
export async function publishDeviceCommand(
  deviceName: string,
  commandClass: number,
  endpoint: number,
  property: string,
  value: string | number | boolean
): Promise<void> {
  const topic = `zwave/${deviceName}/${commandClass}/${endpoint}/${property}/set`;
  await mqttClient.publish(topic, JSON.stringify({ value }));
}

/**
 * Control a binary switch (on/off)
 * Command Class 37
 */
export async function controlBinarySwitch(deviceName: string, state: boolean): Promise<void> {
  await publishDeviceCommand(deviceName, 37, 0, 'targetValue', state);
}

/**
 * Control a multilevel switch (dimmer)
 * Command Class 38
 */
export async function controlMultilevelSwitch(deviceName: string, level: number): Promise<void> {
  // Ensure level is between 0-99
  const clampedLevel = Math.max(0, Math.min(99, level));
  await publishDeviceCommand(deviceName, 38, 0, 'targetValue', clampedLevel);
}

/**
 * Subscribe to device state updates
 * Topic format: zwave/<DeviceName>/<CommandClass>/<Endpoint>/<Property>
 */
export async function subscribeToDeviceState(
  deviceName: string,
  callback: (state: unknown) => void
): Promise<void> {
  const topic = `zwave/${deviceName}/+/+/+`;
  await mqttClient.subscribe(topic, (receivedTopic, message) => {
    try {
      const payload = JSON.parse(message.toString());
      callback(payload);
    } catch (error) {
      console.error('[MQTT] Failed to parse device state:', error);
    }
  });
}

// Provide a compatibility object so existing code that references `ZWave.*` continues to work
export const ZWave = {
  publishDeviceCommand,
  controlBinarySwitch,
  controlMultilevelSwitch,
  subscribeToDeviceState,
};
