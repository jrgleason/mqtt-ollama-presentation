# Network Dependencies

This document tracks all network/internet dependencies in the project and provides rationale for each.

## Overview

This project is designed to run **primarily locally** on your network, but has specific network requirements for certain services. The goal is to minimize cloud dependencies while maintaining security and usability for the CodeMash 2026 demo.

---

## Required Network Dependencies

### 1. Auth0 Authentication Service ☁️

**Service:** Auth0 (auth0.com)
**Network Type:** Internet (external cloud service)
**Used By:**
- `@auth0/nextjs-auth0` SDK
- `src/lib/auth0.ts`
- `src/middleware.ts`

**Rationale:**
- Auth0 is a cloud-based authentication service
- Provides secure, industry-standard OAuth2/OIDC authentication
- Universal Login page hosted by Auth0
- Token validation and session management

**Network Calls:**
- **Outbound to Auth0:**
  - User login redirects to `https://{AUTH0_DOMAIN}/authorize`
  - Token exchange at `https://{AUTH0_DOMAIN}/oauth/token`
  - User info retrieval at `https://{AUTH0_DOMAIN}/userinfo`
  - JWKS (public keys) at `https://{AUTH0_DOMAIN}/.well-known/jwks.json`
  - Logout at `https://{AUTH0_DOMAIN}/v2/logout`

**Mitigation for Offline Scenarios:**
- Could implement mock auth provider for local development
- Session cookies persist, reducing frequent auth calls
- JWKS keys are cached

**Demo Impact:**
- **Internet required at demo venue**
- Backup: Pre-authenticated session cookies (if demo WiFi fails)
- Can explain this is a design choice for secure authentication

---

### 2. Ollama Model Downloads 🔽

**Service:** Ollama model registry (ollama.com)
**Network Type:** Internet (one-time download)
**Used By:**
- Initial setup: `ollama pull qwen2.5:3b`

**Rationale:**
- Models must be downloaded once before use
- Downloads large files (1-3GB per model)

**Network Calls:**
- **Outbound to Ollama:**
  - Model download at `https://ollama.com/library/{model}`
  - Manifest and layer downloads

**Mitigation for Offline Scenarios:**
- **Models are cached locally after first download**
- Pre-download models before demo
- Models stored in `/usr/share/ollama/.ollama/models/` (Linux) or `~/.ollama/models/` (Mac)

**Demo Impact:**
- **No internet needed during demo** (after models are downloaded)
- Pre-setup: Download models on demo hardware before event

---

### 3. NPM Package Installation 📦

**Service:** npm registry (npmjs.org)
**Network Type:** Internet (one-time installation)
**Used By:**
- Development: `npm install` / `pnpm install`

**Rationale:**
- JavaScript dependencies must be fetched from npm
- Standard practice for Node.js projects

**Network Calls:**
- **Outbound to npm:**
  - Package downloads at `https://registry.npmjs.org/`
  - Package metadata retrieval

**Mitigation for Offline Scenarios:**
- **Dependencies installed once, then cached in `node_modules/`**
- Lock files (`package-lock.json`, `pnpm-lock.yaml`) ensure reproducible builds
- Could use offline npm mirror if needed

**Demo Impact:**
- **No internet needed during demo** (after `npm install` is run)
- Pre-setup: Run `npm install` before demo

---

## Local Network Dependencies (No Internet)

### 4. MQTT Broker (Mosquitto) 🏠

**Service:** Eclipse Mosquitto
**Network Type:** Local network only
**Endpoint:** `mqtt://localhost:1883` or `mqtt://{raspberry-pi-ip}:1883`

**Used By:**
- `mqtt.js` library
- `src/lib/mqtt/client.ts`
- zwave-js-ui MQTT gateway
- LangChain MQTT tools

**Rationale:**
- MQTT broker runs locally in Docker container or on Raspberry Pi
- No external network calls
- All MQTT traffic stays on local network

