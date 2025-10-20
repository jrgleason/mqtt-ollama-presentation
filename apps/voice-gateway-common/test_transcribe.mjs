import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Adjust these paths if your environment stores models/wavs elsewhere
const modelRel = process.env.WHISPER_TEST_MODEL || 'models/ggml-tiny.bin';
const wavRel = process.env.WHISPER_TEST_WAV || '../voice-gateway-oww/recorded_bg_1760378566417.wav';

(async () => {
  try {
    const sttPath = path.resolve(__dirname, './src/stt.js');
    console.log(`Loading STT module from ${sttPath}`);
    const { transcribeWithWhisper } = await import(`file://${sttPath}`);

    const modelPath = path.resolve(process.cwd(), modelRel);
    const wavPath = path.resolve(__dirname, wavRel);

    console.log(`Using model: ${modelPath}`);
    console.log(`Using wav:   ${wavPath}`);

    if (!fs.existsSync(wavPath)) {
      console.error('WAV file not found — update WHISPER_TEST_WAV or place a WAV at the path. Aborting.');
      process.exit(2);
    }

    const result = await transcribeWithWhisper(modelPath, wavPath).catch((e) => { throw e; });
    console.log('Transcription result:\n', result);
  } catch (err) {
    console.error('Test failed with error:');
    console.error(err);
    process.exit(1);
  }
})();
