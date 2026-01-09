# tool-execution Spec Delta

## ADDED Requirements

### Requirement: Effective Tool Description Patterns

Tool definitions SHALL use mandatory language patterns that guide AI behavior for proper tool selection.

#### Scenario: Search tool uses mandatory language for current events

- **GIVEN** the `search_web` tool is defined
- **WHEN** an AI model evaluates whether to use the tool
- **THEN** the description includes "REQUIRED" or "MUST" language for current event queries
- **AND** the description specifies explicit trigger conditions (current leaders, recent news, prices, weather)
- **AND** the description includes negative examples of what NOT to search for

#### Scenario: Tool description matches actual capabilities

- **GIVEN** a tool is defined with a description
- **WHEN** the description describes what the tool does
- **THEN** the description accurately reflects the implementation
- **AND** no false claims about capabilities (e.g., "Google" when using DuckDuckGo)
- **AND** expectations are set for result quality (may be incomplete, text snippets)

### Requirement: Query Formatting Guidance

Tool parameter descriptions SHALL include formatting guidance for optimal query construction.

#### Scenario: Search query parameter includes year guidance

- **GIVEN** the `search_web` tool has a `query` parameter
- **WHEN** the parameter description is provided to the AI
- **THEN** the description instructs to include the current year for current event queries
- **AND** the description includes good and bad example queries
- **AND** good examples show year inclusion (e.g., "US president 2026")
- **AND** bad examples show common mistakes (e.g., "who is president" without year)

#### Scenario: Parameter description provides negative examples

- **GIVEN** a tool parameter may be misused
- **WHEN** the parameter description is written
- **THEN** it includes examples of queries to avoid (math, definitions, timeless facts)
- **AND** the guidance is concise to fit small model context windows

## MODIFIED Requirements

### Requirement: Tool Definition Format (MODIFIED)

Tool definitions SHALL follow a consistent schema with name, description, and parameters, **with descriptions using imperative language for mandatory use cases**.

#### Scenario: Validate tool definition with mandatory language

- **WHEN** a tool is registered
- **THEN** the tool definition includes a unique name
- **AND** includes a human-readable description that uses "MUST" or "REQUIRED" for mandatory use cases
- **AND** includes JSON schema for parameters with descriptive examples
- **AND** description length is optimized for target model (under 200 tokens for small models)

**Previous Behavior:** Descriptions were passive ("Use this for...") without mandatory guidance

**Rationale:** AI models respond better to imperative language patterns. The datetime tool's success with "REQUIRED: ... You MUST call..." demonstrates this pattern's effectiveness.

---

### Requirement: Consistent Tool Documentation Patterns

All custom tools in the voice gateway SHALL follow consistent documentation patterns for AI consumption.

#### Scenario: Custom tools follow datetime tool pattern

- **GIVEN** a custom tool is added to the system (search, volume, datetime)
- **WHEN** the tool definition is created
- **THEN** mandatory use cases are marked with "REQUIRED" or "MUST"
- **AND** trigger conditions are explicit ("whenever the user asks about X")
- **AND** negative cases are documented ("DO NOT use for Y")
- **AND** examples show both good and bad usage patterns

#### Scenario: Tool descriptions are concise for small models

- **GIVEN** the voice gateway targets qwen2.5:0.5b model
- **WHEN** tool descriptions are written
- **THEN** descriptions are under 200 tokens
- **AND** most important instructions appear first
- **AND** examples are limited to 5-7 representative cases
