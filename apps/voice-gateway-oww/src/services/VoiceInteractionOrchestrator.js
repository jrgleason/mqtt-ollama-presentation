import { BeepUtil } from '../util/BeepUtil.js';
import { SAMPLE_RATE } from '../audio/constants.js';
import { AudioPlayer } from '../audio/AudioPlayer.js';
import { TranscriptionService } from './TranscriptionService.js';
import { IntentClassifier } from './IntentClassifier.js';
import { AIRouter } from '../ai/AIRouter.js';
import { conversationManager } from '../ConversationManager.js';
import { publishTranscription, publishAIResponse } from '../mqttClient.js';
import { ElevenLabsTTS } from '../util/ElevenLabsTTS.js';
import { streamSpeak } from '../streamingTTS.js';
import { executeDateTimeTool } from '../util/tools.js';
import { errMsg } from '../util/Logger.js';
import { isPlaying } from '../state-machines/PlaybackMachine.js';

/**
 * VoiceInteractionOrchestrator - Coordinate complete voice interaction pipeline
 *
 * Primary replacement for BackgroundTranscriber. Orchestrates:
 * - Audio transcription (via TranscriptionService)
 * - Intent classification (via IntentClassifier)
 * - AI query routing (via AIRouter)
 * - TTS playback (ElevenLabs)
 * - Audio feedback (beeps at appropriate stages)
 * - MQTT publishing (transcription, AI response)
 * - Conversation state updates
 *
 * Usage:
 *   const orchestrator = new VoiceInteractionOrchestrator(config, logger, toolExecutor);
 *   await orchestrator.processVoiceInteraction(audioSamples);
 */
export class VoiceInteractionOrchestrator {
    constructor(config, logger, toolExecutor, voiceService = null, isRecordingChecker = null, playbackMachine = null) {
        this.config = config;
        this.logger = logger;
        this.toolExecutor = toolExecutor;
        this.voiceService = voiceService;
        this.isRecordingChecker = isRecordingChecker || (() => false);
        this.playbackMachine = playbackMachine; // PlaybackMachine service

        // Initialize dependencies
        this.audioPlayer = new AudioPlayer(config, logger);
        this.beep = new BeepUtil(config);
        this.transcriptionService = new TranscriptionService(config, logger);
        this.intentClassifier = new IntentClassifier();
        this.aiRouter = new AIRouter(config, logger, toolExecutor);
        this.elevenLabsTTS = new ElevenLabsTTS(config, logger);

        // Track active TTS playback for interruption support
        // This will be deprecated in favor of PlaybackMachine
        this.activePlayback = null; // Stores {cancel, promise} from playInterruptible

        this.logger.info('VoiceInteractionOrchestrator initialized', {
            aiProvider: config.ai.provider,
            ttsEnabled: config.tts.enabled,
            streamingEnabled: config.tts.streaming,
            beepIsolationEnabled: isRecordingChecker !== null,
            playbackMachineEnabled: playbackMachine !== null
        });
    }

