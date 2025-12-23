# Microphone Management Specification

## ADDED Requirements

### Requirement: Audio Recording State Management
The system SHALL provide a dedicated class for managing audio recording state and buffers with clear lifecycle methods.

#### Scenario: Recording lifecycle transitions
- **GIVEN** an AudioRecordingState instance is created
- **WHEN** startRecording() is called
- **THEN** the pre-roll buffer contents SHALL be copied to recordedAudio
- **AND** the recording flag SHALL be set to true
- **AND** all recording state counters SHALL be reset

#### Scenario: Audio sample accumulation during recording
- **GIVEN** recording is active
- **WHEN** appendAudio() is called with new samples
- **THEN** samples SHALL be added to the recordedAudio buffer
- **AND** samples SHALL be added to the audioBuffer for wake word processing
- **AND** the pre-roll buffer SHALL be updated with a sliding window

#### Scenario: Stopping recording and retrieving audio
- **GIVEN** recording is active with accumulated samples
- **WHEN** stopRecording() is called
- **THEN** a Float32Array snapshot of recordedAudio SHALL be returned
- **AND** all buffers SHALL be cleared
- **AND** the recording flag SHALL be set to false
- **AND** the returned audio SHALL be immutable (not affected by future operations)

#### Scenario: Pre-roll buffer maintenance
- **GIVEN** the system is listening (not recording)
- **WHEN** audio samples are received
- **THEN** samples SHALL be added to the pre-roll buffer
- **AND** the buffer SHALL maintain a fixed size (300ms of audio)
- **AND** oldest samples SHALL be discarded when buffer is full

### Requirement: Voice Activity Detection
The system SHALL provide a VoiceActivityDetector class that determines when to stop recording based on silence detection, minimum speech duration, and maximum recording length.

#### Scenario: Silence detection with grace period
- **GIVEN** recording started less than 1200ms ago
- **AND** no speech has been detected yet
- **WHEN** silence is detected (RMS energy < 0.01)
- **THEN** the detector SHALL NOT signal to stop recording
- **AND** the grace period SHALL allow user time to start speaking

#### Scenario: Silence detection after speech detected
- **GIVEN** speech was detected during recording (RMS energy >= 0.01)
- **AND** current samples have RMS energy < 0.01
- **WHEN** silence duration exceeds 1500ms
- **AND** total recording duration exceeds 700ms minimum
- **THEN** the detector SHALL signal to stop recording
- **AND** return {shouldStop: true, reason: 'SILENCE_DETECTED', hasSpoken: true}

#### Scenario: Maximum recording length timeout
- **GIVEN** recording has been active for 10000ms
- **WHEN** processSamples() is called
- **THEN** the detector SHALL signal to stop recording
- **AND** return {shouldStop: true, reason: 'MAX_LENGTH_REACHED', hasSpoken: [current state]}

#### Scenario: Speech detection during recording
- **GIVEN** no speech has been detected yet in current recording
- **WHEN** samples with RMS energy >= 0.01 are processed
- **THEN** the hasSpoken flag SHALL be set to true
- **AND** silence counter SHALL be reset to zero
- **AND** subsequent silence detection SHALL use standard thresholds (no grace period)

#### Scenario: Minimum speech duration enforcement
- **GIVEN** recording duration is less than 700ms
- **AND** silence is detected
- **WHEN** processSamples() is called
- **THEN** the detector SHALL NOT signal to stop recording
- **AND** continue accumulating samples until minimum duration met

### Requirement: Wake Word Detection Processing
The system SHALL provide a WakeWordProcessor class that evaluates audio chunks for wake word presence and triggers appropriate actions.

#### Scenario: Wake word detection above threshold
- **GIVEN** a WakeWordProcessor instance with threshold 0.5
- **WHEN** processChunk() is called with audio chunk
- **AND** the detector returns score 0.75
- **THEN** the processor SHALL return {detected: true, score: 0.75, wakeWord: 'Hey Jarvis'}
- **AND** the detector SHALL be safely reset
- **AND** a beep audio feedback SHALL be played

