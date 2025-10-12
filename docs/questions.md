# Clarifying Questions for CodeMash 2026 Presentation

**Last Updated:** 2025-09-29

---

## ✅ ANSWERED QUESTIONS (Decisions Made)

### Q1. Z-Wave JS UI Integration Strategy ✅
**Question:** Should we fork zwave-js-ui or use it as-is?

**Decision:** Use as-is

**Rationale:**
- zwave-js-ui already has comprehensive MQTT support built-in
- Less maintenance overhead
- Can reference official documentation
- Well-maintained and actively developed

**Context:** zwave-js-ui already has comprehensive MQTT support built-in.

---

### Q2. Frontend Architecture ✅
**Question:** How should we structure the frontend application?

**Decision: Next.js with App Router**

**Rationale:**
After comprehensive research comparing Next.js vs React Native Web (see [detailed analysis](architecture-decision-nextjs-vs-react-native.md)), Next.js is the optimal choice because:

1. **Aligns with browser-based demo preference** (Q7 explicitly states browser-based is preferred)
2. **Superior web dashboard experience** - Optimized for desktop/laptop interfaces
3. **Native LangChain.js integration** - Server Components and API Routes provide clean integration
4. **First-class Auth0 support** - Official Next.js SDK with excellent documentation
5. **Simpler for live demo** - Fewer potential failure points during one-hour presentation
6. **Better performance** - SSR, automatic code splitting, optimized bundling
7. **No mobile requirement** - Project scope doesn't include iOS/Android apps

While React Native Web offers cross-platform capabilities (iOS + Android + Web from single codebase), this benefit isn't needed for the current project scope. The added complexity would increase risk for the live demo without providing value.

**Implementation:**
- Next.js 14+ with App Router
- TypeScript
- Server Components for data fetching
- Client Components for MQTT real-time updates
- API Routes for LangChain integration
- WebSocket support for MQTT

**See:** `docs/architecture-decision-nextjs-vs-react-native.md` for complete 20-page comparison

---

### Q8. Auth0 Configuration ✅
**Question:** What Auth0 setup is needed?

**Decision: Use Auth0 Next.js SDK v4**

