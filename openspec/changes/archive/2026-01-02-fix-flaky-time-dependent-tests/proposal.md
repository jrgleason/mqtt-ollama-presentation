# Proposal: Fix Flaky Time-Dependent Tests

**Change ID:** `fix-flaky-time-dependent-tests`

**Status:** Proposed

**Priority:** Low

**Created:** 2025-12-30

---

## Summary

Refactor time-dependent tests in the voice-gateway-oww test suite to use Jest fake timers instead of real `setTimeout` delays. This will make tests more reliable and faster.

## Problem Statement

The `RecordingMachine.test.js` test file contains a test that uses real time delays:

```javascript
it('should preserve startedAt timestamp during recording', () => {
    service.send({ type: 'START_RECORDING' });
    const snapshot1 = service.getSnapshot();
    const initialTimestamp = snapshot1.context.startedAt;

    // Wait a bit
    const waitPromise = new Promise(resolve => setTimeout(resolve, 10));
    return waitPromise.then(() => {
        const snapshot2 = service.getSnapshot();
        expect(snapshot2.context.startedAt).toBe(initialTimestamp);
    });
});
```

**Issues:**
1. Tests using real time delays can be flaky on slower systems or under load
2. Real delays slow down test execution
3. The 10ms delay is arbitrary and doesn't guarantee consistent behavior

## Proposed Solution

Replace the real `setTimeout` with Jest fake timers:

```javascript
it('should preserve startedAt timestamp during recording', () => {
    jest.useFakeTimers();

    service.send({ type: 'START_RECORDING' });
    const snapshot1 = service.getSnapshot();
    const initialTimestamp = snapshot1.context.startedAt;

    // Advance fake timers instead of waiting
    jest.advanceTimersByTime(10);

    const snapshot2 = service.getSnapshot();
    expect(snapshot2.context.startedAt).toBe(initialTimestamp);

    jest.useRealTimers();
});
```

Alternatively, since the test is checking that the timestamp doesn't change, we could simplify to not need any time advancement at all:

```javascript
it('should preserve startedAt timestamp during recording', () => {
    service.send({ type: 'START_RECORDING' });
    const snapshot1 = service.getSnapshot();
    const initialTimestamp = snapshot1.context.startedAt;

    // Send another event that doesn't affect timestamp
    const snapshot2 = service.getSnapshot();
    expect(snapshot2.context.startedAt).toBe(initialTimestamp);
});
```

## Scope

### Files to Modify
- `apps/voice-gateway-oww/src/__tests__/RecordingMachine.test.js`

### Out of Scope
- Other test files (unless similar issues are discovered during implementation)
- Changes to the RecordingMachine itself

## Acceptance Criteria

- [ ] Test no longer uses real `setTimeout` delays
- [ ] Test passes consistently (no flakiness)
- [ ] Test execution time is reduced
- [ ] All existing tests continue to pass

## Risks

**Low risk** - This is a test-only change with no impact on production code.

## References

- GitHub PR Review Comment: https://github.com/jrgleason/mqtt-ollama-presentation/pull/8#discussion_r2654556064
- Jest Fake Timers: https://jestjs.io/docs/timer-mocks
