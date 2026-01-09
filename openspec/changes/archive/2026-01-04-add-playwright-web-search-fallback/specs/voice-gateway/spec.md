# Voice Gateway Web Search Fallback Delta

## ADDED Requirements

### Requirement: Web Search Fallback Detection

The voice gateway SHALL detect when the AI cannot answer a question and trigger a web search fallback.

#### Scenario: Detect "I don't know" response

- **GIVEN** the AI responds with "I don't have access to real-time information"
- **WHEN** the response is analyzed for fallback triggers
- **THEN** the fallback detection returns true
- **AND** a web search is initiated with the original query

#### Scenario: Detect search limitation response

- **GIVEN** the AI responds with "I cannot search the web"
- **WHEN** the response is analyzed for fallback triggers
- **THEN** the fallback detection returns true
- **AND** the original user question is used for web search

#### Scenario: Normal response does not trigger fallback

- **GIVEN** the AI responds with a direct answer like "Paris is the capital of France"
- **WHEN** the response is analyzed for fallback triggers
- **THEN** the fallback detection returns false
- **AND** the response is returned to the user unchanged

### Requirement: Playwright Web Search Execution

The voice gateway SHALL use Playwright MCP to perform web searches when fallback is triggered.

#### Scenario: Execute DuckDuckGo search

- **GIVEN** a fallback is triggered for query "current president of USA"
- **WHEN** the web search is executed
- **THEN** Playwright navigates to DuckDuckGo
- **AND** enters the search query
- **AND** waits for results to load
- **AND** extracts the top 3 result snippets

#### Scenario: Search timeout handling

- **GIVEN** a web search takes longer than PLAYWRIGHT_TIMEOUT (default 10s)
- **WHEN** the timeout is exceeded
- **THEN** the search is cancelled gracefully
- **AND** the original AI response is returned
- **AND** a warning is logged

#### Scenario: Search error handling

- **GIVEN** Playwright encounters an error (network, element not found)
- **WHEN** the error occurs
- **THEN** the fallback fails gracefully
- **AND** the original AI response is returned
- **AND** the error is logged for debugging

### Requirement: AI Re-query with Search Context

The voice gateway SHALL re-query the AI with web search results to generate an informed response.

#### Scenario: Re-query with search context

- **GIVEN** web search returns results for "current president"
- **WHEN** the AI is re-queried
- **THEN** the system prompt includes "Based on recent web search results:"
- **AND** the search snippets are included as context
- **AND** the AI generates a response using the search information

#### Scenario: Improved response quality

- **GIVEN** user asks "Who won the Super Bowl?"
- **AND** initial AI response is "I don't have access to current information"
- **WHEN** fallback search finds the answer
- **THEN** the final response includes the actual winner
- **AND** the response is factually accurate

### Requirement: Fallback Configuration

The voice gateway SHALL provide configuration options for web search fallback behavior.

#### Scenario: Disable fallback via configuration

- **GIVEN** WEB_SEARCH_FALLBACK_ENABLED is set to false
- **WHEN** the AI returns "I don't know"
- **THEN** no web search is performed
- **AND** the original response is returned

#### Scenario: Configure Playwright headless mode

- **GIVEN** PLAYWRIGHT_HEADLESS is set to true
- **WHEN** Playwright MCP initializes
- **THEN** the browser runs without visible window
- **AND** search operations work identically to headed mode

#### Scenario: Configure search timeout

- **GIVEN** PLAYWRIGHT_TIMEOUT is set to 15000
- **WHEN** a web search is initiated
- **THEN** the search is allowed 15 seconds before timeout
- **AND** longer searches complete successfully
