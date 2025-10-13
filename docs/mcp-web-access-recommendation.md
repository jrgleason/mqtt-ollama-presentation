# MCP Server Recommendation for Web Access (Jarvis)

## Your Use Case

**Goal:** Enable Jarvis (Ollama AI) to access the internet for queries like:
- "What's the weather?"
- "What's in the news today?"
- "Look up the definition of X"
- "Check the current price of Y"

**Constraints:**
- Running on Raspberry Pi 5 (no GUI/monitor)
- Local-first architecture preference
- Must work via MQTT/voice commands
- Should avoid CAPTCHAs and login walls

---

## Recommendation: Use `mcp-server-fetch`

### Why `mcp-server-fetch` is the Best Choice

✅ **Headless-friendly**: No browser required, pure HTTP fetch
✅ **Official Anthropic server**: Well-maintained, stable
✅ **Simple**: No complex setup, no browser dependencies
✅ **Lightweight**: Perfect for Raspberry Pi
✅ **Markdown conversion**: Converts HTML to clean text for LLMs
✅ **No authentication**: Works with public websites immediately
✅ **Local execution**: No cloud dependencies

### Why NOT Playwright MCP

❌ **Requires display**: Playwright needs X11/Wayland or virtual display
❌ **Heavy**: Chromium browser is 200MB+, slow on RPi
❌ **Complex**: Harder to debug without monitor
❌ **Overkill**: You don't need browser automation for simple data fetching
❌ **CAPTCHA risk**: CAPTCHAs will still appear, but you can't solve them without display

**Exception:** Use Playwright only if you need:
- JavaScript-rendered content (SPAs)
- Complex interactions (click buttons, fill forms)
- Screenshots for vision models

For your use case (weather, news, definitions), simple HTTP fetch is sufficient.

---

## Recommended Architecture

### Option A: Integrate MCP Fetch into Your App (Recommended)

**Why this approach:**
- Jarvis already talks to Ollama directly
- Can call MCP server from Node.js
- Better error handling and logging
- Fits your existing architecture

**Architecture:**
```
Voice Gateway (Node.js)
  ↓
Ollama (with tool calling)
  ↓
Your Node.js MCP Client
  ↓
mcp-server-fetch (Python subprocess)
  ↓
Internet
```

**Implementation:**
```javascript
// Add to voice-gateway-oww
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Create MCP client for fetch server
const fetchClient = new Client({
  name: 'jarvis-fetch-client',
  version: '1.0.0'
});

// Connect to fetch server
const transport = new StdioClientTransport({
  command: 'uvx',
  args: ['mcp-server-fetch']
});

await fetchClient.connect(transport);

// Use in your Ollama tool definition
export const webFetchTool = new DynamicTool({
  name: 'fetch_web_page',
  description: 'Fetches content from a web page and converts it to markdown. Use for checking weather, news, definitions, etc. Input should be a URL.',
  func: async (url: string) => {
    const result = await fetchClient.callTool({
      name: 'fetch',
      arguments: { url }
    });
    return result.content;
  }
});
```

### Option B: Use Existing Web APIs Directly (Alternative)

**For specific use cases, use dedicated APIs:**

```javascript
// Weather: Use wttr.in (no API key needed!)
async function getWeather(location = 'auto') {
  const response = await fetch(`https://wttr.in/${location}?format=j1`);
  return await response.json();
}

// News: Use RSS feeds or NewsAPI (free tier)
async function getNews() {
  const response = await fetch('https://rss.nytimes.com/services/xml/rss/nyt/HomePage.rss');
  return await parseRSS(response);
}

// Definitions: Use Free Dictionary API
async function getDefinition(word) {
  const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
  return await response.json();
}
```

**Pros:**
- ✅ No MCP server needed
- ✅ Faster (direct API calls)
- ✅ More reliable (known APIs)
- ✅ Better structured data

**Cons:**
- ❌ Less flexible (can't fetch arbitrary websites)
- ❌ More code to maintain (multiple integrations)

---

## Recommended Implementation Plan

### Phase 1: Quick Win - Direct APIs (This Weekend)

**For presentation demo, use these specific APIs:**

1. **Weather** - wttr.in (no auth!)
   ```javascript
   // LangChain tool
   export const weatherTool = new DynamicTool({
     name: 'get_weather',
     description: 'Gets current weather for a location. If no location provided, uses auto-detection based on IP.',
     func: async (input: string) => {
       const location = input || 'auto';
       const response = await fetch(`https://wttr.in/${location}?format=%C+%t+%w+%h`);
       const weather = await response.text();
       return `Weather: ${weather}`;
     }
   });
   ```

2. **Time/Date** - Built-in JavaScript
   ```javascript
   export const timeTool = new DynamicTool({
     name: 'get_time',
     description: 'Gets current time and date',
     func: async () => {
       const now = new Date();
       return now.toLocaleString();
     }
   });
   ```

3. **News Headlines** - Use RSS feeds
   ```javascript
   import Parser from 'rss-parser';

   export const newsTool = new DynamicTool({
     name: 'get_news',
     description: 'Gets top news headlines',
     func: async () => {
       const parser = new Parser();
       const feed = await parser.parseURL('https://rss.nytimes.com/services/xml/rss/nyt/HomePage.rss');
       const headlines = feed.items.slice(0, 5).map(item => item.title);
       return headlines.join('\n');
     }
   });
   ```

**Estimated time:** 2-3 hours
**Risk:** Low
**Demo value:** High (real internet data!)

### Phase 2: Add MCP Fetch for General Queries (After Demo)

**When you need more flexibility:**

```bash
# Install MCP SDK
npm install @modelcontextprotocol/sdk

