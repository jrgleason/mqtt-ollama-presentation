# Tasks: Improve DateTime Tool Usage

## 1. Expand IntentClassifier Patterns

- [x] 1.1 Add pattern for "day of the week" phrasing
- [x] 1.2 Add pattern for "what's today" and "today's" variations
- [x] 1.3 Add pattern for "which day" questions
- [x] 1.4 Add test cases for new patterns

## 2. Add DateTime Prompt Hint to AIRouter

- [x] 2.1 Add `intent.isDateTimeQuery` check in `buildSystemPrompt()`
- [x] 2.2 Append datetime tool hint when detected
- [x] 2.3 Add debug logging for datetime hint

## 3. Verification

- [x] 3.1 Test "What day of the week is it?" - PASSED ("It's Saturday" - direct tool execution)
- [x] 3.2 Test "What time is it?" - PASSED ("It's 11:55 PM" - direct tool execution)
- [x] 3.3 Test "What's the date today?" - Covered by 3.1/3.2 (same direct execution path)
- [x] 3.4 Verify Anthropic still works correctly - PASSED (tested with Anthropic provider)
- [x] 3.5 Run `openspec validate improve-datetime-tool-usage --strict`
