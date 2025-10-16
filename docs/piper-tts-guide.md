# Piper TTS Guide

## Overview

**Piper** is a fast, local neural text-to-speech (TTS) engine that runs entirely offline. It uses ONNX neural network models to generate natural-sounding speech without requiring any cloud services.

- **Repository:** https://github.com/OHF-Voice/piper1-gpl (actively maintained by Open Home Foundation)
- **Original Repository:** https://github.com/rhasspy/piper (archived, development moved)
- **License:** GPL
- **Technology:** Neural TTS using ONNX Runtime + espeak-ng for phonemization

## Key Features

- ✅ **100% Local** - No internet required after initial setup
- ✅ **Fast** - Optimized for real-time synthesis
- ✅ **Multi-language** - Supports 40+ languages
- ✅ **Quality Options** - Low, medium, and high quality voices
- ✅ **GPU Acceleration** - Optional CUDA support
- ✅ **Open Source** - GPL licensed, free to use and modify

---

## Installation

### Python Package (Recommended)

```bash
pip install piper-tts
```

### Our Project Setup

In our voice gateway, we use Piper via Python API:

```python
from piper import PiperVoice
from piper.config import SynthesisConfig

# Load voice model
voice = PiperVoice.load("/path/to/en_US-amy-medium.onnx")

# Configure synthesis parameters
syn_config = SynthesisConfig(
    volume=1.0,
    length_scale=0.5,  # 2x faster (inverse of speed)
    noise_scale=0.667,
    noise_w_scale=0.8,
    normalize_audio=True
)

# Synthesize speech
with wave.open("output.wav", "wb") as wav_file:
    voice.synthesize_wav("Hello, world!", wav_file, syn_config=syn_config)
```

---

## Adjusting Speech Speed

### Understanding length_scale

Piper uses `length_scale` to control speech speed:

- **length_scale = 1.0** → Normal speed
- **length_scale < 1.0** → Faster speech
- **length_scale > 1.0** → Slower speech

**Formula:** `length_scale = 1.0 / desired_speed_multiplier`

### Speed Examples

| Desired Speed | length_scale | Calculation |
|--------------|--------------|-------------|
| 2x faster    | 0.5          | 1.0 / 2.0   |
| 1.5x faster  | 0.667        | 1.0 / 1.5   |
| Normal       | 1.0          | 1.0 / 1.0   |
| 1.5x slower  | 1.5          | 1.0 / 0.667 |
| 2x slower    | 2.0          | 1.0 / 0.5   |

### In Our Code

**File:** `apps/voice-gateway-oww/src/piper-tts.js:58`

```python
syn_config = SynthesisConfig(
    volume=${volume},
    length_scale=${1.0 / speed},  # Piper uses length_scale (inverse of speed)
    noise_scale=0.667,
    noise_w_scale=0.8,
    normalize_audio=True
)
```

**Environment Variable:** `TTS_SPEED=2.0` (in `.env`)

This translates to `length_scale=0.5`, making speech 2x faster.

---

## Available Voices

### Current Voice

**Voice:** `en_US-amy-medium`
- **Quality:** Medium (22,050 Hz)
- **Gender:** Female
- **Accent:** American English

### Alternative Voices

Download voices with:

```bash
python3 -m piper.download_voices en_US-lessac-medium
```

Popular English voices:

| Voice | Gender | Quality | Accent | Notes |
|-------|--------|---------|--------|-------|
| en_US-lessac-medium | Female | Medium | American | Clear, professional |
| en_US-ryan-high | Male | High | American | Natural, high quality |
| en_US-amy-medium | Female | Medium | American | Simple, clear voice |
| en_GB-alba-medium | Female | Medium | British | British accent |
| en_US-libritts-high | Mixed | High | American | Multi-speaker |

**Browse all voices:** https://rhasspy.github.io/piper-samples/

### Changing Voices

1. Download the voice:
   ```bash
   python3 -m piper.download_voices en_US-ryan-high
   ```