# Install fetch server (Python)
pip3 install mcp-server-fetch
```

**Add to your tools:**
```javascript
// Create MCP client wrapper
import { createMCPClient } from './mcp-client.js';

const fetchClient = await createMCPClient('uvx', ['mcp-server-fetch']);

export const generalWebFetchTool = new DynamicTool({
  name: 'fetch_website',
  description: 'Fetches content from any website and converts to text. Use when no specific tool is available. Input: URL',
  func: async (url: string) => {
    const result = await fetchClient.callTool({
      name: 'fetch',
      arguments: { url, max_length: 5000 }
    });
    return result.content;
  }
});
```

**Estimated time:** 3-4 hours
**Risk:** Medium (new architecture)
**Demo value:** Medium (more flexible but slower)

---

## Comparison Matrix

| Option | Setup Time | RPi Compatible | Demo Ready | Maintenance | Flexibility |
|--------|-----------|----------------|-----------|-------------|-------------|
| **Direct APIs** | 2-3 hrs | ✅ Yes | ✅ Yes | Low | Medium |
| **mcp-server-fetch** | 3-4 hrs | ✅ Yes | ⚠️ Maybe | Medium | High |
| **Playwright MCP** | 6-8 hrs | ⚠️ Difficult | ❌ No | High | Very High |

---

## Recommended Decision

### For Your Presentation (Jan 12, 2026)

**Go with Direct APIs (Phase 1)**

**Reasoning:**
1. ⏰ **Time sensitive**: Presentation is coming up, need quick wins
2. 🎯 **Demo value**: Real internet data (weather, time, news) is impressive
3. 🛡️ **Reliability**: Known APIs, no surprises during demo
4. 🚀 **Simple**: Easy to test and debug
5. 📝 **Local-first friendly**: Still works offline (just tools fail gracefully)

**Demo script:**
```
User: "Hey Jarvis, what's the weather?"
Jarvis: "It's currently 45 degrees and cloudy."

User: "Hey Jarvis, what time is it?"
Jarvis: "It's 2:30 PM on January 12th, 2026."

User: "Hey Jarvis, what's in the news?"
Jarvis: "Top headlines: [reads 3 headlines from RSS]"
```

### After Presentation

**Add mcp-server-fetch (Phase 2)** for general web queries:
```
User: "Hey Jarvis, look up the recipe for chocolate chip cookies"
Jarvis: [fetches from allrecipes.com and summarizes]
```

---

## Implementation Guide: Phase 1 (Direct APIs)

### Step 1: Install Dependencies

```bash
cd apps/voice-gateway-oww
npm install rss-parser node-fetch
```

### Step 2: Create Tools File

**File:** `src/web-tools.js`

```javascript
import { DynamicTool } from '@langchain/core/tools';
import Parser from 'rss-parser';
import { logger } from './logger.js';

/**
 * Weather tool using wttr.in (no API key needed)
 */
export const createWeatherTool = () => {
  return new DynamicTool({
    name: 'get_weather',
    description: 'Gets current weather. Input can be a city name (e.g., "London") or leave empty for auto-detection. Returns temperature, conditions, wind, and humidity.',
    func: async (input) => {
      try {
        const location = input.trim() || 'auto';
        // Format: %C=condition %t=temp %w=wind %h=humidity
        const response = await fetch(`https://wttr.in/${location}?format=%C+%t+(wind+%w,+humidity+%h)`);
        const weather = await response.text();

        logger.debug('Weather query', { location, result: weather });
        return `Weather for ${location}: ${weather}`;
      } catch (error) {
        logger.error('Weather tool failed', { error: error.message });
        return 'Sorry, I could not fetch the weather right now.';
      }
    }
  });
};

/**
 * Current time tool
 */
export const createTimeTool = () => {
  return new DynamicTool({
    name: 'get_current_time',
    description: 'Gets the current date and time. No input needed.',
    func: async () => {
      const now = new Date();
      const formatted = now.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      logger.debug('Time query', { result: formatted });
      return `Current time: ${formatted}`;
    }
  });
};

/**
 * News headlines tool using RSS
 */
