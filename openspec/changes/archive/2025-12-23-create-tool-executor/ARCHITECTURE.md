# Tool Executor Architecture

This document provides a visual overview of the proposed tool execution architecture.

## Current Architecture (Duplicated Logic)

```
┌─────────────────────────────────────────────────────────────────┐
│                     BackgroundTranscriber                       │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ toolExecutor(toolName, args) {                            │ │
│  │   switch (toolName) {                                     │ │
│  │     case 'get_current_datetime':                          │ │
│  │       return executeDateTimeTool(args);                   │ │
│  │     case 'search_web':                                    │ │
│  │       return executeSearchTool(args);                     │ │
│  │     case 'control_zwave_device':                          │ │
│  │       return executeZWaveControlTool(args);               │ │
│  │     case 'control_speaker_volume':                        │ │
│  │       return executeVolumeControlTool(args);              │ │
│  │     default:                                              │ │
│  │       logger.warn(`Unknown tool: ${toolName}`);           │ │
│  │       return `Error: Unknown tool ${toolName}`;           │ │
│  │   }                                                        │ │
│  │ }                                                          │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      AnthropicClient                            │
│                                                                 │
│  // Tool execution logic duplicated in query() method          │
│  for (const toolCall of response.tool_calls) {                 │
│    const toolName = toolCall.name;                             │
│    const toolArgs = toolCall.args;                             │
│    const toolResult = await options.toolExecutor(              │
│      toolName, toolArgs                                        │
│    );                                                           │
│    toolMessages.push(...);                                     │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        OllamaClient                             │
│                                                                 │
│  // Tool execution logic duplicated in query() method          │
│  for (const toolCall of response.message.tool_calls) {         │
│    const toolName = toolCall.function.name;                    │
│    const toolArgs = toolCall.function.arguments;               │
│    const toolResult = await options.toolExecutor(              │
│      toolName, toolArgs                                        │
│    );                                                           │
│    toolResults.push(...);                                      │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
```

**Problems:**
- 🔴 Duplicate switch/case logic in BackgroundTranscriber
- 🔴 Each AI client implements tool calling differently
- 🔴 Adding a new tool requires changes in 3 places
- 🔴 Inconsistent logging and error handling
- 🔴 Harder to test tool execution logic

## Proposed Architecture (Centralized)

```
┌─────────────────────────────────────────────────────────────────┐
│                        ToolRegistry                             │
│                                                                 │
│  #tools = Map {                                                 │
│    'get_current_datetime' => {                                  │
│      definition: dateTimeTool,                                  │
│      executor: executeDateTimeTool                              │
│    },                                                            │
│    'search_web' => {                                            │
│      definition: searchTool,                                    │
│      executor: executeSearchTool                                │
│    },                                                            │
│    'control_zwave_device' => {                                  │
│      definition: zwaveControlTool,                              │
│      executor: executeZWaveControlTool                          │
│    },                                                            │
│    'control_speaker_volume' => {                                │
│      definition: volumeControlTool,                             │
│      executor: executeVolumeControlTool                         │
│    }                                                             │
│  }                                                               │
│                                                                 │
│  + registerTool(definition, executor)                           │
│  + getExecutor(name)                                            │
│  + getDefinitions()                                             │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ Uses
                              │
┌─────────────────────────────┴───────────────────────────────────┐
│                        ToolExecutor                             │
│                                                                 │
│  async execute(toolName, args) {                                │
│    const startTime = Date.now();                               │
│                                                                 │
│    try {                                                        │
│      // Get executor from registry                             │
│      const executor = this.registry.getExecutor(toolName);     │
│                                                                 │
│      if (!executor) {                                          │
│        logger.warn(`Unknown tool: ${toolName}`);               │
│        return `Error: Unknown tool ${toolName}`;               │
│      }                                                          │
│                                                                 │
│      // Execute with timeout                                   │
│      const result = await this.executeWithTimeout(             │
│        executor, args                                          │
│      );                                                         │
│                                                                 │
│      // Log execution                                          │
│      const duration = Date.now() - startTime;                  │
│      logger.info(`Tool executed`, {                            │
│        toolName, duration, args                                │
│      });                                                        │
│                                                                 │
│      // Warn on slow tools                                     │
│      if (duration > 1000) {                                    │
│        logger.warn(`Slow tool`, { toolName, duration });       │
│      }                                                          │
│                                                                 │
│      return result;                                            │
│    } catch (error) {                                           │
│      logger.error(`Tool failed`, {                             │
│        toolName, error: error.message                          │
│      });                                                        │
│      return `Error: ${error.message}`;                         │
│    }                                                            │
│  }                                                              │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ Uses
                              │
        ┌─────────────────────┴─────────────────────┐
        │                     │                     │
        │                     │                     │
┌───────┴────────┐   ┌───────┴────────┐   ┌───────┴────────┐
│ Background     │   │  Anthropic     │   │    Ollama      │
│ Transcriber    │   │    Client      │   │    Client      │
│                │   │                │   │                │
│ Uses           │   │ Uses           │   │ Uses           │
│ toolExecutor   │   │ toolExecutor   │   │ toolExecutor   │
│ .execute()     │   │ .execute()     │   │ .execute()     │
└────────────────┘   └────────────────┘   └────────────────┘
```

