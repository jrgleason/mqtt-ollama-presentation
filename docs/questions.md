# Clarifying Questions for CodeMash 2026 Presentation

## Architecture Decisions

### 1. Z-Wave JS UI Integration Strategy
**Question:** Should we fork zwave-js-ui or use it as-is?

**Context:** zwave-js-ui already has comprehensive MQTT support built-in.

**Options:**
- **Use as-is:** Less maintenance, can reference official docs, but less control for demo
- **Fork:** More control for demo customization, can add features, but maintenance overhead

**Recommendation Needed:** Correct we will use the ZWave MQTT Integration that is already built into zwave-js-ui

---

### 2. Frontend Architecture
**Question:** How should we structure the Next.js application?

**Options:**
- Separate React SPA frontend + Next.js API backend (clearer separation)
- Full Next.js app with pages directory (simpler deployment)
- Next.js App Router with server components (modern approach)

**Recommendation Needed:** Use the most modern approach and in fact use the playwright MCP to make sure that you are using the newest approach by visiting 

---

### 3. Database Schema
**Question:** What data needs to be persisted in SQLite?

**Potential tables:**
- Users (Auth0 integration)
- Device mappings (MQTT topic → friendly name)
- Conversation history (for context)
- Command templates (predefined commands)
- User preferences (personality settings, favorites)
- Event logs (for debugging/analytics)

**Recommendation Needed:** Which tables are essential vs stretch goals?

---

### 4. Wake Word Detection
**Question:** Which wake word solution should we use, if any?

**Options:**
- **Porcupine** (Picovoice) - Commercial,

 reliable, requires license
- **Snowboy** - Open source but deprecated/unmaintained
- **Picovoice** - Similar to Porcupine
- **Push-to-talk** - Simpler for demo, no wake word needed
- **Browser-based** - Use Web Speech API (not fully local)

**For demo purposes:** Push-to-talk might be simplest and most reliable

**Recommendation Needed:** ?

---

## Technical Implementation

### 5. Ollama Deployment
**Question:** Where should Ollama run?

**Options:**
- Same container as Next.js (simpler but resource-intensive)
- Separate Docker container (better separation of concerns)
- External service (assumes Pi 5 or server available)

**Follow-up:** Should model selection be configurable at runtime, or hardcoded for demo?

**Recommendation Needed:** ?

---

### 6. MQTT Broker Configuration
**Question:** How should the MQTT broker be deployed?

**Options:**
- Bundle Mosquitto in Docker Compose (self-contained demo)
- Assume external broker (requires setup instructions)
- Use public test broker (unreliable for presentation)

**Security considerations:**
- TLS/SSL for production
- Authentication/authorization
- Topic ACLs

**For demo:** Basic authentication sufficient, or open for simplicity?

**Recommendation Needed:** ?

---

### 7. Voice Input Method
**Question:** How should voice input be captured?

**Options:**
- **Browser-based:** Microphone API, works in demo but requires HTTPS
- **Dedicated service:** Separate Node.js service with microphone access
- **Mobile app:** Companion React Native app (more complex)
- **Hardware button:** Physical trigger on Pi/ESP32

**Follow-up:** Does voice need to be "always listening" or triggered?

**Recommendation Needed:** ?

---

### 8. Auth0 Configuration
**Question:** What Auth0 setup is needed?

**Considerations:**
- Multi-tenancy vs single demo tenant
- Local development without internet (need mock auth?)
- Session management (JWT, cookies, refresh tokens)
- Role-based access control (needed for demo?)

**Recommendation Needed:** ?

---

## Demo Environment

### 9. Hardware Requirements
**Question:** What hardware is needed to run the full demo?

**Minimum specs:**
- Can it run on a laptop (for presentation)?
- Does it require Raspberry Pi 5?
- What about Z-Wave controller (USB stick)?
- Physical Z-Wave devices or mock devices?

**Recommended setup:** ?

---

### 10. Mock Devices
**Question:** Should we support mock/simulated Z-Wave devices?

**Benefits:**
- Demo without physical hardware
- Consistent behavior
- No hardware failures during presentation

**Drawbacks:**
- Less impressive than real devices
- Extra implementation work

**Recommendation:** Implement both real and mock device support?

---

### 11. AI Personality Configuration
**Question:** How should the AI personality system work?

**Options:**
- **Hardcoded:** Few predefined personalities (sarcastic, helpful, enthusiastic)
- **User-selectable:** Dropdown/settings to choose personality
- **Dynamic:** AI generates personality based on context
- **Configurable prompts:** Users can write their own system prompts

**Level of sass/humor:** Family-friendly sarcastic? Actually helpful? Over-the-top?

**Recommendation Needed:** ?

---

## Presentation Logistics

### 12. Live Demo vs Recorded
**Question:** What's the demo strategy?

**Primary approach:**
- Live demo with backup recorded video?
- Pre-recorded with live narration?
- Hybrid: recorded clips + live coding?

**Failure mitigation:**
- What if WiFi fails?
- What if Ollama is slow?
- What if voice recognition fails?

**Recommendation Needed:** ?

---

### 13. Code Walkthrough Depth
**Question:** How technical should the code walkthrough be?

**Options:**
- High-level architecture only
- Show LangChain tool implementation
- Deep dive into MCP protocol
- Focus on MQTT integration patterns
- All of the above with time management

**Audience assumption:** Intermediate to advanced developers?

**Recommendation Needed:** ?

---

### 14. Audience Interaction
**Question:** Should the audience participate in the demo?

**Ideas:**
- Let audience suggest voice commands
- QR code to interface where they can send commands
- Vote on which personality the AI should use
- Audience member comes up to try voice control

**Risk vs engagement tradeoff**

**Recommendation Needed:** ?

---

## Implementation Priorities

### 15. Stretch Goals Priority
**Question:** If we run out of time, which features can be cut?

**Essential (MVP):**
- LangChain + Ollama integration
- MQTT pub/sub
- Basic device control
- Auth0 login
- Docker deployment

**Nice to have:**
- Voice commands with Whisper
- Personality system
- Conversation history
- ESP32 example

**Recommendation:** Which stretch goals are most impressive for audience?

---

## Answers Section
*To be filled in as decisions are made*

### Decision Log
| Date | Question # | Decision | Rationale |
|------|-----------|----------|-----------|
|      |           |          |           |