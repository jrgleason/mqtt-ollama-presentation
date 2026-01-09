# MCP Server Retry Logic Implementation

## Overview

This document describes the exponential backoff retry logic implemented for MCP (Model Context Protocol) server connections in the voice gateway application.

## Problem Statement

The MCP server connection was failing silently at startup with "Connection closed" errors. The voice gateway would fail to start if the MCP server was temporarily unavailable, even though the issue might resolve itself after a few seconds.

## Solution

Implemented exponential backoff retry logic with stderr capture to:
1. Handle transient connection failures gracefully
2. Provide detailed error information for debugging
3. Enable graceful degradation when MCP server is permanently unavailable

## Implementation Details

### Configuration

Added two new configuration options in `src/config.js`:

```javascript
mcp: {
    retryAttempts: process.env.MCP_RETRY_ATTEMPTS ? Number(process.env.MCP_RETRY_ATTEMPTS) : 3,
    retryBaseDelay: process.env.MCP_RETRY_BASE_DELAY ? Number(process.env.MCP_RETRY_BASE_DELAY) : 2000,
}
```

**Environment Variables:**
- `MCP_RETRY_ATTEMPTS`: Number of connection attempts before giving up (default: 3)
- `MCP_RETRY_BASE_DELAY`: Base delay in milliseconds for exponential backoff (default: 2000ms)

### Retry Strategy

**Exponential Backoff Timing:**
- Attempt 1: Immediate (0ms delay)
- Attempt 2: 2000ms delay (base delay)
- Attempt 3: 4000ms delay (2 × base delay)
- **Total max retry time: 6 seconds**

### Code Changes

#### 1. `src/services/MCPIntegration.js`

**New Functions:**

- `sleep(ms)`: Async sleep utility for retry delays
- `captureStderr(mcpClient, logger)`: Captures stderr output from MCP server subprocess for debugging

**Updated Functions:**

- `createMCPClient()`: Added `stderr: 'pipe'` to enable stderr capture
- `initializeMCPIntegration()`: Completely rewritten with retry logic

**Key Features:**

1. **Retry Loop:** Attempts connection up to `maxAttempts` times
2. **Error Capture:** Captures stderr from MCP server subprocess on failure
3. **Exponential Backoff:** Delays increase exponentially between retries
4. **Comprehensive Logging:**
   - Info: Each attempt, retry delays, success
   - Warn: Each failure with error details
   - Error: Final failure with all stderr output
5. **Graceful Degradation:** Throws error only after all retries exhausted

**Error Object Structure:**

```javascript
{
    message: 'MCP connection failed after 3 attempts: <original error>',
    cause: <original error object>,
    stderr: ['line1', 'line2', ...] // Captured stderr output
}
```

#### 2. `.env.example`

Added documentation for new configuration options:

```bash
# MCP Server Retry Configuration
MCP_RETRY_ATTEMPTS=3
MCP_RETRY_BASE_DELAY=2000
```

#### 3. `README.md`

Added comprehensive documentation:

- **Configuration section:** Explained retry settings and behavior
- **Troubleshooting section:** Added "MCP Server (Z-Wave) connection issues" with:
  - Common error messages
  - Symptoms of MCP connection failures
  - Common causes and fixes
  - Debugging steps
  - Expected behavior for different scenarios

### Testing

Created comprehensive test suite in `tests/mcp-retry.test.js`:

**Test Categories:**

1. **Successful Connection**
   - Succeeds on first attempt without retry

2. **Retry on Transient Failure**
   - Succeeds on second attempt after retry
   - Succeeds on third attempt with exponential backoff

3. **Permanent Failure**
   - Fails permanently after all retries exhausted
   - Includes stderr in final error

4. **Retry Timing**
   - Correct exponential backoff delays
   - Respects custom retry configuration

5. **Error Handling**
   - Handles stderr capture errors gracefully
   - Preserves original error cause

6. **Integration Scenarios**
   - Works with default config values
   - No retry on immediate success

**Test Coverage:**
- 13 test cases covering all scenarios
- Uses Jest fake timers for precise timing control
- Mocks LangChain MCP adapters and SDK

## Behavior

### Success Scenarios

