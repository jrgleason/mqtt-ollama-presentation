# Critical Actions Summary

**Generated:** 2025-10-11
**Demo Date:** January 12, 2026 (93 days away)

---

## IMMEDIATE BLOCKERS (Fix Today)

### 1. Install Missing Dependencies

**Problem:** Two apps cannot build or run

```bash
# Fix zwave-mcp-server
cd /Users/jrg/code/CodeMash/mqtt-ollama-presentation/apps/zwave-mcp-server
npm install
npm run build

# Fix voice-gateway
cd /Users/jrg/code/CodeMash/mqtt-ollama-presentation/apps/voice-gateway
npm install
npm run build
```

**Verification:**

```bash
# Should succeed:
cd apps/zwave-mcp-server && npm run build
cd apps/voice-gateway && npm run build
```

---

### 2. Fix Oracle Wildcard Versions

**Problem:** ALL dependencies use "*" - builds could break randomly

**Current (apps/oracle/package.json):**

```json
{
  "dependencies": {
    "next": "*",
    "react": "*",
    "@langchain/core": "*"
    // ... all use wildcards
  }
}
```

**Fix:**

```bash
cd /Users/jrg/code/CodeMash/mqtt-ollama-presentation/apps/oracle

# Get current installed versions
npm ls --depth=0 --json > installed-versions.json

# Manually update package.json with exact versions
# OR use this script:
```

**Script to fix versions:**

```javascript
// fix-versions.js
const fs = require('fs');
const { execSync } = require('child_process');

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const installed = JSON.parse(execSync('npm ls --depth=0 --json').toString());

function updateVersions(deps) {
  if (!deps) return;
  for (const [name, version] of Object.entries(deps)) {
    if (version === '*' && installed.dependencies[name]) {
      deps[name] = '^' + installed.dependencies[name].version;
    }
  }
}

updateVersions(packageJson.dependencies);
updateVersions(packageJson.devDependencies);

fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
console.log('✅ Fixed wildcard versions');
```

**Run:**

```bash
cd apps/oracle
node ../../fix-versions.js
git diff package.json  # Review changes
npm install  # Verify no changes
```

---

### 3. Create Missing Dockerfile

**Problem:** docker-compose.yml references apps/oracle/Dockerfile that doesn't exist

**Create apps/oracle/Dockerfile:**

```dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Set up database directory
RUN mkdir -p /app/prisma && chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

**Also create apps/oracle/.dockerignore:**

```
# Dependencies
node_modules
npm-debug.log
yarn-debug.log
yarn-error.log

# Build output
.next
out
dist

# Testing
coverage
*.test.ts
*.test.tsx
__tests__

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode
.idea

# Git
.git
.gitignore

# Documentation
README.md
docs

# Database
dev.db
*.db
```

**Update apps/oracle/next.config.ts:**

```typescript
const nextConfig: NextConfig = {
  output: 'standalone', // Required for Docker
  // ... rest of config
};
```

**Test:**

```bash
cd /Users/jrg/code/CodeMash/mqtt-ollama-presentation
docker-compose build oracle
```

---

## HIGH PRIORITY (Week 1)

### 4. Set Up npm Workspaces

**Create root package.json:**

```bash
cd /Users/jrg/code/CodeMash/mqtt-ollama-presentation

cat > package.json << 'EOF'
{
  "name": "mqtt-ollama-presentation",
  "version": "1.0.0",
  "private": true,
  "description": "MQTT + Ollama Home Automation CodeMash Presentation",
  "workspaces": [
    "apps/oracle",
    "apps/zwave-mcp-server",
    "apps/voice-gateway"
  ],
  "scripts": {
    "install:all": "npm install",
    "build:all": "npm run build --workspaces --if-present",
    "test:all": "npm run test --workspaces --if-present",
    "lint:all": "npm run lint --workspaces --if-present",
    "dev:oracle": "npm run dev --workspace=apps/oracle",
    "dev:zwave": "npm run dev --workspace=apps/zwave-mcp-server",
    "dev:voice": "npm run dev --workspace=apps/voice-gateway"
  },
  "devDependencies": {
    "@types/node": "^24.7.2",
    "typescript": "^5.9.3",
    "prettier": "^3.4.2"
  },
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  }
}
EOF

npm install
```

**Verify:**

```bash
npm run build:all
npm run test:all
```

---

### 5. Add Environment Validation

**Create apps/oracle/src/lib/env.ts:**

```typescript
import { z } from 'zod';

