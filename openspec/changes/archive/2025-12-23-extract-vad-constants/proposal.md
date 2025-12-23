# Change: Extract VAD Magic Numbers into Documented Constants

## Why

The `main.js` file in voice-gateway-oww contains scattered magic numbers (300, 0.01, 700, 1500, 10000, 1200) with no context or explanation. These values control critical Voice Activity Detection (VAD) behavior, but their purpose and rationale are unclear, making the system difficult to tune and maintain.

Voice Activity Detection performance is crucial for user experience - too sensitive and it captures background noise, too conservative and it cuts off users mid-sentence. The current magic numbers make it impossible to understand or adjust these thresholds without deep code archaeology.

## What Changes

- Create a **VAD_CONSTANTS** object containing all threshold values with comprehensive documentation
- Create a **msToSamples()** helper function to convert milliseconds to sample counts
- Replace all magic numbers in `setupMic()` function with named constants
- Add inline comments explaining the rationale for each threshold value
- Document the typical ranges and tuning guidance for each parameter

### Constants to Extract

1. **PRE_ROLL_MS: 300** - Capture 300ms of audio before wake word for context
2. **SILENCE_THRESHOLD: 0.01** - RMS energy threshold (typical voice is 0.05-0.2, background < 0.01)
3. **MIN_SPEECH_MS: 700** - Minimum speech duration to avoid false positives like coughs/clicks
4. **TRAILING_SILENCE_MS: 1500** - Pause duration before stopping recording (configurable via env)
5. **MAX_UTTERANCE_MS: 10000** - Maximum recording length to prevent infinite recording
6. **GRACE_BEFORE_STOP_MS: 1200** - Allow user time to start speaking after wake word (configurable via env)

## Impact

**Affected specs:**
- voice-activity-detection (NEW - being introduced by this change)

**Affected code:**
- `apps/voice-gateway-oww/src/main.js` - setupMic() function (lines 40-49)

**Benefits:**
- Self-documenting code - constants explain their purpose
- Easier VAD tuning - centralized location for all thresholds
- Better maintainability - clear rationale for threshold values
- Improved developer experience - no need to guess what magic numbers mean

**Breaking changes:** None - this is a pure refactoring with no functional changes
