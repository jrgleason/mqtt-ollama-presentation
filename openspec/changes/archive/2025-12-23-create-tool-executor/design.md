# Design: Centralized Tool Executor

## Context

The voice-gateway-oww application currently has duplicate tool execution logic in three places:
1. `BackgroundTranscriber.js` - `toolExecutor()` method (lines 194-208)
2. `AnthropicClient.js` - Tool execution in `query()` method (lines 215-241)
3. `OllamaClient.js` - Tool execution in `query()` method (lines 88-130)

Each implementation:
- Maintains its own switch statement for tool routing
- Logs tool execution independently
- Handles errors differently
- Makes adding new tools require changes in 3 places

This violates the Single Responsibility Principle and DRY principle.

## Goals / Non-Goals

### Goals
- Create a single, centralized tool execution system
- Eliminate code duplication across AI clients
- Provide consistent logging and error handling
- Make adding new tools a single-point change
- Maintain backward compatibility (no API changes)
- Improve testability of tool execution logic

### Non-Goals
- Change the external API of AI clients (AnthropicClient, OllamaClient)
- Modify tool definitions or tool implementation files
- Change how tools are called by AI models
- Add new tools (this is purely infrastructure)

## Decisions

### Decision 1: Create ToolRegistry for Tool Management
**What:** Create a centralized registry that maps tool names to their executor functions and definitions.

**Why:**
- Provides a single source of truth for available tools
- Enables dynamic tool registration
- Simplifies tool discovery for AI clients
- Makes testing easier (can register mock tools)

**Alternatives Considered:**
1. **Hardcoded tool list in ToolExecutor** - Rejected: Would still require updating ToolExecutor when adding tools
2. **Auto-discovery via filesystem** - Rejected: Too complex for current needs, adds fragility
3. **Dependency injection of tools** - Rejected: More boilerplate for minimal benefit

**Implementation:**
```javascript
// src/services/ToolRegistry.js
class ToolRegistry {
  #tools = new Map();

  registerTool(definition, executor) {
    this.#tools.set(definition.function.name, { definition, executor });
  }

  getExecutor(name) {
    return this.#tools.get(name)?.executor;
  }

  getDefinitions() {
    return Array.from(this.#tools.values()).map(t => t.definition);
  }
}
```

### Decision 2: ToolExecutor as Stateful Class (Not Static Utility)
**What:** Implement ToolExecutor as a class with instance methods, not static methods.

**Why:**
- Allows dependency injection (logger, config)
- Enables instance-specific configuration (timeouts, logging levels)
- Facilitates testing with mocked dependencies
- Supports future extensibility (metrics, tracing)

**Alternatives Considered:**
1. **Static utility functions** - Rejected: Harder to test, no dependency injection
2. **Singleton pattern** - Rejected: Makes testing harder, hides dependencies

**Implementation:**
```javascript
// src/services/ToolExecutor.js
class ToolExecutor {
  constructor(registry, logger) {
    this.registry = registry;
    this.logger = logger;
    this.timeout = 30000; // 30 seconds default
  }

  async execute(toolName, args) {
    const startTime = Date.now();
    try {
      const executor = this.registry.getExecutor(toolName);
      if (!executor) {
        this.logger.warn(`Unknown tool: ${toolName}`);
        return `Error: Unknown tool ${toolName}`;
      }

      const result = await this.executeWithTimeout(executor, args);
      const duration = Date.now() - startTime;

      this.logger.info(`Tool executed`, { toolName, duration, args });

      if (duration > 1000) {
        this.logger.warn(`Slow tool execution`, { toolName, duration });
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Tool execution failed`, {
        toolName,
        duration,
        error: error.message
      });
      return `Error executing ${toolName}: ${error.message}`;
    }
  }

  async executeWithTimeout(executor, args) {
    return Promise.race([
      executor(args),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Tool execution timeout')), this.timeout)
      )
    ]);
  }
}
```

### Decision 3: Initialize ToolRegistry at Application Startup
**What:** Create and populate ToolRegistry during application initialization in main.js.

**Why:**
- Ensures all tools are available before any AI queries
- Fails fast if tool registration has issues
- Clear initialization sequence
- No lazy loading complexity

**Alternatives Considered:**
1. **Lazy loading on first use** - Rejected: Adds complexity, slower first query
2. **Module-level initialization** - Rejected: Harder to test, hidden dependencies

**Implementation:**
```javascript
// src/main.js
import { ToolRegistry } from './services/ToolRegistry.js';
import { ToolExecutor } from './services/ToolExecutor.js';
import {
  dateTimeTool,
  executeDateTimeTool
} from './tools/datetime-tool.js';
// ... import other tools

