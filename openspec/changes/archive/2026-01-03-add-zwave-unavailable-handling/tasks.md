# Tasks: Add Graceful Z-Wave Unavailability Handling

**Change ID:** `add-zwave-unavailable-handling`

**Status:** Completed

---

## Phase 1: Error Message Improvements (2 tasks)

- [x] **1.1** Improve Z-Wave MCP server error messages
  - Update `apps/zwave-mcp-server/src/index.js` tool handlers
  - Return user-friendly, speakable error messages
  - Example: "The Z-Wave smart home system is currently unavailable. Please check that the Raspberry Pi is powered on and connected to the network."
  - **Completed:** Added `translateZWaveError()` function and updated all tool handlers

- [x] **1.2** Add Z-Wave client health check method
  - Add `checkHealth()` method to `apps/zwave-mcp-server/src/zwave-client.js`
  - Return status object: `{ available: boolean, error?: string, lastChecked: Date }`
  - Cache result for short period to avoid repeated timeouts
  - **Completed:** Implemented with user-friendly error messages for different error types

## Phase 2: Voice Gateway Error Handling (2 tasks)

- [x] **2.1** Translate tool errors to voice-friendly messages
  - Update `apps/voice-gateway-oww/src/services/ToolExecutor.js`
  - Detect Z-Wave timeout/connection errors
  - Return clear speakable message instead of technical error
  - **Completed:** Enhanced `formatErrorMessage()` to detect Z-Wave tools and translate errors appropriately

- [x] **2.2** Handle tool failures gracefully in AIRouter
  - Update `apps/voice-gateway-oww/src/ai/AIRouter.js`
  - When tool returns error, provide AI with clear context
  - Ensure AI responds with helpful message to user
  - **Note:** AIRouter already delegates error handling to ToolExecutor, which now provides friendly messages

## Phase 3: Optional Health Check (1 task)

- [x] **3.1** Add Z-Wave health check MCP tool
  - Add `check_zwave_health` tool to MCP server
  - Returns current availability status
  - Can be used by AI to check before attempting operations
  - **Completed:** Implemented with 60-second caching to avoid repeated timeouts

## Phase 4: Testing (1 task)

- [x] **4.1** Test error scenarios
  - Test with Z-Wave JS UI unreachable
  - Verify user-friendly messages are spoken
  - Test recovery when Z-Wave JS UI comes back online
  - **Completed:** Added comprehensive tests for health check, error translation, and message quality

---

## Estimated Effort

- **Total tasks:** 6
- **Complexity:** Medium

## Notes

- Error messages must be designed for TTS (text-to-speech)
- Avoid technical jargon in user-facing messages
- Consider adding startup health check with warning if Z-Wave unavailable
- Cache health status to avoid repeated 5-second timeouts

## Example Error Messages

**Current (bad):**
- "MCP tool 'list_devices' on server 'zwave' returned an error: Failed to list devices: Timed out while fetching nodes from Z-Wave JS UI"

**Proposed (good):**
- "I'm sorry, but I can't reach the smart home system right now. The Z-Wave controller appears to be offline. Please check that it's powered on and connected to your network."
