# Phase 1 Manual Testing Guide

## Prerequisites

Before testing, ensure the following services are running and configured:

### Required Services
- [ ] **Z-Wave JS UI** - Running on `http://localhost:8091` (default)
- [ ] **MQTT Broker** - Running on `mqtt://localhost:1883` (default)
- [ ] **Z-Wave Devices** - At least one controllable device configured
- [ ] **AI Provider** - Either Anthropic API key OR Ollama running locally
- [ ] **TTS Provider** - Either ElevenLabs API key OR Piper TTS configured
- [ ] **Audio Device** - Microphone configured (for wake word detection)

### Environment Setup

Create or verify `.env` file in `apps/voice-gateway-oww/`:

```bash
# Z-Wave JS UI Configuration (REQUIRED)
ZWAVE_UI_URL=http://localhost:8091
ZWAVE_UI_AUTH_ENABLED=false  # Set to true if using auth
# ZWAVE_UI_USERNAME=admin    # Uncomment if auth enabled
# ZWAVE_UI_PASSWORD=password # Uncomment if auth enabled

# MQTT Broker (REQUIRED for device control)
MQTT_BROKER_URL=mqtt://localhost:1883

# AI Provider (Choose ONE)
AI_PROVIDER=anthropic              # OR ollama
ANTHROPIC_API_KEY=your-key-here    # If using Anthropic
# OLLAMA_MODEL=qwen2.5:0.5b        # If using Ollama

# TTS Provider (Choose ONE)
TTS_PROVIDER=elevenlabs            # OR piper
ELEVENLABS_API_KEY=your-key-here   # If using ElevenLabs
# TTS_VOICE_ID=your-voice-id       # If using ElevenLabs

# Microphone Configuration (REQUIRED)
AUDIO_MIC_DEVICE=default           # Or specific ALSA device (Linux)

# Wake Word Model (REQUIRED)
OPENWAKEWORD_MODEL_PATH=./models/jarvis_v0.1.onnx
```

---

## Test 1.6: MCP Device Query

**Objective**: Verify that the AI can query devices using the MCP `list_zwave_devices` tool

### Setup
1. Start the voice gateway:
   ```bash
   cd apps/voice-gateway-oww
   npm run dev
   ```

2. Wait for startup messages:
   ```
   🏥 Running provider health checks...
   ✅ Detector initialized
   🔧 Initializing tool system...
   🔍 Discovered MCP tools
   ✅ Registered LangChain MCP tool: list_zwave_devices
   ✅ Registered LangChain MCP tool: control_zwave_device
   ✅ Registered LangChain MCP tool: get_device_sensor_data
   ✅ Registered LangChain MCP tool: get_device_status
   ✅ Tool system initialized
   🎧 Activating wake word detection...
   ✅ Voice Gateway ready
   ```

### Test Steps

#### Step 1: Trigger Wake Word
- **Action**: Say "Hey Jarvis" (or your configured wake word)
- **Expected**:
  - Console log: `🎤 Wake word detected!`
  - Beep sound plays (audible confirmation)
  - System enters recording mode

#### Step 2: Ask About Devices
- **Action**: Say "What devices are available?"
- **Expected Console Output**:
  ```
  🎙️ Recording started
  🛑 Recording stopped
  📝 Transcription: "What devices are available?"
  🔧 Intent: { isDeviceQuery: true, ... }
  AIRouter: Added device tool hint to system prompt
  🤖 AI query starting...
  🔧 Tool call: list_zwave_devices
  Tool execution: list_zwave_devices
  ✅ Tool result: [JSON with device list]
  🎵 TTS: Playing response...
  ```

#### Step 3: Verify Response
- **Expected TTS Response** (spoken aloud):
  - "You have [N] devices: [Device names]"
  - Example: "You have 2 devices: Kitchen Switch and Living Room Dimmer"

### Success Criteria ✅
- [ ] Wake word detection works
- [ ] Transcription captures user query
- [ ] Intent classifier sets `isDeviceQuery: true`
- [ ] AI calls `list_zwave_devices` MCP tool (logged)
- [ ] Tool returns device list successfully
- [ ] AI responds with device names
- [ ] TTS speaks the response
- [ ] No errors in console logs

