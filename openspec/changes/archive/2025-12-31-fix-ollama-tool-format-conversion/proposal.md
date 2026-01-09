# Proposal: Fix Ollama Tool Format Conversion

## Problem Statement

When using Ollama with qwen3:0.6b model, the AI cannot see or use the registered tools properly. The AI responds with messages like:

> "I don't have access to list available devices through the provided tools."
> "All the functions are empty except for one, which doesn't have any parameters."

Even though 6 tools (3 MCP + 3 custom) are successfully registered and logged.

### Root Cause

According to [Qwen documentation](https://qwen.readthedocs.io/en/latest/framework/function_call.html), Qwen models expect tools in a specific format:

**Qwen Expected Format:**
```json
{
  "type": "function",
  "function": {
    "name": "get_current_temperature",
    "description": "Get current temperature at a location.",
    "parameters": {
      "type": "object",
      "properties": { ... }
    }
  }
}
```

**Current Format (LangChain):**
```javascript
{
  name: "list_zwave_devices",
  description: "...",
  schema: { type: "object", properties: { ... } },
  invoke: [Function],
  lc_name: "..."
}
```

The problem occurs in `OllamaClient.js` where tools are passed directly to Ollama without format conversion:

```javascript
// OllamaClient.js line 79-81
if (options.tools && options.tools.length > 0) {
    chatOptions.tools = options.tools;  // ❌ LangChain format, not Qwen format
}
```

### Why This Works with Anthropic

The `AnthropicClient.js` uses LangChain's `@langchain/anthropic` package which handles tool format conversion internally when calling `.bindTools()`. The Ollama JS client doesn't have this luxury - it passes tools directly to the API.

## Proposed Solution

Add a tool format converter in `OllamaClient.js` that transforms LangChain tools to Qwen-compatible format before passing them to Ollama.

### Key Design Decisions

1. **Where:** Convert in `OllamaClient.js` (line 79-81) just before passing to Ollama API
2. **Format:** Convert `{name, schema, invoke}` → `{type: "function", function: {name, parameters}}`
3. **Scope:** Only affects Ollama client (Anthropic client unchanged)
4. **Testing:** Unit tests to verify conversion + integration test with qwen3:0.6b

### Benefits

- **Minimal change:** Single conversion function in OllamaClient.js
- **Isolated:** No changes to ToolManager or tool definitions
- **Maintains compatibility:** LangChain format preserved throughout codebase
- **Aligns with docs:** Matches official Qwen tool calling specification

### Risks

- **Low:** This is a pure format transformation with no business logic changes
- **Tested pattern:** Same pattern used by LangChain's Anthropic adapter

## Acceptance Criteria

1. ✅ Tool format converter added to `OllamaClient.js`
2. ✅ Converter transforms LangChain tools to Qwen format
3. ✅ Unit tests verify conversion logic
4. ✅ Integration test: qwen3:0.6b can see and use all 6 tools
5. ✅ AI response includes successful tool calls (e.g., listing Z-Wave devices)
6. ✅ No changes to ToolManager, tool definitions, or Anthropic client

## Out of Scope

- Changing ToolManager storage format (stays LangChain)
- Modifying custom tool definitions (already correct)
- Adding streaming support for tool calls
- Parameter normalization changes (already handled separately)

## References

- Qwen Documentation: https://qwen.readthedocs.io/en/latest/framework/function_call.html
- Current code: `apps/voice-gateway-oww/src/OllamaClient.js` lines 79-81
- Tool definitions: `apps/voice-gateway-oww/src/tools/datetime-tool.js`
