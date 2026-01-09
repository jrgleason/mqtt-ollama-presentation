# code-organization Specification

## Purpose
TBD - created by archiving change rename-class-files-to-camelcase. Update Purpose after archive.
## Requirements
### Requirement: File Naming Conventions
Files SHALL follow consistent naming conventions based on content type.

**Added Clarification:** Constants modules SHALL use kebab-case naming (previously unspecified).

**Naming Rules:**
- Classes: PascalCase (e.g., `AudioPlayer.js`, `IntentClassifier.js`)
- Utilities: kebab-case (e.g., `audio-utils.js`, `error-handling.js`)
- Constants: kebab-case (e.g., `timing.js`, `thresholds.js`)
- Services: PascalCase (e.g., `VoiceInteractionOrchestrator.js`)

#### Scenario: Constants modules use kebab-case
- **GIVEN** a new constants module is created
- **WHEN** the module contains constant definitions
- **THEN** the filename uses kebab-case (e.g., `timing.js`, not `Timing.js`)

#### Scenario: Class files use PascalCase
- **GIVEN** a new class module is created
- **WHEN** the module exports a class
- **THEN** the filename uses PascalCase matching the class name

---

### Requirement: Import Path Consistency

All import paths MUST reference the correct filename case to ensure cross-platform compatibility.

#### Scenario: Cross-Platform Import Compatibility
- **GIVEN** a codebase deployed on both macOS (case-insensitive) and Linux (case-sensitive)
- **WHEN** importing `AnthropicClient` from `AnthropicClient.js`
- **THEN** the import must use exact case: `'./AnthropicClient.js'`
- **AND** the import works on both filesystems without errors

#### Scenario: Detecting Broken Imports
- **GIVEN** a file has been renamed from `anthropic-client.js` to `AnthropicClient.js`
- **WHEN** running the linter (`npm run lint`)
- **THEN** any imports still using the old path must be flagged as errors
- **AND** the developer must update all import statements

---

### Requirement: Git History Preservation

When renaming files for organizational purposes, git history MUST be preserved using `git mv`.

#### Scenario: Preserving File History During Rename
- **GIVEN** a file `anthropic-client.js` with 50 commits of history
- **WHEN** renaming to `AnthropicClient.js` using `git mv`
- **THEN** running `git log --follow src/AnthropicClient.js` shows all 50 commits
- **AND** file blame correctly attributes lines to original authors

#### Scenario: Atomic Rename Commit
- **GIVEN** 8 files being renamed for consistency
- **WHEN** creating the rename commit
- **THEN** all renames and import updates are in a single atomic commit
- **AND** the commit message clearly describes the naming standardization

### Requirement: Named Constants for Magic Numbers
All numeric literals that represent domain concepts SHALL be defined as named constants with explanatory comments.

#### Scenario: Timeout constants are named and documented
- **GIVEN** code needs to specify a timeout duration
- **WHEN** the timeout is used
- **THEN** it uses a named constant (e.g., `TOOL_EXECUTION_WARNING_MS`) with a comment explaining its purpose

#### Scenario: Threshold constants are named and documented
- **GIVEN** code needs to compare against a threshold value
- **WHEN** the threshold is checked
- **THEN** it uses a named constant (e.g., `VAD_SILENCE_THRESHOLD`) with a comment explaining what it represents

#### Scenario: Magic numbers are not used directly
- **GIVEN** a numeric literal appears in code (e.g., `1000`, `0.01`)
- **WHEN** the number represents a domain concept (not a mathematical constant like `2` for doubling)
- **THEN** it is extracted to a named constant in an appropriate constants module

### Requirement: Function Length Limits
Functions SHALL be focused on a single responsibility and kept under 100 lines when possible.

#### Scenario: Monolithic function is refactored
- **GIVEN** a function exceeds 100 lines
- **WHEN** the function handles multiple concerns (setup, event handling, state management)
- **THEN** it is refactored into focused helper functions, each under 100 lines

#### Scenario: Helper functions have clear names
- **GIVEN** helper functions are extracted from a larger function
- **WHEN** the helpers are defined
- **THEN** they have descriptive names indicating their specific responsibility

#### Scenario: Main function orchestrates helpers
- **GIVEN** a function is refactored into helpers
- **WHEN** the main function is called
- **THEN** it orchestrates the helper functions in a clear, readable sequence

### Requirement: Single Source of Truth for Patterns
Repeated patterns SHALL be extracted to a single module to avoid duplication.

#### Scenario: Query detection patterns are centralized
- **GIVEN** multiple modules need to detect query types (device, datetime, control)
- **WHEN** query detection is needed
- **THEN** all modules use a shared IntentClassifier instead of duplicating patterns

#### Scenario: Pattern changes are applied once
- **GIVEN** a query detection pattern needs to be updated
- **WHEN** the pattern is changed
- **THEN** the change is made in one place (IntentClassifier) and affects all consumers

### Requirement: TODO Comments Must Be Resolved
Code SHALL NOT contain unresolved TODO comments without clear explanations.

#### Scenario: TODO is implemented or removed
- **GIVEN** a TODO comment exists in the codebase
- **WHEN** the code is reviewed
- **THEN** the TODO is either implemented, removed, or replaced with a clear explanation of why it's deferred

#### Scenario: Implementation blockers are documented
- **GIVEN** a TODO cannot be implemented immediately
- **WHEN** the TODO is kept in code
- **THEN** it includes a comment explaining the blocker and expected resolution timeline

### Requirement: Import Path Simplification
Import statements SHALL use the simplest path possible without excessive nesting.

#### Scenario: Relative imports are minimized
- **GIVEN** a module needs to import from another module
- **WHEN** the import path would require 3+ levels of traversal (../../../)
- **THEN** consider restructuring or using path aliases

#### Scenario: Unused imports are removed
- **GIVEN** an import statement exists in a file
- **WHEN** the imported symbol is not used
- **THEN** the import is removed

---

### Requirement: CO-04 - State Machine Organization Pattern
State machines MUST be organized in a dedicated `src/state-machines/` directory with one file per machine, exported as factory functions.

#### Scenario: State machine file structure
**Given** a new state machine is needed
**When** creating the machine
**Then** create file `src/state-machines/MachineName.js`
**And** export factory function `createMachineNameMachine()`
**And** machine encapsulates all states, events, guards, and actions

#### Scenario: State machine import pattern
**Given** a component needs to use a state machine
**When** importing the machine
**Then** import from `src/state-machines/MachineName.js`
**And** call factory function to create machine instance
**And** use XState `interpret()` to start the service

