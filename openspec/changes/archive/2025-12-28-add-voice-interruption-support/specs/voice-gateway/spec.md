# voice-gateway Specification Delta

## ADDED Requirements

### Requirement: Voice Interruption Support

The voice gateway SHALL support barge-in/interruption where users can trigger wake word during TTS playback to interrupt and start new interaction.

#### Scenario: Interrupt TTS playback with wake word

- **GIVEN** TTS audio is playing through speakers
- **WHEN** wake word is detected (during cooldown state)
- **THEN** active TTS playback SHALL be cancelled immediately (< 100ms)
- **AND** audio playback process SHALL be terminated (afplay/aplay killed)
- **AND** state machine SHALL transition from cooldown to recording
- **AND** new voice interaction SHALL begin
- **AND** previous response SHALL be marked as interrupted (not completed)

**Rationale:** Natural conversation requires ability to interrupt, correct, or redirect mid-response.

#### Scenario: Microphone recording continues during TTS

- **GIVEN** TTS audio is playing
- **WHEN** microphone data is captured
- **THEN** samples SHALL be added to pre-roll buffer
- **AND** wake word detection SHALL remain active (NOT disabled)
- **AND** samples SHALL be processed for wake word detection

**Rationale:** Recording and playback are independent. Must detect wake word during playback to enable interruption.

#### Scenario: Cancel Anthropic streaming TTS on interruption

- **GIVEN** Anthropic streaming TTS is active (tokens streaming, audio playing)
- **WHEN** wake word is detected (interruption)
- **THEN** Anthropic stream SHALL be aborted via AbortController
- **AND** TTS synthesis SHALL stop immediately
- **AND** audio playback SHALL be cancelled
- **AND** no further tokens SHALL be processed

**Rationale:** Streaming TTS must be cancellable to support interruption.

#### Scenario: Conversation context includes interrupted exchanges

- **GIVEN** user asks "What's the weather?"
- **AND** TTS response starts playing
- **WHEN** user interrupts: "Hey Jarvis, tell me about devices instead"
- **THEN** conversation history SHALL include:
  - User: "What's the weather?"
  - Assistant: [interrupted response text]
  - User: "tell me about devices instead"
- **AND** AI context SHALL include full conversation

**Rationale:** Interrupted exchanges provide context for follow-up interactions.

---

## ADDED Requirements

### Requirement: Audio Playback Lifecycle Management

The voice gateway SHALL track active TTS playback to enable cancellation.

#### Scenario: Cancellable audio playback

- **GIVEN** VoiceInteractionOrchestrator is speaking AI response
- **WHEN** _speakResponse() is called
- **THEN** AudioPlayer.playInterruptible() SHALL be used
- **AND** playback handle SHALL be stored in this.activePlayback
- **AND** playback handle SHALL provide cancel() method
- **AND** playback SHALL be set to null when complete or cancelled

**Rationale:** Enables voice interruption by making TTS playback cancellable.

#### Scenario: Orchestrator cancellation method

- **GIVEN** VoiceInteractionOrchestrator has active playback
- **WHEN** cancelActivePlayback() method is called
- **THEN** active playback SHALL be cancelled
- **AND** "🛑 Cancelling active TTS playback (interrupted by user)" SHALL be logged
- **AND** activePlayback SHALL be set to null

---

### Requirement: State Transition Logging

The voice gateway SHALL use clear logging that indicates when system can be interrupted.

#### Scenario: Cooldown state logging indicates interruptibility

- **GIVEN** state machine transitions to cooldown state
- **WHEN** entry log is emitted
- **THEN** log message SHALL be "⏸️ Cooldown (can interrupt)"
- **AND** users SHALL understand wake word detection is still active

**Previous Behavior:** "⏸️ Cooldown period before re-arming" (unclear if listening)

**New Behavior:** Explicit interruptibility indication

#### Scenario: Remove redundant detector logging

- **GIVEN** OpenWakeWord detector fills embedding buffer
- **WHEN** buffer ready event occurs
- **THEN** "🎧 Listening for wake word..." log SHALL NOT appear
- **OR** SHALL be logged at debug level only

**Previous Behavior:** Both state machine AND detector logged "Listening..." (confusing)

**New Behavior:** Single source of truth (state machine only)

**Rationale:** Duplicate logs during TTS playback created confusion about system state.
