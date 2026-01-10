/**
 * Web Search Tool for AI
 *
 * Uses Google Custom Search JSON API for reliable web searches.
 * Falls back to DuckDuckGo Instant Answer API for definitions/facts.
 *
 * Setup for Google Custom Search API:
 * 1. Get API key: https://console.cloud.google.com/apis/credentials
 * 2. Create Search Engine: https://programmablesearchengine.google.com/
 *    - Set "Search the entire web" to ON
 * 3. Set env vars: GOOGLE_API_KEY and GOOGLE_CSE_ID
 *
 * @see prompts/tools/search-web.md
 */

import {logger} from '../util/Logger.js';
import {config} from '../config.js';
import {getCurrentDateTime} from './datetime-tool.js';
import {loadPrompt} from '../util/prompt-loader.js';

/**
 * Get the current date in ISO 8601 format (YYYY-MM-DD)
 * @returns {string} Current date string
 */
function getCurrentDateISO() {
    const dt = getCurrentDateTime();
    const month = String(dt.monthNumber).padStart(2, '0');
    const day = String(dt.dayOfMonth).padStart(2, '0');
    return `${dt.year}-${month}-${day}`;
}

/**
 * Get the search tool description with current date injected
 * @returns {string} Tool description with current date
 */
function getSearchToolDescription() {
    const currentDate = getCurrentDateISO();
    return loadPrompt('tools/search-web', {CURRENT_DATE: currentDate});
}

/**
 * Get the search query parameter description with current date injected
 * @returns {string} Query parameter description with current date
 */
function getSearchQueryDescription() {
    const currentDate = getCurrentDateISO();
    return loadPrompt('tools/search-web-query', {CURRENT_DATE: currentDate});
}

/**
 * Search using Google Custom Search JSON API
 * @param {string} query - Search query
 * @returns {Promise<string|null>} Search results or null if failed/not configured
 */
