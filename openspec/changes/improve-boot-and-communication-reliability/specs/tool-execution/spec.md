# tool-execution Spec Delta

## ADDED Requirements

### Requirement: MCP Connection Retry with Exponential Backoff

The system SHALL retry MCP server connection with exponential backoff when initial connection fails, and provide clear error messages including server diagnostic output.

#### Scenario: Successful connection on first attempt

- **GIVEN** MCP server is running and broker is available
- **WHEN** voice gateway attempts to initialize MCP integration
- **THEN** connection succeeds on first attempt
- **AND** no retry delays occur
- **AND** tools are discovered and registered normally

#### Scenario: Successful connection after retry

- **GIVEN** MCP server is temporarily unavailable (broker restarting, network blip)
- **WHEN** voice gateway attempts to initialize MCP integration
- **THEN** first attempt fails and retry is scheduled after 2 seconds
- **AND** second attempt succeeds
- **AND** tools are discovered and registered
- **AND** log shows "MCP connection succeeded on attempt 2"

#### Scenario: Connection fails after all retries

- **GIVEN** MCP server is permanently unavailable (broker down, server binary missing)
- **WHEN** voice gateway attempts all 3 connection retries (0s, 2s, 4s delays)
- **THEN** all attempts fail
- **AND** error log includes MCP server stderr output for debugging
- **AND** error message clearly states "MCP connection failed after 3 attempts"
- **AND** system continues with local tools only (graceful degradation)

#### Scenario: Exponential backoff delays

- **GIVEN** MCP connection is failing
- **WHEN** retry logic executes
- **THEN** retry delays follow exponential backoff: 0s (initial), 2s (retry 1), 4s (retry 2)
- **AND** total retry time is approximately 6 seconds maximum
- **AND** each retry attempt is logged with attempt number and delay

#### Scenario: MCP server stderr captured in errors

- **GIVEN** MCP server subprocess writes diagnostic output to stderr
- **WHEN** MCP connection fails
- **THEN** error log includes stderr output from MCP server
- **AND** stderr helps developers diagnose issue (missing dependency, broker unreachable, etc.)
- **AND** stderr is NOT mixed with stdout (protocol compliance maintained)

**Rationale:** MCP SDK stdio transport requires stdout to contain ONLY JSON-RPC messages. Debug output must use stderr.

#### Scenario: Clear user-facing error messages

- **GIVEN** MCP connection fails permanently
- **WHEN** error is logged
- **THEN** error message is clear and actionable for users
- **AND** message indicates system is in degraded mode (local tools only)
- **AND** message suggests checking MQTT broker and MCP server configuration

**Example Error Message:**
```
❌ Failed to initialize MCP tools after 3 attempts
   Reason: Connection to stdio server 'zwave' failed
   MCP Server stderr: [stderr output here]
   Check: MQTT broker running, zwave-mcp-server installed
⚠️ Continuing with local tools only (datetime, search, volume)
```

#### Scenario: Retry doesn't block startup

- **GIVEN** MCP retry logic is running (6 seconds maximum)
- **WHEN** other initialization steps are independent (MQTT, AI client, TTS)
- **THEN** those steps continue in parallel
- **AND** only tool-dependent initialization waits for MCP retry
- **AND** startup time impact is minimized

**Rationale:** MCP retry shouldn't block unrelated systems from initializing.

#### Scenario: Retry logic is configurable

- **GIVEN** retry parameters are defined in constants or config
- **WHEN** developers need to adjust retry behavior (count, delays)
- **THEN** changes are made in one location (MCPIntegration.js constants)
- **AND** no hardcoded magic numbers scattered throughout codebase

**Suggested Constants:**
```javascript
const MCP_RETRY_ATTEMPTS = 3; // total attempts (1 initial + 2 retries)
const MCP_RETRY_BASE_DELAY = 2000; // 2 seconds base delay
// Delays: 0ms (initial), 2000ms (retry 1), 4000ms (retry 2)
```
