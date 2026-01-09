/**
 * IntentClassifier - Pattern-based intent detection service
 *
 * Classifies user queries into categories using regex patterns:
 * - Device queries (list/show devices)
 * - DateTime queries (what time is it)
 * - Device control queries (turn on/off, dim, brighten)
 * - General queries (fallback)
 *
 * Usage:
 *   const classifier = new IntentClassifier();
 *   const intent = classifier.classify("what time is it?");
 *   // => { isDateTimeQuery: true, isDeviceQuery: false, isDeviceControlQuery: false }
 */
export class IntentClassifier {
    constructor() {
        // Initialize regex patterns (stateless utility)
        this.deviceQueryPatterns = [
            /\b(list|show|what)\s+(devices?|lights?|switch(es)?|sensors?)\b/i,
            /\bwhat do i have\b/i,
            /\bshow me (the )?(devices?|lights?|switch(es)?|sensors?)\b/i,
            /\bdevices?\b/i
        ];

        this.dateTimeQueryPatterns = [
            /what (time|date) is it/i,
            /what day is (it|today)/i,
            /current (time|date|day|month|year)/i
        ];

        this.deviceControlQueryPatterns = [
            /turn (on|off)/i,
            /switch (on|off)/i,
            /dim/i,
            /brighten/i,
            /set .+ to \d+/i,
        ];
    }

    /**
     * Classify user transcription into intent categories
     *
     * @param {string} transcription - User's transcribed speech
     * @returns {Object} Intent flags: { isDeviceQuery, isDateTimeQuery, isDeviceControlQuery }
     */
    classify(transcription) {
        if (!transcription || typeof transcription !== 'string') {
            return {
                isDeviceQuery: false,
                isDateTimeQuery: false,
                isDeviceControlQuery: false
            };
        }

        // Case-insensitive pattern matching (patterns already have /i flag)
        const isDeviceQuery = this.deviceQueryPatterns.some(p => p.test(transcription));
        const isDateTimeQuery = this.dateTimeQueryPatterns.some(p => p.test(transcription));
        const isDeviceControlQuery = this.deviceControlQueryPatterns.some(p => p.test(transcription));

        return {
            isDeviceQuery,
            isDateTimeQuery,
            isDeviceControlQuery
        };
    }

    /**
     * Check if transcription matches device query patterns
     *
     * @param {string} transcription - User's transcribed speech
     * @returns {boolean} True if matches device query pattern
     */
    isDeviceQuery(transcription) {
        return this.deviceQueryPatterns.some(p => p.test(transcription));
    }

    /**
     * Check if transcription matches datetime query patterns
     *
     * @param {string} transcription - User's transcribed speech
     * @returns {boolean} True if matches datetime query pattern
     */
    isDateTimeQuery(transcription) {
        return this.dateTimeQueryPatterns.some(p => p.test(transcription));
    }

    /**
     * Check if transcription matches device control query patterns
     *
     * @param {string} transcription - User's transcribed speech
     * @returns {boolean} True if matches device control query pattern
     */
    isDeviceControlQuery(transcription) {
        return this.deviceControlQueryPatterns.some(p => p.test(transcription));
    }
}