### Expected Logs (Detailed)
```
[INFO] 🎤 Wake word detected! { wakeWord: 'Hey Jarvis', score: '0.876' }
[INFO] 🎙️ Recording started
[INFO] 🛑 Recording stopped { samples: 48000 }
[INFO] 📝 Transcription: "What devices are available?"
[DEBUG] 🔧 Intent: { isDeviceQuery: true, deviceName: null, action: null }
[DEBUG] AIRouter: Added device tool hint to system prompt
[INFO] 🤖 AI query starting...
[INFO] 🔧 Tool call: list_zwave_devices { includeInactive: false }
[INFO] Tool execution: list_zwave_devices
[DEBUG] ✅ Tool result: {
  "devices": [
    {"name": "Kitchen Switch", "location": "Kitchen", "type": "Binary Switch", "status": "ready"},
    {"name": "Living Room Dimmer", "location": "Living Room", "type": "Multilevel Switch", "status": "ready"}
  ]
}
[INFO] 🤖 AI response: "You have 2 devices: Kitchen Switch in the Kitchen and Living Room Dimmer in the Living Room."
[INFO] 🎵 TTS: Playing response...
[INFO] ✅ TTS playback complete
```

### Troubleshooting

#### Issue: MCP tools not discovered
- **Check**: `🔍 Discovered MCP tools` log appears
- **Fix**: Verify Z-Wave JS UI is running and accessible
- **Command**: `curl http://localhost:8091/health`

#### Issue: AI doesn't call the tool
- **Check**: `AIRouter: Added device tool hint to system prompt` log appears
- **Verify**: Intent classifier set `isDeviceQuery: true`
- **Fix**: Try rephrasing: "List my devices" or "Show me my smart home devices"

#### Issue: Tool execution fails
- **Check**: Error message in logs (e.g., "Connection refused")
- **Verify**: Z-Wave JS UI connection
- **Command**: `curl http://localhost:8091/api/nodes`

---

## Test 1.7: MCP Device Control

**Objective**: Verify that the AI can control devices using the MCP `control_zwave_device` tool and MQTT commands are published

### Prerequisites
- Test 1.6 must pass first
- At least one controllable Z-Wave device (e.g., binary switch or dimmer)
- MQTT broker running
- MQTT client for monitoring (optional but recommended)

### Setup (MQTT Monitoring)
Optional but helpful - monitor MQTT messages in a separate terminal:
```bash
# Install mosquitto-clients if not already installed (Linux)
sudo apt-get install mosquitto-clients

# Subscribe to all Z-Wave MQTT topics
mosquitto_sub -h localhost -t 'zwave/#' -v
```

### Test Steps

#### Step 1: Trigger Wake Word
- **Action**: Say "Hey Jarvis"
- **Expected**: Beep sound, system enters recording mode

#### Step 2: Issue Device Control Command
- **Action**: Say "Turn on Kitchen Switch" (replace with your device name)
- **Expected Console Output**:
  ```
  📝 Transcription: "Turn on Kitchen Switch"
  🔧 Intent: { isDeviceQuery: true, deviceName: 'Kitchen Switch', action: 'on' }
  🤖 AI query starting...
  🔧 Tool call: control_zwave_device
  🔧 Normalized parameters for control_zwave_device: {
    original: { device_name: 'Kitchen Switch', command: 'on' },
    normalized: { deviceName: 'Kitchen Switch', action: 'on' }
  }
  Tool execution: control_zwave_device
  📡 Publishing MQTT: zwave/Kitchen/Kitchen_Switch/switch_binary/endpoint_0/targetValue/set { "value": true }
  ✅ Tool result: { "success": true, "message": "Device controlled successfully" }
  🤖 AI response: "I've turned on the Kitchen Switch."
  🎵 TTS: Playing response...
  ```

#### Step 3: Verify MQTT Message Published
- **MQTT Monitor Output** (if running):
  ```
  zwave/Kitchen/Kitchen_Switch/switch_binary/endpoint_0/targetValue/set {"value":true}
  ```

#### Step 4: Verify Device State Changed
- **Check Z-Wave JS UI**:
  1. Open http://localhost:8091
  2. Navigate to "Control Panel"
  3. Find "Kitchen Switch" device
  4. Verify state changed to "ON"

