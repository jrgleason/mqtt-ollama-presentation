# voice-activity-detection Specification

## Purpose
TBD - created by archiving change extract-vad-constants. Update Purpose after archive.
## Requirements
### Requirement: VAD Configuration Constants

The voice gateway SHALL define all Voice Activity Detection (VAD) threshold values as named constants with comprehensive documentation explaining their purpose, typical ranges, and tuning guidance.

#### Scenario: Developer reviews VAD configuration

- **WHEN** a developer opens the main.js file
- **THEN** they SHALL find a VAD_CONSTANTS object containing all threshold values
- **AND** each constant SHALL have JSDoc comments explaining its purpose
- **AND** typical value ranges SHALL be documented
- **AND** tuning guidance SHALL be provided for each parameter

#### Scenario: Developer adjusts VAD sensitivity

- **WHEN** a developer needs to tune VAD performance
- **THEN** they SHALL find all thresholds in one centralized location
- **AND** they SHALL understand what each threshold controls
- **AND** they SHALL know the acceptable range for each value
- **AND** they SHALL understand the trade-offs of changing each value

### Requirement: Pre-Roll Buffer Constant

The system SHALL define PRE_ROLL_MS constant set to 300 milliseconds to capture audio context before the wake word is detected.

#### Scenario: Wake word triggers recording

- **WHEN** the wake word is detected
- **THEN** the recording SHALL include 300ms of audio captured before the trigger
- **AND** this preserves any speech that started before wake word recognition completed
- **AND** the pre-roll duration SHALL be configurable via the PRE_ROLL_MS constant

### Requirement: Silence Detection Threshold

<<<<<<< HEAD
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
=======
The system SHALL define SILENCE_THRESHOLD constant set to 0.01 RMS energy to distinguish speech from background noise.

#### Scenario: Detecting speech vs silence

- **WHEN** processing audio samples during recording
- **THEN** audio with RMS energy below 0.01 SHALL be classified as silence
- **AND** audio with RMS energy above 0.01 SHALL be classified as potential speech
- **AND** the threshold SHALL account for typical voice energy (0.05-0.2) vs background (<0.01)

#### Scenario: Environment noise adaptation

- **WHEN** the environment has different noise characteristics
- **THEN** developers SHALL be able to adjust SILENCE_THRESHOLD
- **AND** documentation SHALL explain that lower values increase sensitivity (more noise captured)
- **AND** documentation SHALL explain that higher values reduce sensitivity (may cut off quiet speech)
>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)

### Requirement: Minimum Speech Duration

The system SHALL define MIN_SPEECH_MS constant set to 700 milliseconds to filter out false positives like coughs, clicks, or brief noises.

#### Scenario: Filtering false positives

- **WHEN** detecting trailing silence during recording
- **THEN** the system SHALL NOT stop recording if total recorded audio is less than 700ms
- **AND** this prevents processing brief non-speech sounds
- **AND** ensures only meaningful utterances are transcribed

#### Scenario: Accepting valid short commands

- **WHEN** a user says a brief command like "lights on"
- **THEN** if the utterance exceeds 700ms, it SHALL be processed
- **AND** the minimum duration SHALL balance false positive prevention with command responsiveness

### Requirement: Trailing Silence Duration

The system SHALL define TRAILING_SILENCE_MS constant (default 1500ms, configurable via config.vad.trailingSilenceMs) to determine when a user has finished speaking.

#### Scenario: Detecting end of utterance

- **WHEN** recording user speech
- **THEN** if silence duration reaches TRAILING_SILENCE_MS, recording SHALL stop
- **AND** the grace period SHALL allow for natural pauses mid-sentence
- **AND** the value SHALL be configurable for different speaking styles

#### Scenario: Handling slow speakers

- **WHEN** a user speaks slowly with long pauses
- **THEN** increasing TRAILING_SILENCE_MS SHALL prevent premature recording stop
- **AND** the trade-off SHALL be documented (longer wait vs. better pause handling)

### Requirement: Maximum Utterance Length

The system SHALL define MAX_UTTERANCE_MS constant (default 10000ms, configurable via config.vad.maxUtteranceMs) to prevent infinite recording if silence is never detected.

#### Scenario: Preventing infinite recording

- **WHEN** continuous noise or speech exceeds MAX_UTTERANCE_MS
- **THEN** recording SHALL stop automatically at 10 seconds
- **AND** this prevents memory overflow and ensures timely processing

#### Scenario: Handling long queries

- **WHEN** a user has a complex multi-sentence question
- **THEN** they SHALL have up to 10 seconds to complete their utterance
- **AND** the maximum duration SHALL be configurable for different use cases

### Requirement: Grace Period Before Stop

The system SHALL define GRACE_BEFORE_STOP_MS constant (default 1200ms, configurable via config.vad.graceBeforeStopMs) to allow users time to start speaking after the wake word.

#### Scenario: User starts speaking after wake word

- **WHEN** wake word is detected and recording starts
- **THEN** silence detection SHALL be suppressed for the first 1200ms
- **AND** this allows users time to formulate and begin their question
- **AND** prevents premature recording stop before user speaks

#### Scenario: Different user response times

- **WHEN** some users need more time to start speaking
- **THEN** GRACE_BEFORE_STOP_MS SHALL be adjustable
- **AND** the trade-off SHALL be documented (longer grace = delayed response to silence-only triggers)

### Requirement: Sample Conversion Helper

The system SHALL provide an msToSamples(milliseconds) helper function to convert time durations to audio sample counts based on the configured sample rate.

#### Scenario: Converting milliseconds to samples

- **WHEN** a VAD threshold is defined in milliseconds
- **THEN** msToSamples() SHALL convert it to sample count using SAMPLE_RATE
- **AND** the calculation SHALL be: Math.floor((milliseconds / 1000) * SAMPLE_RATE)
- **AND** this ensures consistent conversion logic across all thresholds

#### Scenario: Changing sample rate

- **WHEN** the audio sample rate changes (e.g., 16000 to 8000 Hz)
- **THEN** all VAD thresholds SHALL automatically adjust via msToSamples()
- **AND** no manual recalculation of sample counts SHALL be required

### Requirement: Constant Naming Convention

All VAD-related constants SHALL follow UPPER_SNAKE_CASE naming convention and be grouped in a VAD_CONSTANTS object for discoverability.

#### Scenario: Discovering VAD configuration

- **WHEN** a developer searches for VAD configuration
- **THEN** they SHALL find a single VAD_CONSTANTS object
- **AND** all threshold constants SHALL be co-located
- **AND** naming SHALL clearly indicate purpose (e.g., PRE_ROLL_MS, SILENCE_THRESHOLD)

### Requirement: Configuration Override Support

Constants that support environment/config overrides SHALL document the config path and fallback to sensible defaults if not provided.

#### Scenario: Using default values

- **WHEN** no config override is provided
- **THEN** constants SHALL use documented default values
- **AND** defaults SHALL be tuned for typical home automation voice commands

#### Scenario: Overriding via configuration

- **WHEN** config.vad.trailingSilenceMs is set
- **THEN** TRAILING_SILENCE_MS SHALL use the config value
- **AND** this allows runtime tuning without code changes
- **AND** the config path SHALL be documented in comments

<<<<<<< HEAD
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

=======
>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)
