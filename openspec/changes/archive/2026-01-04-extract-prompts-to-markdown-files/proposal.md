# Proposal: extract-prompts-to-markdown-files

## Summary

Extract all AI prompts from inline strings in JavaScript code to separate markdown files. This improves prompt maintainability, enables non-developer editing, and provides better version control visibility.

## Problem Statement

Currently, AI prompts are embedded as inline strings throughout the codebase:

1. **System prompts** scattered across multiple files:
   - `AIRouter.js` - main system prompt with conditional Ollama hints
   - `AnthropicClient.js` - fallback system prompt
   - `OllamaClient.js` - fallback system prompt

2. **Tool descriptions** in tool definition objects:
   - `search-tool.js` - multi-line tool description and parameter help
   - `datetime-tool.js` - tool description
   - `volume-control-tool.js` - tool description

### Current Issues

1. **Hard to edit** - Prompts require JavaScript knowledge to modify
2. **Poor diff visibility** - Prompt changes buried in code diffs
3. **No syntax highlighting** - Editors don't highlight prompt content
4. **Escaping issues** - Template literals require escaping backticks
5. **Duplication** - Fallback prompts duplicated across AI clients
6. **No separation of concerns** - Prompt content mixed with code logic

### Example: Current Inline Prompt

```javascript
// AIRouter.js line 42-43
this.defaultSystemPrompt = config.ai.systemPrompt ||
    `You are a helpful home automation assistant. Answer in 1 sentence or less. Be direct. No explanations. English only.${isOllama ? ' Do NOT use <think> tags.' : ''} IMPORTANT: For questions about current events...`;
```

### Example: Proposed Markdown File

```markdown
<!-- prompts/system/home-assistant.md -->
You are a helpful home automation assistant. Answer in 1 sentence or less.
Be direct. No explanations. English only.

IMPORTANT: For questions about current events, news, elections, who is
president, or anything requiring up-to-date information, you MUST use
the search_web tool first - do NOT rely on your training data.
```

## Proposed Changes

### 1. Create Prompts Directory Structure

```
apps/voice-gateway-oww/
├── prompts/
│   ├── system/
│   │   ├── home-assistant.md       # Main system prompt
│   │   ├── ollama-hints.md         # Ollama-specific additions
│   │   ├── device-context.md       # Device tool hint
│   │   └── datetime-context.md     # Datetime tool hint
│   └── tools/
│       ├── search-web.md           # Search tool description
│       ├── search-web-query.md     # Query parameter description
│       ├── datetime.md             # Datetime tool description
│       └── volume-control.md       # Volume tool description
└── src/
    └── util/
        └── prompt-loader.js        # Utility to load and cache prompts
```

### 2. Create Prompt Loader Utility

Simple Node.js utility to:
- Load markdown files synchronously at startup
- Cache prompts in memory
- Support template variables (e.g., `{{year}}`)
- Strip markdown metadata (if any)

### 3. Update Code to Use Loader

Replace inline strings with loader calls:

```javascript
// Before
description: `REQUIRED: Search the web for current information...`

// After
import { loadPrompt } from '../util/prompt-loader.js';
description: loadPrompt('tools/search-web')
```

### 4. Handle Dynamic Content

For prompts with runtime values (like current year), use simple template syntax:

```markdown
<!-- prompts/tools/search-web.md -->
ALWAYS include the current year in queries.
Example: "US president {{year}}" not "US president"
```

## Scope

**In Scope:**
- System prompts (AIRouter, fallbacks in AI clients)
- Tool descriptions (search, datetime, volume)
- Tool parameter descriptions
- Dynamic prompt hints (device context, datetime context)
- Prompt loader utility

**Out of Scope:**
- Oracle app prompts (different module)
- MCP server prompts (if any)
- Test fixture prompts

## Success Criteria

1. All prompts in `apps/voice-gateway-oww/src/` moved to markdown files
2. No inline prompt strings longer than 100 characters remain in code
3. Prompts editable without JavaScript knowledge
4. Git diffs clearly show prompt changes
5. All existing tests pass
6. No runtime performance regression (prompts loaded once at startup)

## Benefits

| Aspect | Before | After |
|--------|--------|-------|
| Edit prompts | Requires JS knowledge | Edit markdown files |
| Version control | Changes hidden in code | Clear prompt-only diffs |
| Syntax highlighting | None | Markdown highlighting |
| Character escaping | Template literal issues | Plain text |
| Duplication | Fallback prompts duplicated | Single source of truth |
| Documentation | Prompts are code | Prompts are documentation |

## Risks

- **Startup time** - File I/O at startup (mitigated: synchronous load, cache)
- **Missing files** - Runtime error if prompt file missing (mitigated: validate at startup)
- **Path issues** - Relative paths in different contexts (mitigated: use `import.meta.url`)

## Related

- `improve-search-tool-definition` - Recently updated search prompt patterns
- `code-organization` spec - Existing requirements for code structure
