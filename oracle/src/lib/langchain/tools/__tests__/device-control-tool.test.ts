import { createDeviceControlTool } from '../device-control-tool';
import { prisma } from '../../../db/client';
import { ZWave } from '../../../mqtt/client';

// Mock dependencies
jest.mock('../../../db/client', () => ({
  prisma: {
    device: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('../../../mqtt/client', () => ({
  ZWave: {
    controlBinarySwitch: jest.fn(),
    controlMultilevelSwitch: jest.fn(),
  },
}));

describe('Device Control Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should turn on a switch device', async () => {
    const mockDevice = {
      id: '1',
      name: 'Living Room Light',
      type: 'switch',
      location: 'living room',
      nodeId: 2,
      mqttTopic: null,
      state: 'off',
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (prisma.device.findFirst as jest.Mock).mockResolvedValue(mockDevice);
    (prisma.device.update as jest.Mock).mockResolvedValue({ ...mockDevice, state: 'on' });
    (ZWave.controlBinarySwitch as jest.Mock).mockResolvedValue(undefined);

    const tool = createDeviceControlTool();
    const result = await tool.func({ deviceName: 'living room', action: 'on' });

    expect(result).toContain('Successfully turned on Living Room Light');
    expect(prisma.device.findFirst).toHaveBeenCalledWith({
      where: {
        name: {
          contains: 'living room',
          mode: 'insensitive',
        },
      },
    });
    expect(ZWave.controlBinarySwitch).toHaveBeenCalledWith('Living Room Light', true);
    expect(prisma.device.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { state: 'on' },
    });
  });

  it('should turn off a switch device', async () => {
    const mockDevice = {
      id: '1',
      name: 'Bedroom Light',
      type: 'switch',
      location: 'bedroom',
      nodeId: 3,
      mqttTopic: null,
      state: 'on',
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (prisma.device.findFirst as jest.Mock).mockResolvedValue(mockDevice);
    (prisma.device.update as jest.Mock).mockResolvedValue({ ...mockDevice, state: 'off' });
    (ZWave.controlBinarySwitch as jest.Mock).mockResolvedValue(undefined);

    const tool = createDeviceControlTool();
    const result = await tool.func({ deviceName: 'bedroom', action: 'off' });

    expect(result).toContain('Successfully turned off Bedroom Light');
    expect(ZWave.controlBinarySwitch).toHaveBeenCalledWith('Bedroom Light', false);
    expect(prisma.device.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: { state: 'off' },
    });
  });

  it('should dim a dimmer device', async () => {
    const mockDevice = {
      id: '2',
      name: 'Kitchen Light',
      type: 'dimmer',
      location: 'kitchen',
      nodeId: 4,
      mqttTopic: null,
      state: 'off',
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (prisma.device.findFirst as jest.Mock).mockResolvedValue(mockDevice);
    (prisma.device.update as jest.Mock).mockResolvedValue({ ...mockDevice, state: '50%' });
    (ZWave.controlMultilevelSwitch as jest.Mock).mockResolvedValue(undefined);

    const tool = createDeviceControlTool();
    const result = await tool.func({ deviceName: 'kitchen', action: 'dim', level: 50 });

    expect(result).toContain('Successfully dimmed Kitchen Light to 50%');
    expect(ZWave.controlMultilevelSwitch).toHaveBeenCalledWith('Kitchen Light', 50);
    expect(prisma.device.update).toHaveBeenCalledWith({
      where: { id: '2' },
      data: { state: '50%' },
    });
  });

  it('should handle device not found', async () => {
    (prisma.device.findFirst as jest.Mock).mockResolvedValue(null);

    const tool = createDeviceControlTool();
    const result = await tool.func({ deviceName: 'nonexistent', action: 'on' });

    expect(result).toContain('Error: Device "nonexistent" not found in database');
    expect(result).toContain('Use list_devices to see available devices');
    expect(ZWave.controlBinarySwitch).not.toHaveBeenCalled();
    expect(prisma.device.update).not.toHaveBeenCalled();
  });

  it('should validate dimming level', async () => {
    const tool = createDeviceControlTool();
    const result = await tool.func({ deviceName: 'test', action: 'dim' });

    expect(result).toContain('Error: For dimming, level must be between 0 and 100');
  });

  it('should handle unsupported device type', async () => {
    const mockDevice = {
      id: '3',
      name: 'Front Door Sensor',
      type: 'sensor',
      location: 'front door',
      nodeId: 5,
      mqttTopic: null,
      state: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (prisma.device.findFirst as jest.Mock).mockResolvedValue(mockDevice);

    const tool = createDeviceControlTool();
    const result = await tool.func({ deviceName: 'front door', action: 'on' });

    expect(result).toContain('Error: Device type "sensor" does not support action "on"');
    expect(ZWave.controlBinarySwitch).not.toHaveBeenCalled();
    expect(prisma.device.update).not.toHaveBeenCalled();
  });

  it('should handle MQTT errors gracefully', async () => {
    const mockDevice = {
      id: '1',
      name: 'Living Room Light',
      type: 'switch',
      location: 'living room',
      nodeId: 2,
      mqttTopic: null,
      state: 'off',
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (prisma.device.findFirst as jest.Mock).mockResolvedValue(mockDevice);
    (ZWave.controlBinarySwitch as jest.Mock).mockRejectedValue(new Error('MQTT connection failed'));

    const tool = createDeviceControlTool();
    const result = await tool.func({ deviceName: 'living room', action: 'on' });

    expect(result).toContain('Error controlling device');
    expect(result).toContain('MQTT connection failed');
    expect(prisma.device.update).not.toHaveBeenCalled();
  });

  it('should handle database errors gracefully', async () => {
    (prisma.device.findFirst as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

    const tool = createDeviceControlTool();
    const result = await tool.func({ deviceName: 'test', action: 'on' });

    expect(result).toContain('Error controlling device');
    expect(result).toContain('Database connection failed');
  });

  it('should have correct tool metadata', () => {
    const tool = createDeviceControlTool();

    expect(tool.name).toBe('control_device');
    expect(tool.description).toContain('Controls a smart home device');
    expect(tool.description).toContain('MQTT');
  });

  it('should handle case-insensitive device name matching', async () => {
    const mockDevice = {
      id: '1',
      name: 'Living Room Light',
      type: 'switch',
      location: 'living room',
      nodeId: 2,
      mqttTopic: null,
      state: 'off',
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (prisma.device.findFirst as jest.Mock).mockResolvedValue(mockDevice);
    (prisma.device.update as jest.Mock).mockResolvedValue({ ...mockDevice, state: 'on' });
    (ZWave.controlBinarySwitch as jest.Mock).mockResolvedValue(undefined);

    const tool = createDeviceControlTool();
    await tool.func({ deviceName: 'LIVING ROOM', action: 'on' });

    expect(prisma.device.findFirst).toHaveBeenCalledWith({
      where: {
        name: {
          contains: 'LIVING ROOM',
          mode: 'insensitive',
        },
      },
    });
  });
});
