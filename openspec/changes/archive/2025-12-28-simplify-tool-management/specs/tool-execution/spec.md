# tool-execution Specification Delta

## MODIFIED Requirements

### Requirement: Tool Registry

The system SHALL provide a simplified ToolManager that maintains a collection of available tools without unnecessary abstraction layers.

**Previous Implementation:** Map-based ToolRegistry with schema conversion and executor wrapping (~240 lines)

**Rationale:** LangChain.js MCP adapters provide tools that are ready to use. The Map-based storage, schema conversion, and executor wrapping are redundant with LangChain's built-in capabilities. Simplifying to an array-based manager aligns with LangChain patterns and reduces code by 80%.

#### Scenario: Add MCP tools from LangChain adapters (MODIFIED)

- **WHEN** MCP tools are discovered via `mcpClient.getTools()`
- **THEN** tools are added to ToolManager without schema conversion or executor wrapping
- **AND** tools are stored in a simple array (not Map)
- **AND** tools remain in LangChain format (no conversion to "Ollama format")

**Previous Behavior:** Tools were registered individually with schema conversion and executor wrapping

**Rationale:** LangChain tools are already callable and have schemas. No conversion or wrapping needed.

#### Scenario: Add custom tools (MODIFIED)

- **WHEN** a custom tool is added to the system
- **THEN** tool is added directly to the ToolManager array
- **AND** tool conforms to LangChain tool interface (`name`, `description`, `schema`, `invoke()` method)
- **AND** no schema conversion or executor wrapping is applied

**Previous Behavior:** Custom tools were wrapped with executor functions

**Rationale:** All tools should follow LangChain patterns for consistency.

#### Scenario: Get all tools for AI client (MODIFIED)

- **WHEN** an AI client needs the list of available tools
- **THEN** ToolManager returns the tools array directly
- **AND** no schema conversion or definition extraction is performed

**Previous Behavior:** ToolRegistry extracted definitions from Map and converted schemas

**Rationale:** LangChain AI clients accept tool arrays directly.

#### Scenario: Find tool by name for execution (NEW)

- **WHEN** ToolExecutor needs to execute a tool by name
- **THEN** ToolManager searches the tools array by `name` or `lc_name` property
- **AND** returns the tool object or undefined if not found

**Rationale:** Simple array search replaces Map lookup.

### Requirement: Tool Executor Interface

All tools SHALL follow LangChain's tool interface with `invoke(args)` method instead of custom executor functions.

**Previous Implementation:** Tools were wrapped with custom executor functions: `(args) => tool.invoke({ input: args })`

**Rationale:** The executor wrapper adds no value - it just calls `tool.invoke()`. Calling tools directly is clearer and eliminates unnecessary indirection.

#### Scenario: Execute tool directly via invoke() (MODIFIED)

- **WHEN** ToolExecutor executes a tool
- **THEN** it calls `tool.invoke(args)` directly
- **AND** no executor wrapper function is used

**Previous Behavior:** ToolExecutor retrieved executor function from registry and called `executor(args)`

**Rationale:** Direct tool invocation eliminates unnecessary abstraction layer. LangChain MCP tools expect args directly, not wrapped in `{ input: args }`.

#### Scenario: Tool execution timeout and error handling (UNCHANGED)

- **WHEN** a tool is executed
- **THEN** execution is protected by timeout (30 seconds default)
- **AND** errors are caught and formatted as user-friendly messages
- **AND** execution time and result are logged

**Rationale:** Keep existing error handling and monitoring logic.

## Implementation Notes

**Schema Conversion Removed:** The `AnthropicClient.convertToolToLangChainFormat()` method was removed (~15 lines) as it was redundant when using LangChain tools. Tools are now passed directly to `client.bindTools()`.

**Executor Wrapping Removed:** The executor wrapper pattern `(args) => tool.invoke({ input: args })` was removed. Tools are now called directly via `tool.invoke(args)`.

**Map-Based Storage Removed:** ToolRegistry's Map storage was replaced with simple array storage in ToolManager. For <20 tools, array search performance is equivalent and implementation is simpler.

## ADDED Requirements

### Requirement: Simplified Tool Collection

The system SHALL provide a lightweight ToolManager class that combines tools from different sources (MCP + custom) without unnecessary abstraction.

#### Scenario: Combine MCP and custom tools

- **WHEN** tools are added from multiple sources (MCP adapters, custom tools)
- **THEN** ToolManager stores all tools in a single array
- **AND** provides a simple API to retrieve all tools or find by name
- **AND** maintains no redundant metadata (definitions, executors, mappings)

**Rationale:** Simple tool collection aligns with LangChain patterns and reduces complexity.

#### Scenario: Tool lookup performance

- **WHEN** ToolExecutor looks up a tool by name
- **THEN** lookup completes in <1ms for typical tool count (<20 tools)
- **AND** Array.find() performance is acceptable (no need for Map)

**Rationale:** For small tool counts, array search is as fast as Map lookup and much simpler.

### Requirement: Parameter Normalization Evaluation (CONDITIONAL)

The system SHALL evaluate whether parameter name normalization (snake_case → camelCase) is needed when using LangChain MCP adapters.

#### Scenario: Test MCP tools without normalization

- **WHEN** MCP tools are called with snake_case parameter names (e.g., `device_name`)
- **THEN** system tests whether LangChain MCP adapters handle conversion to camelCase
- **AND** if adapters handle it, normalization logic is removed
- **AND** if adapters don't handle it, normalization is kept in ToolManager

**Rationale:** Avoid redundant normalization if LangChain adapters already handle it.

#### Scenario: Document normalization decision

- **WHEN** normalization testing is complete
- **THEN** decision (keep or remove) is documented in code comments
- **AND** rationale for decision is clear

**Rationale:** Future maintainers need to understand why normalization exists (or doesn't).

---

## Summary of Changes

**Modified Requirements:**
- Tool Registry → Simplified to array-based ToolManager
- Tool Execution Interface → Direct `invoke()` calls, no wrapper functions

**Removed Requirements:**
- Schema Conversion (redundant with LangChain tools)
- Executor Function Wrapping (redundant indirection)
- Map-Based Tool Storage (array is simpler)

**Added Requirements:**
- Simplified Tool Collection (lightweight combination of tool sources)
- Parameter Normalization Evaluation (test if still needed)

**Net Impact:**
- **Code Reduction:** ~270 lines removed (45% reduction in tool management code)
- **Behavior Preserved:** All existing functionality works identically
- **Clarity Improved:** Simpler architecture aligned with LangChain patterns
