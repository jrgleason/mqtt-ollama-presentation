# documentation Spec Delta

## ADDED Requirements

### Requirement: Reference-Style Link Pattern

Documentation files SHALL use reference-style markdown links to improve maintainability and centralize link management.

#### Scenario: Links in README.md navigation index

- **WHEN** the docs/README.md file contains navigation links
- **THEN** all links SHALL use reference-style format with definitions at file bottom
- **AND** link definitions SHALL be organized in a dedicated `<!-- Links -->` section

#### Scenario: Updating a file path

- **WHEN** a documentation file is renamed or moved
- **THEN** only the link definition needs to be updated in one place
- **AND** all inline references SHALL automatically point to the new location

### Requirement: Consolidated Performance Documentation

Performance-related documentation SHALL be consolidated into a single authoritative file at `docs/PERFORMANCE.md`.

#### Scenario: Finding performance optimization guidance

- **WHEN** a developer needs to optimize voice pipeline performance
- **THEN** they SHALL consult `docs/PERFORMANCE.md` as the single source of truth
- **AND** the file SHALL include model selection guidance, benchmarks, and optimization history

#### Scenario: Understanding performance tradeoffs

- **WHEN** a developer needs to understand AI provider latency tradeoffs
- **THEN** `docs/PERFORMANCE.md` SHALL provide comparison tables
- **AND** SHALL include recommendations based on use case (speed vs quality)

### Requirement: No Broken Internal Links

All internal documentation links SHALL resolve to existing files and valid sections.

#### Scenario: Following navigation links

- **WHEN** a reader follows any internal link in the docs directory
- **THEN** the link SHALL resolve to an existing file
- **AND** if the link targets a section, that section SHALL exist in the target file

#### Scenario: Validating links during review

- **WHEN** a documentation change is proposed
- **THEN** all internal links in the changed files SHALL be verified
- **AND** broken links SHALL be fixed before the change is merged

### Requirement: JavaScript-Only Documentation Consistency

All documentation SHALL consistently refer to JavaScript as the project language, with no TypeScript references.

#### Scenario: Technology references in documentation

- **WHEN** documentation mentions the project programming language
- **THEN** it SHALL reference JavaScript (ES6+)
- **AND** SHALL NOT mention TypeScript except in historical archive context

#### Scenario: Code examples in documentation

- **WHEN** documentation includes code examples
- **THEN** examples SHALL use JavaScript syntax
- **AND** SHALL NOT include TypeScript type annotations
