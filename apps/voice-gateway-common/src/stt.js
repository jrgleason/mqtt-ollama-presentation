import {execSync, spawn} from 'child_process';
import path from 'path';
import fs from 'fs';

export async function transcribeWithWhisper(modelRel, wavPath) {
    return new Promise((resolve, reject) => {
        try {
            const whisperModelAbs = path.isAbsolute(modelRel) ? modelRel : path.resolve(process.cwd(), modelRel);
            const modelName = path.basename(whisperModelAbs);
            console.log(`🎤 [Whisper] Starting transcription with ${modelName}`);
            const startTime = Date.now();

            // Try to resolve whisper-cli absolute path
            function resolveWhisperPath() {
                // log env override for debugging
                const envPath = process.env.WHISPER_CLI_PATH;
                if (envPath) {
                    try {
                        if (fs.existsSync(envPath)) return envPath;
                        const maybe = path.join(envPath, 'whisper-cli');
                        if (fs.existsSync(maybe)) return maybe;
                    } catch (e) { /* ignore */
                    }
                }

                try {
                    const whichOut = execSync('which whisper-cli', {encoding: 'utf8'}).trim();
                    if (whichOut) return whichOut;
                } catch (e) { /* ignore */
                }
                const pathEnv = process.env.PATH || '';
                const parts = pathEnv.split(path.delimiter).filter(Boolean);
                for (const p of parts) {
                    try {
                        const candidate = path.join(p, 'whisper-cli');
                        if (fs.existsSync(candidate)) return candidate;
                    } catch (e) { /* ignore */
                    }
                }
                return null;
            }

            const whisperCmd = resolveWhisperPath();
            const whisperArgs = ['-m', whisperModelAbs, '-f', wavPath, '-nt'];
            let whisper;

            if (whisperCmd) {
                console.info(`[stt] using whisper executable: ${whisperCmd}`);
                whisper = spawn(whisperCmd, whisperArgs, {env: process.env});
            } else {
                console.warn('[stt] whisper-cli not found via which/PATH scan — spawning via shell as fallback');
                console.info(`[stt] WHISPER_CLI_PATH=${process.env.WHISPER_CLI_PATH || '<not set>'} PATH=${process.env.PATH || '<empty>'}`);
                whisper = spawn('whisper-cli', whisperArgs, {shell: true, env: process.env});
            }

            if (!whisper || !whisper.stdout) {
                return reject(new Error('Failed to start whisper process (no child process created or no stdout).'));
            }

            let stdout = '';
            let stderr = '';
            whisper.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            whisper.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            whisper.on('error', (err) => {
                if (err && err.code === 'ENOENT') {
                    return reject(new Error(`whisper-cli executable not found (ENOENT). Ensure whisper-cli is installed and available in PATH or set WHISPER_CLI_PATH. Resolved model: ${whisperModelAbs}`));
                }
                return reject(err);
            });
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