**Benefits:**
- ✅ Single source of truth for tool execution
- ✅ Consistent logging across all AI clients
- ✅ Consistent error handling
- ✅ Add new tools in one place (ToolRegistry)
- ✅ Easy to test (mock ToolRegistry)
- ✅ Performance monitoring (timeout, slow tool warnings)

## Initialization Flow

```
main.js startup
    │
    ├─> Import all tool definitions
    │     - dateTimeTool, executeDateTimeTool
    │     - searchTool, executeSearchTool
    │     - zwaveControlTool, executeZWaveControlTool
    │     - volumeControlTool, executeVolumeControlTool
    │
    ├─> Create ToolRegistry
    │     registry = new ToolRegistry()
    │
    ├─> Register all tools
    │     registry.registerTool(dateTimeTool, executeDateTimeTool)
    │     registry.registerTool(searchTool, executeSearchTool)
    │     registry.registerTool(zwaveControlTool, executeZWaveControlTool)
    │     registry.registerTool(volumeControlTool, executeVolumeControlTool)
    │
    ├─> Create ToolExecutor
    │     toolExecutor = new ToolExecutor(registry, logger)
    │
    ├─> Pass to BackgroundTranscriber
    │     transcriber = new BackgroundTranscriber(config, logger, toolExecutor)
    │
    └─> Ready to process voice commands
```

## Tool Execution Flow

```
User says: "What time is it?"
    │
    ├─> Wake word detected
    │
    ├─> Speech transcribed: "What time is it?"
    │
    ├─> AI Model (Anthropic/Ollama) requests tool call
    │     tool_name: "get_current_datetime"
    │     tool_args: {}
    │
    ├─> AnthropicClient.query() calls toolExecutor.execute()
    │
    ├─> ToolExecutor.execute("get_current_datetime", {})
    │     │
    │     ├─> Get executor from registry
    │     │     executor = registry.getExecutor("get_current_datetime")
    │     │     // Returns executeDateTimeTool function
    │     │
    │     ├─> Execute with timeout (30s max)
    │     │     result = await executor({})
    │     │     // Returns "Current time is 2:30 PM PST"
    │     │
    │     ├─> Log execution details
    │     │     logger.info("Tool executed", {
    │     │       toolName: "get_current_datetime",
    │     │       duration: 5ms,
    │     │       args: {}
    │     │     })
    │     │
    │     └─> Return result to AI client
    │           "Current time is 2:30 PM PST"
    │
    ├─> AI generates natural language response
    │     "It is currently 2:30 PM Pacific Standard Time."
    │
    └─> TTS speaks response to user
```

