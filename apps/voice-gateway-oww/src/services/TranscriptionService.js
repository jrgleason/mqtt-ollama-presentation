import fs from 'fs';
import path from 'path';
import { SAMPLE_RATE } from '../audio/constants.js';
import { rmsEnergy, writeWavFile } from '../audio/AudioUtils.js';
import { transcribeWithWhisper } from '@jrg-voice/common';
import { errMsg } from '../util/Logger.js';

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
        this.minDuration = 0.15; // seconds
        this.minEnergy = 1e-6; // RMS energy threshold
        this.timeoutMs = 60000; // 60 seconds
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
            const transcription = await transcribeWithWhisper(
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
}
