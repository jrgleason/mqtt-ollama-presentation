# Tasks: Add Search Refinement Support

## Implementation Tasks

- [ ] **Task 1: Add iteration tracking to OllamaClient tool loop**
  - Add `currentIteration` counter in tool execution section
  - Add `maxToolIterations` constant (default: 2)
  - File: `src/OllamaClient.js`

- [ ] **Task 2: Implement conditional follow-up prompts**
  - First iteration: Allow refinement search
  - Second iteration: Force answer
  - Update `followUpMessage` construction logic
  - File: `src/OllamaClient.js`

- [ ] **Task 3: Keep tools bound for first follow-up**
  - Use `modelToUse` (with tools) for iteration 1
  - Use `this.client` (no tools) for iteration 2
  - File: `src/OllamaClient.js`

- [ ] **Task 4: Handle refinement tool calls**
  - Check for `response.tool_calls` after first follow-up
  - Execute refinement tool call if present
  - Add results as new HumanMessage
  - Increment iteration counter
  - File: `src/OllamaClient.js`

- [ ] **Task 5: Add logging for refinement searches**
  - Log when refinement search is requested
  - Include iteration number and tool name
  - File: `src/OllamaClient.js`

## Validation Tasks

- [ ] **Task 6: Manual test - governor query**
  - Test: "Who is the governor of Ohio?"
  - Expected: Mike DeWine (should work with single search)

- [ ] **Task 7: Manual test - lieutenant governor query**
  - Test: "Who is the lieutenant governor of Ohio?"
  - Expected: Jim Tressel (may require refinement search)

- [ ] **Task 8: Manual test - loop prevention**
  - Test: Query that might trigger multiple searches
  - Verify: Max 2 searches occur, then forced answer

## Optional Tasks

- [ ] **Task 9: Add AnthropicClient parity** (if needed)
  - Review AnthropicClient tool loop
  - Add same refinement logic if applicable

- [ ] **Task 10: Make max iterations configurable**
  - Add `OLLAMA_MAX_TOOL_ITERATIONS` env var
  - Update config.js and OllamaClient.js
