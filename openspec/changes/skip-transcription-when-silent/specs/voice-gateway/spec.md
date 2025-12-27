# voice-gateway Spec Delta

## ADDED Requirements

### Requirement: Skip Transcription When No Speech Detected
The system SHALL skip transcription and AI processing when no speech was detected during recording, immediately returning to the listening state.

#### Scenario: False wake word trigger with no speech
- **GIVEN** the wake word detector triggers but no speech is detected during recording (hasSpokenDuringRecording = false)
- **WHEN** the recording stops due to silence or timeout
- **THEN** the system SHALL skip transcription, log "⏩ Skipping transcription - no speech detected", and transition to listening state without querying the AI

#### Scenario: Valid speech after wake word trigger
- **GIVEN** the wake word detector triggers AND speech is detected during recording (hasSpokenDuringRecording = true)
- **WHEN** the recording stops due to trailing silence
- **THEN** the system SHALL process the voice interaction normally (transcription → AI query → TTS response)

#### Scenario: Beep feedback captured during recording
- **GIVEN** the wake word detector triggers AND only beep audio (no actual speech) is captured during recording
- **WHEN** VAD determines no speech was present (hasSpokenDuringRecording = false)
- **THEN** the system SHALL skip transcription and not send the beep audio to Whisper

#### Scenario: User triggered but stayed silent during grace period
- **GIVEN** the wake word detector triggers but user does not speak during the grace period (1200ms)
- **WHEN** VAD timeout occurs without speech detection
- **THEN** the system SHALL skip transcription and log the skip reason

#### Scenario: Recording stopped at max length without speech
- **GIVEN** recording reaches maximum length (10 seconds) without detecting speech
- **WHEN** MAX_LENGTH_REACHED event is sent
- **THEN** the system SHALL skip transcription (no speech detected) and transition to listening

---

## Notes

**Implementation Details:**
- The `hasSpokenDuringRecording` flag is already tracked by VAD during recording
- Check should occur in the state transition handler (when exiting `recording` state)
- Applies to both `main.js` (current) and `MicrophoneManager.js` (future)

**Related Requirements:**
- Existing: `voice-gateway > Transcription Service` (lines 6-43) - Already has energy checks in TranscriptionService
- This requirement adds an EARLIER check (before entering processing state) to avoid wasted state transitions

**Performance Impact:**
- Positive: Reduces false trigger latency from ~8s to <1s
- Positive: Saves transcription API calls (~350ms each)
- Positive: Saves AI API calls (~1-2s each)
