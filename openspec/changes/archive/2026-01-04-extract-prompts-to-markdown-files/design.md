# Design: Prompt Loading Architecture

## Overview

This document describes the technical approach for loading AI prompts from markdown files instead of inline strings.

## Design Goals

1. **Simple** - Minimal abstraction, easy to understand
2. **Fast** - No runtime overhead after initial load
3. **Safe** - Fail fast if prompts are missing
4. **Flexible** - Support template variables for dynamic content

## Prompt Loader Implementation

### Core Loader Function

```javascript
// src/util/prompt-loader.js
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPTS_DIR = join(__dirname, '../../prompts');

// Cache for loaded prompts
const promptCache = new Map();

/**
 * Load a prompt from markdown file
 * @param {string} name - Prompt name (e.g., 'system/home-assistant')
 * @param {Object} [vars] - Template variables to substitute
 * @returns {string} Prompt content
 */
export function loadPrompt(name, vars = {}) {
    const cacheKey = JSON.stringify({ name, vars });

    if (promptCache.has(cacheKey)) {
        return promptCache.get(cacheKey);
    }

    const filePath = join(PROMPTS_DIR, `${name}.md`);
    let content = readFileSync(filePath, 'utf-8');

    // Strip markdown frontmatter if present
    content = content.replace(/^---[\s\S]*?---\n/, '');

    // Substitute template variables
    for (const [key, value] of Object.entries(vars)) {
        content = content.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }

    // Trim and normalize whitespace
    content = content.trim();

    promptCache.set(cacheKey, content);
    return content;
}

/**
 * Preload all prompts at startup (validates they exist)
 */
export function preloadPrompts() {
    const requiredPrompts = [
        'system/home-assistant',
        'system/ollama-hints',
        'system/device-context',
        'system/datetime-context',
        'tools/search-web',
        'tools/search-web-query',
        'tools/datetime',
        'tools/volume-control',
    ];

    for (const name of requiredPrompts) {
        loadPrompt(name); // Will throw if missing
    }
}
```

### Template Variable Substitution

For dynamic content like the current year:

```markdown
<!-- prompts/tools/search-web.md -->
ALWAYS include the current year in queries.
Example: "US president {{year}}" not "US president"
```

Usage:
```javascript
import { loadPrompt } from '../util/prompt-loader.js';

const description = loadPrompt('tools/search-web', { year: new Date().getFullYear() });
```

## Directory Structure

```
apps/voice-gateway-oww/
├── prompts/
│   ├── README.md                   # Documentation for prompt authors
│   ├── system/
│   │   ├── home-assistant.md       # Core personality and rules
│   │   ├── ollama-hints.md         # "Do NOT use <think> tags"
│   │   ├── device-context.md       # "You have tools to control Z-Wave..."
│   │   └── datetime-context.md     # "You have get_current_datetime..."
│   └── tools/
│       ├── search-web.md           # Main tool description
│       ├── search-web-query.md     # Query parameter help text
│       ├── datetime.md             # Datetime tool description
│       └── volume-control.md       # Volume control description
```

## Integration Patterns

### Pattern 1: System Prompt Composition

AIRouter builds system prompt from multiple markdown files:

```javascript
// AIRouter.js
import { loadPrompt } from './util/prompt-loader.js';

constructor(config, logger, toolExecutor) {
    const isOllama = config.ai.provider === 'ollama';

    // Load base prompt
    let systemPrompt = loadPrompt('system/home-assistant');

    // Add Ollama-specific hints
    if (isOllama) {
        systemPrompt += ' ' + loadPrompt('system/ollama-hints');
    }

    this.defaultSystemPrompt = config.ai.systemPrompt || systemPrompt;
}

async buildSystemPrompt(includeDevices, includeDateTime) {
    let prompt = this.defaultSystemPrompt;

    if (includeDevices) {
        prompt += '\n\n' + loadPrompt('system/device-context');
    }

    if (includeDateTime) {
        prompt += '\n\n' + loadPrompt('system/datetime-context');
    }

    return prompt;
}
```

### Pattern 2: Tool Definitions

Tool files import descriptions from markdown:

```javascript
// search-tool.js
import { loadPrompt } from '../util/prompt-loader.js';

export const searchTool = {
    type: 'function',
    function: {
        name: 'search_web',
        description: loadPrompt('tools/search-web', {
            year: new Date().getFullYear()
        }),
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: loadPrompt('tools/search-web-query', {
                        year: new Date().getFullYear()
                    })
                }
            },
            required: ['query']
        }
    }
};
```

### Pattern 3: Fallback Prompts Elimination

Remove duplicate fallback prompts from AI clients:

```javascript
// AnthropicClient.js - BEFORE
const systemPrompt = options.systemPrompt ||
    'You are a helpful home automation assistant...';

// AnthropicClient.js - AFTER
const systemPrompt = options.systemPrompt ||
    loadPrompt('system/home-assistant');
```

## Performance Considerations

### Synchronous Loading

Prompts are loaded synchronously at module initialization:
- Tool definitions are static - loaded once when module imports
- System prompts are loaded in constructor - happens once at startup

### Caching

All prompts are cached after first load:
- No file I/O after startup
- Template variable combinations cached separately
- Memory usage: ~10KB for all prompts (negligible)

### Startup Validation

`preloadPrompts()` called in `main.js` to fail fast:
```javascript
// main.js
import { preloadPrompts } from './util/prompt-loader.js';

// Validate all prompts exist before starting
preloadPrompts();
```

## Error Handling

### Missing Prompt File

```javascript
// Throws with clear error message
loadPrompt('tools/missing');
// Error: ENOENT: no such file or directory, open '.../prompts/tools/missing.md'
```

### Missing Template Variable

Template variables that aren't provided are left as-is:
```javascript
loadPrompt('tools/search-web'); // {{year}} left in output
```

This allows detection of missed substitutions in logs.

## Migration Strategy

1. Create `prompts/` directory with all prompt files
2. Create `prompt-loader.js` utility
3. Update one file at a time (search-tool first, then datetime, etc.)
4. Run tests after each file migration
5. Remove inline fallback prompts last (after all usages migrated)

## Testing Strategy

### Unit Tests for Prompt Loader

```javascript
describe('prompt-loader', () => {
    it('loads prompt from markdown file', () => {
        const prompt = loadPrompt('system/home-assistant');
        expect(prompt).toContain('helpful home automation assistant');
    });

    it('substitutes template variables', () => {
        const prompt = loadPrompt('tools/search-web', { year: 2026 });
        expect(prompt).toContain('2026');
        expect(prompt).not.toContain('{{year}}');
    });

    it('throws on missing prompt', () => {
        expect(() => loadPrompt('missing/prompt')).toThrow();
    });
});
```

### Integration Tests

Existing AIRouter tests continue to work - they test behavior, not implementation.
