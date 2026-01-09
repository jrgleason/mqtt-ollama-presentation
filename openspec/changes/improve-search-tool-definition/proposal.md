# Proposal: improve-search-tool-definition

## Summary

Improve the `search_web` tool definition to guide AI behavior more effectively. The focus is on the tool's description, parameter schema, and examples - not the implementation.

## Problem Statement

The current `search_web` tool definition has several weaknesses that cause AI models to:

1. **Use outdated information instead of searching** - The AI doesn't know it MUST search for current events
2. **Generate wrong search queries** - No guidance on including the current year or avoiding stale years
3. **Misunderstand tool capabilities** - Description says "Google" but uses DuckDuckGo
4. **Fail to search for appropriate queries** - Examples are too limited (only 3 examples)
5. **Not know when to avoid searching** - No negative examples (what NOT to search for)

### Comparison: DateTime Tool vs Search Tool

The `dateTimeTool` has an effective definition pattern:

```javascript
description: 'REQUIRED: Get the accurate current date and time from the system clock.
              You MUST call this function whenever the user asks about any temporal/calendar information...'
```

The `searchTool` has a weak definition:

```javascript
description: 'Search the web for current information, news, facts, or answers.
              Use this for questions about current events... Returns real-time search results from Google.'
```

**Key differences:**
- DateTime uses "REQUIRED" and "You MUST" - Search uses passive "Use this for"
- DateTime specifies trigger conditions - Search lists vague categories
- DateTime description matches its capability - Search claims "Google" but uses DuckDuckGo

## Proposed Changes

### 1. Mandatory Language for Current Events

Add explicit "REQUIRED" and "MUST" language for time-sensitive queries:

```javascript
description: 'REQUIRED: Search the web for current information. You MUST use this tool for ANY question about:
- Current political leaders (president, prime minister, etc.)
- Recent news or events (anything in the last 2 years)
- Sports scores, election results, or standings
- Prices, stock values, or financial data
- Weather conditions
- Any factual claim you are uncertain about

DO NOT rely on your training data for current facts - it may be outdated.'
```

### 2. Query Formatting Guidance

Add a `query_guidance` field or enhance parameter description:

```javascript
query: {
    type: 'string',
    description: 'The search query. IMPORTANT: For current events, ALWAYS include the current year.
                  Example: "US president 2026" not just "US president"'
}
```

### 3. Expanded Examples

Provide more examples covering different query types:

```javascript
// Current politics
"current US president 2026"
"UK prime minister 2026"

// News/events
"latest SpaceX launch 2026"
"Super Bowl winner 2026"

// Factual data
"silver spot price today"
"Tesla stock price"
"weather in Columbus Ohio"

// NOT to search (negative examples in description)
"Don't search for: historical facts (WW2 dates), math, definitions, general knowledge that doesn't change"
```

### 4. Accurate Capability Description

Update description to match actual implementation:

- Remove "Google" reference (uses DuckDuckGo)
- Set accurate expectations for result format
- Note that results are text snippets, not structured data

## Scope

**In Scope:**
- Tool definition object (`searchTool` in `search-tool.js` lines 159-179)
- Parameter descriptions and examples
- Tool-execution spec updates

**Out of Scope:**
- Playwright browser automation implementation
- DuckDuckGo API fallback logic
- Result extraction/parsing code
- Year replacement logic in `executeSearchTool`

## Success Criteria

1. AI models use `search_web` for ALL current event questions without prompting
2. AI models include the current year in search queries automatically
3. AI models do NOT search for static facts (math, historical dates, definitions)
4. Tool description accurately reflects capabilities (no "Google" reference)

## Related Changes

- `add-playwright-web-search-fallback` (abandoned - post-mortem in CLAUDE.md)
- `improve-datetime-tool-usage` (archived - used "REQUIRED" pattern successfully)

## Risks

- Small models (qwen2.5:0.5b) may ignore long descriptions - keep it concise
- Too many examples may confuse rather than help - limit to 5-7 examples
- System prompt also affects tool usage - changes may need coordination

## Approval

- [ ] Review by project maintainer
