# Documentation Specification Delta

## ADDED Requirements

### Requirement: App README Documentation Links

All app README.md files MUST have working links to documentation files.

#### Scenario: Voice Gateway README References Performance Documentation
GIVEN the voice-gateway-oww README.md documentation section
WHEN a user clicks the performance optimization link
THEN they are directed to docs/PERFORMANCE.md (not the deleted performance-optimization.md)

#### Scenario: Oracle README References Deployment Documentation
GIVEN the Oracle README.md production deployment section
WHEN a user clicks the systemd setup link
THEN they are directed to docs/DEPLOYMENT.md (not the non-existent oracle-systemd-setup.md)

### Requirement: Archive Folder Consolidation

The docs/archive/ folder MUST contain only README.md with comprehensive summaries of archived content.

#### Scenario: Archive Analysis Reports Are Summarized
GIVEN historical analysis reports in docs/archive/
WHEN the cleanup is complete
THEN the key findings are preserved in archive/README.md
AND the original analysis files (TTS_MIGRATION_HISTORY.md, TTS_DUPLICATE_ANALYSIS.md, DUPLICATE_FILES_ANALYSIS.md) are deleted

#### Scenario: Archive README Contains Refactoring History
GIVEN the archive/README.md documentation
WHEN a developer needs historical context
THEN they can find summaries of TTS migration timeline, duplicate analysis results, and refactoring status

### Requirement: Voice Gateway Developer Documentation

The apps/voice-gateway-oww/docs/ folder MUST contain a single comprehensive DEVELOPER_GUIDE.md.

#### Scenario: Developer Guide Contains All Implementation Details
GIVEN the voice gateway DEVELOPER_GUIDE.md
WHEN a developer needs implementation details
THEN they can find wake word configuration, microphone setup, file naming conventions, startup orchestration, beep isolation, and MCP retry logic in one document

#### Scenario: Voice Gateway Docs Folder Is Consolidated
GIVEN the apps/voice-gateway-oww/docs/ folder
WHEN the consolidation is complete
THEN only DEVELOPER_GUIDE.md exists
AND BEEP_ISOLATION.md, MCP_RETRY_IMPLEMENTATION.md, and STARTUP_AND_ORCHESTRATION.md are deleted
