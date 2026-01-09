/**
 * Volume Control Tool for AI
 *
 * Allows the voice assistant to control its own speaker volume
 */

import {config} from '../config.js';
import {loadPrompt} from '../util/prompt-loader.js';

// Volume limits
const MIN_VOLUME = 0.0;
const MAX_VOLUME = 1.0;
const VOLUME_STEP = 0.1; // 10% increment for up/down

/**
 * Get current volume level
 * @returns {number} Current volume (0.0 to 1.0)
 */
export function getCurrentVolume() {
    return config.tts.volume;
}

/**
 * Set volume to a specific level
 * @param {number} level - Volume level (0.0 to 1.0)
 * @returns {number} New volume level
 */
export function setVolume(level) {
    // Clamp to valid range
    const newVolume = Math.max(MIN_VOLUME, Math.min(MAX_VOLUME, level));
    config.tts.volume = newVolume;
    return newVolume;
}

/**
 * Increase volume by a step
 * @param {number} [step=VOLUME_STEP] - Amount to increase (default 0.1)
 * @returns {number} New volume level
 */
export function increaseVolume(step = VOLUME_STEP) {
    return setVolume(config.tts.volume + step);
}

/**
 * Decrease volume by a step
 * @param {number} [step=VOLUME_STEP] - Amount to decrease (default 0.1)
 * @returns {number} New volume level
 */
export function decreaseVolume(step = VOLUME_STEP) {
    return setVolume(config.tts.volume - step);
}

/**
 * Get human-readable volume percentage
 * @param {number} volume - Volume level (0.0 to 1.0)
 * @returns {string} Percentage string (e.g., "75%")
 */
function formatVolumePercentage(volume) {
    return `${Math.round(volume * 100)}%`;
}

/**
 * Get human-readable volume description
 * @param {number} volume - Volume level (0.0 to 1.0)
 * @returns {string} Description (e.g., "medium", "loud", "quiet")
 */
function getVolumeDescription(volume) {
    if (volume === 0) return 'muted';
    if (volume <= 0.2) return 'very quiet';
    if (volume <= 0.4) return 'quiet';
    if (volume <= 0.6) return 'medium';
    if (volume <= 0.8) return 'loud';
    return 'very loud';
}

/**
 * Control speaker volume
 * @param {Object} args - Tool arguments
 * @param {string} args.action - Action: 'get', 'set', 'up', 'down', 'increase', 'decrease'
 * @param {number} [args.level] - Volume level for 'set' action (0-100 or 0.0-1.0)
 * @param {number} [args.amount] - Amount to change for 'up'/'down' actions (0-100 or 0.0-1.0)
 * @returns {Object} Result with volume info
 */
export function controlVolume(args) {
    const {action, level, amount} = args;
    let newVolume;
    let message;

    try {
        switch (action.toLowerCase()) {
            case 'get':
            case 'current':
            case 'status':
                newVolume = getCurrentVolume();
                message = `Current volume is ${formatVolumePercentage(newVolume)} (${getVolumeDescription(newVolume)})`;
                break;

            case 'set': {
                if (level === undefined || level === null) {
                    throw new Error('Level parameter required for set action');
                }
                // Handle both percentage (0-100) and decimal (0.0-1.0) formats
                const normalizedLevel = level > 1 ? level / 100 : level;
                newVolume = setVolume(normalizedLevel);
                message = `Volume set to ${formatVolumePercentage(newVolume)} (${getVolumeDescription(newVolume)})`;
                break;
            }

            case 'up':
            case 'increase':
            case 'louder':
            case 'raise': {
                // Handle custom amount or use default step
                const increaseAmount = amount !== undefined
                    ? (amount > 1 ? amount / 100 : amount)
                    : VOLUME_STEP;
                newVolume = increaseVolume(increaseAmount);
                message = `Volume increased to ${formatVolumePercentage(newVolume)} (${getVolumeDescription(newVolume)})`;
                break;
            }

            case 'down':
            case 'decrease':
            case 'quieter':
            case 'lower': {
                // Handle custom amount or use default step
                const decreaseAmount = amount !== undefined
                    ? (amount > 1 ? amount / 100 : amount)
                    : VOLUME_STEP;
                newVolume = decreaseVolume(decreaseAmount);
                message = `Volume decreased to ${formatVolumePercentage(newVolume)} (${getVolumeDescription(newVolume)})`;
                break;
            }

            case 'mute':
                newVolume = setVolume(0);
                message = 'Volume muted';
                break;

            case 'unmute':
            case 'restore':
                // Set to 50% as a reasonable default
                newVolume = setVolume(0.5);
                message = `Volume restored to ${formatVolumePercentage(newVolume)}`;
                break;

            case 'max':
            case 'maximum':
            case 'full':
                newVolume = setVolume(MAX_VOLUME);
                message = `Volume set to maximum (${formatVolumePercentage(newVolume)})`;
                break;

            default:
                throw new Error(`Unknown action: ${action}. Valid actions: get, set, up, down, increase, decrease, mute, unmute, max`);
        }

        return {
            success: true,
            volume: newVolume,
            percentage: Math.round(newVolume * 100),
            description: getVolumeDescription(newVolume),
            message
        };
    } catch (error) {
        console.error('❌ Volume control error:', error);
        return {
            success: false,
            error: error.message,
            message: `Failed to control volume: ${error.message}`
        };
    }
}

/**
 * Tool definition for AI
 * @see prompts/tools/volume-control.md
 */
export const volumeControlTool = {
    type: 'function',
    function: {
        name: 'control_speaker_volume',
        description: loadPrompt('tools/volume-control'),
        parameters: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['get', 'set', 'up', 'down', 'increase', 'decrease', 'louder', 'quieter', 'mute', 'unmute', 'max'],
                    description: 'Action to perform: "get" (get current volume), "set" (set to specific level), "up"/"increase"/"louder" (increase volume), "down"/"decrease"/"quieter" (decrease volume), "mute" (set to 0), "unmute" (restore to 50%), "max" (set to maximum)'
                },
                level: {
                    type: 'number',
                    description: 'Volume level for "set" action. Can be 0-100 (percentage) or 0.0-1.0 (decimal). Example: 50 or 0.5 for 50%'
                },
                amount: {
                    type: 'number',
                    description: 'Amount to increase/decrease for "up"/"down" actions. Can be 0-100 (percentage) or 0.0-1.0 (decimal). Default is 10% if not specified.'
                }
            },
            required: ['action'],
            additionalProperties: false
        }
    }
};

/**
 * Execute the volume control tool
 * @param {Object} args - Tool arguments
 * @param {string} args.action - Action to perform
 * @param {number} [args.level] - Volume level for 'set'
 * @param {number} [args.amount] - Amount to change for 'up'/'down'
 * @returns {string} Human-readable result message
 */
export function executeVolumeControlTool(args) {
    console.log('🔊 Volume control tool called:', args);

    const result = controlVolume(args);

    if (result.success) {
        console.log(`🔊 Volume changed: ${result.percentage}% (${result.description})`);
    } else {
        console.error('❌ Volume control failed:', result.error);
    }

    return result.message;
}
