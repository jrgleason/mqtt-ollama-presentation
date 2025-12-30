# Proposal: Use LangChain MCP Auto-Discovery for Tool Registration

## Problem Statement

The voice gateway has **`@langchain/mcp-adapters` installed but is NOT using it** for Z-Wave MCP tools. Instead, tools are manually registered with hardcoded definitions and custom executor functions, bypassing LangChain's built-in MCP tool discovery.

### Current Architecture Issues

**1. Manual Tool Registration Despite Having LangChain MCP Library**
- `@langchain/mcp-adapters` is installed in package.json (✅ present)
- Custom tool definitions written in `tools/zwave-control-tool.js` (❌ unnecessary)
- Tools manually registered in `main.js` with `toolRegistry.registerTool()` (❌ manual)
- `MultiServerMCPClient.getTools()` auto-discovery NOT used (❌ bypassed)

**2. Custom MCP Client Wrapper**
- `mcpZWaveClient.js` wraps custom `zwave-mcp-server/client` (❌ non-standard)
- Should use `MultiServerMCPClient` from `@langchain/mcp-adapters` (✅ standard)
- Custom wrapper adds maintenance burden and bypasses LangChain ecosystem

**3. Duplicate Tool Definitions**
- MCP server defines tools in `zwave-mcp-server/src/index.js` (✅ source of truth)
- Voice gateway redefines same tools in `tools/zwave-control-tool.js` (❌ duplication)
- Schema changes require updates in two places (❌ fragile)

**4. Mixed Tool Sources**
- MCP tools (Z-Wave): Should be auto-discovered
- Local tools (datetime, search, volume): Should be manually registered
- Both currently use same manual registration flow (❌ inconsistent)

### Root Cause

When `@langchain/mcp-adapters` was added to package.json, the existing custom MCP client wrapper was not replaced with the standard LangChain integration. The library exists but isn't being used.

## Proposed Solution

**Use `MultiServerMCPClient` from the already-installed `@langchain/mcp-adapters` library** to auto-discover MCP tools, while keeping manual registration for local tools.

### Architecture Overview

**Current (Manual Registration):**
```javascript
// main.js - Manual tool registration
const toolRegistry = new ToolRegistry();
toolRegistry.registerTool(zwaveControlTool, executeZWaveControlTool); // ❌ Manual
toolRegistry.registerTool(dateTimeTool, executeDateTimeTool);        // ✅ OK (local)
```

**Proposed (Auto-Discovery for MCP, Manual for Local):**
```javascript
// main.js - Mixed registration
const toolRegistry = new ToolRegistry();

// MCP tools: Auto-discovered from MCP server
const mcpClient = new MultiServerMCPClient({
  zwave: {
    transport: "stdio",
    command: "node",
    args: ["../zwave-mcp-server/src/index.js"],
    env: { MQTT_BROKER_URL: process.env.MQTT_BROKER_URL }
  }
});

const mcpTools = await mcpClient.getTools(); // ✅ Auto-discovery
for (const tool of mcpTools) {
  toolRegistry.registerTool(tool.lc_name, tool); // ✅ LangChain tool
}

// Local tools: Still manually registered
toolRegistry.registerTool(dateTimeTool, executeDateTimeTool);   // ✅ Manual OK
toolRegistry.registerTool(searchTool, executeSearchTool);       // ✅ Manual OK
toolRegistry.registerTool(volumeControlTool, executeVolumeControlTool); // ✅ Manual OK
```

### Key Design Principles

- **MCP tools are auto-discovered** - No manual definitions needed
- **Local tools stay manual** - Keep existing datetime, search, volume tools as-is
- **ToolRegistry stays central** - Continue using ToolRegistry for all tools
- **ToolExecutor unchanged** - Tool execution logic remains the same
- **Schema source of truth** - MCP server owns tool schemas, voice gateway consumes them

## Implementation Overview

### 1. Create MCP Client Integration Module

**File:** `src/services/MCPIntegration.js` (new)

