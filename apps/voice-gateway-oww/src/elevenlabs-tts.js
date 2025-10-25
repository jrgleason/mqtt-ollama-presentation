/**
 * ElevenLabs TTS Integration
 *
 * Cloud-based text-to-speech using ElevenLabs API with streaming support.
 */

import {ElevenLabsClient} from '@elevenlabs/elevenlabs-js';
import {logger} from './logger.js';
import {config} from './config.js';
import {markdownToSpeech} from './markdown-to-speech.js';

// Initialize ElevenLabs client
let elevenLabsClient = null;

/**
 * Initialize the ElevenLabs client
 * @returns {ElevenLabsClient}
 */
function getClient() {
    if (!elevenLabsClient) {
        logger.debug('🔧 Initializing ElevenLabs client', {
            hasApiKey: !!config.elevenlabs?.apiKey,
            apiKeyLength: config.elevenlabs?.apiKey?.length || 0,
            apiKeyPreview: config.elevenlabs?.apiKey
                ? `${config.elevenlabs.apiKey.substring(0, 8)}...`
                : 'NOT_SET',
            voiceId: config.elevenlabs?.voiceId,
            modelId: config.elevenlabs?.modelId,
        });

        if (!config.elevenlabs?.apiKey) {
            logger.error('❌ ElevenLabs API key not configured', {
                configKeys: Object.keys(config),
                elevenLabsConfig: config.elevenlabs,
            });
            throw new Error('ElevenLabs API key not configured');
        }

        elevenLabsClient = new ElevenLabsClient({
            apiKey: config.elevenlabs.apiKey,
        });

        logger.debug('✅ ElevenLabs client initialized successfully');
    }
    return elevenLabsClient;
}

/**
 * Convert MP3 audio buffer to 16kHz PCM (S16LE)
 * Uses ffmpeg to decode MP3 and resample to match the audio playback format
 *
 * @param {Buffer} mp3Buffer - MP3 audio data
 * @returns {Promise<Buffer>} Raw 16kHz PCM audio buffer (S16LE)
 */
async function convertMP3ToPCM(mp3Buffer) {
    const {spawn} = await import('child_process');
    const {tmpdir} = await import('os');
    const {join} = await import('path');
    const {writeFileSync, unlinkSync, readFileSync} = await import('fs');

    const mp3Path = join(tmpdir(), `elevenlabs_${Date.now()}.mp3`);
    const pcmPath = join(tmpdir(), `elevenlabs_${Date.now()}.pcm`);

    logger.debug('🔄 Converting MP3 to PCM', {
        mp3Size: mp3Buffer.length,
        mp3Path,
        pcmPath,
        tmpdir: tmpdir(),
    });

    // Write MP3 to temp file
    writeFileSync(mp3Path, mp3Buffer);
    logger.debug('✅ MP3 file written', {mp3Path, size: mp3Buffer.length});

    return new Promise((resolve, reject) => {
        // Use ffmpeg to convert MP3 to 16kHz 16-bit PCM
        const ffmpegArgs = [
            '-i', mp3Path,
            '-f', 's16le',        // 16-bit signed little-endian PCM
            '-acodec', 'pcm_s16le',
            '-ar', '16000',        // 16kHz sample rate
            '-ac', '1',            // Mono
            pcmPath,
            '-y',                  // Overwrite output file
        ];

        logger.debug('🎬 Starting ffmpeg conversion', {
            command: 'ffmpeg',
            args: ffmpegArgs,
        });

        const ffmpeg = spawn('ffmpeg', ffmpegArgs);

        let stderr = '';
        ffmpeg.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        ffmpeg.on('close', (code) => {
            logger.debug('🎬 ffmpeg process closed', {
                exitCode: code,
                stderrLength: stderr.length,
                stderrPreview: stderr.substring(0, 200),
            });

            // Clean up MP3 file
            try {
                unlinkSync(mp3Path);
                logger.debug('🗑️ Cleaned up MP3 file', {mp3Path});
            } catch (e) {
                logger.warn('⚠️ Failed to clean up MP3 file', {mp3Path, error: e.message});
            }

            if (code !== 0) {
                logger.error('❌ ffmpeg conversion failed', {
                    exitCode: code,
                    stderr,
                    mp3Path,
                    pcmPath,
                });
                try {
                    unlinkSync(pcmPath);
                } catch (e) {
                    // Ignore cleanup errors
                }
                reject(new Error(`ffmpeg conversion failed (exit code ${code}): ${stderr}`));
                return;
            }

            try {
                const pcmBuffer = readFileSync(pcmPath);
                logger.debug('✅ PCM file read successfully', {
                    pcmPath,
                    size: pcmBuffer.length,
                    samples: pcmBuffer.length / 2,
                    durationMs: (pcmBuffer.length / 2 / 16000 * 1000).toFixed(2),
                });

                // Clean up PCM file
                try {
                    unlinkSync(pcmPath);
                    logger.debug('🗑️ Cleaned up PCM file', {pcmPath});
                } catch (e) {
                    logger.warn('⚠️ Failed to clean up PCM file', {pcmPath, error: e.message});
                }

                resolve(pcmBuffer);
            } catch (error) {
                logger.error('❌ Failed to read PCM file', {
                    pcmPath,
                    error: error.message,
                    stack: error.stack,
                });
                reject(error);
            }
        });

        ffmpeg.on('error', (error) => {
            try {
                unlinkSync(mp3Path);
                unlinkSync(pcmPath);
            } catch {
                // Ignore cleanup errors
            }
            reject(error);
        });
    });
}

