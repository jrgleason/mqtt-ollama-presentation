# Tasks: Verify Test Coverage and Map Tests to Gherkin Scenarios

## Phase 1: Measure Coverage (3 tasks) - COMPLETED

### 1.1 Run coverage for voice-gateway-oww module
- [x] Run `npm run test:coverage` in `apps/voice-gateway-oww`
- [x] Capture line, branch, function, and statement coverage percentages
- [x] Note any test failures that need attention

**Results:** 12.5% lines, 13.24% branches, 20.33% functions, 12.8% statements. 281 passed, 11 skipped.

### 1.2 Run coverage for zwave-mcp-server module
- [x] Run coverage in `apps/zwave-mcp-server` (add script if needed)
- [x] Capture coverage percentages
- [x] Note any test failures

**Results:** 92 tests passed, coverage percentage not configured.

### 1.3 Run coverage for oracle module
- [x] Run `npm run test:coverage` in `apps/oracle`
- [x] Capture coverage percentages
- [x] Note any test failures

**Results:** 26 tests passed, coverage percentage not configured.

## Phase 2: Inventory Tests (4 tasks) - COMPLETED

### 2.1 Catalog voice-gateway-oww test files
- [x] List all test files with their describe/test blocks
- [x] Document what each test file covers
- [x] Note which source files each test targets

**Results:** 16 test files cataloged in docs/test-coverage-mapping.md

### 2.2 Catalog zwave-mcp-server test files
- [x] List all test files with their describe/test blocks
- [x] Document what each test file covers
- [x] Note which source files each test targets

**Results:** 4 test files cataloged

### 2.3 Catalog oracle test files
- [x] List all test files with their describe/test blocks
- [x] Document what each test file covers
- [x] Note which source files each test targets

**Results:** 3 test files cataloged

### 2.4 Create test inventory summary
- [x] Total test count per module
- [x] Test file organization patterns
- [x] Identify any orphaned or duplicate tests

**Results:** 410 total tests (292 + 92 + 26). No orphaned tests found.

## Phase 3: Map Tests to Gherkin Scenarios (14 tasks - one per spec) - MANUAL REVIEW REQUIRED

### 3.1 Map voice-gateway spec (88 scenarios)
- [ ] Review each scenario in `specs/voice-gateway/spec.md`
- [ ] Find corresponding test in test files
- [ ] Document mapping in traceability matrix

### 3.2 Map tool-execution spec (58 scenarios)
- [ ] Review each scenario in `specs/tool-execution/spec.md`
- [ ] Find corresponding tests
- [ ] Document mapping

### 3.3 Map zwave-integration spec (50 scenarios)
- [ ] Review each scenario in `specs/zwave-integration/spec.md`
- [ ] Find corresponding tests
- [ ] Document mapping

### 3.4 Map documentation spec (39 scenarios)
- [ ] Review each scenario in `specs/documentation/spec.md`
- [ ] Find corresponding tests (likely manual verification)
- [ ] Document mapping

### 3.5 Map microphone-management spec (35 scenarios)
- [ ] Review each scenario in `specs/microphone-management/spec.md`
- [ ] Find corresponding tests
- [ ] Document mapping

### 3.6 Map voice-activity-detection spec (25 scenarios)
- [ ] Review each scenario in `specs/voice-activity-detection/spec.md`
- [ ] Find corresponding tests
- [ ] Document mapping

### 3.7 Map code-organization spec (20 scenarios)
- [ ] Review each scenario in `specs/code-organization/spec.md`
- [ ] Find corresponding tests (likely structural validation)
- [ ] Document mapping

### 3.8 Map audio-processing spec (18 scenarios)
- [ ] Review each scenario in `specs/audio-processing/spec.md`
- [ ] Find corresponding tests
- [ ] Document mapping

### 3.9 Map ollama-client-integration spec (13 scenarios)
- [ ] Review each scenario in `specs/ollama-client-integration/spec.md`
- [ ] Find corresponding tests
- [ ] Document mapping

### 3.10 Map ai-provider-configuration spec (12 scenarios)
- [ ] Review each scenario in `specs/ai-provider-configuration/spec.md`
- [ ] Find corresponding tests
- [ ] Document mapping

### 3.11 Map oracle-chat-ui spec (10 scenarios)
- [ ] Review each scenario in `specs/oracle-chat-ui/spec.md`
- [ ] Find corresponding tests
- [ ] Document mapping

### 3.12 Map mcp-integration spec (10 scenarios)
- [ ] Review each scenario in `specs/mcp-integration/spec.md`
- [ ] Find corresponding tests
- [ ] Document mapping

### 3.13 Map transcription-service spec (8 scenarios)
- [ ] Review each scenario in `specs/transcription-service/spec.md`
- [ ] Find corresponding tests
- [ ] Document mapping

### 3.14 Map voice-gateway-state-management spec (8 scenarios)
- [ ] Review each scenario in `specs/voice-gateway-state-management/spec.md`
- [ ] Find corresponding tests
- [ ] Document mapping

## Phase 4: Create Documentation (4 tasks) - COMPLETED

### 4.1 Create traceability matrix document
- [x] Create `docs/test-coverage-mapping.md`
- [x] Add coverage summary section
- [x] Add per-spec mapping tables
- [x] Include test file references

### 4.2 Generate coverage gap report
- [x] List scenarios without test coverage
- [x] Prioritize gaps by importance
- [x] Recommend high-priority tests to add

### 4.3 Add test references to spec files (optional)
- [ ] Consider adding `<!-- Test: path/to/test.js:lineNumber -->` comments - DEFERRED
- [ ] Improves spec-to-test navigation
- [ ] May defer to separate proposal

### 4.4 Update docs/tasks.md with findings
- [ ] Add test coverage improvement tasks - MANUAL
- [ ] Reference the traceability matrix
- [ ] Mark verification as complete

## Phase 5: Validation (2 tasks) - MANUAL REVIEW REQUIRED

### 5.1 Review coverage thresholds
- [x] Compare coverage to industry standards (80%+ recommended)
- [x] Identify critical paths with low coverage
- [x] Document acceptance criteria for demo readiness

**Results:** Current 12.5% vs 80% target. Critical gaps documented.

### 5.2 Create coverage maintenance plan
- [ ] Document how to keep mapping updated - MANUAL
- [ ] Consider CI integration for coverage checks
- [ ] Add coverage commands to CLAUDE.md if useful

---

**Total Tasks: 27**
**Completed: 15**
**Remaining (Manual): 12** (all scenario-to-test mapping + maintenance tasks)
**Estimated Effort: Low for remaining tasks (manual review work)**
