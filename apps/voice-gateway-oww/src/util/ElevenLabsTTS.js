/**
 * ElevenLabs TTS Integration (Class-based)
 *
 * Cloud-based text-to-speech using ElevenLabs API with streaming support.
 */

import {ElevenLabsClient} from '@elevenlabs/elevenlabs-js';
import {markdownToSpeech} from '../markdownToSpeech.js';
import {spawn} from 'child_process';
import {tmpdir} from 'os';
import {join} from 'path';
import {readFileSync, unlinkSync, writeFileSync} from 'fs';

export class ElevenLabsTTS {
    #client = null;

    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
    }

    /** Get or initialize ElevenLabs client */
    get client() {
        if (!this.#client) {
            if (!this.config.elevenlabs?.apiKey) {
                this.logger.error('❌ ElevenLabs API key not configured');
                throw new Error('ElevenLabs API key missing');
            }
            this.#client = new ElevenLabsClient({apiKey: this.config.elevenlabs.apiKey});
            this.logger.debug('✅ ElevenLabs client initialized');
        }
        return this.#client;
    }

    /** Convert MP3 buffer to 16kHz PCM */
    async convertMP3ToPCM(mp3Buffer) {
        const mp3Path = join(tmpdir(), `elevenlabs_${Date.now()}.mp3`);
        const pcmPath = join(tmpdir(), `elevenlabs_${Date.now()}.pcm`);

        writeFileSync(mp3Path, mp3Buffer);

        return new Promise((resolve, reject) => {
            const ffmpegArgs = [
                '-i', mp3Path,
                '-f', 's16le',
                '-acodec', 'pcm_s16le',
                '-ar', '16000',
                '-ac', '1',
                pcmPath,
                '-y'
            ];

            const ffmpeg = spawn('ffmpeg', ffmpegArgs);

            let stderr = '';
            ffmpeg.stderr.on('data', (data) => stderr += data.toString());

            ffmpeg.on('close', (code) => {
                unlinkSync(mp3Path);
                if (code !== 0) {
                    try {
                        unlinkSync(pcmPath);
                    } catch {
                        // Ignore cleanup errors
                    }
                    return reject(new Error(`ffmpeg failed (code ${code}): ${stderr}`));
                }

                try {
                    const pcmBuffer = readFileSync(pcmPath);
                    unlinkSync(pcmPath);
                    resolve(pcmBuffer);
                } catch (err) {
                    reject(err);
                }
            });

            ffmpeg.on('error', (err) => {
                try {
                    unlinkSync(mp3Path);
                    unlinkSync(pcmPath);
                } catch {
                    // Ignore cleanup errors
                }
                reject(err);
            });
        });
    }

    /** Apply volume adjustment to PCM buffer */
    applyVolume(pcmBuffer, volume) {
        if (volume === 1.0) return pcmBuffer;

        const samples = new Int16Array(pcmBuffer.buffer, pcmBuffer.byteOffset, pcmBuffer.length / 2);
        const adjustedBuffer = Buffer.alloc(pcmBuffer.length);
        const adjustedSamples = new Int16Array(adjustedBuffer.buffer, adjustedBuffer.byteOffset, adjustedBuffer.length / 2);

        for (let i = 0; i < samples.length; i++) {
            const adjusted = samples[i] * volume;
            adjustedSamples[i] = Math.max(-32768, Math.min(32767, adjusted));
        }

        return adjustedBuffer;
    }

    /** Generate speech from text (streaming) */
    async synthesizeSpeech(text, options = {}) {
        const volume = options.volume ?? 1.0;
<<<<<<< HEAD
        // Note: ElevenLabs API does not support speed adjustment
        // Speed control is only available through Piper TTS (local)
=======
        // const speed = options.speed ?? 1.0; // TODO: Implement speed adjustment
>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)
        const speechText = markdownToSpeech(text);

        if (!speechText) {
            this.logger.warn('⚠️ Empty text after markdown conversion');
            return Buffer.alloc(0);
        }

        const startTime = Date.now();

        try {
            const audioStream = await this.client.textToSpeech.stream(this.config.elevenlabs.voiceId, {
                text: speechText,
                model_id: this.config.elevenlabs.modelId,
                output_format: 'mp3_44100_128',
                voice_settings: {
                    stability: this.config.elevenlabs.stability ?? 0.5,
                    similarity_boost: this.config.elevenlabs.similarityBoost ?? 0.75,
                    style: this.config.elevenlabs.style ?? 0.0,
                    use_speaker_boost: this.config.elevenlabs.useSpeakerBoost ?? true,
                },
            });

            const chunks = [];
            for await (const chunk of audioStream) {
                chunks.push(chunk);
            }

            const mp3Buffer = Buffer.concat(chunks);
            let pcmBuffer = await this.convertMP3ToPCM(mp3Buffer);
            pcmBuffer = this.applyVolume(pcmBuffer, volume);

            this.logger.info('✅ TTS synthesis complete', {
                textPreview: speechText.substring(0, 50),
                durationMs: Date.now() - startTime,
                pcmSize: pcmBuffer.length,
            });

            return pcmBuffer;
        } catch (err) {
            this.logger.error('❌ ElevenLabs TTS failed', {error: err.message});
            throw err;
        }
    }

    /** Generate speech with timestamps */
    async synthesizeSpeechWithTimestamps(text, options = {}) {
        const volume = options.volume ?? 1.0;
        const speechText = markdownToSpeech(text);

        if (!speechText) {
            this.logger.warn('⚠️ Empty text after markdown conversion');
            return {audio: Buffer.alloc(0), alignment: null};
        }

        try {
            const response = await this.client.textToSpeech.convertWithTimestamps(this.config.elevenlabs.voiceId, {
                text: speechText,
                model_id: this.config.elevenlabs.modelId,
                output_format: 'mp3_44100_128',
                voice_settings: {
                    stability: this.config.elevenlabs.stability ?? 0.5,
                    similarity_boost: this.config.elevenlabs.similarityBoost ?? 0.75,
                },
            });

            const audioChunks = [];
            const alignments = [];

            for await (const chunk of response) {
                if (chunk.audio_base64) audioChunks.push(Buffer.from(chunk.audio_base64, 'base64'));
                if (chunk.alignment) alignments.push(chunk.alignment);
            }

            const mp3Buffer = Buffer.concat(audioChunks);
            let pcmBuffer = await this.convertMP3ToPCM(mp3Buffer);
            pcmBuffer = this.applyVolume(pcmBuffer, volume);

            return {audio: pcmBuffer, alignment: alignments.length ? alignments[0] : null};
        } catch (err) {
            this.logger.error('❌ ElevenLabs TTS with timestamps failed', {error: err.message});
            throw err;
        }
    }

    /** Health check */
    async checkHealth() {
        this.logger.info('🏥 Starting ElevenLabs TTS health check...');

        if (!this.config.elevenlabs?.apiKey) {
            this.logger.error('❌ ElevenLabs API key missing');
            return false;
        }
        if (!this.config.elevenlabs?.voiceId) {
            this.logger.error('❌ ElevenLabs voice ID missing');
            return false;
        }

        const {spawn} = await import('child_process');
        try {
            await new Promise((resolve, reject) => {
                const ffmpeg = spawn('ffmpeg', ['-version']);
                ffmpeg.on('close', (code) => code === 0 ? resolve() : reject(new Error('ffmpeg not found')));
                ffmpeg.on('error', reject);
            });
        } catch (err) {
            this.logger.error('❌ ffmpeg not available', {error: err.message});
            return false;
        }

        this.logger.info('✅ ElevenLabs TTS health check passed');
        return true;
    }
}