```javascript
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import path from 'path';

export async function createMCPClient(config, logger) {
  const mcpServerPath = path.resolve('../zwave-mcp-server/src/index.js');

  const client = new MultiServerMCPClient({
    zwave: {
      transport: "stdio",
      command: "node",
      args: [mcpServerPath],
      env: {
        MQTT_BROKER_URL: config.mqtt?.brokerUrl || process.env.MQTT_BROKER_URL,
        ZWAVE_MQTT_TOPIC: config.mqtt?.zwaveTopic || 'zwave',
      }
    }
  });

  logger.info('✅ MCP client configured', { server: 'zwave' });
  return client;
}
```

### 2. Update ToolRegistry for Auto-Discovery

**File:** `src/services/ToolRegistry.js`

Add method to register LangChain tools:

```javascript
/**
 * Register a LangChain tool from MCP auto-discovery
 * @param {Object} langchainTool - LangChain tool instance
 */
registerLangChainTool(langchainTool) {
  const toolName = langchainTool.lc_name || langchainTool.name;

  // LangChain tools are callable directly
  this.#tools.set(toolName, {
    definition: langchainTool.schema, // Tool schema
    executor: langchainTool.invoke.bind(langchainTool) // Tool invocation
  });

  console.log(`✅ Registered LangChain MCP tool: ${toolName}`);
}
```

### 3. Update Main Initialization

**File:** `src/main.js`

Replace manual Z-Wave tool registration with auto-discovery:

```javascript
// Initialize tool system
logger.info('🔧 Initializing tool system...');
const toolRegistry = new ToolRegistry();

// 1. Auto-discover MCP tools
const mcpClient = await createMCPClient(config, logger);
const mcpTools = await mcpClient.getTools();

logger.info('🔍 Discovered MCP tools', {
  count: mcpTools.length,
  tools: mcpTools.map(t => t.lc_name)
});

for (const tool of mcpTools) {
  toolRegistry.registerLangChainTool(tool);
}

// 2. Manually register local tools (non-MCP)
toolRegistry.registerTool(dateTimeTool, executeDateTimeTool);
toolRegistry.registerTool(searchTool, executeSearchTool);
toolRegistry.registerTool(volumeControlTool, executeVolumeControlTool);

logger.info('✅ Tool system initialized', {
  toolCount: toolRegistry.toolCount,
  tools: toolRegistry.getToolNames()
});
```

### 4. Remove Obsolete Files

**Delete:**
- `src/mcpZWaveClient.js` - Custom MCP client wrapper (replaced by MCPIntegration.js)
- `src/tools/zwave-control-tool.js` - Manual tool definition (replaced by auto-discovery)

**Keep:**
- `src/tools/datetime-tool.js` - Local tool (not from MCP)
- `src/tools/search-tool.js` - Local tool (not from MCP)
- `src/tools/volume-control-tool.js` - Local tool (not from MCP)

## Impact Assessment

### Files Modified
- `src/main.js` - Replace manual Z-Wave tool registration with auto-discovery
- `src/services/ToolRegistry.js` - Add `registerLangChainTool()` method
- `src/services/MCPIntegration.js` - New file for MCP client setup

### Files Deleted
- `src/mcpZWaveClient.js` - Custom MCP wrapper (obsolete)
- `src/tools/zwave-control-tool.js` - Manual tool definition (obsolete)

### Breaking Changes
None. Tool names and functionality remain identical.

### Performance Impact
**Positive:**
- Faster startup (one MCP process vs manual client init)
- Tool schemas always match MCP server (no version drift)

**Neutral:**
- Tool discovery adds ~100ms to startup (one-time cost)

## Success Criteria

✅ Voice gateway uses `MultiServerMCPClient` from `@langchain/mcp-adapters`
✅ MCP tools (Z-Wave) are auto-discovered via `getTools()`
✅ Local tools (datetime, search, volume) still manually registered
✅ All 4 Z-Wave MCP tools available (list_devices, control_device, etc.)
✅ Tool execution works identically to before
✅ No custom MCP client wrapper code remains
✅ No manual Z-Wave tool definitions remain
✅ ToolRegistry handles both LangChain and manual tools

## Notes

**Why keep manual registration for local tools?**
They're not MCP servers - they're simple local functions. Manual registration is appropriate for these.

**Why not convert everything to MCP?**
datetime/search/volume tools are trivial and don't need the MCP protocol overhead. Only Z-Wave needs MCP because it's a separate server process.

**Will this work with multiple MCP servers in the future?**
Yes! `MultiServerMCPClient` supports multiple servers. Just add more entries to the config object.
