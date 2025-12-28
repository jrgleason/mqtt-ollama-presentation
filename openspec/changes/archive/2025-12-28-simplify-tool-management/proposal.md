# Change: Simplify Tool Management

## Why

The current ToolRegistry abstraction is **redundant** with LangChain.js's built-in tool management. The `@langchain/mcp-adapters` package provides tools via `mcpClient.getTools()` that are already LangChain-compatible and ready to use. Our ToolRegistry wraps these tools unnecessarily, adding ~240 lines of code with no functional benefit.

**Current Problem:**
```javascript
// MCP tools from LangChain adapter - already callable
const mcpTools = await mcpClient.getTools();

// ToolRegistry wraps them redundantly
for (const tool of mcpTools) {
  registry.registerLangChainTool(tool);  // Unnecessary wrapper
  // Internally: executor: (args) => tool.invoke({ input: args })
}

// ToolExecutor retrieves from registry
const executor = registry.getExecutor(toolName);
await executor(args);  // Just calls tool.invoke({ input: args })
```

**Root Cause:** ToolRegistry was created before we adopted LangChain.js's MCP adapters. It served a purpose when we had custom MCP client code, but now it duplicates what LangChain already provides.

**Impact:**
- **240+ lines of redundant code** (ToolRegistry.js)
- **Unnecessary abstraction layer** slowing down tool execution
- **Maintenance burden** - two places to update when adding tools
- **Confusing for developers** - unclear why we have a registry when LangChain tools work without one

## What Changes

### Remove ToolRegistry Abstraction

**Before (Current):**
```javascript
// ToolRegistry maintains Map of wrapped tools
class ToolRegistry {
  #tools = new Map();

  registerLangChainTool(langchainTool) {
    this.#tools.set(toolName, {
      definition: convertSchema(langchainTool),
      executor: (args) => langchainTool.invoke({ input: args })
    });
  }

  getExecutor(name) {
    return this.#tools.get(name)?.executor;
  }

  getDefinitions() {
    return Array.from(this.#tools.values()).map(t => t.definition);
  }
}
```

**After (Simplified):**
```javascript
// Use LangChain tools directly - no registry needed
class ToolManager {
  constructor() {
    this.tools = [];  // Simple array, not Map
  }

  addMCPTools(mcpTools) {
    this.tools.push(...mcpTools);
  }

  addCustomTool(tool) {
    this.tools.push(tool);
  }

  getTools() {
    return this.tools;  // Return for AI client
  }

  findTool(name) {
    return this.tools.find(t => t.name === name || t.lc_name === name);
  }
}
```

### Keep Essential Functionality

**What We Keep:**
1. **Tool collection** - Simple array to store tools from different sources (MCP + custom)
2. **Tool lookup by name** - Find tool for execution
3. **Parameter normalization** (if still needed after testing)

**What We Remove:**
1. **Map-based storage** - Replace with simple array
2. **Schema conversion** - LangChain tools already have schemas
3. **Executor wrapping** - Tools are already callable via `invoke()`
4. **Definition extraction** - Pass tools directly to AI client

### Update ToolExecutor

**Current:**
```javascript
class ToolExecutor {
  async execute(toolName, args) {
    const executor = this.registry.getExecutor(toolName);
    return await executor(args);
  }
}
```

**Simplified:**
```javascript
class ToolExecutor {
  async execute(toolName, args) {
    const tool = this.toolManager.findTool(toolName);
    if (!tool) {
      return `Error: Unknown tool "${toolName}"`;
    }

    // LangChain tools use .invoke({ input: args })
    return await tool.invoke({ input: args });
  }
}
```

### Update AIRouter Integration

**Current:**
```javascript
const queryOptions = {
  tools: this.toolExecutor?.registry?.getDefinitions() || [],
  toolExecutor: this.executeTool.bind(this),
};
```

**Simplified:**
```javascript
const queryOptions = {
  tools: this.toolExecutor?.toolManager?.getTools() || [],
  toolExecutor: this.executeTool.bind(this),
};
```

## Impact

### Affected Specs
- `tool-execution` - Simplify tool registry requirements

### Affected Code
- `apps/voice-gateway-oww/src/services/ToolRegistry.js` - Replace with ToolManager (~50 lines vs 240)
- `apps/voice-gateway-oww/src/services/ToolExecutor.js` - Update to use ToolManager
- `apps/voice-gateway-oww/src/ai/AIRouter.js` - Update tool retrieval
- `apps/voice-gateway-oww/src/main.js` - Update initialization

### Breaking Changes
**None** - This is an internal refactoring. External behavior remains identical.

### Risks
- **Low Risk** - Purely internal refactoring
- **Rollback**: Simple revert if issues arise
- **Testing**: Existing tool execution tests verify behavior unchanged

## Success Criteria

1. **Code Reduction**: Remove ~190 lines of redundant code (240 → ~50 lines)
2. **Behavior Preserved**: All existing tools work identically
3. **Performance**: Tool execution latency unchanged or improved (less indirection)
4. **Clarity**: New ToolManager is easier to understand than ToolRegistry
5. **Tests Pass**: All existing tool execution tests pass without modification

## Testing Strategy

### Unit Tests
- Test ToolManager.addMCPTools() with mock LangChain tools
- Test ToolManager.findTool() lookup by name
- Test ToolExecutor.execute() calls tool.invoke()

### Integration Tests
- Test full voice interaction with MCP tools (list_zwave_devices, control_zwave_device)
- Test custom tool registration alongside MCP tools
- Test tool execution error handling

### Regression Tests
- Run existing tool execution test suite
- Verify all tools discovered correctly at startup
- Verify tool calls work in both Ollama and Anthropic clients

## Non-Goals

- **Not changing MCP integration** - Still using `@langchain/mcp-adapters`
- **Not changing tool execution semantics** - Still async, still returns strings
- **Not changing error handling** - Still catches and formats errors
- **Not changing parameter normalization** - Keep if still needed (can remove later if unnecessary)

## Migration Path

This is a **single-step refactoring** (not phased):

1. Create simplified `ToolManager` class
2. Update `ToolExecutor` to use `ToolManager`
3. Update `AIRouter` to get tools from `ToolManager`
4. Update `main.js` initialization
5. Remove `ToolRegistry.js`
6. Update tests
7. Validate behavior unchanged

Total effort: **2-4 hours**
