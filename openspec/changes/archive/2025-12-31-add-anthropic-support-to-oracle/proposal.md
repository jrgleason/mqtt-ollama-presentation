# Proposal: Add Anthropic Support to Oracle

## Problem Statement

The oracle application currently only supports Ollama as an AI provider. The voice-gateway application supports both Ollama and Anthropic, allowing users to choose between local AI (Ollama) and cloud AI (Anthropic) based on their needs.

**Current Limitations:**
- Oracle users must use Ollama exclusively
- Cannot leverage Anthropic's superior reasoning capabilities for complex queries
- Inconsistent with voice-gateway which offers both providers
- Users cannot match their voice-gateway provider choice in the oracle UI

### User Impact

Users who prefer Anthropic Claude models for better accuracy and reasoning cannot use the oracle web interface effectively. This creates an inconsistent experience where voice commands can use Anthropic but the web UI cannot.

## Proposed Solution

Add Anthropic support to the oracle application using the same pattern as the voice-gateway:

1. Add `@langchain/anthropic` dependency to oracle's package.json
2. Create an `AnthropicClient` abstraction similar to `OllamaClient`
3. Add AI provider selection logic in the chat API route
4. Add `AI_PROVIDER`, `ANTHROPIC_API_KEY`, and `ANTHROPIC_MODEL` environment variables
5. Update `.env.example` with Anthropic configuration

### Key Design Decisions

1. **Where:** Implement in oracle's `/api/chat/route.js` and new `src/lib/anthropic/client.js`
2. **Pattern:** Mirror voice-gateway's provider routing pattern (consistency across apps)
3. **Configuration:** Use `AI_PROVIDER` env var (same as voice-gateway)
4. **Tool Compatibility:** Both providers must work with existing MCP tools and calculator tool
5. **Streaming:** Preserve existing streaming behavior for both providers

### Benefits

- **Consistency:** Oracle and voice-gateway use same provider selection pattern
- **Flexibility:** Users can choose based on use case (local privacy vs cloud accuracy)
- **Minimal Change:** Leverages existing LangChain abstractions (`@langchain/anthropic`, `@langchain/ollama`)
- **Tool Preservation:** Existing MCP tools and custom tools work unchanged
- **No Breaking Changes:** Defaults to existing Ollama behavior if `AI_PROVIDER` not set

### Risks

- **Low:** This follows a proven pattern from voice-gateway
- **Testing Required:** Ensure tool calling works correctly with Anthropic's format
- **API Key Management:** Users need to provide Anthropic API key (documented in .env.example)

## Acceptance Criteria

1. ✅ `@langchain/anthropic` added to oracle's package.json
2. ✅ `src/lib/anthropic/client.js` created with `createAnthropicClient()` function
3. ✅ Chat API route supports AI_PROVIDER environment variable
4. ✅ When `AI_PROVIDER=anthropic`, oracle uses Anthropic Claude models
5. ✅ When `AI_PROVIDER=ollama` (or unset), oracle uses Ollama (backward compatible)
6. ✅ Both providers work with MCP tools (list_zwave_devices, control_zwave_device, etc.)
7. ✅ Both providers work with custom tools (calculator)
8. ✅ `.env.example` updated with Anthropic configuration examples
9. ✅ README.md updated with provider selection documentation

## Out of Scope

- UI for selecting provider at runtime (environment variable is sufficient)
- Auto-detection of available providers (user explicitly configures)
- Provider-specific model selection UI (use environment variable)
- Streaming optimizations specific to Anthropic (preserve current behavior)

## References

- Voice-gateway AIRouter: `apps/voice-gateway-oww/src/ai/AIRouter.js`
- Voice-gateway config: `apps/voice-gateway-oww/src/config.js` lines 89-103
- Current oracle chat route: `apps/oracle/src/app/api/chat/route.js`
- Current oracle Ollama client: `apps/oracle/src/lib/ollama/client.js`
- LangChain Anthropic: https://js.langchain.com/docs/integrations/chat/anthropic