**Setup Requirements:**
Based on [Auth0 Next.js Quickstart](https://auth0.com/docs/quickstart/webapp/nextjs/interactive):

1. **Environment Variables** (.env.local):
   - `AUTH0_SECRET` - Generated via `openssl rand -hex 32`
   - `APP_BASE_URL` - http://localhost:3000 (dev), production URL (prod)
   - `AUTH0_DOMAIN` - Auth0 tenant domain
   - `AUTH0_CLIENT_ID` - Application Client ID
   - `AUTH0_CLIENT_SECRET` - Application Client Secret

2. **Auth0 Dashboard Configuration:**
   - Allowed Callback URLs: `http://localhost:3000/auth/callback`
   - Allowed Logout URLs: `http://localhost:3000`

3. **SDK Installation:**
   - Package: `@auth0/nextjs-auth0`

4. **Implementation Files:**
   - `src/lib/auth0.ts` - Auth0 client instance
   - `src/middleware.ts` - Authentication middleware
   - `src/app/page.tsx` - Landing page with login/logout

5. **Features:**
   - Universal Login (Auth0 hosted login page)
   - Automatic session management
   - Server-side authentication via middleware
   - React hooks for client-side auth state

**For Demo:**
- Single demo tenant sufficient
- Internet required (Auth0 is cloud-based)
- RBAC not needed for MVP (can be stretch goal)

**Network Dependency:** Auth0 requires internet connection during demo. See [Network Dependencies](network-dependencies.md) for mitigation strategies.

---

## 📝 QUESTIONS WITH USER INPUT (Implementation Details Needed)

### Q3. Database Schema
**Question:** What data needs to be persisted in SQLite?

**User Input:** "This should be handled as needed. If a requirement needs a data store other than a file or blob data store use SQLite"

**Potential tables:**
- Users (Auth0 integration)
- Device mappings (MQTT topic → friendly name → room)
- Conversation history (for context)
- Command templates (predefined commands)
- User preferences (personality settings, favorites)
- Event logs (for debugging/analytics)

**Implementation Decision Needed:**
- Which tables are essential vs stretch goals?
- Should we start with minimal schema and expand as needed?
- **Proposed Approach:** Start with Users, Devices, and User Preferences. Add others as requirements emerge.

---

### Q4. Wake Word Detection
**Question:** Which wake word solution should we use, if any?

**User Input:** "For now I am not worried about license on the tools so use the recommended option. As long as it supports Whisper."

**Options:**
- **Porcupine** (Picovoice) - Commercial, reliable, requires license
- **Snowboy** - Open source but deprecated/unmaintained
- **Picovoice** - Similar to Porcupine
- **Push-to-talk** - Simpler for demo, no wake word needed
- **Browser-based** - Use Web Speech API (not fully local)

**Recommendation:** Push-to-talk might be simplest and most reliable for demo

**Implementation Decision Needed:**
- Confirm wake word vs push-to-talk approach
- **Proposed Approach:** Start with push-to-talk for MVP, wake word as stretch goal

---

### Q5. Ollama Deployment
**Question:** Where should Ollama run?

**User Input:** "It will be run natively on the device, my guess is it will be a raspberry pi 5"

**Confirmed:**
- Ollama runs natively on device (not containerized with Next.js)
- Likely Raspberry Pi 5
- Separate from Next.js application

**Follow-up Question:** Should model selection be configurable at runtime, or hardcoded for demo?
- **Proposed Approach:** Hardcode model for demo (qwen2.5:3b or gemma2:2b), config via environment variable

---

### Q6. MQTT Broker Configuration
**Question:** How should the MQTT broker be deployed?

**User Input:** "It will be deployed as part of the helm chart, more requirements to come here"

**Confirmed:**
- Mosquitto deployed via Helm chart
- Part of Kubernetes deployment

**Security Considerations:**
- TLS/SSL for production
- Authentication/authorization
- Topic ACLs

**Implementation Decision Needed:**
- For demo: Basic authentication sufficient, or open for simplicity?
- **Proposed Approach:** Basic username/password auth for demo, document TLS setup for production

---

### Q7. Voice Input Method
**Question:** How should voice input be captured?

**User Input:** "I think for demo reasons using the browser is the way to go. We can mention normally this could be done within a network and not exposed but I feel like that is the simplest way to demo it."

**Confirmed:**
- Browser-based microphone API
- Simpler for demo purposes
- Mention network-local option during presentation

**Options:**
- **Browser-based:** Microphone API ✅ (SELECTED)
- **Dedicated service:** Separate Node.js service
- **Mobile app:** Companion React Native app
- **Hardware button:** Physical trigger on Pi/ESP32

**Follow-up:** Does voice need to be "always listening" or triggered?
- **Proposed Approach:** Push-to-talk/click-to-speak for reliability

---

### Q9. Hardware Requirements
**Question:** What hardware is needed to run the full demo?

**User Input:** "If we use a Raspberry pi I have a daughter board that should work. If we use something else I would probably use a stick."

**Hardware Options:**
- Raspberry Pi 5 with daughter board Z-Wave controller
- USB Z-Wave stick (alternative)

**Implementation Decision Needed:**
- Confirm final hardware choice
- Physical Z-Wave devices or mock devices?
- **Proposed Approach:** Raspberry Pi 5 + daughter board + 2-3 physical Z-Wave devices

---

### Q10. Mock Devices
**Question:** Should we support mock/simulated Z-Wave devices?

**User Input:** "Mock devices could be a stretch goal but real devices are preferred if feasible."

**Confirmed:**
- Real physical Z-Wave devices preferred
- Mock devices as stretch goal/fallback

**Benefits of Mock:**
- Demo without physical hardware
- Consistent behavior
- No hardware failures during presentation

**Drawbacks:**
- Less impressive than real devices
- Extra implementation work

**Implementation Approach:**
- Start with real devices
- Create mock device interface if time permits
- Document both approaches

---

### Q11. AI Personality Configuration
**Question:** How should the AI personality system work?

**User Input:** "This is a stretch goal so ignore for now."

**Status:** DEFERRED - Stretch goal

**Options (for later):**
- **Hardcoded:** Few predefined personalities (sarcastic, helpful, enthusiastic)
- **User-selectable:** Dropdown/settings to choose personality
- **Dynamic:** AI generates personality based on context
- **Configurable prompts:** Users can write their own system prompts

**Implementation Priority:** Low - Add after MVP is complete

---

### Q12. Live Demo vs Recorded
**Question:** What's the demo strategy?

**User Input:** "This will be a live demo."

**Confirmed:**
- Live demo (not pre-recorded)
- Prepare backup recorded video as contingency

**Failure Mitigation:**
- What if WiFi fails? → Phone hotspot, pre-authenticated session
- What if Ollama is slow? → Use smaller model, reduce complexity
- What if voice recognition fails? → Fall back to text input

**See:** [Network Dependencies](network-dependencies.md) for complete mitigation strategies

---

### Q13. Code Walkthrough Depth
**Question:** How technical should the code walkthrough be?

**User Input:** "We don't have a lot of time so it will need to be detailed but high level enough we can make the time goals. This presentation should have a hard requirement of being an hour long."

**Constraints:**
- 60 minutes total presentation time
- Balance detail vs time management

**Proposed Structure:**
1. Architecture overview (5 min)
2. Live demo: natural language commands (10 min)
3. Code walkthrough: LangChain tool implementation (15 min)
4. MQTT integration patterns (10 min)
5. Voice command demo (stretch, 5 min)
6. Q&A (15 min)

**Audience Assumption:** Intermediate to advanced developers

---

### Q14. Audience Interaction
**Question:** Should the audience participate in the demo?

**User Input:** "We won't have time for audience participation"

**Confirmed:**
- No audience interaction due to time constraints
- Focus on clear, efficient demonstration

**Ideas (not implementing):**
- Let audience suggest voice commands
- QR code to interface where they can send commands
- Vote on which personality the AI should use
- Audience member comes up to try voice control

---

### Q15. Stretch Goals Priority
**Question:** If we run out of time, which features can be cut?

**User Input:** See recommendations below

**Essential (MVP):**
- ✅ LangChain + Ollama integration
- ✅ MQTT pub/sub
- ✅ Basic device control
- ✅ Auth0 login
- ✅ Docker/Helm deployment

**Nice to have (Stretch Goals):**
- 🎯 Voice commands with Whisper (browser-based microphone API)
- 🎯 Personality system (configurable system prompts)
- 🎯 Conversation history (SQLite storage)
- 🎯 ESP32 example (separate repo/demo)

**Implementation Priority:**
1. **MVP first** - Get core features working reliably
2. **Voice commands** - Adds "wow factor" to demo
3. **Conversation history** - Shows context awareness
4. **Personality system** - Demonstrates LLM flexibility
5. **ESP32 example** - Optional separate component

**Question for User:** Which stretch goals are most impressive for audience?
- **Proposed Answer:** Voice commands (most audience-visible), then conversation history

---

## 📊 Decision Log

| Date | Question # | Decision | Rationale |
|------|-----------|----------|-----------|
| 2025-09-29 | Q1 | Use zwave-js-ui as-is | Built-in MQTT support, well-maintained, less overhead |
| 2025-09-29 | Q2 | Next.js with App Router | Browser-based demo preference, superior web performance, native LangChain/Auth0 integration, simpler architecture for live presentation, no mobile requirement. See `docs/architecture-decision-nextjs-vs-react-native.md` |
| 2025-09-29 | Q8 | Auth0 Next.js SDK v4 | Official SDK with Universal Login, automatic session management, server-side authentication via middleware. Single demo tenant sufficient, internet required for Auth0 cloud service. |

---

## 📋 Summary Status

### Fully Answered: 3/15 (20%)
- ✅ Q1: Z-Wave integration strategy
- ✅ Q2: Frontend architecture (Next.js)
- ✅ Q8: Auth0 configuration

### User Input Received: 12/15 (80%)
- 📝 Q3: Database schema (as-needed approach confirmed)
- 📝 Q4: Wake word detection (license OK, prefers Whisper support)
- 📝 Q5: Ollama deployment (native on Pi 5)
- 📝 Q6: MQTT broker (Helm chart deployment)
- 📝 Q7: Voice input (browser-based confirmed)
- 📝 Q9: Hardware (Pi 5 + daughter board)
- 📝 Q10: Mock devices (real preferred, mock as stretch)
- 📝 Q11: AI personality (stretch goal, defer)
- 📝 Q12: Demo strategy (live demo confirmed)
- 📝 Q13: Code depth (60 min, detailed but high-level)
- 📝 Q14: Audience interaction (no time for participation)
- 📝 Q15: Stretch goals (MVP first, then voice/history/personality)

### Implementation Actions Needed:
Most questions have user input but need final implementation decisions during development. Key decisions to make during Phase 2:
- Database schema specifics
- Push-to-talk vs wake word implementation
- MQTT security configuration (basic auth vs open)
- Final hardware setup confirmation

---

## 🔗 Related Documentation

- [Architecture Decision: Next.js vs React Native](architecture-decision-nextjs-vs-react-native.md)
- [Network Dependencies](network-dependencies.md)
- [Requirements](requirements.md)
- [Tasks](tasks.md)