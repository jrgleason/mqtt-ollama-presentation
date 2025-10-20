# Voice Gateway Comparison: Porcupine vs OpenWakeWord

This document compares the two voice gateway implementations in this project.

## Key Differences

### voice-gateway (Picovoice Porcupine)

- **Wake Word Engine:** Picovoice Porcupine
- **API Key:** Required (free tier available)
- **Cost:** Free tier with limitations, paid for commercial use
- **Models:** Pre-trained commercial models
- **Accuracy:** Excellent
- **Setup Complexity:** Medium (requires API key registration)
- **Resource Usage:** Low-Medium

### voice-gateway-oww (OpenWakeWord)

- **Wake Word Engine:** OpenWakeWord (open-source)
- **API Key:** Not required
- **Cost:** Completely free (Apache 2.0 license)
- **Models:** Multiple free pre-trained models
- **Accuracy:** Good
- **Setup Complexity:** Low (no registration needed)
- **Resource Usage:** Low

## Feature Comparison

| Feature                  | voice-gateway (Porcupine) | voice-gateway-oww (OpenWakeWord) |
|--------------------------|---------------------------|----------------------------------|
| **License**              | Proprietary               | Apache 2.0                       |
| **API Key Required**     | Yes                       | No                               |
| **Offline Operation**    | Yes                       | Yes                              |
| **Custom Wake Words**    | Paid tier                 | Free (train your own)            |
| **Pre-trained Models**   | Limited free              | Multiple free                    |
| **Dependencies**         | @picovoice/porcupine-node | onnxruntime-node                 |
| **Model Format**         | .ppn                      | .onnx                            |
| **Raspberry Pi Support** | Yes                       | Yes                              |
| **Commercial Use**       | Requires license          | Free                             |

## Available Wake Words

### Porcupine

- "Computer" (built-in)
- Custom keywords (paid)

### OpenWakeWord

- "Hey Jarvis" (recommended)
- "Alexa"
- "Hey Mycroft"
- "Timer"
- "Weather"
- Custom (train your own)

## When to Use Each

### Use voice-gateway (Porcupine) when:

- You need maximum accuracy
- You're okay with API key management
- You want commercial-grade support
- You need specific custom wake words (paid tier)

### Use voice-gateway-oww (OpenWakeWord) when:

- You want completely free, open-source solution
- You don't want to manage API keys
- You need multiple wake word options
- You want to train custom wake words
- You prefer fully offline operation with no external dependencies

## Migration Guide

### From voice-gateway to voice-gateway-oww:

1. **Remove Porcupine dependency:**
   ```bash
   # Not needed anymore
   PORCUPINE_ACCESS_KEY=...
   ```

2. **Update environment variables:**
   ```bash
   # Replace with
   OWW_MODEL_PATH=models/hey_jarvis_v0.1.onnx
   OWW_THRESHOLD=0.5
   ```

3. **Run setup:**
   ```bash
   cd apps/voice-gateway-oww
   npm install
   npm run setup
   ```

4. **Test:**
   ```bash
   npm run dev
   ```

### From voice-gateway-oww to voice-gateway:

1. **Get Picovoice API key:**
    - Register at https://console.picovoice.ai

2. **Update environment variables:**
   ```bash
   # Replace with
   PORCUPINE_ACCESS_KEY=your_key_here
   PORCUPINE_KEYWORD_PATH=computer  # or custom .ppn file
   PORCUPINE_SENSITIVITY=0.5
   ```

3. **Run setup:**
   ```bash
   cd apps/voice-gateway
   npm install
   npm run setup
   ```

4. **Test:**
   ```bash
   npm run dev
   ```

## Performance Notes

### Raspberry Pi 5 Performance

**Porcupine:**

- CPU Usage: ~15-20%
- Memory: ~150MB
- Wake Word Detection: <100ms
- False Positive Rate: Very Low

**OpenWakeWord:**

- CPU Usage: ~10-15%
- Memory: ~120MB
- Wake Word Detection: ~100-150ms
- False Positive Rate: Low

Both implementations are suitable for Raspberry Pi 5. OpenWakeWord has slightly lower resource usage but Porcupine has
marginally better accuracy.

## Recommendation

**For this CodeMash presentation project:**

Use **voice-gateway-oww** (OpenWakeWord) because:

- ✅ No API key management during demos
- ✅ Completely free and open-source
- ✅ Good accuracy for demo purposes
- ✅ Multiple wake word options
- ✅ Better story for local-first architecture
- ✅ No cloud dependencies whatsoever

Keep **voice-gateway** (Porcupine) as:

- 📚 Educational comparison
- 🎯 Alternative for users who prefer commercial support
- 🔧 Fallback option if OpenWakeWord has issues

## Technical Architecture

Both implementations share the same architecture after wake word detection:

```
Wake Word Detection (Porcupine OR OpenWakeWord)
              ↓
      Audio Recording + VAD
              ↓
      Whisper STT (shared)
              ↓
      MQTT Publishing (shared)
              ↓
      Oracle Chatbot (shared)
```

The only difference is the wake word detection engine. Everything else (VAD, STT, MQTT) is identical.