    /**
     * Process complete voice interaction from audio samples to spoken response
     *
     * @param {Float32Array|Buffer} audioSamples - Audio samples from wake word recording
     * @returns {Promise<void>}
     */
    async processVoiceInteraction(audioSamples) {
        const interactionStartTime = Date.now();

        try {
            // ============================================
            // STAGE 0: Cancel Previous TTS (Voice Interruption)
            // ============================================
            // If user triggers wake word while previous TTS is still playing,
            // cancel it immediately (barge-in/interruption support)
            this.cancelActivePlayback();

            // ============================================
            // STAGE 1: Transcription
            // ============================================
            this.logger.debug('VoiceInteractionOrchestrator: Starting transcription');

            const transcription = await this.transcriptionService.transcribe(audioSamples);

            if (!transcription) {
                this.logger.warn('VoiceInteractionOrchestrator: No valid transcription, aborting');
                return;
            }

            this.logger.info(`📝 You said: "${transcription}"`);

            // Publish transcription to MQTT (non-blocking)
            this._publishTranscriptionInBackground(transcription, audioSamples.length);

            // ============================================
            // STAGE 2: Intent Classification
            // ============================================
            const intent = this.intentClassifier.classify(transcription);

            this.logger.debug('VoiceInteractionOrchestrator: Intent classified', {
                isDeviceQuery: intent.isDeviceQuery,
                isDateTimeQuery: intent.isDateTimeQuery,
                isDeviceControlQuery: intent.isDeviceControlQuery
            });

            // Add user message to conversation history BEFORE AI query
            conversationManager.addUserMessage(transcription);

            // ============================================
            // STAGE 3: Processing Beep (before AI query)
            // ============================================
            // Only play processing beep if not currently recording or playing audio (prevents beep feedback)
            if (!this._shouldSuppressBeep()) {
                await this.audioPlayer.play(this.beep.BEEPS.processing);
            } else {
                this.logger.debug('🔇 Suppressed processing beep (recording or playback in progress)');
            }

            // ============================================
            // STAGE 4: AI Query or Direct Tool Execution
            // ============================================
            const { response: aiResponse, streamingUsed } = await this._handleAIOrDirectTools(transcription, intent);

            this.logger.info(`🤖 AI Response: "${aiResponse}"`);

            // Update conversation history
            conversationManager.addAssistantMessage(aiResponse);

            // ============================================
            // STAGE 5: TTS Playback (if enabled and not already streamed)
            // ============================================
            // Skip TTS if streaming already played the response
            const streamingWasUsed = streamingUsed === true;

            // Safety check: if streaming was used but response is empty, play error message
            if (streamingWasUsed && aiResponse.trim().length === 0) {
                this.logger.warn('⚠️ Streaming returned empty response - playing fallback message');
                await this._speakResponse("I'm sorry, I didn't understand that or couldn't process your request.");
            } else if (this.config.tts.enabled && !streamingWasUsed) {
                await this._speakResponse(aiResponse);
            } else if (streamingWasUsed) {
                this.logger.debug('VoiceInteractionOrchestrator: TTS already played via streaming, skipping');
            } else {
                this.logger.debug('VoiceInteractionOrchestrator: TTS disabled, skipping speech');
            }

            // ============================================
            // STAGE 6: Response Beep (after TTS)
            // ============================================
            // Only play response beep if not currently recording or playing audio (prevents beep feedback)
            if (!this._shouldSuppressBeep()) {
                await this.audioPlayer.play(this.beep.BEEPS.response);
            } else {
                this.logger.debug('🔇 Suppressed response beep (recording or playback in progress)');
            }

            // ============================================
            // STAGE 7: Publish AI Response to MQTT
            // ============================================
            this._publishAIResponseInBackground(transcription, aiResponse);

            // ============================================
            // STAGE 8: Performance Logging
            // ============================================
            const totalDuration = Date.now() - interactionStartTime;
            this.logger.info('VoiceInteractionOrchestrator: Interaction complete', {
                totalDuration: `${(totalDuration / 1000).toFixed(2)}s`,
                target: '<7s'
            });

        } catch (error) {
            this.logger.error('VoiceInteractionOrchestrator: Interaction failed', {
                error: errMsg(error),
                stack: error.stack
            });

            // Play error beep to indicate failure
            try {
                await this.audioPlayer.play(this.beep.BEEPS.error);
            } catch (beepErr) {
                this.logger.error('VoiceInteractionOrchestrator: Failed to play error beep', {
                    error: errMsg(beepErr)
                });
            }

            // Re-throw error for caller to handle if needed
            throw error;
        } finally {
            // ============================================
            // STAGE 9: Signal Interaction Complete
            // ============================================
            // Notify state machine that interaction is done (transitions to cooldown → listening)
            if (this.voiceService) {
                this.voiceService.send({ type: 'INTERACTION_COMPLETE' });
                this.logger.debug('✅ Signaled INTERACTION_COMPLETE to state machine');
            }
        }
    }

    /**
     * Check if beeps should be suppressed to prevent feedback loops
     * Beeps are suppressed when:
     * - Recording is active (prevents beep from being captured in user audio)
     * - Playback is active (prevents beep overlap with TTS/other audio)
     *
     * @returns {boolean} True if beeps should be suppressed
     * @private
     */
    _shouldSuppressBeep() {
        const isRecordingActive = this.isRecordingChecker();
        const isPlaybackPlaying = this.playbackMachine ? isPlaying(this.playbackMachine) : false;

        return isRecordingActive || isPlaybackPlaying;
    }

