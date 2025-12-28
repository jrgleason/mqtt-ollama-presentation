# Implementation Tasks

## 1. Quick Win: Remove Post-Welcome Reset Delay

- [ ] 1.1 Remove 1000ms setTimeout and safeDetectorReset in InitUtil.js:117-120
- [ ] 1.2 Update STARTUP-DEBUG logging to reflect change
- [ ] 1.3 Test welcome message still plays correctly
- [ ] 1.4 Verify detector state after welcome message completes

## 2. Quick Win: Optimize MCP Retry Strategy

- [ ] 2.1 Update config.js MCP defaults: retryAttempts=2, retryBaseDelay=1000
- [ ] 2.2 Update .env.example with new MCP retry defaults
- [ ] 2.3 Test MCP connection success on first attempt (normal case)
- [ ] 2.4 Test MCP connection with simulated failure (retry behavior)
- [ ] 2.5 Update MCP_RETRY_IMPLEMENTATION.md documentation

## 3. Medium Win: Parallelize MCP Initialization

- [ ] 3.1 Refactor main.js Phase 3 to start MCP init without await
- [ ] 3.2 Create Promise for MCP initialization completion
- [ ] 3.3 Ensure MCP tools registered before voice service starts processing
- [ ] 3.4 Add graceful degradation if MCP init incomplete at first query
- [ ] 3.5 Update STARTUP-DEBUG logging with parallel timing markers
- [ ] 3.6 Test: MCP tools available when first voice interaction occurs
- [ ] 3.7 Test: Fallback to local tools if MCP init slow

## 4. Medium Win: Pre-synthesize Welcome Message

- [ ] 4.1 Create new function synthesizeWelcomeMessage() in InitUtil.js
- [ ] 4.2 Call synthesis during Phase 3 (MCP init) without blocking
- [ ] 4.3 Modify startTTSWelcome() to accept pre-synthesized audio buffer
- [ ] 4.4 Add timing measurements for synthesis vs total boot time
- [ ] 4.5 Handle synthesis failure gracefully (skip welcome if needed)
- [ ] 4.6 Test: Welcome message still plays at correct time
- [ ] 4.7 Test: Boot continues normally if TTS synthesis fails

## 5. Optional: Parallelize Provider Health Checks

- [ ] 5.1 Refactor validateProviders() to use Promise.allSettled
- [ ] 5.2 Run AI and TTS checks concurrently
- [ ] 5.3 Maintain individual error reporting for each provider
- [ ] 5.4 Test: Health check results still accurate
- [ ] 5.5 Measure timing improvement

## 6. Optional: Reduce Detector Warm-up Timer

- [ ] 6.1 Add DETECTOR_WARMUP_MS to config.js (default: 2500)
- [ ] 6.2 Update OpenWakeWordDetector.js to use config value
- [ ] 6.3 Reduce default to 1500ms
- [ ] 6.4 Test accuracy: 100 wake word triggers, measure false positive rate
- [ ] 6.5 Compare with baseline 2500ms false positive rate
- [ ] 6.6 If accuracy degrades, revert or make configurable

## 7. Testing and Validation

- [ ] 7.1 Add boot timing instrumentation to main.js
- [ ] 7.2 Log phase durations: Phase 1-7 with timestamps
- [ ] 7.3 Measure baseline boot time (before optimizations)
- [ ] 7.4 Measure optimized boot time (after each change)
- [ ] 7.5 Create performance comparison report
- [ ] 7.6 Run integration tests to ensure no regressions
- [ ] 7.7 Test on target hardware (Raspberry Pi or dev environment)

## 8. Documentation

- [ ] 8.1 Update docs/voice-gateway-troubleshooting.md with boot timing info
- [ ] 8.2 Update docs/performance-analysis.md with optimization results
- [ ] 8.3 Add boot time monitoring to README.md troubleshooting section
- [ ] 8.4 Document MCP retry configuration in apps/voice-gateway-oww/README.md
