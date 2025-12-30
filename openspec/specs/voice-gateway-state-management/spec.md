# voice-gateway-state-management Specification

## Purpose
TBD - created by archiving change refactor-xstate-separation-of-concerns. Update Purpose after archive.
## Requirements
### Requirement: VG-SM-01 - Wake Word Detector Lifecycle Management
The voice gateway MUST maintain wake word detector state through a dedicated state machine that tracks initialization, warm-up, readiness, and trigger events independently of other concerns.

#### Scenario: Detector warm-up tracking
**Given** the detector has been initialized
**When** audio begins streaming to the detector
**Then** the state machine transitions to "warming-up"
**And** when embedding buffers are filled
**Then** the state machine waits 2.5 seconds before transitioning to "ready"

#### Scenario: Readiness visibility for startup orchestration
**Given** the system is starting up
**When** components need to know if the detector is ready
**Then** the Wake

Word state machine provides a queryable "ready" state
**And** emits a "wake-word-ready" event when ready state is entered

#### Scenario: Buffer refill after reset
**Given** the detector is in "ready" state
**When** detector.reset() is called
**Then** the state machine transitions back to "warming-up"
**And** tracks the buffer refill and warm-up cycle

### Requirement: VG-SM-02 - Orthogonal State Machine Separation
The voice gateway MUST use separate, focused state machines for orthogonal concerns (wake word detection, audio recording, audio playback) to enable independent testing, clearer debugging, and parallel operations.

#### Scenario: Independent state queries
**Given** the system has separate state machines
**When** determining if beeps should play
**Then** both recording state AND playback state can be queried independently
**And** beeps are suppressed if either machine is active

#### Scenario: Parallel operations
**Given** TTS audio is playing
**When** wake word is detected
**Then** playback machine handles interruption
**And** recording machine can start simultaneously
**And** state machines coordinate via events, not shared state

### Requirement: VG-SM-03 - Startup Orchestration with State Synchronization
The voice gateway startup sequence MUST use state machine readiness signals to coordinate initialization phases, ensuring welcome messages and user interactions only occur when all subsystems are truly ready.

#### Scenario: Welcome message timing
**Given** the voice gateway is starting up
**When** the wake word state machine enters "ready" state
**Then** the welcome message synthesis begins
**And** no welcome message plays before detector readiness

#### Scenario: State machine activation order
**Given** the system is initializing
**When** startup proceeds through phases
**Then** detector initializes first (Phase 2)
**And** state machines initialize next (Phase 4)
**And** microphone starts feeding audio (Phase 5)
**And** welcome message waits for detector "ready" state (Phase 6)
**And** voice state machine activates last (Phase 7)

### Requirement: VG-SM-04 - Multi-Machine Voice Interaction Coordination
The voice gateway MUST use XState state machines to manage voice interaction states, with separate machines for wake word detection (off, warming-up, ready, triggered), audio recording (idle, recording, processing), and audio playback (idle, playing, cooldown, interrupted).

**Rationale**: Separating concerns into focused state machines improves testability, debugging, and enables parallel operations.

#### Scenario: Multiple machines coordinate voice interaction
**Given** the voice gateway receives a wake word trigger
**When** the wake word machine transitions to "triggered" state
**Then** the recording machine receives START_RECORDING event
**And** the recording machine transitions to "recording" state
**And** when recording completes, playback machine receives START_PLAYBACK event
**And** each machine operates independently with event-based coordination

