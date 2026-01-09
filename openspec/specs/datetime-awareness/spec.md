# datetime-awareness Specification

## Purpose
TBD - created by archiving change improve-datetime-tool-usage. Update Purpose after archive.
## Requirements
### Requirement: Current Date Context in Search Tools

The system SHALL provide the current date to the AI when it uses tools that require temporal awareness.

**Rationale:** LLMs have no inherent knowledge of the current date. Without explicit date context, queries about "current", "this year", or "now" may use incorrect dates.

#### Scenario: Search with temporal intent

- **GIVEN** the user asks a question with temporal words ("current", "this year", "now", "today", "latest")
- **AND** the current date is 2026-01-04
- **WHEN** the AI formulates a search query
- **THEN** the AI uses the correct current date/year in the query
- **AND** the search results are relevant to the actual current timeframe

#### Scenario: Search without temporal intent

- **GIVEN** the user asks a general knowledge question without temporal words
- **WHEN** the AI formulates a search query
- **THEN** the AI does not unnecessarily add date constraints
- **AND** the search query focuses on the user's actual intent

---

### Requirement: Date Placeholder Support

The prompt loader SHALL support a `{{CURRENT_DATE}}` placeholder that gets replaced with the actual current date at runtime.

**Rationale:** Prompts need to be dynamically updated with the current date since they are static files.

#### Scenario: Date placeholder replacement

- **GIVEN** a prompt file contains `{{CURRENT_DATE}}`
- **WHEN** the prompt is loaded
- **THEN** the placeholder is replaced with the current date in ISO 8601 format (YYYY-MM-DD)

#### Scenario: Prompt without placeholder

- **GIVEN** a prompt file does not contain `{{CURRENT_DATE}}`
- **WHEN** the prompt is loaded
- **THEN** the prompt content is returned unchanged

