# Design: Refactoring BackgroundTranscriber into Focused Services

## Context

### Current State
The `BackgroundTranscriber` class is a 209-line "God Class" that handles the entire voice interaction pipeline from raw audio to spoken AI response. It violates the Single Responsibility Principle by managing:

- Low-level audio operations (validation, file I/O)
- Speech recognition orchestration
- Intent classification
- AI provider selection and routing
- Tool execution
- Text-to-speech coordination
- State management (conversation history)
- MQTT event publishing

This architecture emerged organically during rapid prototyping but now hinders maintainability, testability, and future feature development.

### Constraints
- **JavaScript Only:** No TypeScript allowed in this project
- **Presentation Demo:** Changes must not break existing voice interaction flow
- **Performance:** Must maintain <7s voice response pipeline (wake word → spoken response)
- **Local-First:** Prefer Ollama over Anthropic for offline capability
- **Hardware:** Must work on Raspberry Pi 5 with limited resources

### Stakeholders
- **Presentation Audience:** Code should demonstrate SOLID principles clearly
- **Maintainers:** Need testable, understandable code for future enhancements
- **Demo Operator:** Requires reliable voice interaction during live presentation

## Goals / Non-Goals

### Goals
1. **Single Responsibility:** Each service has one clear, focused purpose
2. **Testability:** Enable unit testing of individual responsibilities (target 60%+ overall, 80%+ critical paths)
3. **Maintainability:** Reduce cognitive load by organizing code into logical domains
4. **Reusability:** Enable AI router to be shared with other modules (e.g., Oracle Next.js app)
5. **Extensibility:** Make it easy to add new intent types or AI providers
6. **Demonstration Value:** Show clean architecture patterns in presentation

### Non-Goals
1. **Performance Optimization:** Not changing algorithms, only reorganizing code
2. **New Features:** Not adding new voice capabilities in this refactor
3. **Framework Introduction:** Not introducing new dependencies or frameworks
4. **Database Changes:** Not modifying data persistence or conversation storage
5. **API Changes:** Not modifying external MQTT message formats

## Decisions

### Decision 1: Four-Service Architecture

**Chosen Approach:**
Split BackgroundTranscriber into four focused services:

1. **TranscriptionService** - Audio → Text (single responsibility: speech recognition)
2. **IntentClassifier** - Text → Intent (single responsibility: classify user queries)
3. **AIRouter** - Intent + Context → AI Response (single responsibility: route to correct AI provider with tools)
4. **VoiceInteractionOrchestrator** - Samples → Spoken Response (single responsibility: coordinate the complete pipeline)

**Rationale:**
- Each service has clear input/output contract
- Each service can be tested independently
- Each service has single reason to change
- VoiceInteractionOrchestrator acts as facade (Facade pattern) for external callers

**Alternatives Considered:**

**A. Two-Service Split (Transcription + AI Handling):**
- ❌ Still violates SRP (AI handling does too much)
- ❌ Doesn't improve testability significantly
- ✅ Simpler migration

**B. Seven-Service Microservice-Style:**
- ❌ Over-engineering for presentation demo
- ❌ Increases complexity without clear benefit
- ❌ May hurt performance with excessive indirection
- ✅ Maximum modularity

**C. Keep as God Class:**
- ❌ Fails presentation demo goal (show good architecture)
- ❌ Testing remains difficult
- ❌ Future maintainability poor
- ✅ No migration effort

### Decision 2: Dependency Injection via Constructor

**Chosen Approach:**
All services receive dependencies (config, logger, clients) via constructor:

```javascript
class VoiceInteractionOrchestrator {
    constructor(config, logger) {
        this.config = config;
        this.logger = logger;
        this.beep = new BeepUtil(config);
        this.transcriptionService = new TranscriptionService(config, logger);
        this.intentClassifier = new IntentClassifier();
        this.aiRouter = new AIRouter(config, logger);
    }
}
```

**Rationale:**
- Explicit dependencies make testing easier (can inject mocks)
- Matches existing project patterns (OllamaClient, AnthropicClient)
- No framework required (no DI container)
- Easy to understand for presentation audience

