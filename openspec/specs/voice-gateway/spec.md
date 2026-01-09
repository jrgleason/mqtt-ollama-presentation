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

The voice gateway SHALL initialize all subsystems in an order that ensures the system is fully ready before announcing readiness to the user, with optimized parallelization for faster boot times while maintaining detector warm-up and promise orchestration.

#### Scenario: Tool system ready before welcome message (MODIFIED)

- **GIVEN** the voice gateway is starting up
- **WHEN** the system reaches the point of speaking the welcome message
- **THEN** the tool system must already be initialized and registered
- **AND** the voice orchestrator must be created
- **AND** the state machine must be set up
- **AND** the wake word detector must be warmed up and stable
- **AND** only the microphone activation remains pending

**Rationale:** The welcome message asks "How can I help?" which implies the system is ready to process commands. Saying this before tools are initialized OR before detector is stable creates user confusion and perceived system lag.

**Optimized Behavior:**
```
1. Services init + health checks (parallel: AI + TTS)
2. Wake word detector init (load ONNX models)
3. MCP tool discovery (parallel, non-blocking) + Welcome TTS synthesis (parallel)
4. Orchestrator created + State machine setup
5. Microphone started (begins feeding audio for warm-up)
6. Detector WARM-UP (2.5s after buffers filled)
7. Welcome message playback (pre-synthesized audio)
8. Listening activated (no post-welcome reset delay)
```

**Key Optimizations:**
- MCP initialization runs in parallel with detector and microphone setup
- Welcome message TTS synthesis runs during MCP initialization
- Post-welcome detector reset delay removed (redundant with warm-up)
- Health checks run concurrently instead of sequentially

#### Scenario: Immediate responsiveness after welcome

- **GIVEN** the welcome message has finished playing
- **WHEN** the user triggers the wake word immediately after
- **THEN** the system responds without delay
- **AND** all tools are available for command execution
- **AND** no "initializing" or "not ready" errors occur
- **AND** detector is fully stable (no cutoffs, no false negatives)

**Rationale:** Users expect to interact immediately after hearing "How can I help?". Any delay creates confusion and breaks user trust in the system.

#### Scenario: Startup log sequence reflects readiness

- **GIVEN** the voice gateway is starting up
- **WHEN** reviewing the startup logs
- **THEN** detector warm-up logs appear before tool initialization completion logs
- **AND** MCP initialization logs may interleave with other startup phases (parallel execution)
- **AND** "Tool system initialized" appears before "Voice Gateway ready"
- **AND** "Voice Gateway ready" appears after welcome message playback completes
- **AND** timing markers show phase durations for performance monitoring

**Rationale:** Logs should accurately reflect the initialization order and parallelization so developers can diagnose timing issues and verify optimizations.

#### Scenario: Detector warm-up period enforced

- **GIVEN** the wake word detector embedding buffers are filled (~2.24 seconds)
- **WHEN** the detector emits buffer-filled event
- **THEN** system waits an additional 2.5 seconds (configurable) for embeddings to stabilize
- **AND** detector emits warm-up-complete event after stabilization
- **AND** only then does initialization proceed to welcome message playback

**Rationale:** Measured from logs showing initial embedding instability. Warm-up ensures detector is truly ready. Timer is configurable for testing and tuning.

#### Scenario: MCP initialization parallelization

- **GIVEN** the voice gateway is starting up
- **WHEN** MCP tool discovery is initiated
- **THEN** MCP initialization runs in parallel with detector and microphone setup
- **AND** MCP tools are registered before first voice interaction is processed
- **AND** if MCP initialization fails or is slow, local tools remain available
- **AND** graceful degradation logs warning but continues operation

**Rationale:** MCP initialization has no dependencies on detector or microphone, so running in parallel reduces critical path boot time. Graceful degradation ensures service availability even if MCP fails.

#### Scenario: Welcome message pre-synthesis

- **GIVEN** the voice gateway is starting up
- **WHEN** MCP tool discovery is running (in parallel)
- **THEN** welcome message TTS synthesis occurs concurrently
- **AND** synthesized audio is cached for playback after detector warm-up
- **AND** if synthesis fails, boot continues without welcome message (non-critical)
- **AND** playback still occurs after detector warm-up completes

