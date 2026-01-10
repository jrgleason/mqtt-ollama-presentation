import wav from "wav";
import {spawn} from 'child_process';
import {SAMPLE_RATE} from './constants.js';
import {logger} from '../util/Logger.js';
import {ALSA_CHECK_TIMEOUT_MS, WAV_WRITER_TIMEOUT_MS} from '../constants/timing.js';

/**
 * Calculate the root mean square (RMS) energy of audio samples
 *
 * @param {Float32Array|Array<number>} samples - Audio samples (Float32)
 * @returns {number} RMS energy value (0 if samples are empty or null)
 */
export const rmsEnergy = (samples) => {
    if (!samples || !samples.length) return 0;
    let e = 0;
    for (let i = 0; i < samples.length; i++) {
        e += samples[i] * samples[i];
    }
    return e / samples.length;
};

/**
 * Write PCM audio samples to a WAV file
 *
 * @param {string} wavPath - Output WAV file path
 * @param {Float32Array|Array<number>} samples - PCM audio samples (Float32)
 * @param {Object} options - WAV file options
 * @param {number} [options.channels=1] - Number of audio channels
 * @param {number} [options.sampleRate=16000] - Sample rate in Hz
 * @param {number} [options.bitDepth=16] - Bit depth (16 or 24)
 * @returns {Promise<void>} Resolves when file is written, rejects on error or timeout
 */
export const writeWavFile = async (wavPath, samples, {channels = 1, sampleRate = SAMPLE_RATE, bitDepth = 16} = {}) => {
    const writer = new wav.FileWriter(wavPath, {channels, sampleRate, bitDepth});

    // Convert Float32 samples to Int16
    const int16Audio = new Int16Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
        int16Audio[i] = Math.max(-32768, Math.min(32767, samples[i] * 32768));
    }

    writer.write(Buffer.from(int16Audio.buffer));
    writer.end();

    // Wait for file write to complete (with timeout)
    await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
        setTimeout(() => reject(new Error(`WAV writer timeout after ${WAV_WRITER_TIMEOUT_MS}ms`)), WAV_WRITER_TIMEOUT_MS);
    });
};

/**
 * Validate that an ALSA audio device is accessible
 *
 * @param {string} alsaDevice - ALSA device name (e.g., 'plughw:3,0')
 * @param {number} [rate=16000] - Sample rate to test
 * @param {number} [channels=1] - Number of channels to test
 * @returns {Promise<void>} Resolves if device is accessible, rejects on error
 * @throws {Error} If device is not found or timeout occurs
 */
export const checkAlsaDevice = async function (alsaDevice, rate = SAMPLE_RATE, channels = 1) {
    logger.debug(`🔍 Checking ALSA device: ${alsaDevice}`);

    await Promise.race([
        new Promise((resolve, reject) => {
            const arecord = spawn('arecord', [
                '-D', alsaDevice,
                '-f', 'S16_LE',
                '-r', String(rate),
                '-c', String(channels),
                '-d', '1',
                '/dev/null'
            ]);

            let stderr = '';
            let stdout = '';

            arecord.stdout.on('data', (d) => (stdout += d.toString()));
            arecord.stderr.on('data', (d) => (stderr += d.toString()));

            arecord.on('error', (err) => reject(err));
            arecord.on('exit', (code) => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`arecord exited with code ${code}: ${stderr}`));
                }
            });
        }),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`ALSA check timeout after ${ALSA_CHECK_TIMEOUT_MS}ms`)), ALSA_CHECK_TIMEOUT_MS)
        )
    ]);

    logger.debug(`✅ ALSA device check passed: ${alsaDevice}`);
};
