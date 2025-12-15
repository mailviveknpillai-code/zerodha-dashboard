/**
 * Logger utility with debug mode support
 * Detailed logs are only printed when debug mode is enabled.
 * When disabled, only basic warnings/errors are logged.
 */

// Default: disabled (user can enable explicitly via Debug Mode toggle)
let debugModeEnabled = false;

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
    // Treat info as part of detailed logging
    if (debugModeEnabled) {
      console.info('[INFO]', ...args);
    }
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
