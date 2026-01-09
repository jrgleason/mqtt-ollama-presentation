# Design: Fix Ollama Empty First Response

## Problem Analysis

### Current Flow (Failing)
```
User Query → OllamaClient.query()
  → bindTools(31 tools)
  → ChatOllama.invoke()
  → Response: {content: "", tool_calls: []}  ← FAILURE: Empty array
  → WebSearchFallback.shouldTrigger(empty) → true
  → searchWeb(query)
  → Re-query with context
  → Response: {content: "", tool_calls: []}  ← STILL FAILING
  → Return empty string to user
```

### Root Cause Hypothesis

The qwen3:0.6b model (600M parameters) has a limited tool-calling capacity. When presented with 31 tools, it may:

1. **Confusion**: Can't decide which tool to use, outputs empty array
2. **Schema Overload**: Tool schemas exceed model's context understanding
3. **Parsing Failure**: Tries to output tool call but LangChain can't parse it

Evidence supporting this:
- Second/third queries sometimes work (model "warms up" to tool format)
- The `hasToolCalls: true` flag suggests the model *tried* to call tools
- qwen3:0.6b documentation recommends limiting tools for small models

## Proposed Architecture

### Solution 1: Tiered Tool Loading (Recommended)

```
                    ┌─────────────────────┐
                    │   Query Received    │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ Classify Intent     │
                    │ (IntentClassifier)  │
                    └──────────┬──────────┘
                               │
         ┌─────────────────────┼─────────────────────┐
         │                     │                     │
         ▼                     ▼                     ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Device Control  │ │ Time/Date Query │ │ General Query   │
│ (Z-Wave tools)  │ │ (datetime tool) │ │ (no tools)      │
│    6 tools      │ │    1 tool       │ │    0 tools      │
└─────────────────┘ └─────────────────┘ └─────────────────┘
         │                     │                     │
         │                     │                     │
         └─────────────────────┼─────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │ If empty response   │
                    │ → Enable Playwright │
                    │   (fallback only)   │
                    └─────────────────────┘
```

**Tool Tiers:**
- **Tier 0 (Essential)**: `control_zwave_device`, `list_devices` - Always bound for device queries
- **Tier 1 (Utility)**: `get_current_datetime` - Bound for time queries
- **Tier 2 (Fallback)**: Playwright tools - Only bound when web search triggered

### Solution 2: Empty Tool Call Retry Strategy

```
Query with Tools
       │
       ▼
┌─────────────────┐
│ Invoke ChatOllama │
└────────┬────────┘
         │
         ▼
    ┌────────────────────┐
    │ tool_calls empty?  │──── No ───→ Execute tools normally
    └────────┬───────────┘
             │ Yes
             ▼
    ┌────────────────────┐
    │ Retry WITHOUT tools │
    │ + "Answer directly" │
    └────────┬───────────┘
             │
             ▼
    ┌────────────────────┐
    │ Return direct answer │
    └────────────────────┘
```

### Solution 3: Tool Call Warmup

Add a "warmup query" during initialization that exercises the tool calling path:

```javascript
// In main.js, after model warmup
async function warmupToolCalling(ollamaClient, tools) {
    logger.info('🔧 Warming up tool calling...');
    try {
        // Simple query that should trigger datetime tool
        await ollamaClient.query("What time is it?", {
            tools: tools.filter(t => t.name === 'get_current_datetime'),
            toolExecutor: (name, args) => new Date().toLocaleString()
        });
        logger.info('✅ Tool calling warmup complete');
    } catch (error) {
        logger.warn('⚠️ Tool calling warmup failed', { error: error.message });
    }
}
```

## Implementation Strategy

### Priority Order

1. **Quick Win - Empty Tool Call Retry** (Phase 4.2)
   - Immediate impact
   - Low risk
   - Can be done independently

2. **Medium Term - Tiered Tool Loading** (Phase 2)
   - Addresses root cause
   - Requires IntentClassifier changes
   - Higher impact, medium risk

3. **Validation - Tool Call Warmup** (Phase 4.4)
   - Test if warmup helps
   - Can be A/B tested
   - Low risk experiment

### Code Changes Overview

```
OllamaClient.js
├── Add empty tool_calls detection
├── Implement retry-without-tools logic
└── Add detailed response logging

ToolManager.js
├── Add getToolsByTier(tier) method
├── Define ESSENTIAL_TOOLS, UTILITY_TOOLS constants
└── Update getTools() to accept tier parameter

AIRouter.js
├── Use IntentClassifier to determine tool tier
├── Call getToolsByTier(tier) based on intent
└── Track query attempt position for metrics

MCPIntegration.js
├── Separate Playwright initialization
├── Add getPlaywrightTools() lazy loader
└── Only initialize Playwright when needed

WebSearchFallback.js
├── Bind Playwright tools before search
├── Unbind after search complete
└── Track Playwright tool usage metrics
```

## Trade-offs

### Tiered Tool Loading
| Pro | Con |
|-----|-----|
| Reduces model confusion | Requires intent classification accuracy |
| Faster responses (fewer tools to consider) | Some queries may get wrong tool tier |
| Cleaner separation of concerns | More complex initialization |

### Empty Tool Call Retry
| Pro | Con |
|-----|-----|
| Simple to implement | Adds latency on failure |
| Catches edge cases | Doesn't fix root cause |
| Backward compatible | Still wastes first query attempt |

### Tool Call Warmup
| Pro | Con |
|-----|-----|
| Primes model for tool calling | Adds boot time (~2-3s) |
| May improve first-query success | May not solve the issue |
| Easy to test and measure | Could be wasted effort if not effective |

## Recommendation

Implement in order:
1. **Phase 4.2** - Empty tool call retry (immediate relief)
2. **Phase 1** - Add diagnostics (understand the problem better)
3. **Phase 2** - Tiered tool loading (if diagnostics confirm tool count issue)
4. **Phase 4.4** - Tool warmup (if diagnostics suggest cold start issue)
