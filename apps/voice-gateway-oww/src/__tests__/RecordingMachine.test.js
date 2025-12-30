import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createRecordingMachine, setupRecordingMachine, isRecording } from '../state-machines/RecordingMachine.js';

describe('RecordingMachine', () => {
    let service;

    beforeEach(() => {
        // Setup fresh service for each test
        service = setupRecordingMachine();
    });

    afterEach(() => {
        if (service) {
            service.stop();
        }
    });

    describe('State Transitions', () => {
        it('should start in idle state', () => {
            const snapshot = service.getSnapshot();
            expect(snapshot.value).toBe('idle');
        });

        it('should transition from idle to recording on START_RECORDING', () => {
            service.send({ type: 'START_RECORDING' });

            const snapshot = service.getSnapshot();
            expect(snapshot.value).toBe('recording');
        });

        it('should transition from recording to processing on SILENCE_DETECTED', () => {
            service.send({ type: 'START_RECORDING' });
            service.send({ type: 'SILENCE_DETECTED' });

            const snapshot = service.getSnapshot();
            expect(snapshot.value).toBe('processing');
        });

        it('should transition from recording to processing on MAX_LENGTH_REACHED', () => {
            service.send({ type: 'START_RECORDING' });
            service.send({ type: 'MAX_LENGTH_REACHED' });

            const snapshot = service.getSnapshot();
            expect(snapshot.value).toBe('processing');
        });

        it('should transition from processing to idle on RECORDING_COMPLETE', () => {
            service.send({ type: 'START_RECORDING' });
            service.send({ type: 'SILENCE_DETECTED' });
            service.send({ type: 'RECORDING_COMPLETE' });

            const snapshot = service.getSnapshot();
            expect(snapshot.value).toBe('idle');
        });
    });

    describe('Context Management', () => {
        it('should initialize context on START_RECORDING', () => {
            const beforeStart = Date.now();
            service.send({ type: 'START_RECORDING' });
            const afterStart = Date.now();

            const snapshot = service.getSnapshot();
            expect(snapshot.context.startedAt).toBeGreaterThanOrEqual(beforeStart);
            expect(snapshot.context.startedAt).toBeLessThanOrEqual(afterStart);
            expect(snapshot.context.audioBuffer).toEqual([]);
            expect(snapshot.context.hasSpoken).toBe(false);
        });

        it('should clear buffer on RECORDING_COMPLETE', () => {
            service.send({ type: 'START_RECORDING' });
            service.send({ type: 'SILENCE_DETECTED' });
            service.send({ type: 'RECORDING_COMPLETE' });

            const snapshot = service.getSnapshot();
            expect(snapshot.context.audioBuffer).toEqual([]);
            expect(snapshot.context.hasSpoken).toBe(false);
        });

        it('should preserve startedAt timestamp during recording', () => {
            service.send({ type: 'START_RECORDING' });
            const snapshot1 = service.getSnapshot();
            const initialTimestamp = snapshot1.context.startedAt;

            // Wait a bit
            const waitPromise = new Promise(resolve => setTimeout(resolve, 10));
            return waitPromise.then(() => {
                const snapshot2 = service.getSnapshot();
                expect(snapshot2.context.startedAt).toBe(initialTimestamp);
            });
        });
    });

    describe('State Machine Creation', () => {
        it('should create a valid XState machine', () => {
            const machine = createRecordingMachine();

            expect(machine).toBeDefined();
            expect(machine.id).toBe('recording');
            expect(machine.config.initial).toBe('idle');
        });

        it('should have all required states', () => {
            const machine = createRecordingMachine();
            const stateKeys = Object.keys(machine.states);

            expect(stateKeys).toContain('idle');
            expect(stateKeys).toContain('recording');
            expect(stateKeys).toContain('processing');
        });
    });

    describe('Helper Functions', () => {
        it('isRecording should return true when recording', () => {
            service.send({ type: 'START_RECORDING' });
            expect(isRecording(service)).toBe(true);
        });

        it('isRecording should return false when idle', () => {
            expect(isRecording(service)).toBe(false);
        });

        it('isRecording should return false when processing', () => {
            service.send({ type: 'START_RECORDING' });
            service.send({ type: 'SILENCE_DETECTED' });
            expect(isRecording(service)).toBe(false);
        });
    });

    describe('Event Handling', () => {
        it('should ignore invalid events in idle state', () => {
            service.send({ type: 'SILENCE_DETECTED' }); // Invalid in idle state

            const snapshot = service.getSnapshot();
            expect(snapshot.value).toBe('idle'); // Should remain in idle state
        });

        it('should ignore START_RECORDING in recording state', () => {
            service.send({ type: 'START_RECORDING' });
            const snapshot1 = service.getSnapshot();
            const firstTimestamp = snapshot1.context.startedAt;

            service.send({ type: 'START_RECORDING' }); // Should be ignored

            const snapshot2 = service.getSnapshot();
            expect(snapshot2.value).toBe('recording');
            expect(snapshot2.context.startedAt).toBe(firstTimestamp); // Unchanged
        });

        it('should ignore RECORDING_COMPLETE in recording state', () => {
            service.send({ type: 'START_RECORDING' });
            service.send({ type: 'RECORDING_COMPLETE' }); // Invalid in recording state

            const snapshot = service.getSnapshot();
            expect(snapshot.value).toBe('recording'); // Should remain in recording
        });

        it('should handle multiple recording cycles', () => {
            // First recording
            service.send({ type: 'START_RECORDING' });
            expect(service.getSnapshot().value).toBe('recording');

            service.send({ type: 'SILENCE_DETECTED' });
            expect(service.getSnapshot().value).toBe('processing');

            service.send({ type: 'RECORDING_COMPLETE' });
            expect(service.getSnapshot().value).toBe('idle');

            // Second recording
            service.send({ type: 'START_RECORDING' });
            expect(service.getSnapshot().value).toBe('recording');

            service.send({ type: 'MAX_LENGTH_REACHED' });
            expect(service.getSnapshot().value).toBe('processing');
        });
    });

    describe('Integration Scenarios', () => {
        it('should handle complete recording lifecycle with silence detection', () => {
            // Start recording
            expect(service.getSnapshot().value).toBe('idle');

            service.send({ type: 'START_RECORDING' });
            expect(service.getSnapshot().value).toBe('recording');

            service.send({ type: 'SILENCE_DETECTED' });
            expect(service.getSnapshot().value).toBe('processing');

            service.send({ type: 'RECORDING_COMPLETE' });
            expect(service.getSnapshot().value).toBe('idle');
        });

        it('should handle complete recording lifecycle with max length', () => {
            // Start recording
            expect(service.getSnapshot().value).toBe('idle');

            service.send({ type: 'START_RECORDING' });
            expect(service.getSnapshot().value).toBe('recording');

            service.send({ type: 'MAX_LENGTH_REACHED' });
            expect(service.getSnapshot().value).toBe('processing');

            service.send({ type: 'RECORDING_COMPLETE' });
            expect(service.getSnapshot().value).toBe('idle');
        });

        it('should handle rapid recording sessions', () => {
            // First session
            service.send({ type: 'START_RECORDING' });
            service.send({ type: 'SILENCE_DETECTED' });
            service.send({ type: 'RECORDING_COMPLETE' });

            // Second session immediately after
            service.send({ type: 'START_RECORDING' });
            expect(service.getSnapshot().value).toBe('recording');
            expect(service.getSnapshot().context.audioBuffer).toEqual([]);
            expect(service.getSnapshot().context.hasSpoken).toBe(false);
        });

        it('should track recording duration', () => {
            const beforeRecording = Date.now();
            service.send({ type: 'START_RECORDING' });
            const afterRecording = Date.now();

            const snapshot = service.getSnapshot();
            const recordingDuration = Date.now() - snapshot.context.startedAt;

            expect(recordingDuration).toBeGreaterThanOrEqual(0);
            expect(recordingDuration).toBeLessThan(100); // Should be immediate
        });

        it('should handle both silence and max length termination conditions', () => {
            // Test silence detection
            service.send({ type: 'START_RECORDING' });
            service.send({ type: 'SILENCE_DETECTED' });
            expect(service.getSnapshot().value).toBe('processing');
            service.send({ type: 'RECORDING_COMPLETE' });

            // Test max length
            service.send({ type: 'START_RECORDING' });
            service.send({ type: 'MAX_LENGTH_REACHED' });
            expect(service.getSnapshot().value).toBe('processing');
            service.send({ type: 'RECORDING_COMPLETE' });

            expect(service.getSnapshot().value).toBe('idle');
        });
    });

    describe('State Invariants', () => {
        it('should always have empty buffer when entering recording state', () => {
            service.send({ type: 'START_RECORDING' });
            expect(service.getSnapshot().context.audioBuffer).toEqual([]);

            service.send({ type: 'SILENCE_DETECTED' });
            service.send({ type: 'RECORDING_COMPLETE' });

            service.send({ type: 'START_RECORDING' });
            expect(service.getSnapshot().context.audioBuffer).toEqual([]);
        });

        it('should always reset hasSpoken flag when starting new recording', () => {
            service.send({ type: 'START_RECORDING' });
            expect(service.getSnapshot().context.hasSpoken).toBe(false);

            service.send({ type: 'SILENCE_DETECTED' });
            service.send({ type: 'RECORDING_COMPLETE' });

            service.send({ type: 'START_RECORDING' });
            expect(service.getSnapshot().context.hasSpoken).toBe(false);
        });
    });
});
