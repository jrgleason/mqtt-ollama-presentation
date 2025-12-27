import {DetectorStateManager} from "../wake-word/DetectorStateManager.js";
import {SAMPLE_RATE} from "../audio/constants.js";
import ort from 'onnxruntime-node';
import {logger} from './Logger.js';
import path from 'path';
import {EventEmitter} from 'events';

const MEL_SPEC_MODEL_INPUT_SIZE = 1280;

export class OpenWakeWordDetector extends EventEmitter {
    constructor(modelsPath, wakeWordModel, threshold = 0.5, embeddingFrames = 16) {
        super();
        this.modelsPath = modelsPath;
        this.wakeWordModel = wakeWordModel;
        this.threshold = threshold;
        this.embeddingFrames = embeddingFrames; // Configurable: 16 for hey_jarvis, 28 for hello_robot
        this.melSession = null;
        this.embeddingSession = null;
        this.wakeWordSession = null;

        // Initialize detector state manager
        this.stateManager = new DetectorStateManager({ frames: 76, bins: 32 });
        const detState = this.stateManager.newDetectorState();
        this.melBuffer = detState.melBuffer;
        this.melBufferFilled = detState.melBufferFilled;
        this.embeddingBuffer = detState.embeddingBuffer;
        this.embeddingBufferFilled = detState.embeddingBufferFilled;
        this.framesSinceLastPrediction = detState.framesSinceLastPrediction;
        this.stepSize = 8; // every 8 frames (80ms)
        this._owwInfoLogged = false;
        this._detectionsLogged = 0;

        // Warm-up state tracking
        this.warmUpComplete = false;
        this._warmUpPromise = null;
        this._warmUpResolve = null;
    }

    async initialize() {
        const modelsDir = path.isAbsolute(this.modelsPath) ? this.modelsPath : path.resolve(process.cwd(), this.modelsPath);

        this.melSession = await ort.InferenceSession.create(path.join(modelsDir, 'melspectrogram.onnx'));
        this.embeddingSession = await ort.InferenceSession.create(path.join(modelsDir, 'embedding_model.onnx'));
        this.wakeWordSession = await ort.InferenceSession.create(path.join(modelsDir, this.wakeWordModel));

        logger.info('✅ OpenWakeWord initialized', {
            wakeWord: this.wakeWordModel.replace('_v0.1.onnx', '').replace(/_/g, ' '),
            threshold: this.threshold
        });
    }

    reset() {
        try {
            this.stateManager.fillMelBufferWithZeros(this.melBuffer);
        } catch {
            const detState = this.stateManager.newDetectorState();
            this.melBuffer = detState.melBuffer;
        }
        this.melBufferFilled = false;
        this.embeddingBuffer = [];
        this.embeddingBufferFilled = false;
        this.framesSinceLastPrediction = 0;
        // Don't reset warmUpComplete - once warmed up, it stays ready
        logger.debug('OpenWakeWord detector buffers reset');
    }

    /**
     * Get a promise that resolves when detector warm-up is complete
     * @returns {Promise<void>} Resolves when detector is fully warmed up
     */
    getWarmUpPromise() {
        // If already warmed up, return resolved promise
        if (this.warmUpComplete) {
            return Promise.resolve();
        }

        // Create promise if it doesn't exist
        if (!this._warmUpPromise) {
            this._warmUpPromise = new Promise((resolve) => {
                this._warmUpResolve = resolve;
            });
        }

        return this._warmUpPromise;
    }

