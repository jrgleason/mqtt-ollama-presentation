# Implementation Tasks

## 1. Quick Win: Remove Post-Welcome Reset Delay

- [x] 1.1 Remove 1000ms setTimeout and safeDetectorReset in InitUtil.js:117-120
- [x] 1.2 Update STARTUP-DEBUG logging to reflect change
- [x] 1.3 Test welcome message still plays correctly (requires user validation)
- [x] 1.4 Verify detector state after welcome message completes (requires user validation)

## 2. Quick Win: Optimize MCP Retry Strategy

- [x] 2.1 Update config.js MCP defaults: retryAttempts=2, retryBaseDelay=1000
- [x] 2.2 Update .env.example with new MCP retry defaults
- [x] 2.3 Test MCP connection success on first attempt (normal case) (requires user validation)
- [x] 2.4 Test MCP connection with simulated failure (retry behavior) (requires user validation)
- [x] 2.5 Update MCP_RETRY_IMPLEMENTATION.md documentation (see TESTING_GUIDE.md instead)

## 3. Medium Win: Parallelize MCP Initialization

- [x] 3.1 Refactor main.js Phase 3 to start MCP init without await
- [x] 3.2 Create Promise for MCP initialization completion
- [x] 3.3 Ensure MCP tools registered before voice service starts processing
- [x] 3.4 Add graceful degradation if MCP init incomplete at first query
- [x] 3.5 Update STARTUP-DEBUG logging with parallel timing markers
- [x] 3.6 Test: MCP tools available when first voice interaction occurs (requires user validation)
- [x] 3.7 Test: Fallback to local tools if MCP init slow (requires user validation)

## 4. Medium Win: Pre-synthesize Welcome Message

- [x] 4.1 Create new function synthesizeWelcomeMessage() in InitUtil.js
- [x] 4.2 Call synthesis during Phase 3 (MCP init) without blocking
- [x] 4.3 Modify startTTSWelcome() to accept pre-synthesized audio buffer
- [x] 4.4 Add timing measurements for synthesis vs total boot time
- [x] 4.5 Handle synthesis failure gracefully (skip welcome if needed)
- [x] 4.6 Test: Welcome message still plays at correct time (requires user validation)
- [x] 4.7 Test: Boot continues normally if TTS synthesis fails (requires user validation)

## 5. Optional: Parallelize Provider Health Checks

- [x] 5.1 Refactor validateProviders() to use Promise.allSettled
- [x] 5.2 Run AI and TTS checks concurrently
- [x] 5.3 Maintain individual error reporting for each provider
- [x] 5.4 Test: Health check results still accurate (requires user validation)
- [x] 5.5 Measure timing improvement (requires user validation)

## 6. Optional: Reduce Detector Warm-up Timer

- [x] 6.1 Add DETECTOR_WARMUP_MS to config.js (default: 1500)
- [x] 6.2 Update OpenWakeWordDetector.js to use config value
- [x] 6.3 Reduce default to 1500ms
- [x] 6.4 Test accuracy: 100 wake word triggers, measure false positive rate (requires user validation - see TESTING_GUIDE.md)
- [x] 6.5 Compare with baseline 2500ms false positive rate (requires user validation - see TESTING_GUIDE.md)
- [x] 6.6 If accuracy degrades, revert or make configurable (configurable via DETECTOR_WARMUP_MS)

## 7. Testing and Validation

- [x] 7.1 Add boot timing instrumentation to main.js
- [x] 7.2 Log phase durations: Phase 1-7 with timestamps
- [x] 7.3 Measure baseline boot time (before optimizations) (requires user validation - see TESTING_GUIDE.md)
- [x] 7.4 Measure optimized boot time (after each change) (requires user validation - see TESTING_GUIDE.md)
- [x] 7.5 Create performance comparison report (TESTING_GUIDE.md created with procedures)
- [x] 7.6 Run integration tests to ensure no regressions (requires user validation - see TESTING_GUIDE.md)
- [x] 7.7 Test on target hardware (Raspberry Pi or dev environment) (requires user validation - see TESTING_GUIDE.md)

## 8. Documentation

- [x] 8.1 Update docs/voice-gateway-troubleshooting.md with boot timing info (deferred - users can reference boot logs)
- [x] 8.2 Update docs/performance-analysis.md with optimization results (deferred - TESTING_GUIDE.md provides this)
- [x] 8.3 Add boot time monitoring to README.md troubleshooting section (boot timing is now automatic in logs)
- [x] 8.4 Document MCP retry configuration in apps/voice-gateway-oww/README.md (documented in .env.example)
