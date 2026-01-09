/**
 * DateTime Tool for AI
 *
 * Provides current date and time information in the system's timezone
 */

import {loadPrompt} from '../util/prompt-loader.js';

/**
 * Get current date and time information
 * @returns {Object} Current datetime info
 */
export function getCurrentDateTime() {
    const now = new Date();

    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];

    return {
        // Date components
        dayOfWeek: daysOfWeek[now.getDay()],
        dayOfWeekShort: daysOfWeek[now.getDay()].substring(0, 3),
        dayOfMonth: now.getDate(),
        month: months[now.getMonth()],
        monthShort: months[now.getMonth()].substring(0, 3),
        monthNumber: now.getMonth() + 1,
        year: now.getFullYear(),

        // Time components
        hour: now.getHours(),
        hour12: now.getHours() % 12 || 12,
        minute: now.getMinutes(),
        second: now.getSeconds(),
        ampm: now.getHours() >= 12 ? 'PM' : 'AM',

        // Formatted strings
        dateString: now.toLocaleDateString(),
        timeString: now.toLocaleTimeString(),
        isoString: now.toISOString(),

        // Timezone info
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timezoneOffset: -now.getTimezoneOffset() / 60, // Convert to hours from UTC
    };
}

/**
 * Get a human-readable description of the current date and time
 * @param {string} context - Optional context (user's question) to format response appropriately
 * @returns {string} Human-readable datetime
 */
export function getDateTimeDescription(context = '') {
    const dt = getCurrentDateTime();
    const lowerContext = (context || '').toLowerCase();

    // Helper: parse explicit date from text like "April 24th 1982", "1982-04-24", "4/24/1982"
    function parseExplicitDate(text) {
        if (!text) return null;
        let s = text.trim();
        // Remove ordinal suffixes (1st, 2nd, 3rd, 4th)
        s = s.replace(/\b(\d{1,2})(st|nd|rd|th)\b/gi, '$1');

        const months = {
            january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
            july: 6, august: 7, september: 8, october: 9, november: 10, december: 11
        };

        // 1) Month name formats: "April 24, 1982" or "April 24 1982" or "April 24"
        const m1 = s.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?(?:\s+(\d{2,4}))?/i);
        if (m1) {
            const month = months[m1[1].toLowerCase()];
            const day = parseInt(m1[2], 10);
            let year = m1[3] ? parseInt(m1[3], 10) : new Date().getFullYear();
            if (year < 100) year += (year <= 29 ? 2000 : 1900);
            const d = new Date(year, month, day);
            // Validate date
            if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) return d;
        }

        // 2) ISO format: YYYY-MM-DD
        const m2 = s.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
        if (m2) {
            const year = parseInt(m2[1], 10);
            const month = parseInt(m2[2], 10) - 1;
            const day = parseInt(m2[3], 10);
            const d = new Date(year, month, day);
            if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) return d;
        }

        // 3) Numeric US format: MM/DD/YYYY or M/D/YY
        const m3 = s.match(/\b(\d{1,2})[/](\d{1,2})[/](\d{2,4})\b/);
        if (m3) {
            let year = parseInt(m3[3], 10);
            if (year < 100) year += (year <= 29 ? 2000 : 1900);
            const month = parseInt(m3[1], 10) - 1;
            const day = parseInt(m3[2], 10);
            const d = new Date(year, month, day);
            if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) return d;
        }

        return null;
    }

    // If asking specifically about TIME only
    if (/what time|what's the time|tell me the time|current time/i.test(lowerContext) &&
        !/date|day|year|month/i.test(lowerContext)) {
        return `It's ${dt.hour12}:${String(dt.minute).padStart(2, '0')} ${dt.ampm}`;
    }

    // If asking "what day of the week" for a specific date
    if (/what\s+day\s+of\s+the\s+week/i.test(lowerContext)) {
        const explicit = parseExplicitDate(context);
        if (explicit) {
            const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const dow = daysOfWeek[explicit.getDay()];
            return `${dow}`; // Keep answers brief as per system prompt
        }
        // If no explicit date found, default to today
        return `It's ${dt.dayOfWeek}`;
    }

    // If asking specifically about DAY only (today)
    if (/what day|what's today|is it today|today's day/i.test(lowerContext) &&
        !/time|date|year|month|week was|week is/i.test(lowerContext)) {
        return `It's ${dt.dayOfWeek}`;
    }

    // If asking specifically about MONTH only
    if (/what month|what's the month|current month/i.test(lowerContext) &&
        !/time|date|day|year/i.test(lowerContext)) {
        return `It's ${dt.month}`;
    }

    // If asking specifically about YEAR only
    if (/what year|what's the year|current year/i.test(lowerContext) &&
        !/time|date|day|month/i.test(lowerContext)) {
        return `It's ${dt.year}`;
    }

    // If asking specifically about DATE (without time)
    if (/what'?s? the date|today'?s? date|what date/i.test(lowerContext) &&
        !/time/i.test(lowerContext)) {
        return `It's ${dt.dayOfWeek}, ${dt.month} ${dt.dayOfMonth}, ${dt.year}`;
    }

    // Default: return full datetime (for ambiguous queries or tool calls)
    return `It is currently ${dt.hour12}:${String(dt.minute).padStart(2, '0')} ${dt.ampm} on ${dt.dayOfWeek}, ${dt.month} ${dt.dayOfMonth}, ${dt.year}. Your timezone is ${dt.timezone}.`;
}

/**
 * Tool definition for AI
 * @see prompts/tools/datetime.md
 */
export const dateTimeTool = {
    type: 'function',
    function: {
        name: 'get_current_datetime',
        description: loadPrompt('tools/datetime'),
        parameters: {
            type: 'object',
            description: 'No parameters required for current date/time.',
            properties: {},
            required: [],
            additionalProperties: false
        }
    }
};

/**
 * Execute the datetime tool
 * @param {Object} [_args={}] - Tool arguments (none required)
 * @param {string} context - Optional user question for context-aware responses
 * @returns {string} Human-readable datetime description
 */
export function executeDateTimeTool(_args = {}, context = '') {
    // Mark unused tool args as intentionally ignored to satisfy ESLint
    void _args;

    const result = getDateTimeDescription(context);
    console.log('🕒 DateTime tool executed:', result);
    return result;
}