**Network Calls:**
- **Local only:** WebSocket/TCP connections to MQTT broker
- **Device communication:** Z-Wave devices → zwave-js-ui → MQTT → Next.js app

**Demo Impact:**
- **Fully local, no internet required**
- WiFi/network needed only for devices to communicate with each other
- Could run entirely on localhost if all services on one machine

---

### 5. Ollama API (Runtime) 🤖

**Service:** Ollama local server
**Network Type:** Local only
**Endpoint:** `http://localhost:11434` or `http://{raspberry-pi-ip}:11434`

**Used By:**
- `@langchain/ollama` client
- `src/lib/langchain/agent.ts`

**Rationale:**
- Ollama runs as a local HTTP server
- All LLM inference happens locally
- No data sent to cloud

**Network Calls:**
- **Local only:** HTTP requests to Ollama API
  - `POST /api/generate` - Text generation
  - `POST /api/chat` - Chat completions
  - `GET /api/tags` - List local models

**Demo Impact:**
- **Fully local, no internet required**
- Can run on same machine as Next.js app or on Pi 5

---

### 6. Z-Wave Controller (zwave-js-ui) 📡

**Service:** zwave-js-ui web interface
**Network Type:** Local network only
**Endpoint:** `http://localhost:8091` or `http://{raspberry-pi-ip}:8091`

**Used By:**
- Z-Wave device management
- MQTT gateway for Z-Wave devices
- Browser-based configuration UI

**Rationale:**
- Z-Wave uses local wireless protocol (not WiFi/internet)
- zwave-js-ui web UI for configuration only
- All control happens via MQTT (local)

**Network Calls:**
- **Local only:** HTTP for web UI, MQTT for device control
- Z-Wave radio operates on 908.42 MHz (US) or 868.42 MHz (EU)

**Demo Impact:**
- **Fully local, no internet required**
- Z-Wave devices communicate directly with USB controller

---

## Optional Network Dependencies

### 7. Docker Hub (Container Images) 🐳

**Service:** Docker Hub (hub.docker.com)
**Network Type:** Internet (one-time pull)
**Used By:**
- `docker-compose pull` or `docker pull`

**Rationale:**
- Docker images must be pulled once
- Includes: `eclipse-mosquitto`, `zwavejs/zwave-js-ui`, custom images

**Mitigation:**
- **Images cached locally after first pull**
- Could pre-build and save images as `.tar` files
- `docker save` and `docker load` for offline transfer

**Demo Impact:**
- **No internet needed during demo** (after images are pulled)
- Pre-setup: Pull all images before demo

---

### 8. GitHub (Repository Access) 🔄

**Service:** GitHub (github.com)
**Network Type:** Internet
**Used By:**
- `git clone`, `git pull`, `git push`

**Rationale:**
- Source code hosted on GitHub
- Version control and collaboration

**Mitigation:**
- **Not needed during demo** (code already cloned)
- Could use USB drive or network share for code transfer

**Demo Impact:**
- **No internet needed during demo**
- Pre-setup: Clone repository before demo

---

## Demo Environment Network Requirements

### Minimum Network Setup for Live Demo

**Option A: Full Internet Access (Recommended)**
- ✅ Auth0 authentication works normally
- ✅ Can show full authentication flow
- ✅ Most reliable for audience

**Option B: Local Network Only (Backup)**
- ⚠️ Auth0 will fail without internet
- ✅ MQTT, Ollama, Z-Wave still work
- ✅ Could use pre-authenticated session or mock auth
- 📝 Must explain Auth0 requires internet

**Option C: Fully Offline (Emergency)**
- ❌ Auth0 authentication disabled
- ✅ All local services work (MQTT, Ollama, Z-Wave)
- ✅ Remove auth middleware temporarily
- 📝 Must explain this is demo-only configuration

---

## Network Dependency Summary Table

