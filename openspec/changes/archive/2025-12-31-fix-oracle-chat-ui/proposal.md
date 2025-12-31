# Proposal: Fix Oracle Chat UI - Markdown Rendering and Message Cohesion

## Change ID
`fix-oracle-chat-ui`

## Status
**PROPOSED** - Awaiting review and approval

## Problem Statement

The Oracle chat interface has two critical UX issues that degrade the user experience:

### Issue 1: No Markdown Rendering

AI responses containing markdown syntax are displayed as **raw text** instead of being rendered:

**Current Behavior:**
```
The temperature is **69.1 °F**
```

**Expected Behavior:**
```
The temperature is 69.1 °F  (bold rendered)
```

**Impact:**
- Device lists with bullet points show dashes instead of formatted lists
- Emphasized text (`**bold**`, `*italic*`) shows asterisks
- Code blocks, links, and other markdown show raw syntax
- Reduces readability and professional appearance

### Issue 2: Tool Usage Shown as Separate Text

When the AI uses tools, the tool invocation appears as separate text above the response instead of being integrated into a single cohesive message bubble:

**Current Behavior:**
```
[Bubble top]
🔧 Using tool: get_device_sensor_data

The temperature of "Temp Sensor 1" is currently **69.1 °F**.
[Bubble bottom]
```

**Expected Behavior:**
```
[Single cohesive bubble]
🔧 Using tool: get_device_sensor_data

The temperature of "Temp Sensor 1" is currently 69.1 °F.
```

**Impact:**
- Visually confusing - appears as two separate responses
- Breaks message flow and conversation continuity
- Tool usage context is disconnected from the actual response

## Root Cause

### ChatMessage Component Analysis

File: `apps/oracle/src/components/ChatMessage.jsx`

**Line 50:**
```jsx
<p className="text-base leading-relaxed whitespace-pre-wrap break-words">
  {mainContent}  {/* ❌ Raw text rendering - no markdown processing */}
</p>
```

**Findings:**
1. **No markdown library installed** - Oracle has no `react-markdown`, `marked`, or `markdown-it` dependency
2. **Raw text rendering** - Content is inserted directly into JSX without processing
3. **No markdown-to-HTML conversion** - Markdown syntax passes through unchanged

### Tool Message Integration Issue

File: `apps/oracle/src/app/api/chat/route.js`

**Lines 160-169:**
```javascript
} else if (data.type === 'tool_start') {
    assistantContent += data.content;  // Adds "🔧 Using tool: ..." to content

    setMessages((prev) =>
        prev.map((m) =>
            m.id === assistantMessage.id
                ? {...m, content: assistantContent}
                : m
        )
    );
}
```

The tool usage message is correctly appended to the same message content, so this is **working as designed**. The visual separation is actually in the rendering, not the data structure.

## Proposed Solution

### 1. Add Markdown Rendering Library

Install and integrate `react-markdown` with GitHub-flavored markdown support:

```bash
npm install react-markdown remark-gfm
```

**Why `react-markdown`?**
- React-native component (integrates cleanly with JSX)
- GitHub-flavored markdown support (code blocks, tables, task lists)
- Secure by default (XSS protection built-in)
- Customizable styling via className prop
- Widely used and maintained

### 2. Update ChatMessage Component

**Current (line 49-51):**
```jsx
{mainContent && (
    <p className="text-base leading-relaxed whitespace-pre-wrap break-words">
        {mainContent}
    </p>
)}
```

**Proposed:**
```jsx
{mainContent && (
    <div className="text-base leading-relaxed prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {mainContent}
        </ReactMarkdown>
    </div>
)}
```

**Changes:**
- Replace `<p>` with `<div>` to allow block-level markdown elements
- Use Tailwind's `prose` classes for automatic markdown styling
- Add `remarkGfm` plugin for GitHub-flavored markdown (lists, tables, etc.)
- Keep existing `dark:prose-invert` for dark mode support

### 3. No Changes Needed for Tool Message Integration

