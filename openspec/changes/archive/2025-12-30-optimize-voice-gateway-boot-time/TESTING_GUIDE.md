# Testing Guide: Voice Gateway Boot Time Optimization

This document provides comprehensive testing procedures to validate the boot time optimizations implemented in the voice gateway.

## Overview

**Target**: Reduce boot time from ~12 seconds to ~6-7 seconds (40-50% improvement)

**Optimizations Implemented**:
1. Removed post-welcome reset delay (~1s savings)
2. Optimized MCP retry strategy (~2-4s savings on failure)
3. Parallelized provider health checks (~200-300ms savings)
4. Parallelized MCP initialization (~2-3s savings)
5. Pre-synthesized welcome message (~1s savings)
6. Reduced detector warm-up timer from 2500ms to 1500ms (~1s savings)

## Pre-Testing Setup

### 1. Environment Preparation

```bash
# Navigate to voice gateway directory
cd apps/voice-gateway-oww

# Ensure all dependencies are installed
npm install

# Verify environment configuration
cp .env.example .env.tmp
# Edit .env.tmp with your actual credentials

# Verify Z-Wave MCP server is running (for MCP tests)
# Check http://localhost:8091 or your ZWAVE_UI_URL
```

### 2. Baseline Measurement (Before Optimizations)

If you have a git branch with the pre-optimization code:

```bash
# Checkout pre-optimization code
git checkout main  # or your baseline branch

# Start the voice gateway and record boot time
npm run dev 2>&1 | tee baseline-boot.log

# Extract boot time from logs
grep "Voice Gateway ready" baseline-boot.log
# Note: Timing will be in the logs, look for total startup time
```

**Baseline Expected**: ~12+ seconds

## Test Phase 1: Boot Time Measurement

### Test 1.1: Measure Optimized Boot Time

**Purpose**: Verify total boot time improvement

**Steps**:
1. Ensure you're on the optimized branch
   ```bash
   git checkout CRAZY_REFACTOR  # or your feature branch
   ```

2. Start the voice gateway with clean state:
   ```bash
   npm run dev 2>&1 | tee optimized-boot.log
   ```

3. Record the boot time from logs:
   ```bash
   # Look for the boot time summary log
   grep "Boot Time Performance Summary" optimized-boot.log -A 10
   ```

**Success Criteria**:
- [ ] Total boot time < 7 seconds
- [ ] "Voice Gateway ready" log appears
- [ ] All phases complete successfully
- [ ] Boot Time Performance Summary is logged

**Expected Output**:
```
⏱️  Boot Time Performance Summary {
  totalBootTimeMs: 6500,
  totalBootTimeSec: '6.50',
  phases: {
    'Phase 1 (Health Checks)': '450ms',
    'Phase 2 (Detector Init)': '95ms',
    'Phase 3 (Tool System Setup)': '150ms',
    'Phase 4 (Voice Service Setup)': '8ms',
    'Phase 5 (Microphone Setup)': '75ms',
    'Phase 5.5 (Warmup & MCP)': '2200ms',
    'Phase 6 (Welcome Message)': '3400ms',
    'Phase 7 (Final Activation)': '122ms'
  }
}
```

### Test 1.2: Multiple Boot Cycles

**Purpose**: Verify consistency of boot time improvements

**Steps**:
1. Restart the service 5 times and record boot times:
   ```bash
   for i in {1..5}; do
     echo "=== Boot Cycle $i ===" >> boot-times.log
     npm run dev 2>&1 | grep "Boot Time Performance Summary" -A 10 >> boot-times.log
     pkill -f "node.*voice-gateway"
     sleep 2
   done
   ```

2. Analyze results:
   ```bash
   cat boot-times.log
   ```

**Success Criteria**:
- [ ] All 5 boots complete successfully
- [ ] Average boot time < 7 seconds
- [ ] Boot time variation < 1 second
- [ ] No errors or warnings in logs

## Test Phase 2: Feature Validation

### Test 2.1: Wake Word Detection Accuracy

**Purpose**: Verify detector warm-up timer reduction doesn't increase false positives

**Steps**:
1. Start the voice gateway
2. Wait for "Voice Gateway ready" log
3. Perform 20 wake word triggers:
   - Say "Hey Jarvis" (or configured wake word)
   - Note if detected correctly
   - Record any false positives (detection when not speaking)

**Test Procedure**:
```
Trial 1: [✓] Detected correctly
Trial 2: [✓] Detected correctly
...
Trial 20: [✓] Detected correctly

False Positives (no speech): 0
```

