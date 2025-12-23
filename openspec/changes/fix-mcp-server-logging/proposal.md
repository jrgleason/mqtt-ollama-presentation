# Proposal: Fix MCP Server Logging Pollution

**Change ID:** `fix-mcp-server-logging`
**Status:** Implemented
**Created:** 2025-12-22
**Implemented:** 2025-12-22
**Affects:** Z-Wave MCP Server, Tool Execution

## Summary

Fix critical bug where `console.log()` debug statements in the MCP server pollute stdout, breaking JSON-RPC communication. Debug logs must be sent to stderr instead of stdout to avoid interfering with the MCP protocol.

## Motivation

### Current Problem

The Z-Wave MCP server (`apps/zwave-mcp-server/src/index.js`) uses `console.log()` for debug output, which writes to stdout. However, stdout is used for JSON-RPC communication with the MCP client. This causes:

1. **JSON Parse Failures** - Client tries to parse debug logs as JSON-RPC messages
2. **Communication Breakdown** - Client cannot receive actual MCP responses
3. **Silent Failures** - Tool executions succeed but responses are lost in noise

**Evidence from logs:**
```
[mcp] Failed to parse JSON message:
SyntaxError: Unexpected token 'm', "[mcp-server"... is not valid JSON
Line: [mcp-server] list_zwave_devices called {
```

### Why This Matters

1. **Protocol Compliance** - MCP SDK uses stdio transport with newline-delimited JSON
   - stdout MUST contain only valid JSON-RPC messages
   - stderr is the correct channel for logging and diagnostics

2. **Debugging Impact** - Debug logs are currently HARMFUL instead of helpful
   - They break functionality instead of aiding troubleshooting
   - Creates confusing error messages that hide the real problem

3. **Production Risk** - MCP server is non-functional with logging enabled
   - Cannot diagnose issues without breaking the system
   - Forces choice between debugging and working code

### Root Cause

**In `apps/zwave-mcp-server/src/index.js` (lines 219-303):**
```javascript
console.log('[mcp-server] list_zwave_devices called', {...});
console.log('[mcp-server] Fetching live nodes from Z-Wave JS UI...');
console.log('[mcp-server] Got live nodes', {...});
// ... 10+ more console.log statements
```

**All of these write to stdout, polluting the JSON-RPC stream.**

## Proposed Changes

### Core Fix: Redirect Debug Logs to stderr

Replace all `console.log()` calls in MCP server code with `console.error()` or a proper stderr logger.

**Why `console.error()` is the solution:**
- In Node.js, `console.error()` writes to `process.stderr`
- stderr is the standard channel for diagnostics and debug output
- stdout remains clean for JSON-RPC communication

### Files to Modify

**1. `apps/zwave-mcp-server/src/index.js`** (Lines 219-303)
- Replace ~15 `console.log()` calls with `console.error()`
- Preserve all log messages and structure
- Only change the output channel

**2. `apps/zwave-mcp-server/src/mcp-client.js`** (Lines 251, 265, 275, 279)
- Replace 4 `console.log()` calls with `console.error()`
- Keep debug output for troubleshooting
- Ensure MCP client can show diagnostics without breaking protocol

**3. `apps/voice-gateway-oww/src/tools/zwave-control-tool.js`** (Optional cleanup)
- Review if any debug logs need stderr redirection
- No stdout pollution in this file, but verify consistency

### Implementation Strategy

**Phase 1: Simple Find-Replace (Low Risk)**
1. Find all `console.log()` in MCP server files
2. Replace with `console.error()`
3. Verify no functionality changes (only output channel)

**Phase 2: Validation**
1. Test MCP server startup
2. Verify client can list devices without parse errors
3. Confirm debug logs still visible on stderr
4. Test full voice pipeline with device queries

**Phase 3: Documentation**
1. Add comment in code explaining stderr usage
2. Update MCP server README with logging guidelines
3. Document how to view MCP debug logs (stderr capture)

## Impact Analysis

### Breaking Changes

**None** - This is a bug fix, not a feature change.

### Behavior Changes

**Debug Output Location:**
- Before: Debug logs on stdout (breaking JSON-RPC)
- After: Debug logs on stderr (proper diagnostic channel)

**User Experience:**
- Before: MCP server appears to work but returns empty responses
- After: MCP server works correctly with debug logs available on stderr

### Risk Assessment

**Risk: Low**
- Change is isolated to logging output channel
- No logic changes, only `console.log()` → `console.error()`
- Tested pattern (Node.js convention for debug output)

**Mitigation:**
- Test before/after with actual voice queries
- Verify JSON-RPC messages still parse correctly
- Confirm debug logs still visible (just on stderr)

## Implementation Notes

**Decision: Use `console.warn()` instead of `console.error()`**

During implementation, we decided to use `console.warn()` for debug/diagnostic output instead of `console.error()`:

**Rationale:**
- Both `console.warn()` and `console.error()` write to stderr (avoiding stdout pollution)
- `console.warn()` better semantically represents "diagnostic information" vs "actual errors"
- Preserves `console.error()` for genuine error conditions
- Can be filtered/disabled separately from errors in production environments

**Files Modified:**
- `apps/zwave-mcp-server/src/index.js` - 6 console.log() → console.warn()
- `apps/zwave-mcp-server/src/mcp-client.js` - 4 console.log() → console.warn()
- `apps/zwave-mcp-server/src/zwave-client.js` - 1 console.log() → console.warn()
- `apps/zwave-mcp-server/src/mqtt-client.js` - 4 console.log() → console.warn()

**Total:** 15 console.log() calls replaced with console.warn()

## Success Criteria

- [x] All `console.log()` debug statements moved to stderr
- [ ] MCP client successfully parses all JSON-RPC responses (pending testing)
- [ ] No "[mcp] Failed to parse JSON message" errors (pending testing)
- [ ] Device listing works end-to-end (pending testing)
- [ ] Voice queries return AI responses with device information (pending testing)
- [ ] Debug logs still available for troubleshooting (pending testing)

## Alternative Approaches Considered

### 1. Remove Debug Logs Entirely
**Rejected** - Debug logs are valuable for troubleshooting. Better to fix than remove.

### 2. Use a Logging Library
**Rejected** - Overkill for simple fix. Built-in console methods are sufficient.

### 3. Use `console.error()` for all stderr output
**Partially Accepted** - We use `console.error()` for actual errors, but `console.warn()` for debug/diagnostic output to preserve semantic meaning.

### 4. Conditional Logging (Environment Variable)
**Rejected** - Adds complexity. Debug logs should always work (on stderr).

## References

- MCP SDK stdio transport documentation: Uses newline-delimited JSON on stdout
- Node.js streams:
  - `console.log()`, `console.info()`, `console.debug()` → stdout ❌
  - `console.warn()`, `console.error()` → stderr ✅
- Current bug logs: `/Users/jrg/code/CodeMash/mqtt-ollama-presentation/apps/voice-gateway-oww/logs/`
- MCP server implementation: `apps/zwave-mcp-server/src/index.js`
- MCP client implementation: `apps/zwave-mcp-server/src/mcp-client.js`
