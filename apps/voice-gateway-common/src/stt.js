import { spawn } from 'child_process';
import path from 'path';

export async function transcribeWithWhisper(modelRel, wavPath) {
  return new Promise((resolve, reject) => {
    try {
      const whisperModelAbs = path.isAbsolute(modelRel) ? modelRel : path.resolve(process.cwd(), modelRel);
      const modelName = path.basename(whisperModelAbs);
      console.log(`🎤 [Whisper] Starting transcription with ${modelName}`);
      const startTime = Date.now();
      const whisper = spawn('whisper-cli', ['-m', whisperModelAbs, '-f', wavPath, '-nt']);
      let stdout = '';
      let stderr = '';
      whisper.stdout.on('data', (data) => { stdout += data.toString(); });
      whisper.stderr.on('data', (data) => { stderr += data.toString(); });
      whisper.on('error', (err) => reject(err));
      whisper.on('close', (code) => {
        const duration = Date.now() - startTime;
        if (code !== 0) {
          return reject(new Error(`whisper-cli exited ${code}: ${stderr}`));
        }
        console.log(`✅ [Whisper] Transcription complete with ${modelName} in ${duration}ms`);
        return resolve(stdout.trim());
      });
    } catch (err) {
      reject(err);
    }
  });
}

