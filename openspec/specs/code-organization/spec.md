# code-organization Specification

## Purpose
TBD - created by archiving change rename-class-files-to-camelcase. Update Purpose after archive.
## Requirements
### Requirement: File Naming Conventions

JavaScript files in the voice-gateway-oww module MUST follow naming conventions based on their exports:

1. **PascalCase for Class Files** - Files that export ES6 classes use PascalCase (e.g., `AnthropicClient.js`)
2. **camelCase for Utility Modules** - Files that export functions/utilities use camelCase (e.g., `mqttClient.js`)
3. **lowercase for Conventional Files** - Entry points, config, constants remain lowercase (e.g., `main.js`, `config.js`)

#### Scenario: Importing a Class File
- **GIVEN** a file `AnthropicClient.js` exports the `AnthropicClient` class
- **WHEN** another file needs to import the class
- **THEN** the import statement should be `import {AnthropicClient} from './AnthropicClient.js'`
- **AND** the file name matches the class name (both PascalCase)

#### Scenario: Importing a Utility Module
- **GIVEN** a file `mqttClient.js` exports utility functions for MQTT
- **WHEN** another file needs to import the functions
- **THEN** the import statement should be `import {connectMQTT} from './mqttClient.js'`
- **AND** the file name is camelCase describing its purpose

#### Scenario: Conventional File Naming
- **GIVEN** a project entry point or configuration file
- **WHEN** creating or naming the file
- **THEN** conventional names like `main.js`, `config.js`, `constants.js` remain lowercase
- **AND** these exceptions are well-established JavaScript conventions

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

