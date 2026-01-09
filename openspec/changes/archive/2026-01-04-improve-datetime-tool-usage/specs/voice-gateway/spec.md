# Voice Gateway DateTime Handling Delta

## MODIFIED Requirements

### Requirement: DateTime Intent Classification

The IntentClassifier MUST detect datetime queries for all common phrasings.

#### Scenario: Day of Week Query Detection
GIVEN a user asks "What day of the week is it?"
WHEN the IntentClassifier processes the transcription
THEN `isDateTimeQuery` MUST return `true`

#### Scenario: Today's Date Query Detection
GIVEN a user asks "What's the date today?"
WHEN the IntentClassifier processes the transcription
THEN `isDateTimeQuery` MUST return `true`

#### Scenario: Which Day Query Detection
GIVEN a user asks "Which day is it?"
WHEN the IntentClassifier processes the transcription
THEN `isDateTimeQuery` MUST return `true`

### Requirement: DateTime System Prompt Enhancement

The AIRouter MUST add datetime tool hints when datetime queries are detected.

#### Scenario: DateTime Hint Added to System Prompt
GIVEN a datetime query is detected (`isDateTimeQuery: true`)
WHEN the AIRouter builds the system prompt
THEN the prompt MUST include guidance to use the `get_current_datetime` tool

#### Scenario: Small Model Tool Usage
GIVEN a user asks "What day of the week is it?" using Ollama qwen3
WHEN the AI processes the query
THEN it MUST call the `get_current_datetime` tool
AND return the correct day of the week

### Requirement: Cross-Provider Compatibility

DateTime tool usage MUST work correctly with both AI providers.

#### Scenario: Anthropic DateTime Query
GIVEN the AI provider is Anthropic
WHEN a user asks a datetime question
THEN the tool MUST be called and return correct information

#### Scenario: Ollama DateTime Query
GIVEN the AI provider is Ollama
WHEN a user asks a datetime question
THEN the tool MUST be called and return correct information
