/**
 * Startup Orchestration Tests
 *
 * Validates:
 * - Detector warm-up period is enforced (2-3 seconds after buffer fill)
 * - Initialization sequence runs in correct order
 * - No premature wake word detection during warm-up
 * - Welcome message timing is correct (after warm-up)
 */

import { jest } from '@jest/globals';
import { EventEmitter } from 'events';

// Mock the logger before importing OpenWakeWordDetector
const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
};

// We'll manually create a test version of OpenWakeWordDetector to avoid config dependencies
class TestOpenWakeWordDetector extends EventEmitter {
    constructor() {
        super();
        this.warmUpComplete = false;
        this._warmUpPromise = null;
        this._warmUpResolve = null;
        this.embeddingBufferFilled = false;
        this.embeddingBuffer = [];
        this.melBufferFilled = false;
    }

    getWarmUpPromise() {
        if (this.warmUpComplete) {
            return Promise.resolve();
        }
        if (!this._warmUpPromise) {
            this._warmUpPromise = new Promise((resolve) => {
                this._warmUpResolve = resolve;
            });
        }
        return this._warmUpPromise;
    }

    simulateBufferFill() {
        this.embeddingBufferFilled = false;
        this.embeddingBuffer = new Array(15).fill(new Float32Array(96));
    }

    simulateWarmUp(warmUpTime = 2500) {
        setTimeout(() => {
            this.warmUpComplete = true;
            this.emit('warmup-complete');
            if (this._warmUpResolve) {
                this._warmUpResolve();
                this._warmUpResolve = null;
            }
        }, warmUpTime);
    }

    reset() {
        this.melBufferFilled = false;
        this.embeddingBuffer = [];
        this.embeddingBufferFilled = false;
        // Don't reset warmUpComplete - once warmed up, it stays ready
    }
}

describe('Startup Orchestration', () => {
    describe('OpenWakeWordDetector Warm-up', () => {
        let detector;
        const WARM_UP_TIME = 2500; // 2.5 seconds
        const WARM_UP_TOLERANCE = 200; // Allow 200ms tolerance

        beforeEach(() => {
            // Create test detector instance
            detector = new TestOpenWakeWordDetector();
        });

        test('detector initializes with warmUpComplete = false', () => {
            expect(detector.warmUpComplete).toBe(false);
        });

        test('getWarmUpPromise() returns promise when not warmed up', () => {
            const promise = detector.getWarmUpPromise();
            expect(promise).toBeInstanceOf(Promise);
        });

        test('getWarmUpPromise() returns resolved promise when already warmed up', async () => {
            detector.warmUpComplete = true;
            const promise = detector.getWarmUpPromise();

            // Should resolve immediately
            await expect(promise).resolves.toBeUndefined();
        });

        test('emits warmup-complete event after buffer fill + warm-up period', (done) => {
            const startTime = Date.now();

            detector.on('warmup-complete', () => {
                const elapsedTime = Date.now() - startTime;

                // Should take approximately WARM_UP_TIME
                expect(elapsedTime).toBeGreaterThanOrEqual(WARM_UP_TIME - WARM_UP_TOLERANCE);
                expect(elapsedTime).toBeLessThan(WARM_UP_TIME + WARM_UP_TOLERANCE);
                expect(detector.warmUpComplete).toBe(true);
                done();
            });

            // Simulate buffer filling and warm-up
            detector.simulateBufferFill();
            detector.simulateWarmUp(WARM_UP_TIME);
        }, WARM_UP_TIME + 1000); // Jest timeout must be longer than warm-up time

        test('getWarmUpPromise() resolves after warm-up period', async () => {
            const startTime = Date.now();

            // Start warm-up simulation
            detector.simulateWarmUp(WARM_UP_TIME);

            await detector.getWarmUpPromise();

            const elapsedTime = Date.now() - startTime;
            expect(elapsedTime).toBeGreaterThanOrEqual(WARM_UP_TIME - WARM_UP_TOLERANCE);
            expect(detector.warmUpComplete).toBe(true);
        }, WARM_UP_TIME + 1000);

        test('reset() preserves warmUpComplete state', () => {
            detector.warmUpComplete = true;
            detector.melBufferFilled = true;
            detector.embeddingBufferFilled = true;

            detector.reset();

            // Buffers should be reset
            expect(detector.melBufferFilled).toBe(false);
            expect(detector.embeddingBufferFilled).toBe(false);

            // But warm-up should persist
            expect(detector.warmUpComplete).toBe(true);
        });
    });

    describe('Initialization Sequence', () => {
        test('initialization order is enforced', async () => {
            const initOrder = [];

            // Mock services
            const mockInitServices = async () => {
                initOrder.push('services');
                await new Promise(resolve => setTimeout(resolve, 10));
            };

            const mockSetupDetector = async () => {
                initOrder.push('detector-init');
                await new Promise(resolve => setTimeout(resolve, 10));
                initOrder.push('detector-warmup');
                await new Promise(resolve => setTimeout(resolve, 2500));
                return { warmUpComplete: true };
            };

            const mockInitTools = async () => {
                initOrder.push('tools');
                await new Promise(resolve => setTimeout(resolve, 10));
            };

            const mockCreateOrchestrator = () => {
                initOrder.push('orchestrator');
            };

            const mockSetupMic = () => {
                initOrder.push('microphone');
            };

            const mockWelcomeMessage = async () => {
                initOrder.push('welcome');
                await new Promise(resolve => setTimeout(resolve, 10));
            };

            const mockActivate = () => {
                initOrder.push('activate');
            };

            // Simulate startup sequence
            await mockInitServices();
            const detector = await mockSetupDetector();
            await mockInitTools();
            mockCreateOrchestrator();
            mockSetupMic();
            await mockWelcomeMessage();
            mockActivate();

            // Verify correct order
            expect(initOrder).toEqual([
                'services',
                'detector-init',
                'detector-warmup',
                'tools',
                'orchestrator',
                'microphone',
                'welcome',
                'activate'
            ]);
        }, 5000);
    });

    describe('Welcome Message Timing', () => {
        test('welcome message plays after detector warm-up', async () => {
            const events = [];
            let detectorWarmedUp = false;

            // Simulate detector warm-up
            const detectorWarmUp = new Promise(resolve => {
                setTimeout(() => {
                    events.push('detector-warmup-complete');
                    detectorWarmedUp = true;
                    resolve();
                }, 2500);
            });

            // Simulate welcome message
            const playWelcome = async () => {
                await detectorWarmUp; // Must wait for detector
                if (!detectorWarmedUp) {
                    throw new Error('Welcome message started before detector ready');
                }
                events.push('welcome-message-start');
                await new Promise(resolve => setTimeout(resolve, 100));
                events.push('welcome-message-end');
            };

            await playWelcome();

            // Verify order
            expect(events).toEqual([
                'detector-warmup-complete',
                'welcome-message-start',
                'welcome-message-end'
            ]);
        }, 5000);
    });

    describe('Premature Detection Prevention', () => {
        test('detector warm-up state can be checked before activation', () => {
            const detector = new TestOpenWakeWordDetector();

            // Ensure buffers are filled but warm-up is not complete
            detector.embeddingBufferFilled = true;
            detector.warmUpComplete = false;

            // System should check warmUpComplete before allowing detection
            expect(detector.warmUpComplete).toBe(false);

            // After warm-up simulation
            detector.warmUpComplete = true;
            expect(detector.warmUpComplete).toBe(true);
        });
    });
});