The tool messages are already integrated correctly in the data structure. The visual appearance will improve automatically once markdown rendering is in place.

## Changes Required

### Files to Modify

1. **`apps/oracle/package.json`**
   - Add dependencies: `react-markdown`, `remark-gfm`

2. **`apps/oracle/src/components/ChatMessage.jsx`**
   - Import `ReactMarkdown` and `remarkGfm`
   - Replace raw text rendering with `<ReactMarkdown>` component
   - Apply Tailwind prose styling

### Files to Create

None - this is a modification to existing functionality.

## Impact Assessment

### Affected Components
- `ChatMessage.jsx` - Rendering logic change
- No backend changes required
- No API changes required

### Breaking Changes
**None** - This is a purely presentational change. The message data structure remains identical.

### Performance Impact
- **Minimal** - React-markdown is lightweight (~50KB gzipped)
- Markdown parsing happens on render (client-side only)
- No impact on server/API performance

### Security Considerations
- `react-markdown` sanitizes HTML by default (XSS protection)
- Does not execute inline HTML unless explicitly enabled
- Secure for displaying AI-generated content

## Alternatives Considered

### Alternative 1: Use `marked` Library
- **Pros**: Faster rendering, smaller bundle size
- **Cons**: Returns raw HTML string (requires `dangerouslySetInnerHTML`), less React-native
- **Rejected**: Security concerns and non-idiomatic React pattern

### Alternative 2: Manual Markdown Parsing
- **Pros**: Full control, no dependencies
- **Cons**: Reinventing the wheel, missing edge cases, maintenance burden
- **Rejected**: Not worth the effort for a common solved problem

### Alternative 3: Strip Markdown Syntax
- **Pros**: Zero dependencies, fast
- **Cons**: Loses formatting intentionality, degrades UX
- **Rejected**: Defeats the purpose of the AI using markdown

## Validation Criteria

### Functional Tests

**Test 1: Bold and Italic Rendering**
- Send message: "What is the temperature?"
- AI responds with: `**69.1 °F**`
- **Expected**: "69.1 °F" appears bold

**Test 2: List Rendering**
- Send message: "What devices are available?"
- AI responds with bullet list
- **Expected**: Properly formatted bullet points, not raw dashes

**Test 3: Code Block Rendering**
- Send message that triggers code in response
- **Expected**: Code appears in monospace with background

**Test 4: Tool Message Integration**
- Any message that triggers a tool
- **Expected**: Tool usage and response appear in single cohesive bubble

### Visual Regression Tests

**Test 5: Dark Mode**
- Switch to dark mode
- **Expected**: Markdown styling adapts (light text, proper contrast)

**Test 6: Long Messages**
- Send message that generates long response
- **Expected**: Proper text wrapping, no overflow

**Test 7: Existing Messages**
- View messages without markdown
- **Expected**: Plain text renders normally (no visual regression)

## Success Metrics

1. **Markdown renders correctly**: Bold, italic, lists, code blocks all display properly
2. **No visual regressions**: Plain text messages still render correctly
3. **Dark mode support**: Markdown styling adapts to theme
4. **Tool messages integrated**: Single bubble appearance maintained
5. **No performance degradation**: Page load and render times unchanged

## Dependencies

- **Blocking**: None
- **Related Changes**: None - this is a standalone UI improvement

## Rollback Plan

If issues arise:

```bash
# Revert changes
git checkout apps/oracle/src/components/ChatMessage.jsx
git checkout apps/oracle/package.json
npm install  # Remove newly added dependencies
```

Rollback is straightforward as this is a localized change with no data structure modifications.

## Timeline Estimate

- **Implementation**: 1 hour
- **Testing**: 30 minutes
- **Total**: 1.5 hours

## References

- **React Markdown**: https://github.com/remarkjs/react-markdown
- **remark-gfm**: https://github.com/remarkjs/remark-gfm
- **Tailwind Prose**: https://tailwindcss.com/docs/typography-plugin