const envSchema = z.object({
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Ollama configuration
  OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().min(1).default('qwen3:1.7b'),

  // MQTT configuration
  MQTT_BROKER_URL: z.string().regex(/^mqtts?:\/\//).default('mqtt://localhost:1883'),
  MQTT_USERNAME: z.string().optional(),
  MQTT_PASSWORD: z.string().optional(),

  // Database
  DATABASE_URL: z.string().default('file:./dev.db'),

  // Next.js
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),

  // Auth0 (optional for now)
  AUTH0_SECRET: z.string().optional(),
  AUTH0_BASE_URL: z.string().url().optional(),
  AUTH0_ISSUER_BASE_URL: z.string().url().optional(),
  AUTH0_CLIENT_ID: z.string().optional(),
  AUTH0_CLIENT_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;

  try {
    cachedEnv = envSchema.parse(process.env);
    return cachedEnv;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

// Validate on import
export const env = getEnv();
```

**Use in code:**

```typescript
// Before:
const ollamaUrl = process.env.OLLAMA_BASE_URL;

// After:
import { env } from '@/lib/env';
const ollamaUrl = env.OLLAMA_BASE_URL; // Type-safe, validated
```

---

### 6. Add Structured Logging

**Reuse voice-gateway logger in oracle:**

```bash
# Copy logger from voice-gateway
cp apps/voice-gateway/src/logger.ts apps/oracle/src/lib/logger.ts
```

**Update imports:**

```typescript
// apps/oracle/src/lib/logger.ts
import { env } from './env.js';

// ... rest of logger code from voice-gateway

export const logger = new Logger(env.NODE_ENV === 'development' ? 'debug' : 'info');
```

**Replace console.log throughout codebase:**

```typescript
// Before:
console.log('Device control command sent', { deviceId, action });

// After:
import { logger } from '@/lib/logger';
logger.info('Device control command sent', { deviceId, action });
```

---

### 7. Update Safe Dependencies

**Oracle safe updates:**

```bash
cd apps/oracle

npm install \
  @prisma/client@latest \
  prisma@latest \
  @types/node@latest \
  @types/react@latest \
  @types/react-dom@latest \
  lucide-react@latest \
  ts-jest@latest

npm run build  # Verify still works
npm test       # Verify tests pass
```

---

### 8. Test Docker Compose

**Fix Auth0 issue in docker-compose.yml:**

**Option A: Make Auth0 optional**

```yaml
# docker-compose.yml
services:
  oracle:
    environment:
      # Auth0 (optional)
      - AUTH0_SECRET=${AUTH0_SECRET:-}
      - AUTH0_BASE_URL=${AUTH0_BASE_URL:-}
      - AUTH0_ISSUER_BASE_URL=${AUTH0_ISSUER_BASE_URL:-}
      - AUTH0_CLIENT_ID=${AUTH0_CLIENT_ID:-}
      - AUTH0_CLIENT_SECRET=${AUTH0_CLIENT_SECRET:-}
```

**Option B: Enable Auth0 in .env.example**

```env
# apps/oracle/.env.example
AUTH0_SECRET=generate_with_openssl_rand_base64_32
AUTH0_BASE_URL=http://localhost:3000
AUTH0_ISSUER_BASE_URL=https://your-tenant.auth0.com
AUTH0_CLIENT_ID=your_client_id
AUTH0_CLIENT_SECRET=your_client_secret
```

**Test:**

```bash
# Create root .env for docker-compose
cp .env.example .env
# Edit .env with your values

# Build all images
docker-compose build

# Start services
docker-compose up -d

# Check logs
docker-compose logs oracle
docker-compose logs zwave-js-ui

# Test oracle
curl http://localhost:3000/api/health

# Cleanup
docker-compose down
```

---

## VERIFICATION CHECKLIST

After completing immediate actions, verify:

```bash
# 1. All apps build successfully
cd /Users/jrg/code/CodeMash/mqtt-ollama-presentation
npm run build:all

# 2. All tests pass
npm run test:all

# 3. Docker builds work
docker-compose build

# 4. No wildcard versions remain
grep -r '"*"' apps/*/package.json
# Should return: (no matches)

# 5. All dependencies installed
npm ls --workspaces 2>&1 | grep "UNMET DEPENDENCY"
# Should return: (nothing)

# 6. Environment validation works
cd apps/oracle
npm run build
# Should show no validation errors

# 7. Git status clean (after committing fixes)
git status
# Should show: nothing to commit (after git add/commit)
```

---

## RECOMMENDED COMMIT STRATEGY

```bash
# After fixing each issue:

# 1. Install dependencies
git add apps/zwave-mcp-server/package-lock.json
git add apps/voice-gateway/package-lock.json
git commit -m "chore: install missing dependencies in zwave-mcp-server and voice-gateway"

# 2. Fix wildcard versions
git add apps/oracle/package.json
git commit -m "fix: replace wildcard dependency versions with exact versions in oracle"

# 3. Add Dockerfile
git add apps/oracle/Dockerfile apps/oracle/.dockerignore apps/oracle/next.config.ts
git commit -m "feat: add Dockerfile and Docker configuration for oracle"

# 4. Workspace setup
git add package.json package-lock.json
git commit -m "feat: set up npm workspaces for monorepo"

# 5. Environment validation
git add apps/oracle/src/lib/env.ts
git commit -m "feat: add environment variable validation with Zod"

# 6. Structured logging
git add apps/oracle/src/lib/logger.ts
git commit -m "feat: add structured logging to oracle"

# 7. Dependency updates
git add apps/oracle/package.json apps/oracle/package-lock.json
git commit -m "chore: update safe dependencies (Prisma, types, lucide-react, ts-jest)"

# 8. Docker compose fixes
git add docker-compose.yml
git commit -m "fix: make Auth0 environment variables optional in docker-compose"
```

---

## HELP NEEDED?

If you encounter issues:

1. **npm install fails:** Delete `node_modules` and `package-lock.json`, try again
2. **Docker build fails:** Check Dockerfile syntax, ensure `output: 'standalone'` in next.config
3. **Tests fail:** Check imports, ensure logger is properly configured
4. **Wildcard script doesn't work:** Manually update versions from `npm ls --depth=0`

---

## TIMELINE

- **Today (October 11):** Complete items 1-3 (blockers)
- **This Week:** Complete items 4-8 (high priority)
- **Next Week:** Start testing and documentation
- **Week 3:** Practice demo runs
- **Week 4:** Final prep
- **January 12, 2026:** Demo day!

---

**Questions? See full analysis:**
`docs/app-analysis-recommendations.md`