**Rationale:** TTS synthesis takes ~1s and blocks startup unnecessarily. Pre-synthesizing during parallel MCP init removes this from the critical path while maintaining correct playback timing.

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

### Requirement: Startup Readiness Validation

The voice gateway SHALL only announce readiness (via welcome message) when genuinely ready to accept and process user commands without delays or errors.

#### Scenario: No premature readiness announcements

- **GIVEN** the voice gateway is initializing
- **WHEN** any subsystem is still being set up (detector warming up, tools loading, orchestrator creating)
- **THEN** the welcome message must NOT be spoken
- **AND** no audio cues suggesting readiness should play

**Rationale:** Announcing readiness before being ready damages user trust and creates perception that the system is slow or broken.

#### Scenario: Welcome message timing validation

- **GIVEN** the voice gateway has spoken the welcome message
- **WHEN** a developer inspects the system state
- **THEN** all of the following must be true:
  - Wake word detector is warmed up and stable
  - Tool registry is populated with all expected tools (local + MCP if available)
  - ToolExecutor is instantiated and functional
  - VoiceInteractionOrchestrator is created
  - Voice state machine is initialized
- **AND** only microphone activation and wake word listening remain to be started

**Rationale:** Provides clear validation criteria for correct initialization order.

#### Scenario: Graceful degradation with clear messaging

- **GIVEN** MCP server connection fails after all retries
- **WHEN** voice gateway continues with local tools only
- **THEN** system logs clear warning message indicating degraded mode
- **AND** welcome message is still spoken (system is functional, just missing Z-Wave tools)
- **AND** user is NOT blocked from using local tools (datetime, search, volume control)

**Rationale:** System should work with degraded functionality rather than failing completely.

#### Scenario: Async orchestration with promises

- **GIVEN** initialization sequence uses async/await promises
- **WHEN** each initialization step completes
- **THEN** the promise resolves and next step begins
- **AND** errors in any step are caught and logged with context
- **AND** initialization sequence is deterministic (no race conditions)

**Rationale:** Promises provide clear dependency ordering and error handling for async initialization.

### Requirement: Skip Transcription When No Speech Detected
The system SHALL skip transcription and AI processing when no speech was detected during recording, immediately returning to the listening state.

#### Scenario: False wake word trigger with no speech
- **GIVEN** the wake word detector triggers but no speech is detected during recording (hasSpokenDuringRecording = false)
- **WHEN** the recording stops due to silence or timeout
- **THEN** the system SHALL skip transcription, log "⏩ Skipping transcription - no speech detected", and transition to listening state without querying the AI

#### Scenario: Valid speech after wake word trigger
- **GIVEN** the wake word detector triggers AND speech is detected during recording (hasSpokenDuringRecording = true)
- **WHEN** the recording stops due to trailing silence
- **THEN** the system SHALL process the voice interaction normally (transcription → AI query → TTS response)

#### Scenario: Beep feedback captured during recording
- **GIVEN** the wake word detector triggers AND only beep audio (no actual speech) is captured during recording
- **WHEN** VAD determines no speech was present (hasSpokenDuringRecording = false)
- **THEN** the system SHALL skip transcription and not send the beep audio to Whisper

#### Scenario: User triggered but stayed silent during grace period
- **GIVEN** the wake word detector triggers but user does not speak during the grace period (1200ms)
- **WHEN** VAD timeout occurs without speech detection
- **THEN** the system SHALL skip transcription and log the skip reason

#### Scenario: Recording stopped at max length without speech
- **GIVEN** recording reaches maximum length (10 seconds) without detecting speech
- **WHEN** MAX_LENGTH_REACHED event is sent
- **THEN** the system SHALL skip transcription (no speech detected) and transition to listening

---

### Requirement: Voice Interruption Support

The voice gateway SHALL support barge-in/interruption where users can trigger wake word during TTS playback to interrupt and start new interaction.

#### Scenario: Interrupt TTS playback with wake word

- **GIVEN** TTS audio is playing through speakers
- **WHEN** wake word is detected (during cooldown state)
- **THEN** active TTS playback SHALL be cancelled immediately (< 100ms)
- **AND** audio playback process SHALL be terminated (afplay/aplay killed)
- **AND** state machine SHALL transition from cooldown to recording
- **AND** new voice interaction SHALL begin
- **AND** previous response SHALL be marked as interrupted (not completed)

