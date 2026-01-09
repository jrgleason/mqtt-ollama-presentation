# Voice Gateway Boot Time Analysis

## Executive Summary

**Current Boot Time**: ~12+ seconds
**Optimized Boot Time**: ~6-7 seconds
**Improvement**: 40-50% reduction (~5-6 seconds faster)

## Current Boot Breakdown

| Phase | Component | Duration | Blocking? |
|-------|-----------|----------|-----------|
| 1 | Provider Health Checks | ~500ms | Yes |
| 2 | Detector Initialization | ~100ms | Yes |
| 3 | MCP Tool Discovery | ~2-6s | Yes* |
| 4 | Voice Service Setup | ~10ms | Yes |
| 5 | Microphone Start | ~100ms | Yes |
| 6 | Welcome TTS Synthesis | ~1147ms | Yes* |
| 6 | Welcome TTS Playback | ~2090ms | Yes |
| 6 | Post-Welcome Reset Delay | ~1000ms | Yes* |
| 7 | Detector Warm-up | ~2500ms | Yes |
| **Total** | | **~12+ seconds** | |

\* Can be optimized (non-blocking or removable)

## Optimization Opportunities

### Quick Wins (Immediate Implementation)

#### 1. Remove Post-Welcome Reset Delay
- **Savings**: ~1 second
- **Risk**: None (redundant delay)
- **Effort**: Trivial (delete 4 lines)
- **Rationale**: Detector warm-up timer already ensures stability

#### 2. Optimize MCP Retry Strategy
- **Savings**: ~2-4 seconds (on failure cases)
- **Risk**: None (configuration only)
- **Effort**: Minimal (change 2 config values)
- **Rationale**: Most failures are immediate (not transient)
- **Change**: 3 attempts → 2 attempts, 2s delay → 1s delay

#### 3. Parallelize MCP Initialization
- **Savings**: ~2-3 seconds
- **Risk**: Low (graceful degradation already exists)
- **Effort**: Medium (refactor main.js Phase 3)
- **Rationale**: MCP has no dependencies on detector/microphone

#### 4. Pre-synthesize Welcome Message
- **Savings**: ~1 second
- **Risk**: Low (non-critical component)
- **Effort**: Medium (refactor InitUtil.js)
- **Rationale**: TTS synthesis can run during MCP init

**Total Quick Win Savings**: ~5-6 seconds

### Medium Wins (Optional)

#### 5. Parallelize Health Checks
- **Savings**: ~200-300ms
- **Risk**: None
- **Effort**: Low (Promise.allSettled refactor)
- **Rationale**: AI and TTS checks are independent

#### 6. Reduce Detector Warm-up Timer
- **Savings**: ~500-1000ms
- **Risk**: Medium (possible accuracy impact)
- **Effort**: Low (configuration + testing)
- **Rationale**: 2.5s may be overly conservative
- **Requires**: Accuracy testing (100+ trials)

**Total Medium Win Savings**: ~0.7-1.3 seconds

## Implementation Phases

### Phase 1: Zero-Risk Quick Wins (~3-4s savings)
1. Remove post-welcome reset delay
2. Optimize MCP retry strategy
3. Parallelize health checks

**Estimated Time**: 1-2 hours
**Risk**: Minimal
**Rollback**: Simple git revert

### Phase 2: Parallelization (~3-4s additional savings)
1. Parallelize MCP initialization
2. Pre-synthesize welcome message

**Estimated Time**: 3-4 hours
**Risk**: Low (well-tested fallbacks)
**Rollback**: Git revert

### Phase 3: Optional Tuning (~0.5-1s additional savings)
1. Reduce detector warm-up timer (testing required)

**Estimated Time**: 2-3 hours (including testing)
**Risk**: Medium (accuracy testing required)
**Rollback**: Environment variable change

## Optimized Boot Sequence

