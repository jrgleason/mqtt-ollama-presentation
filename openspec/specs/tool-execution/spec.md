# tool-execution Specification

## Purpose
TBD - created by archiving change create-tool-executor. Update Purpose after archive.
## Requirements
### Requirement: Centralized Tool Execution
The system SHALL provide a centralized ToolExecutor class that handles all tool execution for AI model tool calls.

#### Scenario: Execute tool by name
- **WHEN** an AI model requests a tool call with tool name and arguments
- **THEN** ToolExecutor executes the appropriate tool function and returns the result

#### Scenario: Log tool execution
- **WHEN** a tool is executed
- **THEN** ToolExecutor logs the tool name, arguments, execution time, and result

#### Scenario: Handle unknown tool
- **WHEN** an AI model requests a tool that does not exist
- **THEN** ToolExecutor logs a warning and returns an error message indicating the tool is unknown

#### Scenario: Handle tool execution error
- **WHEN** a tool execution throws an error
- **THEN** ToolExecutor logs the error with context and returns a user-friendly error message

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

### Requirement: Tool Definition Format
Tool definitions SHALL follow a consistent schema with name, description, and parameters.

#### Scenario: Validate tool definition
- **WHEN** a tool is registered
- **THEN** the tool definition includes a unique name, human-readable description, and JSON schema for parameters

#### Scenario: Ensure tool uniqueness
- **WHEN** a tool is registered with a name that already exists
- **THEN** ToolRegistry logs a warning and overwrites the previous registration

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

### Requirement: Performance Monitoring
ToolExecutor SHALL track and log execution time for all tool calls.

#### Scenario: Measure tool execution time
- **WHEN** a tool is executed
- **THEN** ToolExecutor measures the time from start to completion

#### Scenario: Log slow tools
- **WHEN** a tool execution takes longer than 1000ms
- **THEN** ToolExecutor logs a warning with the tool name and duration

### Requirement: AI Client Integration

AI clients (AnthropicClient, OllamaClient) SHALL use ToolExecutor for all tool calls instead of implementing their own logic, **and SHALL convert tool formats as required by their respective AI providers**.

#### Scenario: Anthropic tool execution (UNCHANGED)

- **WHEN** AnthropicClient receives tool_calls from the model
- **THEN** it delegates execution to ToolExecutor instance
- **AND** tools are passed in LangChain format (LangChain adapter handles conversion)

#### Scenario: Ollama tool execution with Qwen format conversion (MODIFIED)

- **WHEN** OllamaClient receives tools from ToolManager
- **THEN** tools are converted from LangChain format to Qwen format before sending to Ollama API
- **AND** Qwen format uses `{type: "function", function: {name, description, parameters}}` structure
- **AND** LangChain properties (`schema` → `parameters`, strip `invoke`, `lc_name`, `lc_kwargs`)
- **AND** tool execution continues to delegate to ToolExecutor instance

**Previous Behavior:** Tools passed directly to Ollama without format conversion

