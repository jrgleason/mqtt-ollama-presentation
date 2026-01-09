# Design: Simplify Tool Management

## Context

The current tool management architecture was designed before we adopted `@langchain/mcp-adapters`. It includes:

1. **ToolRegistry** - Map-based storage with schema conversion and executor wrapping
2. **ToolExecutor** - Delegates to registry to find and execute tools
3. **AIRouter** - Gets tool definitions from registry for AI clients
4. **AnthropicClient** - Converts tools from "Ollama format" to "LangChain format"

This made sense when we had custom MCP client code. Now that we use LangChain's MCP adapters, most of this is redundant.

## Goals / Non-Goals

### Goals
- **Simplify tool management** to align with LangChain.js patterns
- **Remove redundant abstractions** (ToolRegistry, schema conversion)
- **Reduce code** from ~240 lines to ~50 lines
- **Maintain all existing functionality** (no behavior changes)
- **Improve code clarity** for future maintainers

### Non-Goals
- Not changing MCP integration (`@langchain/mcp-adapters` stays)
- Not changing tool execution semantics (still async, still returns strings)
- Not changing AI client APIs (AnthropicClient, OllamaClient)
- Not adding new features (purely refactoring)

## Decisions

### Decision 1: Replace ToolRegistry with Simple ToolManager

**What:** Replace Map-based ToolRegistry (240 lines) with array-based ToolManager (50 lines)

**Why:**
- LangChain tools don't need registration - they're ready to use
- Map storage is unnecessary when we can use `Array.find()`
- Schema conversion is redundant (tools already have schemas)
- Executor wrapping is redundant (tools already have `invoke()` method)

**Implementation:**
```javascript
// Old: ToolRegistry
class ToolRegistry {
  #tools = new Map();

  registerLangChainTool(langchainTool) {
    this.#tools.set(toolName, {
      definition: this._convertLangChainSchema(langchainTool),  // Redundant
      executor: (args) => langchainTool.invoke({ input: args })  // Redundant wrapper
    });
  }

  getExecutor(name) {
    return this.#tools.get(name)?.executor;
  }

  getDefinitions() {
    return Array.from(this.#tools.values()).map(t => t.definition);
  }
}

// New: ToolManager
class ToolManager {
  constructor() {
    this.tools = [];  // Simple array
  }

  addMCPTools(mcpTools) {
    this.tools.push(...mcpTools);  // No conversion needed
  }

  addCustomTool(tool) {
    this.tools.push(tool);
  }

  getTools() {
    return this.tools;  // Return for AI client directly
  }

  findTool(name) {
    return this.tools.find(t => t.name === name || t.lc_name === name);
  }
}
```

**Benefits:**
- 80% code reduction (240 → 50 lines)
- No unnecessary schema conversion
- No unnecessary executor wrapping
- Easier to understand (array vs Map)

---

### Decision 2: Call LangChain Tools Directly

**What:** Call `tool.invoke({ input: args })` directly instead of going through executor wrapper

**Why:**
- LangChain tools are already callable objects with `invoke()` method
- The executor wrapper adds no value: `executor: (args) => tool.invoke({ input: args })`
- Direct calls are clearer and faster (less indirection)

**Implementation:**
```javascript
// Old: ToolExecutor
async execute(toolName, args) {
  const executor = this.registry.getExecutor(toolName);
  return await executor(args);  // Calls wrapper which calls tool.invoke()
}

// New: ToolExecutor
async execute(toolName, args) {
  const tool = this.toolManager.findTool(toolName);
  if (!tool) {
    return `Error: Unknown tool "${toolName}"`;
  }
  return await tool.invoke({ input: args });  // Call directly
}
```

