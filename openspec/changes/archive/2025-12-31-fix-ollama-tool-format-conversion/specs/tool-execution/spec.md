# tool-execution Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