**First Attempt Success:**
```
🚀 Initializing MCP integration... (attempt 1/3)
🔧 Configuring MCP client
✅ MCP client configured successfully
🔍 Discovering MCP tools...
✅ MCP integration initialized (toolCount: 2, attemptNumber: 1)
```

**Success After Retry:**
```
🚀 Initializing MCP integration... (attempt 1/3)
❌ MCP connection attempt 1/3 failed (error: "Connection refused")
⏳ Retrying MCP connection in 2000ms... (nextAttempt: 2)
🚀 Initializing MCP integration... (attempt 2/3)
✅ MCP integration initialized (toolCount: 2, attemptNumber: 2)
```

### Failure Scenario

**Permanent Failure:**
```
🚀 Initializing MCP integration... (attempt 1/3)
❌ MCP connection attempt 1/3 failed (error: "Connection refused")
⏳ Retrying MCP connection in 2000ms... (nextAttempt: 2)
🚀 Initializing MCP integration... (attempt 2/3)
❌ MCP connection attempt 2/3 failed (error: "Connection refused")
⏳ Retrying MCP connection in 4000ms... (nextAttempt: 3)
🚀 Initializing MCP integration... (attempt 3/3)
❌ MCP connection attempt 3/3 failed (error: "Connection refused")
❌ MCP integration permanently failed (attempts: 3, stderr: "MQTT broker unavailable")
```

The voice gateway continues with local tools only (datetime, search, volume control).

## Benefits

1. **Resilience:** Handles transient network/service failures automatically
2. **Debugging:** Captures stderr from MCP server for troubleshooting
3. **Graceful Degradation:** Continues operating with local tools if MCP unavailable
4. **Configurable:** Retry behavior can be tuned via environment variables
5. **Observable:** Clear logging at each step for monitoring and debugging
6. **Testable:** Comprehensive test suite ensures reliability

## Usage

### Default Configuration

No changes needed - retry logic works out of the box with sensible defaults.

### Custom Configuration

Adjust retry behavior in `.env`:

```bash
# Increase retry attempts for slow networks
MCP_RETRY_ATTEMPTS=5

# Increase base delay for very slow connections
MCP_RETRY_BASE_DELAY=3000
```

### Debugging MCP Issues

1. **Check logs for retry messages:**
   ```bash
   grep "MCP connection attempt" logs
   ```

2. **Look for stderr output:**
   ```bash
   grep "MCP stderr" logs
   ```

3. **Manually test MCP server:**
   ```bash
   cd ../zwave-mcp-server
   npm run dev
   ```

## Integration with Voice Gateway

The retry logic integrates seamlessly with the existing voice gateway startup process in `src/main.js`:

```javascript
try {
    const mcpIntegration = await initializeMCPIntegration(config, logger);
    mcpClient = mcpIntegration.mcpClient;
    const mcpTools = mcpIntegration.tools;

    // Register MCP tools
    for (const tool of mcpTools) {
        toolRegistry.registerLangChainTool(tool);
    }
} catch (error) {
    logger.error('❌ Failed to initialize MCP tools', {
        error: error.message,
        stack: error.stack
    });
    logger.warn('⚠️ Continuing with local tools only...');
}
```

The voice gateway:
- Attempts MCP connection with retries
- On success: Registers MCP tools (Z-Wave control)
- On failure: Continues with local tools only (graceful degradation)

## Performance Impact

- **Success on first attempt:** No performance impact (0ms delay)
- **Success on retry:** 2-6 seconds additional startup time (acceptable for reliability)
- **Permanent failure:** 6 seconds delay before continuing with local tools

## Future Enhancements

Potential improvements for future iterations:

1. **Adaptive Backoff:** Adjust delay based on error type
2. **Health Checks:** Periodic reconnection attempts during runtime
3. **Circuit Breaker:** Temporarily disable MCP after repeated failures
4. **Metrics:** Track retry success/failure rates for monitoring

## References

- MCP SDK Documentation: https://github.com/modelcontextprotocol/sdk
- LangChain MCP Adapters: https://github.com/langchain-ai/mcp-adapters
- Project Documentation: `apps/voice-gateway-oww/README.md`
- Test Suite: `tests/mcp-retry.test.js`
