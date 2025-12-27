# voice-gateway Spec Delta

## MODIFIED Requirements

### Requirement: Startup Sequence

The voice gateway SHALL initialize all subsystems in an order that ensures the system is fully ready before announcing readiness to the user, with detector warm-up and promise orchestration.

#### Scenario: Tool system ready before welcome message (MODIFIED)

- **GIVEN** the voice gateway is starting up
- **WHEN** the system reaches the point of speaking the welcome message
- **THEN** the tool system must already be initialized and registered
- **AND** the voice orchestrator must be created
- **AND** the state machine must be set up
- **AND** the wake word detector must be warmed up and stable
- **AND** only the microphone activation remains pending

**Rationale:** The welcome message asks "How can I help?" which implies the system is ready to process commands. Saying this before tools are initialized OR before detector is stable creates user confusion and perceived system lag.

**Previous Behavior:**
```
1. Services init
2. Wake word detector init (buffers filling, not stable)
3. Welcome message: "How can I help?" ← Too early!
4. Tool system init ← Delay here!
5. Orchestrator created
6. State machine setup
7. Microphone started
```

**New Behavior:**
```
1. Services init
2. Wake word detector init + WARM-UP (2-3 sec after buffers filled)
3. Tool system init (with MCP retry)
4. Orchestrator created
5. State machine setup
6. Welcome message: "How can I help?" ← Now truly ready!
7. Microphone started and listening activated
```

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
- **THEN** detector warm-up logs appear before tool initialization logs
- **AND** tool initialization logs appear before welcome message logs
- **AND** "Tool system initialized" appears before "TTS synthesis complete" (welcome message)
- **AND** "Voice Gateway ready" appears after welcome message spoken

**Rationale:** Logs should accurately reflect the initialization order so developers can diagnose timing issues.

#### Scenario: Detector warm-up period enforced

- **GIVEN** the wake word detector embedding buffers are filled (~2.24 seconds)
- **WHEN** the detector emits buffer-filled event
- **THEN** system waits an additional 2-3 seconds for embeddings to stabilize
- **AND** detector emits warm-up-complete event after stabilization
- **AND** only then does initialization proceed to next steps

**Rationale:** Measured from logs showing initial embedding instability. Warm-up ensures detector is truly ready.

---

## ADDED Requirements

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
