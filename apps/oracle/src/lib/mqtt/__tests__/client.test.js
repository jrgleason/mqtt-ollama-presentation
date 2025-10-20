/**
 * Tests for MQTT Client
 *
 * These tests verify that the MQTT client wrapper correctly preserves
 * all mqtt.js options and provides a robust singleton interface.
 */

import { jest } from '@jest/globals';

// Mock mqtt module before importing client
const mockMqttClient = {
  connected: false,
  connect: jest.fn(),
  publish: jest.fn(),
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  end: jest.fn(),
  on: jest.fn(),
};

const mockMqttConnect = jest.fn(() => mockMqttClient);

jest.unstable_mockModule('mqtt', () => ({
  default: {
    connect: mockMqttConnect,
  },
}));

// Import after mocking
const { mqttClient } = await import('../client.js');

describe('MQTT Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMqttClient.connected = false;

    // Setup default mock behavior
    mockMqttClient.on.mockImplementation((event, callback) => {
      if (event === 'connect') {
        // Simulate immediate connection
        setTimeout(() => {
          mockMqttClient.connected = true;
          callback();
        }, 0);
      }
      return mockMqttClient;
    });
  });

  describe('publish()', () => {
    it('should preserve all caller-provided options', async () => {
      // Setup
      mockMqttClient.publish.mockImplementation((topic, payload, options, callback) => {
        callback(null); // Success
      });

      // Test with multiple options
      const testOptions = {
        qos: 1,
        retain: true,
        dup: false,
        properties: {
          messageExpiryInterval: 60,
          userProperties: { foo: 'bar' },
        },
      };

      // Execute
      await mqttClient.publish('test/topic', 'test message', testOptions);

      // Verify all options were forwarded
      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        'test/topic',
        'test message',
        expect.objectContaining({
          qos: 1,
          retain: true,
          dup: false,
          properties: expect.objectContaining({
            messageExpiryInterval: 60,
            userProperties: { foo: 'bar' },
          }),
        }),
        expect.any(Function)
      );
    });

    it('should use qos:0 as default when no options provided', async () => {
      // Setup
      mockMqttClient.publish.mockImplementation((topic, payload, options, callback) => {
        callback(null);
      });

      // Execute
      await mqttClient.publish('test/topic', 'test message');

      // Verify default qos
      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        'test/topic',
        'test message',
        expect.objectContaining({ qos: 0 }),
        expect.any(Function)
      );
    });

    it('should allow caller to override default qos', async () => {
      // Setup
      mockMqttClient.publish.mockImplementation((topic, payload, options, callback) => {
        callback(null);
      });

      // Execute with custom qos
      await mqttClient.publish('test/topic', 'test message', { qos: 2 });

      // Verify custom qos
      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        'test/topic',
        'test message',
        expect.objectContaining({ qos: 2 }),
        expect.any(Function)
      );
    });

    it('should preserve retain flag', async () => {
      // Setup
      mockMqttClient.publish.mockImplementation((topic, payload, options, callback) => {
        callback(null);
      });

      // Execute with retain flag
      await mqttClient.publish('test/topic', 'test message', { retain: true });

      // Verify retain was preserved
      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        'test/topic',
        'test message',
        expect.objectContaining({ retain: true }),
        expect.any(Function)
      );
    });

    it('should preserve MQTT 5.0 properties', async () => {
      // Setup
      mockMqttClient.publish.mockImplementation((topic, payload, options, callback) => {
        callback(null);
      });

      const properties = {
        messageExpiryInterval: 300,
        responseTopic: 'response/topic',
        correlationData: Buffer.from('12345'),
        userProperties: {
          applicationId: 'oracle',
          version: '1.0.0',
        },
      };

      // Execute with MQTT 5.0 properties
      await mqttClient.publish('test/topic', 'test message', { properties });

      // Verify properties were preserved
      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        'test/topic',
        'test message',
        expect.objectContaining({
          properties: expect.objectContaining({
            messageExpiryInterval: 300,
            responseTopic: 'response/topic',
            correlationData: Buffer.from('12345'),
            userProperties: {
              applicationId: 'oracle',
              version: '1.0.0',
            },
          }),
        }),
        expect.any(Function)
      );
    });

    it('should stringify object messages', async () => {
      // Setup
      mockMqttClient.publish.mockImplementation((topic, payload, options, callback) => {
        callback(null);
      });

      const messageObj = { value: true, deviceId: '123' };

      // Execute
      await mqttClient.publish('test/topic', messageObj);

      // Verify message was stringified
      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        'test/topic',
        JSON.stringify(messageObj),
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('should reject on publish error', async () => {
      // Setup
      const testError = new Error('Publish failed');
      mockMqttClient.publish.mockImplementation((topic, payload, options, callback) => {
        callback(testError);
      });

      // Execute and verify error
      await expect(
        mqttClient.publish('test/topic', 'test message')
      ).rejects.toThrow('Publish failed');
    });

    it('should auto-connect if not connected', async () => {
      // Setup - client not connected
      mockMqttClient.connected = false;
      mockMqttClient.publish.mockImplementation((topic, payload, options, callback) => {
        callback(null);
      });

      // Execute
      await mqttClient.publish('test/topic', 'test message');

      // Verify connect was called
      expect(mockMqttConnect).toHaveBeenCalled();
    });
  });

  describe('Options preservation - edge cases', () => {
    it('should preserve empty options object', async () => {
      mockMqttClient.publish.mockImplementation((topic, payload, options, callback) => {
        callback(null);
      });

      await mqttClient.publish('test/topic', 'message', {});

      // Should only have default qos
      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        'test/topic',
        'message',
        { qos: 0 },
        expect.any(Function)
      );
    });

    it('should handle options with falsy values correctly', async () => {
      mockMqttClient.publish.mockImplementation((topic, payload, options, callback) => {
        callback(null);
      });

      await mqttClient.publish('test/topic', 'message', {
        qos: 0,
        retain: false,
        dup: false,
      });

      // All falsy values should be preserved
      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        'test/topic',
        'message',
        expect.objectContaining({
          qos: 0,
          retain: false,
          dup: false,
        }),
        expect.any(Function)
      );
    });

    it('should not mutate caller options object', async () => {
      mockMqttClient.publish.mockImplementation((topic, payload, options, callback) => {
        callback(null);
      });

      const originalOptions = { retain: true };
      const optionsCopy = { ...originalOptions };

      await mqttClient.publish('test/topic', 'message', originalOptions);

      // Original options should not be modified
      expect(originalOptions).toEqual(optionsCopy);
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle device control with retain flag', async () => {
      mockMqttClient.publish.mockImplementation((topic, payload, options, callback) => {
        callback(null);
      });

      // Publish device state with retain so new subscribers get last state
      await mqttClient.publish(
        'zwave/Switch_One/switch_binary/endpoint_0/targetValue/set',
        JSON.stringify({ value: true }),
        { retain: true, qos: 1 }
      );

      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          retain: true,
          qos: 1,
        }),
        expect.any(Function)
      );
    });

    it('should handle last will message with MQTT 5.0 properties', async () => {
      mockMqttClient.publish.mockImplementation((topic, payload, options, callback) => {
        callback(null);
      });

      await mqttClient.publish(
        'devices/status',
        JSON.stringify({ status: 'offline' }),
        {
          qos: 1,
          retain: true,
          properties: {
            messageExpiryInterval: 3600,
            willDelayInterval: 60,
          },
        }
      );

      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          qos: 1,
          retain: true,
          properties: expect.objectContaining({
            messageExpiryInterval: 3600,
            willDelayInterval: 60,
          }),
        }),
        expect.any(Function)
      );
    });
  });
});
