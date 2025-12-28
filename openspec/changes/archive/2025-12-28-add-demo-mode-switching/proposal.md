# Proposal: Add Demo Mode Switching

## Problem Statement

The voice gateway **already supports switching AI providers and TTS providers independently**, but this functionality is **poorly documented and untested** for demo purposes. Users need to easily switch between:

1. **Offline mode** - Ollama + Piper (no internet required)
2. **Online mode** - Anthropic + ElevenLabs (cloud-based)
3. **Hybrid modes** - Mix local and cloud (e.g., Ollama + ElevenLabs, Anthropic + Piper)

**For the CodeMash presentation (Jan 12, 2026)**, the demo needs clear, reliable switching between modes to showcase both local-first and cloud-enhanced capabilities.

### Current State

**What Already Works ✅**

The code ALREADY supports independent provider switching:

```javascript
// config.js lines 79-97
ai: {
    provider: useOllama ? 'ollama' : (process.env.AI_PROVIDER || 'anthropic'),
},
tts: {
    provider: process.env.TTS_PROVIDER || 'ElevenLabs',
    // ...
}
```

**Provider Implementations:**
- **AI Providers**: Anthropic (cloud), Ollama (local) - fully implemented in AIRouter.js
- **TTS Providers**: ElevenLabs (cloud), Piper (local) - fully implemented in streamingTTS.js

**What's Missing ❌**

1. **No TTS_PROVIDER documented in .env.example** (only ElevenLabs config shown)
2. **No Piper configuration section** in .env.example
3. **No demo presets** for quick mode switching
4. **No validation** that all 4 combinations actually work
5. **No documentation** of the 4 demo modes
6. **No health checks** for provider requirements (Piper needs Python + piper-tts, Ollama needs running server)

### Root Cause

When Piper TTS was added (piperTTS.js exists), the configuration examples and documentation were never updated. The provider switching logic works, but users don't know:
- How to enable Piper instead of ElevenLabs
- What the valid `TTS_PROVIDER` values are
- What dependencies each mode requires

## Proposed Solution

**Document and validate all 4 demo modes** with preset configurations, health checks, and clear instructions.

### The 4 Demo Modes

| Mode | AI Provider | TTS Provider | Dependencies | Use Case |
|------|-------------|--------------|--------------|----------|
| **Offline** | Ollama | Piper | Ollama running, Python + piper-tts | No internet, full privacy |
| **Online** | Anthropic | ElevenLabs | API keys | Best quality, cloud-based |
| **Hybrid A** | Ollama | ElevenLabs | Ollama + ElevenLabs API key | Local AI, cloud TTS |
| **Hybrid B** | Anthropic | Piper | Anthropic API key + Python + piper-tts | Cloud AI, local TTS |

### Key Design Principles

- **No code changes needed** - existing implementation already works
- **Configuration-driven** - use .env files for mode switching
- **Demo presets** - .env.offline, .env.online, .env.hybrid-a, .env.hybrid-b
- **Validate before demo** - health checks for each mode
- **Document clearly** - README section explaining all modes

## Implementation Overview

### 1. Update .env.example with Full Provider Documentation

**File:** `apps/voice-gateway-oww/.env.example`

Add missing sections:

