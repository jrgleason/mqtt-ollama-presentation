# voice-gateway Specification

## Purpose
TBD - created by archiving change refactor-background-transcriber. Update Purpose after archive.
## Requirements
### Requirement: Transcription Service
The system SHALL provide a TranscriptionService that converts audio samples to text transcriptions.

#### Scenario: Valid audio transcription
- **GIVEN** audio samples with sufficient duration (>0.15 seconds) and energy (RMS >1e-6)
- **WHEN** TranscriptionService.transcribe(audioSamples) is called
- **THEN** the service creates a temporary WAV file, invokes Whisper transcription, returns the transcription text, and cleans up the temporary file

#### Scenario: Audio too short
- **GIVEN** audio samples with duration <0.15 seconds
- **WHEN** TranscriptionService.transcribe(audioSamples) is called
- **THEN** the service logs a warning and returns null without invoking Whisper

#### Scenario: Audio energy too low
- **GIVEN** audio samples with RMS energy <1e-6
- **WHEN** TranscriptionService.transcribe(audioSamples) is called
- **THEN** the service logs a warning and returns null without invoking Whisper

#### Scenario: Whisper transcription timeout
- **GIVEN** Whisper transcription takes longer than 60 seconds
- **WHEN** TranscriptionService.transcribe(audioSamples) is called
- **THEN** the service throws a timeout error and cleans up the temporary WAV file

#### Scenario: Empty transcription result
- **GIVEN** Whisper returns an empty string or null
- **WHEN** TranscriptionService.transcribe(audioSamples) is called
- **THEN** the service logs a warning and returns null

#### Scenario: WAV file cleanup on success
- **GIVEN** transcription completes successfully
- **WHEN** TranscriptionService.transcribe(audioSamples) finishes
- **THEN** the temporary WAV file is deleted from the filesystem

#### Scenario: WAV file cleanup on error
- **GIVEN** transcription fails with an error
- **WHEN** TranscriptionService.transcribe(audioSamples) throws an exception
- **THEN** the temporary WAV file is deleted from the filesystem in the finally block

---

### Requirement: Intent Classification
The system SHALL provide an IntentClassifier that determines user intent from transcription text.

#### Scenario: Device query detection
- **GIVEN** transcription contains patterns like "list devices", "show lights", "what devices do I have"
- **WHEN** IntentClassifier.classify(transcription) is called
- **THEN** the result includes `isDeviceQuery: true`

#### Scenario: DateTime query detection
- **GIVEN** transcription contains patterns like "what time is it", "what day is today", "current date"
- **WHEN** IntentClassifier.classify(transcription) is called
- **THEN** the result includes `isDateTimeQuery: true`

#### Scenario: Device control query detection
- **GIVEN** transcription contains patterns like "turn on", "turn off", "dim", "brighten", "set to 50"
- **WHEN** IntentClassifier.classify(transcription) is called
- **THEN** the result includes `isDeviceControlQuery: true`

#### Scenario: General query classification
- **GIVEN** transcription does not match any specific intent patterns
- **WHEN** IntentClassifier.classify(transcription) is called
- **THEN** the result includes all intent flags set to false (general AI query)

#### Scenario: Multiple intent detection
- **GIVEN** transcription matches multiple intent patterns (e.g., "show devices and turn on the light")
- **WHEN** IntentClassifier.classify(transcription) is called
- **THEN** the result includes all matching intent flags set to true

#### Scenario: Case-insensitive pattern matching
- **GIVEN** transcription contains "TURN ON THE LIGHT" (uppercase)
- **WHEN** IntentClassifier.classify(transcription) is called
- **THEN** the result correctly identifies `isDeviceControlQuery: true` (case-insensitive matching)

---

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

#### Scenario: System prompt includes device info for device queries
- **GIVEN** intent.isDeviceQuery is true
- **WHEN** AIRouter.query(transcription, intent) is called
- **THEN** the system prompt includes device information from zwave-mcp-server