async function initializeTooling() {
  const registry = new ToolRegistry();

  // Register all tools
  registry.registerTool(dateTimeTool, executeDateTimeTool);
  registry.registerTool(searchTool, executeSearchTool);
  registry.registerTool(volumeControlTool, executeVolumeControlTool);
  registry.registerTool(zwaveControlTool, executeZWaveControlTool);

  const executor = new ToolExecutor(registry, logger);

  logger.info('Tool system initialized', {
    toolCount: registry.getDefinitions().length
  });

  return { registry, executor };
}
```

### Decision 4: Pass ToolExecutor to AI Clients
**What:** Pass ToolExecutor instance to AI client query methods via options.

**Why:**
- No changes to AI client constructors (backward compatible)
- Allows different ToolExecutor instances for testing
- Keeps AI clients stateless regarding tools
- Clear dependency flow

**Alternatives Considered:**
1. **Store ToolExecutor in AI client instance** - Rejected: Makes clients stateful, harder to test
2. **Global singleton ToolExecutor** - Rejected: Hidden dependency, testing nightmare

**Implementation:**
```javascript
// Usage in BackgroundTranscriber
const aiResponse = await this.anthropicClient.query(null, {
  messages,
  tools: toolRegistry.getDefinitions(),
  toolExecutor: toolExecutor.execute.bind(toolExecutor)
});
```

### Decision 5: Keep Tool Definitions and Executors Co-located
**What:** Keep tool definition objects and executor functions in the same file (e.g., `tools/datetime-tool.js`).

**Why:**
- Single file to edit when modifying a tool
- Clear coupling between definition and implementation
- Easier code navigation
- Follows existing project structure

**Alternatives Considered:**
1. **Separate definition and executor files** - Rejected: More files, split brain
2. **Definitions in ToolRegistry, executors in tools/** - Rejected: Confusing separation

**Current Structure (No Change):**
```javascript
// tools/datetime-tool.js
export const dateTimeTool = {
  type: 'function',
  function: {
    name: 'get_current_datetime',
    description: '...',
    parameters: { ... }
  }
};

