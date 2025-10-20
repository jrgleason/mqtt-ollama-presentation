import {spawn, execSync} from 'child_process';
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

            // Helper: try to resolve an absolute path to whisper-cli using `WHISPER_CLI_PATH`, `which` and PATH directories
            function resolveWhisperPath() {
                // Honor explicit override
                const envPath = process.env.WHISPER_CLI_PATH;
                if (envPath) {
                    try {
                        if (fs.existsSync(envPath)) return envPath;
                        // if envPath points to a directory, check for whisper-cli inside it
                        const maybe = path.join(envPath, 'whisper-cli');
                        if (fs.existsSync(maybe)) return maybe;
                    } catch (e) { /* ignore */ }
                }
                try {
                    const whichOut = execSync('which whisper-cli', { encoding: 'utf8' }).trim();
                    if (whichOut) return whichOut;
                } catch (e) { /* ignore */ }

                // fallback: scan PATH
                const pathEnv = process.env.PATH || '';
                const parts = pathEnv.split(path.delimiter).filter(Boolean);
                for (const p of parts) {
                    try {
                        const candidate = path.join(p, 'whisper-cli');
                        if (fs.existsSync(candidate)) return candidate;
                    } catch (e) { /* ignore */ }
                }
                return null;
            }

            console.info(`[stt] starting whisper-cli model=${whisperModelAbs} wav=${wavPath} timeoutMs=${timeoutMs}`);

            const whisperCmd = resolveWhisperPath();
            const whisperArgs = ['-m', whisperModelAbs, '-f', wavPath, '-nt'];
            let whisper;

            if (whisperCmd) {
                // spawn using absolute path to avoid PATH issues
                console.info(`[stt] using whisper executable: ${whisperCmd}`);
                whisper = spawn(whisperCmd, whisperArgs, { env: process.env });
            } else {
                // Last resort: spawn via a shell so the user's login PATH may be applied. This can
                // avoid ENOENT in environments where PATH differs between shells/services.
                console.warn('[stt] whisper-cli not found via which/PATH scan — spawning via shell as fallback');
                console.info(`[stt] WHISPER_CLI_PATH=${process.env.WHISPER_CLI_PATH || '<not set>'} PATH=${process.env.PATH || '<empty>'}`);
                whisper = spawn('whisper-cli', whisperArgs, { shell: true, env: process.env });
            }

            if (!whisper || !whisper.stdout) {
                return reject(new Error('Failed to start whisper process (no child process created or no stdout).'));
            }

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
                // Provide a clearer error message when ENOENT occurs
                if (err && err.code === 'ENOENT') {
                    return reject(new Error(`whisper-cli executable not found (ENOENT). Try installing whisper-cli or ensure the process PATH includes its location. Resolved model: ${whisperModelAbs}`));
                }
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
