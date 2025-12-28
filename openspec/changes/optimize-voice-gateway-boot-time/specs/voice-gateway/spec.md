# voice-gateway Specification Delta

## MODIFIED Requirements

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

## ADDED Requirements

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

---

## REMOVED Requirements

### Requirement: Post-Welcome Detector Reset

**Reason**: Redundant with detector warm-up period. The 1000ms delay + detector reset after welcome message playback is unnecessary because the detector warm-up timer (2.5s after buffer fill) already ensures stability. Removing this saves ~1s boot time with no accuracy impact.

**Migration**: No migration needed. The detector warm-up timer provides the same stability guarantee that the post-welcome reset was intended to provide. Logs will no longer show "detector reset post-startup-tts" after welcome message completes.

**Affected Code**: `apps/voice-gateway-oww/src/util/InitUtil.js:117-120` (setTimeout + safeDetectorReset call)
