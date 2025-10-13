#!/bin/bash
# Download Piper voice model directly (workaround for SSL issues)

set -e

echo "🔊 Downloading Piper voice model..."
echo ""

# Create directories
mkdir -p models/piper
mkdir -p ~/.local/share/piper_tts

# Voice model URLs (from Piper's Hugging Face repository)
MODEL_BASE_URL="https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium"
MODEL_FILE="en_US-amy-medium.onnx"
CONFIG_FILE="en_US-amy-medium.onnx.json"

echo "📥 Downloading $MODEL_FILE..."
curl -L --progress-bar \
  "${MODEL_BASE_URL}/${MODEL_FILE}" \
  -o "models/piper/${MODEL_FILE}"

echo "📥 Downloading $CONFIG_FILE..."
curl -L --progress-bar \
  "${MODEL_BASE_URL}/${CONFIG_FILE}" \
  -o "models/piper/${CONFIG_FILE}"

# Also copy to the standard piper location for compatibility
cp "models/piper/${MODEL_FILE}" ~/.local/share/piper_tts/
cp "models/piper/${CONFIG_FILE}" ~/.local/share/piper_tts/

echo ""
echo "✅ Voice model downloaded successfully!"
echo ""
echo "Files saved to:"
echo "  - models/piper/${MODEL_FILE}"
echo "  - models/piper/${CONFIG_FILE}"
echo ""
echo "You can now run: npm run dev"
