# tool-execution Spec Delta

## ADDED Requirements

### Requirement: MCP Tool Parameter Name Normalization
The system SHALL normalize parameter names when executing MCP tools to ensure compatibility between LangChain's snake_case convention and MCP server's camelCase convention.

#### Scenario: Snake_case to camelCase conversion for MCP tools
- **GIVEN** a LangChain MCP tool is registered with parameter names in snake_case (e.g., `device_name`, `command`)
- **WHEN** the AI calls the tool with snake_case parameter names
- **THEN** ToolRegistry normalizes the parameter names to camelCase (e.g., `deviceName`, `action`) before invoking the MCP server

#### Scenario: Built-in tools are not affected
- **GIVEN** a built-in tool (datetime, search, volume) is registered
- **WHEN** the AI calls the tool
- **THEN** ToolRegistry passes parameters through unchanged (no normalization applied)

#### Scenario: Static parameter mappings for known MCP tools
- **GIVEN** the tool `control_zwave_device` is registered
- **WHEN** the AI calls it with `{device_name: "Switch One", command: "on"}`
- **THEN** ToolRegistry applies static mapping: `device_name → deviceName`, `command → action`
- **AND** the MCP server receives `{deviceName: "Switch One", action: "on"}`

#### Scenario: Heuristic conversion for unmapped parameters
- **GIVEN** an MCP tool has a parameter not in the static mapping
- **WHEN** the parameter name contains underscores (e.g., `new_parameter_name`)
- **THEN** ToolRegistry applies heuristic snake_case → camelCase conversion (e.g., `newParameterName`)

#### Scenario: Parameters without underscores pass through unchanged
- **GIVEN** an MCP tool parameter has no underscores (e.g., `level`, `value`)
- **WHEN** the AI calls the tool with that parameter
- **THEN** ToolRegistry passes the parameter through unchanged (e.g., `level → level`)

#### Scenario: Parameter normalization logging
- **GIVEN** parameter normalization occurs during tool execution
- **WHEN** the original and normalized parameters differ
- **THEN** ToolRegistry logs the transformation: `{device_name: "..."} → {deviceName: "..."}`

#### Scenario: Error handling with invalid parameters after normalization
- **GIVEN** parameter normalization occurs successfully
- **WHEN** the MCP server rejects the normalized parameters (e.g., missing required field)
- **THEN** the error message from the MCP server is returned to the user unchanged

---

## Notes

**Implementation Details:**
- Parameter normalization is applied in `ToolRegistry.registerLangChainTool()` executor function
- Static mappings are defined in `MCP_PARAMETER_MAPPINGS` constant
- Heuristic uses regex replacement: `/_([a-z])/g → uppercase letter`

**Related Requirements:**
- Existing: `tool-execution > Tool Registry` (lines 25-40) - This requirement extends tool registration logic
- Existing: `tool-execution > Tool Executor Interface` (lines 51-66) - Normalization occurs before executor invocation

**Why This Is Needed:**
- LangChain's `@langchain/mcp-adapters` library converts MCP tool schemas to snake_case for OpenAPI compatibility
- MCP servers expect camelCase parameter names (JavaScript convention)
- This creates a schema impedance mismatch that breaks tool execution
- Parameter normalization transparently fixes the mismatch at the integration layer
