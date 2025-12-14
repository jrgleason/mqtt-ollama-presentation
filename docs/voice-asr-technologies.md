# Voice & ASR Technologies Guide

**Last Updated:** 2025-10-27

This guide explains Automatic Speech Recognition (ASR) technologies, their integration approaches, and how they relate to the voice gateway implementation.

---

## Table of Contents

- [What is ASR?](#what-is-asr)
- [Traditional Pipeline: OWW + Whisper.cpp + ElevenLabs/Piper](#traditional-pipeline-oww--whispercpp--elevenlabspiper)
- [Next-Generation: Ultravox (Multimodal Voice LLM)](#next-generation-ultravox-multimodal-voice-llm)
- [Technology Comparison](#technology-comparison)
- [Hardware Requirements](#hardware-requirements)
- [Cost & Network Tradeoffs](#cost--network-tradeoffs)
- [Which Approach to Use?](#which-approach-to-use)

---

## What is ASR?

**ASR (Automatic Speech Recognition)** is the technology that converts spoken audio into text. It's the first step in most voice AI systems, enabling computers to "hear" and understand human speech.

### ASR in Voice AI Pipelines

Traditional voice AI systems use a **three-stage pipeline**:

```
1. ASR (Speech → Text)     e.g., Whisper.cpp
   ↓
2. LLM (Text → Text)        e.g., Ollama with Qwen
   ↓
3. TTS (Text → Speech)      e.g., ElevenLabs, Piper
```

Each stage is a separate model with its own:
- Processing latency
- Resource requirements
- Error propagation potential

---

## Traditional Pipeline: OWW + Whisper.cpp + ElevenLabs/Piper

This is the **current implementation** in our voice gateway (`apps/voice-gateway-oww`).

### Architecture

```
User Speech
   ↓
[OpenWakeWord] ← Wake word detection ("Hey Jarvis")
   ↓
[Audio Recording + VAD] ← Capture speech until silence
   ↓
[Whisper.cpp] ← ASR: Convert audio → text
   ↓
[Ollama/Qwen] ← LLM: Process intent → response
   ↓
[ElevenLabs or Piper] ← TTS: Convert text → speech
   ↓
Speaker Output
```

### Component Details

#### 1. OpenWakeWord (Wake Word Detection)
- **Purpose:** Detect wake word ("Hey Jarvis") to activate listening
- **Runtime:** Continuous, low CPU (~5-10%)
- **Latency:** ~150ms detection time
- **Network:** ❌ None (fully offline)
- **Cost:** ✅ Free & open source

#### 2. Whisper.cpp (ASR)
- **Purpose:** Convert recorded speech to text
- **Model Options:**
  - `tiny` - 75MB, ~1.5s transcription (Pi 5)
  - `base` - 142MB, ~6s transcription (Pi 5)
  - `small` - Better accuracy, slower
- **Network:** ❌ None (runs locally)
- **Cost:** ✅ Free & open source
- **Relation:** Whisper.cpp is a C++ port of OpenAI's Whisper model, optimized for CPU inference

#### 3. Ollama (LLM)
- **Purpose:** Understand intent and generate response text
- **Model Options:**
  - `qwen2.5:0.5b` - 1s response (optimized for voice)
  - `qwen2.5:1.5b` - 4.6s response (better quality)
- **Network:** ❌ None (runs locally)
- **Cost:** ✅ Free & open source

#### 4. Text-to-Speech

**Option A: ElevenLabs (Current Default)**
- **Purpose:** Convert response text to natural speech
- **Quality:** ⭐⭐⭐⭐⭐ Extremely realistic, human-like voices
- **Latency:** ~1-2s (streaming)
- **Network:** ✅ **Required** (cloud API)
- **Cost:** 💰 API costs (~$0.30 per 1000 characters)
  - Free tier: 10,000 characters/month
  - Paid: $5/month for 30,000 characters
- **Voices:** Wide selection of natural voices with emotion/pacing
- **Use Case:** Best for realistic, engaging demos and production use

**Option B: Piper TTS (Fallback)**
- **Purpose:** Offline text-to-speech
- **Quality:** ⭐⭐⭐ Good, but robotic compared to ElevenLabs
- **Latency:** ~500ms
- **Network:** ❌ None (runs locally)
- **Cost:** ✅ Free & open source
- **Use Case:** Offline demos, development, cost-sensitive deployments

### Total Pipeline Latency (Voice Gateway)

**With current setup (Pi 5, qwen2.5:0.5b, whisper:tiny, ElevenLabs):**

| Stage | Latency | Notes |
|-------|---------|-------|
| Wake Word Detection | ~150ms | Continuous listening |
| Audio Recording (VAD) | ~2-3s | User speaking + silence detection |
| Whisper Transcription | ~1.5s | Using tiny model |
| Ollama Response | ~1s | Using qwen2.5:0.5b |
| ElevenLabs TTS | ~1-2s | Streaming response |
| **Total** | **~6-8s** | From wake word to first audio response |

**With Piper instead of ElevenLabs:**
- Total: **~5-6s** (saves ~1s, but lower voice quality)

### Network Requirements

**Can run fully offline?**
- ✅ **Yes, with Piper TTS** - All components run locally
- ⚠️ **Partially, with ElevenLabs** - Requires internet for TTS only

**What happens if internet is down?**
- Wake word, ASR, and LLM still work
- TTS fails if using ElevenLabs (fallback to Piper recommended)

---

## Next-Generation: Ultravox (Multimodal Voice LLM)

**Ultravox** is a breakthrough multimodal LLM that **combines ASR and LLM into a single model**, eliminating the separate speech-to-text stage.

### Architecture

```
User Speech
   ↓
[Ultravox Model] ← Audio directly → Text response
   ↓              (no separate ASR step!)
[TTS] ← Convert response to speech
   ↓
Speaker Output
```

### How Ultravox Works

Instead of the traditional pipeline:
1. **Traditional:** Audio → [Whisper ASR] → Text → [LLM] → Response
2. **Ultravox:** Audio → [Multimodal LLM] → Response directly

**Technical Approach:**
- Built on **Llama 3.1** (8B or 70B parameters)
- Uses **Whisper encoder** to convert audio to embeddings
- **Multimodal projector** converts audio embeddings directly into LLM's high-dimensional space
- LLM processes audio embeddings as if they were text tokens
- No separate transcription step required!

**Key Innovation:**
> "Ultravox extends any open-weight LLM with a multimodal projector that converts audio directly into the high-dimensional space used by LLM"

### Benefits Over Traditional Pipeline

1. **Lower Latency**
   - **Time-to-first-token (TTFT):** ~150ms
   - Eliminates ASR → LLM handoff latency
   - Faster than separate Whisper + Ollama

2. **Better Context Understanding**
   - Preserves audio features (tone, emotion, pacing)
   - LLM can "hear" nuances that text transcription loses
   - More natural conversation flow

3. **Improved Accuracy**
   - No error propagation from ASR → LLM
   - Better understanding of ambiguous speech
   - Handles accents and speech variations better

4. **Streaming Response**
   - Can start responding before entire utterance is finished
   - More natural conversational pacing

### Ultravox Model Variants

| Model | Size | Backbone LLM | Performance |
|-------|------|--------------|-------------|
| ultravox-v0.4.1-8B | 8B params | Llama 3.1-8B | Fast, good quality |
| ultravox-v0.4.1-70B | 70B params | Llama 3.1-70B | Best quality, slow |
| ultravox-v0.4-mistral | 7B params | Mistral 7B | Alternative option |

### Current Limitations

1. **Hardware Requirements**
   - Requires significantly more resources than Whisper + small LLM
   - 8B model: ~16-24GB RAM (with quantization)
   - 70B model: 64GB+ RAM or multi-GPU setup
   - Not practical on Raspberry Pi 5 (8GB RAM max)

2. **Output Format**
   - Currently outputs text only (not speech tokens)
   - Still requires separate TTS (ElevenLabs/Piper)
   - Future versions may support direct audio output

3. **Deployment Options**
   - **Cloud:** Fully hosted on Ultravox.ai platform
   - **Self-hosted:** Possible with robust hardware (GPU recommended)
   - **Edge:** Not yet practical for low-resource devices

4. **Network Requirements**
   - Cloud deployment: ✅ Internet required
   - Self-hosted: ❌ Can run offline (with proper hardware)

### When Ultravox Makes Sense

**Best for:**
- Production voice assistants requiring natural conversation
- Systems with dedicated GPU hardware (RTX 3090+, A100, H100)
- Applications prioritizing conversation quality over cost
- Cloud-based deployments where latency matters

**Not ideal for:**
- Raspberry Pi or low-resource edge devices
- Strictly offline/air-gapped systems
- Cost-sensitive hobby projects
- Simple command-and-control applications

---

## Technology Comparison

### Feature Matrix

| Feature | OWW + Whisper + Ollama | Ultravox + TTS |
|---------|------------------------|----------------|
| **Latency** | 6-8s (Pi 5) | 3-5s (GPU) |
| **Quality** | Good | Excellent |
| **Hardware** | Pi 5, 8GB RAM | GPU, 24GB+ VRAM |
| **Cost (self-hosted)** | $0 (+ Pi hardware) | $0 (+ GPU server) |
| **Cost (cloud)** | $0 (ElevenLabs TTS only) | $$$$ (Ultravox API) |
| **Fully Offline** | ✅ Yes (with Piper) | ✅ Yes (self-hosted) |
| **Conversation Quality** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Setup Complexity** | Low | High |
| **Community Support** | Strong | Growing |

### ASR Technology Comparison

| Technology | Type | Quality | Speed | Hardware | Cost |
|------------|------|---------|-------|----------|------|
| **Whisper.cpp (tiny)** | Traditional ASR | ⭐⭐⭐ | Fast | Pi 5 | Free |
| **Whisper.cpp (base)** | Traditional ASR | ⭐⭐⭐⭐ | Medium | Pi 5 | Free |
| **Whisper.cpp (small)** | Traditional ASR | ⭐⭐⭐⭐ | Slow | Pi 5 | Free |
| **Ultravox 8B** | Multimodal LLM | ⭐⭐⭐⭐⭐ | Fast | GPU | Free/API |
| **Ultravox 70B** | Multimodal LLM | ⭐⭐⭐⭐⭐ | Medium | Multi-GPU | API |

### TTS Technology Comparison

| Technology | Quality | Speed | Hardware | Network | Cost |
|------------|---------|-------|----------|---------|------|
| **Piper** | ⭐⭐⭐ | Fast (~500ms) | Pi 5 | ❌ None | Free |
| **ElevenLabs** | ⭐⭐⭐⭐⭐ | Fast (~1-2s) | Any | ✅ Required | $5-30/mo |

---

## Hardware Requirements

### Raspberry Pi 5 (Current Target)

**What Works:**
- ✅ OpenWakeWord (continuous wake word detection)
- ✅ Whisper.cpp tiny/base (1.5-6s transcription)
- ✅ Ollama qwen2.5:0.5b-1.5b (1-5s inference)
- ✅ Piper TTS (500ms synthesis)
- ✅ ElevenLabs TTS (API call)

**What Doesn't Work:**
- ❌ Ultravox models (requires 16GB+ RAM, GPU recommended)
- ❌ Large Whisper models (small+ too slow)
- ❌ Large Ollama models (3b+ unusable latency)

### Desktop/Server (Ultravox-Ready)

**Minimum for Ultravox 8B:**
- CPU: 8+ cores (AMD Ryzen 7/9, Intel i7/i9)
- RAM: 24GB+
- GPU: RTX 3090 (24GB VRAM) or better
- Storage: 50GB+ SSD
- OS: Linux (Ubuntu 22.04+), Docker recommended

**Recommended for Ultravox 70B:**
- CPU: 16+ cores
- RAM: 64GB+
- GPU: 2x A100 (80GB each) or 4x RTX 4090
- Storage: 200GB+ NVMe SSD
- OS: Linux with CUDA 12+

### Cloud Deployment

**Ultravox.ai Hosted:**
- No hardware management
- Pay per API call
- Lowest latency (~150ms TTFT)
- Scales automatically
- Requires internet connection

---

## Cost & Network Tradeoffs

### Option 1: Fully Free & Offline (Current)

**Stack:** OWW + Whisper.cpp + Ollama + Piper
- **Upfront Cost:** Raspberry Pi 5 (~$100) + accessories
- **Monthly Cost:** $0 (electricity only, ~$2-3/mo)
- **Network:** None required (fully air-gapped capable)
- **Quality:** Good (functional but robotic TTS)
- **Latency:** 5-6s end-to-end
- **Best For:** Privacy-focused, offline demos, hobby projects

### Option 2: Hybrid Cloud (Recommended for Demos)

**Stack:** OWW + Whisper.cpp + Ollama + ElevenLabs
- **Upfront Cost:** Raspberry Pi 5 (~$100) + accessories
- **Monthly Cost:** $5-30 (ElevenLabs TTS only)
- **Network:** Required for TTS only (core still works offline)
- **Quality:** Excellent (realistic human voices)
- **Latency:** 6-8s end-to-end
- **Best For:** Live demos, production with realistic voices

### Option 3: Self-Hosted Ultravox (Advanced)

**Stack:** Ultravox + ElevenLabs/Piper
- **Upfront Cost:** GPU server ($2000-10000+)
- **Monthly Cost:** $0-30 (depending on TTS choice)
- **Network:** None required (can be fully offline)
- **Quality:** Excellent (natural conversation)
- **Latency:** 3-5s end-to-end
- **Best For:** Production systems, high-quality conversation, organizations with GPU infrastructure

### Option 4: Fully Cloud (Production-Ready)

**Stack:** Ultravox.ai API + ElevenLabs
- **Upfront Cost:** $0
- **Monthly Cost:** $$$$ (pay per API call, can be $100-1000+/mo)
- **Network:** Required (internet connection mandatory)
- **Quality:** Excellent
- **Latency:** 2-4s end-to-end (lowest)
- **Best For:** Production apps, scale automatically, minimal DevOps

---

## Which Approach to Use?

### Decision Tree

```
Do you need fully offline operation?
├─ Yes → Use OWW + Whisper + Ollama + Piper
│         (Raspberry Pi 5, ~$100 total)
│
└─ No → Do you need realistic voices?
    ├─ Yes → Do you have GPU hardware (24GB+ VRAM)?
    │   ├─ Yes → Use Ultravox (self-hosted) + ElevenLabs
    │   │         (Best quality, ~$2000+ hardware)
    │   │
    │   └─ No → Use OWW + Whisper + Ollama + ElevenLabs
    │             (Raspberry Pi 5, $5-30/mo API)
    │
    └─ No → Do you want simplest setup?
        ├─ Yes → Use OWW + Whisper + Ollama + Piper
        │         (Free & easy)
        │
        └─ No → Use Ultravox.ai API + ElevenLabs
                  (Cloud, $$$/mo)
```

### Recommendation Matrix

| Use Case | Recommended Stack | Cost | Why? |
|----------|------------------|------|------|
| **Hobby/Learning** | OWW + Whisper + Ollama + Piper | $100 | Free, offline, educational |
| **Live Demo/Presentation** | OWW + Whisper + Ollama + ElevenLabs | $100 + $5-30/mo | Realistic voices, Pi-friendly |
| **Production (Small)** | Same as demo | $100 + $5-30/mo | Reliable, cost-effective |
| **Production (Quality)** | Ultravox (self-hosted) + ElevenLabs | $2000+ | Best conversation experience |
| **Enterprise Scale** | Ultravox.ai API + ElevenLabs | Pay per use | Scalable, managed |

---

## CodeMash Demo Choice

**For our January 2026 presentation, we're using:**

**Stack:** OWW + Whisper.cpp + Ollama (qwen2.5:0.5b) + ElevenLabs

**Rationale:**
1. **Runs on Raspberry Pi 5** - Portable, affordable demo hardware
2. **Mostly offline** - Only TTS requires internet (minimal risk)
3. **Realistic voices** - ElevenLabs makes the demo engaging
4. **Cost-effective** - $5/month vs $2000+ GPU server
5. **Accessible** - Audience can replicate on budget hardware

**Mentioned in Presentation:**
- Ultravox as next-generation option for those with robust hardware
- Tradeoffs: Pi 5 + free tools vs GPU server + Ultravox
- Piper as fully offline fallback option

---

## Future Considerations

### Emerging Technologies

1. **Ultravox Direct Audio Output** (Coming Soon)
   - Future versions will output speech tokens directly
   - Eliminates need for separate TTS
   - Even lower latency (<2s end-to-end)

2. **Quantized Multimodal Models**
   - 4-bit/8-bit quantization of Ultravox
   - May enable Ultravox 8B on 16GB RAM (without GPU)
   - Still researching feasibility

3. **Edge-Optimized Multimodal LLMs**
   - Microsoft Phi-4 (14B multimodal)
   - Google Gemini Nano Voice
   - Apple Intelligence voice models

### When to Upgrade

**Stick with current approach if:**
- Running on Raspberry Pi or similar hardware
- Budget is constrained (<$500)
- Offline operation is critical
- 6-8s latency is acceptable

**Consider Ultravox when:**
- You have GPU server ($2000+)
- Conversation quality is priority #1
- Sub-5s latency is required
- Budget allows for hardware investment

---

## Related Documentation

- **[Voice Gateway README](../apps/voice-gateway-oww/README.md)** - Current implementation details
- **[Voice Gateway Quickstart](voice-gateway-quickstart.md)** - Setup instructions
- **[OpenWakeWord Guide](openwakeword-guide.md)** - Wake word detection
- **[Performance Optimization](performance-optimization.md)** - Pi 5 tuning
- **[Presentation Outline](outline.md)** - Demo structure

---

## References

- **Whisper.cpp:** https://github.com/ggerganov/whisper.cpp
- **OpenWakeWord:** https://github.com/dscripka/openWakeWord
- **Ultravox GitHub:** https://github.com/fixie-ai/ultravox
- **Ultravox Docs:** https://docs.ultravox.ai/
- **ElevenLabs:** https://elevenlabs.io/
- **Piper TTS:** https://github.com/rhasspy/piper

---

**Last Updated:** 2025-10-27
**Project:** MQTT + Ollama Home Automation Demo
**Presentation Date:** January 12, 2026