## Code Comparison: Before vs After

### Before (BackgroundTranscriber.js - 15 lines per tool)

```javascript
async toolExecutor(toolName, toolArgs) {
    switch (toolName) {
        case 'get_current_datetime':
            return executeDateTimeTool(toolArgs);
        case 'search_web':
            return await executeSearchTool(toolArgs);
        case 'control_zwave_device':
            return await executeZWaveControlTool(toolArgs);
        case 'control_speaker_volume':
            return executeVolumeControlTool(toolArgs);
        default:
            this.logger.warn(`Unknown tool: ${toolName}`);
            return `Error: Unknown tool ${toolName}`;
    }
}
```

### After (BackgroundTranscriber.js - 0 lines, uses ToolExecutor)

```javascript
// In constructor
constructor(config, logger, toolExecutor) {
    this.config = config;
    this.logger = logger;
    this.toolExecutor = toolExecutor;
}

// In handleAIOrTools
const aiResponse = await this.anthropicClient.query(null, {
    messages,
    tools: toolRegistry.getDefinitions(),
    toolExecutor: this.toolExecutor.execute.bind(this.toolExecutor)
});
```

**Result:** 15 lines removed, no switch statement to maintain!

## Migration Path

### Step 1: Create Infrastructure
```bash
# Create new service files
src/services/ToolRegistry.js
src/services/ToolExecutor.js
```

### Step 2: Initialize in main.js
```javascript
import { ToolRegistry } from './services/ToolRegistry.js';
import { ToolExecutor } from './services/ToolExecutor.js';

const registry = new ToolRegistry();
registry.registerTool(dateTimeTool, executeDateTimeTool);
// ... register other tools

const toolExecutor = new ToolExecutor(registry, logger);
```

### Step 3: Update BackgroundTranscriber
```javascript
// Pass toolExecutor to constructor
const transcriber = new BackgroundTranscriber(
    config, 
    logger, 
    toolExecutor
);

// Remove old toolExecutor method
// Use this.toolExecutor.execute() instead
```

### Step 4: Update AI Clients
```javascript
// AnthropicClient.query()
await options.toolExecutor(toolName, toolArgs);

// OllamaClient.query()
await options.toolExecutor(toolName, toolArgs);
```

### Step 5: Verify & Test
- Test all 4 tools with voice commands
- Verify logging shows tool execution details
- Check error handling works correctly
- Confirm no performance regression

## File Structure

```
apps/voice-gateway-oww/
├── src/
│   ├── services/                    # NEW: Service layer
│   │   ├── ToolRegistry.js          # NEW: Tool registration
│   │   └── ToolExecutor.js          # NEW: Centralized execution
│   ├── tools/                       # Existing: Tool implementations
│   │   ├── datetime-tool.js         # No changes needed
│   │   ├── search-tool.js           # No changes needed
│   │   ├── volume-control-tool.js   # No changes needed
│   │   └── zwave-control-tool.js    # No changes needed
│   ├── util/
│   │   └── BackgroundTranscriber.js # MODIFIED: Use ToolExecutor
│   ├── anthropic-client.js          # MODIFIED: Use ToolExecutor
│   ├── ollama-client.js             # MODIFIED: Use ToolExecutor
│   └── main.js                      # MODIFIED: Initialize ToolRegistry
```

## Benefits Summary

| Aspect | Before | After | Improvement |
|--------|--------|-------|-------------|
| Lines of duplicate code | ~45 lines | 0 lines | 100% reduction |
| Files to update for new tool | 3 files | 1 file | 67% less work |
| Consistent logging | No | Yes | ✅ |
| Consistent error handling | No | Yes | ✅ |
| Testability | Hard (3 places) | Easy (1 place) | ✅ |
| Timeout protection | No | Yes (30s) | ✅ |
| Performance monitoring | No | Yes (slow tool warnings) | ✅ |

