const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

const CURRENT_LOG_LEVEL = LOG_LEVELS.DEBUG; // Set to DEBUG for development

const formatMessage = (level, message, ...args) => {
  const timestamp = new Date().toISOString();
  return [`[${timestamp}] [${level}] ${message}`, ...args];
};

const logger = {
  debug: (message, ...args) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.DEBUG) {
      console.debug(...formatMessage('DEBUG', message, ...args));
    }
  },
  
  info: (message, ...args) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.INFO) {
      console.log(...formatMessage('INFO', message, ...args));
    }
  },
  
  warn: (message, ...args) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.WARN) {
      console.warn(...formatMessage('WARN', message, ...args));
    }
  },
  
  error: (message, ...args) => {
    if (CURRENT_LOG_LEVEL <= LOG_LEVELS.ERROR) {
      console.error(...formatMessage('ERROR', message, ...args));
    }
  }
};

export default logger; 