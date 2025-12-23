# transcription-service Specification Delta

## ADDED Requirements

### Requirement: Whisper Transcription Timeout Protection

The TranscriptionService MUST enforce timeout protection for Whisper transcription processes to prevent indefinite hangs and resource exhaustion.

#### Scenario: Transcription Completes Within Timeout
- **GIVEN** a voice command audio file of 3 seconds duration
- **WHEN** transcription is initiated with a 30-second timeout
- **THEN** Whisper process completes successfully within 5 seconds
- **AND** transcription text is returned

#### Scenario: Transcription Exceeds Timeout
- **GIVEN** a corrupted or extremely long audio file
- **WHEN** transcription is initiated with a 30-second timeout
- **THEN** after 30 seconds, the Whisper process is forcefully terminated
- **AND** timeout error is logged with audio file path
- **AND** empty string is returned as fallback
- **AND** no zombie processes remain

#### Scenario: Timeout Configuration
- **GIVEN** a system administrator wants to adjust timeout duration
- **WHEN** configuration value `config.transcription.timeout` is set to 60000
- **THEN** Whisper processes will timeout after 60 seconds
- **AND** the timeout is enforced for all transcription requests

---

### Requirement: voice-gateway-common Module Removal

The voice-gateway-common module MUST be completely removed from the codebase with all functionality migrated to voice-gateway-oww.

#### Scenario: No External Module Dependency
- **GIVEN** the voice-gateway-oww application
- **WHEN** checking package.json dependencies
- **THEN** no reference to "@jrg-voice/common" exists
- **AND** no imports from "@jrg-voice/common" exist in source code
- **AND** voice-gateway-common directory does not exist

#### Scenario: Transcription Functionality Preserved
- **GIVEN** the voice-gateway-common module has been removed
- **WHEN** a user triggers voice transcription
- **THEN** transcription completes successfully using internal TranscriptionService implementation
- **AND** behavior is identical to previous implementation (except timeout support)
- **AND** no import errors occur

#### Scenario: Module Consolidation
- **GIVEN** functionality previously in voice-gateway-common/src/stt.js
- **WHEN** inspecting TranscriptionService class
- **THEN** all Whisper transcription logic exists as a private method
- **AND** implementation includes timeout protection
- **AND** no code duplication exists between modules

---

### Requirement: Subprocess Cleanup on Timeout

When a Whisper transcription process times out, the subprocess MUST be properly cleaned up to prevent resource leaks.

#### Scenario: Subprocess Termination on Timeout
- **GIVEN** a Whisper transcription process running for 31 seconds
- **WHEN** timeout limit of 30 seconds is reached
- **THEN** AbortController signals the subprocess to terminate
- **AND** subprocess exits within 1 second
- **AND** no orphaned Whisper processes remain

#### Scenario: Graceful Error Handling
- **GIVEN** a Whisper process that is forcefully terminated
- **WHEN** the termination completes
- **THEN** an AbortError is caught and logged
- **AND** error message includes context (audio file path, timeout duration)
- **AND** application continues normal operation
- **AND** next transcription request works correctly

---

## REMOVED Requirements

None. This change adds new requirements for timeout protection and module consolidation without removing any existing functionality.

---

## MODIFIED Requirements

None. Existing transcription behavior remains unchanged except for the addition of timeout protection.