```
START (t=0)
├─ Phase 1: Health Checks (parallel) → ~500ms
│  ├─ AI provider health check (parallel)
│  └─ TTS provider health check (parallel)
│
├─ Phase 2: Detector Init → ~100ms
│  └─ Load ONNX models
│
├─ Phase 3-5: Parallel Operations → ~2-3s (max of parallel tasks)
│  ├─ MCP tool discovery (non-blocking, 2-3s)
│  ├─ Welcome TTS synthesis (parallel, ~1s)
│  ├─ Orchestrator setup (~10ms)
│  └─ Microphone start (~100ms)
│
├─ Phase 6: Detector Warm-up → ~2.5s
│  └─ Wait for embedding buffer stability
│
├─ Phase 7: Welcome Playback → ~2s
│  └─ Play pre-synthesized audio
│
└─ READY (t=~6-7s)
```

## Testing Strategy

### Performance Testing
1. Add timing instrumentation to all phases
2. Measure baseline boot time (10 trials, average)
3. Apply optimizations incrementally
4. Measure after each optimization
5. Validate cumulative improvement

### Regression Testing
1. Wake word detection accuracy (no false positives)
2. MCP tool availability (all tools registered)
3. Welcome message playback (correct timing)
4. First voice interaction (no delays or errors)

### Accuracy Testing (Optional - Phase 3)
1. Baseline: 100 wake word triggers with 2.5s timer
2. Test: 100 wake word triggers with 1.5s timer
3. Compare false positive rates
4. If delta <5%, safe to reduce
5. If delta ≥5%, revert or make configurable

## Key Files Modified

- `apps/voice-gateway-oww/src/main.js` - Startup orchestration
- `apps/voice-gateway-oww/src/util/InitUtil.js` - Welcome message + detector setup
- `apps/voice-gateway-oww/src/services/MCPIntegration.js` - Retry logic
- `apps/voice-gateway-oww/src/config.js` - MCP retry defaults
- `apps/voice-gateway-oww/src/util/ProviderHealthCheck.js` - Parallel checks
- `apps/voice-gateway-oww/src/util/OpenWakeWordDetector.js` - Warm-up timer (optional)

## Performance Targets

| Metric | Before | After (Phase 1-2) | Improvement |
|--------|--------|-------------------|-------------|
| Boot Time | ~12s | ~6-7s | 40-50% |
| Health Checks | ~500ms | ~300ms | 40% |
| MCP Init (success) | ~2-3s | ~0s (parallel) | 100%* |
| MCP Init (failure) | ~6s | ~1s | 83% |
| Welcome Message | ~4.2s | ~2s | 52%* |
| Total Optimization | | ~5-6s | ~45% |

\* Time removed from critical path (still runs, but in parallel)

## Risk Mitigation

### MCP Parallelization
- **Risk**: Tools unavailable at first query
- **Mitigation**: Graceful degradation to local tools
- **Fallback**: MCP init completes during wake word detection (~1-3s)

### Pre-synthesized Welcome
- **Risk**: Synthesis fails silently
- **Mitigation**: Try/catch with fallback to skip welcome
- **Impact**: Non-critical (service still functional)

### Reduced Warm-up Timer
- **Risk**: Increased false wake word triggers
- **Mitigation**: Comprehensive accuracy testing before deployment
- **Rollback**: Environment variable change (no code deploy)

## Success Criteria

1. ✅ Boot time <7 seconds (currently ~12s)
2. ✅ No increase in false wake word detections
3. ✅ All health checks complete successfully
4. ✅ MCP tools registered before first query
5. ✅ Welcome message plays at correct time
6. ✅ First voice interaction responds immediately

## Next Steps

1. Review and approve proposal
2. Implement Phase 1 (zero-risk quick wins)
3. Test and validate Phase 1 improvements
4. Implement Phase 2 (parallelization)
5. Test and validate Phase 2 improvements
6. (Optional) Implement Phase 3 with accuracy testing
7. Document performance improvements
8. Archive change proposal after deployment