```bash
# =============================================================================
# AI Provider Configuration
# =============================================================================
# Set AI_PROVIDER to 'anthropic' (cloud, best quality) or 'ollama' (local, offline)
# Default: anthropic
AI_PROVIDER=anthropic

# Alternative: Use --ollama CLI flag to override
# npm run dev --ollama

# Anthropic AI Configuration (Cloud)
# Get your API key from: https://console.anthropic.com/settings/keys
ANTHROPIC_API_KEY=your_anthropic_api_key_here
# Valid models: claude-haiku-4-5-20251001 (fast), claude-sonnet-4-5-20250929 (balanced)
ANTHROPIC_MODEL=claude-haiku-4-5-20251001

# Ollama AI Configuration (Local)
OLLAMA_BASE_URL=http://localhost:11434
# qwen2.5:0.5b - Fastest (1s), recommended for voice
OLLAMA_MODEL=qwen2.5:0.5b

# =============================================================================
# TTS Provider Configuration
# =============================================================================
# Set TTS_PROVIDER to 'ElevenLabs' (cloud, best quality) or 'Piper' (local, offline)
# Default: ElevenLabs
TTS_PROVIDER=ElevenLabs

TTS_ENABLED=true
TTS_VOLUME=1.0
TTS_SPEED=1.0

# ElevenLabs TTS Configuration (Cloud)
# Get your API key from: https://elevenlabs.io/app/settings/api-keys
ELEVENLABS_API_KEY=your_api_key_here
ELEVENLABS_VOICE_ID=JBFqnCBsd6RMkjVDRZzb  # George (deep male)
ELEVENLABS_MODEL_ID=eleven_multilingual_v2
ELEVENLABS_STABILITY=0.5
ELEVENLABS_SIMILARITY_BOOST=0.75
ELEVENLABS_STYLE=0.0

# Piper TTS Configuration (Local)
# Requires: Python 3 + piper-tts (pip install piper-tts)
# Model path (relative to voice-gateway-oww directory)
TTS_MODEL_PATH=models/piper/en_US-amy-medium.onnx
```

### 2. Create Demo Preset Files

**Files to Create:**

1. `apps/voice-gateway-oww/.env.offline` - Ollama + Piper
2. `apps/voice-gateway-oww/.env.online` - Anthropic + ElevenLabs
3. `apps/voice-gateway-oww/.env.hybrid-a` - Ollama + ElevenLabs
4. `apps/voice-gateway-oww/.env.hybrid-b` - Anthropic + Piper

**Example: .env.offline**
```bash
# Offline Demo Mode - No Internet Required
# AI: Ollama (local), TTS: Piper (local)

AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:0.5b

TTS_PROVIDER=Piper
TTS_MODEL_PATH=models/piper/en_US-amy-medium.onnx
TTS_ENABLED=true
TTS_VOLUME=1.0
TTS_SPEED=1.0

# (Include all other required env vars from .env.example)
OWW_MODEL_PATH=jarvis
MQTT_BROKER_URL=mqtt://localhost:1883
# ...
```

### 3. Add Mode Switching Script

**File:** `apps/voice-gateway-oww/switch-mode.sh` (new)

```bash
#!/bin/bash
# Switch demo mode by copying preset to .env.tmp

MODE=$1

if [ -z "$MODE" ]; then
    echo "Usage: ./switch-mode.sh [offline|online|hybrid-a|hybrid-b]"
    exit 1
fi

if [ ! -f ".env.$MODE" ]; then
    echo "Error: .env.$MODE not found"
    exit 1
fi

cp ".env.$MODE" ".env.tmp"
echo "✅ Switched to $MODE mode"
echo "Restart the service for changes to take effect"
```

### 4. Add Provider Health Checks

**File:** `apps/voice-gateway-oww/src/util/ProviderHealthCheck.js` (new)

```javascript
/**
 * Validate provider configurations before starting
 */
async function validateProviders(config, logger) {
    const results = {
        ai: { provider: config.ai.provider, healthy: false, error: null },
        tts: { provider: config.tts.provider, healthy: false, error: null }
    };

    // Check AI provider
    if (config.ai.provider === 'anthropic') {
        if (!config.anthropic.apiKey) {
            results.ai.error = 'ANTHROPIC_API_KEY not set';
        } else {
            results.ai.healthy = true;
        }
    } else if (config.ai.provider === 'ollama') {
        try {
            const response = await fetch(`${config.ollama.baseUrl}/api/tags`);
            if (response.ok) {
                results.ai.healthy = true;
            } else {
                results.ai.error = 'Ollama server not responding';
            }
        } catch (err) {
            results.ai.error = `Ollama server unreachable: ${err.message}`;
        }
    }

    // Check TTS provider
    if (config.tts.provider === 'ElevenLabs') {
        if (!config.elevenlabs.apiKey) {
            results.tts.error = 'ELEVENLABS_API_KEY not set';
        } else {
            results.tts.healthy = true;
        }
    } else if (config.tts.provider === 'Piper') {
        const { checkPiperHealth } = await import('../piperTTS.js');
        results.tts.healthy = await checkPiperHealth();
        if (!results.tts.healthy) {
            results.tts.error = 'Piper TTS not available (check Python + piper-tts)';
        }
    }

    return results;
}
```

