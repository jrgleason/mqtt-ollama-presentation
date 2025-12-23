# Tasks: Fix MCP Server Logging

**Change ID:** `fix-mcp-server-logging`
**Status:** Implementation Complete - Testing Pending
**Total Tasks:** 8 (4 completed, 4 pending user testing)

## Phase 1: Locate All console.log() Calls (2 tasks)

- [x] **1.1** Find all `console.log()` in MCP server
  - Search `apps/zwave-mcp-server/src/index.js` for `console.log(`
  - Search `apps/zwave-mcp-server/src/mcp-client.js` for `console.log(`
  - Document line numbers and context for each occurrence
  - **Validation:** ✅ Found and documented all console.log() calls in index.js (6 calls), mcp-client.js (4 calls), zwave-client.js (1 call), mqtt-client.js (4 calls)

- [x] **1.2** Verify no other stdout pollution sources
  - Check for `process.stdout.write()` direct calls
  - Check for any third-party logging to stdout
  - Verify only JSON-RPC messages should use stdout
  - **Validation:** ✅ No direct stdout writes found, only console methods

## Phase 2: Replace console.log() with console.warn() (2 tasks)

- [x] **2.1** Fix MCP server (index.js, zwave-client.js, mqtt-client.js)
  - Replace all `console.log()` calls with `console.warn()` for debug/diagnostic output
  - Keep `console.error()` for actual error conditions
  - Add comment explaining stderr usage at top of index.js
  - **Validation:** ✅ All console.log() replaced with console.warn() in index.js (6 calls), zwave-client.js (1 call), mqtt-client.js (4 calls)

- [x] **2.2** Fix MCP client (mcp-client.js)
  - Replace all `console.log()` calls with `console.warn()` for debug output
  - Keep `console.error()` for actual errors
  - **Validation:** ✅ All console.log() replaced with console.warn() in mcp-client.js (4 calls)

## Phase 3: Testing and Validation (4 tasks)

- [ ] **3.1** Test MCP server startup
  - Start MCP server manually
  - Verify no parse errors
  - Confirm debug logs appear on stderr
  - **Validation:** Server starts without JSON parse errors

- [ ] **3.2** Test device listing via tool
  - Restart voice gateway
  - Ask: "What Z-Wave devices are available?"
  - Verify no "[mcp] Failed to parse JSON message" errors
  - Verify AI receives device list successfully
  - **Validation:** Device list returned correctly

- [ ] **3.3** Test device filtering
  - Ask: "Is Switch One online?"
  - Verify filter parameter works correctly
  - Verify AI receives filtered device status
  - **Validation:** Filtered device query works

- [ ] **3.4** Test full voice pipeline
  - Trigger wake word
  - Ask device query
  - Verify AI response includes device information
  - Verify TTS speaks response
  - **Validation:** End-to-end voice query works with device tools

## Dependencies

- **Sequential:** Phase 2 must complete before Phase 3
- **Parallel-safe:** Tasks 2.1 and 2.2 can be done in parallel
- **Blocking:** Phase 3 requires voice gateway restart

## Rollback Plan

If issues arise:
1. Revert all `console.error()` back to `console.log()`
2. Restart services
3. Debug root cause

This is safe because the change is simple find-replace.

## Success Metrics

- Zero JSON parse errors in MCP client logs
- Device listing works via voice command
- Debug logs still visible (on stderr)
- Full voice pipeline functional
- No regressions in tool execution

## Critical Bug Fix

This change fixes a critical bug where the MCP server is completely non-functional due to stdout pollution. The MCP SDK protocol requires stdout to contain ONLY newline-delimited JSON-RPC messages. Any other output breaks the protocol.

**Before:**
```
stdout: [mcp-server] list_zwave_devices called {...}
        {"jsonrpc":"2.0","id":1,"result":{...}}  ← Client can't find this!
```

**After:**
```
stderr: [mcp-server] list_zwave_devices called {...}
stdout: {"jsonrpc":"2.0","id":1,"result":{...}}  ← Clean JSON-RPC only
```
