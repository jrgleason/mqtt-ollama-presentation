/**
 * Audio Feedback Module
 *
 * Plays audio feedback for various events (errors, success, etc.)
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from './logger.js';

const execAsync = promisify(exec);

/**
 * Play a tone using sox (if available) or afplay on macOS
 * @param {number} frequency - Frequency in Hz
 * @param {number} duration - Duration in seconds
 * @param {string} type - Waveform type (sine, square, triangle, sawtooth)
 */
async function playTone(frequency, duration, type = 'sine') {
    try {
        // Try sox first (cross-platform)
        await execAsync(`sox -n -t coreaudio default synth ${duration} ${type} ${frequency} 2>/dev/null`);
    } catch (err) {
        // Fallback to afplay on macOS (play system sounds)
        logger.debug('sox not available, audio feedback disabled');
    }
}

/**
 * Play error sound (descending tones, like a "sad trombone")
 */
export async function playErrorSound() {
    try {
        // Play three descending tones quickly
        await playTone(400, 0.15, 'square');
        await new Promise(resolve => setTimeout(resolve, 50));
        await playTone(300, 0.15, 'square');
        await new Promise(resolve => setTimeout(resolve, 50));
        await playTone(200, 0.25, 'square');
    } catch (error) {
        // Silently fail if audio playback isn't available
        logger.debug('Error playing error sound:', error.message);
    }
}

/**
 * Play a "fart" sound for humorous error feedback
 */
export async function playFartSound() {
    try {
        // Create a "fart" sound using random low frequencies
        const frequencies = [80, 100, 120, 90, 70];
        for (const freq of frequencies) {
            await playTone(freq, 0.08, 'sawtooth');
            await new Promise(resolve => setTimeout(resolve, 20));
        }
    } catch (error) {
        logger.debug('Error playing fart sound:', error.message);
    }
}

/**
 * Play success sound (ascending chime)
 */
export async function playSuccessSound() {
    try {
        await playTone(523, 0.1, 'sine'); // C
        await new Promise(resolve => setTimeout(resolve, 50));
        await playTone(659, 0.15, 'sine'); // E
    } catch (error) {
        logger.debug('Error playing success sound:', error.message);
    }
}

/**
 * Play warning sound (two-tone beep)
 */
export async function playWarningSound() {
    try {
        await playTone(800, 0.1, 'sine');
        await new Promise(resolve => setTimeout(resolve, 100));
        await playTone(600, 0.1, 'sine');
    } catch (error) {
        logger.debug('Error playing warning sound:', error.message);
    }
}