/**
 * Generate speech from text using ElevenLabs TTS with streaming
 *
 * @param {string} text - Text to speak (can include markdown)
 * @param {Object} options - TTS options
 * @param {number} options.volume - Volume (0.0 to 1.0, default 1.0) - applied during playback
 * @param {number} options.speed - Speed multiplier (0.5 = slower, 2.0 = faster, default 1.0)
 * @returns {Promise<Buffer>} Raw 16kHz PCM audio buffer (S16LE)
 */
async function synthesizeSpeech(text, options = {}) {
    const volume = options.volume || 1.0;
    const speed = options.speed || 1.0;

    // Convert markdown to speech-friendly text
    const speechText = markdownToSpeech(text);

    if (!speechText) {
        logger.warn('⚠️ Empty text after markdown conversion');
        return Buffer.alloc(0);
    }

    logger.debug('🗣️ Synthesizing speech with ElevenLabs', {
        originalLength: text.length,
        speechLength: speechText.length,
        preview: speechText.substring(0, 50),
        speed: speed,
        volume: volume,
        voiceId: config.elevenlabs.voiceId,
        modelId: config.elevenlabs.modelId,
    });

    const startTime = Date.now();

    try {
        const client = getClient();

        logger.debug('🌐 Calling ElevenLabs API', {
            voiceId: config.elevenlabs.voiceId,
            modelId: config.elevenlabs.modelId,
            textPreview: speechText.substring(0, 100),
            outputFormat: 'mp3_44100_128',
            voiceSettings: {
                stability: config.elevenlabs.stability || 0.5,
                similarity_boost: config.elevenlabs.similarityBoost || 0.75,
                style: config.elevenlabs.style || 0.0,
                use_speaker_boost: config.elevenlabs.useSpeakerBoost || true,
            },
        });

        // Use streaming API for lower latency
        const audioStream = await client.textToSpeech.stream(config.elevenlabs.voiceId, {
            text: speechText,
            model_id: config.elevenlabs.modelId,
            output_format: 'mp3_44100_128', // High-quality MP3
            voice_settings: {
                stability: config.elevenlabs.stability || 0.5,
                similarity_boost: config.elevenlabs.similarityBoost || 0.75,
                style: config.elevenlabs.style || 0.0,
                use_speaker_boost: config.elevenlabs.useSpeakerBoost || true,
            },
        });

        logger.debug('✅ ElevenLabs API call initiated, receiving stream...');

        // Collect all audio chunks
        const chunks = [];
        let chunkCount = 0;
        for await (const chunk of audioStream) {
            chunkCount++;
            chunks.push(chunk);
            logger.debug(`📦 Received chunk ${chunkCount}`, {
                chunkSize: chunk.length,
                totalSize: chunks.reduce((sum, c) => sum + c.length, 0),
            });
        }

        const mp3Buffer = Buffer.concat(chunks);
        const duration = Date.now() - startTime;

        logger.debug('✅ ElevenLabs streaming complete', {
            duration: `${duration}ms`,
            totalChunks: chunkCount,
            mp3Size: mp3Buffer.length,
            mp3SizeKB: (mp3Buffer.length / 1024).toFixed(2),
        });

        // Convert MP3 to PCM format matching Piper output
        logger.debug('🔄 Converting MP3 to PCM...');
        const pcmBuffer = await convertMP3ToPCM(mp3Buffer);

        // Apply volume adjustment if needed
        let finalBuffer = pcmBuffer;
        if (volume !== 1.0) {
            logger.debug('🔊 Applying volume adjustment', {volume});
            const samples = new Int16Array(
                pcmBuffer.buffer,
                pcmBuffer.byteOffset,
                pcmBuffer.length / 2
            );
            const adjustedBuffer = Buffer.alloc(pcmBuffer.length);
            const adjustedSamples = new Int16Array(
                adjustedBuffer.buffer,
                adjustedBuffer.byteOffset,
                adjustedBuffer.length / 2
            );

            for (let i = 0; i < samples.length; i++) {
                const adjusted = samples[i] * volume;
                adjustedSamples[i] = Math.max(-32768, Math.min(32767, adjusted));
            }

            finalBuffer = adjustedBuffer;
            logger.debug('✅ Volume adjustment complete');
        }

        const totalDuration = Date.now() - startTime;
        logger.info('✅ TTS synthesis complete', {
            totalDuration: `${totalDuration}ms`,
            pcmSize: finalBuffer.length,
            samples: finalBuffer.length / 2,
            durationSeconds: (finalBuffer.length / 2 / 16000).toFixed(2),
        });

        return finalBuffer;
    } catch (error) {
        logger.error('❌ ElevenLabs TTS failed', {
            error: error.message,
            errorName: error.name,
            errorCode: error.code,
            stack: error.stack,
            voiceId: config.elevenlabs?.voiceId,
            modelId: config.elevenlabs?.modelId,
            hasApiKey: !!config.elevenlabs?.apiKey,
        });
        throw error;
    }
}

