# Voice Gateway Ollama Performance Delta

## MODIFIED Requirements

### Requirement: Ollama Configuration Options

The voice gateway MUST expose configurable Ollama performance parameters.

#### Scenario: Context Window Configuration
GIVEN the environment variable `OLLAMA_NUM_CTX` is set to 2048
WHEN the OllamaClient initializes
THEN the ChatOllama client MUST use numCtx: 2048

#### Scenario: Temperature Configuration
GIVEN the environment variable `OLLAMA_TEMPERATURE` is set to 0.5
WHEN the OllamaClient initializes
THEN the ChatOllama client MUST use temperature: 0.5

#### Scenario: Keep-Alive Configuration
GIVEN the environment variable `OLLAMA_KEEP_ALIVE` is set to -1
WHEN the OllamaClient initializes
THEN the ChatOllama client MUST use keepAlive: -1

### Requirement: Ollama Performance Targets

Ollama queries MUST complete within acceptable time limits.

#### Scenario: Tool-Call Query Performance
GIVEN a user asks a question requiring a tool call (e.g., "list devices")
WHEN the AI processes the query with Ollama
THEN the total Ollama query time MUST be under 3 seconds

#### Scenario: Simple Query Performance
GIVEN a user asks a simple question not requiring tools
WHEN the AI processes the query with Ollama
THEN the Ollama query time MUST be under 2 seconds

#### Scenario: Total Interaction Time
GIVEN a voice interaction from wake word to response playback
WHEN using Ollama as the AI provider
THEN the total interaction time MUST be under 10 seconds

### Requirement: Default Performance Settings

The default Ollama configuration MUST be optimized for voice interactions.

#### Scenario: Default Context Window
GIVEN no OLLAMA_NUM_CTX environment variable is set
WHEN the OllamaClient initializes
THEN the default numCtx MUST be 2048 (not 4096)

#### Scenario: Default Temperature
GIVEN no OLLAMA_TEMPERATURE environment variable is set
WHEN the OllamaClient initializes
THEN the default temperature MUST be 0.5 (not 0.7)

#### Scenario: Default Keep-Alive
GIVEN no OLLAMA_KEEP_ALIVE environment variable is set
WHEN the OllamaClient initializes
THEN the default keepAlive MUST be -1 (never unload)
