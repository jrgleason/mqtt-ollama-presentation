# documentation Specification Delta

## ADDED Requirements

### Requirement: Test Coverage Documentation
The project SHALL maintain a test coverage mapping document that links Gherkin scenarios to their corresponding test implementations.

#### Scenario: Test coverage summary exists
- **GIVEN** the project documentation at `docs/test-coverage-mapping.md`
- **WHEN** a developer reviews the documentation
- **THEN** they find a summary table showing coverage percentages for each module (voice-gateway-oww, zwave-mcp-server, oracle)

#### Scenario: Traceability matrix links scenarios to tests
- **GIVEN** the test coverage mapping document
- **WHEN** a developer looks up a specific Gherkin scenario from any spec
- **THEN** they find a reference to the test file and test name that verifies that scenario, or a "Not Covered" indicator

#### Scenario: Coverage gap report identifies missing tests
- **GIVEN** the test coverage mapping document
- **WHEN** a developer reviews the coverage gaps section
- **THEN** they find a prioritized list of Gherkin scenarios that lack test coverage

#### Scenario: Coverage percentages are measurable
- **GIVEN** Jest coverage is configured for all modules
- **WHEN** running `npm run test:coverage` from the root
- **THEN** coverage reports are generated showing line, branch, function, and statement coverage

---

### Requirement: Test-to-Spec Traceability
Each test file SHALL document which OpenSpec requirements and scenarios it validates through naming conventions or comments.

#### Scenario: Test file documents spec coverage
- **GIVEN** a test file in `apps/*/src/__tests__/*.test.js`
- **WHEN** a developer opens the test file
- **THEN** they find comments or describe block names that reference the corresponding spec requirement

#### Scenario: Spec files reference test locations
- **GIVEN** a Gherkin scenario in a spec file
- **WHEN** a developer needs to find the corresponding test
- **THEN** they can look up the scenario in the traceability matrix document

---

### Requirement: Coverage Maintenance Process
The project SHALL define a process for keeping test coverage documentation current.

#### Scenario: New tests update the mapping
- **GIVEN** a developer adds a new test
- **WHEN** the test covers a previously uncovered scenario
- **THEN** the developer updates the traceability matrix to reflect the new coverage

#### Scenario: Coverage is verified before release
- **GIVEN** the project is preparing for the presentation
- **WHEN** the team reviews readiness
- **THEN** they confirm test coverage percentages meet minimum thresholds (documented in the mapping)
