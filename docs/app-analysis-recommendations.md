# Multi-Module Project Analysis & Recommendations

**Generated:** 2025-10-11
**Project:** MQTT + Ollama Home Automation (CodeMash Presentation)
**Status:** Pre-Demo Phase

---

## Executive Summary

This analysis covers three applications in the `apps/` directory:
1. **oracle** - Next.js chatbot (primary demo app) - ✅ Stable, needs minor updates
2. **zwave-mcp-server** - TypeScript MCP server - ⚠️ Dependencies not installed
3. **voice-gateway** - Voice command service - ⚠️ Dependencies not installed, newly added

### Critical Findings

1. **BLOCKER:** Two apps (zwave-mcp-server, voice-gateway) have unmet dependencies
2. **HIGH:** Oracle has outdated Zod dependency (3.25.76 → 4.1.12, breaking changes)
3. **HIGH:** Oracle uses wildcard versions ("*") in package.json - major stability risk
4. **MEDIUM:** MCP server SDK is severely outdated (0.5.0 → 1.20.0)
5. **MEDIUM:** No workspace configuration for shared dependencies
6. **LOW:** Missing unified testing/linting configuration across apps

### Recommended Priority

1. **Immediate (Week 1):** Fix dependency issues, replace wildcard versions
2. **High Priority (Week 2):** Set up npm workspaces, update shared tooling
3. **Medium Priority (Week 3):** Add missing tests, improve error handling
4. **Low Priority (Week 4):** Performance optimizations, documentation updates

---

## 1. App: Oracle (Next.js Chatbot)

**Path:** `apps/oracle/`
**Status:** ✅ Dependencies installed, builds successfully
**Primary Purpose:** Main demo application for CodeMash presentation

### 1.1 Dependency Analysis

#### Critical Issues

**CRITICAL: Wildcard Version Anti-Pattern**
```json
// Current (apps/oracle/package.json)
"dependencies": {
  "@langchain/core": "*",
  "@langchain/ollama": "*",
  "@prisma/client": "*",
  "next": "*",
  "react": "*",
  // ... all dependencies use "*"
}
```

**Risk Level:** HIGH - This is extremely dangerous for a presentation demo:
- Builds may break between `npm install` runs
- Different team members may have different versions
- Impossible to reproduce bugs
- No control over breaking changes
- Demo could fail on presentation day

**Impact:**
- Zod is already outdated (3.25.76 vs 4.1.12) - breaking changes in v4
- Future npm installs may pull incompatible versions
- Lock file is the ONLY thing preventing catastrophic failures

**Recommendation:** Replace ALL wildcard versions immediately

#### Outdated Dependencies

```bash
Package           Current   Latest  Breaking Changes
@prisma/client    6.16.3    6.17.1  No (minor)
@types/node       24.6.2    24.7.2  No (patch)
@types/react      19.2.0    19.2.2  No (patch)
@types/react-dom  19.2.0    19.2.1  No (patch)
lucide-react      0.544.0   0.545.0 No (patch)
prisma            6.16.3    6.17.1  No (minor)
ts-jest           29.4.4    29.4.5  No (patch)
zod               3.25.76   4.1.12  YES (major - breaking)
```

**Zod v4 Breaking Changes:**
- Major API changes in schema composition
- Changed error handling patterns
- May affect LangChain tool validation
- Requires code updates in validation logic

**Action Required:**
1. Pin all dependencies to specific versions
2. Update safe dependencies (Prisma, types, lucide-react, ts-jest)
3. Defer Zod upgrade until after CodeMash (January 12, 2026)
4. Document Zod upgrade as post-demo tech debt

#### Missing Dependencies

- ✅ All runtime dependencies present
- ✅ All dev dependencies present
- ❌ Missing `pino` or `winston` for structured logging (console.log only)
- ❌ Missing `dotenv-safe` for environment validation
- ❌ Missing `@types/jest` (using version from parent?)

### 1.2 Configuration Analysis

#### TypeScript Configuration (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ES2017",        // ⚠️ Could be ES2020+
    "strict": true,            // ✅ Good
    "noEmit": true,            // ✅ Good (Next.js handles builds)
    "moduleResolution": "bundler", // ✅ Good for Next.js
    "paths": {
      "@/*": ["./src/*"]       // ✅ Good path alias
    }
  }
}
```

**Recommendations:**
- Update `target` to `ES2020` (Node 18+ requirement)
- Add `noUncheckedIndexedAccess: true` for safer array access
- Add `noPropertyAccessFromIndexSignature: true` for type safety

#### ESLint Configuration (eslint.config.mjs)

**Current Issues:**
```javascript
rules: {
  '@typescript-eslint/no-explicit-any': 'off',     // ⚠️ Disables type safety
  '@typescript-eslint/no-unused-vars': 'off',      // ⚠️ Bad for code quality
  'no-unused-vars': 'off',                         // ⚠️ Allows dead code
}
```

**Impact:** These rules are disabled globally, reducing code quality and catching errors

**Recommendation:**
- Re-enable unused vars warnings (not errors) for better code hygiene
- Use `@typescript-eslint/no-unused-vars: ["warn", { "argsIgnorePattern": "^_" }]`
- Keep `no-explicit-any` off only for generated files

#### Jest Configuration (jest.config.js)

```javascript
coverageThreshold: {
  global: {
    branches: 60,
    functions: 60,
    lines: 60,
    statements: 60,
  },
}
```

**Status:** ✅ Good baseline, achievable target
**Recommendation:** Maintain this threshold, increase to 70% post-demo

### 1.3 Project Structure Issues

#### Missing Files/Directories

```
apps/oracle/
├── ❌ Dockerfile (referenced in docker-compose.yml but missing)
├── ❌ .dockerignore
├── ❌ src/lib/logger.ts (using console.log everywhere)
├── ❌ src/lib/errors/ (custom error classes)
├── ❌ src/middleware.ts (Next.js middleware for auth)
├── ✅ src/lib/db/client.ts
├── ✅ src/lib/mqtt/client.ts
├── ✅ src/lib/langchain/tools/
└── ✅ prisma/schema.prisma
```

#### Test Coverage

**Current Tests:**
- `src/lib/langchain/tools/__tests__/device-control-tool.test.ts` ✅
- `src/lib/langchain/tools/__tests__/device-list-tool.test.ts` ✅
- `src/lib/mqtt/__tests__/client.test.ts` ✅

**Missing Tests:**
- API routes (`/api/chat`, `/api/models`)
- React components (`ChatInterface`, `ChatMessage`)
- Database operations
- Ollama client integration
- Error handling scenarios

**Recommendation:**
- Add API route tests before demo (critical paths)
- Defer UI component tests (lower priority for backend-focused demo)

### 1.4 Environment Configuration

**Current (.env.example):**
```env
# Good structure, but missing validation
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:1.7b
MQTT_BROKER_URL=mqtt://localhost:1883
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Issues:**
- No runtime validation of required env vars
- No type safety for env variables
- Missing `NODE_ENV` default
- Auth0 variables commented out but referenced in docker-compose

