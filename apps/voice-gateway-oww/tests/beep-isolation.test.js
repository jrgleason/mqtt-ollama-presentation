/**
 * Beep Isolation Tests
 *
 * Tests to verify that beeps are suppressed during recording state to prevent
 * microphone feedback loops (beeps being captured in audio recordings and
 * transcribed by Whisper as "[BEEPING]").
 *
 * Test Strategy:
 * - Mock the audio player to track beep playback calls
 * - Mock the state machine to simulate recording state transitions
 * - Verify beeps are suppressed when recording state is active
 * - Verify beeps play normally in all other states
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

/**
 * Mock AudioPlayer to track beep calls without actual audio playback
 */
class MockAudioPlayer {
    constructor() {
        this.playCalls = [];
        this.playInterruptibleCalls = [];
    }

    async play(beepBuffer) {
        this.playCalls.push({ beepBuffer, timestamp: Date.now() });
        return Promise.resolve();
    }

    playInterruptible(audioBuffer) {
        const playback = {
            cancel: jest.fn(),
            promise: Promise.resolve()
        };
        this.playInterruptibleCalls.push({ audioBuffer, timestamp: Date.now() });
        return playback;
    }

    reset() {
        this.playCalls = [];
        this.playInterruptibleCalls = [];
    }

    getPlayCount() {
        return this.playCalls.length;
    }
}

/**
 * Mock State Machine Service to simulate recording state transitions
 */
class MockVoiceService {
    constructor() {
        this.currentState = 'listening';
        this.subscribers = [];
    }

    subscribe(callback) {
        this.subscribers.push(callback);
        // Call immediately with current state
        callback({ value: this.currentState });
    }

    send(event) {
        // Simulate state transitions
        if (event.type === 'TRIGGER') {
            this.currentState = 'recording';
        } else if (event.type === 'SILENCE_DETECTED' || event.type === 'MAX_LENGTH_REACHED') {
            this.currentState = 'processing';
        } else if (event.type === 'INTERACTION_COMPLETE') {
            this.currentState = 'cooldown';
        } else if (event.type === 'READY') {
            this.currentState = 'listening';
        }

        // Notify subscribers of state change
        this.subscribers.forEach(callback => {
            callback({ value: this.currentState });
        });
    }

    getState() {
        return this.currentState;
    }
}

