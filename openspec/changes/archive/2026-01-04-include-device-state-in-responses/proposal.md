# Proposal: Include Device State in List Devices Response

## Summary

Modify the Z-Wave MCP server's `list_devices` tool to include actual device state (on/off, current value) in responses, not just activity status.

## Problem Statement

When users ask "What devices are available?", the AI lists devices but doesn't mention their state:

**Current response:**
```
AI: "The available devices are Node 1, Switch One, and Temp Sensor 1."
```

**Expected response:**
```
AI: "The available devices are: Node 1 (on), Switch One (off), and Temp Sensor 1 (61.8°F)."
```

The AI should mention if devices are on/off, not just list their names. Anthropic models sometimes extract this from context, but smaller Ollama models don't.

## Analysis

### Root Cause

The `list_devices` MCP tool response format is:
```
- "Node 1" (switch) in Living Room - active, last seen: 2 minutes ago
```

This includes:
- Device name
- Device type
- Location
- Activity status (active/inactive)
- Last seen timestamp

It does NOT include:
- Current state (on/off)
- Current value (for sensors)

### Existing Code

The MCP server already has `extractPrimaryValue()` that can get device state:
```javascript
function extractPrimaryValue(values) {
    const priority = candidates.find((value) =>
        ['currentValue', 'state', 'value'].includes(String(value.property))
    );
    return `${label}: ${renderedValue}`;
}
```

But `list_devices` handler doesn't use it - it only uses `registryBuilder.getDevices()`.

## Proposed Solution

### 1. Include Primary Value in list_devices Response

Modify the `list_devices` handler to include `primaryValueSummary`:

**Before:**
```
- "Switch One" (switch) in Living Room - active, last seen: 2 minutes ago
```

**After:**
```
- "Switch One" (switch) in Living Room - ON, last seen: 2 minutes ago
```

### 2. Format State for AI Readability

Simplify state display for AI consumption:
- `true` → "ON"
- `false` → "OFF"
- `61.8` with unit `°F` → "61.8°F"
- `undefined` → "unknown"

### 3. Update Tool Description

Make it clear the tool returns device state:
```
'Get a paginated list of Z-Wave devices with their current state (on/off, sensor values) and status information.'
```

## Success Criteria

- [ ] `list_devices` response includes device state (on/off/value)
- [ ] AI mentions device state when listing devices
- [ ] Works with both Ollama and Anthropic models
- [ ] Sensor values include units when available

## Risks

**Low risk** - Additive change to response format. Doesn't break existing behavior.

## Files to Modify

- `apps/zwave-mcp-server/src/index.js` - list_devices handler
- `apps/zwave-mcp-server/src/device-registry.js` - getDevices method (if needed)
