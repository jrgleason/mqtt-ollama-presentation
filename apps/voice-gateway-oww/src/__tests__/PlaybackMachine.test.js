import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { createPlaybackMachine, setupPlaybackMachine, isPlaybackActive, isPlaying } from '../state-machines/PlaybackMachine.js';

describe('PlaybackMachine', () => {
    let service;

    beforeEach(() => {
        // Setup fresh service for each test
        service = setupPlaybackMachine();
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

        it('should transition from idle to playing on START_PLAYBACK', () => {
            const mockPlayback = {
                cancel: jest.fn(),
                promise: Promise.resolve()
            };

            service.send({
                type: 'START_PLAYBACK',
                playback: mockPlayback,
                playbackType: 'tts'
            });

            const snapshot = service.getSnapshot();
            expect(snapshot.value).toBe('playing');
            expect(snapshot.context.activePlayback).toBe(mockPlayback);
            expect(snapshot.context.playbackType).toBe('tts');
        });

        it('should transition from playing to cooldown on PLAYBACK_COMPLETE', () => {
            const mockPlayback = {
                cancel: jest.fn(),
                promise: Promise.resolve()
            };

            service.send({
                type: 'START_PLAYBACK',
                playback: mockPlayback,
                playbackType: 'tts'
            });
            service.send({ type: 'PLAYBACK_COMPLETE' });

            const snapshot = service.getSnapshot();
            expect(snapshot.value).toBe('cooldown');
            expect(snapshot.context.activePlayback).toBeNull();
        });

        it('should transition from playing to interrupted on INTERRUPT', () => {
            const mockPlayback = {
                cancel: jest.fn(),
                promise: Promise.resolve()
            };

            service.send({
                type: 'START_PLAYBACK',
                playback: mockPlayback,
                playbackType: 'tts'
            });
            service.send({ type: 'INTERRUPT' });

            const snapshot = service.getSnapshot();
            expect(snapshot.value).toBe('interrupted');
            expect(mockPlayback.cancel).toHaveBeenCalled();
        });

        it('should transition from interrupted to idle on INTERRUPT_HANDLED', () => {
            const mockPlayback = {
                cancel: jest.fn(),
                promise: Promise.resolve()
            };

            service.send({
                type: 'START_PLAYBACK',
                playback: mockPlayback,
                playbackType: 'tts'
            });
            service.send({ type: 'INTERRUPT' });
            service.send({ type: 'INTERRUPT_HANDLED' });

            const snapshot = service.getSnapshot();
            expect(snapshot.value).toBe('idle');
        });

        it('should transition from cooldown to idle after timeout', (done) => {
            const mockPlayback = {
                cancel: jest.fn(),
                promise: Promise.resolve()
            };

            service.send({
                type: 'START_PLAYBACK',
                playback: mockPlayback,
                playbackType: 'tts'
            });
            service.send({ type: 'PLAYBACK_COMPLETE' });

            expect(service.getSnapshot().value).toBe('cooldown');

            // Wait for cooldown timeout (1500ms default)
            setTimeout(() => {
                const snapshot = service.getSnapshot();
                expect(snapshot.value).toBe('idle');
                done();
            }, 1600);
        }, 2000);

        it('should allow interruption during cooldown', () => {
            const mockPlayback = {
                cancel: jest.fn(),
                promise: Promise.resolve()
            };

            service.send({
                type: 'START_PLAYBACK',
                playback: mockPlayback,
                playbackType: 'tts'
            });
            service.send({ type: 'PLAYBACK_COMPLETE' });

            expect(service.getSnapshot().value).toBe('cooldown');

            service.send({ type: 'INTERRUPT' });

            const snapshot = service.getSnapshot();
            expect(snapshot.value).toBe('idle');
        });
    });

    describe('Context Management', () => {
        it('should store playback handle in context', () => {
            const mockPlayback = {
                cancel: jest.fn(),
                promise: Promise.resolve()
            };

            service.send({
                type: 'START_PLAYBACK',
                playback: mockPlayback,
                playbackType: 'beep'
            });

            const snapshot = service.getSnapshot();
            expect(snapshot.context.activePlayback).toBe(mockPlayback);
            expect(snapshot.context.playbackType).toBe('beep');
        });

        it('should clear playback handle on PLAYBACK_COMPLETE', () => {
            const mockPlayback = {
                cancel: jest.fn(),
                promise: Promise.resolve()
            };

            service.send({
                type: 'START_PLAYBACK',
                playback: mockPlayback,
                playbackType: 'tts'
            });
            service.send({ type: 'PLAYBACK_COMPLETE' });

            const snapshot = service.getSnapshot();
            expect(snapshot.context.activePlayback).toBeNull();
            expect(snapshot.context.playbackType).toBeNull();
        });

        it('should clear playback handle on INTERRUPT', () => {
            const mockPlayback = {
                cancel: jest.fn(),
                promise: Promise.resolve()
            };

            service.send({
                type: 'START_PLAYBACK',
                playback: mockPlayback,
                playbackType: 'tts'
            });
            service.send({ type: 'INTERRUPT' });

            const snapshot = service.getSnapshot();
            expect(snapshot.context.activePlayback).toBeNull();
            expect(snapshot.context.playbackType).toBeNull();
        });
    });

    describe('Interruption Handling', () => {
        it('should call cancel() on playback when interrupted', () => {
            const mockPlayback = {
                cancel: jest.fn(),
                promise: Promise.resolve()
            };

            service.send({
                type: 'START_PLAYBACK',
                playback: mockPlayback,
                playbackType: 'tts'
            });
            service.send({ type: 'INTERRUPT' });

            expect(mockPlayback.cancel).toHaveBeenCalledTimes(1);
        });

        it('should handle missing cancel() method gracefully', () => {
            const mockPlayback = {
                promise: Promise.resolve()
                // No cancel method
            };

            service.send({
                type: 'START_PLAYBACK',
                playback: mockPlayback,
                playbackType: 'tts'
            });

            // Should not throw
            expect(() => {
                service.send({ type: 'INTERRUPT' });
            }).not.toThrow();

            const snapshot = service.getSnapshot();
            expect(snapshot.value).toBe('interrupted');
        });

        it('should handle cancel() throwing error', () => {
            const mockPlayback = {
                cancel: jest.fn(() => { throw new Error('Cancel failed'); }),
                promise: Promise.resolve()
            };

            service.send({
                type: 'START_PLAYBACK',
                playback: mockPlayback,
                playbackType: 'tts'
            });

            // Should not throw - error is caught internally
            expect(() => {
                service.send({ type: 'INTERRUPT' });
            }).not.toThrow();

            const snapshot = service.getSnapshot();
            expect(snapshot.value).toBe('interrupted');
        });
    });

    describe('State Machine Creation', () => {
        it('should create a valid XState machine', () => {
            const machine = createPlaybackMachine();

            expect(machine).toBeDefined();
            expect(machine.id).toBe('playback');
            expect(machine.config.initial).toBe('idle');
        });

        it('should have all required states', () => {
            const machine = createPlaybackMachine();
            const stateKeys = Object.keys(machine.states);

            expect(stateKeys).toContain('idle');
            expect(stateKeys).toContain('playing');
            expect(stateKeys).toContain('cooldown');
            expect(stateKeys).toContain('interrupted');
        });
    });

    describe('Helper Functions', () => {
        it('isPlaybackActive should return true when playing', () => {
            const mockPlayback = {
                cancel: jest.fn(),
                promise: Promise.resolve()
            };

            service.send({
                type: 'START_PLAYBACK',
                playback: mockPlayback,
                playbackType: 'tts'
            });

            expect(isPlaybackActive(service)).toBe(true);
        });

        it('isPlaybackActive should return true when in cooldown', () => {
            const mockPlayback = {
                cancel: jest.fn(),
                promise: Promise.resolve()
            };

            service.send({
                type: 'START_PLAYBACK',
                playback: mockPlayback,
                playbackType: 'tts'
            });
            service.send({ type: 'PLAYBACK_COMPLETE' });

            expect(isPlaybackActive(service)).toBe(true);
        });

        it('isPlaybackActive should return false when idle', () => {
            expect(isPlaybackActive(service)).toBe(false);
        });

        it('isPlaying should return true only when actively playing', () => {
            const mockPlayback = {
                cancel: jest.fn(),
                promise: Promise.resolve()
            };

            // Initially idle
            expect(isPlaying(service)).toBe(false);

            // Start playing
            service.send({
                type: 'START_PLAYBACK',
                playback: mockPlayback,
                playbackType: 'tts'
            });
            expect(isPlaying(service)).toBe(true);

            // Transition to cooldown
            service.send({ type: 'PLAYBACK_COMPLETE' });
            expect(isPlaying(service)).toBe(false);
        });
    });

    describe('Event Handling', () => {
        it('should ignore invalid events in idle state', () => {
            service.send({ type: 'PLAYBACK_COMPLETE' }); // Invalid in idle state

            const snapshot = service.getSnapshot();
            expect(snapshot.value).toBe('idle'); // Should remain in idle state
        });

        it('should ignore START_PLAYBACK in playing state', () => {
            const mockPlayback1 = {
                cancel: jest.fn(),
                promise: Promise.resolve()
            };
            const mockPlayback2 = {
                cancel: jest.fn(),
                promise: Promise.resolve()
            };

            service.send({
                type: 'START_PLAYBACK',
                playback: mockPlayback1,
                playbackType: 'tts'
            });

            service.send({
                type: 'START_PLAYBACK',
                playback: mockPlayback2,
                playbackType: 'beep'
            });

            const snapshot = service.getSnapshot();
            expect(snapshot.value).toBe('playing');
            // Should keep first playback
            expect(snapshot.context.activePlayback).toBe(mockPlayback1);
        });

        it('should handle multiple playback cycles', () => {
            const mockPlayback1 = {
                cancel: jest.fn(),
                promise: Promise.resolve()
            };
            const mockPlayback2 = {
                cancel: jest.fn(),
                promise: Promise.resolve()
            };

            // First playback
            service.send({
                type: 'START_PLAYBACK',
                playback: mockPlayback1,
                playbackType: 'tts'
            });
            expect(service.getSnapshot().value).toBe('playing');

            service.send({ type: 'PLAYBACK_COMPLETE' });
            expect(service.getSnapshot().value).toBe('cooldown');

            service.send({ type: 'INTERRUPT' }); // Skip cooldown
            expect(service.getSnapshot().value).toBe('idle');

            // Second playback
            service.send({
                type: 'START_PLAYBACK',
                playback: mockPlayback2,
                playbackType: 'beep'
            });
            expect(service.getSnapshot().value).toBe('playing');
            expect(service.getSnapshot().context.activePlayback).toBe(mockPlayback2);
        });
    });

    describe('Integration Scenarios', () => {
        it('should handle complete playback lifecycle', () => {
            const mockPlayback = {
                cancel: jest.fn(),
                promise: Promise.resolve()
            };

            // Start playing
            expect(service.getSnapshot().value).toBe('idle');

            service.send({
                type: 'START_PLAYBACK',
                playback: mockPlayback,
                playbackType: 'tts'
            });
            expect(service.getSnapshot().value).toBe('playing');

            service.send({ type: 'PLAYBACK_COMPLETE' });
            expect(service.getSnapshot().value).toBe('cooldown');
        });

        it('should handle interruption during playback', () => {
            const mockPlayback = {
                cancel: jest.fn(),
                promise: Promise.resolve()
            };

            service.send({
                type: 'START_PLAYBACK',
                playback: mockPlayback,
                playbackType: 'tts'
            });
            expect(service.getSnapshot().value).toBe('playing');

            service.send({ type: 'INTERRUPT' });
            expect(service.getSnapshot().value).toBe('interrupted');
            expect(mockPlayback.cancel).toHaveBeenCalled();

            service.send({ type: 'INTERRUPT_HANDLED' });
            expect(service.getSnapshot().value).toBe('idle');
        });

        it('should handle TTS and beep playback types', () => {
            const ttsPlayback = {
                cancel: jest.fn(),
                promise: Promise.resolve()
            };
            const beepPlayback = {
                cancel: jest.fn(),
                promise: Promise.resolve()
            };

            // TTS playback
            service.send({
                type: 'START_PLAYBACK',
                playback: ttsPlayback,
                playbackType: 'tts'
            });
            expect(service.getSnapshot().context.playbackType).toBe('tts');

            service.send({ type: 'PLAYBACK_COMPLETE' });
            service.send({ type: 'INTERRUPT' });

            // Beep playback
            service.send({
                type: 'START_PLAYBACK',
                playback: beepPlayback,
                playbackType: 'beep'
            });
            expect(service.getSnapshot().context.playbackType).toBe('beep');
        });
    });
});
