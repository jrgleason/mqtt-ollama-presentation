# Voice Gateway with OpenWakeWord

Offline voice command gateway for MQTT + Ollama home automation using OpenWakeWord for wake word detection.

## Features

- **Wake Word Detection:** Using OpenWakeWord (open-source, no API key required)
- **Voice Activity Detection:** WebRTC VAD with trailing silence detection
- **Speech-to-Text:** Local Whisper.cpp (tiny model, 1.5s transcription)
- **AI Response:** Ollama with qwen2.5:0.5b (~1s response time, optimized for Pi 5) or llama3.2:1b for better tool support (not suitable for lower-resource devices)
- **Text-to-Speech:** ElevenLabs API with streaming (high-quality voice synthesis)
- **Volume Control:** Voice commands to adjust speaker volume ("turn up the volume", "set volume to 50%")
- **MQTT Integration:** Communicates with Oracle chatbot
- **Local-First Processing:** Wake word, STT, and AI processing happen locally
- **Cloud TTS:** High-quality voice output via ElevenLabs (requires internet)
- **Fast Response Time:** ~7-10 seconds end-to-end (wake word to audio playback)

## Technology Stack & Alternatives

This voice gateway uses a **traditional ASR pipeline**: OpenWakeWord → Whisper.cpp → Ollama → ElevenLabs/Piper.

**📖 For detailed comparison of ASR technologies, hardware requirements, and cost tradeoffs, see:**
- **[Voice & ASR Technologies Guide](../../docs/voice-asr-technologies.md)** - Comprehensive guide covering:
  - What is ASR and how it works
  - Whisper.cpp vs Ultravox (multimodal voice LLM)
  - ElevenLabs vs Piper TTS comparison
  - Hardware requirements (Pi 5 vs GPU server)
  - Cost analysis ($100 vs $2000+ options)
  - When to use each approach

## Why OpenWakeWord?

Unlike Picovoice Porcupine which requires an API key, OpenWakeWord is:

- ✅ Completely free and open-source
- ✅ No API key or registration required
- ✅ Runs entirely offline
- ✅ Customizable wake words with pre-trained models
- ✅ Lower resource usage on Raspberry Pi

## Hardware Requirements

- **Raspberry Pi 5** (16GB RAM recommended, 8GB minimum)
- **USB Microphone:** LANDIBO GSH23 (or compatible, 16kHz capable)
- **USB Speaker/DAC:** For audio playback (TTS)
- **Internet Connection:** Required for ElevenLabs TTS (can disable with `TTS_ENABLED=false`)

## Quick Start

### 1. Install System Dependencies

**CRITICAL: Install ffmpeg first** (required for ElevenLabs TTS):

```bash
# macOS
brew install ffmpeg

# Linux (Raspberry Pi)
sudo apt-get update
sudo apt-get install ffmpeg
```

Verify installation:
```bash
ffmpeg -version
```

### 2. Install Node Dependencies

```bash
npm install
```

### 3. Download Models & Setup

```bash
./setup.sh
```

This will:

- Download OpenWakeWord core models (melspectrogram, embedding)
- Download wake word models (hey_jarvis)
- Download Whisper tiny model (~75MB, optimized for speed)
- Create .env file from .env.example
- Check Ollama installation and download the model specified in .env

**Alternatively, you can run:**
```bash
npm run setup   # Calls ./setup.sh
```

### 4. Configure Environment

```bash
cp .env.tmp.example .env.tmp
```

**IMPORTANT: Set your ElevenLabs API key:**

```bash
# Get your API key from: https://elevenlabs.io/app/settings/api-keys
export ELEVENLABS_API_KEY=your_api_key_here
```

Or edit `.env` directly:

```env
# ElevenLabs API Configuration (REQUIRED for TTS)
ELEVENLABS_API_KEY=your_api_key_here
ELEVENLABS_VOICE_ID=JBFqnCBsd6RMkjVDRZzb  # George (deep male voice)
ELEVENLABS_MODEL_ID=eleven_multilingual_v2

# OpenWakeWord settings
OWW_MODEL_PATH=models/hey_jarvis_v0.1.onnx
OWW_THRESHOLD=0.5

# Audio settings
AUDIO_MIC_DEVICE=hw:2,0
AUDIO_SAMPLE_RATE=16000

# MQTT settings
MQTT_BROKER_URL=mqtt://localhost:1883

# TTS settings
TTS_ENABLED=true  # Set to false to disable voice output
```

### 5. Test Audio

```bash
# List audio devices
arecord -l

# Test microphone (3 second recording)
arecord -D hw:2,0 -f S16_LE -r 16000 -c 1 -d 3 test.wav
aplay test.wav
```

### 6. Run Voice Gateway

**Development:**

```bash
npm run dev
```

**Production:**

```bash
npm start
```

## Demo Modes

The voice gateway supports 4 demo modes for different use cases, showcasing the flexibility of independent AI and TTS provider configuration. All modes are **configuration-driven** - no code changes needed!

### Offline Mode (Ollama + Piper)

- **AI:** Ollama (local)
- **TTS:** Piper (local)
- **Dependencies:** Ollama running, Python + piper-tts
- **Use case:** Complete privacy, no internet required after initial setup
- **Setup:**
  ```bash
  ./switch-mode.sh offline
  npm run dev
  ```

### Online Mode (Anthropic + ElevenLabs)

- **AI:** Anthropic Claude (cloud)
- **TTS:** ElevenLabs (cloud)
- **Dependencies:** ANTHROPIC_API_KEY, ELEVENLABS_API_KEY
- **Use case:** Best quality AI and TTS, cloud-powered
- **Setup:**
  ```bash
  ./switch-mode.sh online
  npm run dev
  ```

### Hybrid Mode A (Ollama + ElevenLabs)

- **AI:** Ollama (local)
- **TTS:** ElevenLabs (cloud)
- **Dependencies:** Ollama running, ELEVENLABS_API_KEY
- **Use case:** Local AI for privacy, cloud TTS for quality
- **Setup:**
  ```bash
  ./switch-mode.sh hybrid-a
  npm run dev
  ```

### Hybrid Mode B (Anthropic + Piper)

- **AI:** Anthropic Claude (cloud)
- **TTS:** Piper (local)
- **Dependencies:** ANTHROPIC_API_KEY, Python + piper-tts
- **Use case:** Cloud AI for quality, local TTS for privacy
- **Setup:**
  ```bash
  ./switch-mode.sh hybrid-b
  npm run dev
  ```

### Quick Switch

To switch between demo modes:

```bash
# Copy preset to .env.tmp and restart
./switch-mode.sh [offline|online|hybrid-a|hybrid-b]
npm run dev
```

**Note:** The switch-mode.sh script copies the preset configuration to .env.tmp. You can also manually edit .env.tmp to customize provider settings.

### Provider Configuration

**AI Providers:**
- `AI_PROVIDER=anthropic` - Use Anthropic Claude API (requires ANTHROPIC_API_KEY)
- `AI_PROVIDER=ollama` - Use local Ollama server (requires Ollama running)

**TTS Providers:**
- `TTS_PROVIDER=ElevenLabs` - Use ElevenLabs API (requires ELEVENLABS_API_KEY)
- `TTS_PROVIDER=Piper` - Use local Piper TTS (requires Python + piper-tts)

See `.env.example` for full configuration options.

## Architecture

```
USB Mic (plughw:3,0) - 16kHz
    ↓
OpenWakeWord ("Hey Jarvis") - ~100ms per chunk
    ↓
Audio Recorder + VAD (1.5s silence) - ~2.7s ⚠️ CURRENT BOTTLENECK
    ↓
Whisper STT (tiny model) - ~1.5s ✅ (75% faster than base)
    ↓
Ollama AI (qwen2.5:0.5b) - ~1s ✅ (93% faster than qwen3:1.7b)
    ↓
Piper TTS (en_US-amy-medium, 3x speed) - ~1.7s
    ↓
USB Speaker (plughw:2,0) - Audio playback (~3s)
```

