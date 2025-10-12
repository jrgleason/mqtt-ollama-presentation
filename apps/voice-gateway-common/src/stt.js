import { spawn } from 'child_process';
import path from 'path';

export async function transcribeWithWhisper(modelRel, wavPath) {
  return new Promise((resolve, reject) => {
    try {
      const whisperModelAbs = path.isAbsolute(modelRel) ? modelRel : path.resolve(process.cwd(), modelRel);
      const whisper = spawn('whisper-cli', ['-m', whisperModelAbs, '-f', wavPath, '-nt']);
      let stdout = '';
      let stderr = '';
      whisper.stdout.on('data', (data) => { stdout += data.toString(); });
      whisper.stderr.on('data', (data) => { stderr += data.toString(); });
      whisper.on('error', (err) => reject(err));
      whisper.on('close', (code) => {
        if (code !== 0) {
          return reject(new Error(`whisper-cli exited ${code}: ${stderr}`));
        }
        return resolve(stdout.trim());
      });
    } catch (err) {
      reject(err);
    }
  });
}

