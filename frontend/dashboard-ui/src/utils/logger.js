/**
 * File-based logging utility for frontend
 * Sends logs to backend endpoint which writes them to rotating log files
 */

class Logger {
  constructor() {
    this.logQueue = []
    this.flushInterval = 5000 // Flush logs every 5 seconds
    this.maxQueueSize = 100 // Max logs to queue before forcing flush
    this.flushTimer = null
    this.isFlushing = false
    this.enabled = true
  }

  /**
   * Initialize the logger
   */
  init() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
    this.flushTimer = setInterval(() => this.flush(), this.flushInterval)
    
    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flush(true) // Force sync flush
    })
  }

  /**
   * Add log entry to queue
   */
  log(level, message, data = null) {
    if (!this.enabled) return

    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: String(message),
      data: data ? JSON.stringify(data, null, 0) : null,
      url: window.location.href,
      userAgent: navigator.userAgent
    }

    this.logQueue.push(logEntry)

    // Also log to console for immediate visibility
    const consoleMethod = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'
    if (console[consoleMethod]) {
      console[consoleMethod](`[${level.toUpperCase()}]`, message, data || '')
    }

    // Force flush if queue is too large
    if (this.logQueue.length >= this.maxQueueSize) {
      this.flush()
    }
  }

  /**
   * Flush logs to backend
   */
  async flush(sync = false) {
    if (this.isFlushing || this.logQueue.length === 0) {
      return
    }

    this.isFlushing = true
    const logsToSend = [...this.logQueue]
    this.logQueue = []

    try {
      // Resolve base URL (same logic as api client)
      const baseUrl = (() => {
        if (import.meta.env.VITE_BACKEND_BASE_URL) {
          return import.meta.env.VITE_BACKEND_BASE_URL
        }
        if (typeof window !== 'undefined') {
          const { hostname, origin } = window.location
          if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
            return origin
          }
        }
        return 'http://localhost:9000'
      })()

      if (sync) {
        // Use sendBeacon for synchronous flush (e.g., on page unload)
        const blob = new Blob([JSON.stringify(logsToSend)], { type: 'application/json' })
        navigator.sendBeacon(`${baseUrl}/api/logs`, blob)
      } else {
        // Use fetch for async flush
        await fetch(`${baseUrl}/api/logs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(logsToSend),
          keepalive: true // Keep request alive even if page is unloading
        })
      }
    } catch (error) {
      // If flush fails, re-queue logs (but limit to prevent memory issues)
      console.error('Failed to flush logs:', error)
      this.logQueue = [...logsToSend.slice(-50), ...this.logQueue].slice(0, this.maxQueueSize)
    } finally {
      this.isFlushing = false
    }
  }

  /**
   * Log methods
   */
  debug(message, data) {
    this.log('debug', message, data)
  }

  info(message, data) {
    this.log('info', message, data)
  }

  warn(message, data) {
    this.log('warn', message, data)
  }

  error(message, data) {
    this.log('error', message, data)
  }

  /**
   * Destroy logger and flush remaining logs
   */
  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
    this.flush(true) // Force final flush
  }
}

// Create singleton instance
const logger = new Logger()

// Initialize on module load
if (typeof window !== 'undefined') {
  logger.init()
}

export default logger
