/**
 * IntentClassifier.test.js - Tests for intent classification patterns
 *
 * Tests include:
 * - DateTime query patterns (enhanced for day-of-week detection)
 * - Device query patterns
 * - Device control patterns
 * - Edge cases and input validation
 */

import { IntentClassifier } from '../services/IntentClassifier.js';

describe('IntentClassifier', () => {
    let classifier;

    beforeEach(() => {
        classifier = new IntentClassifier();
    });

    describe('DateTime Query Detection', () => {
        describe('Original patterns', () => {
            it('should detect "what time is it"', () => {
                const result = classifier.classify('what time is it');
                expect(result.isDateTimeQuery).toBe(true);
            });

            it('should detect "what date is it"', () => {
                const result = classifier.classify('what date is it');
                expect(result.isDateTimeQuery).toBe(true);
            });

            it('should detect "what day is it"', () => {
                const result = classifier.classify('what day is it');
                expect(result.isDateTimeQuery).toBe(true);
            });

            it('should detect "what day is today"', () => {
                const result = classifier.classify('what day is today');
                expect(result.isDateTimeQuery).toBe(true);
            });

            it('should detect "current time"', () => {
                const result = classifier.classify('current time');
                expect(result.isDateTimeQuery).toBe(true);
            });

            it('should detect "current date"', () => {
                const result = classifier.classify('current date');
                expect(result.isDateTimeQuery).toBe(true);
            });
        });

        describe('Enhanced patterns for day-of-week queries', () => {
            it('should detect "what day of the week is it"', () => {
                const result = classifier.classify('what day of the week is it');
                expect(result.isDateTimeQuery).toBe(true);
            });

            it('should detect "day of the week"', () => {
                const result = classifier.classify('day of the week');
                expect(result.isDateTimeQuery).toBe(true);
            });

            it('should detect "which day is it"', () => {
                const result = classifier.classify('which day is it');
                expect(result.isDateTimeQuery).toBe(true);
            });

            it('should detect "which day of the week"', () => {
                const result = classifier.classify('which day of the week');
                expect(result.isDateTimeQuery).toBe(true);
            });
        });

        describe('Enhanced patterns for "what\'s today" variations', () => {
            it('should detect "what\'s today"', () => {
                const result = classifier.classify("what's today");
                expect(result.isDateTimeQuery).toBe(true);
            });

            it('should detect "whats today" (no apostrophe)', () => {
                const result = classifier.classify('whats today');
                expect(result.isDateTimeQuery).toBe(true);
            });

            it('should detect "today\'s date"', () => {
                const result = classifier.classify("today's date");
                expect(result.isDateTimeQuery).toBe(true);
            });

            it('should detect "todays date" (no apostrophe)', () => {
                const result = classifier.classify('todays date');
                expect(result.isDateTimeQuery).toBe(true);
            });

            it('should detect "today\'s day"', () => {
                const result = classifier.classify("today's day");
                expect(result.isDateTimeQuery).toBe(true);
            });
        });

        describe('Enhanced patterns for general date/time inquiries', () => {
            it('should detect "what\'s the date"', () => {
                const result = classifier.classify("what's the date");
                expect(result.isDateTimeQuery).toBe(true);
            });

            it('should detect "what\'s the time"', () => {
                const result = classifier.classify("what's the time");
                expect(result.isDateTimeQuery).toBe(true);
            });

            it('should detect "what\'s the day"', () => {
                const result = classifier.classify("what's the day");
                expect(result.isDateTimeQuery).toBe(true);
            });

            it('should detect "tell me the date"', () => {
                const result = classifier.classify('tell me the date');
                expect(result.isDateTimeQuery).toBe(true);
            });

            it('should detect "tell me the time"', () => {
                const result = classifier.classify('tell me the time');
                expect(result.isDateTimeQuery).toBe(true);
            });

            it('should detect "tell me the day"', () => {
                const result = classifier.classify('tell me the day');
                expect(result.isDateTimeQuery).toBe(true);
            });
        });

        describe('Case insensitivity', () => {
            it('should detect uppercase queries', () => {
                const result = classifier.classify('WHAT DAY OF THE WEEK IS IT');
                expect(result.isDateTimeQuery).toBe(true);
            });

            it('should detect mixed case queries', () => {
                const result = classifier.classify('What Day Of The Week Is It');
                expect(result.isDateTimeQuery).toBe(true);
            });
        });

        describe('Should NOT detect non-datetime queries', () => {
            it('should not detect device queries as datetime', () => {
                const result = classifier.classify('show me the devices');
                expect(result.isDateTimeQuery).toBe(false);
            });

            it('should not detect device control as datetime', () => {
                const result = classifier.classify('turn on the light');
                expect(result.isDateTimeQuery).toBe(false);
            });

            it('should not detect unrelated queries as datetime', () => {
                const result = classifier.classify('what is the weather');
                expect(result.isDateTimeQuery).toBe(false);
            });
        });
    });

    describe('Device Query Detection', () => {
        it('should detect "list devices"', () => {
            const result = classifier.classify('list devices');
            expect(result.isDeviceQuery).toBe(true);
        });

        it('should detect "show lights"', () => {
            const result = classifier.classify('show lights');
            expect(result.isDeviceQuery).toBe(true);
        });

        it('should detect "what do i have"', () => {
            const result = classifier.classify('what do i have');
            expect(result.isDeviceQuery).toBe(true);
        });

        it('should detect word "devices" alone', () => {
            const result = classifier.classify('devices');
            expect(result.isDeviceQuery).toBe(true);
        });
    });

    describe('Device Control Query Detection', () => {
        it('should detect "turn on"', () => {
            const result = classifier.classify('turn on the light');
            expect(result.isDeviceControlQuery).toBe(true);
        });

        it('should detect "turn off"', () => {
            const result = classifier.classify('turn off the bedroom lamp');
            expect(result.isDeviceControlQuery).toBe(true);
        });

        it('should detect "dim"', () => {
            const result = classifier.classify('dim the light');
            expect(result.isDeviceControlQuery).toBe(true);
        });

        it('should detect "brighten"', () => {
            const result = classifier.classify('brighten the light');
            expect(result.isDeviceControlQuery).toBe(true);
        });

        it('should detect "set to" with number', () => {
            const result = classifier.classify('set the bedroom light to 50');
            expect(result.isDeviceControlQuery).toBe(true);
        });
    });

    describe('Edge Cases', () => {
        it('should handle null input', () => {
            const result = classifier.classify(null);
            expect(result.isDateTimeQuery).toBe(false);
            expect(result.isDeviceQuery).toBe(false);
            expect(result.isDeviceControlQuery).toBe(false);
        });

        it('should handle undefined input', () => {
            const result = classifier.classify(undefined);
            expect(result.isDateTimeQuery).toBe(false);
            expect(result.isDeviceQuery).toBe(false);
            expect(result.isDeviceControlQuery).toBe(false);
        });

        it('should handle empty string', () => {
            const result = classifier.classify('');
            expect(result.isDateTimeQuery).toBe(false);
            expect(result.isDeviceQuery).toBe(false);
            expect(result.isDeviceControlQuery).toBe(false);
        });

        it('should handle non-string input', () => {
            const result = classifier.classify(123);
            expect(result.isDateTimeQuery).toBe(false);
            expect(result.isDeviceQuery).toBe(false);
            expect(result.isDeviceControlQuery).toBe(false);
        });

        it('should handle whitespace-only input', () => {
            const result = classifier.classify('   ');
            expect(result.isDateTimeQuery).toBe(false);
            expect(result.isDeviceQuery).toBe(false);
            expect(result.isDeviceControlQuery).toBe(false);
        });
    });

    describe('Multiple Intent Detection', () => {
        it('should detect multiple intents in same query', () => {
            // Query that could match both datetime and device patterns
            const result = classifier.classify('what time is it and show me devices');
            expect(result.isDateTimeQuery).toBe(true);
            expect(result.isDeviceQuery).toBe(true);
        });
    });

    describe('Individual Pattern Methods', () => {
        it('isDateTimeQuery method should work', () => {
            expect(classifier.isDateTimeQuery('what day of the week is it')).toBe(true);
            expect(classifier.isDateTimeQuery('turn on the light')).toBe(false);
        });

        it('isDeviceQuery method should work', () => {
            expect(classifier.isDeviceQuery('list devices')).toBe(true);
            expect(classifier.isDeviceQuery('what time is it')).toBe(false);
        });

        it('isDeviceControlQuery method should work', () => {
            expect(classifier.isDeviceControlQuery('turn on the light')).toBe(true);
            expect(classifier.isDeviceControlQuery('what time is it')).toBe(false);
        });
    });
});