**Total Pipeline:** ~7 seconds (wake word to response playback start)

**Performance Evolution:**

- **Before optimization:** 27 seconds (base Whisper + qwen3:1.7b)
- **After optimization:** 7 seconds (74% improvement)
- **False trigger optimization:** <1 second (skips transcription when no speech detected)
- See [Performance Optimization Guide](../../docs/performance-optimization.md) for details

## Smart Transcription Skipping

The voice gateway includes an intelligent optimization that skips transcription when no speech is detected during recording. This prevents wasted processing on false wake word triggers (e.g., beep feedback, background noise).

**How it works:**
1. Voice Activity Detection (VAD) tracks whether actual speech occurred during recording
2. If no speech detected (`hasSpokenDuringRecording = false`), transcription is skipped
3. System immediately returns to listening state (~1s vs ~8s for full processing)

**Benefits:**
- ✅ **87% latency improvement** for false triggers (~8s → <1s)
- ✅ Eliminates confusing AI responses to noise (e.g., "(bell dings)" → silence)
- ✅ Reduces unnecessary transcription and AI API calls
- ✅ Improves overall system responsiveness

**Log output when triggered:**
```
🎤 Wake word detected! (score: 0.987)
🎙️ Recording started
🛑 Recording stopped (samples: 29376)
⏩ Skipping transcription - no speech detected
[System returns to listening]
```

## Audio Feedback Beeps

The voice gateway provides audio feedback through different beeps to indicate system state:

| Beep | Sound | When Played |
|------|-------|-------------|
| **Wake Word** | 800Hz single tone (150ms) | Immediately when "Hey Jarvis" is detected. Confirms the system heard the wake word and is now listening for your command. |
| **Processing** | 500Hz single tone (100ms) | When voice recording is complete. Indicates the system is transcribing and processing your query. |
| **Response Ready** | 600Hz → 900Hz ascending dual-tone | When the AI response is ready. A two-tone "chime" signals the answer is about to be spoken. |
| **Error** | 400Hz → 300Hz → 200Hz descending | When an error occurs (transcription failure, AI timeout, etc.). Three descending tones like a "sad trombone." |

**Typical Interaction Flow:**
1. Say "Hey Jarvis" → **Wake Word beep** (high-pitched)
2. Speak your command → System records
3. Stop speaking → **Processing beep** (medium-pitched)
4. AI generates response → **Response Ready beep** (ascending chime)
5. TTS speaks the response

**Volume Control:**

Beep volume can be adjusted via the `BEEP_VOLUME` environment variable (default: 0.3, range: 0.0-1.0):

```bash
# In .env.tmp file
BEEP_VOLUME=0.5  # 50% volume
```

## Available Wake Words

OpenWakeWord includes several pre-trained models:

1. **hey_jarvis** (Recommended) - "Hey Jarvis"
2. **alexa** - "Alexa"
3. **hey_mycroft** - "Hey Mycroft"
4. **timer** - "Timer"
5. **weather** - "Weather"

Custom wake words can be trained using the OpenWakeWord toolkit.

## Voice Commands

The voice assistant supports various commands through AI tool calling:

### Volume Control

Control the speaker volume using natural voice commands:

**Get current volume:**
- "What's the current volume?"
- "How loud is the volume?"

**Set specific volume:**
- "Set volume to 50%"
- "Set volume to 75 percent"
- "Volume to half"

**Increase volume:**
- "Turn up the volume"
- "Increase the volume"
- "Make it louder"
- "Volume up"

**Decrease volume:**
- "Turn down the volume"
- "Decrease the volume"
- "Make it quieter"
- "Volume down"

**Special commands:**
- "Mute" - Set volume to 0
- "Unmute" - Restore volume to 50%
- "Maximum volume" / "Max volume" - Set to 100%

### Z-Wave Device Control

Control smart home devices:

