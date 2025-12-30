import { assign, createMachine, interpret } from "xstate";
import { logger } from "../util/Logger.js";

/**
 * RecordingMachine - Manage audio recording session with VAD
 *
 * Responsibilities:
 * - Track recording session state
 * - Monitor VAD silence detection
 * - Handle recording timeouts
 * - Provide state queries for beep isolation
 *
 * States:
 * - idle: Not recording
 * - recording: Actively capturing audio
 * - processing: VAD detected silence/max length, finalizing buffer
 *
 * Events:
 * - START_RECORDING: Begin audio capture
 * - SILENCE_DETECTED: VAD detected trailing silence
 * - MAX_LENGTH_REACHED: Maximum utterance length exceeded
 * - RECORDING_COMPLETE: Audio buffer finalized and ready
 */
function createRecordingMachine() {
    return createMachine({
        id: 'recording',
        initial: 'idle',
        context: {
            startedAt: 0,
            audioBuffer: [],
            hasSpoken: false
        },
        states: {
            idle: {
                entry: () => logger.debug('[RecordingMachine] State: idle - ready to record'),
                on: {
                    START_RECORDING: {
                        target: 'recording',
                        actions: 'initializeRecording'
                    }
                }
            },
            recording: {
                entry: ({ context }) => {
                    logger.info('[RecordingMachine] State: recording - capturing audio');
                },
                on: {
                    SILENCE_DETECTED: {
                        target: 'processing',
                        actions: 'logSilenceDetected'
                    },
                    MAX_LENGTH_REACHED: {
                        target: 'processing',
                        actions: 'logMaxLength'
                    }
                }
            },
            processing: {
                entry: () => logger.debug('[RecordingMachine] State: processing - finalizing audio buffer'),
                on: {
                    RECORDING_COMPLETE: {
                        target: 'idle',
                        actions: 'clearBuffer'
                    }
                }
            }
        }
    }, {
        actions: {
            initializeRecording: assign(() => {
                return {
                    startedAt: Date.now(),
                    audioBuffer: [],
                    hasSpoken: false
                };
            }),
            logSilenceDetected: () => {
                logger.debug('[RecordingMachine] Silence detected, stopping recording');
            },
            logMaxLength: () => {
                logger.debug('[RecordingMachine] Max recording length reached');
            },
            clearBuffer: assign(() => {
                return {
                    audioBuffer: [],
                    hasSpoken: false
                };
            })
        }
    });
}

/**
 * Setup and start RecordingMachine
 * @returns {Object} XState service for RecordingMachine
 */
function setupRecordingMachine() {
    const machine = createRecordingMachine();
    const service = interpret(machine);
    service.start();

    logger.debug('[RecordingMachine] Machine initialized and started');
    return service;
}

/**
 * Helper function to check if currently recording
 * @param {Object} service - RecordingMachine service
 * @returns {boolean} True if actively recording audio
 */
function isRecording(service) {
    const snapshot = service.getSnapshot();
    return snapshot.matches('recording');
}

export {
    createRecordingMachine,
    setupRecordingMachine,
    isRecording
};
