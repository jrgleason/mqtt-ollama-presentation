import { DeviceRegistryBuilder } from '../device-registry.js';

describe('DeviceRegistryBuilder', () => {
    let builder;

    beforeEach(() => {
        builder = new DeviceRegistryBuilder();
    });

    describe('build()', () => {
        it('should build an empty registry from empty config', () => {
            const registry = builder.build({});
            expect(Object.keys(registry).length).toBe(0);
        });

        it('should build registry with device entries', () => {
            const config = {
                '2': {
                    name: 'Living Room Light',
                    loc: 'Living Room',
                    ready: true,
                    available: true,
                    values: {
                        '37-0-currentValue': { commandClass: 37 }
                    }
                }
            };

            const registry = builder.build(config);
            expect(registry['Living Room Light']).toBeDefined();
            expect(registry['Living Room Light'].nodeId).toBe(2);
            expect(registry['Living Room Light'].location).toBe('Living Room');
            expect(registry['Living Room Light'].type).toBe('switch');
        });

        it('should detect dimmer type from command class 38', () => {
            const config = {
                '3': {
                    name: 'Bedroom Dimmer',
                    loc: 'Bedroom',
                    ready: true,
                    available: true,
                    values: {
                        '38-0-currentValue': { commandClass: 38 }
                    }
                }
            };

            const registry = builder.build(config);
            expect(registry['Bedroom Dimmer'].type).toBe('dimmer');
            expect(registry['Bedroom Dimmer'].commandClass).toBe(38);
        });

        it('should detect sensor type from command class 49', () => {
            const config = {
                '5': {
                    name: 'Temp Sensor',
                    loc: 'Office',
                    ready: true,
                    available: true,
                    values: {
                        '49-0-Air temperature': { commandClass: 49 }
                    }
                }
            };

            const registry = builder.build(config);
            expect(registry['Temp Sensor'].type).toBe('sensor');
            expect(registry['Temp Sensor'].commandClass).toBe(49);
        });

        it('should use node id as name if no name provided', () => {
            const config = {
                '7': {
                    loc: 'Garage',
                    ready: true,
                    available: true,
                    values: {}
                }
            };

            const registry = builder.build(config);
            expect(registry['Node 7']).toBeDefined();
            expect(registry['Node 7'].name).toBe('Node 7');
        });
    });

    describe('getDeviceCount()', () => {
        it('should return 0 for empty registry', () => {
            const registry = builder.build({});
            expect(builder.getDeviceCount(registry)).toBe(0);
        });

        it('should return correct count', () => {
            const config = {
                '2': { name: 'Device 1', values: {} },
                '3': { name: 'Device 2', values: {} },
                '4': { name: 'Device 3', values: {} }
            };

            const registry = builder.build(config);
            expect(builder.getDeviceCount(registry)).toBe(3);
        });
    });

    describe('getDevices() - Pagination', () => {
        let largeConfig;
        let largeRegistry;

        beforeEach(() => {
            // Create config with 15 devices
            largeConfig = {};
            for (let i = 1; i <= 15; i++) {
                largeConfig[String(i)] = {
                    name: `Device ${String(i).padStart(2, '0')}`,
                    loc: 'Test Room',
                    values: { '37-0': { commandClass: 37 } }
                };
            }
            largeRegistry = builder.build(largeConfig);
        });

        it('should return first 10 devices by default', () => {
            const result = builder.getDevices(largeRegistry);
            expect(result.showing).toBe(10);
            expect(result.total).toBe(15);
            expect(result.hasMore).toBe(true);
        });

        it('should return devices sorted alphabetically', () => {
            const result = builder.getDevices(largeRegistry, 5);
            expect(result.devices[0].name).toBe('Device 01');
            expect(result.devices[1].name).toBe('Device 02');
            expect(result.devices[4].name).toBe('Device 05');
        });

        it('should apply offset correctly', () => {
            const result = builder.getDevices(largeRegistry, 5, 10);
            expect(result.showing).toBe(5);
            expect(result.devices[0].name).toBe('Device 11');
            expect(result.hasMore).toBe(false);
        });

        it('should return hasMore: false when no more devices', () => {
            const result = builder.getDevices(largeRegistry, 10, 10);
            expect(result.hasMore).toBe(false);
        });

        it('should handle empty registry', () => {
            const emptyRegistry = builder.build({});
            const result = builder.getDevices(emptyRegistry);
            expect(result.devices).toEqual([]);
            expect(result.total).toBe(0);
            expect(result.showing).toBe(0);
            expect(result.hasMore).toBe(false);
        });

        it('should handle limit larger than total', () => {
            const smallConfig = {
                '1': { name: 'Device A', values: {} },
                '2': { name: 'Device B', values: {} }
            };
            const smallRegistry = builder.build(smallConfig);

            const result = builder.getDevices(smallRegistry, 10);
            expect(result.showing).toBe(2);
            expect(result.total).toBe(2);
            expect(result.hasMore).toBe(false);
        });

        it('should handle offset beyond total', () => {
            const result = builder.getDevices(largeRegistry, 10, 50);
            expect(result.devices).toEqual([]);
            expect(result.showing).toBe(0);
            expect(result.hasMore).toBe(false);
        });
    });

    describe('Activity Tracking', () => {
        it('should update device activity', () => {
            const before = Date.now();
            builder.updateDeviceActivity('Test Device');
            const after = Date.now();

            const lastSeen = builder.getLastSeen('Test Device');
            expect(lastSeen).toBeGreaterThanOrEqual(before);
            expect(lastSeen).toBeLessThanOrEqual(after);
        });

        it('should return null for unknown device lastSeen', () => {
            expect(builder.getLastSeen('Unknown Device')).toBeNull();
        });

        it('should return null for unknown device isActive', () => {
            expect(builder.isDeviceActive('Unknown Device')).toBeNull();
        });

        it('should return true for recently active device', () => {
            builder.updateDeviceActivity('Active Device');
            expect(builder.isDeviceActive('Active Device')).toBe(true);
        });

        it('should return false for inactive device', () => {
            // Manually set old timestamp
            builder.deviceLastSeen.set('Old Device', Date.now() - (10 * 60 * 1000)); // 10 minutes ago
            expect(builder.isDeviceActive('Old Device')).toBe(false);
        });

        it('should format lastSeen as seconds ago', () => {
            builder.deviceLastSeen.set('Recent Device', Date.now() - (30 * 1000)); // 30 seconds ago
            const formatted = builder.getLastSeenFormatted('Recent Device');
            expect(formatted).toMatch(/\d+ seconds ago/);
        });

        it('should format lastSeen as minutes ago', () => {
            builder.deviceLastSeen.set('Min Device', Date.now() - (3 * 60 * 1000)); // 3 minutes ago
            const formatted = builder.getLastSeenFormatted('Min Device');
            expect(formatted).toMatch(/\d+ minutes? ago/);
        });

        it('should format lastSeen as hours ago', () => {
            builder.deviceLastSeen.set('Hour Device', Date.now() - (2 * 60 * 60 * 1000)); // 2 hours ago
            const formatted = builder.getLastSeenFormatted('Hour Device');
            expect(formatted).toMatch(/\d+ hours? ago/);
        });

        it('should return Never for unknown device', () => {
            expect(builder.getLastSeenFormatted('Never Seen')).toBe('Never');
        });
    });

    describe('findDeviceByName()', () => {
        let registry;

        beforeEach(() => {
            registry = builder.build({
                '2': { name: 'Living Room Light', loc: 'Living Room', values: {} },
                '3': { name: 'Kitchen Switch', loc: 'Kitchen', values: {} },
                '4': { name: 'Bedroom Dimmer', loc: 'Bedroom', values: {} }
            });
        });

        it('should find device by exact name', () => {
            const device = builder.findDeviceByName(registry, 'Kitchen Switch');
            expect(device).toBeDefined();
            expect(device.name).toBe('Kitchen Switch');
        });

        it('should find device by case-insensitive name', () => {
            const device = builder.findDeviceByName(registry, 'kitchen switch');
            expect(device).toBeDefined();
            expect(device.name).toBe('Kitchen Switch');
        });

        it('should find device by partial name', () => {
            const device = builder.findDeviceByName(registry, 'kitchen');
            expect(device).toBeDefined();
            expect(device.name).toBe('Kitchen Switch');
        });

        it('should return undefined for non-existent device', () => {
            const device = builder.findDeviceByName(registry, 'Garage Door');
            expect(device).toBeUndefined();
        });
    });

    describe('findSimilarDevices()', () => {
        let registry;

        beforeEach(() => {
            registry = builder.build({
                '2': { name: 'Living Room Light', values: {} },
                '3': { name: 'Living Room Fan', values: {} },
                '4': { name: 'Kitchen Light', values: {} },
                '5': { name: 'Bedroom Lamp', values: {} },
                '6': { name: 'Office Light', values: {} }
            });
        });

        it('should find similar devices by partial match', () => {
            const similar = builder.findSimilarDevices(registry, 'Living');
            expect(similar).toContain('Living Room Light');
            expect(similar).toContain('Living Room Fan');
        });

        it('should find devices by common words', () => {
            const similar = builder.findSimilarDevices(registry, 'Room Light');
            expect(similar.length).toBeGreaterThan(0);
        });

        it('should limit results to maxSuggestions', () => {
            const similar = builder.findSimilarDevices(registry, 'Light', 2);
            expect(similar.length).toBeLessThanOrEqual(2);
        });

        it('should return empty array for no matches', () => {
            const similar = builder.findSimilarDevices(registry, 'xyz123');
            expect(similar).toEqual([]);
        });
    });

    describe('Topic Building', () => {
        it('should build control topic with location', () => {
            const topic = builder.buildControlTopic('Living Room', 'Light One', 37);
            expect(topic).toBe('zwave/Living_Room/Light_One/switch_binary/endpoint_0/targetValue/set');
        });

        it('should build control topic without location', () => {
            const topic = builder.buildControlTopic('', 'Kitchen Light', 37);
            expect(topic).toBe('zwave/Kitchen_Light/switch_binary/endpoint_0/targetValue/set');
        });

        it('should build state topic correctly', () => {
            const topic = builder.buildStateTopic('Bedroom', 'Dimmer', 38);
            expect(topic).toBe('zwave/Bedroom/Dimmer/switch_multilevel/endpoint_0/currentValue');
        });

        it('should sanitize special characters in topic', () => {
            const topic = builder.buildControlTopic('Test Room!', 'Light #1', 37);
            expect(topic).toBe('zwave/Test_Room_/Light__1/switch_binary/endpoint_0/targetValue/set');
        });
    });

    describe('Command Class Detection', () => {
        it('should prioritize dimmer over switch', () => {
            const node = {
                values: {
                    '37-0': { commandClass: 37 },
                    '38-0': { commandClass: 38 }
                }
            };
            const result = builder.detectDeviceType(node);
            expect(result.type).toBe('dimmer');
            expect(result.commandClass).toBe(38);
        });

        it('should detect thermostat', () => {
            const node = {
                values: {
                    '64-0': { commandClass: 64 }
                }
            };
            const result = builder.detectDeviceType(node);
            expect(result.type).toBe('thermostat');
        });

        it('should return unknown for unrecognized command class', () => {
            const node = {
                values: {
                    '99-0': { commandClass: 99 }
                }
            };
            const result = builder.detectDeviceType(node);
            expect(result.type).toBe('unknown');
        });

        it('should handle node with no values', () => {
            const node = {};
            const result = builder.detectDeviceType(node);
            expect(result.type).toBe('unknown');
        });
    });
});
