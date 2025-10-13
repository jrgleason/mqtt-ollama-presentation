# Project Architecture Clarification

## What is "Oracle"?

**Oracle is NOT the database company!** It's the name of your **Next.js chatbot application** that serves as the web interface for home automation.

### Why the name "Oracle"?

The name "Oracle" likely refers to the AI agent being an "oracle" (wise advisor) that answers questions and controls your home. Think of it as the name of your smart home assistant app.

---

## Two Separate Applications

Your project has **TWO different applications** that serve different purposes:

### 1. **Oracle** (`apps/oracle/`) - Web Interface (Next.js)

**Purpose:** Web-based chatbot interface for home automation

**Technology Stack:**
- **Framework:** Next.js 14+ with App Router
- **AI:** LangChain.js + Ollama (for natural language processing)
- **Database:** SQLite with **Prisma ORM** (for device metadata)
- **Auth:** Auth0 (for user login)
- **Communication:** MQTT client (to control devices)
- **UI:** React + Tailwind CSS

**What it does:**
```
User types: "Turn on living room lights"
  ↓
Next.js receives request
  ↓
LangChain agent processes with Ollama
  ↓
Agent uses Prisma to query device database
  ↓
Agent publishes MQTT command to device
  ↓
Device responds via MQTT
  ↓
UI updates with confirmation
```

**Why it uses Prisma:**
- Stores device metadata (names, locations, types)
- Stores conversation history
- Stores user preferences
- Type-safe database access
- Easy migrations

### 2. **Voice Gateway** (`apps/voice-gateway-oww/`) - Voice Interface (Node.js)

**Purpose:** Standalone voice command system with wake word detection

**Technology Stack:**
- **Runtime:** Node.js (NOT Next.js)
- **Wake Word:** OpenWakeWord ("Hey Jarvis")
- **STT:** Whisper via Ollama (speech-to-text)
- **AI:** Ollama (for command understanding)
- **TTS:** Piper (text-to-speech)
- **Communication:** MQTT client (to control devices)
- **Database:** None! Just fires MQTT commands

**What it does:**
```
User says: "Hey Jarvis, turn on the lights"
  ↓
OpenWakeWord detects "Hey Jarvis"
  ↓
Records audio after wake word
  ↓
Whisper transcribes: "turn on the lights"
  ↓
Ollama processes command
  ↓
Publishes MQTT command
  ↓
Piper speaks: "Turning on the lights"
```

**Why it does NOT use Prisma:**
- Designed to run on Raspberry Pi (lightweight)
- No web interface needed
- No database needed (just MQTT commands)
- Stateless (each voice command is independent)

---

## When Prisma is Used vs Not Used

### ✅ **Prisma IS Used in Oracle** (`apps/oracle/`)

**File:** `apps/oracle/src/lib/db/client.ts`
```typescript
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
```

**Schema:** `apps/oracle/prisma/schema.prisma`
```prisma
model Device {
  id          String   @id @default(cuid())
  name        String
  type        String   // switch, dimmer, sensor
  location    String?
  state       String?
  nodeId      Int?     // Z-Wave node ID
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**Used by LangChain Tools:**
- `device-list-tool.ts` - Queries devices from database
- `device-control-tool.ts` - Looks up device info before sending MQTT

**Example Query:**
```typescript
const devices = await prisma.device.findMany({
  where: { location: 'living room' },
  orderBy: { name: 'asc' }
});
```

### ❌ **Prisma is NOT Used in Voice Gateway** (`apps/voice-gateway-oww/`)

**Why not:**
1. **Performance** - Database queries add latency to voice responses
2. **Simplicity** - Voice gateway is stateless, just MQTT commands
3. **Independence** - Can run without Oracle app
4. **Memory** - Raspberry Pi has limited RAM

**Instead, voice gateway:**
- Sends MQTT commands directly (e.g., `home/light/living-room/set on`)
- Doesn't need to know device IDs
- Just passes commands to MQTT broker

---

## The Confusion: Prisma vs Piper vs Ollama

Let me clarify the names:

| Name | What It Is | Used Where |
|------|-----------|------------|
| **Prisma** | Database ORM (TypeScript) | Oracle app only |
| **Piper** | Text-to-Speech engine | Voice gateway only |
| **Ollama** | Local LLM runtime | Both apps! |
| **Oracle** | YOUR app name (not the company!) | `apps/oracle/` directory |
| **OpenWakeWord** | Wake word detection | Voice gateway only |
| **Whisper** | Speech-to-Text (via Ollama) | Voice gateway only |

**Your earlier confusion:**
- You thought "Prisma" was the Piper TTS voice name
- Actually "Amy" is the Piper voice, not "Prisma"
- "Prisma" is a database tool, not a voice!

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│              Your Home Network                   │
├─────────────────────────────────────────────────┤
│                                                   │
│  ┌──────────────────┐    ┌──────────────────┐  │
│  │   Oracle App     │    │  Voice Gateway    │  │
│  │  (Next.js)       │    │  (Node.js)        │  │
│  ├──────────────────┤    ├──────────────────┤  │
│  │ • Web UI         │    │ • OpenWakeWord    │  │
│  │ • LangChain      │    │ • Whisper STT     │  │
│  │ • Prisma + SQLite│    │ • Piper TTS       │  │
│  │ • Auth0          │    │ • No Database     │  │
│  │ • MQTT Client    │    │ • MQTT Client     │  │
│  └────────┬─────────┘    └────────┬──────────┘  │
│           │                       │              │
│           └───────────┬───────────┘              │
│                       │                          │
│              ┌────────▼────────┐                 │
│              │  Ollama (LLM)   │                 │
│              │  • Qwen3:1.7b   │                 │
│              │  • Whisper STT  │                 │
│              └────────┬────────┘                 │
│                       │                          │
│              ┌────────▼────────┐                 │
│              │  HiveMQ Broker  │                 │
│              │  (MQTT)         │                 │
│              └────────┬────────┘                 │
│                       │                          │
│              ┌────────▼────────┐                 │
│              │  zwave-js-ui    │                 │
│              │  (Z-Wave)       │                 │
│              └────────┬────────┘                 │
│                       │                          │
│              ┌────────▼────────┐                 │
│              │  Smart Devices  │                 │
│              │  (Lights, etc)  │                 │
│              └─────────────────┘                 │
│                                                   │
└─────────────────────────────────────────────────┘
```

