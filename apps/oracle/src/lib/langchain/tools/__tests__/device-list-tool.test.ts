import { createDeviceListTool } from '../device-list-tool';
import { prisma } from '../../../db/client';

// Mock Prisma client
jest.mock('../../../db/client', () => ({
  prisma: {
    device: {
      findMany: jest.fn(),
    },
  },
}));

describe('Device List Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should list devices from database', async () => {
    const mockDevices = [
      {
        id: '1',
        name: 'Living Room Light',
        type: 'dimmer',
        location: 'living room',
        nodeId: 2,
        mqttTopic: 'zwave/living-room-light/set',
        state: 'off',
        metadata: JSON.stringify({ minLevel: 0, maxLevel: 100 }),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        name: 'Bedroom Light',
        type: 'switch',
        location: 'bedroom',
        nodeId: 3,
        mqttTopic: 'zwave/bedroom-light/set',
        state: 'on',
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    (prisma.device.findMany as jest.Mock).mockResolvedValue(mockDevices);

    const tool = createDeviceListTool();
    const result = await tool.func('');

    expect(result).toContain('Available devices (2 total)');
    expect(result).toContain('Living Room Light');
    expect(result).toContain('Bedroom Light');
    expect(result).toContain('Type: dimmer');
    expect(result).toContain('Type: switch');
    expect(result).toContain('Location: living room');
    expect(result).toContain('Location: bedroom');
    expect(result).toContain('Node ID: 2');
    expect(result).toContain('Node ID: 3');
  });

  it('should handle empty device list', async () => {
    (prisma.device.findMany as jest.Mock).mockResolvedValue([]);

    const tool = createDeviceListTool();
    const result = await tool.func('');

    expect(result).toBe('No devices found in the database. Please pair some Z-Wave devices first.');
  });

  it('should handle database errors', async () => {
    (prisma.device.findMany as jest.Mock).mockRejectedValue(new Error('Database connection failed'));

    const tool = createDeviceListTool();
    const result = await tool.func('');

    expect(result).toContain('Error listing devices');
    expect(result).toContain('Database connection failed');
  });

  it('should order devices by location and name', async () => {
    const mockDevices = [
      {
        id: '1',
        name: 'Living Room Light',
        type: 'dimmer',
        location: 'living room',
        nodeId: 2,
        mqttTopic: null,
        state: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    (prisma.device.findMany as jest.Mock).mockResolvedValue(mockDevices);

    const tool = createDeviceListTool();
    await tool.func('');

    expect(prisma.device.findMany).toHaveBeenCalledWith({
      orderBy: [
        { location: 'asc' },
        { name: 'asc' },
      ],
    });
  });

  it('should have correct tool metadata', () => {
    const tool = createDeviceListTool();

    expect(tool.name).toBe('list_devices');
    expect(tool.description).toContain('Lists all available smart home devices');
    expect(tool.description).toContain('id: Device unique identifier');
    expect(tool.description).toContain('name: Friendly device name');
    expect(tool.description).toContain('type: Device type');
  });
});