- "Turn on the living room light"
- "Turn off the bedroom fan"
- "What's the status of the kitchen light?"

### Date & Time

Get current date and time information:

- "What time is it?"
- "What's the date today?"
- "What day of the week is it?"

### Web Search

Search for information:

- "Search for the weather in Seattle"
- "Look up the current price of Bitcoin"

## MQTT Topics

**Published:**

- `voice/req` - Voice transcriptions
  ```json
  {
    "transcription": "turn on the living room lights",
    "timestamp": "2025-10-11T15:30:00Z",
    "session_id": "uuid"
  }
  ```

- `voice/status` - Gateway status
  ```json
  {
    "state": "listening" | "recording" | "processing" | "idle" | "error",
    "wake_word_active": true
  }
  ```

**Subscribed:**

- `voice/res` - AI responses
  ```json
  {
    "response": "Turning on the living room lights now.",
    "session_id": "uuid",
    "timestamp": "2025-10-11T15:30:02Z"
  }
  ```

## Configuration

See `.env.example` for all available options.

**Key Settings:**

**OpenWakeWord:**

- `OWW_MODEL_PATH` - Path to OpenWakeWord ONNX model (default: models/hey_jarvis_v0.1.onnx)
- `OWW_THRESHOLD` - Detection threshold 0-1 (default: 0.5, lower = more sensitive)

**Audio:**

- `AUDIO_MIC_DEVICE` - ALSA device for microphone (default: plughw:3,0)
- `AUDIO_SPEAKER_DEVICE` - ALSA device for speaker (default: plughw:2,0)
- `AUDIO_SAMPLE_RATE` - Sample rate in Hz (default: 16000)

**Whisper Speech-to-Text:**

- `WHISPER_MODEL` - Model name (default: tiny)
- `WHISPER_MODEL_PATH` - Path to model file (default: models/ggml-tiny.bin)

**Ollama AI:**

