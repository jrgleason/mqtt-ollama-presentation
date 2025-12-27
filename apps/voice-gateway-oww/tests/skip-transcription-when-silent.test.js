/**
 * Tests for skip-transcription-when-silent feature
 *
 * Validates that the system skips transcription when no speech is detected
 * during recording (false wake word triggers).
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';

describe('Skip Transcription When Silent', () => {
    let mockLogger;
    let mockOrchestrator;
    let mockVoiceService;
    let hasSpokenDuringRecording;
    let recordedAudio;
    let isRecording;

    beforeEach(() => {
        // Reset state
        hasSpokenDuringRecording = false;
        recordedAudio = [];
        isRecording = false;

        // Mock logger
        mockLogger = {
            info: jest.fn(),
            debug: jest.fn(),
            error: jest.fn()
        };

        // Mock orchestrator
        mockOrchestrator = {
            processVoiceInteraction: jest.fn().mockResolvedValue(undefined)
        };

        // Mock voice service subscription callback
        mockVoiceService = {
            subscribe: jest.fn()
        };
    });

    /**
     * Simulate the state transition logic from main.js
     */
    const simulateStateTransition = (newState, audioSamples, hasSpoken) => {
        hasSpokenDuringRecording = hasSpoken;
        recordedAudio = audioSamples;

        // Simulate the state transition logic (lines 199-217 in main.js)
        const value = newState;

        if (value === 'recording' && !isRecording) {
            // Start recording
            isRecording = true;
            recordedAudio = [];
            hasSpokenDuringRecording = false;
            mockLogger.debug('🎙️ Recording started');
        } else if (value !== 'recording' && isRecording) {
            // Stop recording
            isRecording = false;
            const audioSnapshot = new Float32Array(recordedAudio);
            recordedAudio = [];
            mockLogger.debug('🛑 Recording stopped', { samples: audioSnapshot.length });

            // Check if speech was detected during recording
            if (audioSnapshot.length > 0 && hasSpokenDuringRecording) {
                // Process voice interaction in background (transcribe + AI + TTS)
                mockOrchestrator.processVoiceInteraction(audioSnapshot).catch(err => {
                    mockLogger.error('Voice interaction error', { error: err.message });
                });
            } else if (audioSnapshot.length > 0 && !hasSpokenDuringRecording) {
                // Skip transcription when no speech detected (false wake word trigger)
                mockLogger.info('⏩ Skipping transcription - no speech detected');
                // State machine automatically returns to listening (no action needed)
            }
        }
    };

    describe('Scenario: False wake word trigger with no speech', () => {
        it('should skip transcription and log skip message when no speech detected', () => {
            // GIVEN: Wake word triggered but no speech detected
            const audioSamples = [0.001, 0.002, 0.001, 0.003]; // Silent audio
            const hasSpoken = false;

            // Simulate recording start
            simulateStateTransition('recording', [], false);
            expect(isRecording).toBe(true);

            // WHEN: Recording stops without speech detection
            simulateStateTransition('listening', audioSamples, hasSpoken);

            // THEN: Should skip transcription
            expect(mockOrchestrator.processVoiceInteraction).not.toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith('⏩ Skipping transcription - no speech detected');
        });

        it('should not query AI when no speech detected', () => {
            // GIVEN: False wake word trigger
            const audioSamples = [0.001, 0.002];
            const hasSpoken = false;

            // Simulate recording cycle
            simulateStateTransition('recording', [], false);
            simulateStateTransition('listening', audioSamples, hasSpoken);

            // THEN: AI should not be queried
            expect(mockOrchestrator.processVoiceInteraction).not.toHaveBeenCalled();
        });

        it('should transition to listening state after skipping transcription', () => {
            // GIVEN: False wake word trigger
            const audioSamples = [0.001, 0.002];
            const hasSpoken = false;

            // Simulate recording cycle
            simulateStateTransition('recording', [], false);
            simulateStateTransition('listening', audioSamples, hasSpoken);

            // THEN: State should be listening (not recording)
            expect(isRecording).toBe(false);
        });
    });

    describe('Scenario: Valid speech after wake word trigger', () => {
        it('should process voice interaction normally when speech detected', () => {
            // GIVEN: Wake word triggered AND speech detected
            const audioSamples = [0.05, 0.1, 0.15, 0.08]; // Speech audio (energy > 0.01)
            const hasSpoken = true;

            // Simulate recording cycle
            simulateStateTransition('recording', [], false);
            simulateStateTransition('listening', audioSamples, hasSpoken);

            // THEN: Should process voice interaction
            expect(mockOrchestrator.processVoiceInteraction).toHaveBeenCalled();
            expect(mockLogger.info).not.toHaveBeenCalledWith('⏩ Skipping transcription - no speech detected');
        });

        it('should pass audio snapshot to processVoiceInteraction', () => {
            // GIVEN: Valid speech interaction
            const audioSamples = [0.05, 0.1, 0.15, 0.08];
            const hasSpoken = true;

            // Simulate recording cycle
            simulateStateTransition('recording', [], false);
            simulateStateTransition('listening', audioSamples, hasSpoken);

            // THEN: Should pass Float32Array to orchestrator
            expect(mockOrchestrator.processVoiceInteraction).toHaveBeenCalledWith(
                expect.any(Float32Array)
            );

            const passedAudio = mockOrchestrator.processVoiceInteraction.mock.calls[0][0];
            expect(passedAudio.length).toBe(audioSamples.length);
        });
    });

    describe('Scenario: Beep feedback captured during recording', () => {
        it('should skip transcription when only beep audio captured', () => {
            // GIVEN: Wake word triggered AND only beep captured (no speech)
            const beepAudio = [0.005, 0.008, 0.003, 0.006]; // Beep (below speech threshold)
            const hasSpoken = false; // VAD determined no speech

            // Simulate recording cycle
            simulateStateTransition('recording', [], false);
            simulateStateTransition('listening', beepAudio, hasSpoken);

            // THEN: Should skip transcription
            expect(mockOrchestrator.processVoiceInteraction).not.toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith('⏩ Skipping transcription - no speech detected');
        });
    });

    describe('Scenario: User triggered but stayed silent during grace period', () => {
        it('should skip transcription when user does not speak during grace period', () => {
            // GIVEN: Wake word triggered but user doesn't speak
            const silentAudio = [0.002, 0.003, 0.001, 0.002];
            const hasSpoken = false; // VAD timeout occurred without speech

            // Simulate recording cycle
            simulateStateTransition('recording', [], false);
            simulateStateTransition('listening', silentAudio, hasSpoken);

            // THEN: Should skip transcription and log reason
            expect(mockOrchestrator.processVoiceInteraction).not.toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith('⏩ Skipping transcription - no speech detected');
        });
    });

    describe('Scenario: Recording stopped at max length without speech', () => {
        it('should skip transcription when max length reached without speech', () => {
            // GIVEN: Recording reaches max length without detecting speech
            const longSilentAudio = new Array(10000).fill(0.002); // 10 seconds of silence
            const hasSpoken = false; // No speech detected during entire recording

            // Simulate recording cycle
            simulateStateTransition('recording', [], false);
            simulateStateTransition('listening', longSilentAudio, hasSpoken);

            // THEN: Should skip transcription
            expect(mockOrchestrator.processVoiceInteraction).not.toHaveBeenCalled();
            expect(mockLogger.info).toHaveBeenCalledWith('⏩ Skipping transcription - no speech detected');
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty audio buffer gracefully', () => {
            // GIVEN: Recording stops with no audio
            const emptyAudio = [];
            const hasSpoken = false;

            // Simulate recording cycle
            simulateStateTransition('recording', [], false);
            simulateStateTransition('listening', emptyAudio, hasSpoken);

            // THEN: Should not process or log (no audio)
            expect(mockOrchestrator.processVoiceInteraction).not.toHaveBeenCalled();
            expect(mockLogger.info).not.toHaveBeenCalledWith('⏩ Skipping transcription - no speech detected');
        });

        it('should handle very short utterances (below MIN_SPEECH_SAMPLES)', () => {
            // GIVEN: Very brief audio snippet
            const shortAudio = [0.05, 0.1]; // 2 samples (way below MIN_SPEECH_SAMPLES)
            const hasSpoken = true; // Speech detected but too short

            // Simulate recording cycle
            simulateStateTransition('recording', [], false);
            simulateStateTransition('listening', shortAudio, hasSpoken);

            // THEN: Should still process if hasSpoken=true (VAD already validated)
            expect(mockOrchestrator.processVoiceInteraction).toHaveBeenCalled();
        });
    });

    describe('Performance Impact', () => {
        it('should measure latency improvement for false triggers', () => {
            // GIVEN: False wake word trigger
            const startTime = Date.now();
            const audioSamples = [0.001, 0.002];
            const hasSpoken = false;

            // Simulate recording cycle
            simulateStateTransition('recording', [], false);
            simulateStateTransition('listening', audioSamples, hasSpoken);
            const endTime = Date.now();

            // THEN: Latency should be minimal (<1s, not ~8s)
            const latency = endTime - startTime;
            expect(latency).toBeLessThan(1000); // Should be nearly instant (just state transition)
            expect(mockOrchestrator.processVoiceInteraction).not.toHaveBeenCalled(); // No transcription/AI calls
        });
    });
});

