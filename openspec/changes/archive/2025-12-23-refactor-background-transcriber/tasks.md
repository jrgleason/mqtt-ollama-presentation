# Implementation Tasks: Refactor BackgroundTranscriber

## 1. Preparation
- [x] 1.1 Create new directory structure (`src/services/`, `src/ai/`)
- [x] 1.2 Review BackgroundTranscriber dependencies and document external interfaces
- [x] 1.3 Identify all files that import BackgroundTranscriber

## 2. Create IntentClassifier Service
- [x] 2.1 Create `src/services/IntentClassifier.js`
- [x] 2.2 Implement pattern-based intent detection methods (device query, datetime query, control query)
- [x] 2.3 Extract and centralize regex patterns from BackgroundTranscriber
- [x] 2.4 Add JSDoc documentation for all public methods
- [ ] 2.5 Write unit tests for IntentClassifier (target 80%+ coverage) - NOT COMPLETED

## 3. Create TranscriptionService
- [x] 3.1 Create `src/services/TranscriptionService.js`
- [x] 3.2 Implement audio validation (duration, RMS energy checks)
- [x] 3.3 Implement WAV file creation and cleanup
- [x] 3.4 Implement Whisper transcription orchestration
- [x] 3.5 Add error handling and logging
- [ ] 3.6 Write unit tests for TranscriptionService (target 80%+ coverage) - NOT COMPLETED

## 4. Create AIRouter Service
- [x] 4.1 Create `src/ai/AIRouter.js`
- [x] 4.2 Implement AI provider selection logic (Ollama vs Anthropic)
- [x] 4.3 Implement tool executor routing (datetime, search, volume, zwave)
- [x] 4.4 Implement streaming vs non-streaming response handling
- [x] 4.5 Implement system prompt building with device context
- [x] 4.6 Add configuration validation and health checks
- [ ] 4.7 Write unit tests for AIRouter (target 70%+ coverage) - NOT COMPLETED

## 5. Create VoiceInteractionOrchestrator
- [x] 5.1 Create `src/services/VoiceInteractionOrchestrator.js`
- [x] 5.2 Implement main `processVoiceInteraction(audioSamples)` method
- [x] 5.3 Integrate TranscriptionService for audio → text
- [x] 5.4 Integrate IntentClassifier for intent detection
- [x] 5.5 Integrate AIRouter for AI query routing
- [x] 5.6 Integrate TTS playback (ElevenLabs)
- [x] 5.7 Integrate audio feedback (beeps at appropriate stages)
- [x] 5.8 Integrate MQTT publishing (transcription, AI response)
- [x] 5.9 Integrate conversation manager updates
- [x] 5.10 Add comprehensive error handling and fallbacks
- [ ] 5.11 Write integration tests for complete voice flow - NOT COMPLETED

## 6. Migration
- [x] 6.1 Update `src/main.js` to import VoiceInteractionOrchestrator instead of BackgroundTranscriber
- [x] 6.2 Update method call from `backgroundTranscribe()` to `processVoiceInteraction()`
- [x] 6.3 Verify all dependencies are correctly injected (config, logger, beep)
- [x] 6.4 Search codebase for any other imports of BackgroundTranscriber

## 7. Cleanup
- [x] 7.1 Delete `src/util/BackgroundTranscriber.js`
- [ ] 7.2 Run all tests and verify they pass - PARTIAL (existing tests pass but new tests missing)
- [ ] 7.3 Test voice interaction flow end-to-end with actual hardware - NOT COMPLETED
- [ ] 7.4 Update inline code comments referencing BackgroundTranscriber - NOT COMPLETED (comments exist but inline code refs not checked)

## 8. Documentation
- [ ] 8.1 Update `apps/voice-gateway-oww/README.md` with new architecture diagram - NOT COMPLETED
- [x] 8.2 Add JSDoc documentation to all new service classes - COMPLETED (all classes have JSDoc)
- [ ] 8.3 Create migration guide for external projects (if any) - NOT COMPLETED
- [ ] 8.4 Update `CLAUDE.md` to reflect new service architecture - NOT COMPLETED

## 9. Validation
- [ ] 9.1 Run OpenSpec validation: `openspec validate refactor-background-transcriber --strict` - NOT COMPLETED
- [ ] 9.2 Verify code coverage meets targets (60%+ overall, 80%+ critical paths) - NOT COMPLETED
- [ ] 9.3 Test voice commands with Ollama provider - NOT COMPLETED
- [ ] 9.4 Test voice commands with Anthropic provider - NOT COMPLETED
- [ ] 9.5 Test voice commands with TTS enabled - NOT COMPLETED
- [ ] 9.6 Test voice commands with TTS disabled - NOT COMPLETED
- [ ] 9.7 Verify beeps play at correct interaction stages - NOT COMPLETED
- [ ] 9.8 Verify MQTT messages are published correctly - NOT COMPLETED
- [ ] 9.9 Verify conversation history is maintained - NOT COMPLETED
- [ ] 9.10 Performance test: Ensure refactored code meets <7s target for voice pipeline - NOT COMPLETED
