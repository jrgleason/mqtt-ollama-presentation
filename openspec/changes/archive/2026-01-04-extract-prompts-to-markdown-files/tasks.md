# Tasks: extract-prompts-to-markdown-files

## Implementation Tasks

### Phase 1: Create Infrastructure

- [x] **1.1** Create prompts directory structure
  - Create `apps/voice-gateway-oww/prompts/`
  - Create `prompts/system/` subdirectory
  - Create `prompts/tools/` subdirectory
  - Create `prompts/README.md` with documentation for prompt authors
  - **Validation:** Directories exist ✅

- [x] **1.2** Create prompt-loader.js utility
  - Create `src/util/prompt-loader.js`
  - Implement `loadPrompt(name, vars)` function
  - Implement `preloadPrompts()` for startup validation
  - Add caching with Map
  - Handle template variable substitution `{{var}}`
  - Strip markdown frontmatter if present
  - **Validation:** Unit tests pass for loader ✅

- [x] **1.3** Add prompt-loader tests
  - Create `src/__tests__/prompt-loader.test.js`
  - Test loading existing prompt
  - Test template variable substitution
  - Test caching behavior
  - Test missing file error
  - **Validation:** All tests pass ✅

### Phase 2: Extract System Prompts

- [x] **2.1** Extract main system prompt
  - Create `prompts/system/home-assistant.md` from AIRouter.defaultSystemPrompt
  - Keep base personality and rules (exclude Ollama-specific hints)
  - **Validation:** Content matches original minus Ollama hints ✅

- [x] **2.2** Extract Ollama-specific hints
  - Create `prompts/system/ollama-hints.md`
  - Content: "Do NOT use <think> tags."
  - **Validation:** File exists with correct content ✅

- [x] **2.3** Extract device context prompt
  - Create `prompts/system/device-context.md`
  - Content from AIRouter.buildSystemPrompt device hint
  - **Validation:** Content matches original ✅

- [x] **2.4** Extract datetime context prompt
  - Create `prompts/system/datetime-context.md`
  - Content from AIRouter.buildSystemPrompt datetime hint
  - **Validation:** Content matches original ✅

- [x] **2.5** Update AIRouter to use prompt loader
  - Import loadPrompt from prompt-loader.js
  - Replace inline systemPrompt with loadPrompt calls
  - Compose prompts from multiple files
  - **Validation:** AIRouter tests pass ✅

### Phase 3: Extract Tool Prompts

- [x] **3.1** Extract search tool description
  - Create `prompts/tools/search-web.md`
  - Include `{{year}}` placeholder for current year
  - Copy content from searchTool.function.description
  - **Validation:** Content matches (with {{year}} substitution) ✅

- [x] **3.2** Extract search query parameter description
  - Create `prompts/tools/search-web-query.md`
  - Include `{{year}}` placeholder
  - Copy from searchTool.function.parameters.properties.query.description
  - **Validation:** Content matches ✅

- [x] **3.3** Update search-tool.js to use prompt loader
  - Import loadPrompt
  - Replace description with loadPrompt('tools/search-web', { year })
  - Replace query.description with loadPrompt('tools/search-web-query', { year })
  - **Validation:** Tool definition works, tests pass ✅

- [x] **3.4** Extract datetime tool description
  - Create `prompts/tools/datetime.md`
  - Copy from dateTimeTool.function.description
  - **Validation:** Content matches ✅

- [x] **3.5** Update datetime-tool.js to use prompt loader
  - Import loadPrompt
  - Replace description with loadPrompt('tools/datetime')
  - **Validation:** Tool works, tests pass ✅

- [x] **3.6** Extract volume control tool description
  - Create `prompts/tools/volume-control.md`
  - Copy from volumeControlTool.function.description
  - **Validation:** Content matches ✅

- [x] **3.7** Update volume-control-tool.js to use prompt loader
  - Import loadPrompt
  - Replace description with loadPrompt('tools/volume-control')
  - **Validation:** Tool works ✅

### Phase 4: Clean Up Fallback Prompts

- [x] **4.1** Update AnthropicClient fallback
  - Import loadPrompt
  - Replace inline fallback with loadPrompt('system/home-assistant')
  - **Validation:** Client works, no duplicate prompt ✅

- [x] **4.2** Update OllamaClient fallback
  - Import loadPrompt
  - Replace inline fallback with loadPrompt('system/home-assistant')
  - Append Ollama hints from loadPrompt('system/ollama-hints')
  - **Validation:** Client works, no duplicate prompt ✅

### Phase 5: Startup Validation

- [x] **5.1** Add preload call to main.js
  - Import preloadPrompts from prompt-loader.js
  - Call preloadPrompts() early in startup
  - **Validation:** Missing prompt causes startup failure ✅

- [x] **5.2** Run full test suite
  - Run `npm test` in voice-gateway-oww
  - Verify all tests pass
  - **Validation:** 282 tests passed, 11 skipped ✅

- [x] **5.3** Manual verification
  - Start voice gateway
  - Test voice interaction
  - Verify prompts work correctly
  - **Validation:** Voice gateway works end-to-end ✅

## Dependencies

- Task 1.2 must complete before Phase 2-4 (loader needed first)
- Task 2.1-2.4 can run in parallel (independent files)
- Task 3.1-3.7 can run in parallel (independent files)
- Phase 5 must run after all other phases

## Parallelization Notes

- Tasks 2.1-2.4 are independent (different prompt files)
- Tasks 3.1, 3.2 should be done together (same tool)
- Tasks 3.4, 3.5 should be done together (same tool)
- Tasks 3.6, 3.7 should be done together (same tool)
- Tasks 4.1, 4.2 can run in parallel

## Rollback Plan

If issues arise:
1. Revert prompt-loader.js import in affected files
2. Restore inline prompt strings from git history
3. Keep prompts/ directory for future attempt
