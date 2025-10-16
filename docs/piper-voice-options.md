# Piper TTS Voice Options for English (en_US)

## Listen to Samples

**Official Samples Page:** https://rhasspy.github.io/piper-samples/

Click on any voice to hear samples before downloading.

## Download Location

All voices are available at: https://huggingface.co/rhasspy/piper-voices/tree/main/en/en_US

---

## Popular English (en_US) Voices

### 1. **lessac** (Female, Professional)
- **Quality Levels:** low, medium, high
- **Description:** Clear, professional female voice. Great for general use.
- **Recommended:** `en_US-lessac-medium`
- **Download:**
  ```bash
  python3 -m piper.download_voices en_US-lessac-medium
  ```

### 2. **ryan** (Male, Natural)
- **Quality Levels:** low, medium, high
- **Description:** Natural-sounding male voice. Very popular choice.
- **Recommended:** `en_US-ryan-high`
- **Download:**
  ```bash
  python3 -m piper.download_voices en_US-ryan-high
  ```

### 3. **amy** (Female)
- **Quality Levels:** low, medium
- **Description:** Simple, clear female voice
- **Note:** `en_US-amy-medium`

### 4. **joe** (Male, Deep)
- **Quality Levels:** medium
- **Description:** Deeper male voice
- **Download:**
  ```bash
  python3 -m piper.download_voices en_US-joe-medium
  ```

### 5. **kristin** (Female, Expressive)
- **Quality Levels:** medium
- **Description:** More expressive female voice
- **Download:**
  ```bash
  python3 -m piper.download_voices en_US-kristin-medium
  ```

### 6. **danny** (Male, Casual)
- **Quality Levels:** low
- **Description:** Casual-sounding male voice
- **Download:**
  ```bash
  python3 -m piper.download_voices en_US-danny-low
  ```

### 7. **kathleen** (Female, Clear)
- **Quality Levels:** low
- **Description:** Clear female voice
- **Download:**
  ```bash
  python3 -m piper.download_voices en_US-kathleen-low
  ```

### 8. **libritts** (Multi-speaker, High Quality)
- **Quality Levels:** high
- **Description:** Multi-speaker model trained on LibriTTS dataset
- **Note:** Requires speaker selection in config
- **Download:**
  ```bash
  python3 -m piper.download_voices en_US-libritts-high
  ```

### 9. **ljspeech** (Female, Research Standard)
- **Quality Levels:** high, medium, low
- **Description:** Standard voice from LJ Speech dataset
- **Download:**
  ```bash
  python3 -m piper.download_voices en_US-ljspeech-high
  ```

### 10. **norman** (Male, British-influenced)
- **Quality Levels:** medium
- **Description:** Male voice with slight British influence
- **Download:**
  ```bash
  python3 -m piper.download_voices en_US-norman-medium
  ```

---

## British English (en_GB) Voices

If you want a British accent:

### **alba** (Female, British)
- **Quality Levels:** medium
- **Description:** Clear British female voice
- **Download:**
  ```bash
  python3 -m piper.download_voices en_GB-alba-medium
  ```

### **alan** (Male, British)
- **Quality Levels:** low, medium
- **Description:** British male voice
- **Download:**
  ```bash
  python3 -m piper.download_voices en_GB-alan-medium
  ```

---

## Quality Level Differences

| Quality | Sample Rate | Model Size | Speed | Sound Quality |
|---------|-------------|------------|-------|---------------|
| **low** | 16,000 Hz | ~3-5 MB | Fastest | Good |
| **medium** | 22,050 Hz | ~6-10 MB | Moderate | Better |
| **high** | 22,050 Hz | ~20-30 MB | Slower | Best |

**Recommendation:** Use **medium** quality for the best balance of speed and quality on Raspberry Pi.

---

## How to Download and Use a New Voice

### Step 1: Download the Voice

```bash
cd /Users/jrg/code/CodeMash/mqtt-ollama-presentation/apps/voice-gateway-oww

# Download voice (example: ryan high quality)
python3 -m piper.download_voices en_US-ryan-high
```

This will download two files to your current directory:
- `en_US-ryan-high.onnx` (model)
- `en_US-ryan-high.onnx.json` (config)

### Step 2: Move Files to Models Directory

```bash
# Create piper models directory if it doesn't exist
mkdir -p models/piper

# Move the voice files
mv en_US-ryan-high.onnx models/piper/
mv en_US-ryan-high.onnx.json models/piper/
```

### Step 3: Update .env Configuration

Edit `apps/voice-gateway-oww/.env`:

```bash
# Change this line:
TTS_MODEL_PATH=models/piper/en_US-amy-medium.onnx

# To your new voice:
TTS_MODEL_PATH=models/piper/en_US-ryan-high.onnx
```

### Step 4: Restart Voice Gateway

```bash
# Kill the current process (Ctrl+C)
# Then restart
npm start
```

---

## Recommended Voices for "Jarvis"

For a Jarvis-like voice assistant, consider these options:

### Best Male Voices:
1. **ryan-high** - Natural, authoritative male voice
2. **joe-medium** - Deeper, more commanding
3. **danny-low** - Casual, friendly (fastest option)

### Best Female Voices:
1. **lessac-medium** - Professional, clear
2. **kristin-medium** - More expressive
3. **amy-medium** - Simple, clear

### British Accent (for classic Jarvis feel):
1. **en_GB-alan-medium** - British male voice

---

## Testing Voices Quickly

You can test a voice without changing your .env:

```bash
# Test a voice with a sample sentence
echo "Hello, I am Jarvis. How can I help you today?" | \
  python3 -m piper \
  --model models/piper/en_US-ryan-high.onnx \
  --output-file test.wav

# Play the audio (macOS)
afplay test.wav

# Or on Linux
aplay test.wav
```

---

## Download Multiple Voices

Download several voices at once to compare:

```bash
cd apps/voice-gateway-oww

# Download multiple voices
python3 -m piper.download_voices en_US-ryan-high
python3 -m piper.download_voices en_US-joe-medium
python3 -m piper.download_voices en_US-lessac-medium
python3 -m piper.download_voices en_GB-alan-medium

# Move them all to models directory
mv en_US-*.onnx* models/piper/
mv en_GB-*.onnx* models/piper/
```

Then you can easily switch between them by editing the `.env` file.

---

## Current Configuration

Your current setup:
- **Voice:** `en_US-amy-medium` (female, medium quality)
- **Speed:** `2.5` (2.5x faster)
- **Volume:** `1.0` (100%)

---

## Troubleshooting

### Voice sounds distorted
- Try a different quality level (high > medium > low)
- Reduce TTS_SPEED (currently 2.5, try 2.0 or 1.5)

### Download fails with SSL error
- Use direct download from HuggingFace:
  ```bash
  wget https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/ryan/high/en_US-ryan-high.onnx
  wget https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/ryan/high/en_US-ryan-high.onnx.json
  ```

### Voice doesn't load
- Verify both files exist (.onnx and .onnx.json)
- Check file paths in .env are correct
- Check logs for error messages

---

## Resources

- **Voice Samples:** https://rhasspy.github.io/piper-samples/
- **Voice Downloads:** https://huggingface.co/rhasspy/piper-voices
- **Piper Documentation:** https://github.com/OHF-Voice/piper1-gpl
