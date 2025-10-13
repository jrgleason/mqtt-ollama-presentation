# Implementation Plan

**Last Updated:** October 11, 2025
**Current Status:** Phase 1 mostly complete (78%), Phase 2 in progress

## Current Sprint Focus (DEMO CRITICAL)

**Goal:** Complete core chatbot features with real database and MQTT integration

**Completed This Week:** ✅
- Phase 1.1, 1.5, 1.6, 1.7, 1.9: Project setup complete
- Phase 2.1.2, 2.1.3: Ollama integration and chat API working
- Database seeded with 4 mock devices
- Chat interface confirmed functional

**Critical Discovery:** ⚠️ Model tool calling compatibility issues
- qwen3:1.7b does NOT support LangChain tools (despite documentation)
- llama3.2:1b CONFIRMED working with tool calling
- Must verify tool support before model selection

**Next Up:** 🔴 DEMO CRITICAL
1. Update LangChain tools to use Prisma database
2. Implement MQTT client
3. Connect device control to MQTT
4. Z-Wave integration

---

## Completed Tasks

- [x] ✅ 1. Set up project structure and core dependencies
  - Initialize Next.js 15.5.4 project with TypeScript and App Router
  - Install core dependencies: LangChain, Ollama client, MQTT client, Prisma
  - Configure TailwindCSS and basic project structure
  - Set up environment variables and configuration files
  - _Requirements: 7.3, 7.7_

- [x] ✅ 2. Implement database layer and models
  - [x] ✅ 2.1 Set up Prisma with SQLite database
    - Configure Prisma schema with User, Device, UserPreferences, Shortcut, and Conversation models
    - Generate Prisma client and run initial migrations
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] ✅ 2.2 Create database service layer
    - Implement database connection utilities and error handling
    - Create repository pattern for data access operations
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 2.3 Write unit tests for database operations (DEFERRED - Post Demo)
    - Create unit tests for database models and operations
    - Set up in-memory SQLite for testing
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 3. Implement MQTT communication layer
  - [ ] 3.1 Create MQTT client with connection management
    - Implement singleton MQTT client with automatic reconnection
    - Add topic subscription management and message publishing
    - Handle connection errors and implement exponential backoff
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ] 3.2 Implement device discovery and state management
    - Create device discovery via MQTT topic scanning
    - Implement real-time device state cache with MQTT subscriptions
    - Add device online/offline detection and handling
    - _Requirements: 2.2, 2.3, 2.4, 2.5_

  - [ ]* 3.3 Write integration tests for MQTT functionality
    - Create tests with mock MQTT broker
    - Test connection handling and message processing
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 4. Set up Auth0 authentication system
  - [ ] 4.1 Configure Auth0 integration
    - Set up Auth0 application and configure OIDC SPA flow
    - Implement Auth0 middleware for route protection
    - Add JWT token validation for API endpoints
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ] 4.2 Implement session management
    - Add automatic token refresh handling
    - Create user session persistence across browser restarts
    - Implement graceful authentication error handling
    - _Requirements: 4.3, 4.4, 4.5_

  - [ ]* 4.3 Write authentication flow tests
    - Test login/logout flows and token validation
    - Test protected route access and session management
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] ✅ 5. Create LangChain integration with Ollama
  - [x] ✅ 5.1 Set up Ollama client and LangChain agent
    - Configure Ollama client connection and model selection
    - Implement LangChain agent with conversation memory
    - Add personality system for configurable AI responses
    - **CRITICAL DISCOVERY:** qwen3:1.7b does NOT support tool calling - switched to llama3.2:1b
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] ✅ 5.2 Create custom LangChain tools for device control (MOCK DATA)
    - Implement MQTT tool for device communication
    - Create device control tool with turn on/off, dimming, and room-based operations
    - Add device discovery and state retrieval tools
    - **STATUS:** Working with mock data, needs Prisma integration
    - _Requirements: 1.1, 1.4, 1.5, 2.1, 3.2, 3.3_

  - [x] ✅ 5.3 Implement natural language command processing
    - Add command parsing and context management
    - Implement ambiguous command handling with clarifying questions
    - Create complex scene command support for multiple device actions
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ]* 5.4 Write unit tests for LangChain tools and agent (DEFERRED - Post Demo)
    - Test device control tools with mock MQTT client
    - Test natural language processing and command parsing
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

## Current Sprint Tasks (DEMO CRITICAL)

### 🔴 CRITICAL: Update LangChain Tools to Use Database
- [ ] 5.2.1 Update device-list-tool to use Prisma database
  - Replace mock data with `prisma.device.findMany()`
  - Format output for AI consumption
  - Test with real database
  - **Priority:** DEMO CRITICAL
  - **Status:** Tools currently use mock data, need database integration

- [ ] 5.2.2 Update device-control-tool to use Prisma + MQTT
  - Add device lookup from database using friendly names
  - Publish MQTT command using device.mqttTopic
  - Update device state in database after command
  - Test end-to-end device control
  - **Priority:** DEMO CRITICAL