**Success Criteria**:
- [ ] >= 18/20 successful wake word detections (90% accuracy)
- [ ] <= 1 false positive during testing
- [ ] Wake word beep plays on each detection
- [ ] Recording starts after wake word

### Test 2.2: MCP Tools Availability

**Purpose**: Verify MCP tools are registered despite parallel initialization

**Steps**:
1. Start voice gateway
2. After "Voice Gateway ready", check logs for:
   ```
   ✅ MCP tools registered { toolCount: X, tools: [...] }
   ```
3. Trigger a voice query that uses Z-Wave tools:
   - Say: "Hey Jarvis" + "Turn on the office light"
   - Verify device command is sent

**Success Criteria**:
- [ ] MCP tools appear in tool count
- [ ] Z-Wave devices can be controlled via voice
- [ ] No "tool not found" errors

### Test 2.3: Welcome Message Playback

**Purpose**: Verify pre-synthesized welcome message plays correctly

**Steps**:
1. Start voice gateway
2. Listen for welcome message playback
3. Verify timing and content

**Success Criteria**:
- [ ] Welcome message plays ("Hello, I am Jarvis. How can I help?")
- [ ] Message plays after detector warm-up completes
- [ ] Audio quality is normal (no stuttering/distortion)
- [ ] Ready beep plays after welcome message

### Test 2.4: Health Checks Complete

**Purpose**: Verify parallelized health checks work correctly

**Steps**:
1. Start voice gateway
2. Check logs for health check results:
   ```bash
   grep "provider health" optimized-boot.log -A 5
   ```

**Success Criteria**:
- [ ] AI provider health check completes
- [ ] TTS provider health check completes
- [ ] Both checks complete in < 500ms total
- [ ] No health check failures (or expected failures are handled)

## Test Phase 3: Error Handling & Edge Cases

### Test 3.1: MCP Server Unavailable

**Purpose**: Verify graceful degradation when MCP fails

**Steps**:
1. Stop Z-Wave MCP server (or set invalid `ZWAVE_UI_URL`)
2. Start voice gateway
3. Observe behavior

**Success Criteria**:
- [ ] Voice gateway still starts successfully
- [ ] "Continuing with local tools only" warning logged
- [ ] Boot time still < 7 seconds
- [ ] Local tools (datetime, search, volume) still work
- [ ] Z-Wave tools gracefully unavailable

### Test 3.2: TTS Synthesis Failure

**Purpose**: Verify graceful handling of welcome message synthesis failure

**Steps**:
1. Set invalid TTS credentials (or disable TTS)
2. Start voice gateway
3. Observe behavior

**Success Criteria**:
- [ ] Voice gateway still starts successfully
- [ ] Boot continues without welcome message
- [ ] "Failed to synthesize welcome message" logged (if TTS enabled but broken)
- [ ] Or "No audio buffer or TTS disabled" logged (if TTS disabled)
- [ ] Boot time not significantly impacted

### Test 3.3: Detector Warm-up Timeout

**Purpose**: Verify timeout handling if detector doesn't warm up

**Steps**:
1. This is difficult to test without modifying code
2. Review timeout logic in logs:
   ```bash
   grep "warm-up" optimized-boot.log
   ```

**Success Criteria**:
- [ ] Detector warm-up completes normally (under timeout)
- [ ] Timeout is set to 10 seconds (reasonable fallback)

## Test Phase 4: Configuration Validation

### Test 4.1: MCP Retry Configuration

**Purpose**: Verify new MCP retry defaults work correctly

**Steps**:
1. Check configuration:
   ```bash
   grep "MCP_RETRY" apps/voice-gateway-oww/.env.example
   ```
2. Verify in logs that retries use new values
3. Test retry behavior by temporarily breaking MCP connection

**Success Criteria**:
- [ ] Default retryAttempts = 2
- [ ] Default retryBaseDelay = 1000ms
- [ ] .env.example documents new defaults
- [ ] Retry delays are: 0ms (attempt 1), 1000ms (attempt 2)

### Test 4.2: Detector Warm-up Configuration

**Purpose**: Verify detector warm-up is configurable

**Steps**:
1. Check configuration:
   ```bash
   grep "DETECTOR_WARMUP_MS" apps/voice-gateway-oww/.env.example
   ```
2. Verify default is 1500ms in config.js
3. Test custom value:
   ```bash
   # Add to .env.tmp
   DETECTOR_WARMUP_MS=2000

   # Restart and verify in logs
   grep "warm-up period" optimized-boot.log
   ```

