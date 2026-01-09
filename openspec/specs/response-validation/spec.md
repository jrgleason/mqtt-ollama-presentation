# response-validation Specification

## Purpose
TBD - created by archiving change add-response-validation-pass. Update Purpose after archive.
## Requirements
### Requirement: Optional Response Validation Pass

The system SHALL support an optional validation pass that cleans AI responses before TTS synthesis to catch formatting issues and streaming artifacts.

**Rationale:** Streaming LLM responses can produce artifacts (split words, markdown formatting) that degrade TTS quality. An optional validation pass can clean responses before speech synthesis.

#### Scenario: Validation enabled with split words

- **GIVEN** response validation is enabled via `RESPONSE_VALIDATION_ENABLED=true`
- **AND** the AI response contains a split word from streaming (e.g., "Donal d Trump")
- **WHEN** the response is validated before TTS
- **THEN** the validator corrects the split word (e.g., "Donald Trump")
- **AND** the corrected response is sent to TTS

#### Scenario: Validation removes markdown formatting

- **GIVEN** response validation is enabled
- **AND** the AI response contains markdown formatting (e.g., "**important**")
- **WHEN** the response is validated before TTS
- **THEN** the markdown is removed (e.g., "important")
- **AND** the cleaned response is sent to TTS

#### Scenario: Validation disabled by default

- **GIVEN** response validation is NOT explicitly enabled
- **WHEN** an AI response is generated
- **THEN** the response is sent directly to TTS without validation
- **AND** no additional LLM calls are made

---

### Requirement: Configurable Validation Model

The validation pass SHALL use a configurable model, defaulting to a fast/cheap model for efficiency.

**Rationale:** Validation should add minimal latency. Using a faster model (like Haiku) reduces cost and latency while still catching common issues.

#### Scenario: Custom validation model

- **GIVEN** `RESPONSE_VALIDATION_MODEL=claude-haiku-4-5-20251001` is configured
- **WHEN** response validation runs
- **THEN** the specified model is used for validation
- **AND** validation latency is logged for monitoring

