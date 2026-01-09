# Tasks: improve-search-tool-definition

## Implementation Tasks

### Phase 1: Update Search Tool Definition

- [x] **1.1** Update `searchTool.function.description` in `search-tool.js` (lines 162-163)
  - Add "REQUIRED" prefix for current event queries
  - Add "MUST use this tool" language
  - List explicit trigger conditions (current leaders, news, prices, weather)
  - Add "DO NOT search for" section (math, definitions, historical facts)
  - Remove "Google" reference (uses DuckDuckGo)
  - Keep description under 200 tokens for small model compatibility
  - **Validation:** Count tokens in new description ✓ (~150 tokens)

- [x] **1.2** Update `searchTool.function.parameters.properties.query.description` (lines 168-172)
  - Add year inclusion guidance ("ALWAYS include the current year")
  - Add good examples with years: "US president 2026", "silver price today"
  - Add bad examples without years: "who is president" (missing year)
  - Add "don't search" examples: "2+2", "WW2 end date"
  - **Validation:** Good/Bad examples included ✓

### Phase 2: Verify System Prompt Coordination

- [x] **2.1** Review AIRouter system prompt for search guidance
  - Check `apps/voice-gateway-oww/src/ai/AIRouter.js` line 40
  - Verify system prompt doesn't contradict tool definition ✓
  - System prompt already includes: "you MUST use the search_web tool first"
  - **Validation:** No conflicting instructions ✓

- [x] **2.2** Document the coordination between system prompt and tool definition
  - Add comment in `search-tool.js` referencing system prompt ✓
  - Add comment in `AIRouter.js` referencing tool definition ✓
  - **Validation:** Comments exist in both files ✓

### Phase 3: Testing

Manual testing requires the voice gateway running. Start with: `npm run dev` in `apps/voice-gateway-oww/`

- [ ] **3.1** Test search tool behavior with voice commands

  **Test Cases (speak these aloud):**

  | Voice Command | Expected Behavior | Pass Criteria |
  |--------------|-------------------|---------------|
  | "Who is the president?" | AI calls `search_web` with query including "2026" | Logs show search tool called, response is current |
  | "Who is the president of the United States?" | AI calls `search_web` with year | Response names current president |
  | "What's the weather in Columbus?" | AI calls `search_web` | Response has weather info |
  | "What are the latest tech news?" | AI calls `search_web` with "2026" | Response has recent news |
  | "What is 2 plus 2?" | AI answers directly, NO search | No search tool call in logs |
  | "When did World War 2 end?" | AI answers directly, NO search | Static fact, no search needed |
  | "What is the capital of France?" | AI answers directly, NO search | Static fact, no search needed |
  | "What time is it?" | AI calls `get_date_time`, NO search | Datetime tool, not search |

  **How to verify:**
  - Watch console logs for `🔍 Search tool executing` messages
  - Check if query includes current year (2026) for current events
  - Verify search is NOT called for math/historical facts

  **Validation:** All 8 test cases pass

- [ ] **3.2** Test with qwen2.5:0.5b (small model)

  Ensure `AI_PROVIDER=ollama` and `OLLAMA_MODEL=qwen2.5:0.5b` in `.env`

  **Focus areas:**
  - Does the small model correctly call search_web for current events?
  - Are search queries well-formed (include year)?
  - Does the model avoid searching for math/static facts?

  **Known limitations to document:**
  - Small models may occasionally ignore tool hints
  - Query quality may be lower than larger models

  **Validation:** Requires manual testing with Ollama

- [ ] **3.3** Test with Anthropic Claude (large model) if configured

  Ensure `AI_PROVIDER=anthropic` and `ANTHROPIC_API_KEY` set in `.env`

  **Focus areas:**
  - Compare search behavior to qwen2.5
  - Are queries more precise with Claude?
  - Any differences in when search is called?

  **Validation:** Requires manual testing with Anthropic API

### Phase 4: Documentation

- [x] **4.1** Update search-tool.js file header comment
  - Note the tool definition pattern used ✓
  - Reference design.md for rationale ✓
  - **Validation:** Header comment updated ✓

- [ ] **4.2** Add entry to CLAUDE.md about tool definition patterns (optional)
  - Document the "REQUIRED/MUST" pattern for future tools
  - Reference this proposal as example
  - **Validation:** Pattern documented if added

## Dependencies

- None - this change only affects the tool definition object

## Parallelization Notes

- Tasks 1.1 and 1.2 can be done together (same file) ✓
- Tasks 2.1 and 2.2 can be done together (documentation) ✓
- Tasks 3.1, 3.2, 3.3 must be done after Phase 1 and 2
- Task 4.1 can be done anytime ✓
- Task 4.2 is optional

## Summary

**Completed:** 5/9 tasks (Phase 1, Phase 2, and documentation task 4.1)
**Remaining:** 4 tasks (3 manual testing tasks + optional CLAUDE.md update)

The core implementation is complete. Testing tasks require running the voice gateway
and verifying AI behavior manually. Task 4.2 is optional.

## Quick Test Guide

Start the voice gateway:
```bash
cd apps/voice-gateway-oww
npm run dev
```

Then speak these test phrases and watch the console:

**SHOULD trigger search (watch for `🔍 Search tool executing`):**
1. "Who is the president?"
2. "What's the weather in Columbus?"
3. "What are the latest tech news?"

**Should NOT trigger search (answer directly):**
4. "What is 2 plus 2?"
5. "When did World War 2 end?"
6. "What is the capital of France?"

**Should trigger datetime tool instead:**
7. "What time is it?"
