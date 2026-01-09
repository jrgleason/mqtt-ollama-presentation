# code-organization Spec Delta

## ADDED Requirements

### Requirement: Prompt Files Directory Structure

The voice gateway SHALL store all AI prompts in a dedicated `prompts/` directory with markdown files.

#### Scenario: Prompts directory exists with required structure

- **GIVEN** the voice-gateway-oww application
- **WHEN** the application directory is inspected
- **THEN** a `prompts/` directory exists at `apps/voice-gateway-oww/prompts/`
- **AND** subdirectories `system/` and `tools/` exist within `prompts/`
- **AND** all prompt files use `.md` extension

#### Scenario: System prompts are stored in system subdirectory

- **GIVEN** the `prompts/system/` directory
- **WHEN** system prompts are needed
- **THEN** the following files exist:
  - `home-assistant.md` - core personality and behavior rules
  - `ollama-hints.md` - Ollama-specific instructions
  - `device-context.md` - device tool availability hint
  - `datetime-context.md` - datetime tool availability hint

#### Scenario: Tool prompts are stored in tools subdirectory

- **GIVEN** the `prompts/tools/` directory
- **WHEN** tool descriptions are needed
- **THEN** the following files exist:
  - `search-web.md` - search tool main description
  - `search-web-query.md` - search query parameter description
  - `datetime.md` - datetime tool description
  - `volume-control.md` - volume control tool description

### Requirement: Prompt Loader Utility

The system SHALL provide a utility module for loading prompts from markdown files.

#### Scenario: Load prompt by name

- **GIVEN** a prompt file exists at `prompts/system/home-assistant.md`
- **WHEN** `loadPrompt('system/home-assistant')` is called
- **THEN** the file content is returned as a trimmed string
- **AND** markdown frontmatter (if any) is stripped

#### Scenario: Template variable substitution

- **GIVEN** a prompt file contains `{{year}}` placeholder
- **WHEN** `loadPrompt('tools/search-web', { year: 2026 })` is called
- **THEN** all `{{year}}` occurrences are replaced with `2026`

#### Scenario: Prompt caching

- **GIVEN** a prompt was previously loaded
- **WHEN** the same prompt with same variables is requested again
- **THEN** the cached version is returned
- **AND** no file I/O occurs

#### Scenario: Missing prompt file throws error

- **GIVEN** no prompt file exists at `prompts/missing/file.md`
- **WHEN** `loadPrompt('missing/file')` is called
- **THEN** an error is thrown with clear file path information
- **AND** the application can fail fast at startup

#### Scenario: Preload validation at startup

- **GIVEN** the application is starting
- **WHEN** `preloadPrompts()` is called in main.js
- **THEN** all required prompt files are loaded and validated
- **AND** missing files cause startup failure with clear error

### Requirement: No Inline Prompt Strings

JavaScript source files SHALL NOT contain inline prompt strings longer than 100 characters.

#### Scenario: Tool descriptions use prompt loader

- **GIVEN** a tool definition in `search-tool.js`
- **WHEN** the tool description is defined
- **THEN** it uses `loadPrompt()` to load from markdown file
- **AND** no multi-line template literal prompt exists in the file

#### Scenario: System prompts use prompt loader

- **GIVEN** the AIRouter constructs system prompts
- **WHEN** the default system prompt is defined
- **THEN** it uses `loadPrompt()` to load base prompt
- **AND** dynamic additions also use `loadPrompt()`

#### Scenario: AI client fallbacks use prompt loader

- **GIVEN** AnthropicClient or OllamaClient have fallback prompts
- **WHEN** no systemPrompt option is provided
- **THEN** the fallback uses `loadPrompt()`
- **AND** prompts are not duplicated across clients

## MODIFIED Requirements

### Requirement: Module Organization (MODIFIED)

The voice gateway SHALL organize source files into logical directories with a new `prompts/` directory for AI prompt content.

#### Scenario: Prompts directory added to module structure

- **GIVEN** the voice gateway module organization
- **WHEN** the directory structure is documented
- **THEN** `prompts/` is listed alongside `src/`, with subdirectories:
  - `prompts/system/` - system prompt markdown files
  - `prompts/tools/` - tool description markdown files

**Previous Behavior:** Only `src/` subdirectories were documented

**Rationale:** Prompts are a distinct content type that benefits from separation from code, enabling non-developer editing and clearer version control.