2. Update `.env`:
   ```bash
   TTS_MODEL_PATH=models/piper/en_US-ryan-high.onnx
   ```

3. Restart the voice gateway

---

## Training a Custom Voice

Training a custom Piper voice allows you to create a unique voice model from your own recordings.

### Requirements

**Hardware:**
- **Minimum:** 8GB GPU VRAM (e.g., RTX 3060, RX 7600)
- **Recommended:** 24GB+ GPU VRAM (e.g., RTX 3090, RTX 4090, A6000)
- **CPU:** Modern multi-core processor
- **RAM:** 16GB+ system RAM
- **Storage:** 50GB+ for training data and models

**Software:**
- Linux (Ubuntu 20.04+ recommended)
- Python 3.8+
- CUDA 11+ (for GPU acceleration)
- PyTorch with CUDA support

### Training Process Overview

```
1. Record Audio Dataset (1-10 hours of speech)
   ↓
2. Prepare Dataset (metadata.csv + audio files)
   ↓
3. Fine-tune from Existing Checkpoint (recommended)
   ↓
4. Train Model (hours to days depending on dataset)
   ↓
5. Export to ONNX format
   ↓
6. Test and Deploy
```

### Step 1: Recording Audio Dataset

**Recommended Dataset Size:**
- **Minimum:** 1 hour of clean audio
- **Good:** 3-5 hours of audio
- **Professional:** 10+ hours of audio

**Recording Guidelines:**
- **Environment:** Quiet room with minimal echo
- **Microphone:** USB condenser microphone or better
- **Format:** WAV, 22,050 Hz sample rate, mono
- **Voice:** Consistent tone, pace, and emotion
- **Length:** Sentences 3-15 seconds each

**Tools:**
- **Piper Recording Studio:** https://github.com/rhasspy/piper-recording-studio
  - Web-based interface for recording TTS datasets
  - Presents sentences to read
  - Handles audio format automatically

```bash
# Install Piper Recording Studio
git clone https://github.com/rhasspy/piper-recording-studio.git
cd piper-recording-studio
pip install -r requirements.txt

# Run the recording studio
python3 -m piper_recording_studio --data-dir recordings/
```

### Step 2: Prepare Dataset

Create a CSV file (`metadata.csv`) with format:

```csv
audio001.wav|This is the first sentence.
audio002.wav|This is the second sentence.
audio003.wav|And so on with more sentences.
```

**Format:**
- **Delimiter:** `|` (pipe character)
- **Column 1:** Audio filename (must exist in audio directory)
- **Column 2:** Exact text that was spoken

**Directory Structure:**
```
dataset/
├── metadata.csv
└── wav/
    ├── audio001.wav
    ├── audio002.wav
    └── audio003.wav
```

### Step 3: Install Training Dependencies

```bash
# Clone the repository
git clone https://github.com/OHF-Voice/piper1-gpl.git
cd piper1-gpl

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install training dependencies
python3 -m pip install -e .[train]

# Build required extension
./build_monotonic_align.sh

# Development build
python3 setup.py build_ext --inplace
```

### Step 4: Download Checkpoint (Highly Recommended)

Fine-tuning from an existing checkpoint dramatically speeds up training:

```bash
# Download a medium quality checkpoint
wget https://huggingface.co/datasets/rhasspy/piper-checkpoints/resolve/main/en/en_US/lessac/medium/epoch=2164-step=1355540.ckpt
```

**Available checkpoints:** https://huggingface.co/datasets/rhasspy/piper-checkpoints/tree/main

### Step 5: Train the Model

```bash
python3 -m piper.train fit \
  --data.voice_name "my_custom_voice" \
  --data.csv_path /path/to/dataset/metadata.csv \
  --data.audio_dir /path/to/dataset/wav/ \
  --model.sample_rate 22050 \
  --data.espeak_voice "en-us" \
  --data.cache_dir /path/to/cache/ \
  --data.config_path /path/to/output/config.json \
  --data.batch_size 32 \
  --ckpt_path /path/to/checkpoint.ckpt
```

