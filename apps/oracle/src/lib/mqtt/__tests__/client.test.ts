import { mqttClient, ZWave } from '../client';
import mqtt from 'mqtt';

// Mock mqtt module
jest.mock('mqtt');

describe('MQTT Client', () => {
  let mockMqttClient: any;

  beforeEach(async () => {
    // Disconnect any existing client
    await mqttClient.disconnect();

    // Create mock MQTT client
    mockMqttClient = {
      connected: false,
      on: jest.fn(),
      publish: jest.fn((topic, message, options, callback) => callback(null)),
      subscribe: jest.fn((topic, options, callback) => callback(null)),
      unsubscribe: jest.fn((topic, callback) => callback(null)),
      end: jest.fn((force, opts, callback) => callback()),
    };

    // Mock mqtt.connect to return our mock client
    (mqtt.connect as jest.Mock).mockReturnValue(mockMqttClient);
  });

  afterEach(async () => {
    await mqttClient.disconnect();
    jest.clearAllMocks();
  });

  describe('connect', () => {
    it('should connect to MQTT broker', async () => {
      // Simulate successful connection
      setTimeout(() => {
        mockMqttClient.connected = true;
        const connectHandler = mockMqttClient.on.mock.calls.find(
          (call: any[]) => call[0] === 'connect'
        )?.[1];
        connectHandler?.();
      }, 10);

      const client = await mqttClient.connect();

      expect(mqtt.connect).toHaveBeenCalledWith(
        expect.stringContaining('mqtt://'),
        expect.objectContaining({
          clientId: expect.stringMatching(/^oracle-/),
          clean: true,
          reconnectPeriod: 5000,
          connectTimeout: 30000,
        })
      );
      expect(client).toBeDefined();
    });

    it('should handle connection errors', async () => {
      // Simulate connection error
      setTimeout(() => {
        const errorHandler = mockMqttClient.on.mock.calls.find(
          (call: any[]) => call[0] === 'error'
        )?.[1];
        errorHandler?.(new Error('Connection failed'));
      }, 10);

      await expect(mqttClient.connect()).rejects.toThrow('Connection failed');
    });
  });

  describe('publish', () => {
    beforeEach(async () => {
      // Setup connected client
      setTimeout(() => {
        mockMqttClient.connected = true;
        const connectHandler = mockMqttClient.on.mock.calls.find(
          (call: any[]) => call[0] === 'connect'
        )?.[1];
        connectHandler?.();
      }, 10);
      await mqttClient.connect();
    });

    it('should publish string message', async () => {
      await mqttClient.publish('test/topic', 'hello');

      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        'test/topic',
        'hello',
        { qos: 0 },
        expect.any(Function)
      );
    });

    it('should publish object as JSON', async () => {
      const message = { value: true };
      await mqttClient.publish('test/topic', message);

      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        'test/topic',
        JSON.stringify(message),
        { qos: 0 },
        expect.any(Function)
      );
    });

    it('should handle publish errors', async () => {
      mockMqttClient.publish.mockImplementation((topic, message, options, callback) => {
        callback(new Error('Publish failed'));
      });

      await expect(mqttClient.publish('test/topic', 'hello')).rejects.toThrow(
        'Publish failed'
      );
    });
  });

  describe('subscribe', () => {
    beforeEach(async () => {
      // Setup connected client
      setTimeout(() => {
        mockMqttClient.connected = true;
        const connectHandler = mockMqttClient.on.mock.calls.find(
          (call: any[]) => call[0] === 'connect'
        )?.[1];
        connectHandler?.();
      }, 10);
      await mqttClient.connect();
    });

    it('should subscribe to topic', async () => {
      const callback = jest.fn();
      await mqttClient.subscribe('test/topic', callback);

      expect(mockMqttClient.subscribe).toHaveBeenCalledWith(
        'test/topic',
        { qos: 0 },
        expect.any(Function)
      );
    });

    it('should handle subscribe errors', async () => {
      mockMqttClient.subscribe.mockImplementation((topic, options, callback) => {
        callback(new Error('Subscribe failed'));
      });

      const callback = jest.fn();
      await expect(mqttClient.subscribe('test/topic', callback)).rejects.toThrow(
        'Subscribe failed'
      );
    });
  });

  describe('ZWave helpers', () => {
    beforeEach(async () => {
      // Setup connected client
      setTimeout(() => {
        mockMqttClient.connected = true;
        const connectHandler = mockMqttClient.on.mock.calls.find(
          (call: any[]) => call[0] === 'connect'
        )?.[1];
        connectHandler?.();
      }, 10);
      await mqttClient.connect();
    });

    it('should control binary switch (on)', async () => {
      await ZWave.controlBinarySwitch('LivingRoomLight', true);

      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        'zwave/LivingRoomLight/37/0/targetValue/set',
        JSON.stringify({ value: true }),
        { qos: 0 },
        expect.any(Function)
      );
    });

    it('should control binary switch (off)', async () => {
      await ZWave.controlBinarySwitch('LivingRoomLight', false);

      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        'zwave/LivingRoomLight/37/0/targetValue/set',
        JSON.stringify({ value: false }),
        { qos: 0 },
        expect.any(Function)
      );
    });

    it('should control multilevel switch (dimmer)', async () => {
      await ZWave.controlMultilevelSwitch('BedroomLight', 50);

      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        'zwave/BedroomLight/38/0/targetValue/set',
        JSON.stringify({ value: 50 }),
        { qos: 0 },
        expect.any(Function)
      );
    });

    it('should clamp dimmer level to 0-99 range', async () => {
      await ZWave.controlMultilevelSwitch('BedroomLight', 150);

      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        'zwave/BedroomLight/38/0/targetValue/set',
        JSON.stringify({ value: 99 }),
        { qos: 0 },
        expect.any(Function)
      );

      await ZWave.controlMultilevelSwitch('BedroomLight', -10);

      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        'zwave/BedroomLight/38/0/targetValue/set',
        JSON.stringify({ value: 0 }),
        { qos: 0 },
        expect.any(Function)
      );
    });

    it('should subscribe to device state updates', async () => {
      const callback = jest.fn();
      await ZWave.subscribeToDeviceState('LivingRoomLight', callback);

      expect(mockMqttClient.subscribe).toHaveBeenCalledWith(
        'zwave/LivingRoomLight/+/+/+',
        { qos: 0 },
        expect.any(Function)
      );
    });
  });
});
