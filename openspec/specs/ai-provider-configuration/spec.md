# ai-provider-configuration Specification

## Purpose
TBD - created by archiving change add-anthropic-support-to-oracle. Update Purpose after archive.
## Requirements
### Requirement: Oracle AI Provider Selection

The oracle application SHALL support multiple AI providers (Ollama and Anthropic) with environment-based configuration, similar to the voice-gateway application.

**Rationale:** Users need flexibility to choose between local AI (Ollama) for privacy and cloud AI (Anthropic) for superior reasoning, matching the provider options available in voice-gateway.

#### Scenario: Configure Anthropic as AI provider

- **GIVEN** the user sets `AI_PROVIDER=anthropic` and `ANTHROPIC_API_KEY=sk-...` in environment
- **WHEN** the oracle chat API processes a message
- **THEN** it uses the Anthropic Claude API via `@langchain/anthropic`
- **AND** tools are bound using LangChain's native `.bindTools()` method
- **AND** responses stream from Anthropic's API

#### Scenario: Configure Ollama as AI provider (default)

- **GIVEN** the user sets `AI_PROVIDER=ollama` OR leaves AI_PROVIDER unset
- **WHEN** the oracle chat API processes a message
- **THEN** it uses the local Ollama service via `@langchain/ollama`
- **AND** tools are bound using LangChain's native `.bindTools()` method
- **AND** responses stream from Ollama's API
- **AND** behavior matches current implementation (backward compatible)

#### Scenario: Provider-agnostic tool binding

- **GIVEN** tools are registered via MCP integration and custom tool definitions
- **WHEN** any AI provider is selected (Ollama or Anthropic)
- **THEN** tools are bound using the same `.bindTools(tools)` method
- **AND** both providers correctly execute tool calls
- **AND** tool results are passed back to the AI in the same format

#### Scenario: Provider configuration validation

- **GIVEN** the user sets `AI_PROVIDER=anthropic`
- **WHEN** `ANTHROPIC_API_KEY` is missing or invalid
- **THEN** the chat API returns a clear error message
- **AND** suggests setting the API key in environment or .env file

#### Scenario: Model selection per provider

- **GIVEN** the user configures an AI provider
- **WHEN** they specify `ANTHROPIC_MODEL` or `OLLAMA_MODEL` environment variables
- **THEN** the chat API uses the specified model for that provider
- **AND** defaults to recommended models if not specified (haiku for Anthropic, qwen2.5:0.5b for Ollama)

### Requirement: Anthropic Client Abstraction

Oracle SHALL provide an Anthropic client abstraction that mirrors the Ollama client pattern for consistency.

**Rationale:** Consistent client abstractions make the codebase easier to understand and maintain, following the same pattern as voice-gateway's AI clients.

#### Scenario: Create Anthropic client with configuration

- **GIVEN** valid Anthropic API configuration exists in environment
- **WHEN** `createAnthropicClient(temperature, model)` is called
- **THEN** it returns a configured `ChatAnthropic` instance from `@langchain/anthropic`
- **AND** the instance uses the API key from `ANTHROPIC_API_KEY` environment variable
- **AND** the instance uses the model from the `model` parameter or `ANTHROPIC_MODEL` fallback

#### Scenario: Validate Anthropic health check

- **GIVEN** an Anthropic client configuration
- **WHEN** `checkAnthropicHealth()` is called
- **THEN** it validates that `ANTHROPIC_API_KEY` is present
- **AND** returns true if the API key is configured
- **AND** returns false if the API key is missing

#### Scenario: Default model fallback

- **GIVEN** `ANTHROPIC_MODEL` environment variable is not set
- **WHEN** `createAnthropicClient()` is called without a model parameter
- **THEN** it uses `claude-3-5-haiku-20241022` as the default model
- **AND** logs a debug message indicating the default model selection

### Requirement: Environment Configuration Documentation

Oracle SHALL document AI provider configuration in .env.example with clear examples and guidance.

**Rationale:** Users need clear documentation to understand how to switch providers and which models to use for different use cases.

#### Scenario: Document AI provider environment variables

- **GIVEN** a user wants to configure the oracle AI provider
- **WHEN** they open `apps/oracle/.env.example`
- **THEN** they see `AI_PROVIDER` variable with options (ollama, anthropic)
- **AND** they see `ANTHROPIC_API_KEY` with placeholder and link to get API key
- **AND** they see `ANTHROPIC_MODEL` with recommended options (haiku, sonnet, opus)
- **AND** they see comments explaining when to use each provider

#### Scenario: Provide model selection guidance

- **GIVEN** a user wants to choose an Anthropic model
- **WHEN** they read the .env.example documentation
- **THEN** they see model options with performance characteristics
- **AND** haiku is marked as "fastest, cheapest"
- **AND** sonnet is marked as "balanced, recommended"
- **AND** opus is marked as "most capable, slowest"
- **AND** they see a link to Anthropic's pricing page

### Requirement: Backward Compatibility

Oracle's AI provider changes SHALL maintain complete backward compatibility with existing Ollama-only configurations.

**Rationale:** Users who have oracle working with Ollama should not need to change any configuration when upgrading.

#### Scenario: Existing Ollama configuration continues working

- **GIVEN** a user has oracle configured with `OLLAMA_BASE_URL` and `OLLAMA_MODEL`
- **WHEN** they upgrade to the version with Anthropic support
- **THEN** oracle continues using Ollama as the AI provider (default)
- **AND** no changes to environment variables are required
- **AND** all existing functionality (MCP tools, calculator) continues working

#### Scenario: No breaking changes to chat API

- **GIVEN** existing code calls the `/api/chat` endpoint
- **WHEN** Anthropic support is added
- **THEN** the request/response format remains unchanged
- **AND** streaming behavior remains unchanged
- **AND** tool execution flow remains unchanged
- **AND** only the AI provider backend differs (transparent to client)