| Service | Network Type | Required During Demo? | Mitigation |
|---------|--------------|----------------------|------------|
| **Auth0** | Internet ☁️ | Yes | Pre-authenticated session |
| **Ollama Models** | Internet 🔽 | No (pre-download) | Cache models before demo |
| **npm packages** | Internet 📦 | No (pre-install) | Run `npm install` before |
| **MQTT Broker** | Local 🏠 | Local network only | Fully local |
| **Ollama Runtime** | Local 🤖 | Local network only | Fully local |
| **zwave-js-ui** | Local 📡 | Local network only | Fully local |
| **Docker Images** | Internet 🐳 | No (pre-pull) | Pull images before demo |
| **GitHub** | Internet 🔄 | No | Clone repo before demo |

---

## Design Philosophy

### Cloud-Free Where Possible 🛡️

The project prioritizes **local-first architecture**:
- ✅ All AI processing happens locally (Ollama)
- ✅ All device control is local (MQTT + Z-Wave)
- ✅ No telemetry or data sent to cloud
- ⚠️ Only Auth0 requires cloud (security best practice)

### Why Auth0 Cloud vs Local Auth?

**Reasons for cloud-based Auth0:**
1. **Security best practices** - OAuth2/OIDC standard
2. **Industry-standard solution** - Demonstrate production-ready approach
3. **Ease of implementation** - Official Next.js SDK
4. **Social login support** - Could add Google/GitHub login
5. **Audit logging** - Auth attempts tracked by Auth0

**Trade-off accepted:**
- Authentication is the **only** cloud dependency during demo
- Could swap for local auth (e.g., NextAuth.js, Keycloak) in production
- For home automation, local auth might be preferred
- Demo prioritizes showing proper auth patterns

---

## Testing Network Dependencies

### Pre-Demo Checklist

1. **Internet connectivity test:**
   ```bash
   curl -I https://YOUR_DOMAIN.auth0.com
   # Should return 200 OK
   ```

2. **Ollama models cached:**
   ```bash
   ollama list
   # Should show qwen2.5:3b or gemma2:2b
   ```

3. **npm packages installed:**
   ```bash
   cd langchain-service && npm list --depth=0
   # Should show all dependencies
   ```

4. **Docker images pulled:**
   ```bash
   docker images | grep -E "mosquitto|zwave-js-ui"
   # Should show images with sizes
   ```

5. **Local MQTT broker reachable:**
   ```bash
   curl -v mqtt://localhost:1883
   # Or use MQTT client to test connection
   ```

6. **Local Ollama reachable:**
   ```bash
   curl http://localhost:11434/api/tags
   # Should return JSON with model list
   ```

---

## Backup Plans for Network Failures

### If Demo Venue WiFi Fails

**Priority 1: Use Phone Hotspot**
- Enable mobile hotspot on phone
- Connect demo laptop to hotspot
- Auth0 will work over cellular

**Priority 2: Skip Authentication**
- Temporarily disable auth middleware
- Hard-code a demo user session
- Show code and explain this is demo-only
- All other features (MQTT, Ollama, Z-Wave) still work

**Priority 3: Show Pre-Recorded Video**
- Backup video in `presentation/backup-demo.mp4`
- Explain the code while video plays
- Walk through architecture diagrams

---

## Future Improvements

**Reduce Network Dependencies:**
1. **Optional local auth** - Implement NextAuth.js as alternative to Auth0
2. **Offline model serving** - Pre-bundle Ollama models in Docker image
3. **Vendored npm packages** - Bundle dependencies in repo (not recommended)

**Enhance Local-First:**
1. **Local LLM** ✅ Already implemented (Ollama)
2. **Local MQTT** ✅ Already implemented (Mosquitto)
3. **Local Z-Wave** ✅ Already implemented (USB stick)
4. **Local voice** 🎯 Whisper.cpp (stretch goal)

---

## References

- [Auth0 Documentation](https://auth0.com/docs)
- [Ollama Documentation](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [MQTT Protocol Specification](https://mqtt.org/)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)

---

**Last Updated:** 2025-09-29
**Maintained By:** Project documentation team
**Referenced By:** CLAUDE.md (AI development guidelines)