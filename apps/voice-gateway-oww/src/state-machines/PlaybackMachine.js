import { assign, createMachine, interpret } from "xstate";
import { logger } from "../util/Logger.js";
import { config } from "../config.js";

/**
 * PlaybackMachine - Manage TTS and beep playback with interruption support
 *
 * Responsibilities:
 * - Track active TTS/beep playback
 * - Handle playback interruption (barge-in)
 * - Manage cooldown period after playback
 * - Provide state queries for beep isolation
 *
 * States:
 * - idle: No audio playing
 * - playing: TTS or beep currently playing
 * - cooldown: Brief pause after TTS before accepting next wake word
 * - interrupted: Playback cancelled by user (barge-in)
 *
 * Events:
 * - START_PLAYBACK: Start playing TTS or beep
 * - PLAYBACK_COMPLETE: Playback finished naturally
 * - COOLDOWN_COMPLETE: Cooldown timer expired
 * - INTERRUPT: Cancel active playback immediately
 * - INTERRUPT_HANDLED: Interruption cleanup complete
 */
function createPlaybackMachine() {
    const cooldownMs = config.audio.triggerCooldownMs || 1500;

    return createMachine({
        id: 'playback',
        initial: 'idle',
        context: {
            activePlayback: null,
            playbackType: null, // 'tts' or 'beep'
            cooldownMs: cooldownMs
        },
        states: {
            idle: {
                entry: () => logger.debug('[PlaybackMachine] State: idle - ready for playback'),
                on: {
                    START_PLAYBACK: {
                        target: 'playing',
                        actions: 'storePlayback'
                    }
                }
            },
            playing: {
                entry: ({ context }) => {
                    const type = context.playbackType || 'unknown';
                    logger.debug(`[PlaybackMachine] State: playing - ${type} playback active`);
                },
                on: {
                    PLAYBACK_COMPLETE: {
                        target: 'cooldown',
                        actions: 'clearPlayback'
                    },
                    INTERRUPT: {
                        target: 'interrupted',
                        actions: 'cancelPlayback'
                    }
                }
            },
            cooldown: {
                entry: ({ context }) => {
                    logger.debug('[PlaybackMachine] State: cooldown - waiting before next interaction', {
                        cooldownMs: context.cooldownMs
                    });
                },
                after: {
                    [cooldownMs]: {
                        target: 'idle',
                        actions: () => logger.debug('[PlaybackMachine] Cooldown complete')
                    }
                },
                on: {
                    // Allow interruption during cooldown (wake word can trigger during cooldown)
                    INTERRUPT: {
                        target: 'idle',
                        actions: () => logger.debug('[PlaybackMachine] Cooldown interrupted by wake word')
                    }
                }
            },
            interrupted: {
                entry: () => logger.info('[PlaybackMachine] State: interrupted - playback cancelled'),
                on: {
                    INTERRUPT_HANDLED: {
                        target: 'idle',
                        actions: () => logger.debug('[PlaybackMachine] Interruption handled, returning to idle')
                    }
                }
            }
        }
    }, {
        actions: {
            storePlayback: assign(({ context, event }) => {
                return {
                    activePlayback: event.playback || null,
                    playbackType: event.playbackType || 'unknown'
                };
            }),
            clearPlayback: assign(() => {
                return {
                    activePlayback: null,
                    playbackType: null
                };
            }),
            cancelPlayback: assign(({ context }) => {
                // Cancel active playback if it exists
                if (context.activePlayback && typeof context.activePlayback.cancel === 'function') {
                    try {
                        logger.info('[PlaybackMachine] Cancelling active playback', {
                            type: context.playbackType
                        });
                        context.activePlayback.cancel();
                    } catch (err) {
                        logger.warn('[PlaybackMachine] Failed to cancel playback', {
                            error: err.message
                        });
                    }
                }

                return {
                    activePlayback: null,
                    playbackType: null
                };
            })
        }
    });
}

/**
 * Setup and start PlaybackMachine
 * @returns {Object} XState service for PlaybackMachine
 */
function setupPlaybackMachine() {
    const machine = createPlaybackMachine();
    const service = interpret(machine);
    service.start();

    logger.debug('[PlaybackMachine] Machine initialized and started');
    return service;
}

/**
 * Helper function to check if playback is active
 * @param {Object} service - PlaybackMachine service
 * @returns {boolean} True if playing or in cooldown
 */
function isPlaybackActive(service) {
    const snapshot = service.getSnapshot();
    return snapshot.matches('playing') || snapshot.matches('cooldown');
}

/**
 * Helper function to check if currently playing (not cooldown)
 * @param {Object} service - PlaybackMachine service
 * @returns {boolean} True if actively playing audio
 */
function isPlaying(service) {
    const snapshot = service.getSnapshot();
    return snapshot.matches('playing');
}

export {
    createPlaybackMachine,
    setupPlaybackMachine,
    isPlaybackActive,
    isPlaying
};