**Rationale:** Qwen models (via Ollama) expect tools in Qwen function calling format as specified in [Qwen documentation](https://qwen.readthedocs.io/en/latest/framework/function_call.html). LangChain format causes tools to be invisible to the AI.

#### Scenario: BackgroundTranscriber tool execution (UNCHANGED)

- **WHEN** BackgroundTranscriber handles AI queries with tools
- **THEN** it uses a ToolExecutor instance instead of inline toolExecutor method

### Requirement: Logging Context

Tool execution logs SHALL include sufficient context for debugging and monitoring **on the appropriate output stream**.

#### Scenario: MCP server debug logs (MODIFIED)
- **GIVEN** a Z-Wave MCP server tool is executing
- **WHEN** debug information needs to be logged
- **THEN** the debug output is written to stderr using `console.error()` or equivalent

**Rationale:** Clarifies that MCP servers MUST use stderr for logs, not stdout.

### Requirement: Error Recovery
ToolExecutor SHALL provide graceful error recovery and user-friendly error messages.

#### Scenario: Network error
- **WHEN** a tool fails due to network connectivity
- **THEN** ToolExecutor returns a message indicating the service is unavailable

#### Scenario: Invalid arguments
- **WHEN** a tool is called with invalid or missing required arguments
- **THEN** ToolExecutor returns a message describing the required parameters

#### Scenario: Timeout
- **WHEN** a tool execution exceeds a reasonable timeout (30 seconds)
- **THEN** ToolExecutor cancels the operation and returns a timeout error message

### Requirement: MCP Server Logging Compliance

MCP servers SHALL use stderr for all diagnostic output to maintain stdout protocol compliance.

#### Scenario: Debug logs use stderr
- **GIVEN** the MCP server is running
- **WHEN** the server outputs debug or diagnostic information
- **THEN** the output is written to stderr (process.stderr), not stdout

#### Scenario: JSON-RPC messages use stdout
- **GIVEN** the MCP server needs to send a JSON-RPC response
- **WHEN** the server writes the response
- **THEN** the response is written to stdout as newline-delimited JSON

#### Scenario: Prevent stdout pollution
- **GIVEN** the MCP client is parsing responses
- **WHEN** the client reads from the server's stdout
- **THEN** every line is valid JSON-RPC (no debug logs, no plain text)

**Rationale:** The MCP SDK stdio transport requires stdout to contain ONLY newline-delimited JSON-RPC messages. Any other output breaks the protocol and causes parse failures in the client.

### Requirement: MCP Client Error Handling

MCP clients SHALL provide clear error messages when JSON-RPC parsing fails.

#### Scenario: Detect stdout pollution
- **GIVEN** the MCP client receives non-JSON data from server
- **WHEN** JSON parsing fails
- **THEN** the error message indicates the content that failed to parse

#### Scenario: Continue operation after parse error
- **GIVEN** a single JSON parse error occurs
- **WHEN** the next message arrives
- **THEN** the client continues processing (doesn't crash or block)

**Rationale:** Parsing errors should be logged but shouldn't crash the system. The client should be resilient to malformed messages.

### Requirement: MCP Tool Parameter Name Normalization
The system SHALL normalize parameter names when executing MCP tools to ensure compatibility between LangChain's snake_case convention and MCP server's camelCase convention.

#### Scenario: Snake_case to camelCase conversion for MCP tools
- **GIVEN** a LangChain MCP tool is registered with parameter names in snake_case (e.g., `device_name`, `command`)
- **WHEN** the AI calls the tool with snake_case parameter names
- **THEN** ToolRegistry normalizes the parameter names to camelCase (e.g., `deviceName`, `action`) before invoking the MCP server

#### Scenario: Built-in tools are not affected
- **GIVEN** a built-in tool (datetime, search, volume) is registered
- **WHEN** the AI calls the tool
- **THEN** ToolRegistry passes parameters through unchanged (no normalization applied)

#### Scenario: Static parameter mappings for known MCP tools
- **GIVEN** the tool `control_zwave_device` is registered
- **WHEN** the AI calls it with `{device_name: "Switch One", command: "on"}`
- **THEN** ToolRegistry applies static mapping: `device_name → deviceName`, `command → action`
- **AND** the MCP server receives `{deviceName: "Switch One", action: "on"}`

#### Scenario: Heuristic conversion for unmapped parameters
- **GIVEN** an MCP tool has a parameter not in the static mapping
- **WHEN** the parameter name contains underscores (e.g., `new_parameter_name`)
- **THEN** ToolRegistry applies heuristic snake_case → camelCase conversion (e.g., `newParameterName`)

#### Scenario: Parameters without underscores pass through unchanged
- **GIVEN** an MCP tool parameter has no underscores (e.g., `level`, `value`)
- **WHEN** the AI calls the tool with that parameter
- **THEN** ToolRegistry passes the parameter through unchanged (e.g., `level → level`)

#### Scenario: Parameter normalization logging
- **GIVEN** parameter normalization occurs during tool execution
- **WHEN** the original and normalized parameters differ
- **THEN** ToolRegistry logs the transformation: `{device_name: "..."} → {deviceName: "..."}`

#### Scenario: Error handling with invalid parameters after normalization
- **GIVEN** parameter normalization occurs successfully
- **WHEN** the MCP server rejects the normalized parameters (e.g., missing required field)
- **THEN** the error message from the MCP server is returned to the user unchanged

---

### Requirement: MCP Connection Retry with Exponential Backoff

The system SHALL retry MCP server connection with exponential backoff when initial connection fails, and provide clear error messages including server diagnostic output.

#### Scenario: Successful connection on first attempt

- **GIVEN** MCP server is running and broker is available
- **WHEN** voice gateway attempts to initialize MCP integration
- **THEN** connection succeeds on first attempt
- **AND** no retry delays occur
- **AND** tools are discovered and registered normally

#### Scenario: Successful connection after retry

- **GIVEN** MCP server is temporarily unavailable (broker restarting, network blip)
- **WHEN** voice gateway attempts to initialize MCP integration
- **THEN** first attempt fails and retry is scheduled after 2 seconds
- **AND** second attempt succeeds
- **AND** tools are discovered and registered
- **AND** log shows "MCP connection succeeded on attempt 2"

#### Scenario: Connection fails after all retries

- **GIVEN** MCP server is permanently unavailable (broker down, server binary missing)
- **WHEN** voice gateway attempts all 3 connection retries (0s, 2s, 4s delays)
- **THEN** all attempts fail
- **AND** error log includes MCP server stderr output for debugging
- **AND** error message clearly states "MCP connection failed after 3 attempts"
- **AND** system continues with local tools only (graceful degradation)

#### Scenario: Exponential backoff delays

- **GIVEN** MCP connection is failing
- **WHEN** retry logic executes
- **THEN** retry delays follow exponential backoff: 0s (initial), 2s (retry 1), 4s (retry 2)
- **AND** total retry time is approximately 6 seconds maximum
- **AND** each retry attempt is logged with attempt number and delay

#### Scenario: MCP server stderr captured in errors

- **GIVEN** MCP server subprocess writes diagnostic output to stderr
- **WHEN** MCP connection fails
- **THEN** error log includes stderr output from MCP server
- **AND** stderr helps developers diagnose issue (missing dependency, broker unreachable, etc.)
- **AND** stderr is NOT mixed with stdout (protocol compliance maintained)

**Rationale:** MCP SDK stdio transport requires stdout to contain ONLY JSON-RPC messages. Debug output must use stderr.

#### Scenario: Clear user-facing error messages

- **GIVEN** MCP connection fails permanently
- **WHEN** error is logged
- **THEN** error message is clear and actionable for users
- **AND** message indicates system is in degraded mode (local tools only)
- **AND** message suggests checking MQTT broker and MCP server configuration

**Example Error Message:**
```
❌ Failed to initialize MCP tools after 3 attempts
   Reason: Connection to stdio server 'zwave' failed
   MCP Server stderr: [stderr output here]
   Check: MQTT broker running, zwave-mcp-server installed
⚠️ Continuing with local tools only (datetime, search, volume)
```

#### Scenario: Retry doesn't block startup

- **GIVEN** MCP retry logic is running (6 seconds maximum)
- **WHEN** other initialization steps are independent (MQTT, AI client, TTS)
- **THEN** those steps continue in parallel
- **AND** only tool-dependent initialization waits for MCP retry
- **AND** startup time impact is minimized

**Rationale:** MCP retry shouldn't block unrelated systems from initializing.

#### Scenario: Retry logic is configurable

- **GIVEN** retry parameters are defined in constants or config
- **WHEN** developers need to adjust retry behavior (count, delays)
- **THEN** changes are made in one location (MCPIntegration.js constants)
- **AND** no hardcoded magic numbers scattered throughout codebase

**Suggested Constants:**
```javascript
const MCP_RETRY_ATTEMPTS = 3; // total attempts (1 initial + 2 retries)
const MCP_RETRY_BASE_DELAY = 2000; // 2 seconds base delay
// Delays: 0ms (initial), 2000ms (retry 1), 4000ms (retry 2)
```

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

### Requirement: Tool Format Conversion for Ollama

OllamaClient SHALL convert tools from LangChain format to Qwen-compatible format before passing them to the Ollama API.

**Rationale:** Qwen models expect a specific tool schema with `type: "function"` wrapper and `function.parameters` instead of top-level `schema` property. Without this conversion, tools appear empty or invalid to the AI model.

#### Scenario: Convert LangChain tool to Qwen format

- **GIVEN** a LangChain tool with properties: `{name, description, schema, invoke, lc_name}`
- **WHEN** OllamaClient converts the tool for Ollama API
- **THEN** the output format is `{type: "function", function: {name, description, parameters}}`
- **AND** `name` is taken from `lc_name` (MCP tools) or `name` (custom tools)
- **AND** `parameters` contains the JSON Schema from `schema` property
- **AND** `invoke`, `lc_name`, `lc_kwargs` properties are excluded from output

#### Scenario: Convert multiple tools

- **GIVEN** an array of LangChain tools (both MCP and custom)
- **WHEN** OllamaClient converts the tools array
- **THEN** each tool is converted to Qwen format
- **AND** the output is an array of Qwen-formatted tools
- **AND** original tools array is unchanged (pure function)

#### Scenario: Handle empty or undefined tools

- **GIVEN** no tools are provided (empty array or undefined)
- **WHEN** OllamaClient converts tools
- **THEN** an empty array is returned
- **AND** no errors are thrown

#### Scenario: Log tool conversion

- **GIVEN** tools are being converted for Ollama
- **WHEN** conversion completes successfully
- **THEN** debug log shows number of tools converted
- **AND** log format: `"🔧 Converted N tools from LangChain to Qwen format"`

#### Scenario: Tool conversion is isolated to Ollama

- **GIVEN** tools are stored in ToolManager in LangChain format
- **WHEN** tools are retrieved by AnthropicClient or other clients
- **THEN** tools remain in LangChain format (no conversion)
- **AND** only OllamaClient performs Qwen format conversion

**Rationale:** Keep tool storage consistent (LangChain format) and only convert at the last moment when passing to Ollama. This maintains compatibility with other AI providers.

### Requirement: Qwen Tool Format Compliance

Tools passed to Ollama SHALL comply with the Qwen function calling specification as documented at https://qwen.readthedocs.io/en/latest/framework/function_call.html

#### Scenario: Validate Qwen tool structure

- **GIVEN** a tool converted for Ollama
- **WHEN** the tool structure is validated
- **THEN** the tool has exactly one top-level property: `type: "function"`
- **AND** the tool has a nested `function` object with required properties: `name`, `description`, `parameters`
- **AND** `parameters` is a valid JSON Schema object with `type: "object"` and optional `properties`, `required`

#### Scenario: Qwen model can parse converted tools

- **GIVEN** tools are converted to Qwen format
- **WHEN** tools are sent to Ollama with qwen3:0.6b model
- **THEN** the AI model recognizes the tools as valid function definitions
- **AND** the AI can describe available tools when asked
- **AND** the AI can invoke tools with correct parameter names

#### Scenario: Tool invocation remains unchanged

- **GIVEN** Qwen model requests a tool call with `{function: {name, arguments}}`
- **WHEN** OllamaClient processes the tool call
- **THEN** tool execution uses the original LangChain tool's `invoke()` method
- **AND** arguments are passed to ToolExecutor unchanged
- **AND** tool results are returned to Ollama for final response generation

**Rationale:** Format conversion is only for sending tool definitions TO Ollama. Tool execution uses the original LangChain tools stored in ToolManager.