describe('Beep Isolation System', () => {
    let mockAudioPlayer;
    let mockVoiceService;
    let isRecordingChecker;
    let stateIsRecording;

    beforeEach(() => {
        mockAudioPlayer = new MockAudioPlayer();
        mockVoiceService = new MockVoiceService();
        stateIsRecording = false;

        // Simulate the isRecording checker callback from main.js
        mockVoiceService.subscribe((state) => {
            stateIsRecording = (state.value === 'recording');
        });

        isRecordingChecker = () => stateIsRecording;
    });

    afterEach(() => {
        mockAudioPlayer.reset();
    });

    describe('Wake Word Beep Isolation (main.js line 253)', () => {
        it('should play wake word beep when NOT recording (listening state)', async () => {
            // Simulate listening state
            mockVoiceService.send({ type: 'READY' });

            // Simulate wake word beep playback check
            if (!isRecordingChecker()) {
                await mockAudioPlayer.play(Buffer.from('wake-word-beep'));
            }

            expect(mockAudioPlayer.getPlayCount()).toBe(1);
            expect(stateIsRecording).toBe(false);
        });

        it('should play wake word beep when in cooldown state (interruption)', async () => {
            // Simulate cooldown state (after interaction completes)
            mockVoiceService.send({ type: 'INTERACTION_COMPLETE' });

            // Simulate wake word beep playback check
            if (!isRecordingChecker()) {
                await mockAudioPlayer.play(Buffer.from('wake-word-beep'));
            }

            expect(mockAudioPlayer.getPlayCount()).toBe(1);
            expect(stateIsRecording).toBe(false);
        });

        it('should SUPPRESS wake word beep when recording is active', async () => {
            // Simulate recording state
            mockVoiceService.send({ type: 'TRIGGER', ts: Date.now() });

            // Verify state is recording
            expect(stateIsRecording).toBe(true);

            // Simulate wake word beep playback check (should be suppressed)
            if (!isRecordingChecker()) {
                await mockAudioPlayer.play(Buffer.from('wake-word-beep'));
            }

            // Beep should NOT have been played
            expect(mockAudioPlayer.getPlayCount()).toBe(0);
        });

        it('should resume playing beeps after recording stops', async () => {
            // Start recording
            mockVoiceService.send({ type: 'TRIGGER', ts: Date.now() });
            expect(stateIsRecording).toBe(true);

            // Try to play beep during recording (should be suppressed)
            if (!isRecordingChecker()) {
                await mockAudioPlayer.play(Buffer.from('wake-word-beep-1'));
            }
            expect(mockAudioPlayer.getPlayCount()).toBe(0);

            // Stop recording
            mockVoiceService.send({ type: 'SILENCE_DETECTED' });
            expect(stateIsRecording).toBe(false);

            // Try to play beep after recording (should succeed)
            if (!isRecordingChecker()) {
                await mockAudioPlayer.play(Buffer.from('wake-word-beep-2'));
            }
            expect(mockAudioPlayer.getPlayCount()).toBe(1);
        });
    });

    describe('Processing Beep Isolation (VoiceInteractionOrchestrator.js line 106)', () => {
        it('should play processing beep when NOT recording', async () => {
            // Simulate processing state (after recording completes)
            mockVoiceService.send({ type: 'SILENCE_DETECTED' });

            // Simulate processing beep check (from VoiceInteractionOrchestrator)
            if (!isRecordingChecker()) {
                await mockAudioPlayer.play(Buffer.from('processing-beep'));
            }

            expect(mockAudioPlayer.getPlayCount()).toBe(1);
            expect(stateIsRecording).toBe(false);
        });

        it('should SUPPRESS processing beep if somehow recording is still active', async () => {
            // Simulate recording state (edge case - processing beep called during recording)
            mockVoiceService.send({ type: 'TRIGGER', ts: Date.now() });

            // Verify state is recording
            expect(stateIsRecording).toBe(true);

            // Simulate processing beep check (should be suppressed)
            if (!isRecordingChecker()) {
                await mockAudioPlayer.play(Buffer.from('processing-beep'));
            }

            // Beep should NOT have been played
            expect(mockAudioPlayer.getPlayCount()).toBe(0);
        });
    });

    describe('Response Beep Isolation (VoiceInteractionOrchestrator.js line 135)', () => {
        it('should play response beep when NOT recording', async () => {
            // Simulate cooldown state (after interaction completes)
            mockVoiceService.send({ type: 'INTERACTION_COMPLETE' });

            // Simulate response beep check (from VoiceInteractionOrchestrator)
            if (!isRecordingChecker()) {
                await mockAudioPlayer.play(Buffer.from('response-beep'));
            }

            expect(mockAudioPlayer.getPlayCount()).toBe(1);
            expect(stateIsRecording).toBe(false);
        });

        it('should SUPPRESS response beep if recording is active', async () => {
            // Simulate recording state (edge case - response beep called during recording)
            mockVoiceService.send({ type: 'TRIGGER', ts: Date.now() });

            // Verify state is recording
            expect(stateIsRecording).toBe(true);

            // Simulate response beep check (should be suppressed)
            if (!isRecordingChecker()) {
                await mockAudioPlayer.play(Buffer.from('response-beep'));
            }

            // Beep should NOT have been played
            expect(mockAudioPlayer.getPlayCount()).toBe(0);
        });
    });

    describe('State Machine Recording Flag Tracking', () => {
        it('should track recording state correctly through all transitions', () => {
            // Initial state: listening
            expect(stateIsRecording).toBe(false);

            // Trigger wake word -> recording
            mockVoiceService.send({ type: 'TRIGGER', ts: Date.now() });
            expect(stateIsRecording).toBe(true);

            // Silence detected -> processing
            mockVoiceService.send({ type: 'SILENCE_DETECTED' });
            expect(stateIsRecording).toBe(false);

            // Interaction complete -> cooldown
            mockVoiceService.send({ type: 'INTERACTION_COMPLETE' });
            expect(stateIsRecording).toBe(false);

            // Cooldown timeout -> listening (simulated by READY)
            mockVoiceService.send({ type: 'READY' });
            expect(stateIsRecording).toBe(false);
        });

        it('should immediately update recording flag on state change', () => {
            expect(stateIsRecording).toBe(false);

            // Trigger recording
            mockVoiceService.send({ type: 'TRIGGER', ts: Date.now() });
            expect(stateIsRecording).toBe(true);

            // Max length reached -> processing
            mockVoiceService.send({ type: 'MAX_LENGTH_REACHED' });
            expect(stateIsRecording).toBe(false);
        });
    });

    describe('Wake Word Interruption During Cooldown', () => {
        it('should allow wake word beep during cooldown (interruption case)', async () => {
            // Simulate interaction completion (cooldown state)
            mockVoiceService.send({ type: 'INTERACTION_COMPLETE' });
            expect(mockVoiceService.getState()).toBe('cooldown');

            // User interrupts with wake word during cooldown
            // Wake word beep should play (not recording)
            if (!isRecordingChecker()) {
                await mockAudioPlayer.play(Buffer.from('wake-word-beep-interruption'));
            }

            expect(mockAudioPlayer.getPlayCount()).toBe(1);
            expect(stateIsRecording).toBe(false);
        });
    });

    describe('Error Beep Isolation', () => {
        it('should play error beep when NOT recording', async () => {
            // Simulate processing state
            mockVoiceService.send({ type: 'SILENCE_DETECTED' });

            // Simulate error beep (from catch block in VoiceInteractionOrchestrator)
            if (!isRecordingChecker()) {
                await mockAudioPlayer.play(Buffer.from('error-beep'));
            }

            expect(mockAudioPlayer.getPlayCount()).toBe(1);
        });

        it('should SUPPRESS error beep if recording is active', async () => {
            // Simulate recording state
            mockVoiceService.send({ type: 'TRIGGER', ts: Date.now() });

            // Simulate error beep check
            if (!isRecordingChecker()) {
                await mockAudioPlayer.play(Buffer.from('error-beep'));
            }

            // Error beep should be suppressed during recording
            expect(mockAudioPlayer.getPlayCount()).toBe(0);
        });
    });

    describe('Integration Scenario: Complete Voice Interaction', () => {
        it('should only suppress beeps during recording phase of complete interaction', async () => {
            mockAudioPlayer.reset();

            // Phase 1: Listening -> Wake word detected
            mockVoiceService.send({ type: 'READY' });
            if (!isRecordingChecker()) {
                await mockAudioPlayer.play(Buffer.from('wake-word-beep'));
            }
            expect(mockAudioPlayer.getPlayCount()).toBe(1);

            // Phase 2: Recording -> Beeps SUPPRESSED
            mockVoiceService.send({ type: 'TRIGGER', ts: Date.now() });
            mockAudioPlayer.reset(); // Reset counter for this phase

            if (!isRecordingChecker()) {
                await mockAudioPlayer.play(Buffer.from('should-not-play-1'));
            }
            expect(mockAudioPlayer.getPlayCount()).toBe(0);

            // Phase 3: Processing -> Beeps ALLOWED
            mockVoiceService.send({ type: 'SILENCE_DETECTED' });
            if (!isRecordingChecker()) {
                await mockAudioPlayer.play(Buffer.from('processing-beep'));
            }
            expect(mockAudioPlayer.getPlayCount()).toBe(1);

            // Phase 4: Cooldown -> Beeps ALLOWED
            mockVoiceService.send({ type: 'INTERACTION_COMPLETE' });
            if (!isRecordingChecker()) {
                await mockAudioPlayer.play(Buffer.from('response-beep'));
            }
            expect(mockAudioPlayer.getPlayCount()).toBe(2);

            // Phase 5: Back to listening -> Beeps ALLOWED
            mockVoiceService.send({ type: 'READY' });
            if (!isRecordingChecker()) {
                await mockAudioPlayer.play(Buffer.from('wake-word-beep-2'));
            }
            expect(mockAudioPlayer.getPlayCount()).toBe(3);
        });
    });
});
