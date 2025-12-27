# Proposal: Convert Z-Wave MCP Server to Standards-Compliant MCP Integration

## Problem Statement

**Voice gateway has `@langchain/mcp-adapters` installed but is NOT using it.** Instead, it uses a custom client wrapper (`MCPZWaveClient`) that bypasses LangChain's standard MCP integration.

### Current Architecture Issues

**1. Installed But Unused Dependencies**
- `package.json` includes `@langchain/mcp-adapters` (✅ installed)
- BUT code uses custom `zwave-mcp-server/client` instead (❌ wrong)
- Custom `MCPZWaveClient` class reinvents what `MultiServerMCPClient` already does
- LangChain MCP adapter is available but bypassed

**2. Manual Tool Registration Instead of Auto-Discovery**
- Tools are manually defined and registered in `ToolRegistry`
- LangChain `MultiServerMCPClient.getTools()` would auto-discover from MCP server
- Misses automatic tool schema conversion
- Requires maintaining duplicate tool definitions

**IMPORTANT:** The `zwave-mcp-server` itself is already correct - it's a proper MCP server using `@modelcontextprotocol/sdk` with stdio transport. The problem is the **client side** - not using the standard LangChain integration.

**3. Oracle Frontend Has No MCP Integration**
- Oracle Next.js app currently uses custom client (same as voice gateway)
- No server-side MCP integration in Next.js API routes
- No frontend MCP client for browser-based AI interactions
- Missing support for modern Next.js MCP patterns (Vercel MCP Adapter, AI SDK)

**4. Lack of Remote MCP Server Support**
- Current stdio-only transport limits deployment flexibility
- Cannot run MCP server as standalone service
- No SSE/HTTP transport for remote access
- Difficult to scale or deploy separately

**5. No Multi-Consumer Support**
- Server process is spawned independently by each consumer
- Cannot share MCP server across voice-gateway-oww and oracle
- Duplicate processes waste resources
- No centralized server management

## Proposed Solution

**Use the `@langchain/mcp-adapters` dependency you already have installed** instead of the custom client wrapper.

**Good news:** The `zwave-mcp-server` is already standards-compliant (uses `@modelcontextprotocol/sdk` correctly). The example from LangChain docs applies directly to your setup. No server changes needed!

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   Z-Wave MCP Server                         │
│  (Standalone Service - Multiple Transport Support)          │
│                                                              │
│  Transports:                                                 │
│  • stdio (local process communication)                      │
│  • SSE/HTTP (remote HTTP communication)                     │
└─────────────────────────────────────────────────────────────┘
                          ▲        ▲
                          │        │
         ┌────────────────┘        └────────────────┐
         │                                          │
         │                                          │