**Rationale:** Natural conversation requires ability to interrupt, correct, or redirect mid-response.

#### Scenario: Microphone recording continues during TTS

- **GIVEN** TTS audio is playing
- **WHEN** microphone data is captured
- **THEN** samples SHALL be added to pre-roll buffer
- **AND** wake word detection SHALL remain active (NOT disabled)
- **AND** samples SHALL be processed for wake word detection

**Rationale:** Recording and playback are independent. Must detect wake word during playback to enable interruption.

#### Scenario: Cancel Anthropic streaming TTS on interruption

- **GIVEN** Anthropic streaming TTS is active (tokens streaming, audio playing)
- **WHEN** wake word is detected (interruption)
- **THEN** Anthropic stream SHALL be aborted via AbortController
- **AND** TTS synthesis SHALL stop immediately
- **AND** audio playback SHALL be cancelled
- **AND** no further tokens SHALL be processed

**Rationale:** Streaming TTS must be cancellable to support interruption.

#### Scenario: Conversation context includes interrupted exchanges

- **GIVEN** user asks "What's the weather?"
- **AND** TTS response starts playing
- **WHEN** user interrupts: "Hey Jarvis, tell me about devices instead"
- **THEN** conversation history SHALL include:
  - User: "What's the weather?"
  - Assistant: [interrupted response text]
  - User: "tell me about devices instead"
- **AND** AI context SHALL include full conversation

**Rationale:** Interrupted exchanges provide context for follow-up interactions.

---

### Requirement: Audio Playback Lifecycle Management

The voice gateway SHALL track active TTS playback to enable cancellation.

#### Scenario: Cancellable audio playback

- **GIVEN** VoiceInteractionOrchestrator is speaking AI response
- **WHEN** _speakResponse() is called
- **THEN** AudioPlayer.playInterruptible() SHALL be used
- **AND** playback handle SHALL be stored in this.activePlayback
- **AND** playback handle SHALL provide cancel() method
- **AND** playback SHALL be set to null when complete or cancelled

**Rationale:** Enables voice interruption by making TTS playback cancellable.

#### Scenario: Orchestrator cancellation method

- **GIVEN** VoiceInteractionOrchestrator has active playback
- **WHEN** cancelActivePlayback() method is called
- **THEN** active playback SHALL be cancelled
- **AND** "🛑 Cancelling active TTS playback (interrupted by user)" SHALL be logged
- **AND** activePlayback SHALL be set to null

---

### Requirement: State Transition Logging

The voice gateway SHALL use clear logging that indicates when system can be interrupted.

#### Scenario: Cooldown state logging indicates interruptibility

- **GIVEN** state machine transitions to cooldown state
- **WHEN** entry log is emitted
- **THEN** log message SHALL be "⏸️ Cooldown (can interrupt)"
- **AND** users SHALL understand wake word detection is still active

**Previous Behavior:** "⏸️ Cooldown period before re-arming" (unclear if listening)

**New Behavior:** Explicit interruptibility indication

#### Scenario: Remove redundant detector logging

- **GIVEN** OpenWakeWord detector fills embedding buffer
- **WHEN** buffer ready event occurs
- **THEN** "🎧 Listening for wake word..." log SHALL NOT appear
- **OR** SHALL be logged at debug level only

**Previous Behavior:** Both state machine AND detector logged "Listening..." (confusing)

**New Behavior:** Single source of truth (state machine only)

**Rationale:** Duplicate logs during TTS playback created confusion about system state.

### Requirement: MCP Retry Strategy Optimization

The voice gateway SHALL use an optimized retry strategy for MCP tool discovery that balances reliability with fast boot times.

#### Scenario: MCP connection success on first attempt

- **GIVEN** the Z-Wave MCP server is running and accessible
- **WHEN** MCP tool discovery is initiated
- **THEN** connection succeeds on first attempt with 0ms delay
- **AND** tools are discovered and registered immediately
- **AND** no retry delays are incurred

**Rationale:** Most boots succeed on first attempt. Optimized retry strategy should not penalize the common case.

#### Scenario: MCP connection retry on transient failure

- **GIVEN** the Z-Wave MCP server has a transient startup delay
- **WHEN** MCP tool discovery fails on first attempt
- **THEN** system retries after 1000ms base delay (configurable via MCP_RETRY_BASE_DELAY)
- **AND** exponential backoff is not applied (only 2 attempts total)
- **AND** if second attempt succeeds, tools are registered with minimal delay