**Recommendation:**
```typescript
// Create src/lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  OLLAMA_BASE_URL: z.string().url(),
  OLLAMA_MODEL: z.string().min(1),
  MQTT_BROKER_URL: z.string().regex(/^mqtt:\/\//),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export const env = envSchema.parse(process.env);
```

### 1.5 Oracle-Specific Recommendations

#### Priority 1: Critical (Pre-Demo Week 1)

1. **Replace wildcard versions**
   ```bash
   # Update package.json with exact versions from package-lock.json
   npm ls --depth=0 --json > versions.json
   # Manually update package.json
   ```

2. **Add missing Dockerfile**
   ```dockerfile
   FROM node:20-alpine AS base
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   RUN npm run build
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

3. **Add structured logging**
   ```bash
   npm install pino pino-pretty
   # Create src/lib/logger.ts
   ```

#### Priority 2: High (Week 2)

4. **Environment validation**
   - Create `src/lib/env.ts` with Zod schemas
   - Validate on app startup
   - Fail fast with clear error messages

5. **Error handling patterns**
   ```typescript
   // src/lib/errors/base.ts
   export class AppError extends Error {
     constructor(
       message: string,
       public code: string,
       public statusCode: number = 500,
       public details?: unknown
     ) {
       super(message);
       this.name = this.constructor.name;
     }
   }
   ```

6. **Re-enable useful ESLint rules**
   ```javascript
   '@typescript-eslint/no-unused-vars': ['warn', {
     argsIgnorePattern: '^_',
     varsIgnorePattern: '^_'
   }]
   ```

#### Priority 3: Medium (Week 3)

7. **Add API route tests**
   - Test `/api/chat` with mock Ollama responses
   - Test `/api/models` endpoint
   - Add error scenario tests

8. **Improve TypeScript config**
   ```json
   {
     "compilerOptions": {
       "target": "ES2020",
       "noUncheckedIndexedAccess": true,
       "noPropertyAccessFromIndexSignature": true
     }
   }
   ```

9. **Add health check endpoint**
   ```typescript
   // app/api/health/route.ts
   export async function GET() {
     return Response.json({
       status: 'ok',
       ollama: await checkOllamaHealth(),
       mqtt: await checkMqttHealth(),
       db: await checkDatabaseHealth(),
     });
   }
   ```

#### Priority 4: Low (Week 4, Post-Demo)

10. **Zod v4 upgrade** (after demo)
11. **Add React component tests**
12. **Performance monitoring**
13. **Bundle size optimization**

---

## 2. App: zwave-mcp-server

**Path:** `apps/zwave-mcp-server/`
**Status:** ⚠️ DEPENDENCIES NOT INSTALLED - Cannot build or run
**Primary Purpose:** MCP server for Z-Wave device control via MQTT

### 2.1 Dependency Analysis

#### Critical Issue: No Dependencies Installed

```bash
UNMET DEPENDENCY @modelcontextprotocol/sdk@^0.5.0
UNMET DEPENDENCY @types/node@^20.0.0
UNMET DEPENDENCY mqtt@^5.10.1
UNMET DEPENDENCY node-fetch@^3.3.2
UNMET DEPENDENCY typescript@^5.3.3
UNMET DEPENDENCY zod@^3.23.8
```

**Impact:** Project cannot be built, tested, or run

**Action Required:**
```bash
cd apps/zwave-mcp-server
npm install
```

#### Severely Outdated Dependency

**MCP SDK:**
```
Current: 0.5.0 (if installed)
Latest:  1.20.0 (24 versions behind!)
```

**Breaking Changes:** Unknown, but likely significant given 1.x version jump

**Recommendation:**
- Install dependencies first
- Test with current SDK version (0.5.0)
- Plan MCP SDK upgrade for Week 2
- Review changelog: https://github.com/modelcontextprotocol/typescript-sdk

#### Other Outdated Dependencies

```bash
Package     Declared  Latest   Status
mqtt        ^5.10.1   5.14.1   Patch updates available
zod         ^3.23.8   4.1.12   Major version available (breaking)
@types/node ^20.0.0   24.7.2   Major type updates
```

### 2.2 Configuration Analysis

#### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",               // ✅ Good, modern
    "module": "ES2022",               // ✅ Good, ESM
    "strict": true,                   // ✅ Good
    "declaration": true,              // ✅ Good for library
    "declarationMap": true,           // ✅ Good for debugging
    "sourceMap": true                 // ✅ Good for debugging
  }
}
```

