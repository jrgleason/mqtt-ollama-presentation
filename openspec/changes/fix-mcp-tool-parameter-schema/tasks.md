# Tasks: fix-mcp-tool-parameter-schema

## 1. Add Helper Functions (3 tasks)

- [x] 1.1 Add `_snakeToCamel(snakeStr)` method to convert snake_case to camelCase
- [x] 1.2 Add `_normalizeParameters(args, paramMapping)` method to apply parameter name mapping
- [x] 1.3 Add unit tests for snake_case → camelCase conversion edge cases

## 2. Add Parameter Mapping Extraction (4 tasks)

- [x] 2.1 Define static `MCP_PARAMETER_MAPPINGS` constant for known MCP tools
- [x] 2.2 Add `control_zwave_device` mapping: `device_name → deviceName`, `command → action`, `brightness → level`
- [x] 2.3 Add `_extractMCPParameterMapping(langchainTool)` method to extract from schema metadata
- [x] 2.4 Implement heuristic fallback using `_snakeToCamel` when no static mapping exists

## 3. Integrate Parameter Normalization (5 tasks)

- [x] 3.1 Modify `registerLangChainTool()` to extract parameter mapping during registration
- [x] 3.2 Store `paramMapping` in tool metadata for debugging
- [x] 3.3 Update executor function to call `_normalizeParameters()` before invoking tool
- [x] 3.4 Add debug logging when parameter normalization occurs
- [x] 3.5 Ensure built-in tools (non-MCP) are not affected by normalization

## 4. Testing & Validation (6 tasks)

- [x] 4.1 Test device control: "Turn on switch one" → Tool called with `{deviceName: "Switch One", action: "on"}`
- [x] 4.2 Test parameter logging: Verify debug logs show `{device_name: "..."} → {deviceName: "..."}`
- [x] 4.3 Test built-in tools: Verify datetime, search, volume tools still work (no normalization applied)
- [x] 4.4 Test invalid parameters: Verify MCP server error handling still works correctly
- [x] 4.5 Test edge case: Parameter with multiple underscores (e.g., `device_name_id → deviceNameId`)
- [x] 4.6 Test edge case: Parameter with no underscores (e.g., `level → level`, passed through unchanged)

## 5. Future-Proofing (2 tasks)

- [x] 5.1 Add `get_device_sensor_data` mapping to `MCP_PARAMETER_MAPPINGS` (for future `add-mqtt-sensor-data-fallback`)
- [x] 5.2 Document parameter mapping pattern in code comments for future MCP tool additions

---

**Total: 20 tasks**

**Estimated Duration:** 1-2 hours

**Critical Path:**
1. Add helper functions (Task 1)
2. Define static mappings (Task 2.1-2.2)
3. Integrate normalization (Task 3.1-3.3)
4. Test device control (Task 4.1)

**Parallelizable Work:**
- Task 1 (helpers) can be done independently
- Task 2.3-2.4 (schema extraction) can be done after helpers
- Task 4 (testing) can be done in parallel after integration

**Dependencies:**
- Task 3 depends on Task 1 (helpers) and Task 2 (mappings)
- Task 4 depends on Task 3 (integration complete)
- Task 5 can be done anytime after Task 2
