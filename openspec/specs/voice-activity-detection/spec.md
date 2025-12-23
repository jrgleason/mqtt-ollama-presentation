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

