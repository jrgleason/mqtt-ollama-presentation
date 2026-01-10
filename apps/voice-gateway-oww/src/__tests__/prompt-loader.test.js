/**
 * Tests for prompt-loader utility
 */

import {clearPromptCache, getRequiredPrompts, loadPrompt, preloadPrompts} from '../util/prompt-loader.js';

describe('prompt-loader', () => {
    beforeEach(() => {
        // Clear cache before each test for isolation
        clearPromptCache();
    });

    describe('loadPrompt', () => {
        it('should load a prompt from markdown file', () => {
            const prompt = loadPrompt('system/home-assistant');
            expect(prompt).toContain('helpful home automation assistant');
            expect(prompt).toContain('search_web tool');
        });

        it('should load tool prompts', () => {
            const prompt = loadPrompt('tools/datetime');
            expect(prompt).toContain('REQUIRED');
            expect(prompt).toContain('current date and time');
        });

        it('should substitute template variables when provided', () => {
            // Template substitution works even if no variables exist in file
            const prompt = loadPrompt('tools/search-web', {testVar: 'testValue'});
            expect(prompt).toContain('Search the web');
        });

        it('should cache prompts for repeated loads', () => {
            const prompt1 = loadPrompt('system/home-assistant');
            const prompt2 = loadPrompt('system/home-assistant');
            expect(prompt1).toBe(prompt2); // Same reference from cache
        });

        it('should handle different variable combinations', () => {
            // Different variable objects produce different cache keys
            // Even if content is the same, the loader handles both calls correctly
            const prompt1 = loadPrompt('tools/search-web', {a: 1});
            const prompt2 = loadPrompt('tools/search-web', {a: 2});
            // Both should load successfully and contain expected content
            expect(prompt1).toContain('Search the web');
            expect(prompt2).toContain('Search the web');
        });

        it('should throw on missing prompt file', () => {
            expect(() => loadPrompt('missing/nonexistent')).toThrow();
        });

        it('should trim whitespace from prompts', () => {
            const prompt = loadPrompt('system/ollama-hints');
            expect(prompt).not.toMatch(/^\s/);
            expect(prompt).not.toMatch(/\s$/);
        });
    });

    describe('preloadPrompts', () => {
        it('should validate all required prompts exist', () => {
            // Should not throw if all prompts exist
            expect(() => preloadPrompts()).not.toThrow();
        });

        it('should list required prompts', () => {
            const required = getRequiredPrompts();
            expect(required).toContain('system/home-assistant');
            expect(required).toContain('tools/search-web');
            expect(required).toContain('tools/datetime');
            expect(required.length).toBeGreaterThanOrEqual(8);
        });
    });

    describe('clearPromptCache', () => {
        it('should clear the cache', () => {
            // Load and cache a prompt
            loadPrompt('system/home-assistant');

            // Clear cache
            clearPromptCache();

            // The next load should re-read from file (can't easily verify without mocking fs)
            // But at least verify it still works
            const prompt = loadPrompt('system/home-assistant');
            expect(prompt).toContain('helpful home automation assistant');
        });
    });
});
