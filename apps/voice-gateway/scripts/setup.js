#!/usr/bin/env node

/**
 * Voice Gateway Setup Script
 *
 * Downloads Whisper model and tests audio devices
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');
const modelsDir = resolve(rootDir, 'models');

console.log('🚀 Voice Gateway Setup\n');

// Step 1: Create models directory
console.log('📁 Creating models directory...');
if (!existsSync(modelsDir)) {
  mkdirSync(modelsDir, { recursive: true });
  console.log('✅ Models directory created\n');
} else {
  console.log('✅ Models directory exists\n');
}

// Step 2: Check ALSA installation
console.log('🔊 Checking ALSA installation...');
try {
  execSync('which arecord', { stdio: 'ignore' });
  console.log('✅ ALSA utils installed\n');
} catch (error) {
  console.log('❌ ALSA utils not found');
  console.log('Install with: sudo apt-get install alsa-utils\n');
  process.exit(1);
}

// Step 3: List audio devices
console.log('🎤 Detecting audio devices...');
try {
  console.log('Capture devices (microphones):');
  const captureDevices = execSync('arecord -l', { encoding: 'utf-8' });
  console.log(captureDevices);

  console.log('Playback devices (speakers):');
  try {
    const playbackDevices = execSync('aplay -l', { encoding: 'utf-8' });
    console.log(playbackDevices);
  } catch (e) {
    console.log('No playback devices found (OK for MVP - TTS deferred)\n');
  }
} catch (error) {
  console.log('⚠️  Warning: Could not list audio devices');
  console.log('Check permissions: sudo usermod -aG audio $USER\n');
}

// Step 4: Download Whisper model
const modelPath = resolve(modelsDir, 'ggml-base.bin');
const modelUrl = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin';

if (existsSync(modelPath)) {
  console.log('✅ Whisper base model already downloaded\n');
} else {
  console.log('📥 Downloading Whisper base model (~74MB)...');
  console.log('This may take 30-60 seconds depending on your connection.\n');

  const file = fs.createWriteStream(modelPath);

  https.get(modelUrl, (response) => {
    const totalSize = parseInt(response.headers['content-length'], 10);
    let downloadedSize = 0;
    let lastPercent = 0;

    response.on('data', (chunk) => {
      downloadedSize += chunk.length;
      const percent = Math.floor((downloadedSize / totalSize) * 100);

      if (percent > lastPercent) {
        process.stdout.write(`\rDownloading: ${percent}%`);
        lastPercent = percent;
      }
    });

    response.pipe(file);

    file.on('finish', () => {
      file.close();
      console.log('\n✅ Whisper model downloaded successfully\n');
      testMicrophone();
    });
  }).on('error', (error) => {
    fs.unlinkSync(modelPath);
    console.error('❌ Download failed:', error.message);
    console.log('\nTry downloading manually from:');
    console.log(modelUrl);
    process.exit(1);
  });
}

// Step 5: Test microphone (if model already exists)
if (existsSync(modelPath)) {
  testMicrophone();
}

function testMicrophone() {
  console.log('🧪 Testing microphone...');
  console.log('Recording 3 seconds of audio. Please speak into the microphone.\n');

  try {
    const testFile = '/tmp/voice-gateway-test.wav';
    execSync(`arecord -D hw:2,0 -f S16_LE -r 16000 -c 1 -d 3 ${testFile}`, {
      stdio: 'inherit',
    });

    console.log('\n✅ Microphone test successful');
    console.log(`Test recording saved to: ${testFile}`);
    console.log('Play it back with: aplay ' + testFile + '\n');

    // Cleanup
    setTimeout(() => {
      if (existsSync(testFile)) {
        fs.unlinkSync(testFile);
      }
    }, 5000);

    printNextSteps();
  } catch (error) {
    console.log('\n⚠️  Microphone test failed');
    console.log('Check your .env file: ALSA_MIC_DEVICE=hw:2,0');
    console.log('Or try a different device from the list above.\n');

    printNextSteps();
  }
}

function printNextSteps() {
  console.log('🎉 Setup complete!\n');
  console.log('Next steps:');
  console.log('1. Sign up for Picovoice account: https://console.picovoice.ai');
  console.log('2. Get your Access Key (free tier)');
  console.log('3. Create .env file: cp .env.example .env');
  console.log('4. Add your key: PORCUPINE_ACCESS_KEY=your_key_here');
  console.log('5. Run voice gateway: npm run dev\n');
  console.log('See README.md for detailed instructions.');
}