### 🔴 CRITICAL: MQTT Client Implementation
- [ ] 3.1 Create MQTT client singleton
  - Implement connection to HiveMQ broker (10.0.0.58:31883)
  - Add reconnection logic and error handling
  - Create publish/subscribe functionality
  - **Priority:** DEMO CRITICAL

- [ ] 3.2 Integrate MQTT with LangChain tools
  - Connect device-control-tool to MQTT client
  - Test: Chat → LangChain → Database → MQTT → Device
  - Verify MQTT broker connection from running app
  - **Priority:** DEMO CRITICAL

### 🔴 CRITICAL: Model Tool Calling Fix
- [ ] 5.1.1 Re-enable tools with selective calling
  - Tools temporarily disabled to test raw model speed
  - Re-implement agent with proper system prompt to avoid unnecessary tool calls
  - Test that "Hi how are you" does NOT trigger tools
  - Test that "Turn on the light" DOES trigger device_control tool
  - Verify tool calling with llama3.2:1b (confirmed compatible)
  - **Priority:** DEMO CRITICAL - device control is core functionality

### Next Week Priorities
- [ ] 8. Setup zwave-js-ui on Raspberry Pi
- [ ] 8.1 Pair Z-Wave devices and import to database
- [ ] 8.2 Test physical device control
- [ ] 10. Begin presentation materials

- [ ] 6. Implement API routes and backend services
  - [ ] 6.1 Create chat API endpoint
    - Implement /api/chat route with LangChain agent integration
    - Add conversation processing and response generation
    - Handle errors and timeouts gracefully
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [ ] 6.2 Create device management API endpoints
    - Implement /api/devices routes for device listing and control
    - Add individual device state retrieval and command endpoints
    - Implement real-time device state synchronization
    - _Requirements: 2.1, 2.2, 2.5, 3.2, 3.3_

  - [ ] 6.3 Add user preferences and shortcuts API
    - Create endpoints for user preference management
    - Implement shortcut creation and execution endpoints
    - Add data export/import functionality
    - _Requirements: 5.1, 5.4, 5.5_

  - [ ]* 6.4 Write API endpoint tests
    - Test chat endpoint with mock LangChain agent
    - Test device endpoints with mock MQTT client
    - Test authentication middleware and error handling
    - _Requirements: 1.1, 2.1, 4.1, 5.1_

- [ ] 7. Build React frontend components
  - [ ] 7.1 Create main dashboard and layout
    - Implement dashboard page with device overview grid
    - Create responsive layout with navigation and system status
    - Add quick action buttons for common commands
    - _Requirements: 7.3, 7.4, 7.5_

  - [ ] 7.2 Implement chat interface component
    - Create conversational chat interface with message history
    - Add natural language input field with real-time processing
    - Implement conversation context display and device action feedback
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 7.3, 7.5_

  - [ ] 7.3 Create device card components
    - Implement individual device status and control cards
    - Add real-time state updates via MQTT integration
    - Create device-specific controls (switches, dimmers, sensors)
    - _Requirements: 2.5, 3.2, 3.3, 7.4_

  - [ ] 7.4 Build settings and preferences pages
    - Create personality configuration interface
    - Implement device management and room assignment
    - Add user preferences and shortcut management
    - _Requirements: 1.4, 5.1, 5.4_

  - [ ]* 7.5 Write component tests
    - Test React components with mock data and interactions
    - Test real-time updates and error handling
    - _Requirements: 7.3, 7.4, 7.5_

- [ ] 8. Integrate Z-Wave devices via zwave-js-ui
  - [ ] 8.1 Configure zwave-js-ui MQTT gateway
    - Set up zwave-js-ui Docker container with MQTT integration
    - Configure device discovery and MQTT topic mapping
    - Implement Z-Wave device type detection (switches, dimmers, sensors, thermostats)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 8.2 Implement Z-Wave device control integration
    - Map Z-Wave device IDs to friendly names and room assignments
    - Implement binary switch, multilevel switch, and sensor support
    - Add Z-Wave device event handling and state change responses
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

  - [ ]* 8.3 Test Z-Wave integration with physical devices
    - Test device control with real Z-Wave switches and dimmers
    - Verify sensor data integration and event handling
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 7.4_

- [ ] 9. Set up deployment infrastructure
  - [ ] 9.1 Configure Docker containers and services
    - Set up HiveMQ Community Edition MQTT broker container
    - Configure zwave-js-ui container with USB device access
    - Create Docker Compose configuration for development environment
    - _Requirements: 7.1, 7.7_

  - [ ] 9.2 Prepare production deployment for Raspberry Pi
    - Configure Ollama installation on Raspberry Pi 5
    - Set up Next.js application deployment (Docker or native)
    - Configure persistent storage for SQLite database and Z-Wave data
    - _Requirements: 7.1, 7.7_

  - [ ]* 9.3 Write deployment and infrastructure tests
    - Test Docker container startup and service connectivity
    - Verify Raspberry Pi deployment and performance
    - _Requirements: 7.1, 7.7_