#### Scenario: System prompt excludes device info for non-device queries
- **GIVEN** intent.isDeviceQuery is false
- **WHEN** AIRouter.query(transcription, intent) is called
- **THEN** the system prompt contains only the default assistant instructions

#### Scenario: Tool execution for datetime queries
- **GIVEN** AI provider requests to call the "get_current_datetime" tool
- **WHEN** AIRouter.executeTool("get_current_datetime", {}) is called
- **THEN** the datetime tool executor is invoked and returns the current date/time

#### Scenario: Tool execution for zwave control
- **GIVEN** AI provider requests to call the "control_zwave_device" tool
- **WHEN** AIRouter.executeTool("control_zwave_device", {deviceName: "Switch One", action: "on"}) is called
- **THEN** the zwave control tool executor is invoked and sends MQTT command to the device

#### Scenario: Tool execution for volume control
- **GIVEN** AI provider requests to call the "control_speaker_volume" tool
- **WHEN** AIRouter.executeTool("control_speaker_volume", {volume: 50}) is called
- **THEN** the volume control tool executor is invoked and adjusts system volume

#### Scenario: Tool execution for web search
- **GIVEN** AI provider requests to call the "search_web" tool
- **WHEN** AIRouter.executeTool("search_web", {query: "weather today"}) is called
- **THEN** the search tool executor is invoked and returns search results

#### Scenario: Unknown tool handling
- **GIVEN** AI provider requests to call an unknown tool "unknown_tool"
- **WHEN** AIRouter.executeTool("unknown_tool", {}) is called
- **THEN** the router logs a warning and returns an error message

#### Scenario: Streaming response with Anthropic
- **GIVEN** config.ai.provider is "anthropic" AND config.tts.streaming is true
- **WHEN** AIRouter.query(transcription, intent) is called with onToken callback
- **THEN** AI response is streamed token-by-token to the onToken callback

#### Scenario: Non-streaming response fallback
- **GIVEN** config.tts.streaming is false OR AI provider does not support streaming
- **WHEN** AIRouter.query(transcription, intent) is called
- **THEN** AI response is returned as a complete string after inference completes

---

### Requirement: Voice Interaction Orchestration
The system SHALL provide a VoiceInteractionOrchestrator that coordinates the complete voice interaction pipeline.

#### Scenario: Complete voice interaction flow
- **GIVEN** valid audio samples from wake word recording
- **WHEN** VoiceInteractionOrchestrator.processVoiceInteraction(audioSamples) is called
- **THEN** the orchestrator transcribes audio, classifies intent, queries AI, speaks response (if TTS enabled), updates conversation history, and publishes MQTT events

#### Scenario: Audio feedback at interaction stages
- **GIVEN** voice interaction is processing
- **WHEN** orchestrator reaches each major stage (post-transcription, pre-response, post-response)
- **THEN** appropriate beep sounds are played to provide user feedback

#### Scenario: TTS playback when enabled
- **GIVEN** config.tts.enabled is true
- **WHEN** AI response is received
- **THEN** the response is synthesized to speech and played through the speaker

#### Scenario: TTS skipped when disabled
- **GIVEN** config.tts.enabled is false
- **WHEN** AI response is received
- **THEN** the response is logged but NOT synthesized to speech

#### Scenario: Conversation history update
- **GIVEN** AI response is successfully generated
- **WHEN** VoiceInteractionOrchestrator.processVoiceInteraction() completes
- **THEN** the assistant message is added to conversation manager with the AI response text

#### Scenario: MQTT transcription publishing
- **GIVEN** transcription is successfully obtained
- **WHEN** orchestrator publishes MQTT events
- **THEN** transcription message is published to MQTT with duration metadata

#### Scenario: MQTT AI response publishing
- **GIVEN** AI response is successfully generated
- **WHEN** orchestrator publishes MQTT events
- **THEN** AI response message is published to MQTT with model, provider, and conversation turn count

#### Scenario: Error handling with audio feedback
- **GIVEN** transcription or AI query fails with an error
- **WHEN** VoiceInteractionOrchestrator.processVoiceInteraction() catches the error
- **THEN** an error beep is played and the error is logged

