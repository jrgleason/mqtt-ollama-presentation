# Proposal: Improve DateTime Tool Usage for Small Models

## Summary

Improve datetime query handling so smaller Ollama models (qwen3:0.6b) reliably use the `get_current_datetime` tool when users ask about time, date, or day of week.

## Problem Statement

When using Ollama with qwen3 models, the AI fails to use the `get_current_datetime` tool for temporal queries:

**Example failure:**
```
User: "What day of the week is it?"
AI: "I don't have access to current date or weekly information through the provided tools."
```

This happens because:
1. IntentClassifier pattern `/what day is (it|today)/i` doesn't match "day of the week"
2. Small models don't reliably pick up on tool descriptions alone
3. The system prompt doesn't hint that datetime tools are available

Anthropic models work fine because they better understand tool descriptions.

## Analysis

### Root Causes

1. **IntentClassifier gap**: Missing pattern for "day of the week" phrasing
2. **No datetime prompt hint**: System prompt only adds device hints, not datetime hints
3. **Small model limitation**: qwen3:0.6b needs explicit guidance to use tools

### Current Flow

1. User asks "What day of the week is it?"
2. IntentClassifier returns `isDateTimeQuery: false` (no pattern match)
3. AIRouter builds system prompt without datetime hints
4. AI doesn't use the `get_current_datetime` tool
5. AI says it doesn't have access to date information

### Proposed Flow

1. User asks "What day of the week is it?"
2. IntentClassifier returns `isDateTimeQuery: true` (improved pattern)
3. AIRouter adds datetime tool hint to system prompt
4. AI uses `get_current_datetime` tool
5. AI responds with correct day of week

## Proposed Solution

### 1. Expand IntentClassifier Patterns

Add patterns for common datetime phrasings:
- "day of the week"
- "what's today"
- "which day"
- "today's date"

### 2. Add DateTime Prompt Hint in AIRouter

When `intent.isDateTimeQuery` is true, add to system prompt:
```
You have a get_current_datetime tool available. Use it for any time/date questions.
```

### 3. Improve Tool Description

Make the tool description more explicit for small models by:
- Adding specific trigger phrases
- Using imperative language

## Success Criteria

- [ ] "What day of the week is it?" triggers datetime tool
- [ ] "What time is it?" triggers datetime tool
- [ ] "What's the date today?" triggers datetime tool
- [ ] Works with both Ollama qwen3 and Anthropic models
- [ ] No regression in existing datetime queries

## Risks

**Low risk** - Behavioral improvement only. Fallback to direct response still works.

## Files to Modify

- `apps/voice-gateway-oww/src/services/IntentClassifier.js`
- `apps/voice-gateway-oww/src/ai/AIRouter.js`
- `apps/voice-gateway-oww/src/tools/datetime-tool.js` (optional)
