# voice-gateway Specification Delta

## MODIFIED Requirements

### Requirement: AI Router

The system SHALL provide an AIRouter that routes AI queries to the appropriate provider with tool support.

#### Scenario: Route to Ollama provider
- **GIVEN** config.ai.provider is set to "ollama"
- **WHEN** AIRouter.query(transcription, intent) is called
- **THEN** the query is routed to OllamaClient.query() with appropriate system prompt and messages

#### Scenario: Route to Anthropic provider
- **GIVEN** config.ai.provider is set to "anthropic"
- **WHEN** AIRouter.query(transcription, intent) is called
- **THEN** the query is routed to AnthropicClient.query() with appropriate system prompt and messages

**Previous Behavior:** AI provider routing existed but was undocumented for demo purposes

**New Behavior:** AI provider routing is fully documented with preset configurations for demo modes

---

## ADDED Requirements

### Requirement: Demo Mode Configuration

The system SHALL support 4 demo modes through configuration-driven provider selection without code changes.

#### Scenario: Offline demo mode (Ollama + Piper)
- **WHEN** AI_PROVIDER=ollama and TTS_PROVIDER=Piper are set
- **THEN** the system uses local Ollama for AI queries and local Piper for TTS
- **AND** no internet connection is required for operation
- **AND** all dependencies are local (Ollama server, Python + piper-tts)

**Rationale:** Demonstrates fully offline, privacy-focused operation without cloud dependencies.

#### Scenario: Online demo mode (Anthropic + ElevenLabs)
- **WHEN** AI_PROVIDER=anthropic and TTS_PROVIDER=ElevenLabs are set
- **THEN** the system uses Anthropic Claude for AI queries and ElevenLabs for TTS
- **AND** requires valid API keys for both providers
- **AND** delivers highest quality AI responses and voice synthesis

**Rationale:** Demonstrates cloud-based operation with premium quality providers.

#### Scenario: Hybrid demo mode A (Ollama + ElevenLabs)
- **WHEN** AI_PROVIDER=ollama and TTS_PROVIDER=ElevenLabs are set
- **THEN** the system uses local Ollama for AI queries and cloud ElevenLabs for TTS
- **AND** requires ELEVENLABS_API_KEY but not ANTHROPIC_API_KEY
- **AND** combines local AI privacy with cloud TTS quality

**Rationale:** Demonstrates that AI and TTS providers are independently configurable.

#### Scenario: Hybrid demo mode B (Anthropic + Piper)
- **WHEN** AI_PROVIDER=anthropic and TTS_PROVIDER=Piper are set
- **THEN** the system uses cloud Anthropic for AI queries and local Piper for TTS
- **AND** requires ANTHROPIC_API_KEY but not ELEVENLABS_API_KEY
- **AND** combines cloud AI intelligence with local TTS privacy

**Rationale:** Demonstrates flexibility for users who want cloud AI but local TTS.

### Requirement: Demo Mode Presets

The system SHALL provide preset configuration files for quick mode switching during demos.

#### Scenario: Switch to offline mode
- **WHEN** user runs `./switch-mode.sh offline`
- **THEN** the script copies .env.offline to .env.tmp
- **AND** the script prints success message with restart instructions
- **AND** next service start uses offline configuration (Ollama + Piper)

**Rationale:** Quick mode switching is essential for live demonstrations.

#### Scenario: Switch to online mode
- **WHEN** user runs `./switch-mode.sh online`
- **THEN** the script copies .env.online to .env.tmp
- **AND** next service start uses online configuration (Anthropic + ElevenLabs)

**Rationale:** Allows demonstrating cloud quality after showing offline mode.

#### Scenario: Switch to hybrid mode A
- **WHEN** user runs `./switch-mode.sh hybrid-a`
- **THEN** the script copies .env.hybrid-a to .env.tmp
- **AND** next service start uses Ollama + ElevenLabs configuration

**Rationale:** Shows independent AI and TTS provider configuration.

#### Scenario: Switch to hybrid mode B
- **WHEN** user runs `./switch-mode.sh hybrid-b`
- **THEN** the script copies .env.hybrid-b to .env.tmp
- **AND** next service start uses Anthropic + Piper configuration

**Rationale:** Shows alternative hybrid configuration.

#### Scenario: Invalid mode argument
- **WHEN** user runs `./switch-mode.sh invalid-mode`
- **THEN** the script prints usage message
- **AND** shows valid modes: offline, online, hybrid-a, hybrid-b
- **AND** exits with non-zero status

**Rationale:** User-friendly error handling for incorrect arguments.

### Requirement: Provider Health Validation

The system SHALL validate provider configurations on startup and warn about missing dependencies.

#### Scenario: Anthropic API key missing
- **GIVEN** AI_PROVIDER=anthropic
- **WHEN** ANTHROPIC_API_KEY is not set or empty
- **THEN** the system logs a warning about missing API key
- **AND** the system continues startup (does not crash)
- **AND** health check reports AI provider as unhealthy

