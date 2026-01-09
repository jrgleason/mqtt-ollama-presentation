# Implementation Tasks

## 1. Create New Module Structure
- [x] 1.1 Create `/apps/voice-gateway-oww/src/audio/` directory
- [x] 1.2 Create `/apps/voice-gateway-oww/src/wake-word/` directory
- [x] 1.3 Create `/apps/voice-gateway-oww/src/audio/constants.js` with SAMPLE_RATE and CHUNK_SIZE
- [x] 1.4 Create `/apps/voice-gateway-oww/src/audio/AudioUtils.js` with rmsEnergy and writeWavFile
- [x] 1.5 Create `/apps/voice-gateway-oww/src/audio/AudioPlayer.js` with platform-specific playback class
- [x] 1.6 Create `/apps/voice-gateway-oww/src/wake-word/DetectorStateManager.js` with detector state management
- [x] 1.7 Create `/apps/voice-gateway-oww/src/util/XStateHelpers.js` with getServiceSnapshot and safeDetectorReset

## 2. Implement AudioPlayer Class
- [x] 2.1 Implement constructor with dependency injection (config, logger)
- [x] 2.2 Implement platform detection (isMacOS)
- [x] 2.3 Implement macOS playback (afplay with temp WAV file)
- [x] 2.4 Implement Linux playback (aplay with ALSA device)
- [x] 2.5 Add error handling and cleanup for temp files
- [x] 2.6 Add logging for playback operations

## 3. Implement DetectorStateManager Class
- [x] 3.1 Implement constructor with configurable frames/bins
- [x] 3.2 Implement createMelBuffer() method
- [x] 3.3 Implement newDetectorState() method
- [x] 3.4 Implement fillMelBufferWithZeros() method
- [x] 3.5 Implement reset() method for detector state
- [x] 3.6 Add JSDoc documentation for all methods

## 4. Update Consumers - main.js
- [x] 4.1 Update imports: Remove AudioUtils imports
- [x] 4.2 Import SAMPLE_RATE, CHUNK_SIZE from audio/constants.js
- [x] 4.3 Import getServiceSnapshot, safeDetectorReset from util/XStateHelpers.js
- [x] 4.4 Import BEEPS from util/BeepUtil.js (already exists)
- [x] 4.5 Instantiate AudioPlayer with config and logger
- [x] 4.6 Replace playAudio() calls with audioPlayer.play()
- [x] 4.7 Verify setupMic() function works with new modules

## 5. Update Consumers - BackgroundTranscriber.js
- [x] 5.1 Update imports: Remove AudioUtils imports
- [x] 5.2 Import rmsEnergy, writeWavFile from audio/AudioUtils.js
- [x] 5.3 Inject AudioPlayer instance via constructor
- [x] 5.4 Replace playAudio() calls with this.audioPlayer.play()
- [x] 5.5 Verify transcription workflow still works

## 6. Update Consumers - InitUtil.js
- [x] 6.1 Update imports: Remove AudioUtils imports
- [x] 6.2 Import checkAlsaDevice from audio/AudioUtils.js (move there first)
- [x] 6.3 Import safeDetectorReset from util/XStateHelpers.js
- [x] 6.4 Inject AudioPlayer instance for playAudio usage
- [x] 6.5 Verify initialization sequence still works

## 7. Update Consumers - OpenWakeWordDetector.js
- [x] 7.1 Update imports: Remove AudioUtils imports
- [x] 7.2 Import DetectorStateManager from wake-word/DetectorStateManager.js
- [x] 7.3 Instantiate DetectorStateManager in constructor
- [x] 7.4 Replace fillMelBufferWithZeros() calls with detectorStateManager methods
- [x] 7.5 Replace newDetectorState() calls with detectorStateManager methods
- [x] 7.6 Verify wake word detection still works

## 8. Move checkAlsaDevice to Appropriate Module
- [x] 8.1 Decide if checkAlsaDevice belongs in AudioUtils.js or AudioPlayer.js
- [x] 8.2 Move checkAlsaDevice to chosen module
- [x] 8.3 Update InitUtil.js to import from correct location
- [x] 8.4 Add JSDoc documentation

## 9. Testing and Validation
- [ ] 9.1 Write unit tests for audio/constants.js (simple export test)
- [ ] 9.2 Write unit tests for audio/AudioUtils.js (rmsEnergy, writeWavFile)
- [ ] 9.3 Write unit tests for AudioPlayer class (mock spawn/fs)
- [ ] 9.4 Write unit tests for DetectorStateManager class
- [ ] 9.5 Write unit tests for XStateHelpers.js
- [x] 9.6 Run manual tests with actual hardware (microphone, speaker)
- [x] 9.7 Verify wake word detection works end-to-end
- [x] 9.8 Verify TTS playback works on macOS and Linux

## 10. Cleanup and Documentation
- [x] 10.1 Delete original /apps/voice-gateway-oww/src/util/AudioUtils.js
- [x] 10.2 Update /apps/voice-gateway-oww/README.md with new architecture
- [x] 10.3 Add JSDoc comments to all new modules
- [ ] 10.4 Update CLAUDE.md if module structure conventions changed
- [ ] 10.5 Update openspec/project.md with resolved technical debt item

## 11. Final Verification
- [x] 11.1 Run `npm test` in voice-gateway-oww directory
- [x] 11.2 Test wake word → transcription → AI → TTS full pipeline
- [x] 11.3 Test on macOS platform (if available)
- [x] 11.4 Test on Linux/Raspberry Pi platform
- [x] 11.5 Check for any console warnings or errors
- [x] 11.6 Verify no regression in performance (response time)
