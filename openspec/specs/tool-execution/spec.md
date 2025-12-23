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
Tool execution logs SHALL include sufficient context for debugging and monitoring.

#### Scenario: Log successful execution
- **WHEN** a tool executes successfully
- **THEN** logs include tool name, arguments (sanitized), duration, and result summary

#### Scenario: Log failed execution
- **WHEN** a tool execution fails
- **THEN** logs include tool name, arguments (sanitized), error message, and stack trace

#### Scenario: Sanitize sensitive data
- **WHEN** logging tool arguments
- **THEN** ToolExecutor redacts sensitive fields like API keys, passwords, and tokens

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

