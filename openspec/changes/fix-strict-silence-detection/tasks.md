# Implementation Tasks

## Phase 1: Fix Threshold Inconsistency

- [ ] Remove duplicate SILENCE_THRESHOLD from main.js VAD_CONSTANTS
- [ ] Update VoiceActivityDetector.js to import from audio/constants.js
- [ ] Verify no other duplicate threshold definitions exist (grep codebase)
- [ ] Update imports in all files using SILENCE_THRESHOLD

## Phase 2: Make Threshold Configurable

- [ ] Update audio/constants.js to support config.vad.silenceThreshold
- [ ] Add getSilenceThreshold(config) helper function
- [ ] Update VoiceActivityDetector.js to use configurable threshold
- [ ] Change default from 0.01 to 0.003 (more lenient)
- [ ] Update .env.example with VAD_SILENCE_THRESHOLD variable
- [ ] Add config parsing in config.js for vad.silenceThreshold

## Phase 3: Enhance Diagnostic Logging

- [ ] Add debug logs showing energy during grace period
- [ ] Log "⚠️ Close to threshold" when energy is 0.002-0.004
- [ ] Update "skipping transcription" log with better guidance
- [ ] Add threshold value to "Speech detected" log
- [ ] Create summary log after 10 silence detections (pattern analysis)

## Phase 4: Update Documentation

- [ ] Update voice-activity-detection spec with new default (0.003)
- [ ] Document config.vad.silenceThreshold in README
- [ ] Add "Tuning VAD Threshold" section to DEVELOPER_GUIDE
- [ ] Update STARTUP_AND_ORCHESTRATION with new default
- [ ] Add troubleshooting entry for "Too many false positives"

## Phase 5: Testing

- [ ] Test with default threshold (0.003) - normal speech
- [ ] Test with very quiet speech (whisper)
- [ ] Test with background noise (TV, music)
- [ ] Test with config override (VAD_SILENCE_THRESHOLD=0.001)
- [ ] Test with config override (VAD_SILENCE_THRESHOLD=0.01)
- [ ] Verify logs show energy levels correctly
- [ ] Confirm no regressions in wake word detection

## Phase 6: Validation

- [ ] Run openspec validate fix-strict-silence-detection --strict
- [ ] Verify single source of truth for SILENCE_THRESHOLD
- [ ] Confirm backward compatibility (no breaking changes)
- [ ] Check all imports resolve correctly
- [ ] Review logs for clarity and usefulness