/**
 * Generate speech with timing information using ElevenLabs streaming with timestamps
 *
 * @param {string} text - Text to speak
 * @param {Object} options - TTS options
 * @returns {Promise<{audio: Buffer, alignment: Object}>} PCM audio and character alignment data
 */
async function synthesizeSpeechWithTimestamps(text, options = {}) {
    const volume = options.volume || 1.0;

    // Convert markdown to speech-friendly text
    const speechText = markdownToSpeech(text);

    if (!speechText) {
        logger.warn('⚠️ Empty text after markdown conversion');
        return {audio: Buffer.alloc(0), alignment: null};
    }

    logger.debug('🗣️ Synthesizing speech with timestamps (ElevenLabs)', {
        originalLength: text.length,
        speechLength: speechText.length,
        preview: speechText.substring(0, 50),
        voiceId: config.elevenlabs.voiceId,
    });

    const startTime = Date.now();

    try {
        const client = getClient();

        // Use the stream-with-timestamps endpoint
        const response = await client.textToSpeech.convertWithTimestamps(config.elevenlabs.voiceId, {
            text: speechText,
            model_id: config.elevenlabs.modelId,
            output_format: 'mp3_44100_128',
            voice_settings: {
                stability: config.elevenlabs.stability || 0.5,
                similarity_boost: config.elevenlabs.similarityBoost || 0.75,
            },
        });

        // Response contains base64 audio chunks and alignment data
        const audioChunks = [];
        const alignments = [];

        for await (const chunk of response) {
            if (chunk.audio_base64) {
                audioChunks.push(Buffer.from(chunk.audio_base64, 'base64'));
            }
            if (chunk.alignment) {
                alignments.push(chunk.alignment);
            }
        }

        const mp3Buffer = Buffer.concat(audioChunks);
        const duration = Date.now() - startTime;

        logger.debug('✅ ElevenLabs streaming with timestamps complete', {
            duration: `${duration}ms`,
            mp3Size: mp3Buffer.length,
            alignmentChunks: alignments.length,
        });

        // Convert MP3 to PCM
        const pcmBuffer = await convertMP3ToPCM(mp3Buffer);

        // Apply volume adjustment
        let finalBuffer = pcmBuffer;
        if (volume !== 1.0) {
            const samples = new Int16Array(
                pcmBuffer.buffer,
                pcmBuffer.byteOffset,
                pcmBuffer.length / 2
            );
            const adjustedBuffer = Buffer.alloc(pcmBuffer.length);
            const adjustedSamples = new Int16Array(
                adjustedBuffer.buffer,
                adjustedBuffer.byteOffset,
                adjustedBuffer.length / 2
            );

            for (let i = 0; i < samples.length; i++) {
                const adjusted = samples[i] * volume;
                adjustedSamples[i] = Math.max(-32768, Math.min(32767, adjusted));
            }

            finalBuffer = adjustedBuffer;
        }

        // Merge all alignment data
        const mergedAlignment = alignments.length > 0 ? alignments[0] : null;

        return {
            audio: finalBuffer,
            alignment: mergedAlignment,
        };
    } catch (error) {
        logger.error('❌ ElevenLabs TTS with timestamps failed', {
            error: error.message,
            stack: error.stack,
        });
        throw error;
    }
}