export async function executeDateTimeTool(args) {
  // Implementation
}
```

## Risks / Trade-offs

### Risk 1: Increased Indirection
**Risk:** Extra layer of abstraction might make code harder to follow for newcomers.

**Mitigation:**
- Add comprehensive JSDoc comments
- Document tool architecture in README
- Keep ToolExecutor simple and focused
- Provide clear examples of registering new tools

### Risk 2: Migration Complexity
**Risk:** Updating three files simultaneously might introduce bugs.

**Mitigation:**
- Migrate one file at a time
- Test thoroughly after each migration
- Keep old toolExecutor methods until all migrations complete
- Add integration tests to verify tool execution

### Risk 3: Performance Overhead
**Risk:** Additional function calls might slow down tool execution.

**Mitigation:**
- Minimize ToolExecutor overhead (simple map lookup)
- Profile before/after to measure impact (expected <1ms)
- Tool execution time (seconds) will dwarf any overhead (microseconds)

### Trade-off: Flexibility vs Simplicity
**Trade-off:** ToolRegistry adds flexibility but increases complexity.

**Decision:** Accept the complexity because:
- Benefits (DRY, single point of change) outweigh costs
- Complexity is contained in two focused classes
- Current duplication is already complex and error-prone
- Adding tools becomes simpler (register once vs update 3 files)

## Migration Plan

### Phase 1: Create Infrastructure (No Behavior Change)
1. Create `src/services/ToolRegistry.js`
2. Create `src/services/ToolExecutor.js`
3. Add unit tests for ToolRegistry
4. Add unit tests for ToolExecutor
5. Verify tests pass

### Phase 2: Update Tool Exports (Preparation)
1. Verify all tools export both definition and executor
2. Update any tools missing either export
3. Verify tool definitions follow consistent schema

### Phase 3: Integrate with BackgroundTranscriber
1. Import ToolRegistry and ToolExecutor in main.js
2. Initialize ToolRegistry with all tools at startup
3. Create ToolExecutor instance
4. Pass ToolExecutor to BackgroundTranscriber
5. Update BackgroundTranscriber to use injected executor
6. Test with actual voice commands
7. Verify logging shows tool execution details

### Phase 4: Integrate with AnthropicClient
1. Update AnthropicClient.query() to accept toolExecutor option
2. Replace inline tool execution with toolExecutor calls
3. Test with Anthropic provider
4. Verify tool_calls flow works correctly

### Phase 5: Integrate with OllamaClient
1. Update OllamaClient.query() to accept toolExecutor option
2. Replace inline tool execution with toolExecutor calls
3. Test with Ollama provider
4. Verify tool_calls flow works correctly

### Phase 6: Cleanup
1. Remove old toolExecutor method from BackgroundTranscriber
2. Verify no dead code remains
3. Update documentation
4. Run full integration tests
5. Commit and create PR

### Rollback Plan
If issues are discovered after migration:
1. Keep old toolExecutor methods as fallback during migration
2. Can revert to old behavior with git revert
3. Each phase is independently testable
4. Can pause migration at any phase

## Open Questions

### Q1: Should ToolRegistry validate tool definitions?
**Status:** Open for discussion

**Options:**
1. No validation - Trust developers to provide correct definitions
2. Runtime validation - Check schema on registration
3. Static validation - Use JSDoc comments for IDE support

**Recommendation:** Start with no validation (option 1), add runtime validation (option 2) if issues arise. Static validation (option 3) would require TypeScript, which violates project constraints.

### Q2: Should ToolExecutor support tool middleware?
**Status:** Defer to future

**Use Cases:**
- Rate limiting for external API tools
- Caching for expensive tool calls
- Request/response transformation

**Recommendation:** Implement simple ToolExecutor now, add middleware pattern later if needed. YAGNI (You Aren't Gonna Need It) principle applies.

### Q3: Should tool execution be async only?
**Status:** Resolved - Yes

**Decision:** All tools must return Promise, even if synchronous. This simplifies ToolExecutor and provides consistent async/await interface.

## Performance Considerations

### Expected Overhead
- ToolRegistry lookup: ~0.001ms (Map.get is O(1))
- ToolExecutor wrapping: ~0.01ms (function call overhead)
- Total added latency: <0.1ms per tool execution

### Comparison to Current State
- Current tool execution: ~1000-5000ms (network/computation)
- Added overhead: <0.1ms
- Percentage impact: <0.01%

**Conclusion:** Performance impact is negligible.

## Testing Strategy

### Unit Tests (New)
- `ToolRegistry.test.js` - Test registration, lookup, validation
- `ToolExecutor.test.js` - Test execution, error handling, timeouts

### Integration Tests (Existing + New)
- Test tool execution through BackgroundTranscriber
- Test tool execution through AnthropicClient
- Test tool execution through OllamaClient
- Verify logging output includes expected fields

### Manual Testing (Required)
- Test voice command: "What time is it?" (datetime tool)
- Test voice command: "Turn on the living room light" (zwave tool)
- Test voice command: "Set volume to 50" (volume tool)
- Test voice command: "Search for..." (search tool)
- Verify all tools work after migration

## Success Criteria

This refactoring is successful if:
1. All tool execution works identically to before migration
2. Adding a new tool requires changes in only 1 place (not 3)
3. Tool execution logging is consistent across all AI clients
4. Tool execution errors are handled consistently
5. No performance degradation (response time <1% slower)
6. Code coverage for tool execution improves
7. Code duplication is eliminated (verified by code analysis)
