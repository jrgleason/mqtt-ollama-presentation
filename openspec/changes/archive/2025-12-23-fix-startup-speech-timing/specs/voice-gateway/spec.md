# voice-gateway Spec Delta

**Change ID:** `fix-startup-speech-timing`

## ADDED Requirements

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

## Implementation Notes

**Files Affected:**
- `apps/voice-gateway-oww/src/main.js` - Lines 313-350 (main() function)

**Change Type:** Code reorganization (no API changes, no new dependencies)

**Testing:**
- Manual testing: Start gateway, verify welcome message timing
- Log inspection: Confirm new initialization order
- Interactive testing: Trigger wake word immediately after welcome, verify responsiveness

**Risks:** Very low - pure code reordering with no logic changes
