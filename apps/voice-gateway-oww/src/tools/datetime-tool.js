/**
 * DateTime Tool for AI
 *
 * Provides current date and time information in the system's timezone
 */

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
 * @returns {string} Human-readable datetime
 */
export function getDateTimeDescription() {
    const dt = getCurrentDateTime();

    return `It is currently ${dt.hour12}:${String(dt.minute).padStart(2, '0')} ${dt.ampm} on ${dt.dayOfWeek}, ${dt.month} ${dt.dayOfMonth}, ${dt.year}. Your timezone is ${dt.timezone}.`;
}

/**
 * Tool definition for AI
 */
export const dateTimeTool = {
    type: 'function',
    function: {
        name: 'get_current_datetime',
        description: 'REQUIRED: Get the accurate current date and time from the system clock. You MUST call this function whenever the user asks about: current time, current date, what day it is, what time it is, today\'s date, the current year, day of the week, or any temporal/calendar information. DO NOT guess or make up dates/times - always call this function to get accurate information.',
        parameters: {
            type: 'object',
            properties: {},
            required: []
        }
    }
};

/**
 * Execute the datetime tool
 * @param {Object} args - Tool arguments (none required)
 * @returns {string} Human-readable datetime description
 */
export function executeDateTimeTool(args = {}) {
    const result = getDateTimeDescription();
    console.log('🕒 DateTime tool executed:', result);
    return result;
}
