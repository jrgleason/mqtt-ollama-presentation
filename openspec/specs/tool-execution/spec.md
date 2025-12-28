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
The system SHALL provide a ToolRegistry module that maintains a registry of all available tools.

#### Scenario: Register tool at startup
- **WHEN** the application starts
- **THEN** all tools are automatically registered in the ToolRegistry with their definitions and executor functions

#### Scenario: Get tool definition
- **WHEN** an AI client needs tool definitions for the model
- **THEN** ToolRegistry returns an array of all registered tool definitions in the correct format

#### Scenario: Get tool executor function
- **WHEN** ToolExecutor needs to execute a tool by name
- **THEN** ToolRegistry returns the executor function for that tool

### Requirement: Tool Definition Format
Tool definitions SHALL follow a consistent schema with name, description, and parameters.

#### Scenario: Validate tool definition
- **WHEN** a tool is registered
- **THEN** the tool definition includes a unique name, human-readable description, and JSON schema for parameters

#### Scenario: Ensure tool uniqueness
- **WHEN** a tool is registered with a name that already exists
- **THEN** ToolRegistry logs a warning and overwrites the previous registration

### Requirement: Tool Executor Interface
All tool executor functions SHALL accept a single arguments object and return a Promise resolving to a string result.

#### Scenario: Tool executor signature
- **WHEN** a tool executor is called
- **THEN** it receives an object containing the tool arguments as key-value pairs

#### Scenario: Tool executor return value
- **WHEN** a tool executor completes successfully
- **THEN** it returns a Promise resolving to a string describing the result

#### Scenario: Tool executor error handling
- **WHEN** a tool executor encounters an error
- **THEN** it throws an Error with a descriptive message that can be shown to the user

### Requirement: Performance Monitoring
ToolExecutor SHALL track and log execution time for all tool calls.

#### Scenario: Measure tool execution time
- **WHEN** a tool is executed
- **THEN** ToolExecutor measures the time from start to completion

#### Scenario: Log slow tools
- **WHEN** a tool execution takes longer than 1000ms
- **THEN** ToolExecutor logs a warning with the tool name and duration

### Requirement: AI Client Integration
AI clients (AnthropicClient, OllamaClient) SHALL use ToolExecutor for all tool calls instead of implementing their own logic.

#### Scenario: Anthropic tool execution
- **WHEN** AnthropicClient receives tool_calls from the model
- **THEN** it delegates execution to ToolExecutor instance

#### Scenario: Ollama tool execution
- **WHEN** OllamaClient receives tool_calls from the model
- **THEN** it delegates execution to ToolExecutor instance

#### Scenario: BackgroundTranscriber tool execution
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

