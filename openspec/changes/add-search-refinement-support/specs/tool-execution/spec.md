# tool-execution Spec Delta

## ADDED Requirements

### Requirement: Iterative Tool Calling for Search Refinement

OllamaClient SHALL support iterative tool calling to allow the AI to refine search queries when initial results are insufficient.

**Rationale:** Some queries (e.g., "Who is the lieutenant governor of Ohio?") may return partial results on first search. Allowing one refinement search improves answer quality without risking infinite loops.

#### Scenario: Single search sufficient

- **GIVEN** AI executes a search tool and receives results
- **WHEN** the results contain the answer
- **THEN** AI responds directly without additional searches
- **AND** only 1 tool call iteration occurs

#### Scenario: Refinement search requested

- **GIVEN** AI executes a search tool and receives partial results
- **WHEN** AI determines more specific search is needed
- **THEN** AI can request one refinement search
- **AND** refinement results are added to context
- **AND** AI responds based on combined results
- **AND** maximum 2 tool call iterations occur

#### Scenario: Refinement loop prevention

- **GIVEN** AI has completed 2 tool call iterations
- **WHEN** follow-up response is generated
- **THEN** tools are stripped from the model
- **AND** AI is forced to answer with available information
- **AND** no further tool calls are allowed

#### Scenario: Follow-up prompt varies by iteration

- **GIVEN** AI has executed a tool call
- **WHEN** first iteration follow-up is sent
- **THEN** prompt allows refinement: "If you need more specific info, you may search again."
- **AND** tools remain bound to model

- **GIVEN** AI has completed 2 iterations
- **WHEN** final follow-up is sent
- **THEN** prompt forces answer: "Answer in 1 sentence based on this information."
- **AND** tools are stripped from model

#### Scenario: Refinement search logging

- **GIVEN** AI requests a refinement search
- **WHEN** the refinement tool call is detected
- **THEN** log includes: "Model requesting refinement search"
- **AND** log includes iteration number
- **AND** log includes tool name being called