### 5. Update README with Demo Modes Section

**File:** `apps/voice-gateway-oww/README.md`

Add section:

```markdown
## Demo Modes

The voice gateway supports 4 demo modes for different use cases:

### 🔌 Offline Mode (Ollama + Piper)
- **AI**: Ollama (local)
- **TTS**: Piper (local)
- **Dependencies**: Ollama running, Python + piper-tts
- **Setup**: `./switch-mode.sh offline && npm run dev`

### ☁️ Online Mode (Anthropic + ElevenLabs)
- **AI**: Anthropic Claude (cloud)
- **TTS**: ElevenLabs (cloud)
- **Dependencies**: ANTHROPIC_API_KEY, ELEVENLABS_API_KEY
- **Setup**: `./switch-mode.sh online && npm run dev`

### 🔄 Hybrid Mode A (Ollama + ElevenLabs)
- **AI**: Ollama (local)
- **TTS**: ElevenLabs (cloud)
- **Use case**: Local AI privacy, cloud TTS quality
- **Setup**: `./switch-mode.sh hybrid-a && npm run dev`

### 🔄 Hybrid Mode B (Anthropic + Piper)
- **AI**: Anthropic Claude (cloud)
- **TTS**: Piper (local)
- **Use case**: Cloud AI quality, local TTS privacy
- **Setup**: `./switch-mode.sh hybrid-b && npm run dev`

### Quick Switch
```bash
# Copy preset to .env.tmp and restart
./switch-mode.sh offline
npm run dev
```
```

## Impact Assessment

### Files Modified
- `apps/voice-gateway-oww/.env.example` - Add TTS_PROVIDER and Piper config
- `apps/voice-gateway-oww/README.md` - Add Demo Modes section
- `apps/voice-gateway-oww/src/main.js` - Add provider health check on startup (optional)
- `docs/TECH-STACK.md` - Document all 4 demo modes

### Files Created
- `apps/voice-gateway-oww/.env.offline` - Offline mode preset
- `apps/voice-gateway-oww/.env.online` - Online mode preset
- `apps/voice-gateway-oww/.env.hybrid-a` - Hybrid A preset
- `apps/voice-gateway-oww/.env.hybrid-b` - Hybrid B preset
- `apps/voice-gateway-oww/switch-mode.sh` - Mode switching script
- `apps/voice-gateway-oww/src/util/ProviderHealthCheck.js` - Health validation (optional)

### Breaking Changes
None. This is purely additive (documentation + presets).

### Performance Impact
None. No code changes to runtime logic.

## Success Criteria

✅ All 4 demo modes documented in .env.example with clear provider options
✅ 4 preset .env files created and tested (offline, online, hybrid-a, hybrid-b)
✅ Mode switching script works (./switch-mode.sh)
✅ README explains all 4 modes with setup instructions
✅ Health checks validate provider requirements before starting
✅ All 4 modes tested and working:
  - Offline: Ollama + Piper works without internet
  - Online: Anthropic + ElevenLabs works with API keys
  - Hybrid A: Ollama + ElevenLabs works
  - Hybrid B: Anthropic + Piper works

## Notes

**Why 4 modes instead of just offline/online?**
The hybrid modes demonstrate flexibility and show that AI and TTS can be independently configured. This is valuable for users with different privacy/cost requirements.

**Why presets instead of CLI flags?**
Presets are easier for demos - just switch file and restart. CLI flags would require remembering multiple arguments.

**Should we add runtime mode switching?**
No - that adds unnecessary complexity. Restarting the service after switching .env is simple and reliable.

**Piper model location?**
Already downloaded to `apps/voice-gateway-oww/models/piper/en_US-amy-medium.onnx` (63MB). Just needs Python + piper-tts installed.