**Status:** ✅ Excellent configuration, no changes needed

#### Missing Configuration

```
apps/zwave-mcp-server/
├── ❌ jest.config.js (no test setup)
├── ❌ .eslintrc.json or eslint.config.js
├── ❌ .prettierrc
├── ❌ Dockerfile (for containerized MCP server)
├── ❌ README.md (basic docs exist in apps/README.md)
└── ✅ .env.example
```

### 2.3 Project Structure

**Current:**
```
zwave-mcp-server/
├── src/
│   ├── device-registry.ts    # Device state management
│   ├── mqtt-client.ts        # MQTT connection
│   ├── types.ts              # Type definitions
│   └── zwave-client.ts       # Z-Wave JS UI API client
├── package.json
├── tsconfig.json
└── .env.example
```

**Missing:**
```
├── src/index.ts              # ❌ Main entry point (referenced but not shown)
├── src/logger.ts             # ❌ Structured logging
├── src/config.ts             # ❌ Environment config
├── src/__tests__/            # ❌ No tests
├── scripts/                  # ❌ Setup scripts
│   └── test-mcp.ts          # ❌ MCP inspector test script
└── docs/                     # ❌ MCP server documentation
```

### 2.4 Code Quality Concerns

**Based on file structure analysis:**

1. **No entry point visible** - Need to see `src/index.ts` to understand startup
2. **No error handling module** - May be using basic try/catch
3. **No health check** - MCP servers should expose health status
4. **No graceful shutdown** - Need to handle SIGTERM/SIGINT
5. **No connection retry logic** - MQTT/HTTP clients may fail permanently

### 2.5 MCP Server-Specific Recommendations

#### Priority 1: Critical (Week 1)

1. **Install dependencies**
   ```bash
   cd apps/zwave-mcp-server
   npm install
   npm run build
   ```

2. **Verify MCP SDK compatibility**
   ```bash
   npm run inspector  # Test with MCP Inspector
   ```

3. **Add missing entry point validation**
   ```bash
   # Check if src/index.ts exists and is valid
   cat src/index.ts
   ```

#### Priority 2: High (Week 2)

4. **Update MCP SDK** (after testing current version)
   ```bash
   npm install @modelcontextprotocol/sdk@latest
   # Review migration guide
   # Update tool definitions
   ```

5. **Add testing infrastructure**
   ```javascript
   // jest.config.js
   export default {
     preset: 'ts-jest/presets/default-esm',
     extensionsToTreatAsEsm: ['.ts'],
     testEnvironment: 'node',
     moduleNameMapper: {
       '^(\\.{1,2}/.*)\\.js$': '$1',
     },
   };
   ```

6. **Add ESLint configuration**
   ```javascript
   // eslint.config.js
   import tsPlugin from '@typescript-eslint/eslint-plugin';
   import tsParser from '@typescript-eslint/parser';

   export default [
     {
       files: ['**/*.ts'],
       plugins: { '@typescript-eslint': tsPlugin },
       languageOptions: { parser: tsParser },
       rules: {
         '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
         '@typescript-eslint/explicit-function-return-type': 'warn',
       },
     },
   ];
   ```

#### Priority 3: Medium (Week 3)

7. **Add structured logging**
   ```typescript
   // src/logger.ts (reuse from voice-gateway)
   ```

8. **Add health check tool**
   ```typescript
   // Add to MCP server tools
   export const healthCheckTool = {
     name: 'health_check',
     description: 'Check MCP server health and connections',
     inputSchema: { type: 'object', properties: {} },
     async handler() {
       return {
         mqtt: await mqttClient.isConnected(),
         zwaveUI: await zwaveClient.isHealthy(),
         uptime: process.uptime(),
       };
     },
   };
   ```

9. **Add integration tests**
   ```typescript
   describe('MQTT Client', () => {
     it('should connect to broker', async () => {
       // Test MQTT connection
     });
   });
   ```

#### Priority 4: Low (Post-Demo)

10. **Add Dockerfile**
11. **Add retry logic with exponential backoff**
12. **Add metrics/monitoring**
13. **Update Zod to v4**

---

## 3. App: voice-gateway

**Path:** `apps/voice-gateway/`
**Status:** ⚠️ DEPENDENCIES NOT INSTALLED - Newly created
**Primary Purpose:** Offline voice command gateway (Phase 5, optional for demo)

### 3.1 Dependency Analysis

#### Critical Issue: No Dependencies Installed

```bash
UNMET DEPENDENCY @picovoice/porcupine-node@^3.0.0
UNMET DEPENDENCY @types/jest@^29.0.0
UNMET DEPENDENCY @types/node@^20.0.0
UNMET DEPENDENCY @types/uuid@^9.0.0
UNMET DEPENDENCY @types/wav@^1.0.0
UNMET DEPENDENCY @typescript-eslint/eslint-plugin@^6.0.0
UNMET DEPENDENCY @typescript-eslint/parser@^6.0.0
UNMET DEPENDENCY dotenv@^16.0.0
UNMET DEPENDENCY eslint@^8.0.0
UNMET DEPENDENCY jest@^29.0.0
UNMET DEPENDENCY mqtt@^5.14.1
UNMET DEPENDENCY ts-jest@^29.0.0
UNMET DEPENDENCY ts-node@^10.0.0
UNMET DEPENDENCY typescript@^5.0.0
UNMET DEPENDENCY uuid@^9.0.0
UNMET DEPENDENCY wav@^1.0.2
```

