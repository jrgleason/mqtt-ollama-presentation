# TTS Migration History: Piper → ElevenLabs

## Timeline Summary

**Piper TTS Era:** October 13-24, 2025
**ElevenLabs Introduction:** October 24, 2025
**ElevenLabs Default:** October 27, 2025

---

## Detailed Timeline

### Phase 1: Piper TTS Only (Oct 13-24, 2025)

**Commit c3b0817** - October 13, 2025
- **Title:** "The text to speach is kind of working (#2)"
- **Tag:** **0.0.1** ✅ (Tagged at commit 87d0bb8, Oct 13)
- **Added:** `apps/voice-gateway-oww/src/piper-tts.js`
- **Status:** First working TTS implementation using Piper

**Key commits during Piper-only period:**
- `87d0bb8` (Oct 13) - More docs (#3) - **TAG 0.0.1**
- `a637731` (Oct 13) - Adding more documentation and things
- `85612a1` (Oct 16) - Working on the pi now (#4)
- `0dbcf2f` (Oct 16) - Sped up the app and also added some tones

### Phase 2: ElevenLabs Introduction (Oct 24, 2025)

**Commit 54c4423** - October 24, 2025
- **Title:** "Now things are working better"
- **Added:** `apps/voice-gateway-oww/src/elevenlabs-tts.js` (501 lines)
- **Status:** Both Piper and ElevenLabs available, but Piper still default
- **Config:** No TTS_PROVIDER yet - Piper hardcoded as default

**What was added:**
```javascript
// New file: elevenlabs-tts.js
import {ElevenLabsClient} from '@elevenlabs/elevenlabs-js';
// 501 lines of ElevenLabs integration
```

### Phase 3: ElevenLabs as Default (Oct 27, 2025)

**Commit ec14a0d** - October 27, 2025
- **Title:** "Getting things to work with the new better sounding models and actually used anthropic instead of chatgpt"
- **Added:** `apps/voice-gateway-oww/src/streaming-tts.js` (198 lines)
- **Modified:** Both `piper-tts.js` and `elevenlabs-tts.js`
- **Status:** ElevenLabs now the default TTS provider

**Config changes:**
```javascript
// BEFORE (commit 54c4423^):
tts: {
    enabled: process.env.TTS_ENABLED !== 'false',
    volume: process.env.TTS_VOLUME ? Number(process.env.TTS_VOLUME) : 1.0,
    speed: process.env.TTS_SPEED ? Number(process.env.TTS_SPEED) : 1.0,
}

// AFTER (commit ec14a0d):
tts: {
    enabled: process.env.TTS_ENABLED !== 'false',
    provider: process.env.TTS_PROVIDER || 'ElevenLabs', // ← NEW
    volume: process.env.TTS_VOLUME ? Number(process.env.TTS_VOLUME) : 1.0,
    speed: process.env.TTS_SPEED ? Number(process.env.TTS_SPEED) : 1.0,
    modelPath: process.env.TTS_MODEL_PATH || 'models/piper/voice.onnx', // ← NEW
    streaming: process.env.TTS_STREAMING !== 'false', // ← NEW
}
```

---

## Tag Status

### ❌ Tag 0.0.1 - Does NOT Reflect ElevenLabs

**Commit:** `87d0bb8` (October 13, 2025)
**Title:** "More docs (#3)"
**TTS Status:** Piper only
**Location:** 5 commits BEFORE ElevenLabs was introduced

**Timeline:**
```
Oct 13: c3b0817 - Piper TTS added
Oct 13: 87d0bb8 - Tag 0.0.1 created ✅ (Piper only)
Oct 24: 54c4423 - ElevenLabs added
Oct 27: ec14a0d - ElevenLabs default
```

### ❌ Tag 0.0.2 - Does NOT Reflect ElevenLabs

**Commit:** `ccec3b3` (October 19, 2025)
**Title:** "More fixes (#7)"
**TTS Status:** Piper only (5 days BEFORE ElevenLabs)
**Location:** 3 commits BEFORE ElevenLabs was introduced

**Timeline:**
```
Oct 13: 87d0bb8 - Tag 0.0.1
Oct 19: ccec3b3 - Tag 0.0.2 ✅ (Still Piper only)
Oct 24: 54c4423 - ElevenLabs added
Oct 27: ec14a0d - ElevenLabs default
```

---

## Migration Impact

### What Changed

**Piper TTS (0.0.1 - 0.0.2):**
- ✅ Local, offline TTS
- ✅ No API key required
- ✅ Free and open-source
- ❌ Lower voice quality (synthetic sounding)
- ❌ Slower processing
- File: `piper-tts.js`

**ElevenLabs TTS (Post 0.0.2):**
- ✅ High-quality, natural voices
- ✅ Faster response time
- ✅ Streaming support
- ❌ Requires API key
- ❌ Cloud-dependent
- ❌ Costs money (paid API)
- Files: `elevenlabs-tts.js`, `streaming-tts.js`

### Configuration Evolution

**0.0.1 (Piper only):**
```bash
# No TTS_PROVIDER - Piper hardcoded
TTS_ENABLED=true
TTS_MODEL_PATH=models/piper/en-us-glados-high.onnx
TTS_VOLUME=1.0
TTS_SPEED=3.0
```

**0.0.2 (Still Piper only):**
```bash
# Same as 0.0.1
TTS_ENABLED=true
TTS_MODEL_PATH=models/piper/en-us-glados-high.onnx
TTS_VOLUME=1.0
TTS_SPEED=3.0
```

**Current (ElevenLabs default):**
```bash
TTS_ENABLED=true
TTS_PROVIDER=ElevenLabs  # ← NEW: Can switch to 'Piper'
TTS_VOLUME=1.0
TTS_SPEED=1.0
TTS_STREAMING=true  # ← NEW: Streaming support

# ElevenLabs config
ELEVENLABS_API_KEY=sk_xxxxx
ELEVENLABS_VOICE_ID=JBFqnCBsd6RMkjVDRZzb
ELEVENLABS_MODEL_ID=eleven_multilingual_v2

# Piper config (still available)
TTS_MODEL_PATH=models/piper/voice.onnx
```

---

## Recommendations

### Option 1: Create New Tag for ElevenLabs

Since both 0.0.1 and 0.0.2 are before the ElevenLabs migration, consider:

```bash
# Tag the ElevenLabs introduction
git tag -a 0.0.3 54c4423 -m "feat: Add ElevenLabs TTS support"

# Tag the ElevenLabs default
git tag -a 0.1.0 ec14a0d -m "feat: ElevenLabs TTS as default with streaming"

# Push tags
git push origin 0.0.3 0.1.0
```

### Option 2: Update Documentation

Add release notes clarifying:
- 0.0.1: Initial Piper TTS implementation
- 0.0.2: Improvements and fixes (still Piper only)
- 0.0.3: ElevenLabs TTS added (optional)
- 0.1.0: ElevenLabs TTS default with streaming

---

## Summary

**Neither tag 0.0.1 nor 0.0.2 reflect the ElevenLabs migration:**

| Tag | Date | Commit | TTS System | ElevenLabs? |
|-----|------|--------|------------|-------------|
| 0.0.1 | Oct 13 | 87d0bb8 | Piper only | ❌ No |
| 0.0.2 | Oct 19 | ccec3b3 | Piper only | ❌ No |
| (untagged) | Oct 24 | 54c4423 | Both (Piper default) | ✅ Added |
| (untagged) | Oct 27 | ec14a0d | Both (ElevenLabs default) | ✅ Default |

**The ElevenLabs migration happened AFTER both tags were created.**

**Suggested action:** Create new tags (0.0.3 and 0.1.0) to mark the ElevenLabs milestones.