### Success Criteria ✅
- [ ] Wake word detection works
- [ ] Transcription captures control command
- [ ] Intent classifier identifies device name and action
- [ ] AI calls `control_zwave_device` MCP tool (logged)
- [ ] Parameters normalized correctly (logged)
- [ ] MQTT message published to correct topic
- [ ] Device state changes in Z-Wave JS UI
- [ ] AI responds with confirmation
- [ ] TTS speaks confirmation
- [ ] No errors in console logs

### Expected Logs (Detailed)
```
[INFO] 🎤 Wake word detected! { wakeWord: 'Hey Jarvis', score: '0.892' }
[INFO] 🎙️ Recording started
[INFO] 🛑 Recording stopped { samples: 52000 }
[INFO] 📝 Transcription: "Turn on Kitchen Switch"
[DEBUG] 🔧 Intent: { isDeviceQuery: true, deviceName: 'Kitchen Switch', action: 'on' }
[DEBUG] AIRouter: Added device tool hint to system prompt
[INFO] 🤖 AI query starting...
[INFO] 🔧 Tool call: control_zwave_device { device_name: 'Kitchen Switch', command: 'on' }
[LOG] 🔧 Normalized parameters for control_zwave_device: {
  original: { device_name: 'Kitchen Switch', command: 'on' },
  normalized: { deviceName: 'Kitchen Switch', action: 'on' }
}
[INFO] Tool execution: control_zwave_device { deviceName: 'Kitchen Switch', action: 'on' }
[DEBUG] 📡 Publishing MQTT: zwave/Kitchen/Kitchen_Switch/switch_binary/endpoint_0/targetValue/set
[DEBUG] MQTT payload: { "value": true }
[INFO] ✅ MQTT message published successfully
[DEBUG] ✅ Tool result: { "success": true, "message": "Kitchen Switch turned on", "deviceName": "Kitchen Switch", "action": "on" }
[INFO] 🤖 AI response: "I've turned on the Kitchen Switch."
[INFO] 🎵 TTS: Playing response...
[INFO] ✅ TTS playback complete
```

### Additional Test Cases

#### Test Case 1.7.1: Turn Off Device
- **Action**: Say "Turn off Kitchen Switch"
- **Expected**: Same flow as above, but `action: 'off'` and `value: false`

#### Test Case 1.7.2: Dim Device (if dimmer available)
- **Action**: Say "Set Living Room Dimmer to 50 percent"
- **Expected**:
  - `action: 'dim'`
  - `level: 50`
  - MQTT topic: `zwave/.../switch_multilevel/.../targetValue/set`
  - MQTT payload: `{ "value": 50 }`

#### Test Case 1.7.3: Invalid Device Name
- **Action**: Say "Turn on Nonexistent Device"
- **Expected**:
  - Tool is called but returns error
  - AI responds: "I couldn't find a device called Nonexistent Device"
  - TTS speaks error message
  - No MQTT message published

### Troubleshooting

#### Issue: Parameter normalization not logged
- **Expected**: `🔧 Normalized parameters for control_zwave_device` log
- **Check**: ToolRegistry is normalizing parameters
- **Verify**: Log appears BEFORE tool execution

#### Issue: MQTT message not published
- **Check**: MQTT broker connection
- **Command**: `mosquitto_pub -h localhost -t test -m "hello"`
- **Verify**: Voice gateway connected to broker
- **Log**: Look for "✅ MQTT connection established"

#### Issue: Device state doesn't change
- **Check**: MQTT topic format matches Z-Wave JS UI expectations
- **Expected Format**: `zwave/[Location/]Device_Name/command_class/endpoint_0/targetValue/set`
- **Verify**: Check Z-Wave JS UI logs for received commands
- **Tool**: Z-Wave JS UI → Debug → MQTT Logs

#### Issue: Wrong device controlled
- **Check**: Intent classifier extracted correct device name
- **Verify**: Transcription accuracy
- **Fix**: Speak more clearly or adjust microphone settings

---

## Test Results Documentation

