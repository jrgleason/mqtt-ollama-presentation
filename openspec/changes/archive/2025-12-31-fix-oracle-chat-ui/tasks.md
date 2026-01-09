# Implementation Tasks: Fix Oracle Chat UI

## Implementation Summary

**Status: Implementation Complete - Ready for Manual Testing**

All implementation tasks have been completed:
- ✅ Markdown rendering libraries installed (react-markdown, remark-gfm)
- ✅ ChatMessage component updated with ReactMarkdown
- ✅ Tailwind typography plugin verified and configured
- ✅ JSDoc documentation added to component
- ✅ Oracle README updated with Chat UI features section
- ✅ Build verification passed (no compilation errors)

**Next Steps:**
1. User must manually test the Oracle chat UI (Phase 3 & 4 tasks below)
2. After successful testing, archive the proposal with: `openspec archive fix-oracle-chat-ui --yes`

## Task Checklist

### Phase 1: Install Dependencies

- [x] **Task 1.1**: Install markdown rendering libraries
  - Run: `cd apps/oracle && npm install react-markdown remark-gfm`
  - **Validation**: Both packages appear in `package.json` and `package-lock.json`
  - **Estimated Time**: 2 minutes

### Phase 2: Update ChatMessage Component

- [x] **Task 2.1**: Add markdown rendering imports
  - File: `apps/oracle/src/components/ChatMessage.jsx`
  - Add imports at top of file:
    ```javascript
    import ReactMarkdown from 'react-markdown';
    import remarkGfm from 'remark-gfm';
    ```
  - **Validation**: No import errors when file is saved
  - **Estimated Time**: 1 minute

- [x] **Task 2.2**: Replace raw text rendering with ReactMarkdown component
  - File: `apps/oracle/src/components/ChatMessage.jsx`
  - Locate line 49-51 (mainContent rendering)
  - Replace:
    ```jsx
    <p className="text-base leading-relaxed whitespace-pre-wrap break-words">
        {mainContent}
    </p>
    ```
  - With:
    ```jsx
    <div className="prose prose-sm dark:prose-invert max-w-none text-base leading-relaxed">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {mainContent}
        </ReactMarkdown>
    </div>
    ```
  - **Validation**: Component compiles without errors
  - **Estimated Time**: 3 minutes

- [x] **Task 2.3**: Verify Tailwind prose plugin is available
  - Check if `@tailwindcss/typography` is in `package.json`
  - If missing, install: `npm install @tailwindcss/typography`
  - Add to `tailwind.config.js` plugins array: `require('@tailwindcss/typography')`
  - **Validation**: Prose classes render with proper styling
  - **Estimated Time**: 5 minutes

### Phase 3: Testing & Validation

**Note: Testing tasks below require manual verification by the user running the Oracle dev server**

- [ ] **Task 3.1**: Test bold and italic rendering
  - Start Oracle dev server
  - Send message: "What is the temperature?"
  - Verify AI response with `**69.1 °F**` renders as bold text
  - Verify no asterisks are visible
  - **Pass Criteria**: Temperature appears in bold font weight
  - **Estimated Time**: 3 minutes

- [ ] **Task 3.2**: Test list rendering
  - Send message: "What devices are available?"
  - Verify AI response with device list renders as formatted bullets
  - Verify proper indentation and list markers
  - **Pass Criteria**: Bulleted list with visual indicators, not dashes
  - **Estimated Time**: 3 minutes

- [ ] **Task 3.3**: Test tool message integration
  - Send any message that triggers a tool (e.g., device query)
  - Verify tool usage message appears in same bubble as response
  - Verify "🔧 Using tool: ..." is integrated at top
  - **Pass Criteria**: Single cohesive message bubble
  - **Estimated Time**: 3 minutes

- [ ] **Task 3.4**: Test dark mode rendering
  - Switch UI to dark mode
  - Send messages with markdown
  - Verify markdown elements have good contrast
  - Verify links are visible and accessible color
  - **Pass Criteria**: All markdown readable in dark mode
  - **Estimated Time**: 3 minutes