#### Scenario: Processing beep before AI query
- **GIVEN** transcription is complete and intent is classified
- **WHEN** orchestrator is about to query the AI
- **THEN** a processing beep is played to indicate AI is thinking

#### Scenario: Response beep after TTS playback
- **GIVEN** TTS playback completes successfully
- **WHEN** orchestrator finishes speaking the AI response
- **THEN** a response beep is played to indicate interaction is complete

#### Scenario: Device info retrieval for device queries
- **GIVEN** intent.isDeviceQuery is true
- **WHEN** orchestrator builds system prompt via AIRouter
- **THEN** device information is fetched from zwave-mcp-server and included in the prompt

#### Scenario: Device info fetch failure graceful handling
- **GIVEN** intent.isDeviceQuery is true AND zwave-mcp-server is unavailable
- **WHEN** orchestrator attempts to fetch device info
- **THEN** a warning is logged and the query proceeds without device information

#### Scenario: Streaming TTS integration
- **GIVEN** config.ai.provider is "anthropic" AND config.tts.streaming is true
- **WHEN** orchestrator queries AI via AIRouter
- **THEN** AI response is streamed token-by-token to TTS for real-time speech synthesis

#### Scenario: Tool execution via direct intent handling
- **GIVEN** intent.isDateTimeQuery is true
- **WHEN** orchestrator processes the interaction
- **THEN** datetime tool is executed directly without invoking AI

#### Scenario: Device control via direct intent handling
- **GIVEN** intent.isDeviceControlQuery is true
- **WHEN** orchestrator processes the interaction
- **THEN** device control tool is executed directly without invoking AI (if command can be parsed)

---

### Requirement: Dependency Injection
The system SHALL use constructor-based dependency injection for all services.

#### Scenario: VoiceInteractionOrchestrator construction
- **GIVEN** config and logger are available
- **WHEN** new VoiceInteractionOrchestrator(config, logger) is instantiated
- **THEN** all required dependencies (TranscriptionService, IntentClassifier, AIRouter, BeepUtil) are initialized

#### Scenario: TranscriptionService construction
- **GIVEN** config and logger are available
- **WHEN** new TranscriptionService(config, logger) is instantiated
- **THEN** config.whisper.modelPath is validated and logger is stored for use

#### Scenario: AIRouter construction
- **GIVEN** config and logger are available
- **WHEN** new AIRouter(config, logger) is instantiated
- **THEN** OllamaClient and AnthropicClient are initialized lazily (on first query)

#### Scenario: IntentClassifier construction
- **GIVEN** no dependencies required
- **WHEN** new IntentClassifier() is instantiated
- **THEN** regex patterns are initialized (stateless utility)

---

### Requirement: Error Handling and Logging
The system SHALL provide comprehensive error handling and structured logging across all services.

#### Scenario: Transcription error logging
- **GIVEN** Whisper transcription fails with an error
- **WHEN** TranscriptionService.transcribe() catches the error
- **THEN** the error is logged with context (error message, duration, sample rate) and re-thrown

#### Scenario: AI query error logging
- **GIVEN** AI provider query fails with an error
- **WHEN** AIRouter.query() catches the error
- **THEN** the error is logged with context (provider, model, prompt snippet) and re-thrown

#### Scenario: Tool execution error logging
- **GIVEN** tool executor throws an error
- **WHEN** AIRouter.executeTool() catches the error
- **THEN** the error is logged with context (tool name, arguments) and an error message is returned to the AI

#### Scenario: Orchestrator error recovery
- **GIVEN** any stage of voice interaction fails
- **WHEN** VoiceInteractionOrchestrator catches the error
- **THEN** an error beep is played, the error is logged, and the interaction terminates gracefully

#### Scenario: MQTT publish error handling
- **GIVEN** MQTT publish fails (broker unreachable)
- **WHEN** orchestrator publishes transcription or AI response
- **THEN** the error is logged at debug level (non-critical) and execution continues

