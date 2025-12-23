import {assign, createMachine, interpret} from "xstate";
import {logger} from "./Logger.js";
import {config} from '../config.js';

/**
 * Setup voice state machine for wake word detection and recording
 * @returns {Object} XState service
 */
function setupVoiceStateMachine() {
    const voiceMachine = createMachine({
        id: 'voice',
        initial: 'startup',
        context: {
            lastTrigger: 0,
            minRearmMs: config.audio.triggerCooldownMs || 1500
        },
        states: {
            startup: {
                entry: () => logger.debug('🚀 Startup mode - microphone muted until ready'),
                on: {
                    READY: 'listening'
                }
            },
            listening: {
                entry: () => logger.debug('🎧 Listening for wake word...'),
                on: {
                    TRIGGER: [{
                        cond: 'canTrigger',
                        target: 'recording',
                        actions: 'recordTriggered'
                    }, {
                        actions: 'logTriggerBlocked'
                    }]
                }
            },
            recording: {
                entry: () => logger.debug('🎙️ Recording user speech...'),
                on: {
                    SILENCE_DETECTED: 'cooldown',
                    MAX_LENGTH_REACHED: 'cooldown'
                }
            },
            cooldown: {
                entry: () => logger.debug('⏸️ Cooldown period before re-arming'),
                after: {
                    [config.audio.triggerCooldownMs || 1500]: 'listening'
                }
            }
        }
    }, {
        guards: {
            canTrigger: ({context, event}) => {
                const now = event.ts || Date.now();
                const elapsed = now - (context.lastTrigger || 0);
                const canTrigger = elapsed >= (context.minRearmMs || 1500);
                if (!canTrigger) {
                    logger.debug('⛔ Trigger blocked (cooldown)', {
                        elapsedMs: elapsed,
                        requiredMs: context.minRearmMs
                    });
                }
                return canTrigger;
            }
        },
        actions: {
            recordTriggered: assign(({context, event}) => {
                const ts = event.ts || Date.now();
                logger.debug('✅ Trigger accepted', {
                    elapsedSinceLastMs: ts - (context.lastTrigger || 0)
                });
                return {
                    lastTrigger: ts
                };
            }),
            logTriggerBlocked: () => {
                logger.debug('⛔ Trigger rejected (still in cooldown)');
            }
        }
    });

    const voiceService = interpret(voiceMachine);
    voiceService.start();

    logger.debug('✅ Voice state machine initialized');
    return voiceService;
}

export {
    setupVoiceStateMachine
}
