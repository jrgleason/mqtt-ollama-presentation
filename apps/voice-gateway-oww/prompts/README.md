# AI Prompts

This directory contains all AI prompts used by the voice gateway, stored as markdown files for easy editing and version control.

## Directory Structure

```
prompts/
├── system/                    # System prompts for AI behavior
│   ├── home-assistant.md      # Core personality and rules
│   ├── ollama-hints.md        # Ollama-specific instructions
│   ├── device-context.md      # Device tool availability hint
│   └── datetime-context.md    # Datetime tool availability hint
└── tools/                     # Tool descriptions for function calling
    ├── search-web.md          # Web search tool description
    ├── search-web-query.md    # Search query parameter help
    ├── datetime.md            # Datetime tool description
    └── volume-control.md      # Volume control tool description
```

## Template Variables

Prompts can include template variables using `{{variable}}` syntax:

```markdown
Example: "US president {{year}}" not "US president"
```

Variables are substituted at load time by passing an object to `loadPrompt()`:

```javascript
loadPrompt('tools/search-web', { year: 2026 })
```

## Guidelines for Editing Prompts

1. **Keep it concise** - Small models (qwen2.5:0.5b) have limited context
2. **Use imperative language** - "MUST", "REQUIRED", "ALWAYS" work better than passive suggestions
3. **Include examples** - Good/bad example pairs help AI understand intent
4. **No markdown formatting** - Content is used as plain text (no headers, lists rendered)
5. **Test changes** - Run voice gateway to verify prompt changes work

## Loading Prompts

Prompts are loaded via `src/util/prompt-loader.js`:

```javascript
import { loadPrompt } from './util/prompt-loader.js';

// Load simple prompt
const systemPrompt = loadPrompt('system/home-assistant');

// Load with variable substitution
const toolDesc = loadPrompt('tools/search-web', { year: 2026 });
```

Prompts are cached after first load - no repeated file I/O.
