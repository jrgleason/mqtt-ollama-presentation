import {execSync, spawn} from 'child_process';
import path from 'path';
import fs from 'fs';

function resolveWhisperPath() {
    // Check WHISPER_CLI_PATH environment variable
    const envPath = process.env.WHISPER_CLI_PATH;
    if (envPath) {
        const candidates = [envPath, path.join(envPath, 'whisper-cli')];
        for (const candidate of candidates) {
            if (fs.existsSync(candidate)) return candidate;
        }
    }

    // Try 'which' command
    try {
        const whichOut = execSync('which whisper-cli', {encoding: 'utf8'}).trim();
        if (whichOut) return whichOut;
    } catch (e) { /* not found via which */ }

    // Scan PATH manually
    const pathDirs = (process.env.PATH || '').split(path.delimiter).filter(Boolean);
    for (const dir of pathDirs) {
        const candidate = path.join(dir, 'whisper-cli');
        if (fs.existsSync(candidate)) return candidate;
    }

    return null;
}

export async function transcribeWithWhisper(modelRel, wavPath) {
    return new Promise((resolve, reject) => {
        const whisperModelAbs = path.isAbsolute(modelRel) ? modelRel : path.resolve(process.cwd(), modelRel);
        const modelName = path.basename(whisperModelAbs);
        console.log(`🎤 [Whisper] Starting transcription with ${modelName}`);
        const startTime = Date.now();

        const whisperCmd = resolveWhisperPath();
        const whisperArgs = ['-m', whisperModelAbs, '-f', wavPath, '-nt'];

        const whisper = whisperCmd
            ? spawn(whisperCmd, whisperArgs, {env: process.env})
            : spawn('whisper-cli', whisperArgs, {shell: true, env: process.env});

        if (!whisper?.stdout) {
            return reject(new Error('Failed to start whisper process'));
        }

        if (!whisperCmd) {
            console.warn('[stt] whisper-cli not found via which/PATH — using shell fallback');
            console.info(`[stt] WHISPER_CLI_PATH=${process.env.WHISPER_CLI_PATH || '<not set>'} PATH=${process.env.PATH || '<empty>'}`);
        }

        let stdout = '';
        let stderr = '';

        whisper.stdout.on('data', (data) => stdout += data.toString());
        whisper.stderr.on('data', (data) => stderr += data.toString());

        whisper.on('error', (err) => {
            const message = err.code === 'ENOENT'
                ? `whisper-cli not found. Install it or set WHISPER_CLI_PATH. Model: ${whisperModelAbs}`
                : err.message;
            reject(new Error(message));
        });

        whisper.on('close', (code) => {
            const duration = Date.now() - startTime;
            if (code !== 0) {
                reject(new Error(`whisper-cli exited ${code}: ${stderr}`));
            } else {
                console.log(`✅ [Whisper] Transcription complete with ${modelName} in ${duration}ms`);
                resolve(stdout.trim());
            }
        });
    });
}