#### Scenario: TTS playback error handling
- **GIVEN** TTS synthesis or playback fails
- **WHEN** orchestrator attempts to speak the AI response
- **THEN** the error is logged and execution continues (interaction is still complete)

---

### Requirement: Performance Monitoring
The system SHALL log performance metrics for voice interaction stages.

#### Scenario: Transcription duration logging
- **GIVEN** transcription completes
- **WHEN** TranscriptionService.transcribe() finishes
- **THEN** the duration is logged (e.g., "Transcription took 1.5s")

#### Scenario: AI query duration logging
- **GIVEN** AI query completes
- **WHEN** AIRouter.query() finishes
- **THEN** the duration is logged with breakdown (message build, API call, tool execution)

#### Scenario: TTS synthesis duration logging
- **GIVEN** TTS synthesis completes
- **WHEN** orchestrator speaks the AI response
- **THEN** the synthesis duration is logged

#### Scenario: Total interaction duration logging
- **GIVEN** complete voice interaction finishes
- **WHEN** VoiceInteractionOrchestrator.processVoiceInteraction() completes
- **THEN** the total duration is logged (target: <7 seconds from transcription start to TTS playback complete)

---

### Requirement: Startup Sequence

The voice gateway SHALL initialize all subsystems in an order that ensures the system is fully ready before announcing readiness to the user.

#### Scenario: Tool system ready before welcome message (MODIFIED)

- **GIVEN** the voice gateway is starting up
- **WHEN** the system reaches the point of speaking the welcome message
- **THEN** the tool system must already be initialized and registered
- **AND** the voice orchestrator must be created
- **AND** the state machine must be set up
- **AND** only the microphone activation remains pending

**Rationale:** The welcome message asks "How can I help?" which implies the system is ready to process commands. Saying this before tools are initialized creates user confusion and perceived system lag.

**Previous Behavior:**
```
1. Services init
2. Wake word detector init
3. Welcome message: "How can I help?"
4. Tool system init ← Delay here!
5. Orchestrator created
6. State machine setup
7. Microphone started
```

**New Behavior:**
```
1. Services init
2. Wake word detector init
3. Tool system init
4. Orchestrator created
5. State machine setup
6. Welcome message: "How can I help?" ← Now truly ready!
7. Microphone started
```

#### Scenario: Immediate responsiveness after welcome

- **GIVEN** the welcome message has finished playing
- **WHEN** the user triggers the wake word immediately after
- **THEN** the system responds without delay
- **AND** all tools are available for command execution
- **AND** no "initializing" or "not ready" errors occur

**Rationale:** Users expect to interact immediately after hearing "How can I help?". Any delay creates confusion and breaks user trust in the system.

#### Scenario: Startup log sequence reflects readiness

- **GIVEN** the voice gateway is starting up
- **WHEN** reviewing the startup logs
- **THEN** tool initialization logs appear before TTS synthesis logs
- **AND** "Tool system initialized" appears before "Welcome message spoken"
- **AND** "Voice Gateway ready" appears after welcome message

**Rationale:** Logs should accurately reflect the initialization order so developers can diagnose timing issues.

---

### Requirement: Startup Timing Transparency

The voice gateway SHALL only announce readiness (via welcome message) when genuinely ready to accept and process user commands.

#### Scenario: No premature readiness announcements

- **GIVEN** the voice gateway is initializing
- **WHEN** any subsystem is still being set up (tools, orchestrator, state machine)
- **THEN** the welcome message must NOT be spoken
- **AND** no audio cues suggesting readiness should play

**Rationale:** Announcing readiness before being ready damages user trust and creates perception that the system is slow or broken.

#### Scenario: Welcome message timing validation

- **GIVEN** the voice gateway has spoken the welcome message
- **WHEN** a developer inspects the system state
- **THEN** all of the following must be true:
  - Tool registry is populated with all expected tools
  - ToolExecutor is instantiated and functional
  - VoiceInteractionOrchestrator is created
  - Voice state machine is initialized
- **AND** only microphone activation and wake word listening remain to be started

**Rationale:** Provides clear validation criteria for correct initialization order.

