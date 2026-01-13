/**
 * Tests for WebSearchFallback service
 */

import {FALLBACK_TRIGGER_PATTERNS, WebSearchFallback} from '../services/WebSearchFallback.js';

describe('WebSearchFallback', () => {
    let fallback;
    let mockToolExecutor;
    let mockConfig;
    let toolCalls;

    beforeEach(() => {
        toolCalls = [];

        mockToolExecutor = {
            execute: async (name, args) => {
                toolCalls.push({name, args});
                return 'Mock result';
            }
        };

        mockConfig = {
            webSearchFallback: {
                enabled: true,
                timeout: 10000
            }
        };

        fallback = new WebSearchFallback(mockConfig, mockToolExecutor);
    });

    describe('shouldTriggerFallback', () => {
        describe('should trigger on "I don\'t know" responses', () => {
            const triggerResponses = [
                "I don't have access to real-time information",
                "I cannot search the web for that information",
                "I don't have real-time data available",
                "I'm not able to browse the internet",
                "I cannot access the internet to look that up",
                "No direct answer found for your query",
                "I don't have current information about that",
                "I don't have up-to-date information",
                "My knowledge cutoff is January 2025",
                "I cannot provide real-time updates",
                "I'm unable to access external websites",
                "I don't have the ability to search the web"
            ];

            triggerResponses.forEach(response => {
                it(`should trigger for: "${response.substring(0, 40)}..."`, () => {
                    expect(fallback.shouldTriggerFallback(response)).toBe(true);
                });
            });
        });

        describe('should NOT trigger on normal responses', () => {
            const normalResponses = [
                "Paris is the capital of France",
                "The answer is 42",
                "Sure, I can help you with that",
                "The device has been turned on",
                "I've set the temperature to 72 degrees",
                "Here are your available devices",
                "The current time is 3:45 PM"
            ];

            normalResponses.forEach(response => {
                it(`should NOT trigger for: "${response.substring(0, 40)}..."`, () => {
                    expect(fallback.shouldTriggerFallback(response)).toBe(false);
                });
            });
        });

        it('should NOT trigger when disabled', () => {
            const disabledConfig = {
                webSearchFallback: {enabled: false}
            };
            const disabledFallback = new WebSearchFallback(disabledConfig, mockToolExecutor);

            expect(disabledFallback.shouldTriggerFallback(
                "I don't have access to real-time information"
            )).toBe(false);
        });

        it('should trigger for null/undefined/empty responses', () => {
            expect(fallback.shouldTriggerFallback(null)).toBe(true);
            expect(fallback.shouldTriggerFallback(undefined)).toBe(true);
            expect(fallback.shouldTriggerFallback('')).toBe(true);
            expect(fallback.shouldTriggerFallback('   ')).toBe(true);
        });

        it('should trigger for non-string responses', () => {
            expect(fallback.shouldTriggerFallback(123)).toBe(true);
            expect(fallback.shouldTriggerFallback({})).toBe(true);
            expect(fallback.shouldTriggerFallback([])).toBe(true);
        });
    });

    describe('buildSearchContext', () => {
        it('should build context message with search results', () => {
            const results = 'The Super Bowl 2024 was won by the Kansas City Chiefs';
            const context = fallback.buildSearchContext(results);

            expect(context).toContain('Based on recent web search results');
            expect(context).toContain(results);
            expect(context).toContain("please answer the user's question");
        });
    });

    describe('_extractSearchResults', () => {
        it('should extract meaningful text from snapshot', () => {
            const snapshot = `
                navigation Menu
                button Search
                This is a search result with useful information about the topic at hand.
                Another useful piece of information that helps answer the question.
                link More info
            `;

            const results = fallback._extractSearchResults(snapshot);

            expect(results.length).toBeGreaterThan(20);
            expect(results).not.toContain('navigation');
            expect(results).not.toContain('button');
        });

        it('should return "No results found" for empty snapshot', () => {
            expect(fallback._extractSearchResults(null)).toBe('No results found');
            expect(fallback._extractSearchResults('')).toBe('No results found');
        });

        it('should limit result length to 500 characters', () => {
            const longText = 'x'.repeat(1000) + '\n'.repeat(10) + 'y'.repeat(1000);
            const results = fallback._extractSearchResults(longText);

            expect(results.length).toBeLessThanOrEqual(500);
        });
    });

    describe('searchWeb', () => {
        it('should return null if no toolExecutor', async () => {
            const noExecutorFallback = new WebSearchFallback(mockConfig, null);
            const result = await noExecutorFallback.searchWeb('test query');

            expect(result).toBeNull();
        });

        it('should try Playwright first, then fall back to API', async () => {
            // Mock that returns "Unknown tool" for Playwright, success for search_web
            let callCount = 0;
            mockToolExecutor.execute = async (name) => {
                toolCalls.push({name, args: {}});
                callCount++;
                if (name === 'browser_navigate') {
                    throw new Error('Unknown tool: browser_navigate');
                }
                return 'Search result from API';
            };

            const result = await fallback.searchWeb('test query');

            // Should have tried Playwright first
            expect(toolCalls.find(c => c.name === 'browser_navigate')).toBeTruthy();
            // Should have fallen back to search_web
            expect(toolCalls.find(c => c.name === 'search_web')).toBeTruthy();
            expect(result).toBe('Search result from API');
        });

        it('should use Playwright results if available', async () => {
            // Mock successful Playwright search
            mockToolExecutor.execute = async (name, args) => {
                toolCalls.push({name, args});
                if (name === 'browser_snapshot') {
                    return 'The current US president is Donald Trump.';
                }
                return 'Success';
            };

            await fallback.searchWeb('test query');

            // Should have called Playwright tools
            expect(toolCalls.find(c => c.name === 'browser_navigate')).toBeTruthy();
            expect(toolCalls.find(c => c.name === 'browser_snapshot')).toBeTruthy();
            // Should NOT have called search_web API
            expect(toolCalls.find(c => c.name === 'search_web')).toBeFalsy();
        });

        it('should return null on complete failure', async () => {
            mockToolExecutor.execute = async () => {
                throw new Error('All search methods failed');
            };

            const result = await fallback.searchWeb('test query');

            expect(result).toBeNull();
        });
    });

    describe('FALLBACK_TRIGGER_PATTERNS', () => {
        it('should have at least 10 patterns', () => {
            expect(FALLBACK_TRIGGER_PATTERNS.length).toBeGreaterThanOrEqual(10);
        });

        it('all patterns should be RegExp objects', () => {
            FALLBACK_TRIGGER_PATTERNS.forEach(pattern => {
                expect(pattern).toBeInstanceOf(RegExp);
            });
        });

        it('all patterns should be case-insensitive', () => {
            FALLBACK_TRIGGER_PATTERNS.forEach(pattern => {
                expect(pattern.flags).toContain('i');
            });
        });
    });
});