- [ ] 10. Implement demo-specific features and optimizations
  - [ ] 10.1 Create demo data and scenarios
    - Set up demo device configurations and room assignments
    - Create example conversation flows and command scenarios
    - Implement backup mechanisms for presentation (mock devices, recorded responses)
    - _Requirements: 7.1, 7.2, 7.4, 7.8, 7.9_

  - [ ] 10.2 Optimize performance for live demo
    - Configure Ollama with optimized models (Qwen3:1.7b or Gemma2:2b)
    - Implement response time optimizations and caching
    - Add demo-specific error handling and fallback mechanisms
    - _Requirements: 7.1, 7.4, 7.5, 7.8, 7.9_

  - [ ] 10.3 Prepare presentation materials and documentation
    - Create complete source code documentation and deployment instructions
    - Prepare architecture diagrams and technical presentation materials
    - Set up demo environment with isolated network and secure configuration
    - _Requirements: 7.1, 7.2, 7.7, 7.8, 7.9_

  - [ ]* 10.4 Conduct end-to-end demo testing
    - Test complete user flow from authentication to device control
    - Verify presentation timing and demo reliability
    - Test backup mechanisms and error recovery
    - _Requirements: 7.1, 7.2, 7.4, 7.5, 7.8, 7.9_
## Technic
al Debt & Post-Demo Tasks

### TECH DEBT: Re-enable ESLint during builds
- **Priority:** High (Post-Demo)
- **Context:** ESLint checks temporarily disabled during `next build` to avoid build-time warnings
- **Files affected:** `oracle/next.config.ts`, `oracle/eslint.config.mjs`, `.eslintignore`
- **Goal:** Re-enable ESLint in CI and during local builds
- **Tasks:**
  - [ ] Revert `eslint.ignoreDuringBuilds` in `oracle/next.config.ts`
  - [ ] Remove broad overrides in `oracle/eslint.config.mjs`
  - [ ] Fix lint failures and add `npm run lint` to CI pipeline
  - **Estimated effort:** 1-4 hours

### TECH DEBT: Enable HiveMQ authentication
- **Priority:** Medium (Post-Demo)
- **Context:** HiveMQ currently uses anonymous access for demo simplicity
- **Tasks:**
  - [ ] Install HiveMQ RBAC extension
  - [ ] Configure secure credentials
  - [ ] Update MCP server to use authentication

### Auth0 Integration (OPTIONAL - Post Demo)
- **Status:** Deferred until after demo works
- **Rationale:** Focus on core functionality first
- **Tasks:**
  - [ ] Create Auth0 account/tenant
  - [ ] Configure Auth0 application (SPA)
  - [ ] Setup Auth0 SDK in Next.js
  - [ ] Create login/logout routes and protected API middleware

## Progress Summary

### Phase Completion Rates (Updated)
- **Phase 0:** Infrastructure - 7/23 (30%)
- **Phase 1:** Project Setup - 28/36 (78%) ✅ Mostly Complete
- **Phase 2:** AI Chatbot - 6/95 (6%) 🔄 Active Development
- **Phase 3:** MQTT - 2/15 (13%) 🔄 Starting
- **Phase 4:** Z-Wave - 0/20 (0%) ⏳ Queued
- **Phase 5:** Voice - 0/20 (0%) 🎯 Stretch Goal
- **Phase 6:** ESP32 - 0/15 (0%) 🎯 Stretch Goal
- **Phase 7:** Deployment - 1/25 (4%) 🎯 Optional
- **Phase 8:** Presentation - 0/30 (0%) 🔴 Upcoming

### Key Milestones Achieved
- ✅ Next.js 15.5.4 project initialized and running
- ✅ Prisma database setup with seed data (4 devices)
- ✅ Ollama integration tested and working
- ✅ Chat API route with streaming SSE responses
- ✅ LangChain tools implemented (using mock data)
- ✅ Chat UI confirmed working by user
- ✅ HiveMQ MQTT broker running in Kubernetes

### Critical Path to Demo
```
✅ Phase 0.3 (Ollama)
  → ✅ Phase 1.5-1.7 (Next.js + DB)
    → 🔄 Phase 2.2 (LangChain Tools with DB/MQTT)
      → 🔄 Phase 3 (MQTT Client)
        → Phase 4 (Z-Wave)
          → Phase 8 (Presentation)
```

**Estimated Time to Demo-Ready:** 2-3 weeks

### Status Legend
- ✅ Completed
- 🔄 In Progress
- ⏳ Not Started
- 🔴 DEMO CRITICAL
- 🎯 Stretch Goal (Optional)
- 🟡 Partially Complete