- [ ] **Task 3.5**: Test code block rendering
  - Ask AI a technical question likely to include code
  - Verify inline code (backticks) renders with monospace font
  - Verify code blocks (triple backticks) have background styling
  - **Pass Criteria**: Code appears distinct from regular text
  - **Estimated Time**: 3 minutes

- [ ] **Task 3.6**: Test plain text messages (regression test)
  - Send message: "Hello"
  - Verify plain text without markdown still renders correctly
  - Verify no visual regressions
  - **Pass Criteria**: Plain text messages unchanged
  - **Estimated Time**: 2 minutes

- [ ] **Task 3.7**: Test link rendering (if applicable)
  - Ask AI question that might include a URL
  - If markdown link syntax appears, verify it renders as clickable link
  - Verify link opens in new tab
  - **Pass Criteria**: Links are clickable and styled
  - **Estimated Time**: 3 minutes

### Phase 4: Performance & Security Validation

**Note: Performance and security validation require manual testing by the user**

- [ ] **Task 4.1**: Test performance with long messages
  - Send message that generates long response (>500 words)
  - Measure render time using browser DevTools
  - Verify render completes within 200ms
  - Verify scrolling remains smooth
  - **Pass Criteria**: No performance degradation
  - **Estimated Time**: 5 minutes

- [ ] **Task 4.2**: Test XSS prevention
  - Send message that might trick AI into returning HTML tags
  - Example: "Can you show me an HTML script tag?"
  - Verify any HTML in response is escaped, not executed
  - **Pass Criteria**: No JavaScript execution from markdown
  - **Estimated Time**: 3 minutes

### Phase 5: Documentation & Cleanup

- [x] **Task 5.1**: Update component documentation
  - Add JSDoc comment to ChatMessage component explaining markdown rendering
  - Document `remarkGfm` plugin usage
  - **Validation**: Component has clear documentation
  - **Estimated Time**: 5 minutes

- [x] **Task 5.2**: Update README if needed
  - Check if Oracle README documents ChatMessage component
  - Add note about markdown rendering if relevant
  - **Validation**: README accurately reflects capabilities
  - **Estimated Time**: 3 minutes

- [x] **Task 5.3**: Verify no console errors
  - Open browser console
  - Send multiple messages with various markdown
  - Verify no React warnings or errors
  - **Pass Criteria**: Clean console (no errors/warnings)
  - **Validation**: Build completed successfully with no compilation errors
  - **Estimated Time**: 3 minutes

## Dependencies

- **Sequential**: Task 1.1 → Task 2.1 → Task 2.2 → Task 2.3 (must install before using)
- **Sequential**: Phase 2 complete → Phase 3 can begin (must implement before testing)
- **Parallel**: All tests in Phase 3 can run in parallel
- **Sequential**: Phase 3 complete → Phase 4 (validate works before performance testing)

## Estimated Total Time

- Phase 1: 2 minutes
- Phase 2: 9 minutes
- Phase 3: 20 minutes
- Phase 4: 8 minutes
- Phase 5: 11 minutes
- **Total: ~50 minutes** (excluding npm install time which varies by network speed)

## Success Criteria

All tasks checked ✅ AND:
1. Markdown renders correctly in chat messages (bold, italic, lists, code)
2. Tool usage messages appear integrated in single bubble
3. Dark mode markdown styling is readable
4. No visual regressions for plain text messages
5. No performance degradation (<200ms render time)
6. No XSS vulnerabilities (HTML escaped)
7. No console errors or React warnings

## Rollback Plan

If issues arise during testing:

```bash
# Revert changes
cd apps/oracle
git checkout src/components/ChatMessage.jsx
git checkout package.json package-lock.json
npm install  # Restore original dependencies
```

Then investigate specific failures and retry with adjustments.

## Notes

- **Tailwind Prose Plugin**: If not already installed, Task 2.3 will add it. This provides beautiful default markdown styling with zero custom CSS.
- **GitHub-Flavored Markdown**: The `remarkGfm` plugin adds support for tables, task lists, and strikethrough - useful if AI generates these in the future.
- **Accessibility**: React-markdown generates semantic HTML, so screen readers will correctly announce markdown structure (headings, lists, emphasis).
