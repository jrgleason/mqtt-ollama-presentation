# Proposal: Add Search Refinement Support

## Problem Statement

When the AI performs a web search and receives results that don't fully answer the user's question, it currently cannot refine its search query. After the first tool call, tools are stripped from the follow-up to prevent infinite loops, but this also prevents legitimate refinement searches.

**Example scenario:**
1. User asks: "Who is the lieutenant governor of Ohio?"
2. AI searches: "lieutenant governor Ohio"
3. Results mention Ohio government but don't name the specific person
4. AI wants to search again with "Ohio lieutenant governor 2026 name" but cannot
5. AI gives a vague or incorrect answer

## Proposed Solution

Allow the AI to perform up to 2 tool call iterations (initial search + 1 refinement), with safeguards to prevent infinite loops.

### Key Design Decisions

1. **Maximum iterations**: Limit to 2 total searches (configurable)
2. **First iteration**: After initial search results, keep tools bound and allow refinement
3. **Second iteration**: Force answer - strip tools to prevent further calls
4. **Follow-up prompt**: Clearly communicate whether refinement is allowed

### Implementation Approach

Modify `OllamaClient.js` tool execution loop to:

1. Track iteration count during tool call handling
2. After first tool result, use modified follow-up prompt:
   - "If this answers the question, respond in 1 sentence. If you need more specific info, you may search again."
3. Keep tools bound for first follow-up
4. If model requests another search, execute it and add results
5. On second iteration, force answer with stripped tools

## Scope

- **In scope**: OllamaClient iterative tool calling, AnthropicClient parity
- **Out of scope**: Multi-tool parallel execution, tool result caching

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Infinite loop | Hard limit of 2 iterations |
| Slower responses | Only one extra search allowed |
| Increased token usage | Small models already filtered to 2 tools |

## Success Criteria

1. AI can refine search queries when initial results are insufficient
2. No infinite loops occur
3. Response time increases by max 3-5 seconds for refinement cases
4. Lieutenant governor query returns correct answer (Jim Tressel)

## Dependencies

- Tool filtering for Ollama (already implemented)
- Increased numPredict (already implemented)
