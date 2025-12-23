/**
 * Structured logging utility
 */

import {config} from '../config.js';

class Logger {
    constructor(level = 'info') {
        this.level = level;
    }

    shouldLog(level) {
        const levels = ['debug', 'info', 'warn', 'error'];
        return levels.indexOf(level) >= levels.indexOf(this.level);
    }

    log(level, message, metadata) {
        if (!this.shouldLog(level)) return;
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            ...(metadata && {metadata}),
        };
        if (config.nodeEnv === 'production') {
            console.log(JSON.stringify(entry));
        } else {
            const emoji = {
                debug: '🔍',
                info: 'ℹ️ ',
                warn: '⚠️ ',
                error: '❌',
            }[level];
            const color = {
                debug: '\x1b[36m',
                info: '\x1b[32m',
                warn: '\x1b[33m',
                error: '\x1b[31m',
            }[level];
            console.log(`${color}${emoji} [${level}]\x1b[0m ${message}`, metadata || '');
        }
    }

    debug(msg, meta) {
        this.log('debug', msg, meta);
    }

    info(msg, meta) {
        this.log('info', msg, meta);
    }

    warn(msg, meta) {
        this.log('warn', msg, meta);
    }

    error(msg, meta) {
        this.log('error', msg, meta);
    }
}

const logger = new Logger(config.logLevel);
const errMsg = (e) => (e instanceof Error ? e.message : String(e));

export {logger, errMsg};
