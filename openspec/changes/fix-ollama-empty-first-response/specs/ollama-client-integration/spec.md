# ollama-client-integration Specification Delta

## ADDED Requirements

### Requirement: Empty Tool Call Detection and Recovery

OllamaClient SHALL detect when the model returns an empty tool_calls array despite indicating intent to call tools, and SHALL implement recovery strategies to produce a valid response.

**Rationale:** The qwen3:0.6b model sometimes returns `tool_calls: []` (empty array) while `hasToolCalls` evaluates to true, leaving the user with no response. This failure mode requires explicit detection and recovery.

#### Scenario: Detect empty tool call array pattern

- **GIVEN** ChatOllama returns a response
- **WHEN** `response.tool_calls` is truthy but `response.tool_calls.length === 0`
- **AND** `response.content` is empty or whitespace
- **THEN** OllamaClient logs this as "Empty tool call pattern detected"
- **AND** tracks this event for metrics

#### Scenario: Retry without tools on empty tool call

- **GIVEN** empty tool call pattern is detected
- **WHEN** retry strategy is enabled (default: true)
- **THEN** OllamaClient retries the query WITHOUT tools bound
- **AND** adds system guidance: "Answer the question directly without calling any tools"
- **AND** returns the retry response if successful

#### Scenario: Log retry attempt and outcome

- **GIVEN** a retry-without-tools is attempted
- **WHEN** the retry completes (success or failure)
- **THEN** OllamaClient logs the outcome with attempt count
- **AND** includes timing for both original and retry attempts
- **AND** logs whether retry produced valid response

### Requirement: Tiered Tool Loading

OllamaClient SHALL support tiered tool loading to reduce model confusion when many tools are available.

**Rationale:** Small models (qwen3:0.6b) struggle with large tool sets (31 tools). Limiting tools based on query intent improves response quality.

#### Scenario: Essential tools only for device queries

- **GIVEN** IntentClassifier identifies a device control query
- **WHEN** tools are bound for the query
- **THEN** only Z-Wave tools (6 tools) are bound
- **AND** Playwright tools (22 tools) are excluded
- **AND** custom tools are excluded unless explicitly needed

#### Scenario: Datetime tool only for time queries

- **GIVEN** IntentClassifier identifies a date/time query
- **WHEN** tools are bound for the query
- **THEN** only `get_current_datetime` tool is bound
- **AND** all other tools are excluded

#### Scenario: No tools for general queries

- **GIVEN** IntentClassifier identifies a general knowledge query
- **WHEN** OllamaClient processes the query
- **THEN** no tools are bound (direct answer expected)
- **AND** web search fallback is available if response is empty

#### Scenario: Playwright tools lazy-loaded for fallback

- **GIVEN** web search fallback is triggered
- **WHEN** WebSearchFallback needs browser automation
- **THEN** Playwright tools are retrieved from MCPIntegration
- **AND** tools are bound only for the fallback query
- **AND** tools are not included in subsequent queries

### Requirement: Query Attempt Tracking

OllamaClient SHALL track query attempt position and success rate to measure reliability improvements.

**Rationale:** Understanding first-query vs retry success rates helps validate fixes and identify regression.

#### Scenario: Track first-query success rate

- **GIVEN** a new conversation starts (no prior queries)
- **WHEN** the first query completes
- **THEN** OllamaClient records whether it succeeded or failed
- **AND** logs "First query: success/failure"
- **AND** maintains running success rate metric

#### Scenario: Track retry success rate

- **GIVEN** a query fails and retry is attempted
- **WHEN** the retry completes
- **THEN** OllamaClient records the retry outcome
- **AND** logs "Retry N: success/failure"
- **AND** maintains separate retry success rate metric

## MODIFIED Requirements

### Requirement: Ollama Client Implementation (MODIFIED)

OllamaClient SHALL detect empty tool call patterns and trigger recovery before returning an empty response.

**Modification:** Add empty tool call detection before returning response.

#### Scenario: Initialize Ollama client with ChatOllama class (UNCHANGED)

- **GIVEN** valid Ollama configuration (baseUrl, model) exists
- **WHEN** OllamaClient is instantiated
- **THEN** it creates a `ChatOllama` instance from `@langchain/ollama` package
- **AND** passes baseUrl, model, and temperature to ChatOllama constructor
- **AND** stores the ChatOllama instance for query operations

#### Scenario: Handle tool calls via LangChain interface (MODIFIED)

- **GIVEN** the AI model requests tool execution
- **WHEN** the response is received from ChatOllama
- **THEN** tool calls are available via `response.tool_calls` property
- **AND** if `tool_calls` is empty AND content is empty, empty tool call recovery is triggered
- **AND** tool_calls is an array of `{id, name, args}` objects when non-empty
- **AND** no manual parsing of tool call format is required

**Previous Behavior:** Empty tool_calls with empty content was treated as "no response" without recovery
