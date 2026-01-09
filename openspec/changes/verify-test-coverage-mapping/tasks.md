# Tasks: Verify Test Coverage and Map Tests to Gherkin Scenarios

## Phase 1: Measure Coverage (3 tasks)

### 1.1 Run coverage for voice-gateway-oww module
- [ ] Run `npm run test:coverage` in `apps/voice-gateway-oww`
- [ ] Capture line, branch, function, and statement coverage percentages
- [ ] Note any test failures that need attention

### 1.2 Run coverage for zwave-mcp-server module
- [ ] Run coverage in `apps/zwave-mcp-server` (add script if needed)
- [ ] Capture coverage percentages
- [ ] Note any test failures

### 1.3 Run coverage for oracle module
- [ ] Run `npm run test:coverage` in `apps/oracle`
- [ ] Capture coverage percentages
- [ ] Note any test failures

## Phase 2: Inventory Tests (4 tasks)

### 2.1 Catalog voice-gateway-oww test files
- [ ] List all test files with their describe/test blocks
- [ ] Document what each test file covers
- [ ] Note which source files each test targets

### 2.2 Catalog zwave-mcp-server test files
- [ ] List all test files with their describe/test blocks
- [ ] Document what each test file covers
- [ ] Note which source files each test targets

### 2.3 Catalog oracle test files
- [ ] List all test files with their describe/test blocks
- [ ] Document what each test file covers
- [ ] Note which source files each test targets

### 2.4 Create test inventory summary
- [ ] Total test count per module
- [ ] Test file organization patterns
- [ ] Identify any orphaned or duplicate tests

## Phase 3: Map Tests to Gherkin Scenarios (14 tasks - one per spec)

### 3.1 Map voice-gateway spec (88 scenarios)
- [ ] Review each scenario in `specs/voice-gateway/spec.md`
- [ ] Find corresponding test in test files
- [ ] Document mapping in traceability matrix

### 3.2 Map tool-execution spec (60 scenarios)
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

## Phase 4: Create Documentation (4 tasks)

### 4.1 Create traceability matrix document
- [ ] Create `docs/test-coverage-mapping.md`
- [ ] Add coverage summary section
- [ ] Add per-spec mapping tables
- [ ] Include test file references

### 4.2 Generate coverage gap report
- [ ] List scenarios without test coverage
- [ ] Prioritize gaps by importance
- [ ] Recommend high-priority tests to add

### 4.3 Add test references to spec files (optional)
- [ ] Consider adding `<!-- Test: path/to/test.js:lineNumber -->` comments
- [ ] Improves spec-to-test navigation
- [ ] May defer to separate proposal

### 4.4 Update docs/tasks.md with findings
- [ ] Add test coverage improvement tasks
- [ ] Reference the traceability matrix
- [ ] Mark verification as complete

## Phase 5: Validation (2 tasks)

### 5.1 Review coverage thresholds
- [ ] Compare coverage to industry standards (80%+ recommended)
- [ ] Identify critical paths with low coverage
- [ ] Document acceptance criteria for demo readiness

### 5.2 Create coverage maintenance plan
- [ ] Document how to keep mapping updated
- [ ] Consider CI integration for coverage checks
- [ ] Add coverage commands to CLAUDE.md if useful

---

**Total Tasks: 27**
**Estimated Effort: Medium (documentation and analysis work)**
