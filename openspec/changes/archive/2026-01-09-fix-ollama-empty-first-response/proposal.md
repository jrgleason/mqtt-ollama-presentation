# Proposal: Fix Ollama Empty First Response (Simplified)

## Change ID
`fix-ollama-empty-first-response`

## Problem Statement

The voice gateway consistently returns empty AI responses on the first query when using Ollama qwen3:0.6b model. The debug logs show:

```
Raw model response {
  hasContent: false,
  contentLength: 0,
  contentPreview: '',
  hasToolCalls: true,
  toolCallsLength: 0,
  hasToolExecutor: true
}
```

**Key Symptom:** `hasToolCalls: true` but `toolCallsLength: 0` - the model indicates it wants to call tools but produces an empty array. This triggers the web search fallback, which then re-queries, but even that often fails on the first attempt.

## Observed Behavior

1. **First query always fails** - Returns empty content, empty tool_calls array
2. **Fallback also fails** - Even with web search context, second query often returns empty
3. **Third or later queries work** - Eventually the model produces valid responses
4. **31 tools bound** - The model has many tools available which may overwhelm it

## Simplified Scope

> **Note:** This proposal has been simplified to focus on immediate fixes for the demo timeline.
> Phases 2-3 (tool reduction, model tuning) are deferred for future consideration.

### Phase 1: Diagnostic Improvements (ACTIVE)
1. Add detailed logging to understand what Ollama actually returns
2. Log the raw JSON response from Ollama before LangChain processing
3. Track query position (1st, 2nd, 3rd) in session for debugging

### Phase 2: Tool Count Reduction (DEFERRED)
~~Separate Playwright tools, reduce core tool set to <10 tools~~
*Rationale: Requires significant refactoring, may not be root cause*

### Phase 3: Model Configuration Tuning (DEFERRED)
~~Test /no_think mode, experiment with temperature/numCtx settings~~
*Rationale: Requires extensive A/B testing not feasible before demo*

### Phase 4: Empty Response Handling (ACTIVE)
1. Detect empty response pattern (hasToolCalls=true, length=0)
2. Retry WITHOUT tools bound (fall back to direct answer)
3. Return direct answer instead of empty response

## Implementation Summary

### Phase 1 Changes (OllamaClient.js)
- Add `response_metadata` logging
- Log full `tool_calls` array structure
- Add session query counter for position tracking
- Add timing metrics

### Phase 4 Changes (OllamaClient.js)
- Detect empty tool call array pattern
- Implement retry-without-tools fallback
- Add prompt guidance for direct answer

## Success Criteria

1. First query returns a response (via retry fallback)
2. Diagnostic logs capture raw response details
3. Device control (Z-Wave) continues working
4. No increase in boot time

## Scope

- **In Scope:** OllamaClient (diagnostics + retry logic)
- **Out of Scope:** ToolManager, MCPIntegration, AIRouter refactoring
- **Deferred:** Tool count reduction, model configuration tuning

## Risk Assessment

**Risk:** Retry-without-tools may give suboptimal answers for device control
**Mitigation:** Only retry when empty response detected; device queries usually get tool calls

**Risk:** Added logging may impact performance
**Mitigation:** Logging is debug-level only, production impact minimal

## Why Simplified?

1. **Demo timeline:** Presentation on January 12, 2026
2. **Immediate fix:** Phase 4 retry provides quick relief
3. **Diagnostic value:** Phase 1 logging helps understand root cause
4. **Low risk:** Minimal code changes, easy rollback
5. **Future optionality:** Can implement Phases 2-3 if needed after demo
