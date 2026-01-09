/**
 * Prompt Loader Utility
 *
 * Loads AI prompts from markdown files in the prompts/ directory.
 * Provides caching and template variable substitution.
 *
 * @see prompts/README.md for documentation
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = join(__dirname, '../../prompts');

// Cache for loaded prompts (key: JSON of {name, vars})
const promptCache = new Map();

/**
 * Load a prompt from markdown file
 *
 * @param {string} name - Prompt name relative to prompts/ (e.g., 'system/home-assistant')
 * @param {Object} [vars={}] - Template variables to substitute (e.g., { year: 2026 })
 * @returns {string} Prompt content with variables substituted
 * @throws {Error} If prompt file doesn't exist
 *
 * @example
 * // Load simple prompt
 * const prompt = loadPrompt('system/home-assistant');
 *
 * @example
 * // Load with variable substitution
 * const prompt = loadPrompt('tools/search-web', { year: 2026 });
 */
export function loadPrompt(name, vars = {}) {
    const cacheKey = JSON.stringify({ name, vars });

    if (promptCache.has(cacheKey)) {
        return promptCache.get(cacheKey);
    }

    const filePath = join(PROMPTS_DIR, `${name}.md`);
    let content = readFileSync(filePath, 'utf-8');

    // Strip markdown frontmatter if present (---\n...\n---)
    content = content.replace(/^---[\s\S]*?---\n/, '');

    // Substitute template variables {{var}}
    for (const [key, value] of Object.entries(vars)) {
        content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
    }

    // Trim whitespace
    content = content.trim();

    promptCache.set(cacheKey, content);
    return content;
}

/**
 * List of all required prompt files
 * Used by preloadPrompts() to validate at startup
 */
const REQUIRED_PROMPTS = [
    'system/home-assistant',
    'system/ollama-hints',
    'system/device-context',
    'system/datetime-context',
    'tools/search-web',
    'tools/search-web-query',
    'tools/datetime',
    'tools/volume-control',
];

/**
 * Preload and validate all required prompts
 *
 * Call this at application startup to fail fast if any prompts are missing.
 * Also warms the cache for better runtime performance.
 *
 * @throws {Error} If any required prompt file is missing
 *
 * @example
 * // In main.js
 * import { preloadPrompts } from './util/prompt-loader.js';
 * preloadPrompts(); // Throws if prompts missing
 */
export function preloadPrompts() {
    const missing = [];

    for (const name of REQUIRED_PROMPTS) {
        try {
            loadPrompt(name);
        } catch (error) {
            missing.push(name);
        }
    }

    if (missing.length > 0) {
        throw new Error(
            `Missing required prompt files:\n` +
            missing.map(n => `  - prompts/${n}.md`).join('\n')
        );
    }
}

/**
 * Clear the prompt cache
 *
 * Useful for testing or if prompts are modified at runtime.
 */
export function clearPromptCache() {
    promptCache.clear();
}

/**
 * Get list of required prompt names
 *
 * @returns {string[]} Array of required prompt names
 */
export function getRequiredPrompts() {
    return [...REQUIRED_PROMPTS];
}