**Benefits:**
- Fewer abstraction layers (2 → 1)
- Clearer code (obvious what's happening)
- Slightly faster (no wrapper function call)

---

### Decision 3: Remove Schema Conversion in AI Clients

**What:** Pass LangChain tools directly to AI clients without format conversion

**Why:**
- `AnthropicClient.convertToolToLangChainFormat()` converts from "Ollama format" to "LangChain format"
- But if we're using LangChain MCP tools, they're already in LangChain format
- The conversion is redundant and adds complexity

**Current Code:**
```javascript
// AnthropicClient.js line 194-196
if (options.tools && options.tools.length > 0) {
  const langchainTools = options.tools.map(AnthropicClient.convertToolToLangChainFormat);
  client = client.bindTools(langchainTools);
}
```

**Proposed Change:**
```javascript
// If tools are already LangChain format (from MCP adapters)
if (options.tools && options.tools.length > 0) {
  client = client.bindTools(options.tools);  // Pass directly
}
```

**Risk Mitigation:**
- Test with both MCP tools (LangChain format) and custom tools
- If custom tools need conversion, keep conversion only for those
- Document which tools need conversion and why

---

### Decision 4: Keep or Remove Parameter Normalization?

**What:** Evaluate if `normalizeParameters()` (snake_case → camelCase) is still needed

**Why:**
- ToolRegistry has logic to convert `device_name` → `deviceName`
- This was needed because LangChain tools use snake_case but our MCP server expects camelCase
- But LangChain MCP adapters might already handle this conversion

**Testing Plan:**
1. Remove normalization temporarily
2. Test MCP tool calls: `control_zwave_device({ device_name: "Switch One" })`
3. Check if MCP server receives `{ deviceName: "Switch One" }` or `{ device_name: "Switch One" }`
4. If server receives camelCase → Remove normalization (adapters handle it)
5. If server receives snake_case → Keep normalization (still needed)

**Expected Outcome:** Adapters likely handle it, so we can remove normalization logic (~80 lines)

---

## Data Flow Diagrams

### Current Tool Execution Flow (Before)

```
User Query
    ↓
AIRouter.query()
    ↓
AI Client (Anthropic/Ollama)
    |
    ├─ Get tools: registry.getDefinitions()
    |  └─ ToolRegistry extracts definitions from Map
    |
    ├─ Convert tools: convertToolToLangChainFormat()
    |  └─ Schema conversion (Ollama format → LangChain format)
    |
    ├─ Model decides to call tool
    |
    └─ Execute tool
        ↓
    ToolExecutor.execute(toolName, args)
        ↓
    executor = registry.getExecutor(toolName)
        ↓
    executor(args)  ← Wrapper function
        ↓
    tool.invoke({ input: args })
        ↓
    Result
```

**Abstraction Layers:** 6 (Router → Client → Registry → Executor → Wrapper → Tool)

### Simplified Tool Execution Flow (After)

```
User Query
    ↓
AIRouter.query()
    ↓
AI Client (Anthropic/Ollama)
    |
    ├─ Get tools: toolManager.getTools()
    |  └─ Returns tools array directly
    |
    ├─ Pass tools directly to model (no conversion)
    |
    ├─ Model decides to call tool
    |
    └─ Execute tool
        ↓
    ToolExecutor.execute(toolName, args)
        ↓
    tool = toolManager.findTool(toolName)
        ↓
    tool.invoke({ input: args })
        ↓
    Result
```

**Abstraction Layers:** 4 (Router → Client → Executor → Tool)

**Improvement:** 33% fewer layers, clearer flow

---

## File Structure Changes

### Files Modified
- `src/services/ToolManager.js` (NEW - replaces ToolRegistry.js)
- `src/services/ToolExecutor.js` (UPDATED - use ToolManager)
- `src/ai/AIRouter.js` (UPDATED - get tools from ToolManager)
- `src/AnthropicClient.js` (UPDATED - remove schema conversion)
- `src/OllamaClient.js` (UPDATED - remove schema conversion if exists)
- `src/main.js` (UPDATED - initialize ToolManager)

### Files Removed
- `src/services/ToolRegistry.js` (DELETED - 240 lines)

### Net Code Change
- **Deleted:** ~320 lines (ToolRegistry + conversions)
- **Added:** ~50 lines (ToolManager)
- **Net Reduction:** ~270 lines (45% reduction in tool management code)

---

## Error Handling Strategy

### Keep Existing Error Handling

**What stays the same:**
- ToolExecutor timeout protection (30 seconds)
- User-friendly error messages
- Logging with context
- Sanitization of sensitive arguments
- Performance monitoring (slow tool warnings)

**What changes:**
- Error message for unknown tool now references ToolManager
- No changes to error recovery or formatting logic

**Example:**
```javascript
// Error message stays user-friendly
if (!tool) {
  this.logger.warn(`Unknown tool requested: ${toolName}`, {
    availableTools: this.toolManager.getTools().map(t => t.name || t.lc_name)
  });
  return `Error: Unknown tool "${toolName}". Available tools: ${toolNames.join(', ')}`;
}
```

---

## Performance Considerations

### Expected Performance Impact

**Tool Discovery:** Slightly faster (array iteration vs Map lookup for small tool counts)
**Tool Execution:** Slightly faster (one fewer function call - no executor wrapper)
**Memory:** Lower (no duplicate storage of tools in Map)

**Benchmarks (Expected):**
- Tool lookup: <1ms (same for both Map and Array with <20 tools)
- Tool execution overhead: -1ms (remove wrapper call)
- Memory per tool: -200 bytes (no duplicate definition/executor objects)

**Total Impact:** Negligible for user-facing performance, but cleaner and faster code

---

## Testing Strategy

### Unit Tests

**ToolManager:**
- Test `addMCPTools()` with mock LangChain tools
- Test `addCustomTool()` with mock custom tool
- Test `getTools()` returns all tools
- Test `findTool()` by name and lc_name

**ToolExecutor:**
- Test `execute()` calls `tool.invoke({ input: args })`
- Test unknown tool returns error
- Test timeout protection still works
- Test error formatting unchanged

**AIRouter:**
- Test `getTools()` retrieval from ToolManager
- Test tools passed correctly to AI clients

### Integration Tests

**MCP Tool Execution:**
- Test `list_zwave_devices` tool call
- Test `control_zwave_device` tool call
- Verify results same as before refactoring

**Custom Tool Execution:**
- Test datetime, search, volume tools
- Verify results same as before refactoring

**Error Scenarios:**
- Unknown tool request
- Tool execution timeout
- Tool execution error
- MCP connection failure

### Regression Tests

**Run Existing Test Suite:**
- All ToolExecutor tests
- All AIRouter tests
- All integration tests
- Verify 100% pass rate

---

## Migration Risks & Mitigation

### Risk 1: Parameter Normalization Still Needed

**Risk:** Removing normalization breaks MCP tools (server doesn't understand snake_case)

**Likelihood:** Low - LangChain MCP adapters likely handle this

**Mitigation:**
1. Test without normalization first
2. If it breaks, keep normalization in ToolManager
3. Document why normalization is needed

**Rollback:** Add back normalization to ToolManager if needed

---

### Risk 2: Schema Conversion Still Needed for Custom Tools

**Risk:** Custom tools might be in "Ollama format" and need conversion

**Likelihood:** Medium - depends on how custom tools are defined

**Mitigation:**
1. Audit all custom tools (datetime, search, volume)
2. Convert them to LangChain format if needed
3. If conversion needed, keep `convertToolToLangChainFormat()` for custom tools only

**Rollback:** Keep schema conversion for custom tools, skip for MCP tools

---

### Risk 3: Breaking Change in Tool API

**Risk:** Refactoring changes tool API unexpectedly

**Likelihood:** Very Low - well-tested code paths

**Mitigation:**
1. Comprehensive test suite before merging
2. Manual testing of all tools
3. Git revert ready if issues found

**Rollback:** Simple `git revert` to previous commit

---

## Open Questions

1. **Do LangChain MCP adapters handle parameter normalization?**
   - **Action:** Test MCP tool call without normalization
   - **Decision:** Remove normalization if adapters handle it

2. **Are custom tools already in LangChain format?**
   - **Action:** Audit custom tool definitions
   - **Decision:** Convert to LangChain format or keep conversion

3. **Is there other redundant code we haven't identified?**
   - **Action:** Code review during implementation
   - **Decision:** Document findings, create follow-up tasks if needed

---

## Success Criteria

1. ✅ **Code Reduction:** 240 → 50 lines (80% reduction in ToolRegistry)
2. ✅ **Behavior Preserved:** All tools work identically
3. ✅ **Tests Pass:** 100% test pass rate
4. ✅ **Performance:** Same or better tool execution latency
5. ✅ **Clarity:** New code easier to understand and maintain
6. ✅ **Documentation:** Code comments and README updated
7. ✅ **No Regressions:** Full voice interaction flow works

---

## Alternatives Considered

### Alternative 1: Keep ToolRegistry, Simplify Internally

**What:** Keep ToolRegistry class but simplify internal implementation

**Rejected because:**
- Still maintains unnecessary abstraction layer
- Doesn't address root cause (redundancy with LangChain)
- Harder to understand why we have registry if LangChain doesn't use one

### Alternative 2: Use LangChain Tools Directly (No Manager at All)

**What:** Pass tool arrays around directly, no ToolManager class

**Rejected because:**
- Need centralized place to combine MCP + custom tools
- Need tool lookup by name for ToolExecutor
- ToolManager is minimal (50 lines) and provides clear API

### Alternative 3: Keep Everything As Is

**What:** Don't refactor, keep current ToolRegistry

**Rejected because:**
- Violates "use framework patterns" principle
- Harder to maintain (more code to understand)
- Confusing for new developers (why do we have registry?)

---

## References

- [LangChain.js Tools Documentation](https://docs.langchain.com/oss/javascript/langchain/tools)
- [LangChain MCP Adapters](https://docs.langchain.com/oss/javascript/langchain/mcp)
- Current Implementation: `src/services/ToolRegistry.js`
- Current Implementation: `src/services/ToolExecutor.js`