**Alternatives Considered:**

**A. Service Locator Pattern:**
```javascript
const transcriptionService = ServiceRegistry.get('TranscriptionService');
```
- ❌ Hidden dependencies harder to test
- ❌ Requires global state (ServiceRegistry)
- ✅ Decouples services from construction

**B. Factory Pattern:**
```javascript
const orchestrator = OrchestratorFactory.create(config);
```
- ❌ Adds unnecessary abstraction for simple use case
- ✅ Centralizes object creation

### Decision 3: IntentClassifier as Stateless Utility

**Chosen Approach:**
IntentClassifier is a simple stateless class with static-style methods:

```javascript
class IntentClassifier {
    detectDeviceQuery(transcription) { /* ... */ }
    detectDateTimeQuery(transcription) { /* ... */ }
    detectDeviceControlQuery(transcription) { /* ... */ }
    classify(transcription) {
        return {
            isDeviceQuery: this.detectDeviceQuery(transcription),
            isDateTimeQuery: this.detectDateTimeQuery(transcription),
            isDeviceControlQuery: this.detectDeviceControlQuery(transcription),
        };
    }
}
```

**Rationale:**
- Pure functions (no state) are easy to test
- Can instantiate once and reuse (lightweight)
- Pattern matching is deterministic, doesn't need configuration
- Simple to extend with new intent types

**Alternatives Considered:**

**A. ML-Based Intent Classification:**
- ❌ Over-engineering for simple demo (only 3 intent types)
- ❌ Adds model training/deployment complexity
- ❌ Slower inference than regex patterns
- ✅ More accurate for ambiguous queries
- ✅ Scales better to many intent types

**B. Export Individual Functions (No Class):**
```javascript
export function detectDeviceQuery(text) { /* ... */ }
export function detectDateTimeQuery(text) { /* ... */ }
```
- ✅ Simpler for small utility
- ❌ Harder to extend with shared state later
- ❌ Less idiomatic in class-based architecture

### Decision 4: AIRouter Encapsulates Provider Logic

**Chosen Approach:**
AIRouter handles all AI provider selection, tool execution, and response handling:

```javascript
class AIRouter {
    async query(transcription, intent) {
        const systemPrompt = await this.buildSystemPrompt(intent);
        const messages = conversationManager.getMessages(systemPrompt);

        if (this.config.ai.provider === 'anthropic') {
            return this.routeToAnthropic(messages, intent);
        } else {
            return this.routeToOllama(messages, intent);
        }
    }

    async executeTool(toolName, toolArgs) { /* ... */ }
}
```

**Rationale:**
- Centralizes AI provider switching logic (DRY)
- Makes it easy to add new providers (OpenAI, Google Gemini, etc.)
- Isolates tool execution from orchestration
- Can be reused in Oracle Next.js app

**Alternatives Considered:**

**A. Strategy Pattern with Provider Interfaces:**
```javascript
class OllamaProvider implements AIProvider { query() {} }
class AnthropicProvider implements AIProvider { query() {} }
```
- ❌ Over-engineering for 2 providers
- ❌ JavaScript has no interfaces (would need runtime checks)
- ✅ More extensible for many providers

