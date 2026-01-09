# Change: Create Centralized Tool Executor

## Why

Tool execution logic is currently duplicated across 3 files (BackgroundTranscriber.js, AnthropicClient.js, OllamaClient.js), with each implementing their own tool registration, execution, logging, and error handling. This violates the DRY (Don't Repeat Yourself) principle and makes it difficult to add new tools or modify existing tool behavior consistently.

## What Changes

- Create a centralized `ToolExecutor` class to handle all tool execution logic
- Create a `ToolRegistry` module for tool registration and discovery
- Update BackgroundTranscriber.js to use the centralized ToolExecutor
- Update AnthropicClient.js to use the centralized ToolExecutor
- Update OllamaClient.js to use the centralized ToolExecutor
- Add comprehensive logging and error handling in one place
- Provide a single registration point for all tools

## Impact

### Affected Specs
- `tool-execution` (NEW) - Centralized tool execution specification

### Affected Code
- `apps/voice-gateway-oww/src/util/BackgroundTranscriber.js` - Remove duplicate tool execution logic
- `apps/voice-gateway-oww/src/anthropic-client.js` - Simplify tool handling
- `apps/voice-gateway-oww/src/ollama-client.js` - Simplify tool handling
- `apps/voice-gateway-oww/src/services/ToolExecutor.js` (NEW) - Centralized execution
- `apps/voice-gateway-oww/src/services/ToolRegistry.js` (NEW) - Tool management

### Benefits
- **DRY Principle:** Eliminates code duplication across 3 files
- **Single Point of Change:** Add/modify tools in one place
- **Consistent Logging:** All tool executions logged the same way
- **Consistent Error Handling:** Unified error messages and recovery
- **Easier Testing:** Test tool execution logic once
- **Better Maintainability:** Clear separation of concerns

### Migration Path
1. Create ToolExecutor and ToolRegistry classes
2. Update BackgroundTranscriber to use ToolExecutor
3. Update AI clients (Anthropic, Ollama) to use ToolExecutor
4. Verify all existing functionality works
5. Remove old toolExecutor methods from individual classes

### Breaking Changes
None - This is an internal refactoring with no API changes
