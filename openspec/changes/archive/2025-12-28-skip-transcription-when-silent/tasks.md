# Tasks: skip-transcription-when-silent

## 1. Add Speech Detection Check in main.js (3 tasks)

- [x] 1.1 Add conditional check for `hasSpokenDuringRecording` before calling `processVoiceInteraction`
- [x] 1.2 Add log message when skipping transcription: "⏩ Skipping transcription - no speech detected"
- [x] 1.3 Verify state machine transitions to `listening` automatically (no explicit action needed)

## 2. Future-Proof MicrophoneManager.js (3 tasks)

- [x] 2.1 Get `hasSpoken` from `vadDetector.getState().hasSpokenDuringRecording` when recording stops
- [x] 2.2 Add conditional check for `hasSpoken` before calling `processVoiceInteraction`
- [x] 2.3 Add same log message when skipping transcription in MicrophoneManager

## 3. Testing & Validation (3 tasks)

- [x] 3.1 Test false wake word trigger (e.g., beep feedback) → Should skip transcription, no AI query
- [x] 3.2 Test valid speech interaction → Should process normally (no regression)
- [x] 3.3 Measure latency improvement: False trigger should be <1s (vs previous ~8s)

---

**Total: 9 tasks**

**Estimated Impact:**
- False trigger latency: ~8s → <1s (87% improvement)
- User experience: No more confusing responses to non-speech
- AI API cost: Reduced (fewer unnecessary queries)
