# Design: Effective Tool Definitions for AI Models

## Overview

This document analyzes what makes an effective tool definition for AI models and applies those patterns to the `search_web` tool.

## Analysis: What Makes a Good Tool Definition?

### 1. Mandatory Language Patterns

**Effective (from datetime tool):**
```
"REQUIRED: Get the accurate current date and time... You MUST call this function whenever..."
```

**Ineffective (current search tool):**
```
"Search the web for current information... Use this for questions about..."
```

**Key insight:** AI models respond better to imperative commands ("MUST", "REQUIRED", "ALWAYS") than passive suggestions ("Use this for", "Can be used").

### 2. Trigger Condition Clarity

**Effective pattern:**
```
"whenever the user asks about any temporal/calendar information"
```

**Ineffective pattern:**
```
"for questions about current events, who is president, recent news..."
```

**Key insight:** Explicit trigger conditions ("whenever X") work better than lists of examples. Examples should supplement triggers, not replace them.

### 3. Negative Examples (What NOT to Do)

The datetime tool implicitly handles this by being highly specific. The search tool lacks this - it doesn't tell the AI what NOT to search for.

**Pattern to add:**
```
"DO NOT search for: mathematical calculations, historical facts that don't change,
word definitions, or information from your training data that is timeless."
```

### 4. Capability Honesty

The current search tool claims "Returns real-time search results from Google" but:
- Uses DuckDuckGo, not Google
- Returns text snippets, not "real-time" anything
- May fail or return no results

**Honest description:**
```
"Searches the web and returns text snippets from search results. Results may be incomplete
or unavailable. For best results, include the current year in queries about recent events."
```

## Proposed Tool Definition Structure

```javascript
export const searchTool = {
    type: 'function',
    function: {
        name: 'search_web',
        description: `REQUIRED: Search the web for current information.

You MUST use this tool for ANY question about:
- Current political leaders, officials, or their status
- Recent news, events, or developments (last 2 years)
- Sports scores, results, standings, or schedules
- Current prices, values, or financial data
- Weather conditions or forecasts
- Any fact you are uncertain about or that may have changed

ALWAYS include the current year in queries about current events.
Example: "US president 2026" not "US president"

DO NOT search for: math problems, historical facts, definitions, or timeless information.

Returns text snippets from search results. Results may be incomplete.`,
        parameters: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 256,
                    description: `The search query. For current events, include the year.
Good: "who is president of US 2026", "silver price today", "Super Bowl winner 2026"
Bad: "who is president" (missing year), "what is 2+2" (don't search for math)`
                }
            },
            required: ['query'],
            additionalProperties: false
        }
    }
};
```

## Design Decisions

### Decision 1: Description Length

**Options:**
1. Short description (1-2 sentences) - may not provide enough guidance
2. Medium description (5-10 lines) - balanced guidance vs. token overhead
3. Long description (15+ lines) - comprehensive but uses tokens, may confuse small models

**Chosen:** Medium (5-10 lines)

**Rationale:** Small models like qwen2.5:0.5b have limited context windows. A medium-length description provides essential guidance without overwhelming the model. The datetime tool uses ~2 sentences but for search we need more trigger conditions.

### Decision 2: Negative Examples

**Options:**
1. No negative examples - rely on positive examples only
2. Inline negative examples - "DO NOT search for: X, Y, Z"
3. Separate `avoid` field - structured data for what not to search

**Chosen:** Inline negative examples

**Rationale:** The function calling schema doesn't support custom fields. Inline examples in the description keep everything in one place and are proven effective.

### Decision 3: Query Year Guidance

**Options:**
1. System prompt only - add year guidance to system prompt
2. Tool description only - add year guidance to tool description
3. Both - reinforce in both places

**Chosen:** Both (but primarily in tool description)

**Rationale:** The tool description is closest to the point of action. System prompt reinforcement helps but tool description is the primary location. The implementation already handles year replacement as a fallback, but AI-driven year inclusion is preferred.

### Decision 4: Example Format

**Options:**
1. Freeform examples in description text
2. Structured examples array (if schema supports it)
3. Good/Bad paired examples

**Chosen:** Good/Bad paired examples in description

**Rationale:** Contrasting good vs. bad examples teaches the AI what to avoid. This pattern is more instructive than just showing good examples.

## Compatibility Considerations

### Small Models (qwen2.5:0.5b)

- Keep description under 200 tokens
- Use clear, simple language
- Front-load the most important instructions
- Minimize examples to essential ones

### Large Models (Claude, GPT-4)

- Can handle longer descriptions
- Benefit from more examples
- Can understand nuanced conditions

### Cross-Provider Compatibility

- Tool schema follows OpenAI function calling format
- Compatible with Ollama, Anthropic, and OpenAI
- No provider-specific extensions used

## Testing Strategy

1. **Unit test:** Verify tool definition compiles without errors
2. **Integration test:** AI model correctly calls search_web for current event questions
3. **Negative test:** AI model does NOT call search_web for math/definitions
4. **Query quality test:** AI includes year in current event queries

## Metrics

| Metric | Before | Target |
|--------|--------|--------|
| Search used for current events | ~50% | >95% |
| Year included in queries | ~10% | >80% |
| False searches (math, definitions) | ~20% | <5% |
