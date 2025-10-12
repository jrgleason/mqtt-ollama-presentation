# AI Chatbot - Oracle Module

## Overview

This is the AI-powered chatbot module for the MQTT + Ollama Home Automation system. It provides a natural language interface to control smart home devices using LangChain.js and Ollama running locally.

## Architecture

- **Framework:** Next.js 15 with App Router
- **AI Engine:** LangChain.js + Ollama (Qwen2.5:3b)
- **UI:** shadcn/ui components
- **Styling:** Tailwind CSS v4
- **Language:** TypeScript (strict mode)

## Project Structure

```
oracle/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── chat/
│   │   │       └── route.ts          # Chat API endpoint (streaming)
│   │   ├── chat/
│   │   │   └── page.tsx              # Chat UI page
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                       # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   └── card.tsx
│   │   ├── ChatInterface.tsx         # Main chat component
│   │   └── ChatMessage.tsx           # Message display component
│   ├── lib/
│   │   ├── ollama/
│   │   │   └── client.ts             # Ollama client wrapper
│   │   ├── langchain/
│   │   │   └── tools/                # LangChain tools
│   │   │       ├── device-list-tool.ts
│   │   │       ├── device-control-tool.ts
│   │   │       └── index.ts
│   │   └── utils.ts                  # Utility functions
│   └── styles/
│       └── tailwind.css
├── public/
├── test-ollama.mjs                   # Ollama connection test
├── test-api.sh                       # API endpoint test
└── package.json
```

## Prerequisites

1. **Node.js 20+**
2. **Ollama** running locally with Qwen2.5:3b model:
   ```bash
   ollama pull qwen2.5:3b
   ollama serve  # Should run on http://localhost:11434
   ```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and configure:

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Verify Ollama Connection

```bash
node test-ollama.mjs
```

Expected output:
```
Testing Ollama connection...

✅ Ollama is working!
Response: working
```

## Development

### Run Development Server

⚠️ **Important:** Do NOT run `npm run dev` yourself! The user should run the dev server manually in their own terminal.

User should run:
```bash
npm run dev
```

This starts:
- Tailwind CSS watcher (compiles CSS on changes)
- Next.js dev server on http://localhost:3000

### Access the Chat Interface

Navigate to: http://localhost:3000/chat

## Features

### Implemented ✅

1. **Streaming Chat Interface**
   - Real-time AI responses using Server-Sent Events (SSE)
   - LangChain.js integration with ChatOllama
   - Message history display
   - Loading indicators

2. **LangChain Tools**
   - `list_devices` - Lists all available devices (mock data)
   - `control_device` - Controls devices by name (mock implementation)

3. **UI Components**
   - ChatInterface - Main chat container
   - ChatMessage - Individual message display
   - shadcn/ui base components (Button, Input, Card)

### Not Yet Implemented ❌

1. **MQTT Integration** - Tools are mocked, not connected to actual MQTT broker
2. **Database Storage** - No conversation history persistence
3. **Authentication** - No Auth0 integration yet
4. **Device Discovery** - No actual device lookup from database
5. **Error Recovery** - Basic error handling only

## API Documentation

### POST /api/chat

Handles streaming chat requests.

**Request:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Turn on the living room light"
    }
  ]
}
```

**Response:**
Streams response as Server-Sent Events (SSE):
```
data: I've
data: turned
data: on
data: the
data: living
data: room
data: light
```

**Headers:**
- `Content-Type: text/event-stream`
- `Cache-Control: no-cache`
- `Connection: keep-alive`

## Testing

### Test Ollama Connection

```bash
node test-ollama.mjs
```

### Test Chat API (requires dev server running)

```bash
./test-api.sh
```

Or manually with curl:
```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "List all available devices"
      }
    ]
  }'
```

## LangChain Tools

### Device List Tool

```typescript
{
  name: 'list_devices',
  description: 'Lists all available smart home devices',
  input: null,
  output: 'JSON array of devices with id, name, type, room, state'
}
```

**Example:**
```
User: "What devices are available?"
AI calls: list_devices()
Response: "Available devices:
1: Living Room Light (dimmer) in Living Room - ON at 75%
2: Bedroom Light (switch) in Bedroom - OFF
..."
```

### Device Control Tool

```typescript
{
  name: 'control_device',
  description: 'Controls a smart home device by name',
  input: {
    deviceName: string,
    action: 'on' | 'off' | 'dim',
    level?: number  // 0-100 for dimming
  },
  output: 'Success message'
}
```

**Example:**
```
User: "Turn on the living room light"
AI calls: control_device({
  deviceName: "living room light",
  action: "on"
})
Response: "Turned on Living Room Light"
```

## Performance

### Response Time (with Qwen2.5:3b on M1 Mac)

- **Initial request:** ~1-2 seconds
- **Streaming:** ~20 tokens/second
- **Simple commands:** <3 seconds total

### On Raspberry Pi 5

- **Expected:** ~20 tokens/second (based on docs/notes.md research)
- **Simple commands:** <1 second response time

## Troubleshooting

### "Cannot connect to Ollama"

1. Verify Ollama is running:
   ```bash
   curl http://localhost:11434/api/version
   ```

2. Check Ollama has the model:
   ```bash
   ollama list | grep qwen2.5
   ```

3. Test model:
   ```bash
   ollama run qwen2.5:3b "Hello"
   ```

### "Tailwind CSS not working"

The project uses Tailwind v4 with a custom build process. Make sure to run:
```bash
npm run dev:css
```

Or for production:
```bash
npm run build:css
```

### "API returns 500 error"

1. Check server console for error messages
2. Verify environment variables in `.env.local`
3. Test Ollama connection: `node test-ollama.mjs`
4. Check Ollama logs

## Next Steps

To complete the chatbot implementation:

1. **MQTT Integration**
   - Implement actual MQTT client in tools
   - Connect to Mosquitto broker
   - Subscribe to device state topics

2. **Database Integration**
   - Set up Prisma with SQLite
   - Implement device lookup
   - Store conversation history

3. **Authentication**
   - Integrate Auth0
   - Protect chat routes
   - Associate conversations with users

4. **Enhanced Features**
   - Voice input (Whisper)
   - Multi-modal support
   - Personality system
   - Automation suggestions

## References

- [LangChain.js Docs](https://js.langchain.com/)
- [ChatOllama Integration](https://js.langchain.com/docs/integrations/chat/ollama/)
- [Next.js 15 Docs](https://nextjs.org/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [Ollama](https://ollama.ai/)

## License

See main project LICENSE file.
