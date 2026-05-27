/**
 * Configurable logger that strips console output in production
 * Set VITE_LOG_LEVEL=debug in .env to enable logging in development
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

const LOG_LEVEL: LogLevel = import.meta.env.PROD
  ? 'none'
  : (import.meta.env.VITE_LOG_LEVEL as LogLevel) || 'warn';

const shouldLog = (level: LogLevel): boolean => {
  const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'none'];
  const currentLevelIndex = levels.indexOf(LOG_LEVEL);
  const messageLevelIndex = levels.indexOf(level);
  return messageLevelIndex >= currentLevelIndex && LOG_LEVEL !== 'none';
};

export const logger = {
  debug: (message: string, ...args: unknown[]) => {
    if (shouldLog('debug')) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },

  info: (message: string, ...args: unknown[]) => {
    if (shouldLog('info')) {
      console.info(`[INFO] ${message}`, ...args);
    }
  },

  warn: (message: string, ...args: unknown[]) => {
    if (shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },

  error: (message: string, ...args: unknown[]) => {
    if (shouldLog('error')) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  },
};
