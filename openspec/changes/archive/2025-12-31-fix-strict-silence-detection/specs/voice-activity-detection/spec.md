# voice-activity-detection Spec Delta

## MODIFIED Requirements

### Requirement: Silence Detection Threshold

The system SHALL define SILENCE_THRESHOLD constant set to **0.003** RMS energy by default (configurable via `config.vad.silenceThreshold`) to distinguish speech from background noise, with a single source of truth in audio/constants.js.

**Previous Implementation**: Hardcoded 0.01 in audio/constants.js, with duplicate undocumented 0.005 threshold in main.js VAD_CONSTANTS causing inconsistency.

**Rationale**:
- Reduces false positives (users speaking but classified as "true silence")
- Eliminates duplicate threshold definitions
- Provides runtime configurability for different environments
- More lenient default (0.003) improves UX while maintaining MIN_SPEECH_MS filtering

#### Scenario: Detecting quiet speech vs silence

**Given** a user speaks quietly after wake word
**When** processing audio samples during recording
**Then** audio with RMS energy below 0.003 SHALL be classified as silence
**And** audio with RMS energy above 0.003 SHALL be classified as potential speech
**And** the threshold SHALL account for typical voice energy (0.01-0.2) vs very quiet speech (0.003-0.01)

#### Scenario: Environment noise adaptation with configuration

**Given** the environment has different noise characteristics
**When** config.vad.silenceThreshold is set to a custom value
**Then** the VAD SHALL use the configured threshold
**And** if not configured, SHALL default to 0.003
**And** the threshold SHALL be sourced from audio/constants.js only (no duplicates)
**And** logs SHALL show energy levels to aid threshold tuning

#### Scenario: Diagnostic logging for threshold tuning

**Given** recording is in progress
**When** audio energy is between 0.002 and 0.004 (close to threshold)
**Then** system SHALL log a warning "⚠️ Energy close to threshold - may need adjustment"
**And** SHALL log actual energy value with threshold for comparison
**And** SHALL help users identify if threshold needs tuning for their environment

#### Scenario: Single source of truth

**Given** multiple files need SILENCE_THRESHOLD value
**When** any component requires the threshold
**Then** it SHALL import from audio/constants.js
**And** NO duplicate definitions SHALL exist in main.js or elsewhere
**And** all threshold references SHALL use the same getSilenceThreshold(config) helper

## ADDED Requirements

### Requirement: VAD Threshold Configuration Override

The system SHALL support runtime configuration of the silence detection threshold via `config.vad.silenceThreshold` environment variable, allowing users to tune sensitivity without code changes.

#### Scenario: Override threshold via configuration

**Given** a user has a quieter speaking voice or different microphone
**When** VAD_SILENCE_THRESHOLD environment variable is set to "0.002"
**Then** config.vad.silenceThreshold SHALL be set to 0.002
**And** VoiceActivityDetector SHALL use 0.002 as the threshold
**And** logs SHALL reflect the custom threshold value
**And** this SHALL work without requiring code modifications

#### Scenario: Fall back to sensible default

**Given** no VAD_SILENCE_THRESHOLD environment variable is set
**When** the system starts up
**Then** config.vad.silenceThreshold SHALL default to 0.003
**And** this default SHALL be more lenient than the previous 0.005/0.01 values
**And** documentation SHALL explain why 0.003 was chosen as the new default

### Requirement: Enhanced VAD Diagnostic Logging

The system SHALL provide detailed diagnostic logging during recording to help users understand why silence detection is or isn't triggering, and guide threshold tuning.

#### Scenario: Log energy levels during grace period

**Given** recording has just started (within grace period)
**When** audio chunks are processed
**Then** system SHALL log debug messages with current energy
**And** SHALL indicate grace period is active (preventing premature stop)
**And** SHALL help users understand VAD behavior during startup

#### Scenario: Suggest threshold adjustments

**Given** multiple consecutive recordings are skipped as "true silence"
**When** energy levels consistently fall just below threshold (0.002-0.003)
**Then** system SHALL log "💡 Suggestion: Consider lowering VAD_SILENCE_THRESHOLD"
**And** SHALL provide energy range seen in recent recordings
**And** SHALL help users identify threshold tuning opportunities

#### Scenario: Clear feedback on threshold decisions

**Given** recording ends due to silence detection
**When** logging the "skipping transcription" message
**Then** log SHALL include avgEnergy value (6 decimal places)
**And** SHALL include current threshold value
**And** SHALL categorize as "True silence" (< 0.002) or "Close to threshold" (0.002-0.004)
**And** SHALL provide actionable guidance based on the category
