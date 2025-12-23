# Proposal: Fix Startup Speech Timing

**Change ID:** `fix-startup-speech-timing`
**Status:** Implemented - Awaiting User Testing
**Created:** 2025-12-22
**Implemented:** 2025-12-22
**Affects:** Voice Gateway Startup Sequence

## Summary

Fix confusing user experience where the voice gateway says "Hello, I am Jarvis. How can I help?" before the tool system is initialized, creating a delay between when the user hears the prompt and when they can actually interact with the system.

## Motivation

### Current Problem

The voice gateway startup sequence has a timing issue:

1. ✅ Services initialized (MQTT, AI, TTS, Z-Wave)
2. ✅ Wake word detector initialized
3. 🔊 **Welcome message spoken: "Hello, I am Jarvis. How can I help?"**
4. ⏱️ Tool system initialization begins (1-2 seconds)
5. ⏱️ Voice orchestrator created
6. ⏱️ State machine setup
7. ⏱️ Microphone started
8. ✅ System actually ready to listen

**User Experience Impact:**
- User hears: "How can I help?"
- System state: Still initializing tools
- User confusion: "Why isn't it responding? I thought it was ready!"
- Creates ~1-2 second delay after prompt where system appears broken

**Evidence from logs:**
```
Logger.js:40ℹ️  [info] ✅ Welcome message spoken
Logger.js:40🔍 [debug] OpenWakeWord detector buffers reset
Logger.js:40🔍 [debug] 🔄 Detector reset (post-startup-tts)
Logger.js:40ℹ️  [info] 🔧 Initializing tool system...    ← DELAY HERE!
ToolRegistry.js:37✅ Registered tool: get_current_datetime
ToolRegistry.js:37✅ Registered tool: search_web
ToolRegistry.js:37✅ Registered tool: control_speaker_volume
ToolRegistry.js:37✅ Registered tool: control_zwave_device
Logger.js:40ℹ️  [info] ✅ Tool system initialized
```

### Why This Matters

1. **User Trust** - The system promises readiness ("How can I help?") but isn't actually ready
2. **Demo Reliability** - During presentation, this creates awkward pauses that make the system look broken
3. **Professional Polish** - Production systems should only announce readiness when truly ready
4. **Performance Perception** - Even though total startup time is the same, perceived responsiveness is worse

### Root Cause

In `apps/voice-gateway-oww/src/main.js` (lines 313-349), the initialization order is:

```javascript
async function main() {
    await initServices();
    const detector = await setupWakeWordDetector();
    await startTTSWelcome(detector, audioPlayer);  // ← Speaks TOO EARLY

    // Tool system initialization happens AFTER welcome message
    logger.info('🔧 Initializing tool system...');
    const toolRegistry = new ToolRegistry();
    // ... register tools ...
    const toolExecutor = new ToolExecutor(toolRegistry, logger);

    // More setup...
    const orchestrator = new VoiceInteractionOrchestrator(config, logger, toolExecutor);
    const voiceService = setupVoiceStateMachine();
    const micInstance = setupMic(voiceService, orchestrator, detector);

    logger.info('✅ Voice Gateway ready');
    voiceService.send({type: 'READY'});
}
```

## Proposed Changes

### Core Fix: Reorder Initialization Steps

Move tool system initialization BEFORE the welcome message:

**New sequence:**
1. ✅ Services initialized (MQTT, AI, TTS, Z-Wave)
2. ✅ Wake word detector initialized
3. ✅ **Tool system initialized**  ← Moved earlier
4. ✅ **Voice orchestrator created**  ← Moved earlier
5. ✅ **State machine setup**  ← Moved earlier
6. 🔊 **Welcome message spoken: "Hello, I am Jarvis. How can I help?"**
7. ✅ Microphone started
8. ✅ Activate listening mode

**Why this works:**
- When user hears "How can I help?", the system is genuinely ready
- No perceptible delay between welcome message and first interaction capability
- Total startup time unchanged, but perceived responsiveness improved

### Implementation Strategy

**Single file change: `apps/voice-gateway-oww/src/main.js`**

Move lines 319-338 (tool initialization + orchestrator setup) to occur BEFORE line 317 (startTTSWelcome).

