# Tasks: Add Response Validation Pass

## Implementation Tasks

- [ ] Add configuration options for response validation (RESPONSE_VALIDATION_ENABLED, RESPONSE_VALIDATION_MODEL)
- [ ] Create validation prompt in `prompts/system/response-validation.md`
- [ ] Implement `validateResponse()` function in AnthropicClient (or new ResponseValidator service)
- [ ] Integrate validation into VoiceInteractionOrchestrator before TTS finalize
- [ ] Add logging for validation latency and changes made
- [ ] Add tests for validation scenarios (typos, markdown, incomplete sentences)
- [ ] Update `.env.example` with new configuration options
- [ ] Document the feature in README or DEVELOPER_GUIDE

## Validation Test Cases

- [ ] Fix split words from streaming tokens
- [ ] Remove markdown formatting (**, *, #, etc.)
- [ ] Remove code blocks and inline code
- [ ] Fix incomplete sentences
- [ ] Remove repeated words/phrases
- [ ] Handle empty or null responses gracefully