**Success Criteria**:
- [ ] Default warmupMs = 1500ms
- [ ] .env.example documents the setting
- [ ] Custom values are respected
- [ ] Log messages show configured duration

## Test Phase 5: Performance Regression Testing

### Test 5.1: Voice Interaction Flow

**Purpose**: Ensure optimizations don't break normal operation

**Test Procedure**:
1. Start voice gateway
2. Perform complete interaction:
   - Say wake word
   - Wait for beep
   - Ask question: "What time is it?"
   - Verify response

**Success Criteria**:
- [ ] Wake word detected correctly
- [ ] Recording starts after wake word beep
- [ ] Transcription completes successfully
- [ ] AI response generated
- [ ] TTS response plays (if enabled)
- [ ] System returns to listening state

### Test 5.2: Interruption Support

**Purpose**: Verify barge-in still works during TTS playback

**Test Procedure**:
1. Start voice gateway
2. Trigger interaction with long response
3. Interrupt TTS with wake word
4. Verify new query is processed

**Success Criteria**:
- [ ] TTS playback cancels on wake word
- [ ] "Wake word detected during playback (interruption)" logged
- [ ] New query processed correctly
- [ ] No audio glitches or stuck states

## Test Phase 6: Documentation Validation

### Test 6.1: Environment Variables

**Purpose**: Verify all new environment variables are documented

**Steps**:
1. Check .env.example for:
   - [ ] MCP_RETRY_ATTEMPTS
   - [ ] MCP_RETRY_BASE_DELAY
   - [ ] DETECTOR_WARMUP_MS

**Success Criteria**:
- [ ] All variables documented
- [ ] Defaults match config.js
- [ ] Helpful comments explain purpose

### Test 6.2: Boot Timing Logs

**Purpose**: Verify boot timing instrumentation is helpful

**Steps**:
1. Review Boot Time Performance Summary log
2. Verify all phases are tracked
3. Check timing makes sense

**Success Criteria**:
- [ ] All 8 phases logged (1, 2, 3, 4, 5, 5.5, 6, 7)
- [ ] Total time matches sum of phases
- [ ] Phase durations are reasonable
- [ ] Log format is readable

## Success Metrics Summary

**Primary Goals**:
- [ ] **Boot time < 7 seconds** (Target: 40-50% improvement from ~12s)
- [ ] **Wake word accuracy >= 90%** (No regression from warm-up timer change)
- [ ] **All features functional** (MCP tools, welcome message, health checks)
- [ ] **Graceful error handling** (MCP failures, TTS failures)

**Secondary Goals**:
- [ ] Boot time variance < 1 second across multiple boots
- [ ] MCP retry optimization reduces failure case delay
- [ ] Documentation complete and accurate
- [ ] No console errors or warnings (except expected failures)

## Troubleshooting

### Issue: Boot time still > 7 seconds

**Possible Causes**:
1. MCP server slow to respond - Check Z-Wave JS UI health
2. TTS synthesis slow - Check network/API performance
3. Detector warm-up taking full 1500ms - Normal in some environments

**Debug Steps**:
```bash
# Check individual phase timings
grep "Boot Time Performance Summary" -A 10 optimized-boot.log

# Identify slowest phase
# If Phase 5.5 is slow, MCP or detector may be the issue
# If Phase 6 is slow, TTS synthesis may be slow
```

### Issue: False wake word detections increased

**Solution**:
```bash
# Increase detector warm-up time
export DETECTOR_WARMUP_MS=2000  # or add to .env.tmp

# Or restore to original 2500ms
export DETECTOR_WARMUP_MS=2500
```

### Issue: MCP tools not available

**Debug Steps**:
1. Check MCP server is running: `curl http://localhost:8091/health`
2. Check logs for MCP initialization errors
3. Verify `ZWAVE_UI_URL` is correct in .env.tmp
4. Check retry attempts completed

## Reporting Results

After completing all tests, please document:

1. **Boot Time Results**:
   - Baseline boot time (if measured): _____ seconds
   - Optimized boot time: _____ seconds
   - Improvement percentage: _____ %

2. **Test Results Summary**:
   - Tests passed: ____ / ____
   - Tests failed: ____ / ____
   - Known issues: (list any)

3. **Performance Notes**:
   - Hardware: (e.g., Raspberry Pi 4, macOS, etc.)
   - Notable observations: (anything unexpected)

4. **Recommendations**:
   - Configuration changes needed: (if any)
   - Further optimizations: (if identified)

---

**Testing Complete**: YES / NO

**Ready for Production**: YES / NO / NEEDS_WORK

**Tester**: _______________
**Date**: _______________
