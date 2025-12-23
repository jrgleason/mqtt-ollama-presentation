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
import { executeDateTimeTool, executeZWaveControlTool } from '../util/tools.js';
import { errMsg } from '../util/Logger.js';

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
    constructor(config, logger, toolExecutor) {
        this.config = config;
        this.logger = logger;
        this.toolExecutor = toolExecutor;

        // Initialize dependencies
        this.audioPlayer = new AudioPlayer(config, logger);
        this.beep = new BeepUtil(config);
        this.transcriptionService = new TranscriptionService(config, logger);
        this.intentClassifier = new IntentClassifier();
        this.aiRouter = new AIRouter(config, logger, toolExecutor);
        this.elevenLabsTTS = new ElevenLabsTTS(config, logger);

        this.logger.info('VoiceInteractionOrchestrator initialized', {
            aiProvider: config.ai.provider,
            ttsEnabled: config.tts.enabled,
            streamingEnabled: config.tts.streaming
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
            await this.audioPlayer.play(this.beep.BEEPS.processing);

            // ============================================
            // STAGE 4: AI Query or Direct Tool Execution
            // ============================================
            const aiResponse = await this._handleAIOrDirectTools(transcription, intent);

            this.logger.info(`🤖 AI Response: "${aiResponse}"`);

            // Update conversation history
            conversationManager.addAssistantMessage(aiResponse);

            // ============================================
            // STAGE 5: TTS Playback (if enabled)
            // ============================================
            if (this.config.tts.enabled) {
                await this._speakResponse(aiResponse);
            } else {
                this.logger.debug('VoiceInteractionOrchestrator: TTS disabled, skipping speech');
            }

            // ============================================
            // STAGE 6: Response Beep (after TTS)
            // ============================================
            await this.audioPlayer.play(this.beep.BEEPS.response);

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
            return await executeDateTimeTool({}, transcription);
        }

        if (intent.isDeviceControlQuery) {
            this.logger.debug('VoiceInteractionOrchestrator: Direct device control tool execution');
            return await this._handleDeviceControl();
        }

        // Otherwise, use AI router for general queries
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
            return await this._queryAIWithStreaming(transcription, intent);
        } else {
            return await this._queryAIWithoutStreaming(transcription, intent);
        }
    }

    /**
     * Query AI with streaming TTS (Anthropic only)
     *
     * @param {string} transcription - User's transcribed speech
     * @param {Object} intent - Classified intent
     * @returns {Promise<string>} AI response text
     * @private
     */
    async _queryAIWithStreaming(transcription, intent) {
        this.logger.debug('VoiceInteractionOrchestrator: Using streaming TTS');

        // Initialize streaming TTS
        const tts = await streamSpeak('', {});

        // Query AI with token streaming callback
        const aiResponse = await this.aiRouter.query(transcription, intent, {
            onToken: (token) => tts.pushText(token)
        });

        // Finalize TTS stream
        await tts.finalize();

        return aiResponse;
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
     * Handle device control query (simplified - delegates to tool)
     *
     * @returns {Promise<string>} Tool execution result
     * @private
     */
    async _handleDeviceControl() {
        // Simplified device control - extract device and action
        // In a real implementation, you'd parse the transcription more carefully
        // For now, just call the tool with example params
        // TODO: Implement proper device/action parsing from transcription
        this.logger.warn('VoiceInteractionOrchestrator: Device control parsing not fully implemented');

        return await executeZWaveControlTool({
            deviceName: 'example',
            action: 'on'
        });
    }

    /**
     * Speak AI response using TTS
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
                await this.audioPlayer.play(audioBuffer);
                this.logger.info('✅ AI response playback complete');
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
