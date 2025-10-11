/**
 * Structured logging utility
 */

import { config } from './config.js';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  metadata?: Record<string, unknown>;
}

class Logger {
  private level: LogLevel;

  constructor(level: string = 'info') {
    this.level = level as LogLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, unknown>) {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(metadata && { metadata }),
    };

    // Structured JSON logging for production
    if (config.nodeEnv === 'production') {
      console.log(JSON.stringify(entry));
    } else {
      // Human-readable logging for development
      const emoji = {
        debug: '🔍',
        info: 'ℹ️ ',
        warn: '⚠️ ',
        error: '❌',
      }[level];

      const color = {
        debug: '\x1b[36m', // Cyan
        info: '\x1b[32m',  // Green
        warn: '\x1b[33m',  // Yellow
        error: '\x1b[31m', // Red
      }[level];

      const reset = '\x1b[0m';

      console.log(
        `${color}${emoji} [${entry.timestamp}] ${level.toUpperCase()}:${reset} ${message}`,
        metadata ? JSON.stringify(metadata, null, 2) : ''
      );
    }
  }

  debug(message: string, metadata?: Record<string, unknown>) {
    this.log('debug', message, metadata);
  }

  info(message: string, metadata?: Record<string, unknown>) {
    this.log('info', message, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>) {
    this.log('warn', message, metadata);
  }

  error(message: string, metadata?: Record<string, unknown>) {
    this.log('error', message, metadata);
  }
}

export const logger = new Logger(config.logLevel);
