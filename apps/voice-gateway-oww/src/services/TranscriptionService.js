import fs from 'fs';
import path from 'path';
import {execSync, spawn} from 'child_process';
import { SAMPLE_RATE } from '../audio/constants.js';
import { rmsEnergy, writeWavFile } from '../audio/AudioUtils.js';
import { errMsg } from '../util/Logger.js';
import {
    WHISPER_TRANSCRIPTION_TIMEOUT_MS,
    WHISPER_PROCESS_DEFAULT_TIMEOUT_MS,
    MILLISECONDS_PER_SECOND
} from '../constants/timing.js';
import { MIN_AUDIO_ENERGY, MIN_AUDIO_DURATION_SECONDS } from '../constants/thresholds.js';

/**
 * TranscriptionService - Orchestrate Whisper transcription workflow
 *
 * Responsibilities:
 * - Audio validation (duration, energy checks)
 * - Temporary WAV file management (create, cleanup)
 * - Whisper transcription invocation
 * - Error handling and logging
 *
 * Usage:
 *   const service = new TranscriptionService(config, logger);
 *   const text = await service.transcribe(audioSamples);
 */
export class TranscriptionService {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;

        // Validate config
        if (!config.whisper || !config.whisper.modelPath) {
            throw new Error('TranscriptionService requires config.whisper.modelPath');
        }

