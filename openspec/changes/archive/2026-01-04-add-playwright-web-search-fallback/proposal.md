# Change: Add Playwright Web Search Fallback

> **ARCHIVED WITHOUT COMPLETION (2026-01-04)**
>
> This proposal was abandoned due to fundamental design flaws discovered during implementation:
> - **CAPTCHA Blocking**: Search engines frequently block automated browser requests with CAPTCHAs, making the fallback unreliable
> - **High Latency**: Browser automation adds 3-5+ seconds latency, unacceptable for voice interaction
> - **Wrong Year in Queries**: The approach resulted in incorrect date context in search queries
>
> A better approach would be to use official search APIs (with rate limits/costs) or accept that local AI models have knowledge cutoffs.

## Why

When the AI (especially smaller Ollama models) can't answer a question, it returns unhelpful responses like "I don't have access to real-time information" or "I can't search the web." The current DuckDuckGo Instant Answer API is limited to simple factual queries and often returns "No direct answer found."

By integrating the Playwright MCP server, the voice gateway can perform actual web searches when the AI doesn't know an answer, dramatically improving response quality for knowledge questions.

## What Changes

- Add Playwright MCP server as a new MCP integration
- Create fallback detection logic to identify "I don't know" responses
- Implement web search workflow using Playwright browser automation
- Add retry logic that searches the web and re-queries the AI with results
- Configure Playwright for headless operation on Raspberry Pi

## Impact

- Affected specs: `voice-gateway`, `mcp-integration`
- Affected code:
  - `apps/voice-gateway-oww/src/ai/AIRouter.js` - Add fallback detection and retry
  - `apps/voice-gateway-oww/src/services/WebSearchFallback.js` - New fallback service
  - `apps/voice-gateway-oww/src/config.js` - Playwright MCP configuration
  - `apps/voice-gateway-oww/package.json` - Add @anthropic/mcp-playwright dependency

## Architecture

```
User Question
     ↓
AI Query (Ollama/Anthropic)
     ↓
Response Analysis
     ├── Has answer? → Return response
     └── "I don't know" detected?
              ↓
         Playwright MCP
              ↓
         Navigate to DuckDuckGo/Google
              ↓
         Extract search results
              ↓
         Re-query AI with context
              ↓
         Return enriched response
```

## Fallback Detection Patterns

The system will detect fallback-triggering responses:
- "I don't have access to"
- "I cannot search"
- "I don't have real-time"
- "I'm not able to browse"
- "I cannot access the internet"
- "No direct answer found"

## Configuration

```bash
# New environment variables
PLAYWRIGHT_MCP_ENABLED=true
PLAYWRIGHT_HEADLESS=true
PLAYWRIGHT_TIMEOUT=10000
WEB_SEARCH_FALLBACK_ENABLED=true
```

## Risks

- **Performance**: Web search adds 3-5 seconds latency
  - Mitigation: Only trigger on fallback, cache results
- **Reliability**: Browser automation can be flaky
  - Mitigation: Timeout handling, graceful degradation
- **Resources**: Playwright needs memory on Pi
  - Mitigation: Use lightweight browser (Chromium), limit concurrent searches

## Success Criteria

- [ ] Playwright MCP connects successfully on startup
- [ ] "I don't know" responses trigger web search fallback
- [ ] Search results are extracted and passed to AI
- [ ] AI provides improved response with search context
- [ ] Fallback completes within 10 seconds
- [ ] Works on both macOS and Raspberry Pi