**Action Required:**
```bash
cd apps/voice-gateway
npm install
npm run setup  # Download Whisper model
```

#### Outdated Dependencies Declared

```bash
Package        Declared  Latest   Issue
dotenv         ^16.0.0   17.2.3   Major version available
uuid           ^9.0.0    13.0.0   Breaking changes likely
eslint         ^8.0.0    9.x      Major ESLint upgrade
@typescript-eslint/* ^6.0.0  ^8.x   Major version lag
```

**Recommendation:**
- Install first with declared versions
- Test functionality
- Update dotenv (safe, minor breaking changes)
- Defer uuid/eslint upgrades to Week 2

### 3.2 Configuration Analysis

#### TypeScript Configuration

```json
{
  "compilerOptions": {
    "target": "ES2022",               // ✅ Excellent
    "module": "ESNext",               // ✅ Good for ESM
    "strict": true,                   // ✅ Good
    "noUnusedLocals": true,           // ✅ Better than oracle!
    "noUnusedParameters": true,       // ✅ Better than oracle!
    "noImplicitReturns": true,        // ✅ Better than oracle!
    "noFallthroughCasesInSwitch": true // ✅ Better than oracle!
  }
}
```

**Status:** ✅ Excellent configuration - BEST in the project!

**Recommendation:** Use this as template for other apps

#### Logging Implementation

**Current (src/logger.ts):**
```typescript
class Logger {
  private level: LogLevel;

  private log(level: LogLevel, message: string, metadata?: Record<string, unknown>) {
    // Structured JSON for production
    // Human-readable for development
  }
}
```

**Status:** ✅ Excellent implementation

**Recommendation:**
- Reuse this logger in oracle and zwave-mcp-server
- Extract to shared package in workspace

### 3.3 Project Structure

**Current:**
```
voice-gateway/
├── src/
│   ├── main.ts          # Entry point
│   ├── config.ts        # ✅ Environment validation
│   └── logger.ts        # ✅ Structured logging
├── scripts/
│   └── setup.js         # Model download
├── models/              # Downloaded models (gitignored)
├── tests/               # Test directory exists
├── .env.example         # ✅ Comprehensive
├── package.json
├── tsconfig.json
└── README.md            # ✅ Excellent documentation
```

**Missing Implementation Files:**
```
src/
├── ❌ wakeword.ts       # Porcupine integration
├── ❌ recorder.ts       # Audio capture + VAD
├── ❌ stt.ts            # Whisper.cpp wrapper
├── ❌ mqtt.ts           # MQTT client
├── ❌ audio.ts          # ALSA playback
├── ❌ health.ts         # Health check server
└── tests/
    └── ❌ (no test files yet)
```

**Status:** Skeleton structure with excellent documentation, implementation pending

### 3.4 Voice Gateway-Specific Recommendations

#### Priority 1: Critical (Week 1 - Optional, Phase 5)

**NOTE:** Voice gateway is Phase 5 (optional for demo). Only proceed if core demo is stable.

1. **Install dependencies**
   ```bash
   cd apps/voice-gateway
   npm install
   ```

2. **Verify Picovoice key**
   - Register at https://console.picovoice.ai
   - Add key to `.env`
   - Test wake word detection

3. **Download Whisper model**
   ```bash
   npm run setup
   ```

#### Priority 2: High (Week 3 - If implementing Phase 5)

4. **Implement missing modules** (in order)
   ```typescript
   // 1. src/mqtt.ts - MQTT client (reuse patterns from oracle/zwave)
   // 2. src/health.ts - Health check server (simple HTTP endpoint)
   // 3. src/wakeword.ts - Porcupine integration
   // 4. src/recorder.ts - Audio capture + VAD
   // 5. src/stt.ts - Whisper.cpp wrapper
   // 6. src/audio.ts - ALSA playback (Phase 6)
   ```

5. **Add integration tests**
   ```typescript
   describe('Voice Gateway', () => {
     it('should publish voice transcriptions to MQTT', async () => {
       // Test MQTT publishing
     });
   });
   ```

6. **Update dependencies**
   ```bash
   npm install dotenv@latest uuid@latest
   ```

#### Priority 3: Medium (Week 4 - If Phase 5 active)

7. **Add Dockerfile**
   ```dockerfile
   FROM node:20-alpine
   # Install ALSA dependencies
   RUN apk add --no-cache alsa-lib-dev
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   RUN npm run build
   CMD ["npm", "start"]
   ```

8. **Add error recovery**
   - MQTT reconnection logic
   - Audio device failure handling
   - Whisper timeout handling

9. **Hardware testing on Raspberry Pi 5**
   - Test with LANDIBO GSH23 USB mic
   - Verify ALSA configuration
   - Test wake word detection accuracy

#### Priority 4: Low (Post-Demo)

10. **Add TTS support** (Phase 6)
11. **Optimize Whisper model** (quantization)
12. **Add audio quality metrics**

### 3.5 Voice Gateway Demo Strategy

**Recommendation for CodeMash Demo:**

**Option A: Skip Voice Gateway (Recommended)**
- Focus on oracle + zwave-mcp-server + MQTT
- Demo manual text commands (reliable, fast)
- Mention voice as "future enhancement"
- Save development time for core features

