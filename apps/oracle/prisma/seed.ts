import { PrismaClient } from '../src/generated/prisma';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.device.deleteMany();

  // Create mock devices for demo
  const devices = [
    {
      name: 'Living Room Light',
      type: 'dimmer',
      location: 'living room',
      nodeId: 2,
      mqttTopic: 'zwave/living-room-light/set',
      state: 'off',
      metadata: JSON.stringify({ minLevel: 0, maxLevel: 100 }),
    },
    {
      name: 'Bedroom Light',
      type: 'switch',
      location: 'bedroom',
      nodeId: 3,
      mqttTopic: 'zwave/bedroom-light/set',
      state: 'off',
    },
    {
      name: 'Kitchen Light',
      type: 'dimmer',
      location: 'kitchen',
      nodeId: 4,
      mqttTopic: 'zwave/kitchen-light/set',
      state: 'on',
      metadata: JSON.stringify({ minLevel: 0, maxLevel: 100 }),
    },
    {
      name: 'Front Door Sensor',
      type: 'sensor',
      location: 'front door',
      nodeId: 5,
      mqttTopic: 'zwave/front-door-sensor/status',
      state: 'closed',
      metadata: JSON.stringify({ sensorType: 'door' }),
    },
  ];

  for (const device of devices) {
    await prisma.device.create({ data: device });
  }

  console.log('✅ Seeded 4 mock devices');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