### Template
```markdown
## Test Results: Phase 1 Manual Testing

**Date**: [Date]
**Tester**: [Name]
**Environment**: [Anthropic/Ollama + ElevenLabs/Piper]

### Test 1.6: Device Query
- [ ] PASS / [ ] FAIL
- Wake word triggered: ✅/❌
- Transcription accurate: ✅/❌
- MCP tool called: ✅/❌
- Device list returned: ✅/❌
- TTS response spoken: ✅/❌
- **Notes**: [Any observations or issues]

### Test 1.7: Device Control
- [ ] PASS / [ ] FAIL
- Wake word triggered: ✅/❌
- Transcription accurate: ✅/❌
- MCP tool called: ✅/❌
- Parameters normalized: ✅/❌
- MQTT message published: ✅/❌
- Device state changed: ✅/❌
- TTS confirmation spoken: ✅/❌
- **Notes**: [Any observations or issues]

### Overall Phase 1 Status
- [ ] PASS (both tests pass) / [ ] FAIL (one or more tests fail)
- **Ready for commit**: YES / NO
- **Blockers**: [List any blockers]
```

---

## Common Issues and Solutions

### Issue: "MCP connection failed after 3 attempts"
**Symptoms**:
```
❌ MCP connection attempt 1/3 failed
⏳ Retrying MCP connection in 2000ms...
❌ MCP integration permanently failed
⚠️ Continuing with local tools only...
```

**Diagnosis**:
1. Check Z-Wave JS UI is running: `curl http://localhost:8091/health`
2. Check MCP server can start: `node apps/zwave-mcp-server/src/index.js`
3. Check environment variables are set correctly

**Solution**:
- Start Z-Wave JS UI: `docker start zwavejs2mqtt` (or your method)
- Verify `ZWAVE_UI_URL` in `.env`
- Check Z-Wave JS UI logs for errors

### Issue: "Tool execution not configured"
**Symptoms**:
```
AIRouter: ToolExecutor not available
Error: Tool execution not configured
```

**Diagnosis**: ToolExecutor not passed to AIRouter

**Solution**: Check main.js initialization - should pass `toolExecutor` to AIRouter constructor

### Issue: Parameters not normalized correctly
**Symptoms**:
```
Error: Unknown parameter: device_name (expected: deviceName)
```

**Diagnosis**: Parameter mapping missing or incorrect

**Solution**:
1. Check `MCP_PARAMETER_MAPPINGS` in ToolRegistry.js
2. Verify tool name matches exactly (case-sensitive)
3. Add custom mapping if needed

---

## Success Metrics

### Phase 1 is considered COMPLETE when:
1. ✅ All automated tests pass (54+ tests)
2. ✅ Test 1.6 (Device Query) passes manual testing
3. ✅ Test 1.7 (Device Control) passes manual testing
4. ✅ No errors in console logs during normal operation
5. ✅ Behavior is identical to pre-migration system

### Performance Benchmarks (Optional)
- **Tool Discovery Time**: < 500ms (measure with console.time)
- **Tool Execution Latency**: < 200ms vs baseline (custom client)
- **End-to-End Query Time**: Similar to baseline (±10%)

---

## Next Steps After Testing

### If Tests Pass ✅
1. Document test results (fill in template above)
2. Commit changes:
   ```bash
   git add apps/voice-gateway-oww/src/ai/AIRouter.js
   git add openspec/changes/convert-zwave-mcp-server/
   git commit -m "feat: Phase 1 - Voice Gateway LangChain MCP Integration

   - Remove custom MCP client dependency from AIRouter
   - Update buildSystemPrompt to use tool hints instead of direct device fetch
   - Mark Phase 1 tasks 1.1-1.5 as complete
   - Add Phase 1 implementation summary and testing guide

   All automated tests pass. Manual testing complete.
   MCP tools auto-discovered and working correctly.

   🤖 Generated with [Claude Code](https://claude.com/claude-code)

   Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
   ```
3. Push to feature branch
4. Proceed to Phase 2 (Oracle backend integration)

### If Tests Fail ❌
1. Document failure details
2. Check troubleshooting section above
3. Review logs for error messages
4. Fix issues and re-test
5. If blocked, create GitHub issue with:
   - Test case that failed
   - Expected vs actual behavior
   - Console logs
   - Environment details

---

**Testing Status**: ⏳ Awaiting Manual Testing
**Estimated Time**: 15-20 minutes per test
**Prerequisites**: See "Prerequisites" section above
