# Fix Strict Silence Detection

## Why

The voice gateway is experiencing excessive false positives in silence detection, causing it to skip transcription when users actually speak. This occurs because:

1. **Duplicate threshold definitions**: Two conflicting SILENCE_THRESHOLD values exist:
   - `src/audio/constants.js`: 0.01 (documented)
   - `src/main.js`: 0.005 (actually used, undocumented)

2. **Threshold too strict**: The active 0.005 threshold classifies quiet speech as "true silence":
   - User speech energy: 0.000192
   - Current threshold: 0.005
   - Result: Skipped transcription despite user speaking

3. **No runtime configurability**: Threshold is hardcoded, making it impossible to adapt to different:
   - Microphone sensitivities
   - Room acoustics
   - Speaking volumes
   - Background noise levels

**Impact**: Users must repeat wake word commands multiple times, degrading UX and system reliability.

## What Changes

### Fix Threshold Inconsistency
- Remove duplicate SILENCE_THRESHOLD from main.js
- Use single source of truth from audio/constants.js
- Align code with existing voice-activity-detection spec

### Make Threshold Configurable
- Add `config.vad.silenceThreshold` support
- Default to more lenient 0.003 (vs. current 0.005)
- Allow runtime override via environment variable
- Document tuning guidance

### Improve Detection Logging
- Log energy levels during grace period (diagnostic)
- Add "close to threshold" warnings (0.002-0.004 range)
- Suggest threshold adjustment when patterns emerge
- Help users tune for their environment

### Update Documentation
- Document why 0.003 was chosen as new default
- Explain trade-offs: false negatives vs. false positives
- Provide environment-specific tuning examples
- Add troubleshooting guide for silence detection

## Success Criteria

1. Single SILENCE_THRESHOLD definition in codebase
2. Threshold configurable via config.vad.silenceThreshold
3. Default threshold (0.003) reduces false positives
4. Logs show energy levels to aid tuning
5. Zero breaking changes to existing configs
6. Documentation includes tuning guidance

## Risks

- **Too lenient threshold**: May capture background noise
  - *Mitigation*: Default (0.003) is conservative, configurable
- **Breaking change**: Changing default behavior
  - *Mitigation*: New default is more permissive (better UX)
- **User confusion**: Unclear how to tune
  - *Mitigation*: Enhanced logging and documentation

## Related Work

- Existing spec: `voice-activity-detection` (10 requirements)
- Related constant: MIN_SPEECH_MS (filters false positives)
- Detection logic: VoiceActivityDetector.js (processSamples)
- Legacy definition: main.js VAD_CONSTANTS (to be removed)
