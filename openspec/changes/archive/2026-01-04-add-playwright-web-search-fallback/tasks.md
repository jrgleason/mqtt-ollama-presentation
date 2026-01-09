# Tasks: Add Playwright Web Search Fallback

## 1. Playwright MCP Integration

- [x] 1.1 Add `@anthropic/mcp-server-playwright` to dependencies (already available via MCP)
- [x] 1.2 Add Playwright MCP configuration to config.js (webSearchFallback settings added)
- [x] 1.3 Initialize Playwright MCP client in MCPIntegration.js (uses existing MCP tools)
- [x] 1.4 Add WEB_SEARCH_FALLBACK_* environment variables to .env.example
- [ ] 1.5 Test Playwright MCP connection on startup (manual test)

## 2. Fallback Detection Service

- [x] 2.1 Create WebSearchFallback.js service class
- [x] 2.2 Implement `shouldTriggerFallback(response)` detection
- [x] 2.3 Add configurable fallback trigger patterns (14 patterns)
- [x] 2.4 Add logging for fallback detection
- [x] 2.5 Write tests for fallback detection patterns (32 tests)

## 3. Web Search Implementation

- [x] 3.1 Implement `searchWeb(query)` method
- [x] 3.2 Navigate to DuckDuckGo search page
- [x] 3.3 Submit search query via URL parameter
- [x] 3.4 Wait for results to load
- [x] 3.5 Extract search result snippets via snapshot
- [x] 3.6 Format results for AI context
- [x] 3.7 Handle search timeout gracefully
- [x] 3.8 Write tests for search extraction

## 4. AIRouter Integration

- [x] 4.1 Add fallback retry logic to AIRouter.query()
- [x] 4.2 Check response for fallback triggers
- [x] 4.3 If triggered, perform web search
- [x] 4.4 Re-query AI with search results as context
- [x] 4.5 Return enriched response to user
- [x] 4.6 Add WEB_SEARCH_FALLBACK_ENABLED config flag
- [x] 4.7 Log fallback attempts and results

## 5. Configuration & Environment

- [x] 5.1 Add fallback settings to config.js
- [x] 5.2 Document settings in .env.example
- [x] 5.3 Update .env.offline with recommended settings
- [x] 5.4 Add WEB_SEARCH_FALLBACK_TIMEOUT default (10000)
- [x] 5.5 Fallback enabled by default

## 6. Verification

- [ ] 6.1 Test fallback with "Who is the current president?"
- [ ] 6.2 Test fallback with "What's the weather today?"
- [ ] 6.3 Test timeout handling
- [ ] 6.4 Test with Ollama provider
- [ ] 6.5 Test with Anthropic provider
- [ ] 6.6 Test on Raspberry Pi (if available)
- [x] 6.7 Run `openspec validate add-playwright-web-search-fallback --strict`