export const createNewsTool = () => {
  return new DynamicTool({
    name: 'get_news',
    description: 'Gets top news headlines from major news sources. No input needed. Returns 5 latest headlines.',
    func: async () => {
      try {
        const parser = new Parser();
        const feed = await parser.parseURL('https://rss.nytimes.com/services/xml/rss/nyt/HomePage.rss');

        const headlines = feed.items
          .slice(0, 5)
          .map((item, index) => `${index + 1}. ${item.title}`)
          .join('\n');

        logger.debug('News query', { count: 5 });
        return `Top news headlines:\n${headlines}`;
      } catch (error) {
        logger.error('News tool failed', { error: error.message });
        return 'Sorry, I could not fetch news headlines right now.';
      }
    }
  });
};

/**
 * Create all web tools
 */
export const createWebTools = () => {
  return [
    createWeatherTool(),
    createTimeTool(),
    createNewsTool()
  ];
};
```

### Step 3: Update Ollama Client to Use Tools

**File:** `src/ollama-client.js`

```javascript
import { createWebTools } from './web-tools.js';

// Add to your queryOllama function
export async function queryOllama(prompt, options = {}) {
  const tools = createWebTools();

  // Your existing Ollama call, but now with tools
  const response = await ollama.chat({
    model: config.ollama.model,
    messages: options.messages || [{ role: 'user', content: prompt }],
    tools: tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object',
          properties: {
            input: { type: 'string', description: 'Tool input' }
          }
        }
      }
    }))
  });

  // Handle tool calls
  if (response.message.tool_calls) {
    for (const toolCall of response.message.tool_calls) {
      const tool = tools.find(t => t.name === toolCall.function.name);
      if (tool) {
        const result = await tool.func(toolCall.function.arguments.input || '');
        // Send result back to Ollama
        // ... implement tool result handling
      }
    }
  }

  return response.message.content;
}
```

### Step 4: Test

```bash
# Start Ollama
ollama serve

# Start voice gateway
npm run dev

# Test voice commands:
# "Hey Jarvis, what's the weather?"
# "Hey Jarvis, what time is it?"
# "Hey Jarvis, what's in the news?"
```

---

## Alternative RSS Feeds (No Auth)

```javascript
const RSS_FEEDS = {
  nytimes: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.rss',
  bbc: 'http://feeds.bbci.co.uk/news/rss.xml',
  reuters: 'https://www.reutersagency.com/feed/',
  techmeme: 'https://www.techmeme.com/feed.xml',
  hackernews: 'https://hnrss.org/frontpage'
};
```

---

## Security Considerations

### For Direct APIs
- ✅ No credentials to leak
- ✅ Rate limits handled by providers
- ⚠️ Validate user input (prevent injection)
- ⚠️ Set timeouts (don't hang on slow APIs)

### For MCP Fetch
- ⚠️ Can access local network (firewall risk)
- ⚠️ Could fetch malicious content
- ✅ No code execution (just HTTP fetch)
- 🛡️ Recommendation: Use allowlist for demo

**Example allowlist:**
```javascript
const ALLOWED_DOMAINS = [
  'wttr.in',
  'wikipedia.org',
  'nytimes.com',
  'bbc.co.uk'
];

function isAllowedURL(url) {
  const domain = new URL(url).hostname;
  return ALLOWED_DOMAINS.some(allowed => domain.endsWith(allowed));
}
```

---

## Documentation to Update

When you implement web tools:

1. **Update `.env.example`**:
   ```bash
   # Web Tools Configuration
   WEB_TOOLS_ENABLED=true
   WEB_TOOLS_TIMEOUT_MS=5000
   ```

2. **Update `QUICKSTART.md`**:
   - Add section "Internet Access Features"
   - List available voice commands
   - Note that tools fail gracefully offline

3. **Update `docs/network-dependencies.md`**:
   - Add wttr.in, RSS feeds to dependency list
   - Note: Optional for demo, degrades gracefully

4. **Update `docs/tasks.md`**:
   - Add Phase 5: Internet Access Tools
   - Mark completed tasks

---

## Summary

### For Your Presentation: Use Direct APIs ✅

**Pros:**
- Fast to implement (2-3 hours)
- Reliable for demo
- Works great on Raspberry Pi
- No complex dependencies

**Cons:**
- Less flexible than MCP
- Limited to specific use cases

### After Presentation: Consider MCP Fetch

**When:**
- You want general web access
- Need to fetch arbitrary websites
- Have time to debug edge cases

**Avoid Playwright MCP for now:**
- Too heavy for RPi
- Requires display
- Overkill for your use case

---

## Next Steps

1. ✅ Implement Phase 1 (Direct APIs)
2. ✅ Test with voice commands
3. ✅ Add to demo script
4. ⏸️ Consider MCP Fetch after presentation
5. ❌ Skip Playwright (not needed)

**Estimated time to working demo:** 2-3 hours

Good luck with your presentation! 🎤🤖
