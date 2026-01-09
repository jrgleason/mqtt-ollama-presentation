# Documentation Capability Specification

## ADDED Requirements

### Requirement: Single Source of Truth Documentation Structure

The project documentation SHALL follow a single source of truth principle where each piece of information exists in exactly one authoritative location, with cross-references used to avoid duplication.

#### Scenario: Finding technology stack information

- **WHEN** a developer or AI assistant needs technology stack details
- **THEN** they MUST consult `docs/TECH-STACK.md` as the authoritative source
- **AND** other documents SHALL reference this file rather than duplicate content

#### Scenario: Finding deployment procedures

- **WHEN** a developer needs deployment instructions
- **THEN** they MUST consult `docs/DEPLOYMENT.md` as the authoritative source
- **AND** CLAUDE.md SHALL reference this file rather than duplicate systemd templates

#### Scenario: Finding integration patterns

- **WHEN** a developer needs external integration details (Auth0, MQTT, Z-Wave, Ollama)
- **THEN** they MUST consult `docs/EXTERNAL-INTEGRATIONS.md` as the authoritative source
- **AND** other documents SHALL reference this file for detailed configuration

### Requirement: AI Assistant Guidelines in CLAUDE.md

CLAUDE.md SHALL contain focused AI assistant guidelines and immediate coding rules, limited to approximately 400 lines, with detailed reference material extracted to dedicated documents.

#### Scenario: AI assistant needs JavaScript rules

- **WHEN** an AI assistant reads CLAUDE.md
- **THEN** it SHALL find prominent JavaScript-only rules in Section 0
- **AND** the rules SHALL be immediately visible without scrolling through extensive documentation

#### Scenario: AI assistant needs task management workflow

- **WHEN** an AI assistant needs to understand task tracking
- **THEN** it SHALL find complete task management rules in CLAUDE.md Section 4
- **AND** the rules SHALL not reference external documents

#### Scenario: AI assistant needs technology details

- **WHEN** an AI assistant needs detailed technology stack information
- **THEN** CLAUDE.md SHALL provide a clear reference link to `docs/TECH-STACK.md`
- **AND** SHALL NOT duplicate the full technology stack content

#### Scenario: AI assistant needs deployment procedures

- **WHEN** an AI assistant needs deployment instructions
- **THEN** CLAUDE.md SHALL provide a clear reference link to `docs/DEPLOYMENT.md`
- **AND** SHALL NOT duplicate systemd service templates or deployment checklists

### Requirement: OpenSpec Project Context in project.md

The `openspec/project.md` file SHALL focus on project structure, architecture patterns, domain context, and conventions needed for OpenSpec workflow, limited to approximately 200 lines.

#### Scenario: Developer needs project context for OpenSpec

- **WHEN** a developer reads `openspec/project.md` for OpenSpec context
- **THEN** they SHALL find project purpose, architecture patterns, and domain context
- **AND** SHALL find references to detailed documentation rather than duplicated content

#### Scenario: Developer needs code style conventions

- **WHEN** a developer needs coding conventions
- **THEN** `openspec/project.md` SHALL provide a brief overview of conventions
- **AND** SHALL reference CLAUDE.md for detailed AI assistant rules

#### Scenario: Developer needs technology stack details

- **WHEN** a developer needs detailed technology information from `openspec/project.md`
- **THEN** it SHALL provide a high-level summary and reference to `docs/TECH-STACK.md`
- **AND** SHALL NOT duplicate model benchmarks or detailed configurations

### Requirement: Technology Stack Reference Document

The project SHALL maintain a comprehensive technology stack reference document at `docs/TECH-STACK.md` containing all technology choices, model recommendations, performance benchmarks, and coding standards.

#### Scenario: Finding Ollama model recommendations

- **WHEN** a developer needs to choose an Ollama model
- **THEN** `docs/TECH-STACK.md` SHALL provide complete model recommendations
- **AND** SHALL include performance benchmarks for each model
- **AND** SHALL explain the rationale for model selection

#### Scenario: Finding coding standards

- **WHEN** a developer needs coding standards (JavaScript patterns, React components, LangChain tools)
- **THEN** `docs/TECH-STACK.md` SHALL provide comprehensive examples
- **AND** SHALL include both good and bad examples for clarity

