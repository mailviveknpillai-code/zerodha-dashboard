/**
 * Logger utility with debug mode support
 * Debug logs are only printed when debug mode is enabled
 */

let debugModeEnabled = true; // Default: enabled (will change to false before building)

// Set debug mode (called by DebugModeContext)
export function setDebugMode(enabled) {
  debugModeEnabled = enabled;
  // Note: window.logger is the same logger object, so we don't need to call it recursively
}

// Get current debug mode
export function getDebugMode() {
  return debugModeEnabled;
}

const logger = {
  debug: (...args) => {
    if (debugModeEnabled) {
      console.debug('[DEBUG]', ...args);
    }
  },
  
  info: (...args) => {
    console.info('[INFO]', ...args);
  },
  
  warn: (...args) => {
    console.warn('[WARN]', ...args);
  },
  
  error: (...args) => {
    console.error('[ERROR]', ...args);
  },
  
  setDebugMode,
  getDebugMode,
};

// Make logger available globally for DebugModeContext
if (typeof window !== 'undefined') {
  window.logger = logger;
}

export default logger;
