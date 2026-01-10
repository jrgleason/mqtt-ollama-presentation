/**
 * Web Search Fallback Service
 *
 * Detects when AI responses indicate lack of knowledge and triggers
 * web search using Playwright MCP to provide better answers.
 */

import {logger} from '../util/Logger.js';

/**
 * Patterns that indicate the AI doesn't know the answer
 * and should trigger a web search fallback
 */
const FALLBACK_TRIGGER_PATTERNS = [
    /i don'?t have access to/i,
    /i cannot search/i,
    /i don'?t have real-?time/i,
    /i'?m not able to browse/i,
    /i cannot access the internet/i,
    /no direct answer found/i,
    /i don'?t have current/i,
    /i don'?t have up-?to-?date/i,
    /my knowledge cutoff/i,
    /i cannot provide real-?time/i,
    /i'?m unable to access/i,
    /i don'?t have the ability to search/i,
    /i cannot look up/i,
    /i don'?t have information about current/i,
];

/**
 * WebSearchFallback - Handles web search when AI doesn't know an answer
 */
export class WebSearchFallback {
    /**
     * @param {Object} config - Application configuration
     * @param {Object} toolExecutor - Tool executor for running Playwright tools
     */
    constructor(config, toolExecutor) {
        this.config = config;
        this.toolExecutor = toolExecutor;
        this.enabled = config.webSearchFallback?.enabled !== false;
        this.timeout = config.webSearchFallback?.timeout || 10000;
    }

    /**
     * Check if a response should trigger a web search fallback
     * @param {string} response - AI response text
     * @returns {boolean} True if fallback should be triggered
     */
    shouldTriggerFallback(response) {
        if (!this.enabled) {
            return false;
        }

        // Trigger on null, undefined, or non-string responses
        if (response === null || response === undefined || typeof response !== 'string') {
            logger.debug('🔍 Fallback trigger: invalid response type', {type: typeof response});
            return true;
        }

        // Trigger on empty or whitespace-only responses
        if (response.trim().length === 0) {
            logger.debug('🔍 Fallback trigger: empty response');
            return true;
        }

        // Trigger on pattern matches (AI explicitly saying it doesn't know)
        const triggered = FALLBACK_TRIGGER_PATTERNS.some(pattern => pattern.test(response));

        if (triggered) {
            logger.debug('🔍 Fallback trigger detected in response', {
                preview: response.substring(0, 100)
            });
        }

        return triggered;
    }

    /**
     * Perform a web search using Playwright MCP browser automation
     * Falls back to DuckDuckGo API if Playwright is unavailable
     * @param {string} query - Search query
     * @returns {Promise<string|null>} Search results or null if failed
     */
    async searchWeb(query) {
        if (!this.toolExecutor) {
            logger.warn('WebSearchFallback: No tool executor available');
            return null;
        }

        logger.info('🌐 Performing web search fallback', {query});
        const startTime = Date.now();

        try {
            // Get the execute function (toolExecutor may have .execute or .executeTool)
            const execFn = this.toolExecutor.execute || this.toolExecutor.executeTool;
            if (!execFn) {
                throw new Error('Tool executor has no execute method');
            }
            const execute = execFn.bind(this.toolExecutor);

            // Try Playwright MCP first (browser-based search for current info)
            const playwrightResult = await this._tryPlaywrightSearch(execute, query);
            if (playwrightResult) {
                const duration = Date.now() - startTime;
                logger.info('✅ Web search completed (Playwright)', {
                    query,
                    duration: `${duration}ms`,
                    resultLength: playwrightResult?.length || 0
                });
                return playwrightResult;
            }

            // Fall back to DuckDuckGo API (faster but less current)
            logger.debug('🔄 Playwright unavailable, falling back to DuckDuckGo API');
            const result = await this._executeWithTimeout(
                execute('search_web', {query}),
                this.timeout,
                'Search timeout'
            );

            const duration = Date.now() - startTime;
            logger.info('✅ Web search completed (API fallback)', {
                query,
                duration: `${duration}ms`,
                resultLength: result?.length || 0
            });

            return result;

        } catch (error) {
            const duration = Date.now() - startTime;
            logger.error('❌ Web search failed', {
                query,
                error: error.message,
                duration: `${duration}ms`
            });

            return null;
        }
    }

