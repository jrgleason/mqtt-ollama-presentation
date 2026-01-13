import {assign, createMachine, interpret} from "xstate";
import {logger} from "../util/Logger.js";

/**
 * WakeWordMachine - Manage wake word detector lifecycle and readiness
 *
 * Responsibilities:
 * - Track detector initialization state
 * - Monitor detector warm-up completion
 * - Handle wake word triggers
 * - Coordinate detector resets
 *
 * States:
 * - off: Detector not initialized
 * - warming-up: Detector initialized, buffers filling
 * - ready: Detector warm and ready for detection
 * - triggered: Wake word detected, processing trigger
 *
 * Events:
 * - DETECTOR_INITIALIZED: Detector created and ready to warm up
 * - WARMUP_COMPLETE: Detector buffers filled and warm-up timer complete
 * - WAKE_WORD_DETECTED: Wake word detected with score
 * - TRIGGER_PROCESSED: Wake word trigger processing complete
 * - RESET_DETECTOR: Reset detector buffers (transitions to warming-up)
 */
function createWakeWordMachine() {
    return createMachine({
        id: 'wakeWord',
        initial: 'off',
        context: {
            detector: null,
            lastTriggerScore: 0,
            lastTriggerTime: 0,
            warmupStartTime: 0
        },
        states: {
            off: {
                entry: () => logger.debug('[WakeWordMachine] State: off - detector not initialized'),
                on: {
                    DETECTOR_INITIALIZED: {
                        target: 'warming-up',
                        actions: 'storeDetector'
                    }
                }
            },
            'warming-up': {
                entry: [
                    'recordWarmupStart',
                    () => logger.info('[WakeWordMachine] State: warming-up - buffers filling')
                ],
                on: {
                    WARMUP_COMPLETE: {
                        target: 'ready',
                        actions: 'logWarmupDuration'
                    }
                }
            },
            ready: {
                entry: () => logger.info('[WakeWordMachine] State: ready - listening for wake word'),
                on: {
                    WAKE_WORD_DETECTED: {
                        target: 'triggered',
                        actions: 'recordTrigger'
                    },
                    RESET_DETECTOR: {
                        target: 'warming-up',
                        actions: () => logger.debug('[WakeWordMachine] Detector reset - returning to warm-up')
                    }
                }
            },
            triggered: {
                entry: () => logger.debug('[WakeWordMachine] State: triggered - wake word detected'),
                on: {
                    TRIGGER_PROCESSED: {
                        target: 'ready',
                        actions: () => logger.debug('[WakeWordMachine] Trigger processed - ready for next wake word')
                    }
                }
            }
        }
    }, {
        actions: {
            storeDetector: assign(({context, event}) => {
                return {
                    detector: event.detector
                };
            }),
            recordWarmupStart: assign(() => {
                return {
                    warmupStartTime: Date.now()
                };
            }),
            logWarmupDuration: assign(({context}) => {
                const duration = Date.now() - context.warmupStartTime;
                logger.info('[WakeWordMachine] Warm-up complete', {
                    durationMs: duration
                });
                return {};
            }),
            recordTrigger: assign(({context, event}) => {
                return {
                    lastTriggerScore: event.score || 0,
                    lastTriggerTime: Date.now()
                };
            })
        }
    });
}

/**
 * Setup and start WakeWordMachine
 * @returns {Object} XState service for WakeWordMachine
 */
function setupWakeWordMachine() {
    const machine = createWakeWordMachine();
    const service = interpret(machine);
    service.start();

    logger.debug('[WakeWordMachine] Machine initialized and started');
    return service;
}

export {
    createWakeWordMachine,
    setupWakeWordMachine
};
