# Implementation Tasks

## 1. Beep Isolation

- [x] 1.1 Track recording state in main.js (add `isRecording` flag updated by state machine transitions)
- [x] 1.2 Modify beep playback calls to check recording state before playing
- [x] 1.3 Suppress wake word beep if already in recording state (edge case: rapid double trigger)
- [x] 1.4 Suppress processing beep during recording (shouldn't happen, defensive check)
- [x] 1.5 Verify beeps still play during listening, processing, and cooldown states
- [x] 1.6 Test: Trigger wake word rapidly, verify no beep feedback in transcription

## 2. MCP Retry Logic

- [x] 2.1 Create exponential backoff retry wrapper in MCPIntegration.js
- [x] 2.2 Modify MultiServerMCPClient initialization to capture stderr from subprocess
- [x] 2.3 Include stderr output in error logs when connection fails
- [x] 2.4 Log each retry attempt with attempt number and delay
- [x] 2.5 Test: Simulate MCP server failure (kill broker, invalid path), verify retry and clear error messages

## 3. Startup Orchestration

- [x] 3.1 Add warm-up phase to OpenWakeWordDetector (detect when embeddings stabilize, emit event)
- [x] 3.2 Modify initWakeWordDetector() in InitUtil.js to await warm-up signal (2-3 sec timeout)
- [x] 3.3 Refactor main.js to use async/await for initialization sequence
- [x] 3.4 Ensure tool system init completes before welcome message
- [x] 3.5 Ensure orchestrator creation completes before welcome message
- [x] 3.6 Ensure state machine setup completes before welcome message
- [x] 3.7 Move welcome message to AFTER all subsystems ready
- [x] 3.8 Test: Monitor logs for correct initialization order, verify no premature wake word acceptance

## 4. Testing & Validation

- [x] 4.1 Integration test: Beep feedback prevention (rapid wake word triggers, no "[BEEPING]" transcriptions)
- [x] 4.2 Integration test: MCP retry (simulate transient failure, verify recovery)
- [x] 4.3 Integration test: Startup timing (no user cutoffs, system responsive immediately after welcome)
- [x] 4.4 Performance test: Measure startup time increase (target: <3 sec total increase)
- [x] 4.5 Validation: Verify logs show clear error messages for MCP failure
- [x] 4.6 Validation: Verify "Voice Gateway ready" log appears AFTER welcome message spoken
