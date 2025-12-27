# Design: fix-mcp-tool-parameter-schema

## Problem Statement

LangChain's MCP adapter normalizes MCP tool parameter names from camelCase (JavaScript convention) to snake_case (Python/OpenAPI convention). When Anthropic AI calls these tools, it uses the snake_case names, but the MCP server expects camelCase, causing validation failures.

## Architecture Decision: Where to Apply Normalization

### Options Considered

**Option A: In MCP Server** (`apps/zwave-mcp-server/src/index.js`)
- Accept both snake_case and camelCase parameter names
- Normalize on the server side

**Pros:**
- Fixes issue at the source (where validation occurs)
- MCP server becomes more flexible

**Cons:**
- Violates JavaScript naming conventions
- Affects all MCP server clients (not just voice gateway)
- Complicates MCP server code
- Doesn't solve the broader LangChain integration issue

---

**Option B: In AI Client** (`apps/voice-gateway-oww/src/ai/AnthropicClient.js`)
- Intercept tool calls before sending to AI model
- Rewrite parameter names in schema before calling `.bindTools()`

**Pros:**
- Fixes issue before it reaches AI
- Single point of control

**Cons:**
- Deeply couples AI client to MCP tool knowledge
- Breaks separation of concerns
- Would need duplication in OllamaClient
- Fragile (depends on Anthropic client internals)

---

**Option C: In ToolRegistry** (`apps/voice-gateway-oww/src/services/ToolRegistry.js`) **← CHOSEN**
- Normalize parameter names during tool registration
- Apply transformation in executor function before invoking LangChain tool

