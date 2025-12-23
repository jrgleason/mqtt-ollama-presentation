import wav from "wav";
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { SAMPLE_RATE } from './constants.js';

/**
 * Platform-specific audio player for PCM audio playback
 *
 * Supports macOS (afplay) and Linux (aplay with ALSA) platforms.
 * Uses dependency injection for configuration and logging.
 */
export class AudioPlayer {
    /**
     * Create a new AudioPlayer instance
     *
     * @param {Object} config - Application configuration
     * @param {Object} config.audio - Audio configuration
     * @param {string} [config.audio.speakerDevice] - ALSA speaker device (Linux only)
     * @param {string} [config.audio.micDevice] - ALSA mic device (fallback for speaker)
     * @param {Object} logger - Logger instance
     */
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        this.isMacOS = process.platform === 'darwin';
    }

    /**
     * Play PCM audio through the appropriate platform audio device
     *
     * @param {Buffer} pcmAudio - PCM audio data (Int16LE format)
     * @returns {Promise<void>} Resolves when playback completes, rejects on error
     */
    async play(pcmAudio) {
        if (!pcmAudio || pcmAudio.length === 0) {
            this.logger.debug('⚠️ No audio to play');
            return;
        }

        this.logger.debug('🔊 Playing audio', {
            sampleCount: pcmAudio.length,
            durationMs: Math.round((pcmAudio.length / 2 / SAMPLE_RATE) * 1000)
        });

        return new Promise((resolve, reject) => {
            if (this.isMacOS) {
                this._playMacOS(pcmAudio, resolve, reject);
            } else {
                this._playLinux(pcmAudio, resolve, reject);
            }
        });
    }

    /**
     * Play audio on macOS using afplay
     * @private
     */
    _playMacOS(pcmAudio, resolve, reject) {
        const wavPath = path.join(process.cwd(), `tts_${Date.now()}.wav`);
        const writer = new wav.FileWriter(wavPath, {
            channels: 1,
            sampleRate: SAMPLE_RATE,
            bitDepth: 16
        });

        writer.write(pcmAudio);
        writer.end();

        writer.on('finish', () => {
            const player = spawn('afplay', [wavPath]);

            player.on('close', (code) => {
                this._cleanupTempFile(wavPath);
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`afplay exited with code ${code}`));
                }
            });

            player.on('error', (err) => {
                this._cleanupTempFile(wavPath);
                reject(err);
            });
        });

        writer.on('error', reject);
    }

    /**
     * Play audio on Linux using aplay with ALSA
     * @private
     */
    _playLinux(pcmAudio, resolve, reject) {
        const device = this.config.audio.speakerDevice || this.config.audio.micDevice;
        const player = spawn('aplay', [
            '-D', device,
            '-f', 'S16_LE',
            '-r', String(SAMPLE_RATE),
            '-c', '1'
        ]);

        player.stdin.write(pcmAudio);
        player.stdin.end();

        player.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`aplay exited with code ${code}`));
            }
        });

        player.on('error', reject);
    }

    /**
     * Clean up temporary WAV file
     * @private
     */
    _cleanupTempFile(wavPath) {
        try {
            fs.unlinkSync(wavPath);
        } catch (err) {
            this.logger.error('Failed to delete temp WAV file', { path: wavPath, error: err.message });
        }
    }
}
