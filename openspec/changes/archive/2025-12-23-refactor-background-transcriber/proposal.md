# Change: Refactor BackgroundTranscriber from "God Class" to Focused Services

## Why

The `BackgroundTranscriber` class (209 lines) violates the Single Responsibility Principle by handling 9+ distinct responsibilities:

1. Audio validation (energy checks, duration checks)
2. File I/O operations (WAV writing, cleanup)
3. Speech transcription (Whisper integration)
4. Intent detection (pattern matching for device/datetime/control queries)
5. Tool execution routing (delegating to various tool executors)
6. AI provider selection and routing (Ollama vs Anthropic)
7. TTS orchestration (streaming vs non-streaming)
8. MQTT publishing (transcription and AI response publishing)
9. Conversation management (updating conversation history)

This tightly coupled architecture makes testing difficult, reduces code reusability, and violates SOLID principles. The presentation demo requires reliable, maintainable code that can be easily understood and modified.

**Current pain points:**
- Cannot unit test individual responsibilities in isolation
- Difficult to swap implementations (e.g., different AI providers or intent classifiers)
- Hard to understand the complete voice interaction flow
- Duplicate pattern matching logic scattered across methods
- Mixed abstraction levels (low-level audio checks vs high-level AI orchestration)

## What Changes

**BREAKING CHANGES:**
- `BackgroundTranscriber` class will be removed and replaced with focused services
- External code importing `BackgroundTranscriber` must be updated to use `VoiceInteractionOrchestrator`
- Tool execution moved to centralized `AIRouter` service

**New Services (Single Responsibility):**

1. **TranscriptionService** (`src/services/TranscriptionService.js`)
   - Orchestrate Whisper transcription workflow
   - Audio validation (duration, energy checks)
   - Temporary WAV file management (create, cleanup)
   - Return transcription text or throw errors

2. **IntentClassifier** (`src/services/IntentClassifier.js`)
   - Pattern-based intent detection
   - Classify user queries into categories (device query, datetime query, device control, general query)
   - Centralize all regex patterns in one place
   - Extensible for future intent types

3. **VoiceInteractionOrchestrator** (`src/services/VoiceInteractionOrchestrator.js`)
   - **Primary replacement for BackgroundTranscriber**
   - Coordinate complete voice interaction flow
   - Delegate to TranscriptionService, IntentClassifier, AIRouter, TTS
   - Manage audio feedback (beeps at appropriate stages)
   - Handle conversation state updates
   - MQTT publishing for transcriptions and AI responses

4. **AIRouter** (`src/ai/AIRouter.js`)
   - Route AI queries to correct provider (Ollama, Anthropic)
   - Manage tool calling across providers
   - Execute tools via centralized tool executor
   - Handle streaming vs non-streaming responses
   - Build system prompts with context (device info, etc.)

**File Structure:**
```
src/
├── services/
│   ├── TranscriptionService.js      (NEW - audio → text)
│   ├── IntentClassifier.js          (NEW - classify intent)
│   └── VoiceInteractionOrchestrator.js  (NEW - main orchestrator)
├── ai/
│   └── AIRouter.js                  (NEW - AI provider routing)
├── util/
│   └── BackgroundTranscriber.js     (REMOVED)
```

**Migration Path:**
```javascript
// BEFORE (old code)
import { BackgroundTranscriber } from './util/BackgroundTranscriber.js';
const transcriber = new BackgroundTranscriber(config, logger);
await transcriber.backgroundTranscribe(audioSamples);

// AFTER (new code)
import { VoiceInteractionOrchestrator } from './services/VoiceInteractionOrchestrator.js';
const orchestrator = new VoiceInteractionOrchestrator(config, logger);
await orchestrator.processVoiceInteraction(audioSamples);
```

## Impact

**Affected specs:**
- `voice-gateway` (NEW capability spec - voice interaction pipeline)

**Affected code:**
- `apps/voice-gateway-oww/src/util/BackgroundTranscriber.js` (REMOVED)
- `apps/voice-gateway-oww/src/main.js` (UPDATE import and usage)
- `apps/voice-gateway-oww/src/services/` (NEW directory with 3 new services)
- `apps/voice-gateway-oww/src/ai/` (NEW directory with AIRouter)

**Testing impact:**
- Enable focused unit tests for each service
- Improve test coverage from <10% to 60%+ for voice interaction logic
- Mock dependencies easily (transcription, AI providers, TTS)

**Performance impact:**
- Neutral to positive (same logic, better organized)
- Potential for future optimization with lazy initialization

**Presentation impact:**
- Cleaner code to show in slides
- Better demonstrates SOLID principles
- Easier to explain voice interaction flow
