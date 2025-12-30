# Testing Guide: refactor-code-quality-improvements

## Overview

This proposal implemented code quality improvements including:
- Extracted magic numbers to named constants
- Resolved all TODO comments
- Implemented MQTT device control
- Organized documentation and scripts into dedicated directories
- Updated project documentation

## Pre-Testing Checklist

Before testing, verify the changes are in place:

```bash
# 1. Check new constants files exist
ls -la apps/voice-gateway-oww/src/constants/
# Should see: timing.js, thresholds.js

# 2. Verify documentation moved
ls -la apps/voice-gateway-oww/docs/
# Should see: STARTUP_ORCHESTRATION.md, IMPLEMENTATION_SUMMARY.md, etc.

# 3. Verify scripts moved
ls -la apps/voice-gateway-oww/scripts/
# Should see: setup.sh, switch-mode.sh, download-voice.sh

# 4. Check no TODOs remain
rg -n 'TODO|FIXME|HACK' apps/voice-gateway-oww/src apps/zwave-mcp-server/src --type js
# Should only see informative comments, no actual TODOs
```

## Testing Plan

### Test 1: Voice Gateway End-to-End

**Objective:** Verify constants don't break voice gateway functionality

```bash
cd apps/voice-gateway-oww
npm run dev
```

**Expected Behavior:**
1. Service starts without errors
2. Wake word detection works (say "Hey Jarvis")
3. Voice command is transcribed
4. AI response is generated
5. TTS speaks response

**Pass Criteria:**
- No errors related to timing constants (DETECTOR_WARMUP_TIMEOUT_MS, etc.)
- No errors related to threshold constants (WAKE_WORD_THRESHOLD, etc.)
- Complete voice interaction flow works identically to before refactoring

### Test 2: MQTT Device Control (Z-Wave MCP Server)

**Objective:** Verify MQTT publishing works in control_zwave_device tool

**Prerequisites:**
- MQTT broker running
- Z-Wave devices configured
- zwave-mcp-server running

**Test Commands:**
```bash
# Start MCP server (in separate terminal)
cd apps/zwave-mcp-server
npm start

# From voice gateway, say:
"Hey Jarvis, turn on switch one"
"Hey Jarvis, dim living room to 50 percent"
```

**Expected Behavior:**
- Device control commands publish to MQTT
- Devices respond to commands
- Success messages confirm command sent

**Pass Criteria:**
- MQTT commands are published (check MQTT broker logs)
- Devices change state
- No "dry-run" messages (should show actual MQTT publishing)

### Test 3: Documentation and Scripts Accessibility

**Objective:** Verify moved files are accessible

```bash
# Test script execution from new location
cd apps/voice-gateway-oww
./scripts/switch-mode.sh offline

# Verify documentation is accessible
cat docs/STARTUP_ORCHESTRATION.md | head -20
```

**Pass Criteria:**
- Scripts execute from `./scripts/` directory
- Documentation is readable from `docs/` directory
- No broken links in README or documentation files

### Test 4: Constant Import Verification

**Objective:** Ensure all constant imports resolve correctly

```bash
# Run the application and check for import errors
cd apps/voice-gateway-oww
npm run dev 2>&1 | grep -i "cannot find module\|import"

# Should not see any import errors related to constants
```

**Pass Criteria:**
- No "Cannot find module" errors for timing.js or thresholds.js
- Application starts successfully
- All constants are used correctly

### Test 5: Provider Health Checks

**Objective:** Verify timeout constants work in health checks

```bash
cd apps/voice-gateway-oww
npm run dev
# Watch startup logs for health check timeouts
```

**Expected Log Messages:**
- Health checks complete within PROVIDER_HEALTH_CHECK_TIMEOUT_MS (5000ms)
- MCP connection completes within MCP_CONNECTION_TIMEOUT_MS (5000ms)
- MQTT connection completes within MQTT_CONNECTION_TIMEOUT_MS (5000ms)

**Pass Criteria:**
- All health checks complete successfully
- Timeout values are logged correctly
- No premature timeouts

## Regression Testing

**Critical Paths to Verify:**

1. **Voice Interaction Flow**
   - Wake word detection
   - Audio recording
   - Transcription
   - AI response generation
   - TTS playback

2. **Tool Execution**
   - datetime-tool works (time/date queries)
   - search-tool works (web searches)
   - control_zwave_device works (device control)
   - get_device_sensor_data works (sensor queries)

3. **Error Handling**
   - Timeouts trigger correctly
   - Error messages are user-friendly
   - Graceful degradation when services unavailable

4. **Demo Modes**
   - Test all 4 modes: offline, online, hybrid-a, hybrid-b
   - Mode switching script works from new location
   - Each mode uses correct AI and TTS providers

## Known Issues / Limitations

1. **setupMic() Function NOT Refactored**
   - Decision: Too risky before presentation
   - Impact: Function remains ~400 lines
   - Mitigation: Working correctly, no functional issues

2. **Large Files NOT Refactored**
   - Files: AnthropicClient.js, VoiceInteractionOrchestrator.js
   - Decision: Optional refactoring skipped
   - Impact: Files remain 400-500 lines
   - Mitigation: Well-organized, no maintainability issues

3. **CommonJS Migration SKIPPED**
   - Decision: Too risky to convert all modules
   - Impact: Mix of ES modules and CommonJS may remain
   - Mitigation: Current setup works correctly

## Success Criteria

All tests must pass with:
- ✅ No new errors or warnings
- ✅ Identical behavior before and after refactoring
- ✅ All constants used correctly
- ✅ MQTT device control functional
- ✅ Documentation and scripts accessible
- ✅ Demo modes work

## Rollback Plan

If critical issues found:

```bash
# Revert the changes
git revert <commit-sha>

# Or restore specific files
git checkout HEAD~1 -- apps/voice-gateway-oww/src/constants/
git checkout HEAD~1 -- apps/zwave-mcp-server/src/index.js
```

## Post-Testing Actions

After successful testing:

1. Update tasks.md to mark all tasks complete
2. Archive the proposal using `openspec:archive`
3. Document any issues found
4. Plan next refactoring steps (if needed)

## Contact / Questions

If you encounter issues during testing:
- Check proposal.md for rationale on design decisions
- Review IMPLEMENTATION_SUMMARY.md for implementation details
- Consult voice-gateway-troubleshooting.md for debugging tips
