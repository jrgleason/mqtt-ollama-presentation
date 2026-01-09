# oracle-chat-ui Specification

## Purpose
TBD - created by archiving change fix-oracle-chat-ui. Update Purpose after archive.
## Requirements
### Requirement: Markdown Rendering

The chat UI MUST render markdown syntax in AI responses as formatted HTML elements.

**Rationale**: AI models often use markdown for emphasis, lists, code blocks, and structure. Displaying raw markdown syntax degrades readability and user experience.

#### Scenario: Bold and Italic Text

**Given** the AI responds with text containing `**bold**` or `*italic*` markdown syntax
**When** the response is displayed in the chat UI
**Then** the markdown MUST be rendered as actual bold/italic HTML elements
**And** the raw asterisks MUST NOT be visible to the user

**Examples:**
- Input: `**69.1 °F**` → Output: **69.1 °F** (bold)
- Input: `*important*` → Output: *important* (italic)
- Input: `**bold** and *italic*` → Output: **bold** and *italic*

#### Scenario: Bulleted and Numbered Lists

**Given** the AI responds with markdown list syntax
**When** the list is displayed in the chat UI
**Then** it MUST render as an HTML unordered/ordered list
**And** list items MUST have proper indentation and bullet points/numbers

**Examples:**
- Markdown:
  ```
  - Node 1
  - Temp Sensor 1
  ```
- Rendered: Proper bullet list with visual indicators

#### Scenario: Code Blocks and Inline Code

**Given** the AI responds with code block (```) or inline code (`) syntax
**When** the code is displayed in the chat UI
**Then** code blocks MUST appear in monospace font with background styling
**And** inline code MUST appear in monospace font with subtle background

**Examples:**
- Inline: `deviceName` → styled as code
- Block:
  ````
  ```javascript
  const temp = 69.1;
  ```
  ````
  → Styled code block with language-specific highlighting (if available)

#### Scenario: Links and URLs

**Given** the AI responds with markdown link syntax `[text](url)`
**When** the link is displayed in the chat UI
**Then** it MUST render as a clickable hyperlink
**And** clicking the link MUST open in a new tab
**And** the link MUST be visually styled (underline, color)

**Example:**
- Markdown: `[Documentation](https://example.com)`
- Rendered: Clickable link opening in new tab

### Requirement: Message Cohesion

Tool execution indicators MUST appear integrated within the same message bubble as the AI response.

**Rationale**: Separating tool usage from the response creates visual confusion and breaks the conversational flow.

#### Scenario: Tool Usage in Single Bubble

**Given** the AI uses a tool to answer a user query
**When** the tool execution message is displayed (e.g., "🔧 Using tool: get_device_sensor_data")
**Then** it MUST appear at the top of the same message bubble as the AI response
**And** the tool name MUST be styled distinctly (e.g., lighter color, smaller font)
**And** the AI response MUST follow immediately below without visual separation

**Example:**
```
┌─────────────────────────────────────────┐
│ 🔧 Using tool: get_device_sensor_data │  ← Tool indicator (subtle styling)
│                                          │
│ The temperature is 69.1 °F.             │  ← AI response (main content)
└─────────────────────────────────────────┘
```

#### Scenario: Multiple Tool Calls in One Response

**Given** the AI uses multiple tools in sequence to answer a query
**When** the response is displayed
**Then** each tool usage indicator MUST appear in order
**And** all tool indicators and the final response MUST be in a single cohesive bubble
**And** tool indicators MUST be separated from each other with subtle spacing

### Requirement: Dark Mode Support

Markdown rendering MUST adapt to dark mode theme without degrading readability.

#### Scenario: Dark Mode Markdown Rendering

**Given** the user has dark mode enabled
**When** a message with markdown is displayed
**Then** text color MUST be light (white/gray)
**And** background colors for code blocks MUST be dark with good contrast
**And** links MUST use a light, accessible color
**And** all markdown elements MUST be clearly readable in dark mode

### Requirement: Performance

Markdown rendering MUST NOT degrade chat UI performance.

#### Scenario: Large Message Rendering

**Given** the AI sends a long response (>1000 characters) with extensive markdown
**When** the message is rendered
**Then** it MUST render within 200ms
**And** scrolling MUST remain smooth (60 FPS)
**And** subsequent messages MUST render without delay

### Requirement: Security

Markdown rendering MUST prevent XSS attacks from malicious markdown content.

#### Scenario: HTML Injection Prevention

**Given** the AI response contains HTML tags in the content
**When** the markdown is rendered
**Then** raw HTML tags MUST be escaped or ignored
**And** no JavaScript execution MUST be possible from markdown content
**And** only safe markdown elements MUST be rendered

**Example:**
- Input: `Click <script>alert('XSS')</script>`
- Output: Raw text displayed (script not executed)

### Requirement: Accessibility

Rendered markdown MUST be accessible to screen readers and keyboard navigation.

#### Scenario: Screen Reader Compatibility

**Given** a user is using a screen reader
**When** navigating through chat messages with markdown
**Then** markdown structure MUST be announced correctly (e.g., "list with 2 items")
**And** emphasis (bold/italic) MUST be conveyed semantically
**And** links MUST be announced as clickable elements

