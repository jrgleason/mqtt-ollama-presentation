# tool-execution Specification Delta

## ADDED Requirements

### Requirement: Tool Tier Management

ToolManager SHALL support organizing tools into tiers for selective binding based on query intent.

**Rationale:** Small models (qwen3:0.6b) are overwhelmed by large tool sets. Tiered loading reduces confusion and improves response quality.

#### Scenario: Define tool tiers

- **GIVEN** tools are registered in ToolManager
- **WHEN** tools are categorized
- **THEN** Tier 0 (Essential) contains Z-Wave device control tools
- **AND** Tier 1 (Utility) contains datetime and volume tools
- **AND** Tier 2 (Fallback) contains Playwright browser tools
- **AND** each tool is assigned to exactly one tier

#### Scenario: Get tools by tier

- **GIVEN** ToolManager contains tools in multiple tiers
- **WHEN** `getToolsByTier(tier)` is called
- **THEN** returns only tools in the specified tier
- **AND** returns empty array if tier has no tools
- **AND** does not modify the original tools collection

#### Scenario: Get tools up to tier

- **GIVEN** ToolManager contains tools in multiple tiers
- **WHEN** `getToolsUpToTier(maxTier)` is called
- **THEN** returns tools from Tier 0 through maxTier (inclusive)
- **AND** useful for progressive tool loading

#### Scenario: Register tool with tier assignment

- **GIVEN** a new tool is being registered
- **WHEN** `addTool(tool, tier)` is called
- **THEN** tool is added to the tools collection
- **AND** tool is assigned to the specified tier
- **AND** default tier is Tier 1 (Utility) if not specified

### Requirement: Lazy Playwright Tool Loading

ToolManager SHALL support lazy loading of Playwright tools to reduce initial tool set size.

**Rationale:** Playwright tools (22 tools) are only needed for web search fallback. Excluding them from initial binding reduces model confusion.

#### Scenario: Playwright tools excluded from initial binding

- **GIVEN** MCP integration initializes both Z-Wave and Playwright clients
- **WHEN** ToolManager is populated with tools
- **THEN** Z-Wave tools are added immediately
- **AND** Playwright tools are stored separately (not in main tools array)
- **AND** initial `getTools()` returns only non-Playwright tools

#### Scenario: Playwright tools available on demand

- **GIVEN** Playwright tools are stored separately
- **WHEN** `getPlaywrightTools()` is called
- **THEN** returns the Playwright tools array
- **AND** can be used to temporarily bind for web search

#### Scenario: Web search binds Playwright tools temporarily

- **GIVEN** WebSearchFallback is triggered
- **WHEN** browser automation is needed
- **THEN** Playwright tools are bound for that specific query
- **AND** subsequent queries use normal tool set (no Playwright)
