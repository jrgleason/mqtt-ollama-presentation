# tool-execution Specification Delta

## MODIFIED Requirements

### Requirement: Tool Registry

The system SHALL provide a ToolRegistry module that maintains a registry of all available tools from both manual registration and MCP auto-discovery.

#### Scenario: Register tool at startup
- **WHEN** the application starts
- **THEN** all manually defined tools are registered in the ToolRegistry with their definitions and executor functions
- **AND** all MCP tools are auto-discovered and registered using LangChain's MultiServerMCPClient

**Previous Behavior:** Only manual tool registration supported

**New Behavior:** Supports both manual registration (local tools) and auto-discovery (MCP tools)

#### Scenario: Auto-discover MCP tools
- **WHEN** the MCP client is initialized
- **THEN** ToolRegistry calls `mcpClient.getTools()` to discover available MCP tools
- **AND** each discovered LangChain tool is registered using `registerLangChainTool()`
- **AND** tool schemas come directly from the MCP server

**Rationale:** Eliminates duplicate tool definitions. MCP server is source of truth for MCP tool schemas.

#### Scenario: Register LangChain tool from MCP
- **WHEN** a LangChain tool is registered via `registerLangChainTool()`
- **THEN** ToolRegistry extracts the tool name from `tool.lc_name` or `tool.name`
- **AND** stores the tool's schema and bound invoke method
- **AND** the tool becomes callable like manually registered tools

**Rationale:** LangChain tools have a different structure than manual tools but should integrate seamlessly.

#### Scenario: Get tool definition (MODIFIED)
- **WHEN** an AI client needs tool definitions for the model
- **THEN** ToolRegistry returns an array of all registered tool definitions
- **AND** includes both manually registered tools and auto-discovered MCP tools
- **AND** definitions are in the correct format expected by the AI provider

**Previous Behavior:** Only manual tool definitions returned

**New Behavior:** Returns definitions from both manual and MCP tools

---

## ADDED Requirements

### Requirement: MCP Client Integration

The system SHALL use LangChain's MultiServerMCPClient for MCP server integration instead of custom client wrappers.

#### Scenario: Initialize MCP client with stdio transport
- **WHEN** the application initializes the MCP system
- **THEN** it creates a MultiServerMCPClient instance from `@langchain/mcp-adapters`
- **AND** configures the zwave server with stdio transport
- **AND** passes environment variables (MQTT broker URL, Z-Wave topic) to the MCP server process

**Rationale:** Uses standard LangChain integration instead of custom wrapper. Eliminates maintenance burden.

#### Scenario: Discover tools from MCP server
- **GIVEN** MCP client is initialized
- **WHEN** tool discovery is triggered
- **THEN** the system calls `mcpClient.getTools()`
- **AND** receives an array of LangChain tool instances
- **AND** each tool includes schema, name, and invoke method

**Rationale:** Auto-discovery eliminates need for manual tool definitions. Schema stays in sync with MCP server.

#### Scenario: MCP server connection error
- **GIVEN** the MCP server process fails to start
- **WHEN** MCP client initialization occurs
- **THEN** the system logs a clear error message
- **AND** continues startup with local tools only
- **AND** does not crash the entire application

**Rationale:** MCP unavailability shouldn't break the entire voice gateway. Local tools should still work.

### Requirement: Mixed Tool Sources

The system SHALL support tools from multiple sources: manually registered local tools and auto-discovered MCP tools.

#### Scenario: Local tools remain manually registered
- **WHEN** the application initializes tools
- **THEN** local tools (datetime, search, volume) are registered manually
- **AND** use the existing `registerTool(definition, executor)` method
- **AND** continue to work as before

**Rationale:** Simple local tools don't need MCP protocol overhead. Manual registration is appropriate.

#### Scenario: MCP tools are auto-discovered
- **WHEN** the application initializes tools
- **THEN** MCP tools (Z-Wave) are discovered via `getTools()`
- **AND** registered using `registerLangChainTool()`
- **AND** tool definitions come from the MCP server, not hardcoded

**Rationale:** Z-Wave tools come from a separate MCP server process. Auto-discovery keeps schemas in sync.

#### Scenario: Tool execution works for both sources
- **WHEN** the AI calls a tool
- **THEN** ToolExecutor can execute both manually registered and MCP tools
- **AND** handles differences in tool invocation format
- **AND** returns results in consistent format

**Rationale:** AI should not care whether a tool is local or from MCP. Execution should be transparent.
