# Installing GLaDOS Voice for Piper TTS

## Overview

There's a custom-trained GLaDOS voice available for Piper TTS! This gives you the iconic Portal 2 GLaDOS voice for your Jarvis assistant.

**Repository:** https://github.com/Nold360/piper-voice-glados

---

## Quick Installation

### Step 1: Download the GLaDOS Voice

```bash
cd /Users/jrg/code/CodeMash/mqtt-ollama-presentation/apps/voice-gateway-oww

# Download the GLaDOS voice (high quality, ~100MB)
curl -L -o glados-voice.tar.gz \
  https://github.com/Nold360/piper-voice-glados/releases/download/0.1/voice-en-us-glados-high.tar.gz

# Extract the archive
tar -xzf glados-voice.tar.gz

# You should now have:
# - en-us-glados-high.onnx
# - en-us-glados-high.onnx.json
```

### Step 2: Move Files to Models Directory

```bash
# Create piper models directory if needed
mkdir -p models/piper

# Move the voice files
mv en-us-glados-high.onnx models/piper/
mv en-us-glados-high.onnx.json models/piper/

# Clean up
rm glados-voice.tar.gz
```

### Step 3: Update Configuration

Edit `apps/voice-gateway-oww/.env`:

```bash
# Change from:
TTS_MODEL_PATH=models/piper/en_US-amy-medium.onnx

# To:
TTS_MODEL_PATH=models/piper/en-us-glados-high.onnx
```

### Step 4: Restart Voice Gateway

```bash
# Stop the current process (Ctrl+C)
# Then restart
npm start
```

---

## Testing GLaDOS Voice

Test the voice before using it in the gateway:

```bash
cd apps/voice-gateway-oww

# Test with a classic GLaDOS quote
echo "The Enrichment Center reminds you that the Weighted Companion Cube will never threaten to stab you and, in fact, cannot speak." | \
  python3 -m piper \
  --model models/piper/en-us-glados-high.onnx \
  --output-file test-glados.wav

# Play the audio (macOS)
afplay test-glados.wav

# Or on Linux
aplay test-glados.wav
```

### More GLaDOS Test Phrases

```bash
# Classic Portal quotes
echo "This next test involves turrets. You remember them, right? They're the pale spherical things that are full of bullets." | \
  python3 -m piper -m models/piper/en-us-glados-high.onnx -f test.wav

echo "The cake is a lie." | \
  python3 -m piper -m models/piper/en-us-glados-high.onnx -f test.wav

echo "I'm making a note here: huge success." | \
  python3 -m piper -m models/piper/en-us-glados-high.onnx -f test.wav
```

---

## Alternative GLaDOS Voices

### French GLaDOS
**Repository:** https://github.com/TazzerMAN/piper-voice-glados-fr
For French-speaking GLaDOS fans.

### German GLaDOS
**Repository:** https://github.com/Nocturna22/Piper-GlaDOS-Voice-DE
For German-speaking users.

---

## Voice Quality

- **Quality Level:** High
- **Sample Rate:** 22,050 Hz
- **Model Size:** ~100 MB
- **Language:** English (US)
- **Performance:** Slower than medium-quality voices, but much better sound quality

**Note:** Since this is a high-quality model, it may be slower than the medium-quality amy voice you're currently using. If performance is an issue, you may need to:
- Increase `TTS_SPEED` even more (try 3.0 or 3.5)
- Use a lower quality voice for faster response times

---

## Adjusting GLaDOS Voice Speed

Since GLaDOS speaks rather slowly and deliberately in the game, you might want to speed it up for practical use:

### Current Speed Setting
Your current `.env` has:
```bash
TTS_SPEED=2.5  # 2.5x faster
```

### Recommended for GLaDOS
Try starting with faster speed:
```bash
TTS_SPEED=3.0  # 3x faster for more natural conversation
```

Or even faster:
```bash
TTS_SPEED=3.5  # 3.5x faster if still too slow
```

Remember: Higher speed = faster speech = shorter `length_scale` in Piper

---

## Troubleshooting

### Voice sounds distorted
- Try reducing `TTS_SPEED` (use 2.0 or 2.5)
- High-quality models can be more sensitive to speed changes

### Voice is too slow
- Increase `TTS_SPEED` to 3.0 or higher
- High-quality models synthesize slower than medium models

### Model fails to load
- Verify both files exist:
  - `models/piper/en-us-glados-high.onnx`
  - `models/piper/en-us-glados-high.onnx.json`
- Check file permissions
- Verify path in `.env` is correct

### Out of memory errors
- This is a high-quality model (~100MB)
- If running on Raspberry Pi, you may need to use medium or low quality voices instead
- Consider switching to `en_US-ryan-high` or another standard voice

---

## Alternative Download Method

If the curl command doesn't work:

1. Go to: https://github.com/Nold360/piper-voice-glados/releases/tag/0.1
2. Download `voice-en-us-glados-high.tar.gz`
3. Extract manually
4. Move files to `models/piper/`

---

## Using with Home Assistant

If you're using Home Assistant, GLaDOS voice works great with the Piper add-on:

```yaml
# configuration.yaml
tts:
  - platform: piper
    voice: en-us-glados-high
```

---

## Credits

- **Voice Model:** Trained by [Nold360](https://github.com/Nold360)
- **Based on:** Portal/Portal 2 GLaDOS character by Valve
- **Piper TTS:** [rhasspy/piper](https://github.com/rhasspy/piper)

---

## Notes

- This is a community-created voice model
- Quality may vary from official Piper voices
- Voice was trained on GLaDOS audio from Portal games
- Check licensing if using commercially

---

## Summary

To use GLaDOS voice:

1. Download: `curl -L -o glados-voice.tar.gz https://github.com/Nold360/piper-voice-glados/releases/download/0.1/voice-en-us-glados-high.tar.gz`
2. Extract: `tar -xzf glados-voice.tar.gz`
3. Move files: `mv en-us-glados-high.onnx* models/piper/`
4. Update .env: `TTS_MODEL_PATH=models/piper/en-us-glados-high.onnx`
5. Adjust speed if needed: `TTS_SPEED=3.0`
6. Restart voice gateway

**Expected result:** Your Jarvis will now speak with GLaDOS's iconic voice!
