#!/usr/bin/env node

/**
 * Setup Script for Voice Gateway with OpenWakeWord
 *
 * Downloads required models and checks system requirements
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const MODELS_DIR = path.join(projectRoot, 'models');
const WHISPER_MODEL_URL = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin';
const WHISPER_MODEL_PATH = path.join(MODELS_DIR, 'ggml-base.bin');

// OpenWakeWord base URL
const OWW_BASE_URL = 'https://github.com/dscripka/openWakeWord/releases/download/v0.5.1';

// OpenWakeWord core models (required for all wake words)
const OWW_CORE_MODELS = [
  'melspectrogram.onnx',    // Audio preprocessing
  'embedding_model.onnx',   // Google speech embedding backbone
];

// OpenWakeWord wake word models
const OWW_WAKE_WORD_MODELS = {
  hey_jarvis: 'hey_jarvis_v0.1.onnx',
  alexa: 'alexa_v0.1.onnx',
  hey_mycroft: 'hey_mycroft_v0.1.onnx',
};

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`📥 Downloading ${path.basename(dest)}...`);
    const file = fs.createWriteStream(dest);

    https.get(url, (response) => {
      // Follow redirects
      if (response.statusCode === 302 || response.statusCode === 301) {
        file.close();
        fs.unlinkSync(dest);
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(`Failed to download: ${response.statusCode}`));
      }

      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloaded = 0;
      let lastPercent = 0;

      response.on('data', (chunk) => {
        downloaded += chunk.length;
        const percent = Math.floor((downloaded / totalSize) * 100);
        if (percent !== lastPercent && percent % 10 === 0) {
          console.log(`   ${percent}% (${(downloaded / 1024 / 1024).toFixed(1)}MB / ${(totalSize / 1024 / 1024).toFixed(1)}MB)`);
          lastPercent = percent;
        }
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log(`✅ Downloaded ${path.basename(dest)}`);
        resolve();
      });
    }).on('error', (err) => {
      file.close();
      fs.unlinkSync(dest);
      reject(err);
    });
  });
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed: ${command} ${args.join(' ')}`));
      } else {
        resolve();
      }
    });
  });
}

async function checkAudioDevices() {
  console.log('\n🎤 Checking audio devices...');
  try {
    await runCommand('arecord', ['-l']);
  } catch (err) {
    console.warn('⚠️  Warning: Could not list audio devices. Make sure ALSA is installed.');
  }
}

async function main() {
  console.log('🚀 Voice Gateway (OpenWakeWord) Setup\n');

  // Create models directory
  if (!fs.existsSync(MODELS_DIR)) {
    fs.mkdirSync(MODELS_DIR, { recursive: true });
    console.log('✅ Created models directory');
  }

  // Download Whisper model
  if (!fs.existsSync(WHISPER_MODEL_PATH)) {
    try {
      await downloadFile(WHISPER_MODEL_URL, WHISPER_MODEL_PATH);
    } catch (err) {
      console.error('❌ Failed to download Whisper model:', err.message);
      console.log('   You can manually download from:');
      console.log(`   ${WHISPER_MODEL_URL}`);
    }
  } else {
    console.log('✅ Whisper model already exists');
  }

  // Download OpenWakeWord core models (required for all wake words)
  console.log('\n📦 Downloading OpenWakeWord core models...');

  for (const modelFile of OWW_CORE_MODELS) {
    const modelPath = path.join(MODELS_DIR, modelFile);
    const modelUrl = `${OWW_BASE_URL}/${modelFile}`;

    if (!fs.existsSync(modelPath)) {
      try {
        await downloadFile(modelUrl, modelPath);
      } catch (err) {
        console.error(`❌ Failed to download ${modelFile}:`, err.message);
        console.log('   You can manually download from:');
        console.log(`   ${modelUrl}`);
      }
    } else {
      console.log(`✅ ${modelFile} already exists`);
    }
  }

  // Download OpenWakeWord wake word models
  console.log('\n🔊 Downloading wake word models...');

  for (const [name, modelFile] of Object.entries(OWW_WAKE_WORD_MODELS)) {
    const modelPath = path.join(MODELS_DIR, modelFile);
    const modelUrl = `${OWW_BASE_URL}/${modelFile}`;

    if (!fs.existsSync(modelPath)) {
      try {
        console.log(`\n   Downloading ${name}...`);
        await downloadFile(modelUrl, modelPath);
      } catch (err) {
        console.error(`❌ Failed to download ${name}:`, err.message);
        console.log('   You can manually download from:');
        console.log(`   ${modelUrl}`);
      }
    } else {
      console.log(`✅ ${name} already exists`);
    }
  }

  // Check audio devices
  await checkAudioDevices();

  // Test microphone
  console.log('\n🎙️  To test your microphone, run:');
  console.log('   arecord -D hw:2,0 -f S16_LE -r 16000 -c 1 -d 3 test.wav');
  console.log('   aplay test.wav');

  console.log('\n✅ Setup complete!');
  console.log('\nNext steps:');
  console.log('1. Copy .env.example to .env');
  console.log('2. Verify microphone device in .env (default: hw:2,0)');
  console.log('3. Run: npm run dev');
  console.log('\nNo API key required - OpenWakeWord is completely free! 🎉');
}

main().catch((err) => {
  console.error('❌ Setup failed:', err.message);
  process.exit(1);
});
