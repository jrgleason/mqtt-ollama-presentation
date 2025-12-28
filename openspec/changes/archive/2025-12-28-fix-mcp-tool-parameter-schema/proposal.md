# Proposal: fix-mcp-tool-parameter-schema

## Priority
**CRITICAL (Highest)** - Completely blocks all device control functionality. Must fix before any other work.

## Why

**Problem:** Device control is failing with schema mismatch errors when AI calls Z-Wave MCP tools.

### Evidence from Logs

```
Logger.js:40🔍 [debug] 🔧 Executing tool: control_zwave_device
Object {device_name: "Switch One", command: "on"}

Logger.js:40❌ [error] ❌ Tool execution failed: control_zwave_device
Object {tool: "control_zwave_device", duration: "1ms", error: "Received tool input did not match expected schema"}
```

**What's happening:**
1. User says: "Turn on switch one"
2. Anthropic AI returns tool call with parameters: `{device_name: "Switch One", command: "on"}`
3. MCP server expects parameters: `{deviceName: "Switch One", action: "on"}`
4. Parameter name mismatch causes validation error

### Root Cause

The parameter name transformation occurs in the **LangChain MCP adapter** (`@langchain/mcp-adapters`):

1. **MCP Server Definition** (`apps/zwave-mcp-server/src/index.js:192-216`):
   ```javascript
   {
       name: 'control_zwave_device',
       inputSchema: {
           properties: {
               deviceName: { type: 'string', ... },  // ← camelCase
               action: { enum: ['on', 'off', 'dim'], ... },
               level: { type: 'number', ... }
           },
           required: ['deviceName', 'action']
       }
   }
   ```

2. **LangChain MCP Adapter Conversion** (external library):
   - Converts MCP tool schema to LangChain format
   - **Applies snake_case normalization** for OpenAPI/JSON Schema compatibility
   - Returns tools with `device_name`, `command` instead of `deviceName`, `action`

3. **Anthropic API Returns Normalized Names**:
   - AI receives schema with snake_case parameter names
   - Returns tool calls using those names: `{device_name: "...", command: "..."}`

4. **MCP Server Rejects Call** (`apps/zwave-mcp-server/src/index.js:339`):
   ```javascript
   const {deviceName, action, level} = args;  // ← Expects camelCase
   if (!deviceName || !action) {              // ← Validation fails
       return { error: 'deviceName and action are required' };
   }
   ```

### Impact

- **Device control is completely broken** - User cannot turn devices on/off
- **Sensor queries will fail too** (when `add-mqtt-sensor-data-fallback` is implemented)
- **All MCP tools are affected** - Not just Z-Wave control

### Why This Matters

This is a **schema impedance mismatch** between:
- **MCP Server** (camelCase, JavaScript convention)
- **LangChain MCP Adapter** (snake_case, Python/OpenAPI convention)
- **Anthropic API** (uses whatever schema it receives)

We cannot fix this upstream:
- Can't change `@langchain/mcp-adapters` (external library)
- Shouldn't change MCP server to snake_case (violates JavaScript conventions)
- Can't control Anthropic's parameter name handling

## What Changes

### 1. Add Parameter Name Normalization in ToolRegistry

**File:** `apps/voice-gateway-oww/src/services/ToolRegistry.js`

Add parameter mapping logic when registering LangChain MCP tools:

```javascript
registerLangChainTool(langchainTool) {
    const toolName = langchainTool.lc_name || langchainTool.name;

    // Store parameter name mapping for MCP tools
    const paramMapping = this._extractMCPParameterMapping(langchainTool);

    this.#tools.set(toolName, {
        definition: this._convertLangChainSchema(langchainTool),
        executor: async (args) => {
            // Normalize parameter names BEFORE invoking LangChain tool
            const normalizedArgs = this._normalizeParameters(args, paramMapping);
            const result = await langchainTool.invoke({ input: normalizedArgs });
            return result;
        },
        paramMapping  // Store for debugging
    });
}

_extractMCPParameterMapping(langchainTool) {
    // Extract original MCP parameter names from tool metadata
    // Map: snake_case (from Anthropic) → camelCase (for MCP server)
    const schema = langchainTool.schema?.input_schema || {};
    const properties = schema.properties || {};

    // Build bidirectional mapping
    const mapping = {};
    for (const [key, value] of Object.entries(properties)) {
        // If key is snake_case and has originalName in metadata
        if (value.originalName) {
            mapping[key] = value.originalName;
        } else {
            // Heuristic: convert snake_case → camelCase
            mapping[key] = this._snakeToCamel(key);
        }
    }
    return mapping;
}

_normalizeParameters(args, paramMapping) {
    if (!paramMapping || Object.keys(paramMapping).length === 0) {
        return args;  // No mapping needed
    }

    const normalized = {};
    for (const [key, value] of Object.entries(args)) {
        const mappedKey = paramMapping[key] || key;
        normalized[mappedKey] = value;
    }
    return normalized;
}

_snakeToCamel(snakeStr) {
    return snakeStr.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}
```

### 2. Add Static Parameter Mapping for Known Tools (Fallback)

**File:** `apps/voice-gateway-oww/src/services/ToolRegistry.js`

