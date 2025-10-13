/**
 * Piper TTS Integration
 *
 * Local, offline text-to-speech using Piper via Python subprocess.
 */

import { spawn } from 'child_process';
import { writeFileSync, unlinkSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import wav from 'node-wav';
import { logger } from './logger.js';
import { config } from './config.js';
import { markdownToSpeech } from './markdown-to-speech.js';

/**
 * Generate speech from text using Piper TTS
 *
 * @param {string} text - Text to speak (can include markdown)
 * @param {Object} options - TTS options
 * @param {number} options.volume - Volume (0.0 to 1.0, default 1.0)
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

  logger.debug('🗣️ Synthesizing speech', {
    originalLength: text.length,
    speechLength: speechText.length,
    preview: speechText.substring(0, 50),
  });

  // Create temporary Python script
  const scriptPath = join(tmpdir(), `piper_${Date.now()}.py`);
  const wavPath = join(tmpdir(), `piper_${Date.now()}.wav`);

  const pythonScript = `
import sys
import wave
from piper import PiperVoice
from piper.config import SynthesisConfig

try:
    voice = PiperVoice.load("${config.tts.modelPath}")

    syn_config = SynthesisConfig(
        volume=${volume},
        length_scale=${1.0 / speed},  # Piper uses length_scale (inverse of speed)
        noise_scale=0.667,
        noise_w_scale=0.8,
        normalize_audio=True
    )

    with wave.open("${wavPath}", "wb") as wav_file:
        voice.synthesize_wav("""${speechText.replace(/"/g, '\\"')}""", wav_file, syn_config=syn_config)

    print("SUCCESS")
except Exception as e:
    print(f"ERROR: {str(e)}", file=sys.stderr)
    sys.exit(1)
`;

  writeFileSync(scriptPath, pythonScript);

  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const python = spawn('python3', [scriptPath]);
    let stderr = '';

    python.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    python.on('close', (code) => {
      // Clean up script
      try {
        unlinkSync(scriptPath);
      } catch (e) {
        // Ignore cleanup errors
      }

      if (code !== 0) {
        const error = new Error(`Piper TTS failed: ${stderr}`);
        logger.error('❌ TTS synthesis failed', {
          error: stderr,
          code,
        });
        reject(error);
        return;
      }

      // Read WAV file and convert to raw PCM
      try {
        const buffer = readFileSync(wavPath);
        const result = wav.decode(buffer);

        // Clean up WAV file
        try {
          unlinkSync(wavPath);
        } catch (e) {
          // Ignore cleanup errors
        }

        const duration = Date.now() - startTime;
        logger.debug('✅ TTS synthesis complete', {
          duration: `${duration}ms`,
          sampleRate: result.sampleRate,
          channels: result.channelData.length,
          samples: result.channelData[0].length,
        });

        // Convert float32 audio to int16 PCM
        const float32Audio = result.channelData[0]; // Use first channel
        const int16Audio = Buffer.alloc(float32Audio.length * 2);

        for (let i = 0; i < float32Audio.length; i++) {
          const sample = Math.max(-1, Math.min(1, float32Audio[i]));
          const int16Sample = Math.floor(sample * 32767);
          int16Audio.writeInt16LE(int16Sample, i * 2);
        }

        resolve(int16Audio);
      } catch (error) {
        logger.error('❌ Failed to read TTS output', {
          error: error.message,
        });
        reject(error);
      }
    });

    python.on('error', (error) => {
      try {
        unlinkSync(scriptPath);
      } catch (e) {
        // Ignore cleanup errors
      }

      logger.error('❌ Failed to spawn Python process', {
        error: error.message,
      });
      reject(error);
    });
  });
}

/**
 * Check if Piper TTS is available and configured correctly
 *
 * @returns {Promise<boolean>} True if Piper is ready
 */
async function checkPiperHealth() {
  try {
    // Check if Python 3 is available
    await new Promise((resolve, reject) => {
      const python = spawn('python3', ['--version']);
      python.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error('Python 3 not found'));
        }
      });
      python.on('error', reject);
    });

    // Check if piper-tts is installed
    await new Promise((resolve, reject) => {
      const python = spawn('python3', ['-c', 'import piper']);
      python.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error('piper-tts not installed'));
        }
      });
      python.on('error', reject);
    });

    // Check if model file exists
    if (!existsSync(config.tts.modelPath)) {
      logger.warn('⚠️ Piper model not found', {
        modelPath: config.tts.modelPath,
      });
      return false;
    }

    logger.debug('✅ Piper TTS health check passed');
    return true;
  } catch (error) {
    logger.error('❌ Piper TTS health check failed', {
      error: error.message,
    });
    return false;
  }
}

export { synthesizeSpeech, checkPiperHealth };
