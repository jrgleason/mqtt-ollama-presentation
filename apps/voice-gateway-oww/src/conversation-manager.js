/**
 * Conversation Context Manager
 *
 * Maintains conversation history with automatic timeout/reset after 5 minutes of inactivity.
 */

import {logger} from './logger.js';

const CONVERSATION_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

class ConversationManager {
    constructor() {
        this.messages = [];
        this.lastActivityTime = null;
        this.timeoutHandle = null;
    }

    /**
     * Check if conversation has timed out
     * @returns {boolean} True if conversation has timed out
     */
    hasTimedOut() {
        if (!this.lastActivityTime) return true;
        const elapsed = Date.now() - this.lastActivityTime;
        return elapsed >= CONVERSATION_TIMEOUT_MS;
    }

    /**
     * Reset conversation context
     */
    reset() {
        logger.info('🔄 Conversation context reset (5 minute timeout)');
        this.messages = [];
        this.lastActivityTime = null;
        if (this.timeoutHandle) {
            clearTimeout(this.timeoutHandle);
            this.timeoutHandle = null;
        }
    }

    /**
     * Schedule automatic reset after timeout period
     */
    scheduleReset() {
        // Clear any existing timeout
        if (this.timeoutHandle) {
            clearTimeout(this.timeoutHandle);
        }

        // Schedule new timeout
        this.timeoutHandle = setTimeout(() => {
            if (this.messages.length > 0) {
                logger.debug('Conversation timeout reached, will reset on next interaction');
            }
        }, CONVERSATION_TIMEOUT_MS);
    }

    /**
     * Add a user message to conversation history
     * @param {string} userMessage - The user's message
     */
    addUserMessage(userMessage) {
        // Check if conversation has timed out
        if (this.hasTimedOut() && this.messages.length > 0) {
            this.reset();
        }

        this.messages.push({
            role: 'user',
            content: userMessage,
            timestamp: new Date().toISOString(),
        });

        this.lastActivityTime = Date.now();
        this.scheduleReset();

        logger.debug('Added user message to conversation', {
            messageCount: this.messages.length,
            userMessage: userMessage.substring(0, 50),
        });
    }

    /**
     * Add an assistant response to conversation history
     * @param {string} assistantMessage - The assistant's response
     */
    addAssistantMessage(assistantMessage) {
        this.messages.push({
            role: 'assistant',
            content: assistantMessage,
            timestamp: new Date().toISOString(),
        });

        this.lastActivityTime = Date.now();
        this.scheduleReset();

        logger.debug('Added assistant message to conversation', {
            messageCount: this.messages.length,
            assistantMessage: assistantMessage.substring(0, 50),
        });
    }

    /**
     * Get conversation history formatted for Ollama
     * @param {string} systemPrompt - System prompt to prepend
     * @returns {Array} Array of message objects for Ollama
     */
    getMessages(systemPrompt) {
        // Check if conversation has timed out
        if (this.hasTimedOut() && this.messages.length > 0) {
            this.reset();
        }

        // Build messages array with system prompt
        const messages = [
            {role: 'system', content: systemPrompt}
        ];

        // Add conversation history (without timestamps)
        this.messages.forEach(msg => {
            messages.push({
                role: msg.role,
                content: msg.content,
            });
        });

        return messages;
    }

    /**
     * Get conversation summary for logging
     * @returns {Object} Conversation statistics
     */
    getSummary() {
        const userMessages = this.messages.filter(m => m.role === 'user').length;
        const assistantMessages = this.messages.filter(m => m.role === 'assistant').length;
        const minutesSinceLastActivity = this.lastActivityTime
            ? Math.floor((Date.now() - this.lastActivityTime) / 60000)
            : null;

        return {
            totalMessages: this.messages.length,
            userMessages,
            assistantMessages,
            minutesSinceLastActivity,
            hasTimedOut: this.hasTimedOut(),
        };
    }
}

// Create singleton instance
const conversationManager = new ConversationManager();

export {conversationManager};
