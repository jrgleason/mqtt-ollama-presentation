#!/bin/bash
# Demo Mode Switcher for Voice Gateway
# Switches between different AI/TTS provider configurations

set -e  # Exit on error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Available modes
MODES=(
    "offline:Fully Offline (Ollama AI + Piper TTS)"
    "online:Cloud Services (Anthropic AI + ElevenLabs TTS)"
    "hybrid-a:Hybrid A (Ollama AI + ElevenLabs TTS)"
    "hybrid-b:Hybrid B (Anthropic AI + Piper TTS)"
)

# Function to display usage
usage() {
    echo -e "${BLUE}Usage:${NC} $0 [mode]"
    echo ""
    echo -e "${BLUE}Available Modes:${NC}"
    for mode_desc in "${MODES[@]}"; do
        IFS=':' read -r mode desc <<< "$mode_desc"
        echo -e "  ${GREEN}$mode${NC} - $desc"
    done
    echo ""
    echo -e "${BLUE}Examples:${NC}"
    echo "  $0 offline       # Switch to fully offline mode"
    echo "  $0 online        # Switch to cloud services mode"
    echo "  $0 hybrid-a      # Switch to hybrid mode A"
    echo "  $0 hybrid-b      # Switch to hybrid mode B"
    echo ""
}

# Function to validate mode
validate_mode() {
    local mode=$1
    for mode_desc in "${MODES[@]}"; do
        IFS=':' read -r valid_mode desc <<< "$mode_desc"
        if [ "$mode" == "$valid_mode" ]; then
            return 0
        fi
    done
    return 1
}

# Function to get mode description
get_mode_description() {
    local mode=$1
    for mode_desc in "${MODES[@]}"; do
        IFS=':' read -r m desc <<< "$mode_desc"
        if [ "$mode" == "$m" ]; then
            echo "$desc"
            return
        fi
    done
}

# Main script logic
if [ $# -eq 0 ]; then
    echo -e "${RED}Error: No mode specified${NC}"
    echo ""
    usage
    exit 1
fi

MODE=$1

# Validate the mode
if ! validate_mode "$MODE"; then
    echo -e "${RED}Error: Invalid mode '$MODE'${NC}"
    echo ""
    usage
    exit 1
fi

# Get mode description
MODE_DESC=$(get_mode_description "$MODE")

# Check if preset file exists
PRESET_FILE=".env.$MODE"
if [ ! -f "$PRESET_FILE" ]; then
    echo -e "${RED}Error: Preset file '$PRESET_FILE' not found${NC}"
    exit 1
fi

# Display what we're doing
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Voice Gateway Demo Mode Switcher${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Switching to:${NC} ${GREEN}$MODE${NC}"
echo -e "${YELLOW}Description:${NC} $MODE_DESC"
echo ""

# Backup existing .env.tmp if it exists
if [ -f ".env.tmp" ]; then
    BACKUP_FILE=".env.tmp.backup.$(date +%Y%m%d_%H%M%S)"
    echo -e "${YELLOW}Backing up existing .env.tmp to:${NC} $BACKUP_FILE"
    cp .env.tmp "$BACKUP_FILE"
fi

# Copy preset to .env.tmp
echo -e "${YELLOW}Copying preset to .env.tmp...${NC}"
cp "$PRESET_FILE" .env.tmp

echo ""
echo -e "${GREEN}✓ Mode switched successfully!${NC}"
echo ""

# Display configuration summary
echo -e "${BLUE}Configuration Summary:${NC}"
AI_PROVIDER=$(grep "^AI_PROVIDER=" .env.tmp | cut -d'=' -f2)
TTS_PROVIDER=$(grep "^TTS_PROVIDER=" .env.tmp | cut -d'=' -f2)
echo -e "  AI Provider:  ${GREEN}$AI_PROVIDER${NC}"
echo -e "  TTS Provider: ${GREEN}$TTS_PROVIDER${NC}"
echo ""

# Check for required API keys
WARNINGS=0

if [ "$AI_PROVIDER" == "anthropic" ]; then
    ANTHROPIC_KEY=$(grep "^ANTHROPIC_API_KEY=" .env.tmp | cut -d'=' -f2)
    if [ "$ANTHROPIC_KEY" == "your_anthropic_api_key_here" ] || [ -z "$ANTHROPIC_KEY" ]; then
        echo -e "${YELLOW}⚠ Warning: ANTHROPIC_API_KEY not set in .env.tmp${NC}"
        echo -e "  Get your key from: https://console.anthropic.com/settings/keys"
        WARNINGS=1
    fi
fi

if [ "$TTS_PROVIDER" == "ElevenLabs" ]; then
    ELEVENLABS_KEY=$(grep "^ELEVENLABS_API_KEY=" .env.tmp | cut -d'=' -f2)
    if [ "$ELEVENLABS_KEY" == "your_api_key_here" ] || [ -z "$ELEVENLABS_KEY" ]; then
        echo -e "${YELLOW}⚠ Warning: ELEVENLABS_API_KEY not set in .env.tmp${NC}"
        echo -e "  Get your key from: https://elevenlabs.io/app/settings/api-keys"
        WARNINGS=1
    fi
fi

if [ "$AI_PROVIDER" == "ollama" ]; then
    OLLAMA_MODEL=$(grep "^OLLAMA_MODEL=" .env.tmp | cut -d'=' -f2)
    echo -e "${BLUE}Note:${NC} Make sure Ollama is running with model: ${GREEN}$OLLAMA_MODEL${NC}"
    echo -e "  Check with: ${YELLOW}ollama list${NC}"
    echo -e "  Pull model: ${YELLOW}ollama pull $OLLAMA_MODEL${NC}"
fi

if [ "$TTS_PROVIDER" == "Piper" ]; then
    TTS_MODEL_PATH=$(grep "^TTS_MODEL_PATH=" .env.tmp | cut -d'=' -f2)
    echo -e "${BLUE}Note:${NC} Make sure Piper TTS is installed and model exists at:"
    echo -e "  ${YELLOW}$TTS_MODEL_PATH${NC}"
    echo -e "  Install: ${YELLOW}pip3 install piper-tts${NC}"
fi

if [ $WARNINGS -eq 1 ]; then
    echo ""
    echo -e "${YELLOW}Please update .env.tmp with your API keys before running the service.${NC}"
fi

echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo -e "  1. Review and update .env.tmp with your API keys (if needed)"
echo -e "  2. Restart the voice gateway service: ${YELLOW}npm run dev${NC}"
echo ""
echo -e "${GREEN}Done!${NC}"
echo ""