    /**
     * Cancel any active TTS playback (voice interruption/barge-in)
     *
     * Called when:
     * - New voice interaction starts (user interrupts current TTS)
     * - Wake word detected during TTS playback
     *
     * @returns {void}
     */
    cancelActivePlayback() {
        // Use PlaybackMachine if available (new approach)
        if (this.playbackMachine) {
            const snapshot = this.playbackMachine.getSnapshot();
            if (snapshot.matches('playing')) {
                this.logger.info('🛑 Cancelling active playback via PlaybackMachine');
                this.playbackMachine.send({ type: 'INTERRUPT' });
                // Transition to idle after interruption handled
                this.playbackMachine.send({ type: 'INTERRUPT_HANDLED' });
            }
            return;
        }

        // Fallback to legacy approach if PlaybackMachine not available
        if (this.activePlayback) {
            this.logger.info('🛑 Cancelling active TTS playback (interrupted by user)');
            try {
                this.activePlayback.cancel();
            } catch (err) {
                this.logger.warn('Failed to cancel active playback', {
                    error: errMsg(err)
                });
            }
            this.activePlayback = null;
        }
    }

    /**
     * Handle AI query or execute tools directly based on intent
     *
     * @param {string} transcription - User's transcribed speech
     * @param {Object} intent - Classified intent
     * @returns {Promise<string>} AI response or tool execution result
     * @private
     */
    async _handleAIOrDirectTools(transcription, intent) {
        // Direct tool execution for simple queries (skip AI)
        if (intent.isDateTimeQuery) {
            this.logger.debug('VoiceInteractionOrchestrator: Direct datetime tool execution');
            const response = await executeDateTimeTool({}, transcription);
            return { response, streamingUsed: false }; // Direct tool = no streaming
        }

        // Device control queries now go through AI + ToolExecutor (MCP tools)
        // The AI will call control_zwave_device tool via MCP integration
        return await this._queryAI(transcription, intent);
    }

    /**
     * Query AI with optional streaming TTS
     *
     * @param {string} transcription - User's transcribed speech
     * @param {Object} intent - Classified intent
     * @returns {Promise<string>} AI response text
     * @private
     */
    async _queryAI(transcription, intent) {
        // Check if streaming is enabled (Anthropic + TTS streaming)
        if (this.aiRouter.isStreamingEnabled()) {
            const response = await this._queryAIWithStreaming(transcription, intent);
            return { response, streamingUsed: true }; // Streaming was used
        } else {
            const response = await this._queryAIWithoutStreaming(transcription, intent);
            return { response, streamingUsed: false }; // No streaming
        }
    }

    /**
     * Query AI with streaming TTS (Anthropic only) - with interruption support
     *
     * @param {string} transcription - User's transcribed speech
     * @param {Object} intent - Classified intent
     * @returns {Promise<string>} AI response text
     * @private
     */
    async _queryAIWithStreaming(transcription, intent) {
        this.logger.debug('VoiceInteractionOrchestrator: Using streaming TTS with cancellation support');

        // Create AbortController for streaming cancellation
        const abortController = new AbortController();

        // Initialize streaming TTS with abort support
        const tts = await streamSpeak('', { abortController });

        // Track streaming TTS as active playback (for interruption)
        this.activePlayback = {
            cancel: () => {
                this.logger.info('🛑 Aborting streaming TTS');
                abortController.abort();
                tts.cancel();
            },
            promise: Promise.resolve() // Placeholder, actual playback happens in streamSpeak
        };

        try {
            // Query AI with token streaming callback
            const aiResponse = await this.aiRouter.query(transcription, intent, {
                onToken: (token) => tts.pushText(token)
            });

            // Finalize TTS stream (waits for all chunks to play)
            await tts.finalize();

            return aiResponse;
        } catch (err) {
            // Handle cancellation during streaming
            if (err.name === 'AbortError' || err.message.includes('cancelled')) {
                this.logger.info('🛑 Streaming TTS was cancelled');
                throw err;
            }
            throw err;
        } finally {
            // Clear activePlayback after streaming completes or is cancelled
            this.activePlayback = null;
        }
    }