**Option B: Simple Voice Demo (If time permits)**
- Implement basic wake word + STT + MQTT
- Record demo video as backup (voice can fail)
- Practice with live fallback to text commands
- Clearly mark as "experimental" in presentation

**Option C: Video-Only Demo**
- Record voice demo in advance
- Show as "this is what we're building"
- No live demo risk
- Focus presentation on architecture

---

## 4. Workspace-Level Recommendations

### 4.1 Monorepo Setup

**Current Structure:** Three independent apps with duplicate dependencies

**Recommendation:** Set up npm workspaces for shared dependencies

#### Shared Dependencies Across Apps

```
Dependency          Oracle  zwave-mcp  voice-gw  Version Mismatch?
mqtt                5.14.1  5.10.1     5.14.1    YES
zod                 3.25.76 3.23.8     N/A       YES
@types/node         24.6.2  20.0.0     20.0.0    YES
typescript          5.9.3   5.3.3      5.0.0     YES
dotenv              17.2.3  N/A        16.0.0    YES
jest                30.2.0  N/A        29.0.0    YES
ts-jest             29.4.4  N/A        29.0.0    YES
eslint              9.37.0  N/A        8.0.0     YES
```

**Total Duplicate Dependencies:** 8+ packages installed multiple times

#### Implementation Plan

**1. Create root package.json**
```json
{
  "name": "mqtt-ollama-presentation",
  "private": true,
  "workspaces": [
    "apps/oracle",
    "apps/zwave-mcp-server",
    "apps/voice-gateway"
  ],
  "devDependencies": {
    "@types/node": "^24.7.2",
    "typescript": "^5.9.3",
    "eslint": "^9.37.0",
    "@typescript-eslint/eslint-plugin": "^8.18.0",
    "@typescript-eslint/parser": "^8.18.0",
    "prettier": "^3.4.2",
    "jest": "^30.2.0",
    "ts-jest": "^29.4.5"
  },
  "scripts": {
    "install:all": "npm install && npm run install:apps",
    "install:apps": "npm install --workspace=apps/oracle && npm install --workspace=apps/zwave-mcp-server && npm install --workspace=apps/voice-gateway",
    "build:all": "npm run build --workspaces",
    "test:all": "npm run test --workspaces",
    "lint:all": "npm run lint --workspaces"
  }
}
```

**2. Update apps to use workspace dependencies**
```json
// apps/oracle/package.json
{
  "devDependencies": {
    // Remove: typescript, eslint, jest, ts-jest (use from root)
    // Keep: Next.js-specific deps
  }
}
```

**3. Benefits**
- Reduced disk usage (~200-300MB savings)
- Consistent tooling versions
- Faster `npm install` (shared cache)
- Easier dependency updates

### 4.2 Shared Tooling Configuration

#### Create Shared ESLint Config

```javascript
// eslint.config.mjs (root)
export default [
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
];
```

```javascript
// apps/oracle/eslint.config.mjs
import baseConfig from '../../eslint.config.mjs';
import nextPlugin from 'eslint-config-next';

export default [
  ...baseConfig,
  ...nextPlugin.configs.recommended,
  {
    // Oracle-specific rules
  },
];
```

#### Create Shared Prettier Config

```json
// prettier.config.json (root)
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2
}
```

#### Create Shared TypeScript Base Config

```json
// tsconfig.base.json (root)
{
  "compilerOptions": {
    "target": "ES2022",
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "noUncheckedIndexedAccess": true,
    "noPropertyAccessFromIndexSignature": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

```json
// apps/oracle/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "preserve",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

### 4.3 Shared Utilities Package (Optional)

**Create:** `apps/shared/` package for common code

```
apps/shared/
├── src/
│   ├── logger.ts         # Reuse voice-gateway logger
│   ├── env.ts            # Zod environment validation
│   ├── errors.ts         # Custom error classes
│   └── mqtt-utils.ts     # Shared MQTT helpers
├── package.json
└── tsconfig.json
```

