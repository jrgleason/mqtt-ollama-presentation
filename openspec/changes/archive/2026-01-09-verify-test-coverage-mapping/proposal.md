# Proposal: Verify Test Coverage and Map Tests to Gherkin Scenarios

## Priority: HIGH

## Summary

Verify test coverage percentage across all modules and create a comprehensive mapping between test files and Gherkin scenarios in OpenSpec documentation to ensure traceability and identify coverage gaps.

## Problem Statement

The project has:
- **14 spec files** containing **396 Gherkin scenarios** defining expected behavior
- **~23 project test files** with **~515 test assertions**
- **No documented mapping** between tests and specs

Without this mapping:
1. We cannot verify which Gherkin scenarios are covered by tests
2. We cannot measure true specification coverage (not just code coverage)
3. New developers cannot find tests that verify specific behaviors
4. Coverage gaps may exist without awareness

## Goals

1. **Measure Coverage**: Run test coverage and document percentage for each module
2. **Map Tests to Specs**: Create a traceability matrix linking test files to Gherkin scenarios
3. **Identify Gaps**: Document which Gherkin scenarios lack test coverage
4. **Improve Discoverability**: Add test location references to spec documentation

## Scope

### In Scope
- All three application modules: `voice-gateway-oww`, `zwave-mcp-server`, `oracle`
- All 14 spec files in `openspec/specs/`
- Coverage percentage measurement using Jest
- Creating `docs/test-coverage-mapping.md` with traceability matrix

### Out of Scope
- Writing new tests (separate proposal)
- Modifying spec files (only adding test references as comments)
- Integration/E2E test setup

## Success Criteria

1. Coverage percentages documented for all modules
2. Traceability matrix created linking all 396 scenarios to their tests (or marking as "Not Covered")
3. Summary statistics showing coverage percentage by spec
4. Recommendations for high-priority gaps

## Stakeholders

- Development team - needs test visibility
- Presentation preparation - needs confidence in test coverage before demo

## Timeline

**Target Completion**: Before January 12, 2026 presentation

## References

- Existing specs: `openspec/specs/`
- Test files: `apps/*/src/__tests__/*.test.js`, `apps/*/tests/*.test.js`
- Jest coverage: `npm run test:coverage`
