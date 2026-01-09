# Proposal: Add Response Validation Pass

## Summary

Add an optional validation pass that sends the AI response back to the LLM for cleanup before TTS synthesis. This catches formatting issues, typos, or artifacts from streaming that could affect speech quality.

## Problem Statement

Streaming responses from LLMs can occasionally produce artifacts:
- Partial words from token boundaries (e.g., "Donal d" instead of "Donald")
- Markdown formatting that shouldn't be spoken
- Special characters or formatting codes
- Repeated words or phrases
- Incomplete sentences

Currently, these artifacts are passed directly to TTS, resulting in poor audio quality.

## Proposed Solution

Add a configurable validation pass between AI response and TTS:

1. **Optional validation call**: After the main AI response completes, optionally send it to a fast LLM (e.g., Haiku) for cleanup
2. **Simple prompt**: "Clean this response for spoken output. Fix any typos, remove formatting, ensure complete sentences."
3. **Configurable**: Enable/disable via `RESPONSE_VALIDATION_ENABLED=true`
4. **Fast model option**: Use a cheaper/faster model for validation (configurable)

## Trade-offs

**Pros:**
- Catches streaming artifacts before TTS
- Removes markdown/formatting that shouldn't be spoken
- Improves overall response quality

**Cons:**
- Adds latency (one additional LLM call)
- Increases cost (additional API usage)
- May alter intended response content

## Configuration

```bash
# Enable response validation pass (default: false)
RESPONSE_VALIDATION_ENABLED=false

# Model to use for validation (default: same as main AI)
RESPONSE_VALIDATION_MODEL=claude-haiku-4-5-20251001
```

## Implementation Notes

- Should be implemented in VoiceInteractionOrchestrator or AnthropicClient
- Validation should be non-blocking for streaming mode (validate full response before TTS finalize)
- Consider caching validation results for identical responses
- Add metrics for validation latency

## Priority

Low - The immediate fix (removing auto-space injection in streaming) resolves the current issue. This proposal is for a more robust long-term solution.