**Rationale:** Graceful degradation - warn but don't crash during demos.

#### Scenario: Ollama server unreachable
- **GIVEN** AI_PROVIDER=ollama
- **WHEN** Ollama server is not running at configured baseUrl
- **THEN** the system logs a warning about unreachable server
- **AND** the system continues startup
- **AND** health check reports AI provider as unhealthy

**Rationale:** Helps diagnose Ollama connection issues before demo.

#### Scenario: ElevenLabs API key missing
- **GIVEN** TTS_PROVIDER=ElevenLabs
- **WHEN** ELEVENLABS_API_KEY is not set or empty
- **THEN** the system logs a warning about missing API key
- **AND** the system continues startup
- **AND** health check reports TTS provider as unhealthy

**Rationale:** Early warning about TTS configuration issues.

#### Scenario: Piper TTS not installed
- **GIVEN** TTS_PROVIDER=Piper
- **WHEN** Python 3 or piper-tts package is not installed
- **THEN** the system logs a warning about missing Piper dependencies
- **AND** the system continues startup
- **AND** health check reports TTS provider as unhealthy

**Rationale:** Helps diagnose Piper installation issues.

#### Scenario: All providers healthy
- **GIVEN** required dependencies and API keys are configured
- **WHEN** health check runs on startup
- **THEN** the system logs confirmation that AI provider is healthy
- **AND** logs confirmation that TTS provider is healthy
- **AND** health check reports both providers as healthy

**Rationale:** Positive confirmation that system is ready for demo.

### Requirement: TTS Provider Switching

The system SHALL support switching between ElevenLabs (cloud) and Piper (local) TTS providers via configuration.

#### Scenario: Use ElevenLabs TTS provider
- **WHEN** TTS_PROVIDER=ElevenLabs is set
- **THEN** streamingTTS.js uses elevenSynthesize for speech synthesis
- **AND** requires ELEVENLABS_API_KEY to be configured
- **AND** TTS requests are sent to ElevenLabs API

**Previous Behavior:** ElevenLabs was default but TTS_PROVIDER was undocumented

**New Behavior:** TTS_PROVIDER explicitly documented with ElevenLabs as one option

#### Scenario: Use Piper TTS provider
- **WHEN** TTS_PROVIDER=Piper is set
- **THEN** streamingTTS.js uses piperSynthesize for speech synthesis
- **AND** requires Python 3 + piper-tts to be installed
- **AND** requires TTS_MODEL_PATH to point to valid Piper ONNX model
- **AND** TTS synthesis runs locally via Python subprocess

**Previous Behavior:** Piper implementation existed but TTS_PROVIDER=Piper was undocumented

**New Behavior:** TTS_PROVIDER=Piper fully documented with dependencies and configuration

#### Scenario: Default TTS provider
- **WHEN** TTS_PROVIDER is not set
- **THEN** the system defaults to ElevenLabs
- **AND** logs show TTS_PROVIDER=ElevenLabs on startup

**Rationale:** Maintains backward compatibility with existing configurations.

### Requirement: Configuration Documentation

The system SHALL document all demo modes and provider options in .env.example with clear examples.

#### Scenario: AI provider options documented
- **WHEN** user reads .env.example
- **THEN** AI_PROVIDER options are clearly listed: 'anthropic' (cloud) or 'ollama' (local)
- **AND** dependencies for each option are documented
- **AND** default value is specified (anthropic)

**Rationale:** Users need clear guidance on valid configuration values.

#### Scenario: TTS provider options documented
- **WHEN** user reads .env.example
- **THEN** TTS_PROVIDER options are clearly listed: 'ElevenLabs' (cloud) or 'Piper' (local)
- **AND** dependencies for each option are documented
- **AND** default value is specified (ElevenLabs)
- **AND** Piper configuration (TTS_MODEL_PATH) is documented

**Previous Behavior:** Only ElevenLabs configuration was documented in .env.example

**New Behavior:** Both TTS providers fully documented with configuration examples

#### Scenario: Demo mode presets exist
- **WHEN** user checks voice-gateway-oww directory
- **THEN** .env.offline file exists with Ollama + Piper configuration
- **AND** .env.online file exists with Anthropic + ElevenLabs configuration
- **AND** .env.hybrid-a file exists with Ollama + ElevenLabs configuration
- **AND** .env.hybrid-b file exists with Anthropic + Piper configuration
- **AND** all preset files include required environment variables

**Rationale:** Presets make it easy to switch modes without manual editing.

#### Scenario: Demo modes documented in README
- **WHEN** user reads apps/voice-gateway-oww/README.md
- **THEN** "Demo Modes" section exists
- **AND** all 4 modes are documented with emojis, dependencies, and setup commands
- **AND** "Quick Switch" instructions are provided

**Rationale:** README is first place users look for usage instructions.
