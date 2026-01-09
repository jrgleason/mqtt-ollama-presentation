# Tasks: Fix Ollama Empty First Response (Simplified)

> **Scope Note:** This is a simplified implementation focusing only on diagnostics and empty response handling.
> Phases 2-3 (tool reduction, model tuning) are deferred for future consideration.

## Phase 1: Diagnostic Improvements

### Task 1.1: Add Raw Ollama Response Logging
- [x] Log raw response before LangChain processing in OllamaClient
- [x] Capture `response.response_metadata` if available
- [x] Log tool_calls array structure (not just length)
- [x] Log response timing information

### Task 1.2: Add Query Position Tracking
- [x] Track query attempt number (1st, 2nd, 3rd) per session
- [x] Log success/failure by attempt position
- [x] Add session-scoped query counter

## Phase 2: Tool Count Reduction (DEFERRED)

> **Deferred:** Complexity not justified for demo timeline.
> Revisit if Phase 1 diagnostics confirm tool count as root cause.

### Task 2.1: Audit Current Tool Set
- [ ] ~~Document all currently bound tools~~
- [ ] ~~Categorize by priority: essential, useful, rarely-used~~
- [ ] ~~Identify tools that can be lazy-loaded~~

### Task 2.2: Implement Lazy Tool Loading
- [ ] ~~Remove non-essential tools from initial tool binding~~
- [ ] ~~Modify WebSearchFallback to bind tools on-demand~~
- [ ] ~~Update tool count to ~10 for initial binding~~

### Task 2.3: Create Tool Priority System
- [ ] ~~Define "core tools" set for smaller models~~
- [ ] ~~Implement tool set selection based on query classification~~

## Phase 3: Model Configuration Tuning (DEFERRED)

> **Deferred:** Requires extensive A/B testing not feasible before demo.
> Can be explored if Phase 4 fix doesn't resolve the issue.

### Task 3.1: Test /no_think Impact on Tool Calling
- [ ] ~~Run test queries with OLLAMA_NO_THINK=true vs false~~
- [ ] ~~Compare tool calling success rate~~
- [ ] ~~Document findings and recommendation~~

### Task 3.2: Experiment with Temperature Settings
- [ ] ~~Test different temperature values for tool calling reliability~~
- [ ] ~~Document optimal temperature for smaller models~~

### Task 3.3: Test numCtx Impact
- [ ] ~~Test different numCtx values~~
- [ ] ~~Document memory/performance tradeoffs~~

## Phase 4: Empty Response Handling

### Task 4.1: Implement Empty Tool Call Detection
- [x] Add specific check for `tool_calls.length === 0` when `hasToolCalls` is true
- [x] Log this as distinct issue: "empty tool call array"
- [x] Track this specific failure mode separately

### Task 4.2: Add Retry Without Tools
- [x] When empty tool_calls detected, retry query WITHOUT tools bound
- [x] Add prompt guidance: "Answer directly without using tools"
- [x] Return the direct answer response

### Task 4.3: Update System Prompt for Better Tool Guidance (DEFERRED)
- [ ] ~~Add explicit instruction: "Only use tools when necessary"~~
- [ ] ~~Test if clearer guidance improves first-query success~~

### Task 4.4: Implement Tool Call Warmup (DEFERRED)
- [ ] ~~After model warmup, make a simple test query with tools~~
- [ ] ~~Discard result, but prime the tool calling path~~

## Phase 5: Testing & Validation (SIMPLIFIED)

### Task 5.1: Manual Validation
- [ ] Test first-query behavior before/after changes
- [ ] Verify retry logic triggers on empty response
- [ ] Confirm Z-Wave device control still works

### Task 5.2: Update Existing Tests (DEFERRED)
- [ ] ~~Add unit tests for empty tool_calls handling~~
- [ ] ~~Add tests for retry-without-tools logic~~

## Acceptance Criteria

- [x] First query no longer returns empty response (retry provides answer)
- [x] Diagnostic logging captures raw response details
- [x] Query position tracked in logs for debugging
- [ ] Device control (Z-Wave) continues working (requires manual validation)
- [x] No increase in boot time (no additional initialization)

## Implementation Notes

**Why Simplified?**
- Demo presentation on January 12, 2026 - limited time
- Phase 4 retry logic provides immediate fix
- Phase 1 diagnostics help understand root cause
- Phases 2-3 add complexity without guaranteed benefit

**Rollback Plan:**
If retry-without-tools causes issues, can disable by reverting OllamaClient changes.