- `OLLAMA_BASE_URL` - Ollama server URL (default: http://localhost:11434)
- `OLLAMA_MODEL` - Model to use (default: qwen2.5:0.5b - optimized for speed)
    - Use `qwen2.5:1.5b` for better accuracy (~4x slower)

**Text-to-Speech (ElevenLabs):**

- `TTS_ENABLED` - Enable/disable TTS (default: true)
- `TTS_VOLUME` - Volume 0.0-1.0 (default: 1.0)
- `ELEVENLABS_API_KEY` - **REQUIRED** ElevenLabs API key
- `ELEVENLABS_VOICE_ID` - Voice to use (default: JBFqnCBsd6RMkjVDRZzb - George)
- `ELEVENLABS_MODEL_ID` - Model to use (default: eleven_multilingual_v2)
- `ELEVENLABS_STABILITY` - Voice stability 0.0-1.0 (default: 0.5)
- `ELEVENLABS_SIMILARITY_BOOST` - Similarity boost 0.0-1.0 (default: 0.75)

**MQTT:**

- `MQTT_BROKER_URL` - MQTT broker (default: mqtt://localhost:1883)

**MCP Server (Z-Wave Integration):**

- `MCP_RETRY_ATTEMPTS` - Number of connection attempts before giving up (default: 3)
- `MCP_RETRY_BASE_DELAY` - Base delay in milliseconds for exponential backoff (default: 2000)
  - Retry timing: attempt 1 (0ms), attempt 2 (2000ms), attempt 3 (4000ms)
  - Total max retry time: 6 seconds
  - The voice gateway uses exponential backoff to handle transient MCP server connection failures
  - If all retries fail, the gateway continues with local tools only (graceful degradation)

**VAD:**

- `VAD_TRAILING_SILENCE_MS` - Silence before stopping (default: 1500ms)
- `VAD_MAX_UTTERANCE_MS` - Max recording time (default: 10000ms)

## Troubleshooting

### TTS not working (no spoken responses)

**Error: `spawn ffmpeg ENOENT`**

This means `ffmpeg` is not installed or not in PATH.

**Fix:**
```bash
# macOS
brew install ffmpeg

# Linux (Raspberry Pi)
sudo apt-get update
sudo apt-get install ffmpeg

# Verify installation
ffmpeg -version
```

**Error: `ElevenLabs TTS not ready` or `ElevenLabs API key not configured`**

**Fix:**
1. Get your API key from https://elevenlabs.io/app/settings/api-keys
2. Add to `.env` file:
   ```bash
   ELEVENLABS_API_KEY=your_api_key_here
   ```
3. Restart the voice gateway

**Error: `ElevenLabs TTS failed` with network errors**

**Fix:**
1. Check internet connection: `curl -I https://api.elevenlabs.io`
2. Verify API key is valid
3. Check firewall/proxy settings
4. **Fallback:** Disable TTS with `TTS_ENABLED=false` in `.env`

**Debugging TTS issues:**

Check the logs for detailed debugging information:
```bash
# Look for TTS configuration on startup
grep "ElevenLabs Configuration" logs

# Check health check results
grep "health check" logs

# Monitor TTS synthesis
grep "Synthesizing speech\|ElevenLabs" logs

# View any errors
grep "ERROR\|❌" logs
```

### Wake word not detecting

1. Check microphone: `arecord -l`
2. Test recording: `arecord -D hw:2,0 -f S16_LE -r 16000 -c 1 -d 3 test.wav`
3. Adjust threshold: `OWW_THRESHOLD=0.3` in `.env` (lower = more sensitive)
4. Try different model: Download alternative wake word model
5. Check logs: `npm run dev` (verbose output with debug scores)

### STT transcription errors

1. Verify model downloaded: `ls -lh models/ggml-tiny.bin`
2. Check audio quality: Play back recorded WAV
3. Increase max utterance: `VAD_MAX_UTTERANCE_MS=15000`
4. For better accuracy (slower): Switch to base model `WHISPER_MODEL_PATH=models/ggml-base.bin`

### MQTT connection issues

1. Test broker: `mosquitto_sub -h 10.0.0.58 -p 31883 -t 'voice/#'`
2. Check firewall rules
3. Verify Oracle is subscribed to `voice/req`

### MCP Server (Z-Wave) connection issues

**Error: `MCP connection failed after 3 attempts`**

The voice gateway uses exponential backoff retry logic to handle transient MCP server connection failures. If you see this error, it means all retry attempts failed.

**Symptoms:**
- Log shows: `❌ MCP connection attempt 1/3 failed`
- Log shows: `⏳ Retrying MCP connection in 2000ms...`
- Final error: `❌ MCP integration permanently failed`
- Voice gateway continues running but Z-Wave control is unavailable

**Common Causes:**

1. **Z-Wave MCP server not running**
   - Verify the zwave-mcp-server is installed: `ls -la ../zwave-mcp-server`
   - Check Node.js version: `node --version` (requires Node.js 24+)

2. **MQTT broker unavailable**
   - Test MQTT connection: `mosquitto_sub -h localhost -p 1883 -t 'test'`
   - Verify `MQTT_BROKER_URL` in `.env` is correct
   - Check if MQTT broker is running: `systemctl status mosquitto` (Linux)

3. **Z-Wave JS UI not accessible**
   - Verify Z-Wave JS UI is running
   - Check `ZWAVE_UI_URL` in zwave-mcp-server `.env`
   - Test URL: `curl http://localhost:8091` (or your configured URL)

**Debugging:**

1. **Check MCP server logs for stderr output:**
   ```bash
   # The voice gateway captures stderr from MCP server subprocess
   # Look for "MCP stderr:" in logs
   grep "MCP stderr" logs
   ```

2. **Manually test Z-Wave MCP server:**
   ```bash
   cd ../zwave-mcp-server
   npm run dev
   # Should connect to MQTT and Z-Wave JS UI without errors
   ```

3. **Adjust retry configuration** (if needed):
   ```bash
   # Increase retry attempts
   MCP_RETRY_ATTEMPTS=5

   # Increase base delay for slower connections
   MCP_RETRY_BASE_DELAY=3000
   ```

**Expected Behavior:**

- **Success on first attempt:** No retry messages, Z-Wave tools available
- **Transient failure:** Retries succeed within 6 seconds, logs show retry attempts
- **Permanent failure:** All retries exhausted, voice gateway continues with local tools only (datetime, search, volume control)

**Note:** The voice gateway implements graceful degradation. If the MCP server is unavailable, the system will continue operating with local tools but Z-Wave device control will not be available.

### Performance issues on Raspberry Pi

**Current optimized configuration achieves ~7s total response time.**

If you need further optimization:

1. **Reduce VAD silence:** `VAD_TRAILING_SILENCE_MS=1000` (may cut off speech)
2. **Increase TTS speed:** `TTS_SPEED=4.0` or higher (may sound unnatural)
3. Monitor CPU usage: `htop`
4. Consider overclocking Pi 5 for better performance

**Model Performance Benchmarks (Pi 5, 16GB):**

| Component   | Model        | Time  | Quality |
|-------------|--------------|-------|---------|
| **Whisper** | tiny         | ~1.5s | Good    |
|             | base         | ~6s   | Better  |
| **Ollama**  | qwen2.5:0.5b | ~1s   | Good    |
|             | qwen2.5:1.5b | ~4.6s | Better  |
|             | qwen3:1.7b   | ~14s  | Best    |

**See [Performance Optimization Guide](../../docs/performance-optimization.md) for detailed optimization process.**

## Comparison: OpenWakeWord vs Picovoice Porcupine

| Feature                | OpenWakeWord         | Picovoice Porcupine |
|------------------------|----------------------|---------------------|
| **Cost**               | Free                 | Free tier (limited) |
| **API Key**            | Not required         | Required            |
| **Offline**            | Yes                  | Yes                 |
| **Custom Wake Words**  | Yes (train your own) | Yes (paid tier)     |
| **Pre-trained Models** | Multiple free models | Limited free models |
| **Resource Usage**     | Low                  | Low-Medium          |
| **Accuracy**           | Good                 | Excellent           |
| **License**            | Apache 2.0           | Proprietary         |

## Development

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Linting
npm run lint
```

## Project Structure

```
voice-gateway-oww/
├── src/
│   ├── main.js          # Entry point with OpenWakeWord
│   ├── config.js        # Environment configuration
│   └── Logger.js        # Structured logging
├── scripts/
│   └── setup.js         # Model download script
├── models/              # Downloaded models (gitignored)
│   ├── hey_jarvis_v0.1.onnx
│   └── ggml-tiny.bin
├── tests/               # Unit tests
├── .env.example         # Environment template
└── package.json
```

## Documentation

- **Performance Optimization:** [docs/performance-optimization.md](../../docs/performance-optimization.md) ⭐
- **Architecture:** [docs/voice-gateway-architecture.md](../../docs/voice-gateway-architecture.md)
- **ALSA Setup:** [docs/alsa-setup.md](../../docs/alsa-setup.md)
- **OpenWakeWord:** https://github.com/dscripka/openWakeWord
- **Network Dependencies:** [docs/network-dependencies.md](../../docs/network-dependencies.md)

## Model Downloads

OpenWakeWord models are downloaded automatically by the setup script, or manually:

```bash
# Download hey_jarvis model
curl -L -o models/hey_jarvis_v0.1.onnx \
  https://github.com/dscripka/openWakeWord/releases/download/v0.1.1/hey_jarvis_v0.1.onnx

# Download alexa model
curl -L -o models/alexa_v0.1.onnx \
  https://github.com/dscripka/openWakeWord/releases/download/v0.1.1/alexa_v0.1.onnx
```

## License

MIT

## Credits

- **OpenWakeWord:** https://github.com/dscripka/openWakeWord
- **Whisper.cpp:** https://github.com/ggerganov/whisper.cpp
- **ONNX Runtime:** https://onnxruntime.ai/
