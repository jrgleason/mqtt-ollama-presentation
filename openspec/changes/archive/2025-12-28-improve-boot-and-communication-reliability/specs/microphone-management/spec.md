# microphone-management Spec Delta

## ADDED Requirements

### Requirement: Beep Audio Isolation

The system SHALL prevent microphone from capturing system-generated beep audio during voice recording to avoid false transcriptions and feedback loops.

#### Scenario: Beeps suppressed during recording

- **GIVEN** the voice gateway is in `recording` state (capturing user speech)
- **WHEN** a beep playback is requested (wake word beep, processing beep, response beep)
- **THEN** the beep playback is suppressed (not played)
- **AND** the microphone continues recording user speech without beep interference

#### Scenario: Beeps play during non-recording states

- **GIVEN** the voice gateway is in `listening`, `processing`, or `cooldown` state
- **WHEN** a beep playback is requested
- **THEN** the beep is played through the speaker
- **AND** the beep provides user feedback for system state

#### Scenario: Wake word interruption beeps still work

- **GIVEN** the voice gateway is in `cooldown` state (playing TTS)
- **WHEN** wake word is detected (interruption)
- **THEN** the wake word beep is played to acknowledge interruption
- **AND** this maintains existing wake word interruption UX

#### Scenario: No beep feedback in transcriptions

- **GIVEN** beeps are suppressed during recording
- **WHEN** user speech is transcribed via Whisper
- **THEN** the transcription does NOT contain "[BEEPING]" or other beep artifacts
- **AND** transcription only contains user speech

#### Scenario: Recording state tracked correctly

- **GIVEN** the voice state machine transitions between states
- **WHEN** entering `recording` state
- **THEN** recording flag is set to true
- **AND** beep playback is suppressed for all subsequent beep requests
- **WHEN** exiting `recording` state (to `processing` or other states)
- **THEN** recording flag is set to false
- **AND** beep playback resumes normal operation
