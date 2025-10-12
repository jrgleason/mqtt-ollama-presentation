import {spawn} from 'child_process';
import path from 'path';
import fs from 'fs';

export async function transcribeWithWhisper(modelRel, wavPath, opts = {}) {
    const timeoutMs = typeof opts.timeoutMs === 'number' ? opts.timeoutMs : 60_000; // default 60s
    return new Promise((resolve, reject) => {
        try {
            // Resolve model path: try the provided path, then several common locations so callers
            // can pass a repo-relative path like 'models/ggml-base.bin' while running from the repo root.
            const candidates = [];
            if (path.isAbsolute(modelRel)) candidates.push(modelRel);
            else {
                candidates.push(path.resolve(process.cwd(), modelRel)); // e.g. repoRoot/models/ggml-base.bin
                candidates.push(path.resolve(process.cwd(), 'apps/voice-gateway-oww', modelRel));
                candidates.push(path.resolve(process.cwd(), 'apps/voice-gateway-oww', 'models', path.basename(modelRel)));
                candidates.push(path.resolve(process.cwd(), 'models', path.basename(modelRel)));
            }

            let whisperModelAbs = null;
            for (const c of candidates) {
                try {
                    if (fs.existsSync(c)) { whisperModelAbs = c; break; }
                } catch (e) { /* ignore */ }
            }
            // Fallback to resolving as given if none of the candidates exist (we'll let the spawned process error)
            if (!whisperModelAbs) whisperModelAbs = path.isAbsolute(modelRel) ? modelRel : path.resolve(process.cwd(), modelRel);

            console.info(`[stt] starting whisper-cli model=${whisperModelAbs} wav=${wavPath} timeoutMs=${timeoutMs}`);
            const whisper = spawn('whisper-cli', ['-m', whisperModelAbs, '-f', wavPath, '-nt']);
            let stdout = '';
            let stderr = '';

            const onStdout = (data) => { stdout += data.toString(); };
            const onStderr = (data) => { stderr += data.toString(); };

            whisper.stdout.on('data', onStdout);
            whisper.stderr.on('data', onStderr);

            let timedOut = false;
            const timer = setTimeout(() => {
                timedOut = true;
                try {
                    whisper.kill('SIGKILL');
                } catch (e) { /* ignore */ }
                return reject(new Error(`whisper-cli timed out after ${timeoutMs}ms`));
            }, timeoutMs);

            const cleanup = () => {
                clearTimeout(timer);
                try { whisper.stdout.off('data', onStdout); } catch (e) { /* ignore */ }
                try { whisper.stderr.off('data', onStderr); } catch (e) { /* ignore */ }
            };

            whisper.on('error', (err) => {
                cleanup();
                return reject(err);
            });

            whisper.on('close', (code) => {
                cleanup();
                if (timedOut) return; // already rejected on timeout
                if (code !== 0) {
                    // include stderr in error to aid debugging
                    return reject(new Error(`whisper-cli exited ${code}: ${stderr}`));
                }
                return resolve(stdout.trim());
            });
        } catch (err) {
            reject(err);
        }
    });
}
