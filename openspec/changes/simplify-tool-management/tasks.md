# Implementation Tasks: Simplify Tool Management

## Phase 1: Create Simplified ToolManager

- [ ] **Task 1.1**: Create ToolManager class
  - Create `src/services/ToolManager.js`
  - Implement constructor with empty array
  - Implement `addMCPTools(mcpTools)` method
  - Implement `addCustomTool(tool)` method
  - Implement `getTools()` method (returns array)
  - Implement `findTool(name)` method (searches by name or lc_name)
  - **Validation**: Unit tests pass for ToolManager

- [ ] **Task 1.2**: Add parameter normalization (if needed)
  - Review if MCP_PARAMETER_MAPPINGS still required
  - Add `normalizeParameters(toolName, args)` method if needed
  - Test with actual MCP tool calls (control_zwave_device)
  - **Validation**: MCP tools work with normalized parameters OR work without normalization

## Phase 2: Update ToolExecutor

- [ ] **Task 2.1**: Refactor ToolExecutor to use ToolManager
  - Update constructor: `registry` → `toolManager`
  - Update `execute()` method to use `toolManager.findTool()`
  - Call `tool.invoke({ input: args })` directly instead of `executor(args)`
  - Keep logging, error handling, timeout logic unchanged
  - **Validation**: ToolExecutor unit tests pass

- [ ] **Task 2.2**: Update error messages
  - Update "Unknown tool" error to reference available tools from ToolManager
  - Keep other error formatting logic unchanged
  - **Validation**: Error messages are clear and helpful

## Phase 3: Update AIRouter

- [ ] **Task 3.1**: Update AIRouter tool retrieval
  - Change `this.toolExecutor?.registry?.getDefinitions()` to `this.toolExecutor?.toolManager?.getTools()`
  - Verify tools array is passed correctly to AI clients
  - **Validation**: AIRouter can retrieve tools from ToolManager

- [ ] **Task 3.2**: Test with both AI providers
  - Test tool execution with Ollama client
  - Test tool execution with Anthropic client
  - **Validation**: Both providers can call tools successfully

## Phase 4: Update Main Initialization

- [ ] **Task 4.1**: Update main.js tool initialization
  - Replace `ToolRegistry` import with `ToolManager`
  - Update `setupToolSystem()` to use ToolManager
  - Initialize ToolManager instance
  - Add MCP tools via `toolManager.addMCPTools(mcpTools)`
  - Add custom tools via `toolManager.addCustomTool(tool)`
  - Pass ToolManager to ToolExecutor constructor
  - **Validation**: Application starts without errors

- [ ] **Task 4.2**: Verify tool discovery logging
  - Ensure tool count logged correctly
  - Ensure tool names logged correctly
  - **Validation**: Logs show all tools registered

## Phase 5: Remove Old Code

- [ ] **Task 5.1**: Remove ToolRegistry.js
  - Delete `src/services/ToolRegistry.js`
  - Remove all imports of ToolRegistry
  - **Validation**: No references to ToolRegistry remain in codebase

- [ ] **Task 5.2**: Update test files
  - Update ToolExecutor tests to use ToolManager
  - Remove ToolRegistry tests
  - Add ToolManager tests if needed
  - **Validation**: All tests pass

## Phase 6: Integration Testing

- [ ] **Task 6.1**: Test MCP tool execution
  - Test `list_zwave_devices` tool call
  - Test `control_zwave_device` tool call
  - Verify parameter normalization works (if implemented)
  - **Validation**: MCP tools execute successfully

- [ ] **Task 6.2**: Test custom tool execution
  - Test datetime tool
  - Test search tool (if available)
  - Test volume control tool (if available)
  - **Validation**: Custom tools execute successfully

- [ ] **Task 6.3**: End-to-end voice interaction test
  - Trigger wake word
  - Ask device-related question: "What devices are available?"
  - Verify AI uses list_zwave_devices tool
  - Verify TTS response includes device list
  - **Validation**: Full voice interaction works

- [ ] **Task 6.4**: Test error handling
  - Test unknown tool call
  - Test tool execution timeout
  - Test MCP connection failure scenario
  - **Validation**: Error messages are user-friendly

## Phase 7: Remove Additional Redundancies

- [ ] **Task 7.1**: Remove tool schema conversion in AnthropicClient
  - Review `convertToolToLangChainFormat()` method
  - If using LangChain MCP tools, they're already in LangChain format
  - Remove conversion: `options.tools.map(AnthropicClient.convertToolToLangChainFormat)`
  - Pass tools directly to `client.bindTools(options.tools)`
  - Test with both custom tools and MCP tools
  - **Validation**: Tools work without schema conversion

- [ ] **Task 7.2**: Remove tool schema conversion in OllamaClient (if exists)
  - Check if OllamaClient has similar schema conversion
  - Remove if redundant with LangChain tools
  - **Validation**: Ollama client works with LangChain tools

- [ ] **Task 7.3**: Review parameter normalization necessity
  - Test MCP tools WITHOUT parameter normalization
  - Check if LangChain MCP adapters handle snake_case → camelCase
  - Remove `normalizeParameters()` if not needed
  - **Validation**: MCP tools work without normalization OR normalization is required

- [ ] **Task 7.4**: Review code for other simplifications
  - Identify any other LangChain-redundant patterns
  - Document findings
  - **Validation**: All redundant code identified

- [ ] **Task 7.5**: Measure performance improvement
  - Measure tool execution latency before/after
  - Count lines of code before/after
  - **Validation**: Performance same or better, code count reduced

- [ ] **Task 7.6**: Update documentation
  - Update code comments to reflect ToolManager
  - Update README if tool system is documented
  - **Validation**: Documentation accurate

## Dependencies

- **Sequential**: Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7
- **Within Phase**: Tasks can be done in order listed

## Estimated Effort

- Phase 1: 1 hour
- Phase 2: 30 minutes
- Phase 3: 30 minutes
- Phase 4: 30 minutes
- Phase 5: 15 minutes
- Phase 6: 1 hour
- Phase 7: 1 hour

**Total: ~4.5 hours**

## Success Metrics

- ✅ Code reduced from ~240 lines (ToolRegistry) to ~50 lines (ToolManager)
- ✅ All existing tools work identically
- ✅ All tests pass
- ✅ Tool execution latency unchanged or improved
- ✅ No regressions in voice interaction flow
