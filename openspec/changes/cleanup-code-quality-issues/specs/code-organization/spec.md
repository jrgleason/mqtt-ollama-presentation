# code-organization Spec Delta

## ADDED Requirements

### Requirement: Consistent Logging Usage

All application code SHALL use the centralized `logger` utility instead of direct `console.*` calls.

**Rationale:** Using the logger utility ensures:
- Consistent log formatting across the application
- Log level filtering (debug/info/warn/error) respects configuration
- Structured logging with context objects
- Easier production debugging

**Exceptions:**
- `config.js` may use `console.*` during early startup before logger is available
- Test files may use `console.*` for test output

#### Scenario: Tool files use logger

- **GIVEN** a tool file (e.g., `datetime-tool.js`, `volume-control-tool.js`)
- **WHEN** logging is needed for debugging or errors
- **THEN** the file imports `logger` from `../util/Logger.js`
- **AND** uses `logger.debug()`, `logger.info()`, `logger.warn()`, or `logger.error()`
- **AND** does NOT use `console.log()`, `console.warn()`, or `console.error()`

#### Scenario: Service files use logger

- **GIVEN** a service file (e.g., `ToolManager.js`)
- **WHEN** logging is needed
- **THEN** the file uses the injected `logger` or imports from `../util/Logger.js`
- **AND** does NOT use direct `console.*` calls

---

### Requirement: No Dead Code Exports

Modules SHALL NOT export deprecated functions or backward-compatibility shims that have no consumers.

**Rationale:** Dead code increases maintenance burden, confuses readers, and may mask actual issues.

#### Scenario: Deprecated exports are removed

- **GIVEN** a module has exports marked with `@deprecated`
- **WHEN** a codebase search confirms zero usages
- **THEN** the deprecated exports are removed entirely
- **AND** no backward-compatibility singleton patterns remain
