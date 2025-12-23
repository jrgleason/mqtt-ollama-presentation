import { logger } from './Logger.js';

/**
 * Get XState service snapshot (compatible with v4 and v5)
 *
 * XState v4 uses `service.state` while v5 uses `service.getSnapshot()`.
 * This helper provides a unified interface for both versions.
 *
 * @param {Object} voiceService - XState service instance
 * @returns {Object} Service snapshot/state
 */
export function getServiceSnapshot(voiceService) {
    return voiceService.getSnapshot ? voiceService.getSnapshot() : voiceService.state;
}

/**
 * Safely reset the OpenWakeWord detector
 *
 * Calls detector.reset() if the method exists and catches any errors
 * to prevent exceptions from propagating to the caller.
 *
 * @param {Object} detector - OpenWakeWordDetector instance
 * @param {string} [context=''] - Context for logging (e.g., 'post-trigger')
 */
export function safeDetectorReset(detector, context = '') {
    try {
        if (detector && typeof detector.reset === 'function') {
<<<<<<< HEAD
            logger.debug(`🔧 [STARTUP-DEBUG] safeDetectorReset() called with context: ${context}`);
=======
>>>>>>> f5a9006 (refactor: standardize file naming to PascalCase/camelCase)
            detector.reset();
            logger.debug(`🔄 Detector reset (${context})`);
        }
    } catch (err) {
        logger.error('Failed to reset detector', { context, error: err.message });
    }
}
