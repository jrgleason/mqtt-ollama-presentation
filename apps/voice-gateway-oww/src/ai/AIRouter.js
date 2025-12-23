import { OllamaClient } from '../OllamaClient.js';
import { AnthropicClient } from '../AnthropicClient.js';
<<<<<<< HEAD
=======
import { getDevicesForAI } from 'zwave-mcp-server/client';
>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)
import { conversationManager } from '../ConversationManager.js';
import { errMsg } from '../util/Logger.js';

/**
 * AIRouter - Route AI queries to the appropriate provider with tool support
 *
 * Responsibilities:
 * - AI provider selection (Ollama vs Anthropic)
 * - Tool executor routing via ToolExecutor instance
 * - Streaming vs non-streaming response handling
 * - System prompt building with device context
 * - Configuration validation
 *
 * Usage:
 *   const router = new AIRouter(config, logger, toolExecutor);
 *   const response = await router.query(transcription, intent);
 */
export class AIRouter {
    constructor(config, logger, toolExecutor) {
        this.config = config;
        this.logger = logger;
        this.toolExecutor = toolExecutor;

        // Validate configuration
        if (!config.ai || !config.ai.provider) {
            throw new Error('AIRouter requires config.ai.provider (ollama or anthropic)');
        }

        // Initialize AI clients lazily (on first query)
        this.ollamaClient = null;
        this.anthropicClient = null;

<<<<<<< HEAD
        // System prompt (use config override if provided, otherwise use default)
        // For Ollama/qwen3: explicitly disable thinking mode
        const isOllama = config.ai.provider === 'ollama';
        this.defaultSystemPrompt = config.ai.systemPrompt ||
            `You are a helpful home automation assistant. Answer in 1 sentence or less. Be direct. No explanations. English only.${isOllama ? ' Do NOT use <think> tags.' : ''}`;
=======
        // Default system prompt
        this.defaultSystemPrompt = 'You are a helpful home automation assistant. Answer in 1 sentence or less. Be direct. No explanations. English only.';
>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)
    }

    /**
     * Get or initialize Ollama client
     * @private
     */
    _getOllamaClient() {
        if (!this.ollamaClient) {
            this.ollamaClient = new OllamaClient(this.config, this.logger);
            this.logger.debug('AIRouter: Initialized Ollama client');
        }
        return this.ollamaClient;
    }

    /**
     * Get or initialize Anthropic client
     * @private
     */
    _getAnthropicClient() {
        if (!this.anthropicClient) {
            this.anthropicClient = new AnthropicClient(this.config, this.logger);
            this.logger.debug('AIRouter: Initialized Anthropic client');
        }
        return this.anthropicClient;
    }

    /**
<<<<<<< HEAD
     * Build system prompt with optional device context hint
     *
     * With MCP tools integration, the AI queries devices on-demand using tools
     * instead of receiving device info upfront. This reduces prompt size and
     * ensures fresh data on every query.
     *
     * @param {boolean} includeDevices - Whether to hint that device tools are available
     * @returns {Promise<string>} System prompt with optional device tool hint
=======
     * Build system prompt with optional device context
     *
     * @param {boolean} includeDevices - Whether to include device information
     * @returns {Promise<string>} System prompt with device info if requested
>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)
     */
    async buildSystemPrompt(includeDevices = false) {
        let prompt = this.defaultSystemPrompt;

        if (includeDevices) {
<<<<<<< HEAD
            // Add hint that device tools are available (AI will use list_zwave_devices tool)
            prompt += '\n\nYou have tools available to query and control Z-Wave devices. Use them when the user asks about devices.';
            this.logger.debug('AIRouter: Added device tool hint to system prompt');
=======
            try {
                const deviceInfo = await getDevicesForAI();
                prompt += `\n\n${deviceInfo}`;
                this.logger.debug('AIRouter: Added device info to system prompt', {
                    deviceInfoLength: deviceInfo.length
                });
            } catch (error) {
                this.logger.warn('AIRouter: Failed to fetch devices for AI', {
                    error: errMsg(error)
                });
                // Continue without device info (graceful degradation)
            }
>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)
        }

        return prompt;
    }

    /**
     * Execute a tool by name (delegates to ToolExecutor)
     *
     * @param {string} toolName - Name of tool to execute
     * @param {Object} toolArgs - Arguments for the tool
     * @returns {Promise<string>} Tool execution result
     */
    async executeTool(toolName, toolArgs) {
        // Delegate to centralized ToolExecutor
        if (this.toolExecutor) {
            return await this.toolExecutor.execute(toolName, toolArgs);
        }

        // Fallback if toolExecutor not available (should not happen)
        this.logger.error('AIRouter: ToolExecutor not available', { toolName });
        return `Error: Tool execution not configured`;
    }

    /**
     * Query AI provider with transcription and intent
     *
     * @param {string} transcription - User's transcribed speech
     * @param {Object} intent - Classified intent from IntentClassifier
     * @param {Object} options - Optional query options
     * @param {Function} options.onToken - Optional callback for streaming tokens (Anthropic only)
     * @param {Array} options.tools - Optional tools to make available to AI
     * @returns {Promise<string>} AI response text
     */
    async query(transcription, intent, options = {}) {
        try {
            const startTime = Date.now();

            // Build system prompt with device context if needed
            const systemPrompt = await this.buildSystemPrompt(intent.isDeviceQuery);

            // Get conversation messages
            const messages = conversationManager.getMessages(systemPrompt);

            // Build query options
            const queryOptions = {
                messages,
                systemPrompt,
<<<<<<< HEAD
                tools: options.tools || (this.toolExecutor?.toolManager?.getTools() || []),
=======
                tools: options.tools || (this.toolExecutor?.registry?.getDefinitions() || []),
>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)
                toolExecutor: this.executeTool.bind(this),
            };

            // Add streaming callback for Anthropic if provided
            if (options.onToken && this.config.ai.provider === 'anthropic') {
                queryOptions.onToken = options.onToken;
            }

            // Route to appropriate AI provider
            let response;
            if (this.config.ai.provider === 'anthropic') {
                const client = this._getAnthropicClient();
                response = await client.query(null, queryOptions);
            } else {
                const client = this._getOllamaClient();
                response = await client.query(null, queryOptions);
            }

            const duration = Date.now() - startTime;
            this.logger.info('AIRouter: Query complete', {
                provider: this.config.ai.provider,
                duration: `${(duration / 1000).toFixed(2)}s`,
                responseLength: response ? response.length : 0
            });

            return response;

        } catch (error) {
            this.logger.error('AIRouter: Query failed', {
                provider: this.config.ai.provider,
                intent,
                error: errMsg(error)
            });
            throw error;
        }
    }

    /**
     * Check if streaming is supported and enabled
     *
     * @returns {boolean} True if streaming is supported and enabled
     */
    isStreamingEnabled() {
        return (
            this.config.ai.provider === 'anthropic' &&
            this.config.tts.enabled &&
            this.config.tts.streaming
        );
    }

    /**
     * Health check for AI router
     *
     * @returns {Promise<Object>} Health check result
     */
    async healthCheck() {
        try {
            const provider = this.config.ai.provider;
            const model = provider === 'anthropic'
                ? this.config.anthropic.model
                : this.config.ollama.model;

            return {
                healthy: true,
                provider,
                model,
                streamingEnabled: this.isStreamingEnabled()
            };
        } catch (error) {
            return {
                healthy: false,
                error: errMsg(error)
            };
        }
    }
}
