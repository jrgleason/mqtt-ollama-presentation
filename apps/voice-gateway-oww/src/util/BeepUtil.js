import {config} from "../config.js";

export const SAMPLE_RATE = 16000; // adjust as needed
export class BeepUtil {
    constructor(config) {
        // Pre-generate common beep patterns
        if (config == null) {
            config = {
                audio: {
                    beepVolume: 0.5,
                    speakerDevice: 'default',
                    micDevice: 'default'
                }
            }
        }
        this.config = config;
        this.BEEPS = {
            wakeWord: this.generateBeep(800, 150),
            processing: this.generateBeep(500, 100),
            response: this.generateDualBeep(600, 900, 80, 30),
            error: this.generateBeep(300, 200) // Lower frequency for error
        };
    }

    generateBeep(frequency = 800, duration = 200) {
        const numSamples = Math.floor((duration / 1000) * SAMPLE_RATE);
        const pcmData = Buffer.alloc(numSamples * 2);

        for (let i = 0; i < numSamples; i++) {
            const t = i / SAMPLE_RATE;
            const sample = Math.sin(2 * Math.PI * frequency * t) * config.audio.beepVolume;
            const int16Sample = Math.max(-32768, Math.min(32767, Math.floor(sample * 32767)));
            pcmData.writeInt16LE(int16Sample, i * 2);
        }

        return pcmData;
    }

    generateDualBeep(freq1 = 600, freq2 = 900, toneDuration = 80, gapDuration = 30) {
        const tone1 = this.generateBeep(freq1, toneDuration);
        const tone2 = this.generateBeep(freq2, toneDuration);
        const gapSamples = Math.floor((gapDuration / 1000) * SAMPLE_RATE);
        const gapBuffer = Buffer.alloc(gapSamples * 2);
        return Buffer.concat([tone1, gapBuffer, tone2]);
    }
}