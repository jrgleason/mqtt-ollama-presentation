/**
 * Conversation Context Manager
 *
 * Maintains conversation history with automatic timeout/reset after 5 minutes of inactivity.
 */

import {logger} from './util/Logger.js';
import {CONVERSATION_TIMEOUT_MS} from './constants/timing.js';

class ConversationManager {
    constructor() {
        this.messages = [];
        this.lastActivityTime = null;
        this.timeoutHandle = null;
    }

    /**
     * Create a safe string preview for logging
     * @param {any} value
     * @returns {string}
     */
    static preview(value) {
        let str;
        if (value == null) {
            str = '';
        } else if (typeof value === 'string') {
            str = value;
        } else {
            try {
                str = JSON.stringify(value);
            } catch {
                str = String(value);
            }
        }
        return str.length > 50 ? str.substring(0, 50) : str;
    }

    /**
     * Check if conversation has timed out
     * @returns {boolean} True if conversation has timed out
     */
    hasTimedOut() {
        // If timeout is 0, history is disabled - always return true to clear previous messages
        if (CONVERSATION_TIMEOUT_MS === 0) return true;
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

        const content = (userMessage == null) ? '' : (typeof userMessage === 'string' ? userMessage : (() => {
            try {
                return JSON.stringify(userMessage);
            } catch {
                return String(userMessage);
            }
        })());

        this.messages.push({
            role: 'user',
            content,
            timestamp: new Date().toISOString(),
        });

        this.lastActivityTime = Date.now();
        this.scheduleReset();

        logger.debug('Added user message to conversation', {
            messageCount: this.messages.length,
            userMessage: ConversationManager.preview(content),
        });
    }

    /**
     * Add an assistant response to conversation history
     * @param {string} assistantMessage - The assistant's response
     */
    addAssistantMessage(assistantMessage) {
        const content = (assistantMessage == null) ? '' : (typeof assistantMessage === 'string' ? assistantMessage : (() => {
            try {
                return JSON.stringify(assistantMessage);
            } catch {
                return String(assistantMessage);
            }
        })());

        this.messages.push({
            role: 'assistant',
            content,
            timestamp: new Date().toISOString(),
        });

        this.lastActivityTime = Date.now();
        this.scheduleReset();

        logger.debug('Added assistant message to conversation', {
            messageCount: this.messages.length,
            assistantMessage: ConversationManager.preview(content),
        });
    }

    /**
     * Get conversation history formatted for Ollama
     * @param {string} systemPrompt - System prompt to prepend
     * @returns {Array} Array of message objects for Ollama
     */
    getMessages(systemPrompt) {
        // Note: Don't reset here - reset happens in addUserMessage() before adding new message
        // This ensures the current message is always included

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
