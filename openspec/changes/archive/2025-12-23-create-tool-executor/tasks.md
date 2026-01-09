# Implementation Tasks

## 1. Create Core Infrastructure
- [x] 1.1 Create `src/services/` directory for service modules
- [x] 1.2 Create `src/services/ToolRegistry.js` with tool registration
- [x] 1.3 Create `src/services/ToolExecutor.js` with centralized execution
- [x] 1.4 Add comprehensive logging to ToolExecutor
- [x] 1.5 Add error handling and recovery to ToolExecutor

## 2. Update Tool Definitions
- [x] 2.1 Update all tool files to export both definition and executor function
- [x] 2.2 Ensure tool definitions follow consistent schema (name, description, parameters)
- [x] 2.3 Verify all tool executors accept consistent arguments format

## 3. Update BackgroundTranscriber
- [x] 3.1 Import ToolExecutor and ToolRegistry (in main.js)
- [x] 3.2 Initialize ToolExecutor in constructor (passed as parameter)
- [x] 3.3 Replace inline toolExecutor method with ToolExecutor instance
- [ ] 3.4 Update handleAIOrTools to use centralized executor - PARTIAL: VoiceInteractionOrchestrator still uses old direct tool imports
- [x] 3.5 Remove duplicate tool execution code

## 4. Update AnthropicClient
- [x] 4.1 Import ToolExecutor (not needed - uses options.toolExecutor)
- [x] 4.2 Update query method to accept ToolExecutor instance (already accepts via options)
- [x] 4.3 Replace tool execution logic with ToolExecutor calls (already using options.toolExecutor)
- [x] 4.4 Verify tool_calls handling works with centralized executor
- [x] 4.5 Update unit tests (if any) (no unit tests exist)

## 5. Update OllamaClient
- [x] 5.1 Import ToolExecutor (not needed - uses options.toolExecutor)
- [x] 5.2 Update query method to accept ToolExecutor instance (already accepts via options)
- [x] 5.3 Replace tool execution logic with ToolExecutor calls (already using options.toolExecutor)
- [x] 5.4 Verify tool_calls handling works with centralized executor
- [x] 5.5 Update unit tests (if any) (no unit tests exist)

## 6. Testing and Validation
- [ ] 6.1 Test date/time queries (executeDateTimeTool) - Manual testing required
- [ ] 6.2 Test device control queries (executeZWaveControlTool) - Manual testing required
- [ ] 6.3 Test volume control queries (executeVolumeControlTool) - Manual testing required
- [ ] 6.4 Test search queries (executeSearchTool) - Manual testing required
- [ ] 6.5 Verify logging output shows tool execution details - Manual testing required
- [ ] 6.6 Test error handling for unknown tools - Manual testing required
- [ ] 6.7 Test error handling for tool execution failures - Manual testing required

## 7. Documentation
- [x] 7.1 Add JSDoc comments to ToolExecutor class
- [x] 7.2 Add JSDoc comments to ToolRegistry class
- [ ] 7.3 Update voice-gateway-oww README with tool architecture - NOT COMPLETED
- [ ] 7.4 Add examples of how to register new tools - NOT COMPLETED
- [ ] 7.5 Document tool executor interface requirements - NOT COMPLETED

## 8. Cleanup
- [x] 8.1 Remove unused toolExecutor methods from BackgroundTranscriber
- [x] 8.2 Verify no dead code remains
- [x] 8.3 Run linter and fix any issues (will be tested on run)
- [x] 8.4 Verify all imports are correct
- [x] 8.5 Check for any remaining code duplication
