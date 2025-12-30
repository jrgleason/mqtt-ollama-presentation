# Voice Gateway OWW - Troubleshooting Guide

This guide consolidates diagnostic information for both macOS and Linux systems.

---

## Quick Diagnostics

### Check Service Status

```bash
# systemd (Linux/Pi)
systemctl status voice-gateway-oww.service
journalctl -u voice-gateway-oww.service -n 100 --no-pager

# Manual run (all platforms)
cd apps/voice-gateway-oww
node src/main.js
```

### Common Issues Checklist

- [ ] Is Ollama running? `curl http://localhost:11434/api/tags`
- [ ] Is MQTT broker accessible? (check logs for connection errors)
- [ ] Are audio devices detected? `arecord -l` (Linux) or `node src/utils/list-audio-devices.js` (macOS)
- [ ] Are models downloaded? Check `models/` directory
- [ ] Is Python venv activated? (required for Piper TTS)

---

## Platform-Specific Diagnostics

### macOS

#### Audio Device Detection

```bash
# List all audio devices
node src/utils/list-audio-devices.js

# Test microphone recording
node src/utils/test-audio-recording.js

# Expected output:
# ✅ Audio devices detected
# ✅ Microphone input working
# ✅ Speaker output working
```

#### Common macOS Issues

**1. "No audio devices found"**
- Check System Settings → Sound → Input
- Grant microphone permissions to Terminal
- Restart Terminal after granting permissions

**2. "ALSA lib not available on macOS"**
- This is normal - macOS uses speaker.js instead of ALSA
- Verify `speaker` package is installed: `npm list speaker`

**3. Piper TTS not working**
- Ensure Python venv is activated
- Install piper-tts: `pip install piper-tts`
- Check PATH includes `.venv/bin`

---

### Linux / Raspberry Pi

#### Audio Device Detection

```bash
# List ALSA capture devices (microphones)
arecord -l

# Example output:
# card 3: M0 [UM0], device 0: USB Audio [USB Audio]
#   Subdevices: 1/1
#   Subdevice #0: subdevice #0

# List ALSA playback devices (speakers)
aplay -l

# Example output:
# card 2: Headphones [bcm2835 Headphones], device 0: bcm2835 Headphones [bcm2835 Headphones]
#   Subdevices: 8/8
#   Subdevice #0: subdevice #0
```

#### Test Audio Recording

```bash
# Record 3 seconds of audio
arecord -D plughw:3,0 -f S16_LE -r 16000 -d 3 test.wav

# Play it back
aplay test.wav
```

#### Test Audio Playback

```bash
# Generate test tone
speaker-test -D plughw:2,0 -c 2 -t wav

# Play a WAV file
aplay -D plughw:2,0 /usr/share/sounds/alsa/Front_Center.wav
```

#### Common Linux/Pi Issues

**1. "arecord: device not found"**
- Check device name: `arecord -l`
- Update `AUDIO_MIC_DEVICE` in `.env`
- Try `plughw:X,0` format instead of `hw:X,0`

**2. "Permission denied" on audio devices**
- Add user to `audio` group: `sudo usermod -a -G audio $USER`
- Logout and login again
- Verify: `groups | grep audio`

**3. "ALSA lib ... Unknown PCM"**
- Device name is incorrect
- Check exact device name with `arecord -l`
- Use `plughw:` prefix for automatic format conversion

**4. Piper TTS fails with "ModuleNotFoundError: No module named 'piper'"**
- Python venv not activated in systemd service
- Add to service file:
  ```ini
  Environment="VIRTUAL_ENV=/path/to/.venv"
  Environment="PATH=/path/to/.venv/bin:..."
  ```

---

## Model Issues

### Whisper Model

**Missing model file:**
```bash
# Check if model exists
ls -lh models/ggml-tiny.bin

# If missing, download:
cd apps/voice-gateway-oww
./scripts/setup.sh
```

**Transcription fails:**
- Check Ollama is running: `curl http://localhost:11434/api/tags`
- Verify whisper model is loaded: `ollama list | grep whisper`
- Check logs for timeout errors (increase timeout in code)

### OpenWakeWord Model

**Wake word not detected:**
- Check model path in `.env`: `OWW_MODEL_PATH=models/hey_jarvis_v0.1.onnx`
- Lower detection threshold: `OWW_THRESHOLD=0.01` (for testing)
- Check logs for detection scores
- Test with loud, clear voice

**Understanding Detection Scores (with latest diagnostic logging):**

After updating `main.js` with diagnostic logging, you'll see these messages:
- `👂 Still listening...` - Detection is running (~every 10 seconds)
- `🎯 Detection score elevated` - Score above 0.1 (getting close!)
- `🎤 Wake word detected!` - Score exceeded threshold

