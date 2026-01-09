# GitHub Actions CI/CD

This directory contains GitHub Actions workflows for continuous integration and deployment.

## Workflows

### CI - Build and Test (`ci.yml`)

Automatically builds and tests all projects in the monorepo on every commit.

**Triggers:**

- Push to `main`, `master`, or `develop` branches
- Pull requests targeting `main`, `master`, or `develop` branches

**What it does:**

1. **Multi-version testing**: Tests against Node.js 22.x and 24.x
2. **Builds all projects:**
    - Oracle (Next.js app)
    - ZWave MCP Server
    - Voice Gateway OWW
3. **Runs tests** for projects that have test suites
4. **Runs linters** to ensure code quality
5. **Validates package structure** for MCP servers

**Projects tested:**

| Project              | Build | Lint | Test | Notes                    |
|----------------------|-------|------|------|--------------------------|
| oracle               | ✅     | ✅    | ✅    | Next.js production build |
| zwave-mcp-server     | ✅     | -    | -    | Structure validation     |
| voice-gateway-oww    | ✅     | ✅    | ✅    | Node.js app              |

## Viewing Build Status

### In Pull Requests

When you open a pull request, GitHub will automatically run the CI workflow. You'll see:

- ✅ Green checkmark if all builds pass
- ❌ Red X if any build fails
- 🟡 Yellow dot if builds are in progress

Click "Details" next to the check to see the full build log.

### On Commit

After pushing commits, visit the "Actions" tab in your GitHub repository to see:

- Build status for each commit
- Detailed logs for each step
- Test results and coverage (if available)

## Local Testing

Before pushing, you can test locally to catch issues early:

```bash
# Test Oracle app
cd apps/oracle
npm install
npm run lint
npm test
npm run build

# Test Voice Gateway OWW
cd apps/voice-gateway-oww
npm install
npm run lint
npm test

# Test ZWave MCP Server
cd apps/zwave-mcp-server
npm install
node src/index.js --help  # Quick validation
```

## Troubleshooting

### Build fails with "Cannot find module"

**Solution:** Ensure all dependencies are in `package.json`:

```bash
cd apps/oracle  # or the failing project
npm install
```

### Lint errors blocking merge

**Solution:** Fix lint errors locally:

```bash
npm run lint           # See errors
npm run lint -- --fix  # Auto-fix (if available)
```

### Tests failing in CI but passing locally

**Possible causes:**

1. Different Node.js version (CI uses 22.x and 24.x)
2. Missing environment variables
3. Platform-specific issues (Linux in CI vs macOS/Windows locally)

**Solution:** Test with the same Node.js version:

```bash
nvm install 22
nvm use 22
npm test
```

## Cache Optimization

The workflow uses npm caching to speed up builds:

- First run: ~3-5 minutes (full install)
- Subsequent runs: ~1-2 minutes (using cache)

Cache is automatically invalidated when `package-lock.json` changes.

## Status Badge

Add this to your main README.md to show build status:

```markdown
[![CI](https://github.com/jrgleason/mqtt-ollama-presentation/actions/workflows/ci.yml/badge.svg)](https://github.com/jrgleason/mqtt-ollama-presentation/actions/workflows/ci.yml)
```

## Future Enhancements

Potential additions to consider:

1. **Code Coverage Reports**: Upload test coverage to Codecov
2. **Docker Build**: Test Docker image builds
3. **Integration Tests**: Test against real MQTT broker
4. **Deployment**: Auto-deploy to staging on merge to `develop`
5. **Security Scanning**: Add npm audit and dependency scanning
6. **Performance Testing**: Benchmark critical paths

## Related Documentation

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [setup-node Action](https://github.com/actions/setup-node)
- [Project README](../../README.md)
