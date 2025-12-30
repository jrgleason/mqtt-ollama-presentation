# Design: Voice Gateway Boot Time Optimization

## Context

The voice gateway follows a 7-phase sequential startup process:
1. Provider health checks (~500ms)
2. Detector initialization (~100ms)
3. MCP tool system initialization (~2-6s)
4. Voice service setup (~10ms)
5. Microphone start (~100ms)
6. Welcome message synthesis + playback (~4.2s)
7. Detector warm-up (~2.5s)

**Problem**: Phases run sequentially even when dependencies don't require it. Total boot time is ~12+ seconds, which is too slow for demos and development iterations.

**Constraints**:
- Must maintain accuracy of wake word detection
- Cannot break MCP tool discovery
- Welcome message must play at correct time (after detector ready)
- Health checks must complete before reporting service ready

## Goals / Non-Goals

### Goals
- Reduce boot time to <7 seconds (40-50% improvement)
- Maintain 100% accuracy of wake word detection
- Preserve all functionality and error handling
- Keep code maintainable and debuggable

### Non-Goals
- Lazy loading (defers problem, adds complexity)
- ONNX model optimization (outside scope)
- Microphone initialization optimization (already fast)
- Changing warm-up accuracy thresholds (beyond timer reduction)

## Decisions

### Decision 1: Remove Post-Welcome Reset Delay

**What**: Eliminate the 1000ms delay + detector reset after welcome message playback.

**Why**:
- Detector is already in warm-up phase during welcome playback
- The reset was added in a previous fix but is redundant given the warm-up timer
- The warm-up timer (2.5s after embedding buffer fills) already ensures detector stability
- Simple removal with zero risk

**Alternatives Considered**:
- Keep delay but reduce it: Still wastes time unnecessarily
- Move reset earlier: Doesn't address root cause (delay is unnecessary)

**Implementation**: Remove lines 117-120 in `InitUtil.js:startTTSWelcome()`

---

### Decision 2: Parallelize MCP Initialization

**What**: Run MCP tool discovery concurrently with detector and microphone initialization instead of blocking the critical path.

**Why**:
- MCP initialization has no dependencies on detector or microphone
- Tools only needed when first voice query is processed (after wake word + transcription)
- Typical flow: wake word detection takes 1-3s, giving MCP ample time to complete
- MCP failures already gracefully degrade to local tools only

**Implementation Strategy**:
```javascript
// Current (sequential):
const mcpClient = await initializeMCPIntegration(config, logger); // BLOCKS 2-6s
const detector = await setupWakeWordDetector();
const micInstance = setupMic(...);

// Optimized (parallel):
const mcpPromise = initializeMCPIntegration(config, logger); // DON'T AWAIT
const detector = await setupWakeWordDetector();
const micInstance = setupMic(...);
// ... later, before first query ...
const {mcpClient, tools} = await mcpPromise; // Ensure ready when needed
```

**Fallback Strategy**: If MCP init incomplete when first query arrives, use local tools only and log warning. MCP tools will become available once init completes.

**Alternatives Considered**:
- Lazy load MCP on first query: Adds 2-6s delay to first interaction (bad UX)
- Keep sequential: Unnecessarily slow, no benefit
- Pre-spawn MCP server in systemd: Complex, outside application scope

---

### Decision 3: Optimize MCP Retry Strategy

**What**: Reduce retry attempts from 3 to 2, base delay from 2000ms to 1000ms.

**Why**:
- Current strategy assumes transient failures (network issues, slow server start)
- Reality: Most MCP failures are immediate and permanent (server not installed, wrong path, missing deps)
- Exponential backoff of 2s + 4s = 6s wasted on inevitable failure
- New strategy: 1s retry gives second chance without excessive delay
- Successful connections happen on first attempt (0ms delay)

**Impact**:
- Success case: No change (0ms delay)
- Transient failure: 1s vs 2s delay (acceptable)
- Permanent failure: 1s vs 6s delay (significant improvement)

**Configuration**:
```javascript
// config.js
mcp: {
    retryAttempts: 2,        // was: 3
    retryBaseDelay: 1000,    // was: 2000
}
```

**Alternatives Considered**:
- No retry (1 attempt): Too aggressive, might miss transient failures
- Keep 3 attempts, reduce delay: Still wastes time on permanent failures
- Circuit breaker pattern: Over-engineering for this use case

---

### Decision 4: Pre-synthesize Welcome Message

**What**: Generate welcome message TTS audio during Phase 3 (MCP init) instead of Phase 6 (after all init complete).

**Why**:
- TTS synthesis takes ~1147ms but blocks startup unnecessarily
- Phase 3 is waiting for MCP anyway (now in parallel)
- Audio can be cached and played when detector ready
- Playback still happens at correct time (after detector warm-up)

**Implementation Strategy**:
```javascript
// Phase 3: Start MCP and welcome synthesis in parallel
const mcpPromise = initializeMCPIntegration(config, logger);
const welcomePromise = synthesizeWelcomeMessage(config, logger);

// ... other phases ...

// Phase 6: Play pre-synthesized welcome message
const welcomeAudio = await welcomePromise;
if (welcomeAudio) {
    const playback = audioPlayer.playInterruptible(welcomeAudio);
    // ... rest of welcome logic ...
}
```

**Error Handling**: If synthesis fails, log warning and continue without welcome message (non-critical).

