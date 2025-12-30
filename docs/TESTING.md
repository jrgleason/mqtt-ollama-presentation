# Testing Guide

## Test Infrastructure

This is a **Node.js monorepo** (not Java/Gradle). All testing uses Jest.

## Test Commands

### Run All Tests
```bash
# From project root
npm test           # Run all tests (voice-gateway + oracle)
npm run test:all   # Same as npm test
```

### Run Tests by Component
```bash
# Backend (voice-gateway)
npm run test:backend
npm run test:voice-gateway

# Frontend (oracle Next.js app)
npm run test:frontend
npm run test:oracle
```

### Watch Mode
```bash
# Voice gateway tests in watch mode
npm run test:watch:voice-gateway

# Oracle tests in watch mode
npm run test:watch:oracle
```

### Coverage Reports
```bash
# All coverage
npm run test:coverage:all

# Individual coverage
npm run test:coverage:voice-gateway
npm run test:coverage:oracle
```

### Linting
```bash
# All linting
npm run lint

# Individual linting
npm run lint:voice-gateway
npm run lint:oracle
```

## Test Status

### Voice Gateway (`apps/voice-gateway-oww`)
- **Test Framework:** Jest with experimental VM modules
- **Test Files:** `tests/*.test.js`
- **Test Count:** 62 tests
- **Current Status:** Most passing, some MCP retry tests failing (may need updates)
- **Run:** `cd apps/voice-gateway-oww && npm test`

### Oracle Frontend (`apps/oracle`)
- **Test Framework:** Jest + React Testing Library
- **Test Files:** `src/**/__tests__/*.test.js`
- **Test Count:** 16 tests
- **Current Status:** ✅ All passing
- **Run:** `cd apps/oracle && npm test`

### Z-Wave MCP Server (`apps/zwave-mcp-server`)
- **Test Framework:** None currently
- **Status:** No tests yet
- **TODO:** Add tests for MCP tool handlers

## Test Organization

```
mqtt-ollama-presentation/
├── package.json                    # Root test commands
├── apps/
│   ├── voice-gateway-oww/
│   │   ├── tests/                  # Jest tests
│   │   │   ├── beep-isolation.test.js
│   │   │   ├── mcp-retry.test.js
│   │   │   ├── startup-orchestration.test.js
│   │   │   ├── skip-transcription-when-silent.test.js
│   │   │   └── tool-registry-parameter-normalization.test.js
│   │   └── package.json            # Test scripts
│   ├── oracle/
│   │   ├── src/lib/__tests__/      # Jest tests
│   │   │   └── example.test.js
│   │   ├── src/lib/mqtt/__tests__/
│   │   │   └── client.test.js
│   │   └── package.json            # Test scripts
│   └── zwave-mcp-server/
│       └── package.json            # No test script yet
```

## Known Issues

### MCP Retry Tests
Some tests in `apps/voice-gateway-oww/tests/mcp-retry.test.js` are failing. These appear to be:
- Flaky connection timeout tests
- May need mock updates or timing adjustments

**Action Required:** Review and fix MCP retry tests

## Adding New Tests

### Voice Gateway (Backend)
```javascript
// apps/voice-gateway-oww/tests/my-feature.test.js
import { describe, test, expect } from '@jest/globals';

describe('MyFeature', () => {
    test('should do something', () => {
        expect(true).toBe(true);
    });
});
```

### Oracle (Frontend)
```javascript
// apps/oracle/src/lib/__tests__/my-feature.test.js
import { describe, test, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';

describe('MyComponent', () => {
    test('renders correctly', () => {
        // Test implementation
    });
});
```

## CI/CD Integration

For automated testing in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run all tests
  run: npm test

- name: Run tests with coverage
  run: npm run test:coverage:all

- name: Lint all code
  run: npm run lint
```

## Note: No Gradle

This project uses **npm/Node.js**, not Gradle. All build and test commands use npm scripts.

If you need a task runner for more complex workflows, consider:
- **npm scripts** (current approach)
- **make** (Makefile for Unix-like systems)
- **nx** or **turborepo** (advanced monorepo tools)
