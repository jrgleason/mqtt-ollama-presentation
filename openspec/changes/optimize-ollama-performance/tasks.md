# Tasks: Optimize Ollama Performance

## 1. Add Configuration Options

- [x] 1.1 Add `OLLAMA_NUM_CTX` to config.js (default: 2048)
- [x] 1.2 Add `OLLAMA_TEMPERATURE` to config.js (default: 0.5)
- [x] 1.3 Add `OLLAMA_KEEP_ALIVE` to config.js (default: -1)
- [x] 1.4 Document new settings in .env.example
- [x] 1.5 Update .env.offline with optimized defaults

## 2. Update OllamaClient

- [x] 2.1 Pass numCtx to ChatOllama constructor
- [x] 2.2 Pass temperature from config (not hardcoded)
- [x] 2.3 Pass keepAlive to ChatOllama constructor
- [x] 2.4 Add debug logging for new settings

## 3. Tests

- [x] 3.1 Write Jest tests for config parsing (config.test.js)
- [x] 3.2 Write Jest tests for OllamaClient initialization (OllamaClient.test.js)
- [x] 3.3 Verify all tests pass

## 4. Model Preloading (Optional)

- [x] 4.1 Add warmup query during voice gateway startup
- [x] 4.2 Execute warmup after health check, before user interactions
- [x] 4.3 Log warmup timing for performance tracking

## 5. Verification (Manual)

> **Instructions for User**: Complete these verification steps manually.
> A benchmark script is available at `apps/voice-gateway-oww/scripts/benchmark-ollama.js`

- [ ] 5.1 Benchmark tool-call query (target: <2s)
- [ ] 5.2 Benchmark non-tool query (target: <1s)
- [ ] 5.3 Test total interaction time (target: <7s)
- [ ] 5.4 Verify response quality not degraded
- [ ] 5.5 Test on Raspberry Pi (if available)
- [x] 5.6 Run `openspec validate optimize-ollama-performance --strict`

---

## Manual Verification Guide

### Prerequisites

1. **Ollama running**: `ollama serve`
2. **Model downloaded**: `ollama pull qwen3:0.6b` (or your configured model)
3. **Environment configured**: Copy `.env.offline` or set `AI_PROVIDER=ollama`

### Step 1: Run Benchmark Script (5.1, 5.2)

```bash
cd apps/voice-gateway-oww
node scripts/benchmark-ollama.js
```

**Expected output:**
- Simple queries (non-tool): <1s
- Device/tool queries: <2s
- All tests should show `[PASS]`

### Step 2: Test Voice Gateway End-to-End (5.3)

```bash
cd apps/voice-gateway-oww
npm run dev -- --ollama
```

**Test these voice commands and check logs for timing:**

1. **"What time is it?"** (tool query)
   - Look for: `Ollama response (with tools) received` log
   - Target: Total duration <2s in log

2. **"Hello"** or **"How are you?"** (non-tool query)
   - Look for: `Ollama response received` log
   - Target: Duration <1s

3. **"Turn on the living room light"** (full interaction)
   - Measures: Wake word -> STT -> AI -> TTS
   - Target: Total <7s (use stopwatch or log timestamps)

**Log entries to watch:**

```
[DEBUG] Model warmup complete { duration: '1234ms' }
[DEBUG] Ollama response received { duration: '850ms' }
[DEBUG] Ollama response (with tools) received { duration: '1650ms' }
```

### Step 3: Verify Response Quality (5.4)

Ask these questions and verify coherent responses:

- "What time is it?" - Should respond with current time
- "Turn on the kitchen light" - Should execute device command
- "List all devices" - Should list available devices
- "What's 2 plus 2?" - Should respond with "4"

**Quality checklist:**
- [ ] Responses are in English (no Chinese characters)
- [ ] Tool calls work correctly
- [ ] No `<think>` tags in spoken output
- [ ] Responses are concise (1-2 sentences)

### Step 4: Raspberry Pi Testing (5.5, if available)

On Raspberry Pi, expect 2-3x slower times. Adjust targets:
- Tool-call queries: <5s (instead of <2s)
- Non-tool queries: <2s (instead of <1s)
- Total interaction: <15s (instead of <7s)

**Additional optimizations for Pi:**
```bash
# In .env
OLLAMA_NUM_CTX=1024     # Reduce from 2048
OLLAMA_MODEL=qwen2.5:0.5b  # Use smallest model
```

### Marking Tasks Complete

Once verified, update this file:
```
- [x] 5.1 Benchmark tool-call query (target: <2s)
- [x] 5.2 Benchmark non-tool query (target: <1s)
- [x] 5.3 Test total interaction time (target: <7s)
- [x] 5.4 Verify response quality not degraded
- [x] 5.5 Test on Raspberry Pi (if available) # Or N/A if no Pi
```

Then run: `openspec archive optimize-ollama-performance`