Add explicit mappings for Z-Wave MCP tools as fallback:

```javascript
// Static parameter mappings for known MCP tools
const MCP_PARAMETER_MAPPINGS = {
    'control_zwave_device': {
        'device_name': 'deviceName',
        'command': 'action',
        'brightness': 'level'
    },
    'get_device_sensor_data': {
        'device_name': 'deviceName'
    }
};

registerLangChainTool(langchainTool) {
    const toolName = langchainTool.lc_name || langchainTool.name;

    // Use static mapping if available, otherwise extract from schema
    const paramMapping = MCP_PARAMETER_MAPPINGS[toolName] ||
                         this._extractMCPParameterMapping(langchainTool);

    // ... rest of implementation
}
```

### 3. Add Validation and Logging

**File:** `apps/voice-gateway-oww/src/services/ToolRegistry.js`

Log parameter normalization for debugging:

```javascript
executor: async (args) => {
    const normalizedArgs = this._normalizeParameters(args, paramMapping);

    // Log if normalization occurred
    if (JSON.stringify(args) !== JSON.stringify(normalizedArgs)) {
        console.log(`🔧 Normalized parameters for ${toolName}:`, {
            original: args,
            normalized: normalizedArgs
        });
    }

    const result = await langchainTool.invoke({ input: normalizedArgs });
    return result;
}
```

## Impact

### Files Modified

- `apps/voice-gateway-oww/src/services/ToolRegistry.js` - Add parameter normalization logic

### Breaking Changes

None. This is transparent to:
- MCP servers (receive correct parameter names)
- AI providers (continue sending snake_case)
- Built-in tools (not MCP tools, no mapping applied)

### Performance Impact

- **Negligible** - Simple object key mapping (O(n) where n = number of parameters, typically 2-3)
- Adds ~1ms to tool execution (already taking 200-2000ms)

### User-Visible Changes

- ✅ Device control works: "Turn on switch one" successfully controls the device
- ✅ Sensor queries work: "What's the temperature?" returns sensor value
- ✅ Error messages improved: Logs show parameter normalization when it occurs

## Dependencies

- **Depends on:** Existing `ToolRegistry` and MCP integration
- **No new dependencies:** Uses JavaScript built-ins only
- **Compatible with:** `add-mqtt-sensor-data-fallback` proposal (sensor tools use same pattern)

## Risks

### Low Risk

1. **Static mapping maintenance** - Need to update `MCP_PARAMETER_MAPPINGS` when adding new MCP tools
   - **Mitigation:** Heuristic snake_case → camelCase conversion as fallback
   - **Mitigation:** Log warnings when heuristic is used

2. **Ambiguous parameter names** - e.g., `device_name_id` → `deviceNameId` or `deviceNameID`?
   - **Mitigation:** Static mappings take precedence over heuristics
   - **Mitigation:** MCP server parameter names are simple (unlikely to have ambiguity)

3. **Parameter values accidentally normalized** - e.g., value `"device_name"` mistaken for parameter name
   - **Impact:** None - we only normalize **keys**, not **values**

### Edge Cases to Consider

1. **Non-MCP LangChain tools** - e.g., built-in datetime, search, volume tools
   - **Handling:** No paramMapping defined, args passed through unchanged

2. **Future MCP tools with complex schemas** - nested objects, arrays
   - **Handling:** Current implementation only handles top-level properties
   - **Future work:** Extend to recursive normalization if needed

3. **Multiple parameter name conventions** - e.g., some tools use PascalCase
   - **Handling:** Static mappings override heuristics

## Alternatives Considered

### Alternative 1: Modify MCP Server to Accept Snake_Case
**Rejected:** Violates JavaScript naming conventions, affects all MCP server clients

### Alternative 2: Fork and Patch LangChain MCP Adapter
**Rejected:** Maintenance burden, breaks on upstream updates

### Alternative 3: Intercept Anthropic API Calls and Rewrite Parameter Names
**Rejected:** Too fragile, requires deep integration with Anthropic client internals

### Alternative 4: Use Custom MCP Client (Not LangChain)
**Rejected:** Already implemented LangChain integration, working except for this issue

### Selected Solution: Parameter Normalization Layer
**Chosen because:**
- ✅ Minimal code changes (single file)
- ✅ No dependencies on external library changes
- ✅ Transparent to MCP servers and AI providers
- ✅ Easy to extend for new tools
- ✅ Preserves existing architecture

## Related Work

- **Depends on:** `use-langchain-mcp-auto-discovery` (implemented, this is a bug fix for it)
- **Blocks:** `add-mqtt-sensor-data-fallback` (sensor tool will have same issue)
- **Related:** `improve-boot-and-communication-reliability` (MCP retry logic, different concern)

## Success Criteria

1. ✅ Device control works: User says "Turn on switch one" → Device turns on
2. ✅ Logs show parameter normalization: `{device_name: "..."} → {deviceName: "..."}`
3. ✅ No regressions: Built-in tools (datetime, search, volume) continue working
4. ✅ MCP server receives correct parameter names in camelCase
5. ✅ Error handling: Invalid parameters still rejected with clear error messages
