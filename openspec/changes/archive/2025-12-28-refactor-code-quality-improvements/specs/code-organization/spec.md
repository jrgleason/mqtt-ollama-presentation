# code-organization Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

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

## Notes

**Implementation Context:**
- This spec delta addresses technical debt identified in `openspec/project.md`
- All changes are internal code quality improvements
- No external APIs or behavior changes
- Existing tests should continue passing

**Related Requirements:**
- Existing: `code-organization > File Naming Conventions` (modified to clarify constants naming)
- Existing: `code-organization > Import Path Consistency` (extended with simplification guidance)

**Why These Requirements:**
- Named constants improve code readability and maintainability
- Function length limits enforce Single Responsibility Principle
- Single source of truth reduces bugs and maintenance burden
- Resolved TODOs prevent confusion and technical debt accumulation
- Simplified imports improve code navigation and understanding