#### Scenario: Wake word score below threshold
- **GIVEN** a WakeWordProcessor instance with threshold 0.5
- **WHEN** processChunk() is called with audio chunk
- **AND** the detector returns score 0.3
- **THEN** the processor SHALL return {detected: false, score: 0.3, wakeWord: null}
- **AND** no beep SHALL be played
- **AND** the detector SHALL NOT be reset

#### Scenario: Wake word name resolution from model path
- **GIVEN** config.openWakeWord.modelPath contains 'jarvis'
- **WHEN** wake word is detected
- **THEN** wakeWord SHALL be 'Hey Jarvis'

- **GIVEN** config.openWakeWord.modelPath contains 'robot'
- **WHEN** wake word is detected
- **THEN** wakeWord SHALL be 'Hello Robot'

- **GIVEN** config.openWakeWord.modelPath contains neither 'jarvis' nor 'robot'
- **WHEN** wake word is detected
- **THEN** wakeWord SHALL be 'Wake word'

#### Scenario: Detector error handling
- **GIVEN** the wake word detector throws an error
- **WHEN** processChunk() is called
- **THEN** the error SHALL be logged with context
- **AND** the processor SHALL return {detected: false, score: 0, wakeWord: null}
- **AND** audio processing SHALL continue (not crash)

### Requirement: Microphone Orchestration
The system SHALL provide a MicrophoneManager class that orchestrates all microphone-related components and integrates with the XState voice state machine.

#### Scenario: Microphone initialization and startup
- **GIVEN** a MicrophoneManager is created with dependencies
- **WHEN** start() is called
- **THEN** a microphone instance SHALL be created with correct configuration
- **AND** AudioRecordingState SHALL be initialized
- **AND** VoiceActivityDetector SHALL be initialized
- **AND** WakeWordProcessor SHALL be initialized
- **AND** XState service listeners SHALL be attached
- **AND** microphone data handlers SHALL be registered
- **AND** the microphone SHALL be started
- **AND** the microphone instance SHALL be returned

#### Scenario: XState transition to recording state
- **GIVEN** the voice state machine is in 'listening' state
- **WHEN** state transitions to 'recording'
- **THEN** AudioRecordingState.startRecording() SHALL be called
- **AND** recording start SHALL be logged

#### Scenario: XState transition from recording state
- **GIVEN** the voice state machine is in 'recording' state
- **WHEN** state transitions to any other state
- **THEN** AudioRecordingState.stopRecording() SHALL be called
- **AND** recorded audio SHALL be passed to transcriber.backgroundTranscribe()
- **AND** recording stop SHALL be logged with sample count

#### Scenario: Processing audio during listening state
- **GIVEN** the voice state machine is in 'listening' state
- **WHEN** microphone data event fires with audio samples
- **THEN** samples SHALL be converted to Float32Array
- **AND** samples SHALL be added to AudioRecordingState buffers
- **AND** samples SHALL be processed in CHUNK_SIZE (1280 sample) chunks
- **AND** each chunk SHALL be passed to WakeWordProcessor
- **AND** if wake word detected, 'TRIGGER' event SHALL be sent to state machine

#### Scenario: Processing audio during startup state
- **GIVEN** the voice state machine is in 'startup' state
- **WHEN** microphone data event fires with audio samples
- **THEN** audioBuffer SHALL be drained (chunks discarded)
- **AND** no wake word detection SHALL be performed
- **AND** the system SHALL wait for 'READY' event

#### Scenario: Processing audio during recording state
- **GIVEN** the voice state machine is in 'recording' state
- **WHEN** microphone data event fires with audio samples
- **THEN** samples SHALL be appended to AudioRecordingState
- **AND** samples SHALL be processed by VoiceActivityDetector
- **AND** if shouldStop is true with reason 'SILENCE_DETECTED', 'SILENCE_DETECTED' event SHALL be sent to state machine
- **AND** if shouldStop is true with reason 'MAX_LENGTH_REACHED', 'MAX_LENGTH_REACHED' event SHALL be sent to state machine

