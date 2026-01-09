# Proposal: Optimize Ollama Performance

## Summary

Reduce Ollama inference latency from 2-6 seconds to under 2 seconds by optimizing context window, temperature, model preloading, and keep-alive settings.

## Problem Statement

Ollama queries are significantly slower than Anthropic:

**Current Performance (from logs):**
| Query Type | Ollama Time | Target |
|------------|-------------|--------|
| With tool call | 3.5-5.8s | <2s |
| Without tool | 1.6-2.8s | <1s |
| Total interaction | 8-15s | <7s |

Anthropic queries are ~1-2s for comparable tasks.

## Analysis

### Current Configuration

From `OllamaClient.js`:
```javascript
this.#client = new ChatOllama({
    baseUrl: this.config.ollama.baseUrl,
    model: this.config.ollama.model,
    temperature: this.config.ollama.temperature || 0.7,
    numPredict: 150,
});
```

**Missing optimizations:**
1. No `num_ctx` - defaults to 4096 (can be 2048 for voice)
2. Temperature hardcoded at 0.7 (can be 0.3-0.5 for faster)
3. No `keep_alive` setting (model may unload after 5min)
4. No model preloading (first query is slow)

### Research Findings

From [Arsturn](https://www.arsturn.com/blog/tips-for-speeding-up-ollama-performance) and [Markaicode](https://markaicode.com/ollama-inference-speed-optimization/):

1. **Context Window (num_ctx)**
   - Default: 4096 tokens
   - Recommendation: 2048 for voice assistants
   - Impact: 30-50% faster inference

2. **Temperature**
   - Lower values (0.3-0.5) reduce computation
   - Impact: 10-20% faster for simple queries

3. **Keep-Alive**
   - Default: 5 minutes then unloads
   - Recommendation: `-1` (never unload) or `24h`
   - Impact: Eliminates 10-30s cold start

4. **Model Preloading**
   - Warm model before first user interaction
   - Impact: Eliminates first-query delay

### Current Bottlenecks

1. **Tool call round-trip**: 2 Ollama calls per interaction
   - Call 1: Get tool call request
   - Call 2: Process tool result, generate response

2. **Context window too large**: 4096 tokens
   - Voice queries are short (10-50 tokens)
   - Excess context increases attention computation

3. **Temperature 0.7 is high**: More sampling = more computation

## Proposed Solution

### 1. Add Configurable num_ctx

Add `OLLAMA_NUM_CTX` environment variable with default 2048:
```bash
OLLAMA_NUM_CTX=2048
```

### 2. Add Configurable Temperature

Add `OLLAMA_TEMPERATURE` environment variable with default 0.5:
```bash
OLLAMA_TEMPERATURE=0.5
```

### 3. Configure Keep-Alive

Add `OLLAMA_KEEP_ALIVE` environment variable:
```bash
OLLAMA_KEEP_ALIVE=-1  # Never unload, or use "24h"
```

### 4. Preload Model on Startup

Send a warmup query during voice gateway initialization to load model into memory before first user interaction.

### 5. Update OllamaClient

```javascript
this.#client = new ChatOllama({
    baseUrl: this.config.ollama.baseUrl,
    model: this.config.ollama.model,
    temperature: this.config.ollama.temperature || 0.5,
    numPredict: 150,
    numCtx: this.config.ollama.numCtx || 2048,
    keepAlive: this.config.ollama.keepAlive || -1,
});
```

## Expected Impact

| Optimization | Expected Improvement |
|--------------|---------------------|
| num_ctx 4096→2048 | 30-50% faster |
| Temperature 0.7→0.5 | 10-20% faster |
| Keep-alive (prevent unload) | No cold starts |
| Model preloading | No first-query delay |

**Combined target**: Reduce tool-call queries from 3.5-5.8s to <2s.

## Success Criteria

- [ ] Ollama tool-call queries complete in <2s
- [ ] Ollama non-tool queries complete in <1s
- [ ] Total interaction time <7s target achieved
- [ ] No regression in response quality
- [ ] Works on both macOS and Raspberry Pi

## Risks

**Low risk** - These are configuration changes only.

- Lower temperature may slightly reduce creativity (acceptable for home automation)
- Smaller context may truncate very long conversations (conversation manager already limits history)

## Files to Modify

- `apps/voice-gateway-oww/src/config.js` - Add new env vars
- `apps/voice-gateway-oww/src/OllamaClient.js` - Use new settings
- `apps/voice-gateway-oww/.env.example` - Document new settings
- `apps/voice-gateway-oww/.env.offline` - Set optimized defaults
- `apps/voice-gateway-oww/src/main.js` - Add model preloading (optional)

## References

- [Tips for Speeding Up Ollama Performance](https://www.arsturn.com/blog/tips-for-speeding-up-ollama-performance)
- [Ollama Inference Speed Optimization](https://markaicode.com/ollama-inference-speed-optimization/)
- [How to Make Ollama Faster](https://anakin.ai/blog/how-to-make-ollama-faster/)