#### Scenario: Finding troubleshooting tips

- **WHEN** a developer encounters performance issues
- **THEN** `docs/TECH-STACK.md` SHALL provide troubleshooting guidance
- **AND** SHALL include specific optimization techniques

### Requirement: External Integrations Reference Document

The project SHALL maintain an external integrations reference document at `docs/EXTERNAL-INTEGRATIONS.md` containing all third-party integration patterns, configurations, and setup instructions.

#### Scenario: Setting up Z-Wave MQTT integration

- **WHEN** a developer needs to configure Z-Wave devices
- **THEN** `docs/EXTERNAL-INTEGRATIONS.md` SHALL provide the complete MQTT topic format
- **AND** SHALL include the critical warning about not changing the topic format
- **AND** SHALL include command class mapping

#### Scenario: Configuring Auth0 authentication

- **WHEN** a developer needs to set up Auth0
- **THEN** `docs/EXTERNAL-INTEGRATIONS.md` SHALL provide complete configuration details
- **AND** SHALL include all required environment variables

#### Scenario: Setting up Ollama local inference

- **WHEN** a developer needs to configure Ollama
- **THEN** `docs/EXTERNAL-INTEGRATIONS.md` SHALL provide connection details and model setup
- **AND** SHALL reference `docs/TECH-STACK.md` for model selection guidance

### Requirement: Deployment Reference Document

The project SHALL maintain a deployment reference document at `docs/DEPLOYMENT.md` containing all production deployment procedures, systemd service templates, and troubleshooting steps.

#### Scenario: Deploying Oracle Next.js service

- **WHEN** a developer needs to deploy the Oracle service
- **THEN** `docs/DEPLOYMENT.md` SHALL provide a complete pre-deployment checklist
- **AND** SHALL include the systemd service template with absolute paths
- **AND** SHALL include common deployment issues and fixes

#### Scenario: Deploying Voice Gateway service

- **WHEN** a developer needs to deploy the voice-gateway-oww service
- **THEN** `docs/DEPLOYMENT.md` SHALL provide audio device setup instructions
- **AND** SHALL include systemd service template with all environment variables
- **AND** SHALL include service log viewing commands

#### Scenario: Troubleshooting service failures

- **WHEN** a deployed service fails to start
- **THEN** `docs/DEPLOYMENT.md` SHALL provide common failure scenarios
- **AND** SHALL include diagnostic commands (systemctl, journalctl)
- **AND** SHALL include resolution steps for each scenario

### Requirement: Documentation Index in README

The project README SHALL include a comprehensive documentation index that helps developers and AI assistants navigate the documentation structure.

#### Scenario: Finding documentation as a new contributor

- **WHEN** a new contributor opens README.md
- **THEN** they SHALL find a "Documentation" section
- **AND** it SHALL list all documentation files with brief descriptions
- **AND** it SHALL guide them to the appropriate starting point

#### Scenario: AI assistant discovering available documentation

- **WHEN** an AI assistant needs to find project documentation
- **THEN** it SHALL consult README.md for the documentation index
- **AND** SHALL be able to select the appropriate document for the task

### Requirement: Cross-Reference Link Maintenance

All cross-references between documentation files SHALL use consistent link format and be validated to ensure they remain current.

#### Scenario: Following a link from CLAUDE.md to TECH-STACK.md

- **WHEN** a reader follows a link from CLAUDE.md to a reference document
- **THEN** the link SHALL resolve to the correct file
- **AND** the linked section SHALL contain the referenced information

#### Scenario: Updating referenced content

- **WHEN** content in a reference document is updated
- **THEN** all files referencing that content SHALL still have valid links
- **AND** the reference SHALL still point to the correct section

### Requirement: Documentation Size Limits

Documentation files SHALL adhere to size limits to improve readability and maintainability.

#### Scenario: CLAUDE.md line count validation

- **WHEN** CLAUDE.md is edited
- **THEN** the file SHALL not exceed approximately 400 lines
- **AND** if it grows beyond this limit, content SHALL be extracted to reference documents

#### Scenario: project.md line count validation

- **WHEN** `openspec/project.md` is edited
- **THEN** the file SHALL not exceed approximately 200 lines
- **AND** if it grows beyond this limit, content SHALL be extracted to reference documents
