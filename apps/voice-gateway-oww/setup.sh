#!/bin/bash
# Voice Gateway Setup Script
# Automates installation of dependencies and model downloads

set -e  # Exit on error

echo "🚀 Voice Gateway Setup Script"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

# Check if running on macOS or Linux
if [[ "$OSTYPE" == "darwin"* ]]; then
    PLATFORM="macos"
    print_info "Detected macOS"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    PLATFORM="linux"
    print_info "Detected Linux"
else
    print_error "Unsupported platform: $OSTYPE"
    exit 1
fi

# Step 1: Install Node.js dependencies
echo ""
print_info "Step 1: Installing Node.js dependencies..."
if npm install; then
    print_success "Node.js dependencies installed"
else
    print_error "Failed to install Node.js dependencies"
    exit 1
fi

# Step 2: Install Python dependencies
echo ""
print_info "Step 2: Installing Python dependencies (Piper TTS)..."

# Fix SSL certificates on macOS if needed
if [[ "$PLATFORM" == "macos" ]]; then
    print_info "Checking Python SSL certificates..."
    PYTHON_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
    CERT_COMMAND="/Library/Frameworks/Python.framework/Versions/${PYTHON_VERSION}/bin/Install Certificates.command"

    if [[ -f "$CERT_COMMAND" ]]; then
        print_info "Installing SSL certificates..."
        "$CERT_COMMAND" 2>/dev/null || true
        print_success "SSL certificates updated"
    else
        print_warning "SSL certificate installer not found, trying certifi upgrade..."
        pip3 install --upgrade certifi || true
    fi
fi

# Install piper-tts
if pip3 install piper-tts; then
    print_success "Piper TTS installed"
else
    print_error "Failed to install Piper TTS"
    exit 1
fi

# Step 3: Download Piper voice model
echo ""
print_info "Step 3: Downloading Piper voice model (en_US-amy-medium)..."
mkdir -p models/piper
mkdir -p "$HOME/.local/share/piper_tts"

# Check if already downloaded
if [[ -f "models/piper/en_US-amy-medium.onnx" ]]; then
    print_success "Voice model already exists"
else
    # Download directly from Hugging Face using curl (more reliable than Python urllib)
    MODEL_BASE_URL="https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium"
    MODEL_FILE="en_US-amy-medium.onnx"
    CONFIG_FILE="en_US-amy-medium.onnx.json"

    print_info "Downloading $MODEL_FILE (~63MB)..."
    if curl -L --progress-bar "${MODEL_BASE_URL}/${MODEL_FILE}" -o "models/piper/${MODEL_FILE}"; then
        print_info "Downloading $CONFIG_FILE..."
        if curl -L --progress-bar "${MODEL_BASE_URL}/${CONFIG_FILE}" -o "models/piper/${CONFIG_FILE}"; then
            # Copy to standard piper location for compatibility
            cp "models/piper/${MODEL_FILE}" "$HOME/.local/share/piper_tts/" 2>/dev/null || true
            cp "models/piper/${CONFIG_FILE}" "$HOME/.local/share/piper_tts/" 2>/dev/null || true
            print_success "Voice model downloaded"
        else
            print_error "Failed to download config file"
        fi
    else
        print_error "Failed to download voice model"
        print_warning "You can try running: ./download-voice.sh"
    fi
fi

# Step 4: Create .env file if it doesn't exist
echo ""
print_info "Step 4: Checking environment configuration..."
if [[ ! -f .env ]]; then
    print_info "Creating .env file from .env.example..."
    cp .env.example .env
    print_success ".env file created"
    print_warning "Please edit .env to configure your settings"
else
    print_success ".env file already exists"
fi

# Step 6: Check Ollama
echo ""
print_info "Step 6: Checking Ollama installation..."
if command -v ollama &> /dev/null; then
    print_success "Ollama is installed"

    # Check if Ollama is running
    if curl -s http://localhost:11434/api/version &> /dev/null; then
        print_success "Ollama is running"

        # Check if Qwen2.5:3b model is available
        if ollama list | grep -q "Qwen2.5:3b"; then
            print_success "Qwen2.5:3b model is available"
        else
            print_warning "Qwen2.5:3b model not found"
            print_info "Downloading Qwen2.5:3b model (this may take a while)..."
            if ollama pull Qwen2.5:3b; then
                print_success "Qwen2.5:3b model downloaded"
            else
                print_error "Failed to download Qwen2.5:3b model"
            fi
        fi
    else
        print_warning "Ollama is not running"
        print_info "Start it with: ollama serve"
    fi
else
    print_warning "Ollama is not installed"
    print_info "Install from: https://ollama.ai"
fi

# Summary
echo ""
echo "================================"
print_success "Setup Complete!"
echo ""
echo "Next steps:"
echo "  1. Edit .env to configure your settings (if needed)"
echo "  2. Make sure Ollama is running: ollama serve"
echo "  3. Start the voice gateway: npm run dev"
echo ""
echo "Models location:"
echo "  - OpenWakeWord: models/hey_jarvis_v0.1.onnx"
echo "  - Whisper STT: models/ggml-base.bin"
echo "  - Piper TTS: models/piper/en_US-amy-medium.onnx"
echo ""
print_info "For troubleshooting, see QUICKSTART.md"
