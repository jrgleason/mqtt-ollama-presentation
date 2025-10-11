// MQTT Client for device control
import mqtt, { MqttClient } from 'mqtt';
import { MQTTConfig } from './types.js';

export class MQTTClientWrapper {
  private client: MqttClient;
  private connected = false;

  constructor(private config: MQTTConfig) {
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

  isConnected(): boolean {
    return this.connected;
  }

  async publish(topic: string, message: any, qos: 0 | 1 | 2 = 1): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.connected) {
        reject(new Error('MQTT client not connected'));
        return;
      }

      const payload = typeof message === 'string' ? message : JSON.stringify(message);

      this.client.publish(topic, payload, { qos }, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log(`[MQTT] Published to ${topic}: ${payload}`);
          resolve();
        }
      });
    });
  }

  subscribe(topic: string, callback: (topic: string, message: any) => void): void {
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

  private topicMatches(pattern: string, topic: string): boolean {
    // Simple wildcard matching for MQTT topics
    // '+' matches single level, '#' matches multiple levels
    const patternParts = pattern.split('/');
    const topicParts = topic.split('/');

    for (let i = 0; i < patternParts.length; i++) {
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

  close(): void {
    this.client.end();
  }
}