/**
 * Check if ElevenLabs TTS is available and configured correctly
 *
 * @returns {Promise<boolean>} True if ElevenLabs is ready
 */
async function checkElevenLabsHealth() {
    logger.info('🏥 Starting ElevenLabs TTS health check...');

    try {
        // Check API key
        logger.debug('Checking ElevenLabs API key...', {
            hasApiKey: !!config.elevenlabs?.apiKey,
            apiKeyLength: config.elevenlabs?.apiKey?.length || 0,
            apiKeyPreview: config.elevenlabs?.apiKey
                ? `${config.elevenlabs.apiKey.substring(0, 8)}...`
                : 'NOT_SET',
        });

        if (!config.elevenlabs?.apiKey) {
            logger.error('❌ ElevenLabs API key not configured', {
                envVar: 'ELEVENLABS_API_KEY',
                configPath: 'config.elevenlabs.apiKey',
            });
            return false;
        }

        // Check voice ID
        logger.debug('Checking ElevenLabs voice ID...', {
            hasVoiceId: !!config.elevenlabs?.voiceId,
            voiceId: config.elevenlabs?.voiceId || 'NOT_SET',
        });

        if (!config.elevenlabs?.voiceId) {
            logger.error('❌ ElevenLabs voice ID not configured', {
                envVar: 'ELEVENLABS_VOICE_ID',
                configPath: 'config.elevenlabs.voiceId',
            });
            return false;
        }

        // Check model ID
        logger.debug('Checking ElevenLabs model ID...', {
            modelId: config.elevenlabs?.modelId || 'NOT_SET',
        });

        // Check if ffmpeg is available
        logger.debug('Checking ffmpeg installation...');
        const {spawn} = await import('child_process');
        await new Promise((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', ['-version']);
            let stdout = '';

            ffmpeg.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            ffmpeg.on('close', (code) => {
                if (code === 0) {
                    const versionMatch = stdout.match(/ffmpeg version ([^\s]+)/);
                    const version = versionMatch ? versionMatch[1] : 'unknown';
                    logger.debug('✅ ffmpeg found', {version});
                    resolve();
                } else {
                    reject(new Error('ffmpeg not found or returned non-zero exit code'));
                }
            });
            ffmpeg.on('error', (err) => {
                reject(new Error(`ffmpeg spawn error: ${err.message}`));
            });
        });

        logger.info('✅ ElevenLabs TTS health check passed', {
            apiKey: '✓',
            voiceId: config.elevenlabs.voiceId,
            modelId: config.elevenlabs.modelId,
            ffmpeg: '✓',
        });
        return true;
    } catch (error) {
        logger.error('❌ ElevenLabs TTS health check failed', {
            error: error.message,
            errorName: error.name,
            stack: error.stack,
        });
        return false;
    }
}

export {synthesizeSpeech, synthesizeSpeechWithTimestamps, checkElevenLabsHealth};