**Alternatives Considered**:
- Keep sequential: Wastes 1s+ unnecessarily
- Cache welcome message on disk: Over-engineering, adds complexity
- Skip welcome message: Poor UX for presentation demo

---

### Decision 5 (Optional): Parallelize Health Checks

**What**: Run AI and TTS provider health checks concurrently using `Promise.allSettled()`.

**Why**:
- Checks are independent (no shared state)
- AI check ~200ms, TTS check ~200ms = 400ms sequential
- Parallel: max(200ms, 200ms) = ~200ms
- Simple refactor with Promise.allSettled preserves individual error handling

**Implementation**:
```javascript
const [aiResult, ttsResult] = await Promise.allSettled([
    checkAIHealth(),
    checkTTSHealth()
]);
```

**Alternatives Considered**:
- Keep sequential: No benefit, only wastes time
- Promise.all: Loses individual error reporting

---

### Decision 6 (Optional): Reduce Detector Warm-up Timer

**What**: Reduce hard-coded 2.5s warm-up timer to 1.5s after embedding buffer fills.

**Why**:
- 2.5s was chosen conservatively without data
- Warm-up ensures detector stability after buffer fill
- Reducing to 1.5s may be safe with minimal accuracy impact

**Risk**: Could increase false wake word triggers if detector not fully stable.

**Mitigation**:
- Make configurable via `DETECTOR_WARMUP_MS` environment variable
- Test accuracy: 100 wake word trials, measure false positive rate before/after
- If accuracy degrades >5%, revert or keep at 2.5s

**Testing Protocol**:
1. Baseline: 100 wake word triggers with 2.5s timer, measure false positives
2. Test: 100 wake word triggers with 1.5s timer, measure false positives
3. Compare: If delta <5%, safe to reduce. Otherwise revert.

**Alternatives Considered**:
- Keep 2.5s: Conservative, no data to support necessity
- Reduce to 1.0s: Too aggressive, likely to hurt accuracy
- Remove timer entirely: Definitely would hurt accuracy

## Risks / Trade-offs

### Risk 1: Parallel MCP Init Timing
**Risk**: First voice query arrives before MCP init completes, tools unavailable.

**Likelihood**: Low - wake word detection + transcription takes 1-3s, MCP typically completes in 2s.

**Mitigation**:
- Graceful degradation to local tools only
- Log warning if MCP incomplete
- Tools become available once init completes
- Most queries don't need Z-Wave tools

**Trade-off**: Rare edge case of incomplete tools vs 2-3s faster boot for all cases.

---

### Risk 2: Reduced Warm-up Timer Accuracy
**Risk**: Shorter warm-up timer increases false wake word detections.

**Likelihood**: Medium - depends on buffer stability thresholds.

**Mitigation**:
- Make configurable (environment variable)
- Comprehensive accuracy testing before deployment
- Easy rollback (change config)
- Mark as optional optimization

**Trade-off**: Possible accuracy degradation vs 500-1000ms faster boot.

---

### Risk 3: Pre-synthesized Welcome Timing
**Risk**: Welcome audio synthesis fails silently, no message played.

**Likelihood**: Low - same TTS system used throughout, reliable.

**Mitigation**:
- Wrap synthesis in try/catch
- Log warning on failure
- Continue boot without welcome (non-critical)
- Test synthesis error handling

**Trade-off**: None - only improves timing, maintains same error handling.

## Migration Plan

### Phase 1: Low-Risk Quick Wins (Safe to Deploy)
1. Remove post-welcome reset delay (1.1)
2. Optimize MCP retry strategy (2.1-2.5)
3. Parallelize health checks (5.1-5.5)

**Expected Improvement**: ~3-4 seconds
**Risk**: Minimal
**Rollback**: Simple config/code revert

### Phase 2: Parallelization (Moderate Risk)
1. Parallelize MCP initialization (3.1-3.7)
2. Pre-synthesize welcome message (4.1-4.7)

**Expected Improvement**: ~3-4 seconds (cumulative: ~6-7s total)
**Risk**: Low-Medium
**Rollback**: Code revert, well-tested fallback paths

### Phase 3: Optional Accuracy Testing (Higher Risk)
1. Reduce detector warm-up timer (6.1-6.6)

**Expected Improvement**: ~0.5-1 second (cumulative: ~7-8s total)
**Risk**: Medium (accuracy impact)
**Rollback**: Config change only

### Rollback Strategy
- All changes isolated to startup sequence
- No database migrations or API changes
- Simple git revert + service restart
- Config rollback via environment variables

## Open Questions

1. **MCP Failure Rate**: What percentage of boots fail MCP connection on first attempt?
   - **Action**: Add metrics to track retry usage
   - **Decision**: If >20% require retry, keep 3 attempts

2. **Warm-up Timer Sensitivity**: Is 1.5s sufficient for detector stability?
   - **Action**: Accuracy testing with 100+ trials
   - **Decision**: Data-driven based on false positive rate

3. **Welcome Message Timing**: Should welcome play during detector warm-up or after?
   - **Current**: After warm-up (conservative)
   - **Alternative**: During warm-up (more aggressive, faster UX)
   - **Action**: Test user experience with both approaches

4. **Health Check Necessity**: Do health checks need to complete before "ready" state?
   - **Current**: Yes (informational, don't block)
   - **Alternative**: Move to background after "ready" log
   - **Action**: Review if health checks provide value during boot
