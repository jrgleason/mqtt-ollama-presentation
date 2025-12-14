# AI Provider Switching Guide

The Voice Gateway now supports **two AI providers**: **Anthropic (Claude)** and **Ollama (local)**.

## Quick Start

### Using Anthropic (Default)

```bash
# Set your API key in .env
ANTHROPIC_API_KEY=your_api_key_here

# Run with Anthropic (default)
npm run dev
```

### Using Ollama

```bash
# Use the --ollama flag
npm run dev --ollama

# Or use the convenience script
npm run dev:ollama
```

## Configuration

### Environment Variables

Add to your `.env` file:

```bash
# AI Provider Configuration
AI_PROVIDER=anthropic  # or 'ollama'

# Anthropic Configuration
ANTHROPIC_API_KEY=your_anthropic_api_key_here
ANTHROPIC_MODEL=claude-3-5-haiku-20241022  # Fast and cost-effective

# Ollama Configuration (if using --ollama flag)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:0.5b  # Fast for voice interactions
```

### Available Models

**Anthropic Models:**
- `claude-3-5-haiku-20241022` - ⚡ Fast, cost-effective (recommended for voice)
- `claude-3-5-sonnet-20241022` - 🎯 Balanced performance and quality
- `claude-3-opus-20240229` - 🧠 Most capable, slower and more expensive

**Ollama Models:**
- `qwen2.5:0.5b` - ⚡ Fastest (1s), good for simple queries
- `qwen2.5:1.5b` - 🎯 Better accuracy (4.6s), recommended if quality matters
- `qwen3:1.7b` - 🐌 Legacy model (14s), not recommended

## Command-Line Options

```bash
# Run with Anthropic (default)
npm run dev
node src/main.js

# Run with Ollama
npm run dev:ollama
node src/main.js --ollama

# Environment variable override
AI_PROVIDER=ollama npm run dev
```

## Performance Logging

Both providers include **automatic performance timing**:

```
🤖 AI Response (Anthropic): "The lights are now off" (543ms)
🤖 AI Response (Ollama): "Turning off the lights" (2341ms)
```

The logs show:
- **Provider name** (Anthropic or Ollama)
- **Response text**
- **Response time in milliseconds** ⏱️

## Tool Support

Both providers support the same tools:
- ✅ `get_current_datetime` - Get current date/time
- ✅ `search_web` - Search the web
- ✅ `control_zwave_device` - Control Z-Wave devices

Tools are automatically converted to LangChain format for Anthropic.

## Architecture

### Ollama Client (`ollama-client.js`)
- Uses native Ollama SDK
- Direct tool calling support
- Local inference (no internet required)

### Anthropic Client (`anthropic-client.js`)
- Uses LangChain.js with `@langchain/anthropic`
- Tool definitions converted to Anthropic format
- Requires ANTHROPIC_API_KEY environment variable
- Requires internet connection

## Cost Comparison

**Anthropic (Cloud-based):**
- ✅ Faster responses (typically 500-1500ms)
- ✅ More accurate and capable
- ❌ Costs money per request
- ❌ Requires internet connection
- **Claude 3.5 Haiku:** $0.001 per 1K input tokens, $0.005 per 1K output tokens

**Ollama (Local):**
- ✅ Free (runs locally)
- ✅ No internet required
- ✅ Privacy (data stays local)
- ❌ Slower (1-15s depending on model)
- ❌ Lower quality responses
- ❌ Requires GPU or powerful CPU

## Troubleshooting

### Anthropic Issues

**"ANTHROPIC_API_KEY is required"**
- Set `ANTHROPIC_API_KEY` in your `.env` file
- Get your API key from: https://console.anthropic.com/settings/keys

**"Anthropic health check failed"**
- Verify your API key is valid
- Check internet connection
- Ensure you have API credits

### Ollama Issues

**"Ollama not ready"**
- Start Ollama: `ollama serve`
- Pull the model: `ollama pull qwen2.5:0.5b`
- Check Ollama is running: `curl http://localhost:11434/api/tags`

## Testing

Compare the performance of both providers:

1. **Test Anthropic:**
   ```bash
   npm run dev
   # Say: "Hey Jarvis, what time is it?"
   # Check logs for response time
   ```

2. **Test Ollama:**
   ```bash
   npm run dev:ollama
   # Say: "Hey Jarvis, what time is it?"
   # Check logs for response time
   ```

3. **Compare:**
   - Anthropic should be 2-5x faster
   - Ollama is free and runs locally
   - Both should produce accurate responses

## Recommendations

**For Production/Demo:**
- Use **Anthropic** (claude-3-5-haiku-20241022)
- Faster, more reliable, better quality
- Cost: ~$0.50-1.00 per 1000 voice queries

**For Development/Testing:**
- Use **Ollama** (qwen2.5:0.5b)
- Free, private, offline-capable
- Slower but sufficient for testing

**For Offline/Privacy:**
- Use **Ollama** (qwen2.5:1.5b or larger)
- 100% local, no cloud dependencies
- Best for privacy-sensitive applications
