# Quick Start Guide - OpenWakeWord Voice Gateway

## ✅ Setup Complete!

All models have been downloaded and the system is ready to use.

## Running on Raspberry Pi 5

### 1. Copy to Raspberry Pi

```bash
# From your development machine
cd /Users/jrg/code/CodeMash/mqtt-ollama-presentation
scp -r apps/voice-gateway-oww pi@<raspberry-pi-ip>:/home/pi/
```

### 2. Install Dependencies

```bash
# SSH into Raspberry Pi
ssh pi@<raspberry-pi-ip>

# Navigate to app
cd voice-gateway-oww

# Install dependencies
npm install
```

### 3. Configure (Optional)

```bash
# Copy environment template
cp .env.example .env

# Edit if needed (defaults work out of the box)
nano .env
```

**Default Configuration (works as-is):**

- Wake Word: "Hey Jarvis"
- Microphone: hw:2,0 (LANDIBO USB mic)
- MQTT Broker: mqtt://localhost:1883
- Threshold: 0.5

### 4. Run

```bash
npm run dev
```

Expected output:

```
ℹ️  [info] Voice Gateway (OpenWakeWord) starting...
ℹ️  [info] Loading melspectrogram model...
ℹ️  [info] Loading embedding model...
ℹ️  [info] Loading wake word model...
ℹ️  [info] All OpenWakeWord models loaded successfully
ℹ️  [info] Microphone started
✅ [info] Voice Gateway (OpenWakeWord) started successfully
🎤 [info] Listening for wake word (threshold: 0.5)
```

### 5. Install and Configure Text-to-Speech (Piper TTS)

**Piper TTS provides local, offline speech synthesis so the AI can talk back to you!**

```bash
# Create Python virtual environment for Piper TTS
python3 -m venv venvs/piper-tts

# Activate the virtual environment
source venvs/piper-tts/bin/activate

# Install Piper TTS in the venv
pip install piper-tts

# Download a voice model (amy is a good general-purpose voice)
python3 -m piper.download_voices en_US-amy-medium

# The voice will be downloaded to ~/.local/share/piper_tts/
# Create models directory and link it
mkdir -p models/piper
ln -s ~/.local/share/piper_tts/en_US-amy-medium.onnx models/piper/
ln -s ~/.local/share/piper_tts/en_US-amy-medium.onnx.json models/piper/

# Deactivate venv when done
deactivate
```

**Using Piper TTS:**

The application needs access to the venv's piper installation. The app will automatically use the venv if it exists:

```bash
# The app looks for piper in these locations (in order):
# 1. ./venvs/piper-tts/bin/piper  (recommended)
# 2. System-wide piper installation
```

To use the venv:

```bash
# Option 1: Run with venv activated (recommended for development)
source venvs/piper-tts/bin/activate
npm run dev
# (venv stays active - press Ctrl+C to stop, then run 'deactivate')

# Option 2: Let the app find it automatically
npm run dev
# (app will use venvs/piper-tts/bin/piper if it exists)
```

**Available voices:**

- `en_US-amy-medium` - Clear American English (recommended)
- `en_US-lessac-medium` - Male voice
- `en_GB-alan-medium` - British English

**To disable TTS (text only):**

```bash
# Edit .env
nano .env

# Set TTS_ENABLED=false
TTS_ENABLED=false
```

### 6. Start Ollama (Required for AI Responses)

```bash
# Make sure Ollama is running locally
ollama serve

# In another terminal, pull the model if not already downloaded
ollama pull Qwen3:1.7b
```

### 7. Test the Complete Flow

**Simple Question:**

1. Say: **"Hey Jarvis"** (wait for wake word confirmation)
2. Say: **"What is the capital of France?"**
3. System will:
    - 📝 Transcribe your speech using Whisper
    - 📤 Publish transcription to MQTT (`voice/transcription`)
    - 🤖 Send transcription to Ollama AI
    - ✅ Receive AI response
    - 🔊 Speak the response using Piper TTS
    - 📤 Publish AI response to MQTT (`voice/ai-response`)

