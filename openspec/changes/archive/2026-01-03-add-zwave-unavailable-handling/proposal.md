# Change: Add Graceful Z-Wave Unavailability Handling

## Why

When the Z-Wave JS UI server (running on Raspberry Pi) is unavailable, the voice gateway gives confusing, unhelpful responses to the user. Currently:

1. Tool call times out after ~5 seconds
2. Error is logged but AI receives generic failure message
3. AI responds with confusing text like "Let me try the alternative method:"
4. User has no idea the Z-Wave system is down

**User Experience Problem:** The response should clearly tell the user "The Z-Wave system is currently unavailable" rather than giving a confusing partial response.

## What Changes

- Add Z-Wave connectivity health check at startup and on-demand
- Improve tool error messages to be user-friendly for voice responses
- Provide clear, speakable error messages when Z-Wave is unavailable
- Optionally cache Z-Wave availability status to avoid repeated timeouts

## Impact

- Affected specs: `zwave-integration`
- Affected code:
  - `apps/zwave-mcp-server/src/index.js` - Better error messages
  - `apps/zwave-mcp-server/src/zwave-client.js` - Health check method
  - `apps/voice-gateway-oww/src/services/ToolExecutor.js` - User-friendly error translation
  - `apps/voice-gateway-oww/src/ai/AIRouter.js` - Error handling for tool failures
