# tool-execution Spec Delta

## MODIFIED Requirements

### Requirement: AI Client Integration

AI clients (AnthropicClient, OllamaClient) SHALL use ToolExecutor for all tool calls instead of implementing their own logic, and SHALL use LangChain-standard tool call interfaces.

**Previous Behavior:** OllamaClient used custom tool call detection and manual format conversion

**Rationale:** Standardizing on LangChain's tool call interface (`response.tool_calls`) eliminates custom parsing logic and aligns OllamaClient with AnthropicClient's proven pattern.

#### Scenario: Ollama tool execution with LangChain interface (MODIFIED)

- **GIVEN** OllamaClient receives response from ChatOllama with tool requests
- **THEN** tool calls are accessed via `response.tool_calls` property
- **AND** each tool call has standard structure: `{id, name, args}`
- **AND** tool execution continues to delegate to ToolExecutor instance
- **AND** no manual parsing of Ollama response format is required

**Previous Behavior:** Custom parsing of Ollama's message.tool_calls format with manual extraction

#### Scenario: Tool call loop with LangChain messages (MODIFIED)

- **GIVEN** the AI requests multiple tool calls in sequence
- **WHEN** each tool call is executed
- **THEN** the assistant message with tool_calls is added as `new AIMessage({content, tool_calls})`
- **AND** tool results are added as `new ToolMessage({content, tool_call_id})`
- **AND** messages array is passed to next model invocation
- **AND** LangChain maintains proper message correspondence

**Previous Behavior:** Custom message formatting with raw objects

#### Scenario: Tool result normalization (MODIFIED)

- **GIVEN** a tool execution returns a result
- **WHEN** the result is passed back to the AI
- **THEN** result is normalized to string format (LangChain requirement)
- **AND** MCP tool results `[text, artifacts]` are extracted to just text content
- **AND** object results are JSON.stringify'd
- **AND** result is wrapped in `ToolMessage` object with matching tool_call_id

**Previous Behavior:** Same normalization logic but with custom message objects

## REMOVED Requirements

### Requirement: Manual Qwen Tool Call Parsing

~~OllamaClient SHALL parse Qwen-format tool calls from Ollama responses and convert them to ToolExecutor-compatible format.~~

**Rationale:** LangChain's ChatOllama adapter handles all Qwen-specific parsing internally and provides tool calls via the standard `response.tool_calls` property.

#### Scenario: Parse Qwen tool call format (REMOVED)

~~- **GIVEN** Ollama returns response with Qwen-format tool call~~
~~- **WHEN** OllamaClient processes the response~~
~~- **THEN** it extracts `message.tool_calls` array~~
~~- **AND** parses each tool call's function name and arguments~~

**Rationale:** ChatOllama's `.invoke()` and `.stream()` methods return standard LangChain responses with pre-parsed tool_calls.

#### Scenario: Validate tool call correspondence (REMOVED)

~~- **GIVEN** multiple tool calls are requested~~
~~- **WHEN** tool results are collected~~
~~- **THEN** OllamaClient ensures 1:1 correspondence between calls and results~~

**Rationale:** LangChain enforces this correspondence through its message structure.

## ADDED Requirements

### Requirement: LangChain Tool Call Interface

OllamaClient SHALL use LangChain's standard tool call interface for consistent tool execution across all AI providers.

**Rationale:** Using LangChain's standard interface eliminates provider-specific parsing logic and ensures AnthropicClient and OllamaClient have identical tool execution flows.

#### Scenario: Access tool calls via response property

- **GIVEN** ChatOllama returns a response with tool requests
- **WHEN** OllamaClient processes the response
- **THEN** tool calls are accessed via `response.tool_calls` property
- **AND** tool_calls is a standard JavaScript array
- **AND** no additional parsing or transformation is required

#### Scenario: Tool call structure matches LangChain standard

- **GIVEN** a tool call from ChatOllama response
- **WHEN** tool call is inspected
- **THEN** it has properties: `{id: string, name: string, args: object}`
- **AND** `id` is a unique identifier for the tool call
- **AND** `name` matches a registered tool's name
- **AND** `args` is a parsed object (not JSON string)

#### Scenario: Tool execution loop uses LangChain messages

- **GIVEN** the AI requests tool execution
- **WHEN** OllamaClient builds the message sequence
- **THEN** it creates `new AIMessage({content, tool_calls})` for the assistant's tool request
- **AND** it creates `new ToolMessage({content, tool_call_id})` for each tool result
- **AND** messages maintain LangChain's type system
- **AND** message sequence follows LangChain's conversation pattern

#### Scenario: Multi-turn tool calling with message history

- **GIVEN** a complex query requires multiple tool calls across turns
- **WHEN** each tool call iteration completes
- **THEN** messages array grows with AIMessage and ToolMessage objects
- **AND** next invocation receives complete message history
- **AND** LangChain maintains conversation context automatically
- **AND** no manual message history management is required

### Requirement: Tool Execution Error Handling

OllamaClient SHALL handle tool execution errors using LangChain's ToolMessage pattern for consistent error reporting.

**Rationale:** Standardized error handling ensures tool failures are communicated to the AI in a format it can understand and respond to appropriately.

#### Scenario: Tool execution failure with ToolMessage

- **GIVEN** a tool execution throws an error
- **WHEN** the error is caught
- **THEN** a ToolMessage is created with error content: `"Error: {error.message}"`
- **AND** the ToolMessage includes the matching tool_call_id
- **AND** the error message is passed back to the AI for handling
- **AND** the AI can respond with error context to the user

#### Scenario: Unknown tool handling

- **GIVEN** the AI requests a tool that doesn't exist
- **WHEN** the tool call is processed
- **THEN** a ToolMessage is created with content: `"Error: Unknown tool \"{name}\""`
- **AND** the ToolMessage includes the tool_call_id
- **AND** the error is logged with warning level
- **AND** execution continues with the error message

#### Scenario: Tool call/result mismatch prevention

- **GIVEN** tool calls and tool results are being matched
- **WHEN** a mismatch is detected (more calls than results)
- **THEN** placeholder ToolMessage objects are created for missing results
- **AND** each placeholder contains error content explaining the failure
- **AND** 1:1 correspondence is maintained (LangChain requirement)
- **AND** the AI receives all expected tool results (including errors)