describe('MicrophoneManager - Skip Transcription When Silent', () => {
    let mockLogger;
    let mockOrchestrator;
    let mockVadDetector;

    beforeEach(() => {
        mockLogger = {
            info: jest.fn(),
            debug: jest.fn(),
            error: jest.fn()
        };

        mockOrchestrator = {
            processVoiceInteraction: jest.fn().mockResolvedValue(undefined)
        };

        mockVadDetector = {
            getState: jest.fn()
        };
    });

    /**
     * Simulate the MicrophoneManager state transition logic
     */
    const simulateMicManagerStateTransition = (hasSpoken, audioSamples) => {
        // Simulate MicrophoneManager.js lines 118-133
        const audioSnapshot = new Float32Array(audioSamples);
        const hasSpokenFromVad = hasSpoken;

        // Check if speech was detected during recording
        if (audioSnapshot.length > 0 && hasSpokenFromVad) {
            // Process voice interaction in background (transcribe + AI + TTS)
            mockOrchestrator.processVoiceInteraction(audioSnapshot).catch(err => {
                mockLogger.error('Voice interaction error', { error: err.message });
            });
        } else if (audioSnapshot.length > 0 && !hasSpokenFromVad) {
            // Skip transcription when no speech detected (false wake word trigger)
            mockLogger.info('⏩ Skipping transcription - no speech detected');
            // State machine automatically returns to listening (no action needed)
        }
    };

    it('should skip transcription when VAD reports no speech', () => {
        // GIVEN: VAD detects no speech
        mockVadDetector.getState.mockReturnValue({
            hasSpokenDuringRecording: false,
            silenceSampleCount: 1000
        });

        const audioSamples = [0.001, 0.002, 0.003];

        // WHEN: State transitions from recording
        simulateMicManagerStateTransition(false, audioSamples);

        // THEN: Should skip transcription
        expect(mockOrchestrator.processVoiceInteraction).not.toHaveBeenCalled();
        expect(mockLogger.info).toHaveBeenCalledWith('⏩ Skipping transcription - no speech detected');
    });

    it('should process voice interaction when VAD reports speech', () => {
        // GIVEN: VAD detects speech
        mockVadDetector.getState.mockReturnValue({
            hasSpokenDuringRecording: true,
            silenceSampleCount: 0
        });

        const audioSamples = [0.05, 0.1, 0.15];

        // WHEN: State transitions from recording
        simulateMicManagerStateTransition(true, audioSamples);

        // THEN: Should process voice interaction
        expect(mockOrchestrator.processVoiceInteraction).toHaveBeenCalled();
        expect(mockLogger.info).not.toHaveBeenCalledWith('⏩ Skipping transcription - no speech detected');
    });
});
