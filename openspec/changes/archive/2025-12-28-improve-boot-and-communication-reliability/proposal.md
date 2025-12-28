# Change: Improve Boot and Communication Reliability

## Why

The voice gateway suffers from three critical reliability issues that impact user experience:

1. **False Wake Word Triggers from Beep Feedback**
   - Beeps are transcribed as "[BEEPING]" by Whisper STT
   - Microphone captures system-generated beeps (wake word, processing, response beeps)
   - Creates false interaction cycles where beeps trigger new voice interactions

2. **Silent MCP Integration Failures**
   - MCP server connection fails at startup with cryptic errors
   - System continues with degraded functionality (only 3 local tools instead of Z-Wave tools)
   - Users don't know Z-Wave control is unavailable
   - No retry logic for transient failures (broker restart, network blip)

3. **Premature Readiness Announcements**
   - Welcome message spoken before system is truly ready to respond
   - Detector may not be fully stabilized (embeddings still filling)
   - Race conditions cause users to be cut off mid-sentence
   - System appears unresponsive after saying "How can I help?"

These issues were identified from production logs and user testing, showing:
- Beep feedback: `📝 You said: "[BEEPING]"` appearing in transcription logs
- MCP failure: `Failed to connect to stdio server "zwave": McpError: MCP error -32000: Connection closed`
- Timing: User reports "sometime it cuts me off sometimes it acts like it is ready and then doesn't respond"

## What Changes

### 1. Beep Audio Isolation

**Prevent microphone from capturing system-generated beeps during recording:**
- Add microphone muting capability (pause audio input processing)
- Suppress beep playback while in `recording` state
- Only play beeps during `listening`, `processing`, and `cooldown` states
- Maintain wake word interruption capability (beeps still play during cooldown for interruption UX)

### 2. MCP Connection Resilience

**Add exponential backoff retry for MCP server connection:**
- Retry MCP connection 3 times with delays: 0s (initial), 2s, 4s
- Capture stderr output from MCP server subprocess
- Include stderr in error logs for debugging
- Provide clear user-facing error messages when MCP permanently fails
- Log each retry attempt with context

### 3. Startup Orchestration

**Use promises to orchestrate async initialization and ensure true readiness:**
- Add 2-3 second warm-up period after detector buffers fill
- Wait for detector stability signal before accepting wake words
- Orchestrate initialization sequence:
  1. Services init (MQTT, AI health checks)
  2. Wake word detector init + warm-up
  3. Tool system init (including MCP with retry)
  4. Orchestrator creation
  5. State machine setup
  6. **THEN** speak welcome message
  7. Activate microphone
- Hold welcome message until all subsystems are truly ready

## Impact

### Files Modified

- `apps/voice-gateway-oww/src/main.js` - Startup orchestration, MCP retry, beep suppression during recording
- `apps/voice-gateway-oww/src/audio/AudioPlayer.js` - Add mic muting support (optional, if needed)
- `apps/voice-gateway-oww/src/services/VoiceInteractionOrchestrator.js` - Suppress beeps during recording state
- `apps/voice-gateway-oww/src/services/MCPIntegration.js` - Exponential backoff retry wrapper
- `apps/voice-gateway-oww/src/util/OpenWakeWordDetector.js` - Emit warm-up complete event
- `apps/voice-gateway-oww/src/util/InitUtil.js` - Await detector warm-up before returning

### Files Created

None (all changes are modifications to existing files)

### Breaking Changes

None. These are internal reliability improvements that don't change external APIs or behavior (except fixing bugs).

### Performance Impact

- Startup time increase: +2-3 seconds (detector warm-up period) - acceptable for improved reliability
- MCP retry adds up to 6 seconds total if all attempts fail (rare case, transient failures usually resolve quickly)
- Runtime performance unchanged (beep suppression has no overhead, mic muting is conditional)

### Affected Specifications

- `microphone-management` - ADDED requirement for mic muting during system audio
- `voice-gateway` - MODIFIED startup sequence, ADDED warm-up validation
- `tool-execution` - ADDED MCP connection retry requirement
