// filepath: /Users/jrg/code/CodeMash/mqtt-ollama-presentation/apps/voice-gateway-oww/src/streaming-tts.js
/**
 * Streaming TTS adapter
 *
 * Streams partial text chunks to Piper (via Python) by sentence/phrase.
 * Falls back to batch synthesize when streaming is disabled.
 */

import {logger} from './logger.js';
import {config} from './config.js';
import {synthesizeSpeech as piperSynthesize} from './piper-tts.js';
import {synthesizeSpeech as elevenSynthesize} from './elevenlabs-tts.js';
import {spawn} from 'child_process';
import {tmpdir} from 'os';
import {join} from 'path';
import fs from 'fs';
import wav from 'wav';

// Sentence splitter (simple heuristic)
function splitIntoSpeakableChunks(text) {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  return cleaned
    .split(/(?<=[.!?])\s+/)
    .flatMap((p) => p.split(/;\s+|:\s+/))
    .map((p) => p.trim())
    .filter(Boolean);
}

// Simple PCM player: converts PCM to WAV in temp and plays via afplay/aplay quickly
async function playPcmNow(pcmBuffer, sampleRate = 16000) {
  if (!pcmBuffer || pcmBuffer.length === 0) return;
  return new Promise((resolve, reject) => {
    const wavPath = join(tmpdir(), `tts_stream_${Date.now()}.wav`);
    const writer = new wav.FileWriter(wavPath, {channels: 1, sampleRate, bitDepth: 16});
    writer.write(pcmBuffer);
    writer.end();
    writer.on('finish', () => {
      const player = process.platform === 'darwin'
        ? spawn('afplay', [wavPath])
        : spawn('aplay', ['-f', 'S16_LE', '-r', String(sampleRate), '-c', '1', wavPath]);
      const startedAt = Date.now();
      player.on('close', (code) => {
        const dur = Date.now() - startedAt;
        logger.debug('🔊 Player closed', {code, durationMs: dur});
        try { fs.unlinkSync(wavPath); } catch { /* ignore */ }
        if (code === 0) resolve(); else reject(new Error(`player exit ${code}`));
      });
      player.on('error', (e) => {
        logger.error('🔊 Player error', {error: e.message});
        try { fs.unlinkSync(wavPath); } catch { /* ignore */ }
        reject(e);
      });
    });
    writer.on('error', (e) => {
      logger.error('🔊 WAV writer error', {error: e.message});
      reject(e);
    });
  });
}

