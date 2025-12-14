# Voice Gateway Performance Analysis

## Current Performance (Your System)

| Component | Time | Status |
|-----------|------|--------|
| Wake word detection | <50ms | ✅ Excellent |
| Whisper STT (tiny) | 265-342ms | ✅ Good |
| **Anthropic AI (no tools)** | **1082-1972ms** | ⚠️ Bottleneck |
| **Anthropic AI (with tools)** | **1947-4105ms** | ⚠️ Major bottleneck |
| ElevenLabs TTS | 1194-1821ms | ⚠️ Bottleneck |
| **Total (simple query)** | **~3-4 seconds** | ⚠️ Comparable to Alexa |

## Industry Benchmarks

### Claude Haiku 3.5 (API - Your Current Setup)
- **Time to First Token (TTFT)**: 360-700ms
- **Throughput**: 52-65 tokens/second
- **Expected latency**: 1-2 seconds for short responses
- **Your performance**: ✅ **NORMAL** - matches expected benchmarks

### Amazon Alexa (Industry Standard)
- **Target**: <1 second (certification requirement)
- **Reality**: 3-4 seconds in practice
- **On-device optimization**: 200ms faster than cloud
- **Status**: New AI Alexa delayed due to latency issues

### Your Goal: <500ms
- **Verdict**: ❌ **NOT ACHIEVABLE** with Anthropic Claude Haiku
- **Reason**: TTFT alone is 360-700ms before any token generation

## Performance Breakdown (With New Debug Logs)

Enable debug logs to see detailed timing:

```bash
LOG_LEVEL=debug npm run dev
```

You'll now see:
```
⏱️ Message building took 5ms
⏱️ Tool binding took 3ms
📡 Calling Anthropic API...
⏱️ Anthropic API call took 1247ms
⏱️ Tool "get_current_datetime" execution took 2ms
📡 Calling Anthropic API for final response after tools...
⏱️ Final Anthropic API call took 698ms
⏱️ Detailed timing breakdown:
  messageBuild: 5ms
  toolBinding: 3ms
  firstApiCall: 1247ms    ← BOTTLENECK
  toolExecution: 2ms
  finalApiCall: 698ms     ← BOTTLENECK
  total: 1955ms
```

## Optimization Strategies

### ✅ Already Implemented (Your System)
1. **Direct tool bypass** for datetime queries (0-1ms instead of 2000ms)
2. **Whisper tiny model** for fast STT (265-342ms)
3. **ElevenLabs speed=3x** for faster TTS playback

### 🎯 To Achieve <500ms AI Response:

#### Option 1: Switch to Ollama (Local)
```bash
npm run dev --ollama
```

**Performance:**
- `qwen2.5:0.5b`: ~1 second (warm)
- `qwen2.5:1.5b`: ~4.6 seconds (warm)
- **Cold start**: First query always slower (3-16s)

**Pros:**
- ✅ Can achieve <1s with 0.5b model (warm)
- ✅ Free, local, no network latency
- ✅ Privacy (all local)

**Cons:**
- ❌ Lower quality responses
- ❌ Limited tool-calling capability
- ❌ Cold start latency on first query

#### Option 2: Expand Direct Tool Bypass
Add more patterns to bypass AI entirely:

**Already bypassed (0-1ms):**
- "What time is it?"
- "What day is it?"
- "What's the date?"
- "What month is it?"
- "What year is it?"

**Could add:**
- Device control: "Turn on/off [device]" → Direct MQTT
- Weather: "What's the weather?" → Direct API call
- Common questions: Pre-scripted responses

**Implementation:**
```javascript
// Already done in main.js:416-431
const dateTimePatterns = [
    /what (time|date) is it/i,
    /what day of the week/i,
    // ... add more patterns
];
```

#### Option 3: Use Anthropic Prompt Caching (Future)
- Cache system prompts and tools
- Reduces TTFT to ~200ms
- Requires Anthropic API update

#### Option 4: Pre-generate Common Responses
```javascript
const commonResponses = {
    "what time is it": () => getCurrentTime(),
    "turn on lights": () => controlDevice("lights", "on"),
    // ... etc
};
```

## Recommendations

### For <500ms Goal:
1. ✅ **Maximize direct tool bypass** (already doing)
2. ✅ **Switch to Ollama for non-critical queries**
3. ❌ **Don't expect <500ms from Anthropic** (physically impossible)

### For Best User Experience:
1. Keep Anthropic for complex queries (better quality)
2. Use direct bypass for simple queries (0-1ms)
3. Accept 1-2s for Anthropic as "normal" (matches industry)
4. Consider TTS optimization (local Piper TTS ~200ms vs ElevenLabs 1.2s)

### Comparison to Alexa:
- **Your system**: 3-4 seconds total
- **Alexa**: 3-4 seconds total
- **Your system with direct bypass**: <2 seconds total (faster than Alexa!)

## Enabling Debug Logs

### Method 1: Environment Variable
```bash
LOG_LEVEL=debug npm run dev
```

### Method 2: .env File
```bash
# Add to .env
LOG_LEVEL=debug
```

### Method 3: Command Line
```bash
LOG_LEVEL=debug node src/main.js
```

### Available Log Levels:
- `error` - Only errors
- `warn` - Warnings and errors
- `info` - General information (default)
- `debug` - Detailed debugging (includes timing breakdowns)

## Next Steps

1. **Test with debug logs enabled** to see exact timing breakdown
2. **Identify which API call is slowest** (first or second)
3. **Consider switching to Ollama** for datetime queries if <500ms is critical
4. **Expand direct bypass patterns** for more query types

## Conclusion

**Your current performance is NORMAL and matches industry standards.**

To achieve <500ms, you must either:
1. Use local models (Ollama)
2. Bypass AI entirely (direct tool calls)
3. Accept that cloud-based LLMs cannot meet this target

Amazon's own Alexa struggles with this same issue, taking 3-4 seconds in practice.
