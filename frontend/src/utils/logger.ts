type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogLevels {
  [key: string]: number;
  DEBUG: number;
  INFO: number;
  WARN: number;
  ERROR: number;
}

const LOG_LEVELS: LogLevels = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

const CURRENT_LOG_LEVEL = LOG_LEVELS.DEBUG; // Set to DEBUG for development

const formatMessage = (level: LogLevel, message: string, ...args: any[]): [string, ...any[]] => {
  const timestamp = new Date().toISOString();
  return [`[${timestamp}] [${level}] ${message}`, ...args];
};

interface Logger {
  debug: (message: string, ...args: any[]) => void;
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
}

const logger: Logger = {
  debug: (message: string, ...args: any[]): void => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.DEBUG) {
      console.debug(...formatMessage('DEBUG', message, ...args));
    }
  },

  info: (message: string, ...args: any[]): void => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.INFO) {
      console.log(...formatMessage('INFO', message, ...args));
    }
  },

  warn: (message: string, ...args: any[]): void => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.WARN) {
      console.warn(...formatMessage('WARN', message, ...args));
    }
  },

  error: (message: string, ...args: any[]): void => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.ERROR) {
      console.error(...formatMessage('ERROR', message, ...args));
    }
  },
};

export default logger;
