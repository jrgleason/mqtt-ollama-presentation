# Repository Guidelines

## Project Structure & Module Organization
Services live under `apps/`: `apps/oracle` (Next.js UI, LangChain, Prisma), `apps/voice-gateway-oww` (wake-word + STT), `apps/voice-gateway-common` (shared audio helpers), and `apps/zwave-mcp-server` (TypeScript MCP bridge). `deployment/` holds Docker and broker config, and `docs/` captures runbooks and architecture notes. Keep feature tests near code in `__tests__` directories such as `apps/oracle/src/lib/mqtt/__tests__`.

## Build, Test, and Development Commands
Install dependencies per app with `npm install`. In `apps/oracle` use `npm run dev` for hot reload or `npm run build && npm run start` for production parity. `apps/voice-gateway-oww` runs via `npm run dev` after seeding assets with `npm run setup`. `apps/zwave-mcp-server` compiles with `npm run build` and launches through `npm start`. Use `docker compose up --build` from the repo root for the full stack once Ollama is reachable at `http://host.docker.internal:11434`.

## Coding Style & Naming Conventions
Honor the shared ESLint config and four-space indentation. Name React components and context providers in PascalCase, hooks and utilities camelCase, and MQTT topics lowercase-kebab. Prefer Tailwind utilities; shared tokens live in `apps/oracle/src/styles`. Use `.mjs`/`ts` config files when runtime logic is needed.

## Testing Guidelines
Jest drives testing across services. Run `npm test`, `npm run test:watch`, or `npm run test:coverage` inside `apps/oracle` or `apps/voice-gateway-oww`. Store new specs beside code under `__tests__` with `*.test.ts` or `*.test.js` names. Mock MQTT, Ollama, and audio IO so suites stay offline, and call out hardware assumptions in the test header. Aim for coverage on messaging flows, LangChain tools, and wake-word state machines before opening a PR.

## Commit & Pull Request Guidelines
Favor conventional commits (`feat:`, `fix:`, `docs:`) for clarity and keep changes scoped to one service when practical. Pull requests should summarize the automation scenario, list new commands or environment variables, link relevant docs or issues, and attach screenshots or terminal output for UX changes. Document Raspberry Pi manual steps in the PR body.

## Security & Configuration Tips
Keep `.env*`, SQLite files, and downloaded models out of git and verify the ignore list before committing. Store secrets in local `.env.local` files or Compose overrides under `deployment/`. When adding MQTT topics or Auth0 scopes, update the docs so operators can tighten brokers and identity providers. Coordinate voice models and the Z-Wave schema to keep automation flows aligned.
