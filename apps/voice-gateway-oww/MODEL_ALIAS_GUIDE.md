# Wake Word Model Alias System

## Overview

The configuration system now supports **short aliases** for wake word models instead of requiring full file paths.

## Usage

### Short Aliases (Recommended)

```bash
# In your .env file:
OWW_MODEL_PATH=jarvis    # Instead of models/hey_jarvis_v0.1.onnx
OWW_MODEL_PATH=robot     # Instead of models/hello_robot.onnx
```

### Full Paths (Still Supported)

```bash
# For custom models:
OWW_MODEL_PATH=models/my_custom_wake_word.onnx
OWW_MODEL_PATH=/absolute/path/to/model.onnx
```

## Available Aliases

| Alias | File | Path | Embedding Frames | Description |
|-------|------|------|-----------------|-------------|
| `jarvis` | `hey_jarvis_v0.1.onnx` | `models/hey_jarvis_v0.1.onnx` | 16 | Hey Jarvis wake word |
| `robot` | `hello_robot.onnx` | `models/hello_robot.onnx` | 28 | Hello Robot wake word |

## Benefits

1. **Shorter configuration**: Use `jarvis` instead of `models/hey_jarvis_v0.1.onnx`
2. **Automatic frame detection**: Aliases automatically set the correct embedding frames
3. **Case-insensitive**: `jarvis`, `Jarvis`, and `JARVIS` all work
4. **Backward compatible**: Full paths still work for custom models

## How It Works

When you set `OWW_MODEL_PATH=jarvis`:

1. Config system checks if "jarvis" is a known alias → **YES**
2. Resolves to full path: `models/hey_jarvis_v0.1.onnx`
3. Sets embedding frames: `16`
4. Logs: `✅ Resolved model alias 'jarvis' → models/hey_jarvis_v0.1.onnx`

When you set `OWW_MODEL_PATH=models/custom.onnx`:

1. Config system checks if it's an alias → **NO**
2. Uses the path as-is: `models/custom.onnx`
3. Tries to recognize the filename in the registry
4. Falls back to default embedding frames: `16`
5. Logs: `⚠️ Unknown wake word model: models/custom.onnx`

## Adding New Models

Edit `apps/voice-gateway-oww/src/config.js`:

```javascript
const MODEL_CONFIGS = {
    'jarvis': {
        filename: 'hey_jarvis_v0.1.onnx',
        path: 'models/hey_jarvis_v0.1.onnx',
        embeddingFrames: 16,
        description: 'Hey Jarvis wake word',
    },
    'robot': {
        filename: 'hello_robot.onnx',
        path: 'models/hello_robot.onnx',
        embeddingFrames: 28,
        description: 'Hello Robot wake word',
    },
    // Add your new model:
    'mycroft': {
        filename: 'hey_mycroft.onnx',
        path: 'models/hey_mycroft.onnx',
        embeddingFrames: 16,
        description: 'Hey Mycroft wake word',
    },
};
```

Then use it:
```bash
OWW_MODEL_PATH=mycroft
```

## Examples

### Switching Between Models

```bash
# Use Hey Jarvis (fast, 16 frames)
OWW_MODEL_PATH=jarvis

# Use Hello Robot (custom trained, 28 frames)
OWW_MODEL_PATH=robot
```

### Using Custom Model with Full Path

```bash
# Custom model not in registry
OWW_MODEL_PATH=models/hey_computer.onnx
```

### Override Embedding Frames (Advanced)

```bash
# Use alias but override frames (not recommended)
OWW_MODEL_PATH=jarvis
OWW_EMBEDDING_FRAMES=32
```

## Startup Logs

### With Alias:
```
✅ Resolved model alias 'jarvis' → models/hey_jarvis_v0.1.onnx
```

### With Recognized File:
```
✅ Recognized model file 'hey_jarvis_v0.1.onnx' (alias: jarvis)
```

### With Unknown Model:
```
⚠️  Unknown wake word model: models/custom.onnx
   Using default embedding frames: 16
   Available aliases: jarvis, robot
   Recognized filenames: hey_jarvis_v0.1.onnx, hello_robot.onnx
```

## Migration Guide

### Before (Full Paths):
```bash
# .env
OWW_MODEL_PATH=models/hey_jarvis_v0.1.onnx
```

### After (Aliases):
```bash
# .env
OWW_MODEL_PATH=jarvis
```

Both work! The alias is just shorter and clearer.

## Notes

- Aliases are **case-insensitive**: `jarvis` = `Jarvis` = `JARVIS`
- The system checks aliases **first**, then treats input as a path
- If a filename matches a registered model, it will use that model's config even with a custom path
- The resolved full path is stored in `config.openWakeWord.modelPath` for use by the application
