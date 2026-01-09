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
            /what (time|date) is it\??$/i,
            /what day is (it|today)\??$/i,
            /^what('?s| is) the current (time|date|day)/i,
            // Enhanced patterns for "day of the week" phrasings
            /what day of the week/i,
            /^day of the week\??$/i,
            /which day (is it|of the week)/i,
            // Enhanced patterns for "what's today" variations
            /^what'?s today\??$/i,
            /^today'?s (date|day)\??$/i,
            // Enhanced patterns for date inquiries
            /^what'?s the (date|time|day)\??$/i,
            /^tell me the (date|time|day)/i
        ];

        // Max word count for a pure datetime query
        // "What time is it?" = 4 words, "What day of the week is it?" = 7 words
        // Anything longer is probably asking about something else
        this.maxDateTimeQueryWords = 8;

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

        // DateTime queries must match pattern AND be short enough to be a pure datetime query
        // "As of the current date, what is the price of silver?" = 11 words (NOT datetime)
        // "What time is it?" = 4 words (IS datetime)
        const matchesDateTimePattern = this.dateTimeQueryPatterns.some(p => p.test(transcription));
        const wordCount = transcription.trim().split(/\s+/).length;
        const isDateTimeQuery = matchesDateTimePattern && wordCount <= this.maxDateTimeQueryWords;

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
     * Only returns true for short, simple datetime queries
     *
     * @param {string} transcription - User's transcribed speech
     * @returns {boolean} True if matches datetime query pattern
     */
    isDateTimeQuery(transcription) {
        const matchesPattern = this.dateTimeQueryPatterns.some(p => p.test(transcription));
        const wordCount = transcription.trim().split(/\s+/).length;
        return matchesPattern && wordCount <= this.maxDateTimeQueryWords;
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
