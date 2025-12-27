# tool-execution Spec Delta

**Change ID:** `fix-mcp-server-logging`

## ADDED Requirements

### Requirement: MCP Server Logging Compliance

MCP servers SHALL use stderr for all diagnostic output to maintain stdout protocol compliance.

#### Scenario: Debug logs use stderr
- **GIVEN** the MCP server is running
- **WHEN** the server outputs debug or diagnostic information
- **THEN** the output is written to stderr (process.stderr), not stdout

#### Scenario: JSON-RPC messages use stdout
- **GIVEN** the MCP server needs to send a JSON-RPC response
- **WHEN** the server writes the response
- **THEN** the response is written to stdout as newline-delimited JSON

#### Scenario: Prevent stdout pollution
- **GIVEN** the MCP client is parsing responses
- **WHEN** the client reads from the server's stdout
- **THEN** every line is valid JSON-RPC (no debug logs, no plain text)

**Rationale:** The MCP SDK stdio transport requires stdout to contain ONLY newline-delimited JSON-RPC messages. Any other output breaks the protocol and causes parse failures in the client.

### Requirement: MCP Client Error Handling

MCP clients SHALL provide clear error messages when JSON-RPC parsing fails.

#### Scenario: Detect stdout pollution
- **GIVEN** the MCP client receives non-JSON data from server
- **WHEN** JSON parsing fails
- **THEN** the error message indicates the content that failed to parse

#### Scenario: Continue operation after parse error
- **GIVEN** a single JSON parse error occurs
- **WHEN** the next message arrives
- **THEN** the client continues processing (doesn't crash or block)

**Rationale:** Parsing errors should be logged but shouldn't crash the system. The client should be resilient to malformed messages.

## MODIFIED Requirements

### Requirement: Logging Context

Tool execution logs SHALL include sufficient context for debugging and monitoring **on the appropriate output stream**.

#### Scenario: MCP server debug logs (MODIFIED)
- **GIVEN** a Z-Wave MCP server tool is executing
- **WHEN** debug information needs to be logged
- **THEN** the debug output is written to stderr using `console.error()` or equivalent

**Rationale:** Clarifies that MCP servers MUST use stderr for logs, not stdout.
