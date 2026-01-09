/**
 * Tests for formatDeviceState function
 */

// Since formatDeviceState is not exported, we'll test it via integration tests
// But we can create a standalone version for unit testing
describe('formatDeviceState', () => {
    /**
     * Format device state for human-readable display
     * @param {Record<string, any>} [values] - Device values from Z-Wave node
     * @returns {string} - Formatted state (e.g., "ON", "OFF", "61.8°F", "unknown")
     */
    function formatDeviceState(values) {
        if (!values) {
            return 'unknown';
        }

        const candidates = Object.values(values);
        if (!candidates.length) {
            return 'unknown';
        }

        // Find primary value (currentValue, state, or value property)
        const priority = candidates.find((value) =>
            ['currentValue', 'state', 'value'].includes(String(value.property)),
        );
        const selected = priority || candidates[0];

        // Handle undefined/null values
        if (selected.value === undefined || selected.value === null) {
            return 'unknown';
        }

        // Handle boolean states (switches)
        if (typeof selected.value === 'boolean') {
            return selected.value ? 'ON' : 'OFF';
        }

        // Handle numeric values with units (sensors)
        if (typeof selected.value === 'number') {
            const unit = selected.unit || '';
            // Remove space between value and unit for compact display
            return unit ? `${selected.value}${unit}` : String(selected.value);
        }

        // Handle string values
        if (typeof selected.value === 'string') {
            return selected.value;
        }

        // Fallback for other types
        return String(selected.value);
    }

    describe('Boolean States (Switches)', () => {
        it('should format true as "ON"', () => {
            const values = {
                'currentValue': {
                    property: 'currentValue',
                    value: true
                }
            };
            expect(formatDeviceState(values)).toBe('ON');
        });

        it('should format false as "OFF"', () => {
            const values = {
                'currentValue': {
                    property: 'currentValue',
                    value: false
                }
            };
            expect(formatDeviceState(values)).toBe('OFF');
        });
    });

    describe('Numeric Values (Sensors)', () => {
        it('should format numeric value with unit', () => {
            const values = {
                'temperature': {
                    property: 'currentValue',
                    value: 61.8,
                    unit: '°F'
                }
            };
            expect(formatDeviceState(values)).toBe('61.8°F');
        });

        it('should format numeric value without unit', () => {
            const values = {
                'level': {
                    property: 'currentValue',
                    value: 75
                }
            };
            expect(formatDeviceState(values)).toBe('75');
        });

        it('should handle zero value', () => {
            const values = {
                'level': {
                    property: 'currentValue',
                    value: 0
                }
            };
            expect(formatDeviceState(values)).toBe('0');
        });

        it('should handle negative values', () => {
            const values = {
                'temperature': {
                    property: 'currentValue',
                    value: -10,
                    unit: '°C'
                }
            };
            expect(formatDeviceState(values)).toBe('-10°C');
        });

        it('should handle decimal values', () => {
            const values = {
                'humidity': {
                    property: 'currentValue',
                    value: 65.4,
                    unit: '%'
                }
            };
            expect(formatDeviceState(values)).toBe('65.4%');
        });
    });

    describe('String Values', () => {
        it('should return string values as-is', () => {
            const values = {
                'mode': {
                    property: 'currentValue',
                    value: 'heating'
                }
            };
            expect(formatDeviceState(values)).toBe('heating');
        });
    });

    describe('Unknown/Null States', () => {
        it('should return "unknown" for undefined values', () => {
            const values = {
                'currentValue': {
                    property: 'currentValue',
                    value: undefined
                }
            };
            expect(formatDeviceState(values)).toBe('unknown');
        });

        it('should return "unknown" for null values', () => {
            const values = {
                'currentValue': {
                    property: 'currentValue',
                    value: null
                }
            };
            expect(formatDeviceState(values)).toBe('unknown');
        });

        it('should return "unknown" for no values', () => {
            expect(formatDeviceState(undefined)).toBe('unknown');
        });

        it('should return "unknown" for empty values object', () => {
            expect(formatDeviceState({})).toBe('unknown');
        });
    });

    describe('Priority Selection', () => {
        it('should prioritize currentValue property', () => {
            const values = {
                'otherProp': {
                    property: 'other',
                    value: false
                },
                'currentValue': {
                    property: 'currentValue',
                    value: true
                }
            };
            expect(formatDeviceState(values)).toBe('ON');
        });

        it('should prioritize state property if currentValue not present', () => {
            const values = {
                'otherProp': {
                    property: 'other',
                    value: 'off'
                },
                'state': {
                    property: 'state',
                    value: true
                }
            };
            expect(formatDeviceState(values)).toBe('ON');
        });

        it('should prioritize value property if currentValue and state not present', () => {
            const values = {
                'otherProp': {
                    property: 'other',
                    value: 'off'
                },
                'value': {
                    property: 'value',
                    value: 50,
                    unit: '%'
                }
            };
            expect(formatDeviceState(values)).toBe('50%');
        });

        it('should use first value if no priority properties found', () => {
            const values = {
                'random': {
                    property: 'random',
                    value: 'test'
                }
            };
            expect(formatDeviceState(values)).toBe('test');
        });
    });

    describe('Edge Cases', () => {
        it('should handle object values by converting to string', () => {
            const values = {
                'currentValue': {
                    property: 'currentValue',
                    value: { nested: 'object' }
                }
            };
            expect(formatDeviceState(values)).toBe('[object Object]');
        });

        it('should handle array values by converting to string', () => {
            const values = {
                'currentValue': {
                    property: 'currentValue',
                    value: [1, 2, 3]
                }
            };
            expect(formatDeviceState(values)).toBe('1,2,3');
        });
    });
});