**Before:**
```javascript
async function main() {
    await initServices();
    const detector = await setupWakeWordDetector();
    await startTTSWelcome(detector, audioPlayer);  // Step 3

    logger.info('🔧 Initializing tool system...');  // Step 4
    const toolRegistry = new ToolRegistry();
    // ... tool registration ...
    const orchestrator = new VoiceInteractionOrchestrator(...);  // Step 5
    const voiceService = setupVoiceStateMachine();  // Step 6
    const micInstance = setupMic(...);  // Step 7
    voiceService.send({type: 'READY'});  // Step 8
}
```

**After:**
```javascript
async function main() {
    await initServices();
    const detector = await setupWakeWordDetector();

    // Initialize tool system BEFORE welcome message
    logger.info('🔧 Initializing tool system...');
    const toolRegistry = new ToolRegistry();
    // ... tool registration ...
    const toolExecutor = new ToolExecutor(toolRegistry, logger);
    logger.info('✅ Tool system initialized', {...});

    // Create orchestrator and state machine
    const orchestrator = new VoiceInteractionOrchestrator(...);
    const voiceService = setupVoiceStateMachine();

    // NOW speak welcome message - system is ready!
    await startTTSWelcome(detector, audioPlayer);

    // Start microphone and activate listening
    const micInstance = setupMic(...);
    logger.info('✅ Voice Gateway ready');
    voiceService.send({type: 'READY'});
}
```

## Impact Analysis

### Breaking Changes

**None** - This is purely an internal reordering of initialization steps.

### Behavior Changes

**User-Visible:**
- Before: Welcome message → pause → system ready
- After: System ready → welcome message → immediately responsive

**Logs:**
- Tool initialization logs will appear before TTS synthesis logs
- Order change is visible in logs but functionally transparent

### Risk Assessment

**Risk: Very Low**

**Why:**
- No logic changes, only reordering of independent initialization steps
- Tool system doesn't depend on TTS or audio player
- VoiceInteractionOrchestrator already expects tools to be available at construction time
- State machine setup is independent of TTS

**Validation:**
- All existing tests should pass unchanged
- Startup logs will show new order (expected)
- User experience will improve (welcome message timing)

**Mitigation:**
- Test startup sequence 3+ times before deployment
- Verify all tools still registered correctly
- Confirm welcome message still plays
- Check that first voice command works immediately after welcome

## Success Criteria

- [x] Tool system initialized before welcome message
- [ ] No delay between "How can I help?" and system readiness (pending user testing)
- [ ] All tools still register correctly (pending user testing)
- [ ] Welcome message still plays successfully (pending user testing)
- [ ] First voice command after welcome message works immediately (pending user testing)
- [ ] Logs show new initialization order (pending user testing)

**Implementation Status:** Code changes complete. User needs to restart voice gateway service and verify behavior.

## Alternative Approaches Considered

### 1. Add "One moment, initializing..." Message
**Rejected** - Adds unnecessary verbosity. Better to just initialize faster.

### 2. Delay Welcome Message with setTimeout
**Rejected** - Hacky workaround that doesn't fix root cause. Adds artificial delay.

### 3. Make Tool Initialization Async and Parallel
**Rejected** - Over-engineering. Tools are already fast to initialize (~100ms total). Simple reordering is sufficient.

### 4. Remove Welcome Message Entirely
**Rejected** - Welcome message is valuable feedback that system started successfully. Just needs better timing.

## References

- Voice Gateway architecture: `apps/voice-gateway-oww/README.md`
- Main entry point: `apps/voice-gateway-oww/src/main.js` (lines 313-354)
- Initialization utilities: `apps/voice-gateway-oww/src/util/InitUtil.js`
- Performance requirements: `openspec/project.md` (Voice response pipeline: <7s target)
- Tool system: `apps/voice-gateway-oww/src/services/ToolRegistry.js`, `apps/voice-gateway-oww/src/services/ToolExecutor.js`

## Performance Impact

**Startup Time:** No change (all steps still occur, just reordered)

**Perceived Responsiveness:** Significantly improved
- Before: User hears prompt → waits 1-2s → can interact
- After: User hears prompt → can interact immediately

**Memory:** No change

**CPU:** No change