**Pros:**
- ✅ Single source of truth for tool definitions
- ✅ Transparent to AI clients (they don't need to know about MCP quirks)
- ✅ Transparent to MCP servers (receive correct parameter names)
- ✅ Easy to extend for new tools
- ✅ Centralized parameter mapping logic
- ✅ Minimal code changes (single file)

**Cons:**
- Requires maintaining static parameter mappings
- Adds minor overhead to tool execution (~1ms)

---

**Decision: Option C (ToolRegistry)**

**Rationale:**
- ToolRegistry is already responsible for tool registration and schema conversion
- Adding parameter normalization is a natural extension of its responsibilities
- Keeps concerns separated: AI clients handle AI, MCP servers handle Z-Wave, ToolRegistry handles integration

## Design Pattern: Adapter with Static Fallback

### Pattern Overview

Use a **two-tier mapping strategy**:
1. **Static mappings** for known MCP tools (explicit, fast, maintainable)
2. **Heuristic conversion** for unknown tools (snake_case → camelCase, automatic)

### Implementation

```javascript
// Tier 1: Static Mappings (Explicit)
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

// Tier 2: Heuristic Conversion (Automatic)
_snakeToCamel(snakeStr) {
    return snakeStr.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Integration
registerLangChainTool(langchainTool) {
    const toolName = langchainTool.lc_name || langchainTool.name;

    // Prefer static mapping, fallback to heuristic
    const paramMapping = MCP_PARAMETER_MAPPINGS[toolName] ||
                         this._extractMCPParameterMapping(langchainTool);

    this.#tools.set(toolName, {
        definition: this._convertLangChainSchema(langchainTool),
        executor: async (args) => {
            const normalizedArgs = this._normalizeParameters(args, paramMapping);
            return await langchainTool.invoke({ input: normalizedArgs });
        }
    });
}
```

### Why This Pattern?

**Static Mappings:**
- Explicit and self-documenting
- No guessing about parameter name transformations
- Easy to review and validate
- Fast lookup (O(1))

**Heuristic Fallback:**
- Handles future MCP tools automatically
- Reduces maintenance burden
- Logs when used (helps identify missing static mappings)

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User: "Turn on switch one"                                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Anthropic AI (via LangChain)                                │
│    Tool Call: control_zwave_device                             │
│    Args: {device_name: "Switch One", command: "on"}            │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. ToolExecutor.execute("control_zwave_device", {...})         │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. ToolRegistry Executor Function                              │
│    - Lookup: MCP_PARAMETER_MAPPINGS["control_zwave_device"]    │
│    - Normalize: {device_name → deviceName, command → action}   │
│    - Result: {deviceName: "Switch One", action: "on"}          │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. LangChain Tool Invoke                                       │
│    langchainTool.invoke({input: {deviceName: "...", action:}}) │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. MCP Server Tool Handler                                     │
│    const {deviceName, action, level} = args;  ✅ Match!        │
│    → MQTT publish to zwave/Demo/Switch_One/.../set             │
└─────────────────────────────────────────────────────────────────┘
```

## Edge Cases & Design Decisions

### Edge Case 1: Built-In (Non-MCP) Tools

**Problem:** Built-in tools (datetime, search, volume) don't need normalization.

**Solution:** Only apply normalization when `paramMapping` is defined.

```javascript
_normalizeParameters(args, paramMapping) {
    if (!paramMapping || Object.keys(paramMapping).length === 0) {
        return args;  // Pass through unchanged for non-MCP tools
    }
    // ... normalization logic
}
```

### Edge Case 2: Complex Parameter Names

**Problem:** Ambiguous conversions like `device_name_id`

**Options:**
- `deviceNameId` (capitalize each word)
- `deviceNameID` (treat ID as acronym)

**Solution:** Static mappings take precedence. If not mapped, use heuristic (`deviceNameId`).

### Edge Case 3: Nested Objects and Arrays

**Problem:** Current implementation only handles top-level properties.

**Example:**
```javascript
{
    device_name: "Switch One",
    options: {
        transition_duration: 5  // Nested snake_case
    }
}
```

**Solution (Current):** Only normalize top-level keys.

**Future Work:** If needed, extend to recursive normalization:
```javascript
_normalizeParameters(args, paramMapping, isRecursive = true) {
    // ... recursively normalize nested objects
}
```

**Decision:** Not needed now. MCP Z-Wave tools use flat parameter structures.

### Edge Case 4: Parameter Name Collisions

**Problem:** What if a tool legitimately has both `device_name` and `deviceName`?

**Solution:** Extremely unlikely for MCP tools. If it occurs:
1. Log warning: "Parameter name collision detected"
2. Prefer explicit static mapping
3. Don't apply heuristic if collision detected

## Performance Considerations

### Normalization Overhead

**Worst Case:** Tool with 10 parameters
- Lookup mapping: O(1) - Map access
- Normalize parameters: O(n) where n = number of parameters
- Typical: n = 2-3 parameters
- Time: ~1ms (negligible compared to 200-2000ms tool execution)

**Memory:**
- Static mappings: ~500 bytes (2 tools × 3 parameters × ~80 bytes/entry)
- Runtime: No additional allocation (object spread reuses references)

### Optimization: Lazy Normalization

**Current:** Always normalize parameters (check if mapping exists)

**Alternative:** Only normalize if parameter names contain underscores

```javascript
_normalizeParameters(args, paramMapping) {
    // Fast path: no underscores, no normalization needed
    if (!Object.keys(args).some(k => k.includes('_'))) {
        return args;
    }
    // ... normalization logic
}
```

**Decision:** Not needed. The `if (!paramMapping)` check is already fast enough.

## Testing Strategy

### Unit Tests

Test `_snakeToCamel` conversion:
- `device_name` → `deviceName` ✅
- `device_name_id` → `deviceNameId` ✅
- `level` → `level` ✅ (no underscores)
- `device__name` → `deviceName` ✅ (multiple underscores)

Test `_normalizeParameters` mapping:
- Static mapping: `{device_name: "..."} → {deviceName: "..."}` ✅
- Heuristic mapping: `{new_param: "..."} → {newParam: "..."}` ✅
- No mapping: `{level: 50} → {level: 50}` ✅ (pass through)

### Integration Tests

Test device control end-to-end:
- User command → Anthropic tool call → Parameter normalization → MCP server → MQTT publish

Test built-in tools:
- Verify datetime, search, volume tools still work (no normalization applied)

### Manual Testing

Use logs to verify parameter normalization:
```
🔧 Normalized parameters for control_zwave_device:
  original: {device_name: "Switch One", command: "on"}
  normalized: {deviceName: "Switch One", action: "on"}
```

## Maintenance Considerations

### Adding New MCP Tools

When adding a new MCP tool (e.g., `get_device_sensor_data`):

1. **Check if heuristic works:**
   - If parameter names are simple (e.g., `device_name`), heuristic handles it automatically

2. **Add static mapping if needed:**
   ```javascript
   const MCP_PARAMETER_MAPPINGS = {
       'get_device_sensor_data': {
           'device_name': 'deviceName'
       }
   };
   ```

3. **Test and verify:**
   - Check logs for parameter normalization
   - Verify MCP server receives correct parameter names

### Deprecation Path

If LangChain MCP adapter is fixed upstream to preserve camelCase:
1. Static mappings become no-ops (source and target names match)
2. Heuristic becomes no-op (no underscores to convert)
3. Code can be removed with zero impact

## Summary

**Design Pattern:** Adapter with static fallback
**Location:** ToolRegistry (single file)
**Strategy:** Static mappings (explicit) + Heuristic conversion (automatic)
**Performance:** Negligible (~1ms overhead)
**Maintenance:** Low (add mapping per tool)
**Risk:** Low (isolated change, easy to test)
