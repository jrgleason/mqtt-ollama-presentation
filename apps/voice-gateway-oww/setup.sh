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
print_info "Step 3: Downloading Piper voice models..."
mkdir -p models/piper
mkdir -p "$HOME/.local/share/piper_tts"

# Ask user which voice to download
echo ""
echo "Which voice would you like to use?"
echo "  1) en_US-amy-medium (Default - Female, 63MB)"
echo "  2) en-us-glados-high (GLaDOS from Portal - 100MB)"
echo "  3) Both voices"
echo ""
read -p "Enter choice [1-3] (default: 1): " VOICE_CHOICE
VOICE_CHOICE=${VOICE_CHOICE:-1}

download_amy_voice() {
    if [[ -f "models/piper/en_US-amy-medium.onnx" ]]; then
        print_success "Amy voice model already exists"
        return 0
    fi

    MODEL_BASE_URL="https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_US/amy/medium"
    MODEL_FILE="en_US-amy-medium.onnx"
    CONFIG_FILE="en_US-amy-medium.onnx.json"

    print_info "Downloading $MODEL_FILE (~63MB)..."
    if curl -L --progress-bar "${MODEL_BASE_URL}/${MODEL_FILE}" -o "models/piper/${MODEL_FILE}"; then
        print_info "Downloading $CONFIG_FILE..."
        if curl -L --progress-bar "${MODEL_BASE_URL}/${CONFIG_FILE}" -o "models/piper/${CONFIG_FILE}"; then
            cp "models/piper/${MODEL_FILE}" "$HOME/.local/share/piper_tts/" 2>/dev/null || true
            cp "models/piper/${CONFIG_FILE}" "$HOME/.local/share/piper_tts/" 2>/dev/null || true
            print_success "Amy voice model downloaded"
            return 0
        else
            print_error "Failed to download Amy config file"
            return 1
        fi
    else
        print_error "Failed to download Amy voice model"
        return 1
    fi
}

download_glados_voice() {
    if [[ -f "models/piper/en-us-glados-high.onnx" ]]; then
        print_success "GLaDOS voice model already exists"
        return 0
    fi

    print_info "Downloading GLaDOS voice model (~100MB)..."
    GLADOS_URL="https://github.com/Nold360/piper-voice-glados/releases/download/0.1/voice-en-us-glados-high.tar.gz"

    if curl -L --progress-bar "$GLADOS_URL" -o /tmp/glados-voice.tar.gz; then
        print_info "Extracting GLaDOS voice..."
        if tar -xzf /tmp/glados-voice.tar.gz -C models/piper/; then
            rm /tmp/glados-voice.tar.gz
            print_success "GLaDOS voice model downloaded"
            return 0
        else
            print_error "Failed to extract GLaDOS voice"
            rm /tmp/glados-voice.tar.gz
            return 1
        fi
    else
        print_error "Failed to download GLaDOS voice model"
        return 1
    fi
}

case $VOICE_CHOICE in
    1)
        download_amy_voice
        ;;
    2)
        download_glados_voice
        ;;
    3)
        download_amy_voice
        download_glados_voice
        ;;
    *)
        print_warning "Invalid choice, downloading default Amy voice"
        download_amy_voice
        ;;
esac

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

# Step 5: Download OpenWakeWord models
echo ""
print_info "Step 5: Downloading OpenWakeWord models..."

# OpenWakeWord base URL
OWW_BASE_URL="https://github.com/dscripka/openWakeWord/releases/download/v0.5.1"

# Core models (required)
OWW_CORE_MODELS=(
    "melspectrogram.onnx"
    "embedding_model.onnx"
)

# Wake word models
OWW_WAKE_WORD_MODELS=(
    "hey_jarvis_v0.1.onnx"
)

# Download core models
print_info "Downloading OpenWakeWord core models..."
for model in "${OWW_CORE_MODELS[@]}"; do
    if [[ -f "models/$model" ]]; then
        print_success "$model already exists"
    else
        print_info "Downloading $model..."
        if curl -L -o "models/$model" "$OWW_BASE_URL/$model" 2>/dev/null; then
            print_success "$model downloaded"
        else
            print_error "Failed to download $model"
            print_info "You can manually download from: $OWW_BASE_URL/$model"
        fi
    fi
done

# Download wake word models
print_info "Downloading wake word models..."
for model in "${OWW_WAKE_WORD_MODELS[@]}"; do
    if [[ -f "models/$model" ]]; then
        print_success "$model already exists"
    else
        print_info "Downloading $model..."
        if curl -L -o "models/$model" "$OWW_BASE_URL/$model" 2>/dev/null; then
            print_success "$model downloaded"
        else
            print_error "Failed to download $model"
            print_info "You can manually download from: $OWW_BASE_URL/$model"
        fi
    fi
done

# Step 6: Check Ollama
echo ""
print_info "Step 6: Checking Ollama installation..."
if command -v ollama &> /dev/null; then
    print_success "Ollama is installed"

    # Check if Ollama is running
    if curl -s http://localhost:11434/api/version &> /dev/null; then
        print_success "Ollama is running"

        # Read OLLAMA_MODEL from .env file (default to qwen2.5:0.5b)
        OLLAMA_MODEL="qwen2.5:0.5b"
        if [[ -f .env ]]; then
            # Extract OLLAMA_MODEL value from .env
            ENV_MODEL=$(grep "^OLLAMA_MODEL=" .env | cut -d'=' -f2 | tr -d '"' | tr -d "'" | xargs)
            if [[ -n "$ENV_MODEL" ]]; then
                OLLAMA_MODEL="$ENV_MODEL"
            fi
        fi

        print_info "Checking for model: $OLLAMA_MODEL"

        # Check if the model is available
        if ollama list | grep -q "$OLLAMA_MODEL"; then
            print_success "$OLLAMA_MODEL model is available"
        else
            print_warning "$OLLAMA_MODEL model not found"
            print_info "Downloading $OLLAMA_MODEL model (this may take a while)..."
            if ollama pull "$OLLAMA_MODEL"; then
                print_success "$OLLAMA_MODEL model downloaded"
            else
                print_error "Failed to download $OLLAMA_MODEL model"
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
