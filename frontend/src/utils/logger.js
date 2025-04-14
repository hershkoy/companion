const getTimestamp = () => {
  return new Date().toISOString();
};

const logger = {
  info: (message, ...args) => {
    console.log(`[${getTimestamp()}] [INFO] ${message}`, ...args);
  },
  
  error: (message, error) => {
    console.error(
      `[${getTimestamp()}] [ERROR] ${message}`,
      error instanceof Error ? error.stack : error
    );
  },

  warn: (message, ...args) => {
    console.warn(`[${getTimestamp()}] [WARN] ${message}`, ...args);
  },

  debug: (message, ...args) => {
    console.debug(`[${getTimestamp()}] [DEBUG] ${message}`, ...args);
  }
};

export default logger; 