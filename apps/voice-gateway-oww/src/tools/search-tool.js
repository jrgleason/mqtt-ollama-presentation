/**
 * Google Search Tool for AI
 *
 * Allows the AI to search Google for information when it doesn't know the answer
 */

import {logger} from '../logger.js';
import {getCurrentDateTime} from './datetime-tool.js';

/**
 * Search Google using a simple web scraping approach
 * @param {string} query - Search query
 * @returns {Promise<string>} Search results summary
 */
async function searchGoogle(query) {
    try {
        // Use DuckDuckGo instant answer API (no API key required, privacy-friendly)
        const encodedQuery = encodeURIComponent(query);
        const url = `https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1&skip_disambig=1`;

        logger.debug('🔍 Searching DuckDuckGo', {query, url});

        const response = await fetch(url);
        const data = await response.json();

        // Extract relevant information
        let result = '';

        // Abstract (direct answer)
        if (data.Abstract) {
            result += data.Abstract;
        }

        // Related topics (if no direct answer)
        if (!result && data.RelatedTopics && data.RelatedTopics.length > 0) {
            const firstTopic = data.RelatedTopics[0];
            if (firstTopic.Text) {
                result = firstTopic.Text;
            } else if (firstTopic.Topics && firstTopic.Topics[0]?.Text) {
                result = firstTopic.Topics[0].Text;
            }
        }

        // Answer (for simple facts)
        if (!result && data.Answer) {
            result = data.Answer;
        }

        if (!result) {
            return `No direct answer found for "${query}". Try asking a more specific question.`;
        }

        logger.debug('✅ Search result found', {
            query,
            resultLength: result.length,
            preview: result.substring(0, 100)
        });

        // Limit to 200 characters for concise responses
        if (result.length > 200) {
            result = result.substring(0, 197) + '...';
        }

        return result;
    } catch (error) {
        logger.error('❌ Search failed', {error: error.message, query});
        return `Search failed: ${error.message}`;
    }
}

/**
 * Tool definition for AI
 */
export const searchTool = {
    type: 'function',
    function: {
        name: 'search_web',
        description: 'REQUIRED: Search the web for factual information, current events, or answers to questions. If the user\'s question involves dates or relative time words (e.g., "next", "last", "upcoming"), you MUST also get today\'s date using the get_current_datetime tool to anchor your answer. DO NOT guess or make up facts - use this function to retrieve information.',
        parameters: {
            type: 'object',
            description: 'Parameters for performing a web search query.',
            properties: {
                query: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 256,
                    description: 'The search query (e.g., "current weather in New York", "who won the 2024 Super Bowl", "population of Tokyo")'
                }
            },
            required: ['query'],
            additionalProperties: false
        }
    }
};

/**
 * Execute the search tool
 * @param {Object} args - Tool arguments
 * @param {string} args.query - Search query
 * @returns {Promise<string>} Search results
 */
export async function executeSearchTool(args) {
    if (!args.query) {
        return 'Error: No search query provided';
    }

    logger.info(`🔍 Search tool executing for: "${args.query}"`);

    // Always include current date/time context so the model has an anchor
    const dt = getCurrentDateTime();
    const isoDate = `${dt.year}-${String(dt.monthNumber).padStart(2, '0')}-${String(dt.dayOfMonth).padStart(2, '0')}`;
    const contextLine = `[Context: Today is ${dt.dayOfWeek}, ${dt.month} ${dt.dayOfMonth}, ${dt.year} (${isoDate}) in timezone ${dt.timezone}.]`;

    const result = await searchGoogle(args.query);
    logger.debug(`✅ Search result: ${result.substring(0, 100)}...`);

    // Prepend context; keep behavior additive and concise
    return `${contextLine} ${result}`;
}
