import { describe, it, expect, beforeEach } from '@jest/globals';
import { createWakeWordMachine, setupWakeWordMachine } from '../state-machines/WakeWordMachine.js';

describe('WakeWordMachine', () => {
    let machine;
    let service;

    beforeEach(() => {
        // Setup fresh service for each test
        service = setupWakeWordMachine();
    });

    afterEach(() => {
        if (service) {
            service.stop();
        }
    });

    describe('State Transitions', () => {
        it('should start in off state', () => {
            const snapshot = service.getSnapshot();
            expect(snapshot.value).toBe('off');
        });

        it('should transition from off to warming-up on DETECTOR_INITIALIZED', () => {
            const mockDetector = { name: 'MockDetector' };

            service.send({ type: 'DETECTOR_INITIALIZED', detector: mockDetector });

            const snapshot = service.getSnapshot();
            expect(snapshot.value).toBe('warming-up');
            expect(snapshot.context.detector).toBe(mockDetector);
        });

        it('should transition from warming-up to ready on WARMUP_COMPLETE', () => {
            const mockDetector = { name: 'MockDetector' };

            service.send({ type: 'DETECTOR_INITIALIZED', detector: mockDetector });
            service.send({ type: 'WARMUP_COMPLETE' });

            const snapshot = service.getSnapshot();
            expect(snapshot.value).toBe('ready');
        });

        it('should transition from ready to triggered on WAKE_WORD_DETECTED', () => {
            const mockDetector = { name: 'MockDetector' };

            // Get to ready state
            service.send({ type: 'DETECTOR_INITIALIZED', detector: mockDetector });
            service.send({ type: 'WARMUP_COMPLETE' });

            // Trigger wake word
            service.send({ type: 'WAKE_WORD_DETECTED', score: 0.95 });

            const snapshot = service.getSnapshot();
            expect(snapshot.value).toBe('triggered');
            expect(snapshot.context.lastTriggerScore).toBe(0.95);
        });

        it('should transition from triggered to ready on TRIGGER_PROCESSED', () => {
            const mockDetector = { name: 'MockDetector' };

            // Get to triggered state
            service.send({ type: 'DETECTOR_INITIALIZED', detector: mockDetector });
            service.send({ type: 'WARMUP_COMPLETE' });
            service.send({ type: 'WAKE_WORD_DETECTED', score: 0.95 });

            // Process trigger
            service.send({ type: 'TRIGGER_PROCESSED' });

            const snapshot = service.getSnapshot();
            expect(snapshot.value).toBe('ready');
        });

        it('should transition from ready to warming-up on RESET_DETECTOR', () => {
            const mockDetector = { name: 'MockDetector' };

            // Get to ready state
            service.send({ type: 'DETECTOR_INITIALIZED', detector: mockDetector });
            service.send({ type: 'WARMUP_COMPLETE' });

            // Reset detector
            service.send({ type: 'RESET_DETECTOR' });

            const snapshot = service.getSnapshot();
            expect(snapshot.value).toBe('warming-up');
        });
    });

    describe('Context Management', () => {
        it('should store detector in context on DETECTOR_INITIALIZED', () => {
            const mockDetector = { name: 'MockDetector', id: '123' };

            service.send({ type: 'DETECTOR_INITIALIZED', detector: mockDetector });

            const snapshot = service.getSnapshot();
            expect(snapshot.context.detector).toBe(mockDetector);
            expect(snapshot.context.detector.id).toBe('123');
        });

        it('should record trigger score and time on WAKE_WORD_DETECTED', () => {
            const mockDetector = { name: 'MockDetector' };
            const beforeTrigger = Date.now();

            // Get to ready state
            service.send({ type: 'DETECTOR_INITIALIZED', detector: mockDetector });
            service.send({ type: 'WARMUP_COMPLETE' });

            // Trigger wake word
            service.send({ type: 'WAKE_WORD_DETECTED', score: 0.87 });

            const afterTrigger = Date.now();
            const snapshot = service.getSnapshot();

            expect(snapshot.context.lastTriggerScore).toBe(0.87);
            expect(snapshot.context.lastTriggerTime).toBeGreaterThanOrEqual(beforeTrigger);
            expect(snapshot.context.lastTriggerTime).toBeLessThanOrEqual(afterTrigger);
        });

        it('should record warmup start time', () => {
            const mockDetector = { name: 'MockDetector' };
            const beforeInit = Date.now();

            service.send({ type: 'DETECTOR_INITIALIZED', detector: mockDetector });

            const afterInit = Date.now();
            const snapshot = service.getSnapshot();

            expect(snapshot.context.warmupStartTime).toBeGreaterThanOrEqual(beforeInit);
            expect(snapshot.context.warmupStartTime).toBeLessThanOrEqual(afterInit);
        });
    });

    describe('State Machine Creation', () => {
        it('should create a valid XState machine', () => {
            const machine = createWakeWordMachine();

            expect(machine).toBeDefined();
            expect(machine.id).toBe('wakeWord');
            expect(machine.config.initial).toBe('off');
        });

        it('should have all required states', () => {
            const machine = createWakeWordMachine();
            const stateKeys = Object.keys(machine.states);

            expect(stateKeys).toContain('off');
            expect(stateKeys).toContain('warming-up');
            expect(stateKeys).toContain('ready');
            expect(stateKeys).toContain('triggered');
        });
    });

    describe('Event Handling', () => {
        it('should ignore invalid events in off state', () => {
            service.send({ type: 'WARMUP_COMPLETE' }); // Invalid in off state

            const snapshot = service.getSnapshot();
            expect(snapshot.value).toBe('off'); // Should remain in off state
        });

        it('should ignore WAKE_WORD_DETECTED in warming-up state', () => {
            const mockDetector = { name: 'MockDetector' };

            service.send({ type: 'DETECTOR_INITIALIZED', detector: mockDetector });
            service.send({ type: 'WAKE_WORD_DETECTED', score: 0.95 }); // Invalid in warming-up

            const snapshot = service.getSnapshot();
            expect(snapshot.value).toBe('warming-up'); // Should remain in warming-up
        });

        it('should handle multiple wake word triggers after returning to ready', () => {
            const mockDetector = { name: 'MockDetector' };

            // Get to ready state
            service.send({ type: 'DETECTOR_INITIALIZED', detector: mockDetector });
            service.send({ type: 'WARMUP_COMPLETE' });

            // First trigger
            service.send({ type: 'WAKE_WORD_DETECTED', score: 0.85 });
            expect(service.getSnapshot().value).toBe('triggered');
            expect(service.getSnapshot().context.lastTriggerScore).toBe(0.85);

            service.send({ type: 'TRIGGER_PROCESSED' });
            expect(service.getSnapshot().value).toBe('ready');

            // Second trigger
            service.send({ type: 'WAKE_WORD_DETECTED', score: 0.92 });
            expect(service.getSnapshot().value).toBe('triggered');
            expect(service.getSnapshot().context.lastTriggerScore).toBe(0.92);
        });
    });

    describe('Integration Scenarios', () => {
        it('should handle complete startup sequence', () => {
            const mockDetector = { name: 'MockDetector' };

            // Simulate startup
            expect(service.getSnapshot().value).toBe('off');

            service.send({ type: 'DETECTOR_INITIALIZED', detector: mockDetector });
            expect(service.getSnapshot().value).toBe('warming-up');

            service.send({ type: 'WARMUP_COMPLETE' });
            expect(service.getSnapshot().value).toBe('ready');
        });

        it('should handle wake word detection cycle', () => {
            const mockDetector = { name: 'MockDetector' };

            // Startup
            service.send({ type: 'DETECTOR_INITIALIZED', detector: mockDetector });
            service.send({ type: 'WARMUP_COMPLETE' });

            // Wake word cycle
            service.send({ type: 'WAKE_WORD_DETECTED', score: 0.88 });
            expect(service.getSnapshot().value).toBe('triggered');

            service.send({ type: 'TRIGGER_PROCESSED' });
            expect(service.getSnapshot().value).toBe('ready');
        });

        it('should handle detector reset cycle', () => {
            const mockDetector = { name: 'MockDetector' };

            // Get to ready state
            service.send({ type: 'DETECTOR_INITIALIZED', detector: mockDetector });
            service.send({ type: 'WARMUP_COMPLETE' });
            expect(service.getSnapshot().value).toBe('ready');

            // Reset detector
            service.send({ type: 'RESET_DETECTOR' });
            expect(service.getSnapshot().value).toBe('warming-up');

            // Return to ready
            service.send({ type: 'WARMUP_COMPLETE' });
            expect(service.getSnapshot().value).toBe('ready');
        });
    });
});