    /**
     * Query AI without streaming (standard TTS)
     *
     * @param {string} transcription - User's transcribed speech
     * @param {Object} intent - Classified intent
     * @returns {Promise<string>} AI response text
     * @private
     */
    async _queryAIWithoutStreaming(transcription, intent) {
        this.logger.debug('VoiceInteractionOrchestrator: Using non-streaming AI query');

        // Query AI (Ollama or Anthropic)
        const aiResponse = await this.aiRouter.query(transcription, intent);

        return aiResponse;
    }

    /**
     * Speak AI response using TTS with interruption support
     *
     * @param {string} aiResponse - AI response text to speak
     * @returns {Promise<void>}
     * @private
     */
    async _speakResponse(aiResponse) {
        try {
            const audioBuffer = await this.elevenLabsTTS.synthesizeSpeech(aiResponse, {
                volume: this.config.tts.volume,
                speed: this.config.tts.speed
            });

            if (audioBuffer && audioBuffer.length > 0) {
                // Use playInterruptible for cancellable playback
                this.activePlayback = this.audioPlayer.playInterruptible(audioBuffer);

                // Register playback with PlaybackMachine if available
                if (this.playbackMachine) {
                    this.playbackMachine.send({
                        type: 'START_PLAYBACK',
                        playback: this.activePlayback,
                        playbackType: 'tts'
                    });
                }

                try {
                    await this.activePlayback.promise;
                    this.logger.info('✅ AI response playback complete');

                    // Notify PlaybackMachine of completion
                    if (this.playbackMachine) {
                        this.playbackMachine.send({ type: 'PLAYBACK_COMPLETE' });
                    }
                } catch (playbackErr) {
                    // Playback was cancelled or failed
                    if (playbackErr.message.includes('cancelled')) {
                        this.logger.info('🛑 TTS playback was interrupted');
                        // Interruption already handled by PlaybackMachine
                    } else {
                        throw playbackErr;
                    }
                } finally {
                    // Clear activePlayback after completion or cancellation
                    this.activePlayback = null;
                }
            } else {
                this.logger.warn('VoiceInteractionOrchestrator: Empty audio buffer from TTS');
            }
        } catch (ttsErr) {
            this.logger.error('VoiceInteractionOrchestrator: TTS failed', {
                error: errMsg(ttsErr)
            });
            // Continue execution even if TTS fails (non-critical error)
        }
    }

    /**
     * Publish transcription to MQTT (non-blocking)
     *
     * @param {string} transcription - Transcription text
     * @param {number} audioLength - Audio sample length
     * @private
     */
    _publishTranscriptionInBackground(transcription, audioLength) {
        publishTranscription(transcription, {
            duration: audioLength / SAMPLE_RATE
        }).catch(err => {
            this.logger.debug('VoiceInteractionOrchestrator: MQTT publish failed (non-critical)', {
                error: errMsg(err)
            });
        });
    }

    /**
     * Publish AI response to MQTT (non-blocking)
     *
     * @param {string} transcription - User transcription
     * @param {string} aiResponse - AI response text
     * @private
     */
    _publishAIResponseInBackground(transcription, aiResponse) {
        const convSummary = conversationManager.getSummary();
        const modelName = this.config.ai.provider === 'anthropic'
            ? this.config.anthropic.model
            : this.config.ollama.model;

        publishAIResponse(transcription, aiResponse, {
            model: modelName,
            conversationTurns: Math.floor(convSummary.totalMessages / 2),
            provider: this.config.ai.provider,
            duration: 0,
        }).catch(err => {
            this.logger.debug('VoiceInteractionOrchestrator: MQTT publish failed (non-critical)', {
                error: errMsg(err)
            });
        });
    }

    /**
     * Health check for orchestrator and all dependencies
     *
     * @returns {Promise<Object>} Health check result
     */
    async healthCheck() {
        try {
            const aiRouterHealth = await this.aiRouter.healthCheck();

            return {
                healthy: aiRouterHealth.healthy,
                transcriptionService: 'ready',
                intentClassifier: 'ready',
                aiRouter: aiRouterHealth,
                ttsEnabled: this.config.tts.enabled,
                streamingEnabled: this.aiRouter.isStreamingEnabled()
            };
        } catch (error) {
            return {
                healthy: false,
                error: errMsg(error)
            };
        }
    }
}
