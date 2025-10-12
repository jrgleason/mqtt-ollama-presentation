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
- MQTT Broker: mqtt://10.0.0.58:31883
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

### 5. Test

1. Say: **"Hey Jarvis"** (wait for confirmation)
2. Say: **"Turn on the living room lights"**
3. System will transcribe and send to Oracle via MQTT

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

## System Requirements

- **Raspberry Pi 5** (16GB RAM recommended, 8GB minimum)
- **USB Microphone** (16kHz capable, e.g., LANDIBO GSH23)
- **MQTT Broker** (HiveMQ or Mosquitto)
- **Internet** (only for initial `npm install`, runs offline after)

## What's Different from Porcupine Version?

| Feature | OpenWakeWord ✅ | Porcupine |
|---------|----------------|-----------|
| API Key | **Not needed** | Required |
| Cost | **Free forever** | Free tier limited |
| Wake Words | **3 included** | 1 (Computer) |
| Setup | **Already done** | Needs API key |

## Architecture

```
Microphone (USB)
    ↓
[80ms audio chunks]
    ↓
Mel Spectrogram Model
    ↓
Embedding Model
    ↓
Wake Word Model
    ↓
[Confidence Score]
    ↓
Threshold Check → Record → Whisper STT → MQTT
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
│   └── ggml-base.bin
├── src/
│   ├── main.js               ✅ OpenWakeWord integration
│   ├── config.js             ✅ Configuration loader
│   └── logger.js             ✅ Logging utility
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