┌────────▼───────────┐                  ┌───────────▼─────────┐
│  voice-gateway-oww │                  │  oracle (Next.js)   │
│                    │                  │                     │
│  LangChain Tools:  │                  │  Backend Routes:    │
│  • @langchain/     │                  │  • Vercel MCP       │
│    mcp-adapters    │                  │    Adapter          │
│  • Multi           │                  │  • API routes       │
│    ServerMCP       │                  │    (/api/mcp/*)     │
│    Client          │                  │                     │
│  • stdio transport │                  │  Frontend UI:       │
│                    │                  │  • AI SDK MCP       │
│                    │                  │    client           │
│                    │                  │  • SSE transport    │
└────────────────────┘                  └─────────────────────┘
```

### Integration Strategies

#### 1. Voice Gateway (Backend) - LangChain Integration

**Current:**
```javascript
import { getMCPClient } from 'zwave-mcp-server/client';
const client = getMCPClient();
await client.start();
const devices = await client.listDevices();
```

**Proposed:**
```javascript
import { MultiServerMCPClient } from "@langchain/mcp-adapters";

const mcpClient = new MultiServerMCPClient({
  zwave: {
    transport: "stdio",
    command: "node",
    args: ["path/to/zwave-mcp-server/src/index.js"],
  },
});

// Get tools and pass to LangChain agent
const tools = await mcpClient.getTools();
const agent = createAgent({ model, tools });
```

**Benefits:**
- Uses official LangChain MCP adapter
- Automatic tool schema conversion
- Supports multiple MCP servers (future: weather, calendar, etc.)
- Standard MCP protocol compliance

#### 2. Oracle Backend - Next.js API Routes with Vercel MCP Adapter

**Proposed:**
```javascript
// app/api/mcp/route.js
import { createMCPHandler } from '@vercel/mcp-adapter';

export const GET = createMCPHandler({
  servers: {
    zwave: {
      transport: 'stdio',
      command: 'node',
      args: ['../zwave-mcp-server/src/index.js'],
    },
  },
});
```

**Benefits:**
- Drop-in MCP server endpoint at `/api/mcp`
- Handles SSE streaming
- Compatible with MCP clients
- Easy to add more MCP servers

#### 3. Oracle Frontend - AI SDK MCP Client

**Proposed:**
```javascript
import { createMCPClient } from '@ai-sdk/mcp';

const mcpClient = createMCPClient({
  transport: 'sse',
  url: '/api/mcp',
});

const tools = await mcpClient.getTools();
// Use tools with AI SDK chat completions
```

**Benefits:**
- Browser-compatible MCP client
- SSE transport for real-time updates
- Integrates with AI SDK chat UI
- No custom client implementation needed

### Key Changes Required

**1. Z-Wave MCP Server**
- ✅ Already implements `@modelcontextprotocol/sdk` (no changes needed!)
- Add SSE/HTTP transport support (currently stdio-only)
- Optionally: Run as standalone service (systemd, Docker, etc.)

**2. Voice Gateway (voice-gateway-oww)**
- Remove custom `MCPZWaveClient` usage
- Add `@langchain/mcp-adapters` dependency
- Configure `MultiServerMCPClient` with stdio transport
- Update tool registration to use MCP-discovered tools
- Remove manual tool definitions (use MCP schemas instead)

**3. Oracle (Next.js)**
- **Backend**: Add Vercel MCP Adapter or AI SDK MCP tools
- **Frontend**: Add AI SDK MCP client for browser
- Create `/api/mcp` route for SSE transport
- Update existing device control to use MCP tools
- Remove custom `zwave-client.js` wrapper

## Success Criteria

### Voice Gateway
1. LangChain agent can discover and use Z-Wave tools via MCP
2. No custom MCP client code (uses `@langchain/mcp-adapters`)
3. Tools are automatically registered from MCP server schema
4. Multiple MCP servers can be added without code changes

### Oracle Backend
1. Next.js API route exposes MCP server at `/api/mcp`
2. SSE transport works for streaming tool responses
3. Backend can use MCP tools in LangChain agents
4. No custom client implementation needed

### Oracle Frontend
1. Browser can connect to MCP server via SSE
2. UI can discover and display available tools
3. AI chat can invoke MCP tools from frontend
4. Real-time tool execution updates

### Z-Wave MCP Server
1. Supports both stdio (local) and SSE (remote) transports
2. Can run as standalone service (optional)
3. No breaking changes to existing tool schemas
4. Backward compatible with current MQTT topic structure

## Impact Assessment

### Files Modified

**voice-gateway-oww:**
- `src/mcpZWaveClient.js` - Remove or refactor to use LangChain adapter
- `src/services/ToolRegistry.js` - Update to register MCP-discovered tools
- `src/services/ToolExecutor.js` - Update to call MCP tools via LangChain
- `package.json` - Add `@langchain/mcp-adapters` dependency

**oracle:**
- `src/lib/mcp/zwave-client.js` - Remove or refactor
- `src/app/api/mcp/route.js` - New API route for MCP server
- `src/lib/langchain/tools/*` - Update to use MCP tools
- `package.json` - Add Vercel MCP Adapter or AI SDK
- Frontend components - Add MCP client integration

**zwave-mcp-server:**
- `src/index.js` - Add SSE transport support (optional)
- `src/mcp-client.js` - Deprecate custom client
- `package.json` - Update exports, add transport dependencies
- README.md - Document new integration patterns

### Breaking Changes

**Option A: Hard Cutover (Recommended)**
- Remove custom `MCPZWaveClient` entirely
- All consumers must migrate to standard MCP clients
- Clear migration path, no legacy code

**Option B: Gradual Migration**
- Keep `MCPZWaveClient` deprecated for one release
- Add warnings when custom client is used
- Parallel support for both approaches

**Recommendation:** Option A. Clean break, simpler codebase.

### Performance Impact

**Positive:**
- Single MCP server instance (if using SSE) vs multiple stdio processes
- Better resource usage when oracle and voice-gateway share server
- Reduced startup time (no process spawning on every request)

**Negative:**
- SSE transport adds network overhead (minimal for local connections)
- Additional dependency (`@langchain/mcp-adapters`, Vercel adapter)

**Net Impact:** Positive for multi-consumer scenarios, neutral for single consumer.

## Alternatives Considered

### Alternative 1: Keep Custom Client, Add LangChain Wrapper
Wrap existing `MCPZWaveClient` with LangChain-compatible interface.

**Rejected because:**
- Duplicates functionality of `@langchain/mcp-adapters`
- Harder to maintain custom code
- Doesn't solve frontend integration problem

### Alternative 2: Use Direct MCP SDK Client
Use `@modelcontextprotocol/sdk/client` directly without LangChain.

**Rejected because:**
- Doesn't integrate with LangChain tools
- Requires custom tool conversion logic
- More boilerplate code

### Alternative 3: HTTP REST API (Not MCP)
Create custom REST API for Z-Wave tools.

**Rejected because:**
- Reinvents MCP protocol
- Loses tool discovery and schema benefits
- Not compatible with AI SDK or LangChain MCP integrations

## Open Questions

### Q1: Should zwave-mcp-server run as standalone service?
**Context:** Currently spawned per consumer. Could run as systemd service.

**Options:**
- **A:** Keep stdio spawning (simple, no service management)
- **B:** Run as standalone service with SSE transport
- **C:** Support both modes (config-driven)

**Recommendation:** Start with A (stdio), add B later if needed.

### Q2: How should oracle frontend authenticate to MCP server?
**Context:** SSE transport from browser needs security.

**Options:**
- **A:** Use Next.js API route proxy (backend authenticates)
- **B:** Pass auth token from Next.js session
- **C:** No auth (localhost only, rely on network security)

**Recommendation:** A for production, C for development.

### Q3: Should we support multiple MCP servers in voice gateway?
**Context:** LangChain `MultiServerMCPClient` supports multiple servers.

**Options:**
- **A:** Only zwave-mcp-server for now
- **B:** Add configuration for multiple servers (weather, calendar, etc.)

**Recommendation:** A for this change, B for future work.

### Q4: How to handle MCP tool errors in oracle frontend?
**Context:** Browser needs user-friendly error messages.

**Options:**
- **A:** Show raw MCP error responses
- **B:** Add error translation layer
- **C:** Retry logic with exponential backoff

**Recommendation:** B + C for better UX.

### Q5: Should we keep backward compatibility with custom client?
**Context:** Breaking change for existing integrations.

**Options:**
- **A:** Hard cutover (remove custom client)
- **B:** Deprecation period (6 months)
- **C:** Maintain both indefinitely

**Recommendation:** A (clean break, simpler). Project is demo/presentation, not production.

## Dependencies

### New NPM Packages

**voice-gateway-oww:**
- `@langchain/mcp-adapters` (official LangChain MCP support)

**oracle:**
- `@vercel/mcp-adapter` OR `@ai-sdk/mcp` (frontend MCP client)
- `eventsource` (SSE client for Node.js backend)

**zwave-mcp-server (optional):**
- `express` (if adding HTTP/SSE transport)
- `cors` (if allowing cross-origin requests)

### External Services

None. All components run locally.

## Timeline Estimate

### Phase 1: Voice Gateway LangChain Integration
- Research and prototype: ~4 hours
- Implementation: ~6 hours
- Testing: ~2 hours
- **Subtotal: ~12 hours**

### Phase 2: Oracle Backend MCP Routes
- API route implementation: ~3 hours
- LangChain tools integration: ~2 hours
- Testing: ~2 hours
- **Subtotal: ~7 hours**

### Phase 3: Oracle Frontend MCP Client
- AI SDK MCP client setup: ~4 hours
- UI components for tool invocation: ~4 hours
- Testing and debugging: ~3 hours
- **Subtotal: ~11 hours**

### Phase 4: Z-Wave MCP Server SSE Transport (Optional)
- Add HTTP/SSE transport: ~5 hours
- Testing with both transports: ~2 hours
- **Subtotal: ~7 hours**

### Phase 5: Documentation and Cleanup
- Update READMEs: ~2 hours
- Migration guide: ~1 hour
- Remove deprecated code: ~1 hour
- **Subtotal: ~4 hours**

**Total Estimate: ~41 hours (or ~34 hours without SSE transport)**

## References

### Documentation
- [LangChain MCP Integration](https://docs.langchain.com/oss/javascript/langchain/mcp)
- [Vercel MCP Adapter Template](https://vercel.com/templates/next.js/model-context-protocol-mcp-with-next-js)
- [AI SDK MCP Tools](https://ai-sdk.dev/cookbook/next/mcp-tools)
- [Next.js MCP Server Guide](https://nextjs.org/docs/app/guides/mcp)
- [MCP React Integration](https://webflow.copilotkit.ai/blog/add-an-mcp-client-to-any-react-app-in-under-30-minutes)

### Current Code
- `apps/zwave-mcp-server/src/index.js` - MCP server implementation
- `apps/zwave-mcp-server/src/mcp-client.js` - Custom client (to be replaced)
- `apps/voice-gateway-oww/src/mcpZWaveClient.js` - Voice gateway client wrapper
- `apps/oracle/src/lib/mcp/zwave-client.js` - Oracle client wrapper