#### Scenario: Microphone error handling
- **GIVEN** the microphone is running
- **WHEN** an error event is emitted by the microphone stream
- **THEN** the error SHALL be logged with full context
- **AND** the system SHALL continue running (graceful degradation)

### Requirement: VAD Configuration Constants
The system SHALL define all Voice Activity Detection thresholds as named constants with comprehensive documentation.

#### Scenario: Pre-roll buffer configuration
- **GIVEN** VAD constants are defined
- **THEN** PRE_ROLL_MS SHALL be 300 milliseconds
- **AND** documentation SHALL explain this captures audio before wake word for context

#### Scenario: Silence threshold configuration
- **GIVEN** VAD constants are defined
- **THEN** SILENCE_THRESHOLD SHALL be 0.01 RMS energy
- **AND** documentation SHALL explain typical voice is 0.05-0.2, background noise <0.01

#### Scenario: Minimum speech duration configuration
- **GIVEN** VAD constants are defined
- **THEN** MIN_SPEECH_MS SHALL be 700 milliseconds
- **AND** documentation SHALL explain this avoids false positives from coughs and clicks

#### Scenario: Trailing silence configuration
- **GIVEN** VAD constants are defined
- **THEN** TRAILING_SILENCE_MS SHALL be configurable via config.vad.trailingSilenceMs
- **AND** default SHALL be 1500 milliseconds
- **AND** documentation SHALL explain this is the pause duration before stopping recording

#### Scenario: Maximum utterance configuration
- **GIVEN** VAD constants are defined
- **THEN** MAX_RECORDING_MS SHALL be configurable via config.vad.maxUtteranceMs
- **AND** default SHALL be 10000 milliseconds
- **AND** documentation SHALL explain this prevents infinite recording

#### Scenario: Grace period configuration
- **GIVEN** VAD constants are defined
- **THEN** GRACE_BEFORE_STOP_MS SHALL be configurable via config.vad.graceBeforeStopMs
- **AND** default SHALL be 1200 milliseconds
- **AND** documentation SHALL explain this allows user time to start speaking after wake word

### Requirement: Backward Compatibility
The refactored implementation SHALL maintain 100% backward compatibility with the existing setupMic() function interface.

#### Scenario: Function signature preservation
- **GIVEN** the refactored code is deployed
- **WHEN** setupMic(voiceService, transcriber, detector) is called
- **THEN** the function SHALL accept the same three parameters
- **AND** return a microphone instance object with start/stop methods

#### Scenario: Event handling preservation
- **GIVEN** the refactored code is deployed
- **WHEN** wake word is detected
- **THEN** 'TRIGGER' event SHALL be sent to voiceService (same as before)
- **WHEN** silence is detected during recording
- **THEN** 'SILENCE_DETECTED' event SHALL be sent to voiceService (same as before)
- **WHEN** max recording length is reached
- **THEN** 'MAX_LENGTH_REACHED' event SHALL be sent to voiceService (same as before)

#### Scenario: Audio processing preservation
- **GIVEN** the refactored code is deployed
- **WHEN** audio samples are received
- **THEN** the same Int16 to Float32 conversion SHALL occur
- **AND** the same CHUNK_SIZE (1280 samples) SHALL be used
- **AND** the same sample rate (16000 Hz) SHALL be used
- **AND** buffer management SHALL produce identical results

#### Scenario: Performance preservation
- **GIVEN** the refactored code is deployed
- **WHEN** processing audio in real-time
- **THEN** latency SHALL NOT increase by more than 5ms
- **AND** CPU usage SHALL NOT increase by more than 5%
- **AND** memory usage SHALL remain within acceptable bounds (<50MB increase)
