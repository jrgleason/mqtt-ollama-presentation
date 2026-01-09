## ADDED Requirements

### Requirement: Z-Wave Unavailability Error Handling

The Z-Wave MCP server SHALL provide clear, user-friendly error messages when the Z-Wave JS UI is unavailable.

#### Scenario: Z-Wave JS UI connection timeout

- **GIVEN** Z-Wave JS UI server is unreachable (network down, Pi offline, service stopped)
- **WHEN** any Z-Wave tool is called (list_devices, verify_device, control_zwave_device, etc.)
- **THEN** tool returns error with user-friendly message
- **AND** error message is suitable for TTS playback
- **AND** error message includes: problem description, likely cause, suggested action
- **AND** example: "I can't reach the smart home system right now. The Z-Wave controller appears to be offline. Please check that it's powered on and connected to your network."

#### Scenario: Z-Wave JS UI connection refused

- **GIVEN** Z-Wave JS UI service is not running on the Pi
- **WHEN** any Z-Wave tool is called
- **THEN** tool returns error: "The Z-Wave service isn't running. Please start the Z-Wave JS UI service on your Raspberry Pi."

#### Scenario: Z-Wave JS UI partial failure

- **GIVEN** Z-Wave JS UI is reachable but returns internal error
- **WHEN** any Z-Wave tool is called
- **THEN** tool returns error: "The Z-Wave system encountered an error. Please try again in a moment, or restart the Z-Wave service if the problem persists."

---

### Requirement: Voice Gateway Error Translation

The voice gateway SHALL translate technical tool errors into speakable, user-friendly responses.

#### Scenario: Tool timeout translated to friendly message

- **GIVEN** ToolExecutor receives timeout error from Z-Wave tool
- **WHEN** error contains "Timed out" or "ETIMEDOUT"
- **THEN** ToolExecutor returns: "The smart home system is taking too long to respond. It might be offline or experiencing issues."
- **AND** log contains original technical error for debugging

#### Scenario: Connection refused translated to friendly message

- **GIVEN** ToolExecutor receives connection error from Z-Wave tool
- **WHEN** error contains "ECONNREFUSED" or "connection refused"
- **THEN** ToolExecutor returns: "I can't connect to the smart home controller. Please check that it's running and connected to your network."

#### Scenario: AI receives clear error context

- **GIVEN** Z-Wave tool fails with user-friendly error message
- **WHEN** AIRouter processes tool result
- **THEN** AI receives error message that clearly explains the situation
- **AND** AI can formulate a helpful response to user
- **AND** AI does NOT try to call another tool as a "workaround" (avoids cascade failures)

---

### Requirement: Z-Wave Health Check Tool

The Z-Wave MCP server SHALL provide a `check_zwave_health` tool for proactively checking system availability.

#### Scenario: Health check when Z-Wave is available

- **GIVEN** Z-Wave JS UI is running and reachable
- **WHEN** `check_zwave_health()` is called
- **THEN** tool returns: `{ available: true, nodeCount: 15, lastChecked: "2 seconds ago" }`
- **AND** response is fast (cached result, <100ms)

#### Scenario: Health check when Z-Wave is unavailable

- **GIVEN** Z-Wave JS UI is unreachable
- **WHEN** `check_zwave_health()` is called
- **THEN** tool returns: `{ available: false, error: "Cannot reach Z-Wave controller", lastChecked: "30 seconds ago" }`
- **AND** cached result used to avoid repeated timeout delays

#### Scenario: Health check cache expiry

- **GIVEN** Health check was performed 60+ seconds ago
- **WHEN** `check_zwave_health()` is called
- **THEN** fresh check is performed (not cached)
- **AND** cache is updated with new result

#### Scenario: AI uses health check proactively

- **GIVEN** User asks about smart home devices
- **AND** previous Z-Wave call failed recently
- **WHEN** AI processes the request
- **THEN** AI MAY call `check_zwave_health` first
- **AND** if unavailable, AI responds immediately with helpful message
- **AND** avoids waiting for tool timeout