**Benefits:**
- DRY principle (Don't Repeat Yourself)
- Consistent error handling across apps
- Single source of truth for utilities

**Cost:**
- Adds complexity to project structure
- Requires workspace setup
- May be overkill for 3 apps

**Recommendation:** DEFER to post-demo (January 13+)

### 4.4 Documentation Updates Needed

```
docs/
├── ✅ requirements.md
├── ✅ tasks-active.md
├── ✅ network-dependencies.md
├── ✅ voice-gateway-architecture.md
├── ✅ alsa-setup.md
├── ❌ monorepo-setup.md              # NEW: Workspace guide
├── ❌ dependency-management.md       # NEW: Version upgrade process
├── ❌ testing-strategy.md            # NEW: Test coverage goals
└── ❌ docker-deployment.md           # NEW: Docker compose guide
```

---

## 5. Security & Secrets Management

### 5.1 Environment Variables Audit

**Current Issues:**

1. **zwave-mcp-server/.env.example** contains usernames
   ```env
   MQTT_USERNAME=jrg            # ⚠️ Should be placeholder
   ZWAVE_UI_USERNAME=admin      # ⚠️ Should be placeholder
   ```

2. **No .env validation** on app startup
   - Apps may fail silently with missing vars
   - No type safety for environment

3. **Auth0 secrets** commented in oracle but required in docker-compose
   ```yaml
   # docker-compose.yml requires:
   AUTH0_SECRET=${AUTH0_SECRET}  # But oracle/.env.example has it commented
   ```

**Recommendations:**

1. **Update .env.example files**
   ```env
   # Good
   MQTT_USERNAME=your_username_here
   MQTT_PASSWORD=your_password_here

   # Bad
   MQTT_USERNAME=jrg
   ```

2. **Add environment validation** (use zod)
   ```typescript
   // apps/oracle/src/lib/env.ts
   import { z } from 'zod';

   const envSchema = z.object({
     NODE_ENV: z.enum(['development', 'production', 'test']),
     OLLAMA_BASE_URL: z.string().url(),
     OLLAMA_MODEL: z.string().min(1),
     MQTT_BROKER_URL: z.string().regex(/^mqtts?:\/\//),
     DATABASE_URL: z.string(),
   });

   export const env = envSchema.parse(process.env);
   ```

3. **Sync docker-compose with .env.example**
   - Either enable Auth0 in oracle
   - Or make Auth0 optional in docker-compose

### 5.2 Secrets in Git History

**Checked:** ✅ No secrets found in current files
**Warning:** Always audit git history before making repo public

```bash
# Check for leaked secrets
git log --all --full-history --source -- .env
git log -p | grep -i "password\|secret\|key"
```

### 5.3 Docker Security

**Current docker-compose.yml issues:**

1. **Root containers** - No USER directive
   ```yaml
   # Add to Dockerfiles:
   USER node
   ```

2. **Hardcoded passwords** in environment variables
   ```yaml
   environment:
     - AUTH0_SECRET=${AUTH0_SECRET}  # Good, uses .env
   ```

3. **Device access** without capability restrictions
   ```yaml
   devices:
     - /dev/snd:/dev/snd      # Full audio access
     - /dev/ttyACM0:/dev/ttyACM0  # Full USB access
   ```

**Recommendations:**

1. Add health checks to containers
   ```yaml
   healthcheck:
     test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
     interval: 30s
     timeout: 10s
     retries: 3
   ```

2. Use Docker secrets (not environment variables)
3. Run as non-root user

---

## 6. Testing Strategy

### 6.1 Current Test Coverage

```
oracle:
  ✅ 3 test files
  ✅ Coverage threshold: 60%
  ❌ No API route tests
  ❌ No component tests

zwave-mcp-server:
  ❌ No tests
  ❌ No test configuration

voice-gateway:
  ❌ No tests
  ✅ Test directory exists
  ✅ Jest configured in package.json
```

### 6.2 Recommended Test Structure

#### Oracle Tests (apps/oracle/src)
```
__tests__/
├── unit/
│   ├── lib/
│   │   ├── langchain/tools/
│   │   │   ├── ✅ device-control-tool.test.ts
│   │   │   └── ✅ device-list-tool.test.ts
│   │   ├── mqtt/
│   │   │   └── ✅ client.test.ts
│   │   ├── ollama/
│   │   │   └── ❌ client.test.ts
│   │   └── db/
│   │       └── ❌ client.test.ts
│   └── utils/
│       └── ❌ validation.test.ts
├── integration/
│   └── api/
│       ├── ❌ chat.test.ts
│       └── ❌ models.test.ts
└── e2e/
    └── ❌ chat-flow.test.ts
```

#### zwave-mcp-server Tests (apps/zwave-mcp-server/src)
```
__tests__/
├── unit/
│   ├── ❌ device-registry.test.ts
│   ├── ❌ mqtt-client.test.ts
│   └── ❌ zwave-client.test.ts
└── integration/
    └── ❌ mcp-server.test.ts
```

#### voice-gateway Tests (apps/voice-gateway/src)
```
__tests__/
├── unit/
│   ├── ❌ config.test.ts
│   ├── ❌ logger.test.ts
│   └── ❌ mqtt.test.ts
└── integration/
    └── ❌ voice-pipeline.test.ts
```

### 6.3 Testing Priorities

#### Week 1 (Critical)
- Add API route tests to oracle (`/api/chat`, `/api/models`)
- Add MQTT client tests to zwave-mcp-server
- Run existing oracle tests in CI

#### Week 2 (High)
- Add Ollama client tests (with mocks)
- Add MCP server integration tests
- Set up GitHub Actions for automated testing

#### Week 3 (Medium)
- Add voice-gateway unit tests
- Add database tests for oracle
- Increase coverage to 70%

#### Week 4 (Low)
- Add E2E tests for critical flows
- Add performance tests
- Add component tests for React

---

## 7. Performance & Optimization

### 7.1 Bundle Size Analysis (Oracle)

**Current Status:** Unknown (no bundle analysis configured)

**Recommendation:**
```json
// apps/oracle/package.json
{
  "scripts": {
    "analyze": "ANALYZE=true next build"
  }
}
```

```javascript
// apps/oracle/next.config.ts
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';

const config = {
  webpack: (config, { isServer }) => {
    if (process.env.ANALYZE === 'true') {
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: isServer
            ? '../analyze/server.html'
            : './analyze/client.html',
        })
      );
    }
    return config;
  },
};
```

### 7.2 Next.js Optimizations

**Current next.config.ts:** Unknown (not reviewed)

**Recommended:**
```typescript
const config: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react'],
  },
};
```

### 7.3 Database Optimization

**Prisma Schema Review:** Not performed (need to see schema.prisma)

**Recommendations:**
- Add indexes on frequently queried fields
- Use `@@index()` for compound queries
- Enable Prisma query logging in dev
- Consider connection pooling for production

### 7.4 MQTT Performance

**Recommendations:**
- Use QoS 0 for high-frequency updates (device status)
- Use QoS 1 for commands (device control)
- Never use QoS 2 (too slow for home automation)
- Implement message batching for bulk updates
- Set reasonable keepAlive intervals (60s)

---

## 8. Documentation Gaps

### 8.1 Missing Technical Documentation

```
docs/
├── ❌ api-reference.md              # API endpoint documentation
├── ❌ architecture-diagrams.md      # System architecture visuals
├── ❌ deployment-guide.md           # Production deployment steps
├── ❌ troubleshooting.md            # Common issues and solutions
├── ❌ contributing.md               # Development workflow
└── ❌ changelog.md                  # Version history
```

### 8.2 Missing README Updates

**apps/oracle/README.md:**
- Missing setup instructions
- Missing architecture overview
- Missing API documentation
- Missing troubleshooting section

**apps/zwave-mcp-server/README.md:**
- File doesn't exist (only brief mention in apps/README.md)

**apps/voice-gateway/README.md:**
- ✅ Excellent documentation (use as template!)

### 8.3 Code Documentation

**Current Status:**
- Minimal JSDoc comments
- No type documentation
- No function descriptions

**Recommendation:**
```typescript
/**
 * Controls a Z-Wave device via MQTT
 *
 * @param deviceId - Z-Wave device ID (e.g., "3-37-0")
 * @param action - Command to execute ("on" | "off" | "dim")
 * @param value - Brightness value (0-100) for dim commands
 * @returns Promise resolving when command is published
 * @throws {MQTTConnectionError} If MQTT client is not connected
 * @throws {DeviceNotFoundError} If device ID is invalid
 *
 * @example
 * ```typescript
 * await controlDevice("3-37-0", "dim", 75);
 * ```
 */
async function controlDevice(
  deviceId: string,
  action: 'on' | 'off' | 'dim',
  value?: number
): Promise<void> {
  // Implementation
}
```

---

## 9. CI/CD & Automation

### 9.1 Missing CI/CD Configuration

**Current:** No GitHub Actions, CircleCI, or GitLab CI

**Recommended GitHub Actions:**

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm install && npm run install:apps

      - name: Lint
        run: npm run lint:all

      - name: Type check
        run: npm run type-check:all

      - name: Test
        run: npm run test:all

      - name: Build
        run: npm run build:all

  docker:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker images
        run: docker-compose build
```

### 9.2 Pre-commit Hooks

**Recommended: Husky + lint-staged**

```bash
npm install --save-dev husky lint-staged
npx husky init
```

```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

```bash
# .husky/pre-commit
npm run lint-staged
npm run type-check
```

---

## 10. Demo Readiness Checklist

### Week 1 (Critical - Must Have)
- [ ] Install dependencies in zwave-mcp-server
- [ ] Install dependencies in voice-gateway
- [ ] Replace wildcard versions in oracle/package.json
- [ ] Add Dockerfile to oracle
- [ ] Test docker-compose build for all services
- [ ] Add structured logging to oracle
- [ ] Add environment validation to oracle
- [ ] Run and pass all existing tests
- [ ] Document demo script (step-by-step)
- [ ] Set up fallback plan (video recording)

### Week 2 (High Priority)
- [ ] Set up npm workspaces
- [ ] Update MCP SDK in zwave-mcp-server
- [ ] Add API route tests to oracle
- [ ] Update shared dependencies (Prisma, types, etc.)
- [ ] Add health check endpoints
- [ ] Test with real Z-Wave devices
- [ ] Practice demo 5+ times
- [ ] Set up CI/CD pipeline

### Week 3 (Medium Priority)
- [ ] Implement voice-gateway (if Phase 5 active)
- [ ] Add integration tests
- [ ] Update documentation
- [ ] Optimize Next.js bundle
- [ ] Add error recovery patterns
- [ ] Test on Raspberry Pi 5
- [ ] Practice demo 10+ times
- [ ] Record backup video

### Week 4 (Low Priority - Nice to Have)
- [ ] Add E2E tests
- [ ] Performance optimization
- [ ] Security hardening
- [ ] Code documentation
- [ ] Pre-commit hooks
- [ ] Final dress rehearsal
- [ ] Update slide deck with final code

### Post-Demo (January 13+)
- [ ] Upgrade Zod to v4
- [ ] Refactor shared utilities
- [ ] Add component tests
- [ ] Security audit
- [ ] Performance monitoring
- [ ] Public GitHub repository cleanup

---

## 11. Risk Assessment

### High Risk (Demo Blockers)

1. **Wildcard Versions in Oracle** (Risk: 9/10)
   - **Impact:** Build could break on demo day
   - **Likelihood:** Medium (if npm install run again)
   - **Mitigation:** Replace with exact versions TODAY

2. **Missing Dependencies** (Risk: 8/10)
   - **Impact:** Two apps cannot run
   - **Likelihood:** High (apps untested)
   - **Mitigation:** Run `npm install` in both apps immediately

3. **No Dockerfile for Oracle** (Risk: 7/10)
   - **Impact:** Docker compose won't work
   - **Likelihood:** High (docker-compose references missing file)
   - **Mitigation:** Create Dockerfile this week

4. **Auth0 Configuration Mismatch** (Risk: 6/10)
   - **Impact:** Oracle won't start in Docker
   - **Likelihood:** Medium (docker-compose requires Auth0)
   - **Mitigation:** Make Auth0 optional or enable it

### Medium Risk

5. **Outdated MCP SDK** (Risk: 5/10)
   - **Impact:** MCP server may have bugs or missing features
   - **Likelihood:** Medium
   - **Mitigation:** Test with current version first, upgrade in Week 2

6. **No Error Handling** (Risk: 5/10)
   - **Impact:** Demo could crash unexpectedly
   - **Likelihood:** Medium
   - **Mitigation:** Add try/catch and graceful degradation

7. **No Tests for Critical Paths** (Risk: 4/10)
   - **Impact:** Bugs may slip into demo
   - **Likelihood:** Low (manual testing catches most)
   - **Mitigation:** Add API route tests in Week 1

### Low Risk

8. **Voice Gateway Not Implemented** (Risk: 3/10)
   - **Impact:** Phase 5 unavailable
   - **Likelihood:** High (optional feature)
   - **Mitigation:** Already marked as optional

9. **Zod v4 Breaking Changes** (Risk: 2/10)
   - **Impact:** Validation may break
   - **Likelihood:** Low (not upgrading for demo)
   - **Mitigation:** Defer upgrade to post-demo

10. **Performance Issues** (Risk: 2/10)
    - **Impact:** Slow demo response times
    - **Likelihood:** Low (local AI is fast enough)
    - **Mitigation:** Use smaller Ollama model (1.5b)

---

## 12. Action Plan Summary

### Immediate Actions (Today)

1. **Run dependency installation**
   ```bash
   cd apps/zwave-mcp-server && npm install
   cd ../voice-gateway && npm install
   ```

2. **Fix oracle package.json**
   - Replace wildcard versions with exact versions
   - Use npm-check-updates or manual updates

3. **Create oracle Dockerfile**
   - Copy from voice-gateway template
   - Adjust for Next.js build process

### Week 1 Actions

1. Monday: Workspace setup + dependency management
2. Tuesday: Testing infrastructure + critical tests
3. Wednesday: Environment validation + error handling
4. Thursday: Docker deployment + health checks
5. Friday: Demo script + practice run #1

### Week 2 Actions

1. Monday: MCP SDK upgrade + testing
2. Tuesday: Shared utilities + logging
3. Wednesday: Security audit + secrets management
4. Thursday: CI/CD setup + automation
5. Friday: Practice runs #2-5

### Week 3 Actions

1. Monday: Voice gateway (if Phase 5 active)
2. Tuesday: Integration testing
3. Wednesday: Performance optimization
4. Thursday: Documentation updates
5. Friday: Practice runs #6-10 + record backup video

### Week 4 Actions

1. Monday: Final testing + bug fixes
2. Tuesday: Hardware testing on Pi 5
3. Wednesday: Dry run with full setup
4. Thursday: Final preparations
5. Friday: Final rehearsal

### Demo Day (January 12, 2026)

- [ ] Arrive 30 minutes early
- [ ] Test MQTT broker connectivity
- [ ] Test Ollama model loading
- [ ] Test Z-Wave devices
- [ ] Verify laptop battery charged
- [ ] Have backup video ready
- [ ] Have printed notes
- [ ] Deep breath and enjoy!

---

## 13. Contact & Next Steps

**This document should be reviewed with the team.**

### Questions to Answer:

1. **Is Voice Gateway (Phase 5) in scope for demo?**
   - If yes: Prioritize implementation in Week 3
   - If no: Mark as stretch goal and defer

2. **Which Ollama model for demo?**
   - Recommended: Qwen3:1.7b (best balance)
   - Alternative: Gemma2:2b (faster, less accurate)

3. **Auth0 integration status?**
   - Enable for demo? (requires setup)
   - Keep as optional? (simpler, less to break)

4. **Hardware availability?**
   - Raspberry Pi 5 (16GB) ready?
   - Z-Wave USB stick configured?
   - USB microphone tested?

5. **Network setup at venue?**
   - WiFi available?
   - Can run local MQTT broker?
   - Need hotspot backup?

### Follow-up Documents to Create:

1. **Demo Script** (`docs/demo-script.md`)
   - Step-by-step presentation flow
   - Fallback procedures
   - Timing for each section

2. **Hardware Setup Guide** (`docs/hardware-setup.md`)
   - Physical connections
   - Network configuration
   - Troubleshooting steps

3. **Presentation Slide Updates** (`presentation/slides/`)
   - Update with final architecture
   - Add code snippets
   - Include demo screenshots

---

## Appendix A: Recommended Reading

- [Next.js 15 Migration Guide](https://nextjs.org/docs/app/building-your-application/upgrading/version-15)
- [LangChain.js Tools Documentation](https://js.langchain.com/docs/modules/agents/tools/)
- [Ollama Model Library](https://ollama.ai/library)
- [Model Context Protocol Spec](https://github.com/modelcontextprotocol/specification)
- [Zod v4 Migration Guide](https://zod.dev/)
- [npm Workspaces Documentation](https://docs.npmjs.com/cli/v10/using-npm/workspaces)

---

## Appendix B: Package Version Reference

### Oracle Current Versions
```json
{
  "@langchain/core": "0.3.78",
  "@langchain/ollama": "0.2.4",
  "@prisma/client": "6.16.3",
  "langchain": "0.3.35",
  "mqtt": "5.14.1",
  "next": "15.5.4",
  "react": "19.2.0",
  "zod": "3.25.76"
}
```

### Recommended Updates
```json
{
  "@prisma/client": "6.17.1",
  "@types/node": "24.7.2",
  "@types/react": "19.2.2",
  "@types/react-dom": "19.2.1",
  "lucide-react": "0.545.0",
  "prisma": "6.17.1",
  "ts-jest": "29.4.5",
  "zod": "3.25.76"  // Keep for now, upgrade post-demo
}
```

---

**End of Analysis Report**

*Generated by Claude Code*
*Next Update: After Week 1 actions completed*