    async detect(audioChunk) {
        if (audioChunk.length !== MEL_SPEC_MODEL_INPUT_SIZE) throw new Error(`Audio chunk must be ${MEL_SPEC_MODEL_INPUT_SIZE} samples`);

        // Step 1: mel spectrogram [1,1280] -> [1,1,5,32]
        const melResult = await this.melSession.run({input: new ort.Tensor('float32', audioChunk, [1, MEL_SPEC_MODEL_INPUT_SIZE])});
        const melOutput = Object.values(melResult)[0];

        // Extract 5 frames x 32 bins with OpenWakeWord transform (raw/10 + 2)
        const melFrames = [];
        for (let f = 0; f < 5; f++) {
            const frameData = new Float32Array(32);
            for (let m = 0; m < 32; m++) frameData[m] = melOutput.data[f * 32 + m] / 10 + 2;
            melFrames.push(frameData);
        }

        // Step 2: slide mel buffer, accumulate frames
        this.melBuffer = this.melBuffer.slice(5).concat(melFrames);
        this.framesSinceLastPrediction += 5;
        if (!this.melBufferFilled && this.melBuffer.length >= 76) this.melBufferFilled = true;
        if (!this.melBufferFilled || this.framesSinceLastPrediction < this.stepSize) return 0;

        this.framesSinceLastPrediction = 0;

        // Step 3: embedding input [1,76,32,1]
        const embeddingInput = new Float32Array(76 * 32);
        for (let f = 0; f < 76; f++) for (let m = 0; m < 32; m++) embeddingInput[f * 32 + m] = this.melBuffer[f][m];
        const embeddingTensor = new ort.Tensor('float32', embeddingInput, [1, 76, 32, 1]);

        // Step 4: get one 96-dim embedding
        const embeddingOutput = Object.values(await this.embeddingSession.run({input_1: embeddingTensor}))[0];
        const embeddingData = embeddingOutput.data;
        const embeddingDims = embeddingOutput.dims;
        const embeddingSize = embeddingDims[embeddingDims.length - 1];

        if (!this._owwInfoLogged) {
            logger.debug('🔎 OWW model diagnostics', {
                wakeWordModel: this.wakeWordModel,
                embeddingSize,
                embeddingFrames: this.embeddingFrames,
                wakeInputShape: `[1,${this.embeddingFrames},${embeddingSize}]`,
                sampleRate: SAMPLE_RATE
            });
            this._owwInfoLogged = true;
        }

        this.embeddingBuffer.push(new Float32Array(embeddingData));
        if (this.embeddingBuffer.length > this.embeddingFrames) this.embeddingBuffer.shift();
        if (!this.embeddingBufferFilled && this.embeddingBuffer.length >= this.embeddingFrames) {
            this.embeddingBufferFilled = true;
            logger.debug('🎧 Embedding buffer filled, starting warm-up period...');

            // Start warm-up timer (2.5 seconds after buffers filled)
            setTimeout(() => {
                this.warmUpComplete = true;
                logger.debug('✅ Detector warm-up complete');
                this.emit('warmup-complete');
                if (this._warmUpResolve) {
                    this._warmUpResolve();
                    this._warmUpResolve = null;
                }
            }, 2500);
        }
        if (!this.embeddingBufferFilled) return 0;

        // Step 5: wake word input [1,embeddingFrames,embeddingSize]
        const wakeWordInput = new Float32Array(this.embeddingFrames * embeddingSize);
        for (let i = 0; i < this.embeddingFrames; i++) for (let j = 0; j < embeddingSize; j++) wakeWordInput[i * embeddingSize + j] = this.embeddingBuffer[i][j];

        const wakeWordTensor = new ort.Tensor('float32', wakeWordInput, [1, this.embeddingFrames, embeddingSize]);

        // Step 6: wake word detection
        const inputName = this.wakeWordSession.inputNames[0];
        const t0 = Date.now();
        const wakeWordResult = await this.wakeWordSession.run({[inputName]: wakeWordTensor});
        const inferMs = Date.now() - t0;
        if (this._detectionsLogged < 5) {
            this._detectionsLogged++;
            logger.debug('🔎 OWW detection tick', {inferMs, frames: this.embeddingFrames, embeddingSize});
        }
        return Object.values(wakeWordResult)[0].data[0];
    }
}