**Multi-Turn Conversation:**

1. Say: **"Hey Jarvis"** → **"What is 2 plus 2?"**
    - AI: "2 plus 2 equals 4."
2. Say: **"Hey Jarvis"** → **"What about 3 times that?"**
    - AI: "3 times 4 equals 12." (AI remembers previous answer!)
3. Wait 5+ minutes... conversation context resets automatically

**Conversation Features:**

- ✅ Maintains context between questions (no need to repeat yourself)
- ✅ Automatically resets after 5 minutes of inactivity
- ✅ Each wake word starts a new turn in the conversation
- ✅ AI can reference previous questions and answers

### 8. Monitor MQTT Messages (Optional)

```bash
# In a separate terminal, subscribe to voice topics
mosquitto_sub -h 10.0.0.58 -p 31883 -t 'voice/#' -v

# You'll see:
# voice/transcription {"text":"What is the capital of France?","timestamp":"..."}
# voice/ai-response {"question":"What is the capital of France?","answer":"Paris is the capital of France.","model":"Qwen3:1.7b","timestamp":"..."}
```

## Quick Configuration Changes

### Use Different Wake Word

```bash
# Edit .env
nano .env

# Change to "Alexa"
OWW_MODEL_PATH=models/alexa_v0.1.onnx

# Or "Hey Mycroft"
OWW_MODEL_PATH=models/hey_mycroft_v0.1.onnx
```

### Adjust Sensitivity

```bash
# More sensitive (detects easier, may have false positives)
OWW_THRESHOLD=0.3

# Less sensitive (harder to trigger, fewer false positives)
OWW_THRESHOLD=0.7
```

### Change Microphone Device

```bash
# List available devices
arecord -l

# Update .env
AUDIO_MIC_DEVICE=hw:X,Y  # Replace X,Y with your device
```

### Change Ollama Model or URL

```bash
# Use a different model (must be pulled first with `ollama pull <model>`)
OLLAMA_MODEL=llama3.2:3b

# Connect to remote Ollama instance
OLLAMA_BASE_URL=http://192.168.1.100:11434
```

### Adjust Voice Activity Detection (VAD)

The system uses **Voice Activity Detection** to intelligently stop recording when you finish speaking. Instead of a
fixed timeout, it listens for silence and automatically ends the recording.

**How it works:**

- After wake word detection, recording starts immediately
- System monitors audio energy levels in real-time
- When 1.5 seconds of silence is detected, recording stops
- Maximum recording length is 10 seconds (safety limit)

**Configuration options:**

```bash
# Edit .env
nano .env

# Adjust silence duration before stopping (in milliseconds)
# Default: 1500ms (1.5 seconds)
# Lower = more responsive but may cut off pauses
# Higher = allows longer pauses but slower to stop
VAD_TRAILING_SILENCE_MS=1500

# Adjust maximum recording length (in milliseconds)
# Default: 10000ms (10 seconds)
# Prevents runaway recording if silence detection fails
VAD_MAX_UTTERANCE_MS=10000
```

**When to adjust:**

- **Too responsive** (cuts off mid-sentence):
  ```bash
  VAD_TRAILING_SILENCE_MS=2000  # Allow 2 seconds of silence
  ```

- **Too slow** (waits too long after you stop):
  ```bash
  VAD_TRAILING_SILENCE_MS=1000  # Only wait 1 second
  ```

- **Long queries** (need more than 10 seconds):
  ```bash
  VAD_MAX_UTTERANCE_MS=15000    # Allow 15 seconds max
  ```

**Advanced: Silence threshold tuning**

If VAD is not detecting silence correctly (rare), you can adjust the energy threshold in `src/main.js:290`:

```javascript
const SILENCE_THRESHOLD = 0.001;  // Default (RMS energy threshold)
// Lower = more sensitive to silence (may stop during quiet speech)
// Higher = less sensitive (may not detect pauses)
```

**Tip:** Run with `LOG_LEVEL=debug` to see energy levels during recording:

```bash
LOG_LEVEL=debug npm run dev
# Watch for "🔇 Detecting silence" and "🗣️ Speech detected" logs
```

## Troubleshooting

### Wake word not detected?

1. **Lower threshold:**
   ```bash
   OWW_THRESHOLD=0.3
   ```

2. **Check microphone:**
   ```bash
   arecord -D hw:2,0 -f S16_LE -r 16000 -c 1 -d 3 test.wav
   aplay test.wav
   ```

3. **Verify models:**
   ```bash
   ls -lh models/
   # Should show 6 files totaling ~147MB
   ```

### High CPU usage?

Normal on Raspberry Pi:

- Expected: 10-20% CPU
- This is ONNX inference running on CPU
- If consistently over 30%, consider using lighter wake word model

### MQTT not connecting?

1. **Check broker:**
   ```bash
   mosquitto_sub -h 10.0.0.58 -p 31883 -t 'voice/#'
   ```

2. **Update broker URL in .env:**
   ```bash
   MQTT_BROKER_URL=mqtt://<your-broker-ip>:31883
   ```

### Ollama AI not responding?

1. **Check Ollama is running:**
   ```bash
   curl http://localhost:11434/api/version
   # Should return: {"version":"0.x.x"}
   ```

2. **Verify model is downloaded:**
   ```bash
   ollama list
   # Should show Qwen3:1.7b or your configured model
   ```

3. **Pull model if missing:**
   ```bash
   ollama pull Qwen3:1.7b
   ```

4. **Check logs for errors:**
   ```bash
   # Voice gateway will show:
   # ❌ Ollama AI query failed
   # ⚠️ Continuing without Ollama
   ```

### TTS not working (AI silent)?

1. **Check if Piper is installed:**
   ```bash
   # Activate venv first
   source venvs/piper-tts/bin/activate
   python3 -c "import piper"
   # Should return nothing if installed, error if not
   deactivate
   ```

2. **Install Piper if missing:**
   ```bash
   # Create venv if it doesn't exist
   python3 -m venv venvs/piper-tts

   # Activate and install
   source venvs/piper-tts/bin/activate
   pip install piper-tts
   deactivate
   ```

3. **Check if voice model exists:**
   ```bash
   ls -la models/piper/
   # Should show en_US-amy-medium.onnx and .json files
   ```

4. **Download voice if missing:**
   ```bash
   # Activate venv first
   source venvs/piper-tts/bin/activate

   python3 -m piper.download_voices en_US-amy-medium
   mkdir -p models/piper
   ln -s ~/.local/share/piper_tts/en_US-amy-medium.onnx models/piper/
   ln -s ~/.local/share/piper_tts/en_US-amy-medium.onnx.json models/piper/

   deactivate
   ```

5. **Check speaker device:**
   ```bash
   # Linux: List audio devices
   aplay -l

   # Update .env if needed
   AUDIO_SPEAKER_DEVICE=hw:X,Y
   ```

6. **Temporarily disable TTS:**
   ```bash
   # Edit .env
   TTS_ENABLED=false
   ```

### Recording cutting off mid-sentence?

**Symptom:** The system stops recording before you finish speaking.

**Solution:** Increase the silence duration threshold:

```bash
# Edit .env
VAD_TRAILING_SILENCE_MS=2000  # Wait 2 seconds of silence instead of 1.5
```

**Explanation:** The Voice Activity Detection (VAD) system stops recording after detecting silence. If you speak slowly
with long pauses, increase this value to allow more time between words.

### Recording not stopping when you finish?

**Symptom:** The system keeps recording after you stop speaking, waiting for the full 10-second timeout.

**Solution:** Decrease the silence duration threshold:

```bash
# Edit .env
VAD_TRAILING_SILENCE_MS=1000  # Only wait 1 second of silence
```

**Explanation:** If the system isn't detecting silence properly, it may be because your microphone picks up ambient
noise. Try recording in a quieter environment or decrease the silence threshold.