async function searchWithGoogleAPI(query) {
    const apiKey = config.googleSearch?.apiKey;
    const searchEngineId = config.googleSearch?.searchEngineId;

    logger.debug('🔍 Google API config check', {
        hasApiKey: !!apiKey,
        hasSearchEngineId: !!searchEngineId,
        apiKeyPreview: apiKey ? `${apiKey.substring(0, 8)}...` : 'not set',
        searchEngineId: searchEngineId || 'not set'
    });

    if (!apiKey || !searchEngineId) {
        logger.warn('🔍 Google Custom Search API not configured (missing GOOGLE_API_KEY or GOOGLE_CSE_ID)');
        return null;
    }

    try {
        logger.info('🔍 Performing Google Custom Search API query', {query});

        const url = new URL('https://www.googleapis.com/customsearch/v1');
        url.searchParams.set('key', apiKey);
        url.searchParams.set('cx', searchEngineId);
        url.searchParams.set('q', query);
        url.searchParams.set('num', '5'); // Get top 5 results

        const response = await fetch(url.toString(), {
            signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        if (!response.ok) {
            const errorText = await response.text();
            logger.warn('🔍 Google API error', {status: response.status, error: errorText});
            return null;
        }

        const data = await response.json();

        if (!data.items || data.items.length === 0) {
            logger.debug('🔍 Google API returned no results');
            return null;
        }

        // Extract titles and snippets from results
        const results = data.items
            .slice(0, 5)
            .map(item => {
                const title = item.title || '';
                const snippet = item.snippet || '';
                return `${title}: ${snippet}`;
            })
            .filter(r => r.length > 10);

        const resultText = results.join(' | ');

        // Debug: Log each result separately so we can see what's being returned
        logger.debug('🔍 Google search results breakdown', {
            query,
            resultCount: results.length,
            results: results.map((r, i) => ({index: i, preview: r.substring(0, 100)}))
        });

        logger.info('✅ Google API search complete', {
            query,
            resultCount: results.length,
            resultLength: resultText.length
        });

        return resultText || null;

    } catch (error) {
        logger.warn('🔍 Google API search failed', {error: error.message, query});
        return null;
    }
}

/**
 * Fallback: Search using DuckDuckGo Instant Answer API
 * Note: This API only returns "instant answers" - factual data from sources like Wikipedia.
 * @param {string} query - Search query
 * @returns {Promise<string|null>} Search results summary or null if not found
 */
async function searchDuckDuckGoAPI(query) {
    try {
        const encodedQuery = encodeURIComponent(query);
        const url = `https://api.duckduckgo.com/?q=${encodedQuery}&format=json&no_html=1&skip_disambig=1`;

        logger.info('🔍 Trying DuckDuckGo API', {query});

        const response = await fetch(url);
        const data = await response.json();

        // Extract relevant information
        let result = '';

        if (data.Abstract && data.Abstract.length > 10) {
            result = data.Abstract;
        } else if (data.Answer && data.Answer.length > 10) {
            result = data.Answer;
        } else if (data.Definition && data.Definition.length > 10) {
            result = data.Definition;
        } else if (data.RelatedTopics && data.RelatedTopics.length > 0) {
            const topics = data.RelatedTopics
                .slice(0, 3)
                .filter(t => t.Text && t.Text.length > 10)
                .map(t => t.Text);
            result = topics.join(' | ');
        }

        if (result && result.length > 300) {
            result = result.substring(0, 297) + '...';
        }

        if (result) {
            logger.info('✅ DuckDuckGo API result found', {preview: result.substring(0, 80)});
        } else {
            logger.debug('🔍 DuckDuckGo API returned no useful results');
        }

        return result || null;

    } catch (error) {
        logger.warn('🔍 DuckDuckGo API failed', {error: error.message});
        return null;
    }
}

/**
 * Get tool definition for AI with current date context
 * @returns {Object} Tool definition object
 * @see prompts/tools/search-web.md
 */
export function getSearchTool() {
    return {
        type: 'function',
        function: {
            name: 'search_web',
            description: getSearchToolDescription(),
            parameters: {
                type: 'object',
                description: 'Parameters for performing a web search query.',
                properties: {
                    query: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 256,
                        description: getSearchQueryDescription()
                    }
                },
                required: ['query'],
                additionalProperties: false
            }
        }
    };
}

/**
 * Static tool definition for backwards compatibility
 * Note: Prefer getSearchTool() for dynamic date context
 * @deprecated Use getSearchTool() instead
 */
export const searchTool = {
    type: 'function',
    function: {
        name: 'search_web',
        get description() {
            return getSearchToolDescription();
        },
        parameters: {
            type: 'object',
            description: 'Parameters for performing a web search query.',
            properties: {
                query: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 256,
                    get description() {
                        return getSearchQueryDescription();
                    }
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

    // Get current date/time context
    const dt = getCurrentDateTime();
    const currentYear = dt.year;
    const contextLine = `[Today is ${dt.dayOfWeek}, ${dt.month} ${dt.dayOfMonth}, ${currentYear}.]`;

    logger.info(`🔍 Search tool executing for: "${args.query}"`);

    // Try Google Custom Search API first (most reliable, no CAPTCHAs)
    let result = await searchWithGoogleAPI(args.query);

    // Fallback to DuckDuckGo Instant Answer API
    if (!result) {
        logger.info('🔄 Falling back to DuckDuckGo API');
        result = await searchDuckDuckGoAPI(args.query);
    }

    if (!result) {
        return `Search failed. Tell user: "I cannot look up that information right now."`;
    }

    logger.info(`✅ Search complete`, {
        query: args.query,
        resultLength: result.length
    });

    // Keep result concise for small models - but give enough context
    const conciseResult = result.length > 600 ? result.substring(0, 600) : result;
    return `${contextLine} ${conciseResult}`;
}