        this.whisperModel = config.whisper.modelPath;
        this.minDuration = MIN_AUDIO_DURATION_SECONDS;
        this.minEnergy = MIN_AUDIO_ENERGY;
        this.timeoutMs = WHISPER_TRANSCRIPTION_TIMEOUT_MS;
    }

    /**
     * Transcribe audio samples to text
     *
     * @param {Float32Array|Buffer} audioSamples - Audio samples to transcribe
     * @returns {Promise<string|null>} Transcription text or null if audio is invalid
     * @throws {Error} If transcription fails or times out
     */
    async transcribe(audioSamples) {
        // Validation: Check audio duration
        if (!audioSamples || audioSamples.length < SAMPLE_RATE * this.minDuration) {
            this.logger.warn('Audio too short for transcription', {
                duration: audioSamples ? audioSamples.length / SAMPLE_RATE : 0,
                minDuration: this.minDuration
            });
            return null;
        }

        // Validation: Check audio energy
        const energy = rmsEnergy(audioSamples);
        if (energy < this.minEnergy) {
            this.logger.warn('Audio energy too low for transcription', {
                energy,
                minEnergy: this.minEnergy
            });
            return null;
        }

        // Create temporary WAV file
        const wavPath = path.join(process.cwd(), `recorded_bg_${Date.now()}.wav`);

        try {
            // Write audio to WAV file
            await writeWavFile(wavPath, audioSamples);

            // Log transcription start
            const startTime = Date.now();
            this.logger.info('Starting Whisper transcription', {
                model: this.whisperModel,
                duration: audioSamples.length / SAMPLE_RATE,
                energy
            });

            // Transcribe with Whisper (with timeout)
            const transcription = await this._transcribeWithWhisper(
                this.whisperModel,
                wavPath,
                { timeoutMs: this.timeoutMs }
            );

            // Log transcription duration
            const duration = Date.now() - startTime;
            this.logger.info('Whisper transcription complete', {
                duration: `${(duration / 1000).toFixed(2)}s`,
                textLength: transcription ? transcription.length : 0
            });

            // Validate transcription result
            if (!transcription || !transcription.trim().length) {
                this.logger.warn('Whisper returned empty transcription');
                return null;
            }

            return transcription.trim();

        } catch (error) {
            this.logger.error('Transcription failed', {
                error: errMsg(error),
                model: this.whisperModel,
                duration: audioSamples.length / SAMPLE_RATE
            });
            throw error;

        } finally {
            // Always clean up temporary WAV file
            try {
                if (fs.existsSync(wavPath)) {
                    fs.unlinkSync(wavPath);
                    this.logger.debug('Cleaned up temporary WAV file', { wavPath });
                }
            } catch (cleanupErr) {
                this.logger.error('Failed to clean up WAV file', {
                    error: errMsg(cleanupErr),
                    wavPath
                });
            }
        }
    }

    /**
     * Validate audio samples without transcribing
     *
     * @param {Float32Array|Buffer} audioSamples - Audio samples to validate
     * @returns {Object} Validation result: { valid: boolean, reason?: string }
     */
    validate(audioSamples) {
        if (!audioSamples || audioSamples.length < SAMPLE_RATE * this.minDuration) {
            return {
                valid: false,
                reason: 'Audio too short',
                duration: audioSamples ? audioSamples.length / SAMPLE_RATE : 0,
                minDuration: this.minDuration
            };
        }

        const energy = rmsEnergy(audioSamples);
        if (energy < this.minEnergy) {
            return {
                valid: false,
                reason: 'Audio energy too low',
                energy,
                minEnergy: this.minEnergy
            };
        }

        return {
            valid: true,
            duration: audioSamples.length / SAMPLE_RATE,
            energy
        };
    }

    /**
     * Resolve whisper-cli executable path
     * @private
     * @returns {string|null} Path to whisper-cli or null if not found
     */
    _resolveWhisperPath() {
        // Check WHISPER_CLI_PATH environment variable
        const envPath = process.env.WHISPER_CLI_PATH;
        if (envPath) {
            const candidates = [envPath, path.join(envPath, 'whisper-cli')];
            for (const candidate of candidates) {
                if (fs.existsSync(candidate)) return candidate;
            }
        }

        // Try 'which' command
        try {
            const whichOut = execSync('which whisper-cli', {encoding: 'utf8'}).trim();
            if (whichOut) return whichOut;
        } catch { /* not found via which */ }

        // Scan PATH manually
        const pathDirs = (process.env.PATH || '').split(path.delimiter).filter(Boolean);
        for (const dir of pathDirs) {
            const candidate = path.join(dir, 'whisper-cli');
            if (fs.existsSync(candidate)) return candidate;
        }

        return null;
    }

    /**
     * Transcribe audio file with Whisper (private implementation with timeout support)
     * @private
     * @param {string} modelRel - Path to Whisper model
     * @param {string} wavPath - Path to WAV file to transcribe
     * @param {Object} options - Options object
     * @param {number} options.timeoutMs - Timeout in milliseconds (default: WHISPER_PROCESS_DEFAULT_TIMEOUT_MS)
     * @returns {Promise<string>} Transcription text
     * @throws {Error} If transcription fails or times out
     */
    async _transcribeWithWhisper(modelRel, wavPath, options = {}) {
        const { timeoutMs = WHISPER_PROCESS_DEFAULT_TIMEOUT_MS } = options;

        return new Promise((resolve, reject) => {
            const whisperModelAbs = path.isAbsolute(modelRel) ? modelRel : path.resolve(process.cwd(), modelRel);
            const modelName = path.basename(whisperModelAbs);
            this.logger.debug(`Starting Whisper transcription with ${modelName}`, {
                wavPath,
                timeoutMs
            });

            const startTime = Date.now();
            const whisperCmd = this._resolveWhisperPath();
            const whisperArgs = ['-m', whisperModelAbs, '-f', wavPath, '-nt'];

            // Create AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
                this.logger.error('Whisper transcription timed out', {
                    model: modelName,
                    wavPath,
                    timeoutMs,
                    elapsed: Date.now() - startTime
                });
            }, timeoutMs);

            const whisper = whisperCmd
                ? spawn(whisperCmd, whisperArgs, {
                    env: process.env,
                    signal: controller.signal
                })
                : spawn('whisper-cli', whisperArgs, {
                    shell: true,
                    env: process.env,
                    signal: controller.signal
                });

            if (!whisper?.stdout) {
                clearTimeout(timeoutId);
                return reject(new Error('Failed to start whisper process'));
            }

            if (!whisperCmd) {
                this.logger.warn('whisper-cli not found via which/PATH — using shell fallback', {
                    WHISPER_CLI_PATH: process.env.WHISPER_CLI_PATH || '<not set>',
                    PATH: process.env.PATH ? process.env.PATH.substring(0, 100) + '...' : '<empty>'
                });
            }

            let stdout = '';
            let stderr = '';

            whisper.stdout.on('data', (data) => stdout += data.toString());
            whisper.stderr.on('data', (data) => stderr += data.toString());

            whisper.on('error', (err) => {
                clearTimeout(timeoutId);

                // Handle AbortError (timeout)
                if (err.name === 'AbortError') {
                    return reject(new Error(`Whisper transcription timed out after ${timeoutMs}ms`));
                }

                // Handle other errors
                const message = err.code === 'ENOENT'
                    ? `whisper-cli not found. Install it or set WHISPER_CLI_PATH. Model: ${whisperModelAbs}`
                    : err.message;
                reject(new Error(message));
            });

            whisper.on('close', (code) => {
                clearTimeout(timeoutId);
                const duration = Date.now() - startTime;

                if (code !== 0) {
                    reject(new Error(`whisper-cli exited ${code}: ${stderr}`));
                } else {
                    this.logger.debug(`Whisper transcription complete with ${modelName}`, {
                        duration: `${duration}ms`
                    });
                    resolve(stdout.trim());
                }
            });
        });
    }
}