**Rationale:** Transient failures (e.g., server slow to start) are rare. One retry with 1s delay is sufficient without excessive wait time.

#### Scenario: MCP connection permanent failure

- **GIVEN** the Z-Wave MCP server is not installed or misconfigured
- **WHEN** MCP tool discovery fails on all retry attempts (default: 2)
- **THEN** system logs error with stderr output for debugging
- **AND** gracefully degrades to local tools only
- **AND** service continues operation without Z-Wave device control
- **AND** total retry delay is minimized (1s vs previous 6s)

**Rationale:** Permanent failures (wrong path, missing deps) are immediate and deterministic. Short retry window reduces wasted time on inevitable failure.

#### Scenario: MCP retry configuration

- **GIVEN** the voice gateway configuration is loaded
- **WHEN** MCP retry settings are read
- **THEN** MCP_RETRY_ATTEMPTS defaults to 2 (was 3)
- **AND** MCP_RETRY_BASE_DELAY defaults to 1000ms (was 2000ms)
- **AND** both values are configurable via environment variables
- **AND** retry strategy uses exponential backoff (attempt 1: 0ms, attempt 2: 1000ms)

**Rationale:** Optimized defaults reduce boot time while maintaining configurability for different deployment scenarios.

---

### Requirement: Boot Time Performance Monitoring

The voice gateway SHALL provide timing instrumentation for startup phases to enable performance monitoring and optimization validation.

#### Scenario: Phase timing logging

- **GIVEN** the voice gateway is starting up
- **WHEN** each initialization phase completes
- **THEN** system logs phase name and duration in milliseconds
- **AND** logs include cumulative boot time from process start
- **AND** timing markers are structured for easy parsing and analysis

**Rationale:** Timing instrumentation enables data-driven optimization and regression detection. Developers can identify which phases contribute most to boot time.

#### Scenario: Boot time target validation

- **GIVEN** the voice gateway has completed startup
- **WHEN** the "Voice Gateway ready" log is emitted
- **THEN** total boot time from process start is logged
- **AND** performance target (<7 seconds) is documented in logs or warnings
- **AND** if boot time exceeds target, warning is logged with phase breakdown

**Rationale:** Automated performance validation ensures optimizations are effective and regressions are detected early.

#### Scenario: Parallel operation timing visibility

- **GIVEN** MCP initialization and detector warm-up are running in parallel
- **WHEN** reviewing startup logs
- **THEN** both operations log their individual start and completion times
- **AND** logs clearly indicate which operations ran concurrently
- **AND** critical path (longest blocking operation) is identifiable from logs

**Rationale:** Parallel operations make timing analysis more complex. Clear logging helps developers understand actual vs theoretical time savings.

---

### Requirement: Detector Warm-up Configurability

The voice gateway SHALL allow configuration of the detector warm-up timer to enable tuning and testing without code changes.

#### Scenario: Default warm-up timer

- **GIVEN** no DETECTOR_WARMUP_MS environment variable is set
- **WHEN** the detector warm-up period is configured
- **THEN** system uses default value of 2500ms
- **AND** warm-up period starts after embedding buffers are filled
- **AND** detector emits warm-up-complete event after timer expires

**Rationale:** Conservative default (2.5s) ensures stability and accuracy for most deployments.

#### Scenario: Custom warm-up timer

- **GIVEN** DETECTOR_WARMUP_MS environment variable is set to 1500
- **WHEN** the detector warm-up period is configured
- **THEN** system uses 1500ms warm-up timer
- **AND** warm-up completes 1 second faster than default
- **AND** configuration is logged during startup for visibility

**Rationale:** Configurability enables testing different timer values to optimize boot time vs accuracy trade-off without code changes.

#### Scenario: Warm-up timer bounds validation

- **GIVEN** DETECTOR_WARMUP_MS environment variable is set to an invalid value (e.g., 0, negative, >10000)
- **WHEN** the detector warm-up period is configured
- **THEN** system logs warning about invalid value
- **AND** falls back to default 2500ms
- **AND** boot continues normally with safe default

**Rationale:** Input validation prevents misconfiguration from degrading system accuracy or stability.

