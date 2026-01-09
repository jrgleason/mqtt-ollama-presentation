# Tasks: Fix Ollama Tool Format Conversion

## Implementation Tasks

- [x] Add static converter method `convertLangChainToQwenFormat()` to `OllamaClient.js`
  - Input: Array of LangChain tools `[{name, description, schema, invoke, lc_name}]`
  - Output: Array of Qwen tools `[{type: "function", function: {name, description, parameters}}]`
  - Handle both MCP tools (with `lc_name`) and custom tools (with `name`)
  - Map `schema` → `parameters` (keep JSON Schema structure)
  - Strip `invoke`, `lc_name`, `lc_kwargs` properties (not needed by Ollama)

- [x] Update `OllamaClient.query()` to use converter
  - Replace line 80: `chatOptions.tools = options.tools;`
  - With: `chatOptions.tools = OllamaClient.convertLangChainToQwenFormat(options.tools);`
  - Add debug logging showing converted tool count

- [x] Add unit tests for tool converter
  - Test: Convert LangChain tool with `name` property
  - Test: Convert LangChain tool with `lc_name` property
  - Test: Convert tool with complex schema (nested objects, arrays)
  - Test: Convert empty tools array returns empty array
  - Test: Convert undefined/null returns empty array
  - Test: Verify `invoke` function is stripped from output
  - Test: Verify `lc_name`, `lc_kwargs` are stripped from output

- [ ] Integration test with qwen3:0.6b
  - Start voice gateway with `AI_PROVIDER=ollama`, `OLLAMA_MODEL=qwen3:0.6b`
  - Trigger wake word: "Hey Jarvis"
  - Ask: "What devices are available?"
  - Verify: AI successfully calls `list_zwave_devices` tool
  - Verify: AI returns device list (not "I don't have access to list devices")
  - Verify: Logs show tool call with correct format

- [x] Update documentation
  - Add code comments explaining Qwen tool format requirements
  - Reference Qwen docs URL in converter method JSDoc
  - No user-facing docs needed (internal implementation detail)

## Validation Tasks

- [x] Run existing unit tests (ensure no regressions)
- [ ] Test with Anthropic provider (ensure unchanged behavior)
- [ ] Test with custom tools (datetime, search, volume)
- [ ] Test with MCP tools (list_zwave_devices, control_zwave_device, get_device_sensor_data)
- [ ] Verify tool execution logs show successful calls

## Definition of Done

- ✅ All tasks above completed
- ✅ All tests pass
- ✅ Integration test successful (qwen3:0.6b uses tools correctly)
- ✅ Code reviewed for clarity and correctness
- ✅ No breaking changes to other AI providers
- ✅ Commits follow conventional commit format