**B. Keep Provider Logic in Orchestrator:**
- ❌ Violates SRP (orchestrator shouldn't know about AI provider details)
- ❌ Hard to test provider-specific logic
- ✅ Simpler initial implementation

### Decision 5: VoiceInteractionOrchestrator as Facade

**Chosen Approach:**
VoiceInteractionOrchestrator provides single public method `processVoiceInteraction(audioSamples)`:

```javascript
class VoiceInteractionOrchestrator {
    async processVoiceInteraction(audioSamples) {
        // 1. Transcribe
        const transcription = await this.transcriptionService.transcribe(audioSamples);

        // 2. Classify intent
        const intent = this.intentClassifier.classify(transcription);

        // 3. Get AI response
        const aiResponse = await this.aiRouter.query(transcription, intent);

        // 4. Speak response (TTS)
        if (this.config.tts.enabled) {
            await this.speakResponse(aiResponse);
        }

        // 5. Update conversation state
        conversationManager.addAssistantMessage(aiResponse);

        // 6. Publish MQTT events
        await this.publishEvents(transcription, aiResponse);
    }
}
```

**Rationale:**
- Facade pattern simplifies external API (main.js only needs one call)
- Encapsulates complete pipeline in logical order
- Easy to add cross-cutting concerns (logging, metrics, error handling)
- Clear contract: audioSamples in → voice response out

**Alternatives Considered:**

**A. Expose Individual Steps Publicly:**
```javascript
orchestrator.transcribe(samples);
orchestrator.classify(text);
orchestrator.query(text, intent);
```
- ❌ Couples caller to implementation details
- ❌ Caller must know correct order of operations
- ✅ More flexibility for advanced use cases

**B. Pipeline/Chain Pattern:**
```javascript
const pipeline = new Pipeline()
    .step(TranscriptionService)
    .step(IntentClassifier)
    .step(AIRouter)
    .step(TTSService);
await pipeline.execute(audioSamples);
```
- ❌ Over-engineering for linear flow
- ❌ Harder to understand for presentation
- ✅ More flexible for conditional steps

## Risks / Trade-offs

### Risk 1: Breaking Changes During Migration
**Risk:** Incorrect migration could break voice interaction flow before presentation demo

**Mitigation:**
1. Create all new services first (additive changes only)
2. Test each service independently before integration
3. Keep BackgroundTranscriber until VoiceInteractionOrchestrator is fully tested
4. Use feature flag to toggle between old and new implementations during testing
5. End-to-end testing with actual hardware before deleting old code

**Impact if Realized:** High (demo failure)
**Likelihood:** Medium (complex refactor with many dependencies)

### Risk 2: Performance Regression
**Risk:** Additional abstraction layers could add latency to voice pipeline

**Mitigation:**
1. Benchmark before/after refactor (measure total pipeline time)
2. Avoid unnecessary object creation in hot paths
3. Reuse service instances (don't create new ones per interaction)
4. Profile with actual Raspberry Pi 5 hardware
5. Target: Maintain <7s voice response pipeline

**Impact if Realized:** Medium (slower demo, user frustration)
**Likelihood:** Low (same logic, just reorganized)

### Risk 3: Increased Complexity for Simple Use Cases
**Risk:** Four services instead of one class may feel over-engineered

**Trade-off:**
- **Cost:** More files to navigate, more indirection to follow
- **Benefit:** Each service is simpler to understand individually
- **Mitigation:** Clear documentation, architecture diagram in README, well-named classes

**Decision:** Accept trade-off - benefits outweigh costs for presentation demo and future maintenance

### Risk 4: Testing Coverage May Not Reach Targets
**Risk:** Unit testing each service may reveal gaps or untestable code

**Mitigation:**
1. Start with TranscriptionService and IntentClassifier (easiest to test)
2. Use dependency injection to make AIRouter testable (mock OllamaClient, AnthropicClient)
3. Create integration tests for VoiceInteractionOrchestrator
4. Accept lower coverage initially, improve over time
5. Document which paths are covered and which are manual-test-only

**Impact if Realized:** Low (testing is non-goal for presentation)
**Likelihood:** Medium (testing is hard with hardware dependencies)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         main.js                                  │
│  (XState machine handles wake word → audio recording)           │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ audioSamples (Float32Array)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│           VoiceInteractionOrchestrator                           │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ processVoiceInteraction(audioSamples)                      │ │
│  │  1. Transcribe audio → text                                │ │
│  │  2. Classify intent                                        │ │
│  │  3. Route to AI with tools                                 │ │
│  │  4. Speak response (TTS)                                   │ │
│  │  5. Update conversation                                    │ │
│  │  6. Publish MQTT events                                    │ │
│  └────────────────────────────────────────────────────────────┘ │
└───┬──────────────┬──────────────┬──────────────┬────────────────┘
    │              │              │              │
    │              │              │              │
    ▼              ▼              ▼              ▼
┌───────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────┐
│Transcribe │ │ Intent   │ │ AIRouter │ │ ConversationMgr│
│Service    │ │Classifier│ │          │ │ (singleton)    │
│           │ │          │ │          │ │                │
│- validate │ │- detect  │ │- route   │ │- addMessage    │
│- write    │ │  Device  │ │  to      │ │- getMessages   │
│  WAV      │ │  Query   │ │  Ollama  │ │- getSummary    │
│- call     │ │- detect  │ │- route   │ └────────────────┘
│  Whisper  │ │  DateTime│ │  to      │
│- cleanup  │ │- detect  │ │  Anthrop.│
└───────────┘ │  Control │ │- execute │
              │- classify│ │  tools   │
              └──────────┘ │- build   │
                           │  prompts │
                           └──────────┘
                                │
                ┌───────────────┴───────────────┐
                │                               │
                ▼                               ▼
        ┌───────────────┐             ┌─────────────────┐
        │ OllamaClient  │             │ AnthropicClient │
        │ (existing)    │             │ (existing)      │
        │               │             │                 │
        │- query()      │             │- query()        │
        │- chat()       │             │- invoke()       │
        │- tools support│             │- stream()       │
        └───────────────┘             └─────────────────┘
```

## Migration Plan

### Phase 1: Create New Services (Week 1)
1. Create `src/services/` and `src/ai/` directories
2. Implement IntentClassifier with tests
3. Implement TranscriptionService with tests
4. Implement AIRouter with tests (use mocks for AI clients)
5. Run unit tests, verify all pass

**Rollback:** Delete new files, no impact on existing code

### Phase 2: Create Orchestrator (Week 1-2)
1. Implement VoiceInteractionOrchestrator
2. Wire up dependencies (TranscriptionService, IntentClassifier, AIRouter)
3. Add audio feedback (beeps), TTS, MQTT publishing, conversation updates
4. Write integration tests
5. Run tests, verify pipeline works end-to-end

**Rollback:** Keep BackgroundTranscriber as fallback

### Phase 3: Update main.js (Week 2)
1. Add feature flag `USE_NEW_ORCHESTRATOR` in config
2. Update main.js to conditionally use VoiceInteractionOrchestrator or BackgroundTranscriber
3. Test with feature flag ON using actual hardware
4. Compare performance benchmarks (old vs new)
5. Verify beeps, TTS, MQTT, conversation history all work correctly

**Rollback:** Set feature flag to false, use old code

### Phase 4: Cleanup (Week 2)
1. Remove feature flag (use new orchestrator permanently)
2. Delete BackgroundTranscriber.js
3. Update documentation (README, CLAUDE.md)
4. Run full test suite
5. End-to-end demo test with Z-Wave devices

**Rollback:** Git revert commits, restore BackgroundTranscriber from history

### Deployment Strategy
- Deploy to development Raspberry Pi first
- Test for 2-3 days with daily voice command usage
- Monitor logs for errors or unexpected behavior
- If stable, deploy to presentation Raspberry Pi
- Keep backup SD card with old code until presentation day

## Open Questions

1. **Q: Should IntentClassifier support loading custom patterns from config?**
   **A:** Defer to future. Current hardcoded patterns are sufficient for demo. Make it easy to refactor later.

2. **Q: Should AIRouter cache responses for identical queries?**
   **A:** No. Voice queries are conversational and context-dependent. Caching would break natural flow.

3. **Q: Should we add metrics/observability to each service?**
   **A:** Defer to future. Current logging is sufficient for demo. Focus on correctness first, observability later.

4. **Q: Should TranscriptionService support multiple speech recognition engines (not just Whisper)?**
   **A:** No. Whisper is sufficient for demo. Keep it simple.

5. **Q: Should we create abstract base classes for services?**
   **A:** No. JavaScript doesn't have interfaces, and we're not using TypeScript. Duck typing is fine.

6. **Q: Should VoiceInteractionOrchestrator emit events instead of directly calling MQTT publish?**
   **A:** Defer to future. Direct calls are simpler for now. Event-driven architecture can be added later if needed.
