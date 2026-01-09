# audio-processing Specification

## Purpose
TBD - created by archiving change refactor-audio-utils. Update Purpose after archive.
## Requirements
### Requirement: Audio Configuration Constants

The system SHALL provide audio configuration constants for consistent audio processing across all modules.

#### Scenario: Constants available for import

- **WHEN** a module needs audio configuration values
- **THEN** it SHALL import SAMPLE_RATE (16000 Hz) from audio/constants.js
- **AND** it SHALL import CHUNK_SIZE (1280 samples) from audio/constants.js
- **AND** these values SHALL be used for all audio processing operations

### Requirement: Pure Audio Utility Functions

The system SHALL provide pure audio processing functions with no side effects.

#### Scenario: Calculate RMS energy of audio samples

- **WHEN** rmsEnergy() is called with an array of audio samples
- **THEN** it SHALL calculate the root mean square energy
- **AND** it SHALL return 0 if samples array is empty or null
- **AND** it SHALL not modify the input samples array

#### Scenario: Write WAV file from PCM samples

- **WHEN** writeWavFile() is called with file path and PCM samples
- **THEN** it SHALL create a WAV file at the specified path
- **AND** it SHALL support configurable channels (default: 1)
- **AND** it SHALL support configurable sample rate (default: 16000)
- **AND** it SHALL support configurable bit depth (default: 16)
- **AND** it SHALL convert Float32 samples to Int16 format
- **AND** it SHALL reject if file write fails or times out (5s)

#### Scenario: Validate ALSA audio device

- **WHEN** checkAlsaDevice() is called with an ALSA device name
- **THEN** it SHALL spawn arecord to test the device
- **AND** it SHALL use specified sample rate (default: 16000)
- **AND** it SHALL use specified channels (default: 1)
- **AND** it SHALL record 1 second to /dev/null for validation
- **AND** it SHALL resolve if device is accessible
- **AND** it SHALL reject if device is not found or timeout occurs (5s)

### Requirement: Platform-Specific Audio Playback

The system SHALL provide a class-based AudioPlayer for platform-specific PCM audio playback.

#### Scenario: Initialize AudioPlayer with dependencies

- **WHEN** AudioPlayer is constructed with config and logger
- **THEN** it SHALL store the config reference
- **AND** it SHALL store the logger reference
- **AND** it SHALL detect if platform is macOS (darwin)
- **AND** it SHALL not create any side effects (no global state)

#### Scenario: Play audio on macOS platform

- **WHEN** play() is called with PCM audio on macOS
- **THEN** it SHALL create a temporary WAV file
- **AND** it SHALL use afplay command to play the WAV file
- **AND** it SHALL delete the temporary file after playback completes
- **AND** it SHALL delete the temporary file if playback fails
- **AND** it SHALL reject if afplay exits with non-zero code
- **AND** it SHALL log playback operations with sample count and duration

#### Scenario: Play audio on Linux platform

- **WHEN** play() is called with PCM audio on Linux
- **THEN** it SHALL use aplay command with ALSA device
- **AND** it SHALL use speaker device from config (fallback to mic device)
- **AND** it SHALL stream PCM data to aplay stdin
- **AND** it SHALL use S16_LE format at 16000 Hz mono
- **AND** it SHALL reject if aplay exits with non-zero code
- **AND** it SHALL log playback operations with sample count and duration

#### Scenario: Handle empty audio buffer

- **WHEN** play() is called with null or empty PCM audio
- **THEN** it SHALL log a debug warning
- **AND** it SHALL resolve immediately without playing audio
- **AND** it SHALL not spawn any child processes

### Requirement: XState Service Compatibility Helpers

The system SHALL provide XState version compatibility helpers for working with XState v4 and v5 APIs.

#### Scenario: Get snapshot from XState v5 service

- **WHEN** getServiceSnapshot() is called with an XState v5 service
- **THEN** it SHALL call service.getSnapshot() method
- **AND** it SHALL return the snapshot object

#### Scenario: Get snapshot from XState v4 service

- **WHEN** getServiceSnapshot() is called with an XState v4 service
- **THEN** it SHALL access service.state property
- **AND** it SHALL return the state object

#### Scenario: Safely reset detector

- **WHEN** safeDetectorReset() is called with a detector instance
- **THEN** it SHALL call detector.reset() if method exists
- **AND** it SHALL log the reset operation with context
- **AND** it SHALL catch and log any errors during reset
- **AND** it SHALL not throw exceptions to caller

#### Scenario: Handle detector without reset method

- **WHEN** safeDetectorReset() is called with null or detector without reset()
- **THEN** it SHALL not throw an error
- **AND** it SHALL not attempt to call reset()
- **AND** it SHALL handle gracefully

### Requirement: Wake Word Detector State Management

The system SHALL provide a DetectorStateManager class for managing OpenWakeWord detector state lifecycle.

#### Scenario: Initialize DetectorStateManager with defaults

- **WHEN** DetectorStateManager is constructed with no arguments
- **THEN** it SHALL use default frames (76)
- **AND** it SHALL use default bins (32)
- **AND** it SHALL not create any state (lazy initialization)

#### Scenario: Initialize DetectorStateManager with custom configuration

- **WHEN** DetectorStateManager is constructed with {frames: 100, bins: 64}
- **THEN** it SHALL store frames as 100
- **AND** it SHALL store bins as 64

#### Scenario: Create new mel buffer

- **WHEN** createMelBuffer() is called
- **THEN** it SHALL create an array of length equal to frames
- **AND** each frame SHALL be a Float32Array of length equal to bins
- **AND** all values SHALL be initialized to 0

#### Scenario: Create new detector state

- **WHEN** newDetectorState() is called
- **THEN** it SHALL return an object with melBuffer (created mel buffer)
- **AND** it SHALL return melBufferFilled set to false
- **AND** it SHALL return embeddingBuffer as empty array
- **AND** it SHALL return embeddingBufferFilled set to false
- **AND** it SHALL return framesSinceLastPrediction set to 0

#### Scenario: Fill existing mel buffer with zeros

- **WHEN** fillMelBufferWithZeros() is called with a mel buffer
- **THEN** it SHALL replace all frames with new zero-filled Float32Arrays
- **AND** it SHALL maintain the original buffer array reference
- **AND** it SHALL use configured frames and bins dimensions

#### Scenario: Reset detector state

- **WHEN** reset() is called with a detector state object
- **THEN** it SHALL clear the melBuffer with zeros
- **AND** it SHALL set melBufferFilled to false
- **AND** it SHALL clear embeddingBuffer array
- **AND** it SHALL set embeddingBufferFilled to false
- **AND** it SHALL reset framesSinceLastPrediction to 0

