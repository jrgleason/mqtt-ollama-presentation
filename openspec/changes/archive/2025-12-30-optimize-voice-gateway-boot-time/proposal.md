# Change: Optimize Voice Gateway Boot Time

## Why

The voice gateway currently takes 12+ seconds to become ready for voice interactions, which creates a poor user experience during demos and development. The slow boot time is caused by sequential initialization of components that could run in parallel, unnecessary delays, and overly conservative retry strategies.

Target: Reduce boot time from ~12s to ~6-7s (40-50% improvement).

## What Changes

### Quick Wins (High Impact, Low Risk)
1. **Remove unnecessary post-welcome reset delay** (~1s savings)
   - Eliminate redundant 1000ms delay + detector reset after welcome message playback
   - Detector warm-up already handles initialization during welcome playback

2. **Parallelize MCP initialization with detector warm-up** (~2-3s savings)
   - Run MCP tool discovery concurrently with detector initialization and microphone startup
   - MCP init currently blocks critical path unnecessarily

3. **Optimize MCP retry strategy** (~2-4s savings on first boot)
   - Reduce retry attempts from 3 to 2
   - Reduce base delay from 2000ms to 1000ms
   - Most MCP failures are immediate (not transient), shorter retries more appropriate

4. **Pre-synthesize welcome message during initialization** (~1s savings)
   - Generate welcome TTS audio during MCP/tool initialization
   - Cache and play when ready instead of synthesizing after all init completes

### Medium Wins (Optional)
5. **Parallelize provider health checks** (~200-300ms savings)
   - Run AI and TTS health checks concurrently with Promise.allSettled

6. **Reduce detector warm-up timer** (~500-1000ms savings)
   - Reduce hard-coded 2.5s timer to 1.5s after buffer fills
   - Requires accuracy testing to prevent false triggers

## Impact

### Affected Specs
- `voice-gateway` - Startup sequence, initialization timing
- `tool-execution` - MCP integration initialization timing

### Affected Code
- `apps/voice-gateway-oww/src/main.js` - Startup sequence orchestration
- `apps/voice-gateway-oww/src/util/InitUtil.js` - Welcome message synthesis and detector setup
- `apps/voice-gateway-oww/src/services/MCPIntegration.js` - Retry configuration
- `apps/voice-gateway-oww/src/config.js` - MCP retry settings
- `apps/voice-gateway-oww/src/util/ProviderHealthCheck.js` - Health check parallelization
- `apps/voice-gateway-oww/src/util/OpenWakeWordDetector.js` - Warm-up timer (optional)

### Breaking Changes
None. All optimizations are internal to the boot sequence.

### Risks
- **Low Risk** (items 1-4): Configuration and parallelization changes with no behavioral impact
- **Medium Risk** (item 6): Reducing warm-up timer could increase false wake word triggers - needs testing

## Success Criteria

1. Boot time from process start to "Voice Gateway ready" log: <7 seconds (currently ~12s)
2. No increase in false wake word detections (accuracy maintained)
3. All health checks still complete successfully
4. MCP tools still discovered and registered correctly
5. Welcome message still plays correctly on startup

## Testing Strategy

1. **Boot Time Measurement**: Add timing markers to startup phases, measure before/after
2. **Accuracy Testing**: Test wake word detection accuracy with reduced warm-up timer
3. **Integration Testing**: Verify MCP tools available after parallel initialization
4. **Regression Testing**: Ensure existing voice interaction flows unchanged

## Non-Goals

- Lazy loading of tool system (defers problem, doesn't solve it)
- ONNX model optimization (outside scope, minimal impact)
- Microphone initialization optimization (already fast at ~100ms)