**Score interpretation:**
- `0.00-0.05`: Background noise / not the wake word
- `0.05-0.15`: Possibly similar sounds
- `0.15-0.25`: Close, but below default threshold (0.25)
- `0.25+`: Wake word detected ✅ (with OWW_THRESHOLD=0.25)
- `0.50+`: Strong match

**Quick fix if no detection:**
```bash
# Stop voice gateway (Ctrl+C)
# Edit .env.tmp and change:
OWW_THRESHOLD=0.01  # Much lower = more sensitive

# Restart:
node src/main.js

# Now say "Hey Jarvis" clearly
# You should see elevated scores in logs
```

**Models missing:**
```bash
# Check required models exist
ls -lh models/
# Should have:
# - hey_jarvis_v0.1.onnx
# - openwakeword_melspectrogram.onnx
# - openwakeword_embedding_model.onnx

# If missing:
cd apps/voice-gateway-oww
./scripts/setup.sh
```

### Piper TTS Model

**TTS fails silently:**
- Check Piper is installed: `python -c "from piper import PiperVoice"`
- Check model exists: `ls models/piper/en_US-amy-medium.onnx`
- Verify venv PATH in environment variables

**No audio output:**
- Check speaker device: `aplay -l` (Linux) or speaker.js (macOS)
- Test speaker manually: `aplay test.wav`
- Check volume: `TTS_VOLUME=1.0` in `.env`

---

## Debugging Tips

### Enable Verbose Logging

```bash
# Set in .env.tmp
LOG_LEVEL=debug

# Or run manually:
LOG_LEVEL=debug node src/main.js
```

### Monitor State Machine

Watch logs for state transitions:
```bash
journalctl -u voice-gateway-oww.service -f | grep "State transition"
```

### Test Components Independently

**Test wake word only:**
```javascript
// Comment out transcription and TTS in main.js
// Run and say "Hey Jarvis" - should see detection in logs
```

**Test STT only:**
```javascript
// Record audio file, then test transcription
const result = await transcribeAudio('test.wav');
console.log(result);
```

**Test TTS only:**
```javascript
// Test Piper synthesis
const { execSync } = require('child_process');
execSync('echo "Test" | piper --model models/piper/en_US-amy-medium.onnx --output_file test-tts.wav');
```

---

## Performance Issues

### Slow Transcription

**Symptom:** Whisper takes >10 seconds

**Solutions:**
- Use smaller model: `WHISPER_MODEL=tiny` (vs `base`)
- Check CPU usage: `htop`
- Ensure Ollama has enough memory
- Consider GPU acceleration (if available)

### Slow TTS

**Symptom:** Piper takes >5 seconds to synthesize

**Solutions:**
- Use faster voice model (e.g., `low` quality instead of `medium`)
- Check CPU usage during synthesis
- Increase `TTS_SPEED` (e.g., `TTS_SPEED=1.5`)

### High CPU Usage

- Reduce `AUDIO_SAMPLE_RATE` to 16000 (from 44100)
- Use smaller Ollama model
- Disable TTS for testing: `TTS_ENABLED=false`

---

## Network Issues

### MQTT Connection Fails

```bash
# Test MQTT broker
mosquitto_sub -h localhost -p 1883 -t 'test' -v

# If fails:
# - Check broker is running
# - Verify port in .env.tmp matches broker config
# - Check firewall rules
```

### Ollama Connection Fails

```bash
# Test Ollama API
curl http://localhost:11434/api/tags

# If fails:
# - Check Ollama is running: systemctl status ollama
# - Verify URL in .env.tmp: OLLAMA_BASE_URL=http://localhost:11434
# - Check firewall rules
```

---

## Getting Help

If issues persist:

1. **Collect logs:**
   ```bash
   journalctl -u voice-gateway-oww.service -n 200 --no-pager > voice-gateway-logs.txt
   ```

2. **Check environment:**
   ```bash
   node --version
   npm --version
   ollama --version
   cat .env.tmp
   ```

3. **Verify setup:**
   ```bash
   npm list
   ls -lR models/
   ```

4. **Search documentation:**
   - Main README: `apps/voice-gateway-oww/README.md`
   - QuickStart Guide: `docs/voice-gateway-quickstart.md`
   - Project Issues: Check GitHub issues for similar problems

---

## AI Tool Usage Issues

### Problem: AI Not Using Tools Correctly

**Symptom:** AI provides incorrect dates, doesn't search the web, or doesn't control devices even though tools are available.

**Root Cause:** The `qwen2.5:0.5b` model is optimized for speed over accuracy and often ignores tool calls, preferring to generate responses from its training data (which may be outdated or incorrect).

**Solution:** The voice gateway uses a **pattern-based bypass system** that detects specific query types and directly executes the appropriate tool instead of waiting for the AI to call it.

### How Pattern-Based Bypass Works

The system detects three types of queries:

1. **Date/Time Queries** - Bypassed to `datetime-tool.js`
   - Patterns: "what time is it", "what date is it", "what day is today"
   - Example: "Can you tell me what date it is?" → Direct tool call
   - Response: Accurate system time (not hallucinated)

2. **Search Queries** - Bypassed to `search-tool.js`
   - Patterns: "who is", "what is", "search for", "google"
   - Example: "Who is the president?" → DuckDuckGo API call
   - Response: Real search results (not outdated training data)

3. **Device Control Queries** - Bypassed to `zwave-control-tool.js`
   - Patterns: "turn on/off", "dim", "switch"
   - Example: "Turn off switch one" → Check device status → Control device
   - Response: Accurate device status and control confirmation

### Device Control Workflow

When you say "Turn off switch one", the system:

1. **Detects pattern**: "turn off" matches device control pattern
2. **Parses command**: Extracts device name ("Switch One") and action ("off")
3. **Checks status**: Calls MCP Z-Wave client to verify device exists and is online
4. **Validates**: Returns error if device is offline or not found
5. **Executes control**: Sends MQTT command if device is available
6. **Confirms**: Provides clear success/failure message

**Example logs:**
```
🏠 Device control query detected, using Z-Wave tool directly
Checking status of device: "switch one"
🏠 Z-Wave control tool executing {deviceName: 'switch one', action: 'status'}
✅ Device status: Switch One (node 5) — ready: yes | available: yes
🏠 Z-Wave control tool executing {deviceName: 'switch one', action: 'off'}
✅ Device control successful
```

### Troubleshooting Tool Issues

**1. Tool not being called**
- Check logs for pattern detection messages ("📅 Date/time query detected", "🔍 Search query detected", "🏠 Device control query detected")
- If pattern isn't matching, the query may not match expected patterns
- Add new patterns in `apps/voice-gateway-oww/src/main.js` (lines 415-458)

**2. Device control says "device not found"**
- Verify device exists: Check Z-Wave JS UI dashboard
- Check device name matches: Use exact name from Z-Wave JS UI
- Verify MCP client is connected: Check startup logs for "ZWave MCP client ready"
- List devices manually: `node -e "import('./src/mcp-zwave-client.js').then(m => m.getDevicesForAI()).then(console.log)"`

**3. Device control says "device offline"**
- Device may actually be offline - check Z-Wave JS UI dashboard
- Check MQTT broker connection: `mosquitto_sub -h localhost -p 1883 -t 'zwave/#' -v`
- Verify Z-Wave network is healthy
- Try waking the device (battery devices may sleep)

**4. Search returns "No direct answer found"**
- DuckDuckGo API doesn't have an instant answer for this query
- Try rephrasing the question
- Check internet connection
- Verify DuckDuckGo API is accessible: `curl "https://api.duckduckgo.com/?q=test&format=json"`

### Adding New Tool Patterns

To add support for new query types, edit `apps/voice-gateway-oww/src/main.js`:

1. **Add pattern detection** (around line 447):
   ```javascript
   const myNewPatterns = [
       /pattern1/i,
       /pattern2/i,
   ];
   const isMyNewQuery = myNewPatterns.some(pattern =>
       pattern.test(transcription)
   );
   ```

2. **Add bypass logic** (around line 482):
   ```javascript
   } else if (isMyNewQuery) {
       logger.info('🔧 My new query detected');
       const aiStartTime = Date.now();
       // Execute your tool
       aiResponse = await executeMyNewTool({...});
       aiDuration = Date.now() - aiStartTime;
   }
   ```

3. **Test**: Restart service and try query that matches your pattern

### Why Not Use LangGraph?

**Q:** Why not use LangGraph for tool orchestration instead of pattern matching?

**A:** Pattern-based bypass was chosen for this project because:

1. **Speed**: Direct execution is faster (~1ms vs ~8s AI inference)
2. **Reliability**: 100% success rate vs. unpredictable AI tool calls
3. **Simplicity**: Easy to debug and maintain
4. **Voice UX**: Users expect instant responses for simple queries

**When to use LangGraph:**
- Complex multi-step reasoning
- Dynamic tool selection based on context
- Stateful conversations with branching logic
- When accuracy matters more than speed

**When to use pattern-based bypass:**
- Simple, predictable queries (time, search, device control)
- Voice interfaces requiring fast response
- Smaller AI models that don't reliably call tools
- When you need guaranteed behavior

---

## See Also

- **Main README:** `apps/voice-gateway-oww/README.md`
- **QuickStart Guide:** `docs/voice-gateway-quickstart.md`
- **Architecture:** `docs/voice-gateway-architecture.md`
- **ALSA Setup Guide:** `docs/alsa-setup.md`
- **Raspberry Pi Setup:** `docs/raspberry-pi-setup.md`
- **Tool Implementation:** `apps/voice-gateway-oww/src/tools/`