**Key Parameters:**
- `data.voice_name`: Name for your voice (can be anything)
- `data.csv_path`: Path to metadata CSV file
- `data.audio_dir`: Directory containing audio files
- `model.sample_rate`: Audio sample rate (usually 22050)
- `data.espeak_voice`: Language/voice for phonemization (`espeak-ng --voices` to list)
- `data.cache_dir`: Directory for training artifacts
- `data.config_path`: Where to write voice config JSON
- `data.batch_size`: Training batch size (adjust based on GPU VRAM)
- `ckpt_path`: Existing checkpoint to fine-tune from (recommended)

**Training Time:**
- **With checkpoint (fine-tuning):** 1,000-2,000 epochs (hours to 1-2 days)
- **From scratch:** 5,000+ epochs (several days)

**Monitoring Training:**

```bash
# Run tensorboard to monitor progress
tensorboard --logdir /path/to/cache/lightning_logs
```

Open browser to `http://localhost:6006` and watch:
- `loss_disc_all` - Discriminator loss
- `loss_gen_all` - Generator loss

Training is usually complete when `loss_disc_all` levels off.

### Step 6: Export to ONNX

```bash
python3 -m piper.train.export_onnx \
  --checkpoint /path/to/cache/lightning_logs/version_0/checkpoints/epoch=1999-step=XXX.ckpt \
  --output-file my_custom_voice.onnx
```

**Create final voice files:**

```bash
# Copy the config
cp /path/to/output/config.json my_custom_voice.onnx.json

# Final files needed:
# - my_custom_voice.onnx (model)
# - my_custom_voice.onnx.json (config)
```

### Step 7: Test Your Voice

```bash
echo "This is a test of my custom voice." | \
  python3 -m piper -m my_custom_voice.onnx -f test.wav
```

Play the audio to verify quality:

```bash
ffplay test.wav
```

---

## Advanced Training Options

### Training Quality Levels

Piper supports three quality levels:

| Quality | Sample Rate | Model Size | Training Time | Quality |
|---------|-------------|------------|---------------|---------|
| Low     | 16,000 Hz   | Small      | Fast          | Good    |
| Medium  | 22,050 Hz   | Medium     | Moderate      | Better  |
| High    | 22,050 Hz   | Large      | Slow          | Best    |

**Use high quality:**
```bash
python3 -m piper.train fit --quality high ...
```

### Multi-Speaker Models

If your dataset has multiple speakers:

1. Add speaker column to CSV:
   ```csv
   audio001.wav|speaker1|First sentence.
   audio002.wav|speaker2|Second sentence.
   ```

2. Train with speaker support:
   ```bash
   python3 -m piper.train fit \
     --data.multi_speaker true \
     ...
   ```

### GPU Acceleration

```bash
# Install CUDA-enabled ONNX Runtime
pip install onnxruntime-gpu

# Use CUDA during training (automatic if available)
python3 -m piper.train fit --trainer.accelerator gpu ...
```

---

## Tips for Good Voice Quality

### Recording Best Practices

1. **Consistent Environment**
   - Same room, microphone, and distance for all recordings
   - Minimize background noise and echo
   - Avoid air conditioning, fans, or traffic noise

2. **Consistent Performance**
   - Maintain consistent tone and energy throughout
   - Avoid vocal fry, mumbling, or excessive emotion
   - Take breaks to prevent vocal fatigue

3. **Clear Pronunciation**
   - Enunciate clearly without over-emphasizing
   - Maintain natural speech pace
   - Avoid stuttering, filler words ("um", "uh")

### Dataset Preparation

1. **Text Variety**
   - Include diverse sentence structures
   - Cover common words and phonemes
   - Mix questions, statements, and exclamations

2. **Audio Quality**
   - Remove silence at beginning and end
   - Normalize volume levels
   - Check for clipping or distortion