export async function streamSpeak(text) {
  const provider = config.tts.provider || 'ElevenLabs';
  const enabled = config.tts.enabled !== false;
  const streaming = config.tts.streaming !== false;
  if (!enabled) return;

  // Streaming behavior tuning (safe defaults, overridable via config.tts.stream)
  const streamCfg = (config.tts && config.tts.stream) || {};
  const initialDelayMs = Number.isFinite(streamCfg.initialDelayMs) ? streamCfg.initialDelayMs : 350; // wait before first speech
  const chunkDebounceMs = Number.isFinite(streamCfg.chunkDebounceMs) ? streamCfg.chunkDebounceMs : 150; // wait after last token
  const minChunkChars = Number.isFinite(streamCfg.minChunkChars) ? streamCfg.minChunkChars : 60; // require this many chars before speaking
  const maxBufferChars = Number.isFinite(streamCfg.maxBufferChars) ? streamCfg.maxBufferChars : 320; // safety to avoid huge buffers

  // If streaming disabled, do single-shot synthesize using configured provider
  if (!streaming) {
    logger.debug('🔊 streamSpeak: streaming disabled, falling back to batch');
    const synth = provider === 'ElevenLabs' ? elevenSynthesize : piperSynthesize;
    const t0 = Date.now();
    const pcm = await synth(text, {volume: config.tts.volume, speed: config.tts.speed});
    logger.debug('🔊 streamSpeak: batch synth complete', {provider, ms: Date.now() - t0});
    await playPcmNow(pcm, 16000);
    return;
  }

  // Streaming mode: send chunks as they arrive (from upstream token stream)
  const queue = [];
  let flushing = false;
  let buffer = '';
  let firstTokenAt = 0;
  let lastTokenAt = 0;
  let debounceTimer = null;

  async function flush() {
    if (flushing) return; // prevent overlap
    flushing = true;
    logger.debug('🔊 streamSpeak: flush start', {queueLen: queue.length});
    try {
      while (queue.length) {
        const chunk = queue.shift();
        const synth = provider === 'ElevenLabs' ? elevenSynthesize : piperSynthesize;
        const t1 = Date.now();
        const pcm = await synth(chunk, {volume: config.tts.volume, speed: config.tts.speed});
        logger.debug('🔊 streamSpeak: chunk synth complete', {len: chunk.length, ms: Date.now() - t1});
        const t2 = Date.now();
        await playPcmNow(pcm, 16000);
        logger.debug('🔊 streamSpeak: chunk played', {ms: Date.now() - t2});
      }
    } catch (e) {
      logger.error('streamSpeak flush failed', {error: e instanceof Error ? e.message : String(e)});
    } finally {
      logger.debug('🔊 streamSpeak: flush end');
      flushing = false;
    }
  }

  function scheduleMaybeFlush(reason) {
    if (debounceTimer) clearTimeout(debounceTimer);
    // Debounce a bit so punctuation has a chance to arrive
    debounceTimer = setTimeout(() => maybeFlush(reason), chunkDebounceMs).unref?.();
  }

  function maybeFlush(reason) {
    // Enforce initial delay before first speech
    const now = Date.now();
    const haveWaited = firstTokenAt > 0 && (now - firstTokenAt) >= initialDelayMs;

    // Split into sentences/phrases; keep last partial in buffer
    let chunks = splitIntoSpeakableChunks(buffer);
    let remainder = '';
    if (chunks.length > 0) {
      remainder = chunks[chunks.length - 1];
      chunks = chunks.slice(0, -1);
    }

    // If nothing to flush yet, or we haven't waited enough and the chunks are small, return
    const totalFlushChars = chunks.reduce((n, c) => n + c.length, 0);
    if (!haveWaited && totalFlushChars < minChunkChars && buffer.length < maxBufferChars) {
      logger.debug('⌛ streamSpeak: initial delay not elapsed', {reason, waitedMs: firstTokenAt ? (now - firstTokenAt) : 0});
      return;
    }

    // If we still don't have enough content to speak naturally, keep buffering
    if (totalFlushChars < minChunkChars && buffer.length < maxBufferChars) {
      logger.debug('⌛ streamSpeak: buffering (minChunkChars)', {reason, totalFlushChars, bufferLen: buffer.length});
      return;
    }

    // Enqueue all flushable chunks
    for (const c of chunks) {
      if (c) {
        queue.push(c);
        logger.debug('🔊 streamSpeak: enqueued chunk', {len: c.length, reason});
      }
    }

    // Keep remainder in buffer for the next tokens
    buffer = remainder;

    // Kick off playback
    if (queue.length) flush();
  }

  const pushText = async (partial) => {
    if (!partial) return;
    if (!firstTokenAt) firstTokenAt = Date.now();
    lastTokenAt = Date.now();

    // Append but cap buffer to avoid unbounded growth
    buffer += partial;
    if (buffer.length > maxBufferChars * 2) buffer = buffer.slice(-maxBufferChars * 2);

    scheduleMaybeFlush('token');
  };

  const finalize = async () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    // One last attempt to flush anything sensible in buffer
    maybeFlush('finalize');

    // If nothing was flushable yet, enqueue whatever remains
    const final = buffer.trim();
    buffer = '';
    if (final) {
      queue.push(final);
      logger.debug('🔊 streamSpeak: enqueued final chunk', {len: final.length});
    } else {
      logger.debug('🔊 streamSpeak: finalize with empty buffer');
    }

    await flush();
  };

  return {pushText, finalize};
}
