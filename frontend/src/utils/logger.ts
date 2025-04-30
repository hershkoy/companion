// Define log level enum
enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

// Current log level - can be configured based on environment
const CURRENT_LOG_LEVEL: LogLevel = LogLevel.DEBUG; // Set to DEBUG for development

// Type for the logger function
type LoggerFunction = (message: string, ...args: any[]) => void;

// Interface for the logger object
interface Logger {
  debug: LoggerFunction;
  info: LoggerFunction;
  warn: LoggerFunction;
  error: LoggerFunction;
}

const formatMessage = (level: string, message: string, ...args: any[]): any[] => {
  const timestamp = new Date().toISOString();
  return [`[${timestamp}] [${level}] ${message}`, ...args];
};

const logger: Logger = {
  debug: (message: string, ...args: any[]): void => {
    if (CURRENT_LOG_LEVEL <= LogLevel.DEBUG) {
      console.debug(...formatMessage('DEBUG', message, ...args));
    }
  },

  info: (message: string, ...args: any[]): void => {
    if (CURRENT_LOG_LEVEL <= LogLevel.INFO) {
      console.log(...formatMessage('INFO', message, ...args));
    }
  },

  warn: (message: string, ...args: any[]): void => {
    if (CURRENT_LOG_LEVEL <= LogLevel.WARN) {
      console.warn(...formatMessage('WARN', message, ...args));
    }
  },

  error: (message: string, ...args: any[]): void => {
    if (CURRENT_LOG_LEVEL <= LogLevel.ERROR) {
      console.error(...formatMessage('ERROR', message, ...args));
    }
  },
};

export default logger;