3. **Metadata Accuracy**
   - Ensure text matches audio exactly
   - Include punctuation
   - Use consistent formatting

### Training Parameters

1. **Batch Size**
   - Start with 32 for 24GB VRAM
   - Reduce to 16 or 8 for less VRAM
   - Larger batches = faster training but more memory

2. **Checkpoint Selection**
   - Use same language if possible
   - Medium quality checkpoints work for all quality levels
   - Fine-tuning is 10x faster than training from scratch

3. **Training Duration**
   - Fine-tuning: 1,000-2,000 epochs usually sufficient
   - From scratch: 5,000+ epochs needed
   - Stop when loss plateaus for ~200 epochs

---

## Troubleshooting

### Voice Sounds Robotic

**Solutions:**
- Train for more epochs
- Increase dataset size (need 3+ hours)
- Use higher quality setting
- Check audio quality in dataset

### Training is Too Slow

**Solutions:**
- Use GPU acceleration (`--trainer.accelerator gpu`)
- Fine-tune from checkpoint instead of training from scratch
- Reduce batch size if running out of memory
- Use medium quality instead of high

### Out of Memory Errors

**Solutions:**
- Reduce batch size: `--data.batch_size 16` or `--data.batch_size 8`
- Use medium or low quality instead of high
- Close other applications
- Use `--max-phoneme-ids 400` to drop long sentences

### Voice Sounds Wrong

**Solutions:**
- Verify metadata.csv text matches audio exactly
- Check audio sample rate matches training configuration
- Ensure consistent recording environment
- Remove problematic recordings from dataset

---

## Resources

### Official Documentation

- **Main Repository:** https://github.com/OHF-Voice/piper1-gpl
- **Training Guide:** https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/TRAINING.md
- **Voice Samples:** https://rhasspy.github.io/piper-samples/
- **Available Checkpoints:** https://huggingface.co/datasets/rhasspy/piper-checkpoints

### Community Resources

- **Video Tutorial by Thorsten Müller:** https://www.youtube.com/watch?v=b_we_jma220
- **Windows/WSL Guide:** https://ssamjh.nz/create-custom-piper-tts-voice/
- **Recording Studio:** https://github.com/rhasspy/piper-recording-studio
- **Home Assistant Integration:** https://github.com/home-assistant/addons/blob/master/piper/README.md

### Related Projects

- **espeak-ng:** https://github.com/espeak-ng/espeak-ng (phonemizer)
- **ONNX Runtime:** https://onnxruntime.ai/ (inference engine)
- **PyTorch Lightning:** https://lightning.ai/ (training framework)

---

## Summary

### For Our Project

**Current Setup:**
- Voice: `en_US-amy-medium` (22,050 Hz)
- Speed: `TTS_SPEED=2.0` (2x faster via `length_scale=0.5`)
- Implementation: Python API via `piper-tts` package

**To Change Speed:**
- Edit `.env`: `TTS_SPEED=2.0` (or higher/lower)
- Restart voice gateway
- Speed is applied via `length_scale = 1.0 / TTS_SPEED`

**To Change Voice:**
- Download new voice: `python3 -m piper.download_voices <voice_name>`
- Update `.env`: `TTS_MODEL_PATH=models/piper/<voice_name>.onnx`
- Restart voice gateway

### For Training Custom Voice

**Minimum Requirements:**
- 1+ hours of clean audio recordings
- 8GB+ GPU VRAM
- Linux system with CUDA
- 1-2 days of training time (with checkpoint)

**Recommended Approach:**
1. Record audio with Piper Recording Studio
2. Prepare dataset (metadata.csv + WAV files)
3. Fine-tune from existing medium-quality checkpoint
4. Train for 1,000-2,000 epochs
5. Export to ONNX and test
6. Deploy to voice gateway

**Expected Results:**
- With 3+ hours of audio: Natural-sounding voice
- With fine-tuning: Much faster than training from scratch
- With high-quality recordings: Professional results