    /**
     * Try to search using Playwright MCP browser automation
     * @private
     * @param {Function} execute - Tool executor function
     * @param {string} query - Search query
     * @returns {Promise<string|null>} Search results or null if Playwright unavailable
     */
    async _tryPlaywrightSearch(execute, query) {
        try {
            // Navigate to DuckDuckGo search page
            await this._executeWithTimeout(
                execute('browser_navigate', {
                    url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`
                }),
                this.timeout,
                'Navigation timeout'
            );

            // Wait for results to load
            await this._executeWithTimeout(
                execute('browser_wait_for', {time: 2}),
                5000,
                'Wait timeout'
            );

            // Take a snapshot of the page
            const snapshot = await this._executeWithTimeout(
                execute('browser_snapshot', {}),
                this.timeout,
                'Snapshot timeout'
            );

            // Extract relevant text from snapshot
            const results = this._extractSearchResults(snapshot);

            // Close the browser tab
            await execute('browser_close', {}).catch(() => {
            });

            return results;

        } catch (error) {
            // Playwright not available or failed - log and return null
            if (error.message.includes('Unknown tool') || error.message.includes('not found')) {
                logger.debug('🎭 Playwright MCP not available', {reason: error.message});
            } else {
                logger.warn('🎭 Playwright search failed', {error: error.message});
                // Try to close browser on error
                try {
                    await execute('browser_close', {});
                } catch {
                    // Ignore cleanup errors
                }
            }
            return null;
        }
    }

    /**
     * Execute a promise with timeout
     * @private
     */
    async _executeWithTimeout(promise, timeout, message) {
        return Promise.race([
            promise,
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error(message)), timeout)
            )
        ]);
    }

    /**
     * Extract search results from page snapshot
     * @private
     * @param {string} snapshot - Page accessibility snapshot
     * @returns {string} Extracted search results
     */
    _extractSearchResults(snapshot) {
        if (!snapshot) {
            return 'No results found';
        }

        const text = typeof snapshot === 'string' ? snapshot : JSON.stringify(snapshot);
        const results = [];

        // Pattern 1: Look for link text (search result titles)
        const linkPattern = /- link "([^"]{20,200})"/g;
        let match;
        while ((match = linkPattern.exec(text)) !== null && results.length < 5) {
            const linkText = match[1];
            // Skip navigation and common UI elements
            if (/^(DuckDuckGo|Google|Search|Next|Previous|Settings|Privacy|Images|Videos|News)/i.test(linkText)) continue;
            if (/^https?:\/\//i.test(linkText)) continue;
            results.push(linkText);
        }

        // Pattern 2: Look for StaticText content (result snippets)
        if (results.length < 3) {
            const staticPattern = /StaticText[:\s]*["']?([^"'\n\]]{30,300})/gi;
            while ((match = staticPattern.exec(text)) !== null && results.length < 5) {
                const content = match[1].trim();
                if (!/^(Search|DuckDuckGo|Privacy|Settings)/i.test(content)) {
                    results.push(content);
                }
            }
        }

        // Pattern 3: Look for paragraph-like content
        if (results.length < 3) {
            const lines = text.split(/[\n\r]+/);
            for (const line of lines) {
                if (results.length >= 5) break;
                const clean = line
                    .replace(/\[ref=\w+\]/g, '')
                    .replace(/^\s*-\s*(link|button|heading|img|banner|navigation|main|article|list|listitem)\s*/i, '')
                    .replace(/["']/g, '')
                    .trim();
                if (clean.length > 40 && clean.length < 300) {
                    if (!/^(DuckDuckGo|Search|Privacy|Settings|Images|Videos|News)/i.test(clean)) {
                        if (!/^https?:\/\//i.test(clean)) {
                            results.push(clean);
                        }
                    }
                }
            }
        }

        // Deduplicate and join
        const uniqueResults = [...new Set(results)].slice(0, 4);
        let resultText = uniqueResults.join(' | ');

        // Limit to 500 characters for efficiency
        if (resultText.length > 500) {
            resultText = resultText.substring(0, 500);
        }

        return resultText || 'No results found';
    }

    /**
     * Build context message for AI re-query
     * @param {string} searchResults - Results from web search
     * @returns {string} Context message to prepend to AI query
     */
    buildSearchContext(searchResults) {
        return `Based on recent web search results:\n\n${searchResults}\n\nUsing this information, please answer the user's question briefly and directly.`;
    }
}

/**
 * Export the fallback trigger patterns for testing
 */
export {FALLBACK_TRIGGER_PATTERNS};