### Recording stops during long questions?

**Symptom:** You need more than 10 seconds to ask your question.

**Solution:** Increase the maximum recording length:

```bash
# Edit .env
VAD_MAX_UTTERANCE_MS=15000  # Allow 15 seconds instead of 10
```

**Note:** This is a safety limit to prevent runaway recording if silence detection fails.

## System Requirements

- **Raspberry Pi 5** (16GB RAM recommended, 8GB minimum)
- **USB Microphone** (16kHz capable, e.g., LANDIBO GSH23)
- **Speaker** (USB or 3.5mm audio output)
- **MQTT Broker** (HiveMQ or Mosquitto)
- **Python 3.8+** with pip (for Piper TTS)
- **Internet** (only for initial setup: `npm install`, `pip install`, model downloads; runs offline after)

## What's Different from Porcupine Version?

| Feature    | OpenWakeWord ✅   | Porcupine         |
|------------|------------------|-------------------|
| API Key    | **Not needed**   | Required          |
| Cost       | **Free forever** | Free tier limited |
| Wake Words | **3 included**   | 1 (Computer)      |
| Setup      | **Already done** | Needs API key     |

## Architecture

```
Microphone (USB)
    ↓
[80ms audio chunks]
    ↓
Mel Spectrogram Model (ONNX)
    ↓
Embedding Model (ONNX)
    ↓
Wake Word Model (ONNX)
    ↓
[Confidence Score > Threshold?]
    ↓
Record Audio (VAD-based)
    ├─→ Monitor energy levels
    ├─→ Detect 1.5s silence → Stop
    └─→ Max 10s safety limit
    ↓
Whisper STT (speech-to-text)
    ↓
[Transcribed Text]
    ↓
├─→ MQTT Publish (voice/transcription)
    ↓
Conversation Manager (5-min context)
    ↓
Ollama AI (local inference + history)
    ↓
[AI Response]
    ↓
Conversation Manager (save response)
    ↓
├─→ MQTT Publish (voice/ai-response)
    ↓
Piper TTS (text-to-speech)
    ├─→ Convert markdown to speech text
    ├─→ Synthesize audio (Python)
    └─→ Generate 16kHz PCM audio
    ↓
Speaker (USB/3.5mm)
    └─→ Play audio response
```

## Files Structure

```
voice-gateway-oww/
├── models/                    ✅ Downloaded (147MB)
│   ├── melspectrogram.onnx
│   ├── embedding_model.onnx
│   ├── hey_jarvis_v0.1.onnx
│   ├── alexa_v0.1.onnx
│   ├── hey_mycroft_v0.1.onnx
│   ├── ggml-base.bin
│   └── piper/                     👈 TTS voice models
│       ├── en_US-amy-medium.onnx
│       └── en_US-amy-medium.onnx.json
├── src/
│   ├── main.js                    ✅ OpenWakeWord integration + orchestration + TTS
│   ├── config.js                  ✅ Configuration loader
│   ├── logger.js                  ✅ Logging utility
│   ├── ollama-client.js           ✅ Ollama AI integration
│   ├── mqtt-client.js             ✅ MQTT publish/subscribe
│   ├── conversation-manager.js    ✅ Conversation context with 5-min timeout
│   ├── piper-tts.js               ✅ Piper TTS integration
│   └── markdown-to-speech.js      ✅ Markdown to speech text converter
├── .env                      👈 Create from .env.example
└── package.json              ✅ Dependencies installed
```

## Next Steps

1. **Deploy to Pi** (see steps above)
2. **Test wake word detection**
3. **Integrate with Oracle chatbot**
4. **Practice demo for CodeMash presentation**

## Support

- **Documentation:** `README.md`
- **Detailed Setup:** `SETUP_COMPLETE.md`
- **Comparison:** `COMPARISON.md`
- **OpenWakeWord Docs:** https://github.com/dscripka/openWakeWord

---

**You're all set!** 🚀

The OpenWakeWord voice gateway is configured and ready to run on your Raspberry Pi 5.
