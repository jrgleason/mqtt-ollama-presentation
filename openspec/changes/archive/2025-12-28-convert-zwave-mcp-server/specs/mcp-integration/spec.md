# mcp-integration Specification Delta

## Purpose

Defines requirements for integrating Z-Wave MCP Server with LangChain, Next.js, and browser clients using standards-compliant MCP protocol libraries.

## ADDED Requirements

### Requirement: LangChain MCP Adapter Integration

Voice gateway SHALL use `@langchain/mcp-adapters` to connect to MCP servers and discover tools automatically.

#### Scenario: MultiServerMCPClient configuration

- **GIVEN** voice gateway is initializing tool system
- **WHEN** MCP integration is configured
- **THEN** `MultiServerMCPClient` SHALL be instantiated with stdio transport
- **AND** zwave-mcp-server SHALL be spawned as subprocess
- **AND** environment variables SHALL be passed to MCP server process (ZWAVE_UI_URL, credentials)
- **AND** no custom JSON-RPC client code SHALL be used

#### Scenario: Automatic tool discovery from MCP server

- **GIVEN** MCP client is initialized
- **WHEN** `mcpClient.getTools()` is called
- **THEN** tools SHALL be discovered from connected MCP servers
- **AND** tool schemas SHALL be automatically converted to LangChain format
- **AND** tools SHALL be registered in ToolRegistry without manual definitions

#### Scenario: Tool execution via LangChain

- **GIVEN** AI model decides to call an MCP tool
- **WHEN** ToolExecutor.executeTool(toolName, args) is called
- **THEN** LangChain MCP adapter SHALL handle JSON-RPC protocol
- **AND** tool result SHALL be returned to AI model
- **AND** no custom MCP client code SHALL be invoked

---

### Requirement: Next.js MCP Backend Integration

Oracle backend SHALL expose MCP servers via API routes using Vercel MCP Adapter or AI SDK.

#### Scenario: MCP API route for SSE transport

- **GIVEN** Next.js oracle application
- **WHEN** `/api/mcp` route is accessed
- **THEN** Vercel MCP Adapter SHALL handle SSE streaming
- **AND** zwave-mcp-server SHALL be spawned with stdio transport
- **AND** GET requests SHALL establish SSE connection
- **AND** POST requests SHALL handle MCP messages

#### Scenario: Backend LangChain agent with MCP tools

- **GIVEN** oracle chat API route
- **WHEN** user sends a message
- **THEN** MCP tools SHALL be fetched from MCP adapter
- **AND** LangChain agent SHALL be created with MCP tools
- **AND** agent SHALL invoke tools via MCP protocol
- **AND** no custom zwave client code SHALL be used

---

### Requirement: Browser MCP Client Integration

Oracle frontend SHALL use AI SDK MCP client to connect to backend MCP endpoint from browser.

#### Scenario: Browser MCP client initialization

- **GIVEN** React component loads
- **WHEN** useMCPClient() hook initializes
- **THEN** MCP client SHALL connect to `/api/mcp` via SSE
- **AND** available tools SHALL be discovered
- **AND** tools SHALL be cached in React state

#### Scenario: Tool invocation from browser

- **GIVEN** user triggers device control action
- **WHEN** client.callTool(toolName, args) is called
- **THEN** SSE message SHALL be sent to backend
- **AND** backend SHALL forward to MCP server
- **AND** result SHALL stream back to browser
- **AND** UI SHALL update with tool result

---

### Requirement: Custom MCP Client Deprecation

Custom `MCPZWaveClient` SHALL be removed in favor of standard MCP libraries.

#### Scenario: Remove custom client from voice gateway

- **GIVEN** voice gateway codebase
- **WHEN** migration to LangChain adapter is complete
- **THEN** `src/mcpZWaveClient.js` SHALL be deleted
- **AND** imports from `zwave-mcp-server/client` SHALL be removed
- **AND** no custom JSON-RPC stdio code SHALL remain

#### Scenario: Remove custom client from oracle

- **GIVEN** oracle codebase
- **WHEN** migration to Vercel MCP Adapter is complete
- **THEN** `src/lib/mcp/zwave-client.js` SHALL be deleted
- **AND** imports from `zwave-mcp-server/client` SHALL be removed

#### Scenario: Deprecate mcp-client.js export

- **GIVEN** zwave-mcp-server package
- **WHEN** all consumers migrate to standard clients
- **THEN** `./client` export SHALL be removed from package.json
- **AND** `src/mcp-client.js` MAY be deleted (optional - no harm keeping it)