---

## When to Remove Prisma References

### ✅ **Keep Prisma in Oracle App**

Prisma is **intentionally used** in the Oracle app because:
1. You need to store device metadata
2. You need conversation history
3. You want to query devices by location/type
4. Type-safe database operations

**Files that SHOULD have Prisma:**
- `apps/oracle/src/lib/db/client.ts`
- `apps/oracle/src/lib/langchain/tools/device-list-tool.ts`
- `apps/oracle/src/lib/langchain/tools/device-control-tool.ts`
- `apps/oracle/prisma/schema.prisma`
- `apps/oracle/package.json`

### ✅ **Keep Prisma Out of Voice Gateway**

The voice gateway **intentionally does NOT use Prisma** because:
1. Lightweight and fast
2. Stateless voice commands
3. Direct MQTT communication
4. No database needed

**Files that should NOT have Prisma:**
- `apps/voice-gateway-oww/src/main.js`
- `apps/voice-gateway-oww/src/ollama-client.js`
- `apps/voice-gateway-oww/package.json`

---

## Summary: What You Should Remove

### ❌ **Incorrect References to Remove:**

1. **In Documentation** - Calling Amy voice "Prisma"
   - ✅ Already fixed in `docs/piper-voice-options.md`
   - ✅ Already fixed in `docs/piper-tts-guide.md`
   - ✅ Already fixed in `docs/outline.md`

2. **Nothing else!** - Prisma is correctly used in Oracle app

### ✅ **Correct Usage to Keep:**

1. **In Oracle App** - Prisma for database
   - `apps/oracle/src/lib/db/client.ts` - Prisma client
   - `apps/oracle/src/lib/langchain/tools/*.ts` - Database queries
   - `apps/oracle/prisma/schema.prisma` - Database schema
   - `apps/oracle/package.json` - Prisma dependencies

---

## How They Work Together (Example)

### Scenario: User wants to turn on living room lights

**Via Web (Oracle):**
```
1. User types: "Turn on living room lights"
2. Oracle queries Prisma: SELECT * FROM Device WHERE location='living room'
3. Oracle finds device ID: "light-123"
4. Oracle publishes MQTT: home/light/light-123/set ON
5. Device turns on
6. Oracle updates Prisma: UPDATE Device SET state='on'
```

**Via Voice (Voice Gateway):**
```
1. User says: "Hey Jarvis, turn on living room lights"
2. Whisper transcribes: "turn on living room lights"
3. Ollama understands: "light", "living room", "on"
4. Voice Gateway publishes MQTT: home/light/living-room/set ON
5. Device turns on
6. Piper speaks: "Turning on living room lights"
7. No database update (stateless)
```

---

## Key Takeaway

**Oracle (your app name) uses Prisma for the web interface.**
**Voice Gateway does NOT use Prisma (by design).**

Both are correct! You have two different applications with different architectures for different purposes.

The only mistake was calling the Piper TTS voice "Prisma" in the docs, which we've already fixed!
