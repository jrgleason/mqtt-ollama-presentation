# Implementation Summary: Simplify Tool Management

## Status: ✅ IMPLEMENTATION COMPLETE

All code changes have been implemented. Runtime testing required to verify behavior.

## Changes Completed

### Phase 1: Created ToolManager ✅
- **File**: `src/services/ToolManager.js` (new - 170 lines)
- **Changes**:
  - Simple array-based tool storage (no Map)
  - `addMCPTools(mcpTools)` - Adds LangChain tools without conversion
  - `addCustomTool(tool)` - Adds custom tools with LangChain interface
  - `getTools()` - Returns tools array for AI clients
  - `findTool(name)` - Finds tool by name (array search)
  - `normalizeParameters(toolName, args)` - Parameter normalization (may be removable after testing)
  - **Net: +170 lines**

### Phase 2: Updated ToolExecutor ✅
- **File**: `src/services/ToolExecutor.js` (modified)
- **Changes**:
  - Constructor now takes `toolManager` instead of `registry`
  - `execute()` finds tool with `toolManager.findTool()`
  - Calls `tool.invoke({ input: args })` directly (no executor wrapper)
  - Normalizes parameters using `toolManager.normalizeParameters()`
  - Updated `getStats()` to use toolManager
  - **Net: ~10 lines changed**

### Phase 3: Updated AIRouter ✅
- **File**: `src/ai/AIRouter.js` (modified)
- **Changes**:
  - Line 128: `toolExecutor?.registry?.getDefinitions()` → `toolExecutor?.toolManager?.getTools()`
  - Tools now passed as LangChain objects (not definitions)
  - **Net: 1 line changed**

### Phase 4: Updated main.js initialization ✅
- **File**: `src/main.js` (modified)
- **Changes**:
  - Import `ToolManager` instead of `ToolRegistry`
  - Initialize: `new ToolManager()` instead of `new ToolRegistry()`
  - MCP tools: `toolManager.addMCPTools(mcpTools)` (no loop, no conversion)
  - Custom tools: Wrapped with LangChain interface (`invoke` method)
  - ToolExecutor: `new ToolExecutor(toolManager, logger)`
  - Logging: Updated references from `toolRegistry` to `toolManager`
  - **Net: ~30 lines changed**

### Phase 5: Removed ToolRegistry ✅
- **File**: `src/services/ToolRegistry.js` (deleted - 260 lines)
- **Net: -260 lines**

### Phase 7: Removed Schema Conversion ✅
- **File**: `src/AnthropicClient.js` (modified)
- **Changes**:
  - Removed `convertToolToLangChainFormat()` static method (~15 lines)
  - Line 195: Removed `.map(AnthropicClient.convertToolToLangChainFormat)`
  - Tools passed directly to `client.bindTools(options.tools)`
  - **Net: -15 lines**
- **File**: `src/OllamaClient.js` (no changes needed)
  - Already passes tools directly (no schema conversion)

## Code Reduction Summary

| Component | Before | After | Reduction |
|-----------|--------|-------|-----------|
| ToolRegistry | 260 lines | 0 lines | -260 lines |
| ToolManager | 0 lines | 170 lines | +170 lines |
| Schema conversion | ~15 lines | 0 lines | -15 lines |
| **NET CHANGE** | **275 lines** | **170 lines** | **-105 lines** |

**Additional simplifications:**
- Removed Map storage (simpler array)
- Removed executor wrapping (direct invoke calls)
- Removed redundant schema conversion
- Fewer abstraction layers (6 → 4)

## Testing Required

**Phase 6: Integration Testing** (requires user runtime testing)

### Test 6.1: MCP Tool Execution (list_zwave_devices)
```bash
# Start voice gateway
cd apps/voice-gateway-oww
npm start

# Trigger wake word: "Hey Jarvis"
# Ask: "What devices are available?"

Expected:
- AI calls list_zwave_devices tool via MCP
- Device list returned correctly
- TTS speaks device names
```

### Test 6.2: MCP Tool Execution (control_zwave_device)
```bash
# Ask: "Turn on Switch One"

Expected:
- AI calls control_zwave_device tool
- MQTT command published
- Device state changes in Z-Wave JS UI
```

### Test 6.3: Custom Tool Execution (datetime)
```bash
# Ask: "What time is it?"

Expected:
- AI calls get_datetime tool (custom tool)
- Current time returned
- TTS speaks time
```

### Test 6.4: Custom Tool Execution (volume)
```bash
# Ask: "Set volume to 50"

Expected:
- AI calls control_volume tool
- Volume adjusted to 50%
```

### Test 6.5: Error Handling (unknown tool)
```bash
# Simulate error: Stop Z-Wave JS UI
# Ask: "What devices are available?"

Expected:
- MCP server returns error
- Friendly error message spoken
- System continues (no crash)
```

### Test 6.6: Startup Tool Discovery
```bash
# Start voice gateway
# Check logs for:

Expected logs:
- "🔍 Discovered MCP tools" with count and names
- "✅ Added MCP tool: list_zwave_devices"
- "✅ Added MCP tool: control_zwave_device"
- "✅ Added custom tool: get_datetime"
- "✅ Tool system initialized" with total count
```

## Success Criteria

- ✅ All code changes complete
- ✅ No import errors, no compilation errors
- ✅ Code reduction: -105 lines (38% reduction)
- ⏳ **Requires runtime testing:**
  - [ ] MCP tools work identically to before
  - [ ] Custom tools work identically to before
  - [ ] Error handling unchanged
  - [ ] Tool discovery logs correct
  - [ ] No regressions in voice interaction flow

## Next Steps

1. **User runtime testing**: Run Test 6.1-6.6 above
2. **Optional**: Test parameter normalization removal
   - If MCP tools work without normalization, remove `normalizeParameters()` from ToolManager
   - Check `MCP_PARAMETER_MAPPINGS` in ToolManager.js
3. **Archive proposal**: Once testing passes, archive with `openspec archive simplify-tool-management`

## Rollback Plan

If testing reveals issues:

```bash
# Revert all changes
git checkout apps/voice-gateway-oww/src/services/ToolRegistry.js
git checkout apps/voice-gateway-oww/src/services/ToolExecutor.js
git checkout apps/voice-gateway-oww/src/ai/AIRouter.js
git checkout apps/voice-gateway-oww/src/main.js
git checkout apps/voice-gateway-oww/src/AnthropicClient.js
rm apps/voice-gateway-oww/src/services/ToolManager.js
```

Or use OpenSpec to revert:
```bash
git revert HEAD
```

## Files Modified

1. ✅ `src/services/ToolManager.js` (NEW)
2. ✅ `src/services/ToolExecutor.js` (MODIFIED)
3. ✅ `src/ai/AIRouter.js` (MODIFIED)
4. ✅ `src/main.js` (MODIFIED)
5. ✅ `src/AnthropicClient.js` (MODIFIED)
6. ✅ `src/services/ToolRegistry.js` (DELETED)
