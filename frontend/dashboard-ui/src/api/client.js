import axios from 'axios';

function resolveBaseUrl() {
  if (import.meta.env.VITE_BACKEND_BASE_URL) {
    return import.meta.env.VITE_BACKEND_BASE_URL;
  }

  if (typeof window !== 'undefined') {
    const { hostname, origin } = window.location;
    if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return origin;
    }
  }

  return 'http://localhost:9000';
}

export const api = axios.create({
  baseURL: resolveBaseUrl(),
  timeout: 30000, // Increased to 30 seconds for general requests
  timeoutErrorMessage: 'The request took too long to respond. Please retry in a moment.',
});

export async function fetchStock(symbol) {
  console.debug("fetchStock: symbol", symbol);
  try {
    const res = await api.get(`/api/market/${symbol}`);
    console.info("fetchStock success (Backend API):", symbol);
    return res.data;
  } catch (error) {
    console.error("fetchStock error for symbol=", symbol, ":", error);
    throw error; // Re-throw the error to be handled by the caller
  }
}

/**
 * Get the LTP movement cache size.
 * @returns {Promise<number>}
 */
export async function getLtpMovementCacheSize() {
  try {
    const response = await api.get('/api/ltp-movement/cache-size');
    return response.data;
  } catch (error) {
    console.error('Failed to get LTP movement cache size:', error);
    throw error;
  }
}

/**
 * Update the LTP movement cache size.
 * @param {number} size Number of movements to track (2-20)
 * @returns {Promise<number>}
 */
export async function updateLtpMovementCacheSize(size) {
  try {
    const response = await api.post('/api/ltp-movement/cache-size', null, {
      params: { size },
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Failed to update LTP movement cache size:', error);
    throw error;
  }
}

/**
 * Get the trend calculation window size.
 * @returns {Promise<{windowSeconds: number}>}
 */
export async function getTrendCalculationWindow() {
  try {
    const response = await api.get('/api/trend-calculation/window');
    return response.data;
  } catch (error) {
    console.error('Failed to get trend calculation window:', error);
    throw error;
  }
}

/**
 * Update the trend calculation window size.
 * @param {number} seconds - Window size in seconds (number of API polled values to keep in FIFO stack)
 */
export async function updateTrendCalculationWindow(seconds) {
  try {
    const response = await api.post(`/api/trend-calculation/window?seconds=${seconds}`, null, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to update trend calculation window:', error);
    throw error;
  }
}

/**
 * Get the trend calculation thresholds.
 * @returns {Promise<{bullishThreshold: number, bearishThreshold: number}>}
 */
export async function getTrendCalculationThresholds() {
  try {
    const response = await api.get('/api/trend-calculation/thresholds');
    return response.data;
  } catch (error) {
    console.error('Failed to get trend calculation thresholds:', error);
    throw error;
  }
}

/**
 * Update the trend calculation thresholds.
 * @param {number} bullish - Bullish threshold (default: 3.0)
 * @param {number} bearish - Bearish threshold (default: -3.0)
 */
export async function updateTrendCalculationThresholds(bullish, bearish) {
  try {
    const params = new URLSearchParams();
    if (bullish != null) params.append('bullish', bullish);
    if (bearish != null) params.append('bearish', bearish);
    const response = await api.post(`/api/trend-calculation/thresholds?${params.toString()}`, null, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to update trend calculation thresholds:', error);
    throw error;
  }
}

/**
 * Get the spot LTP trend window configuration.
 * @returns {Promise<{windowSeconds: number, trendPercent: number, trendDirection: string}>}
 */
export async function getSpotLtpTrendWindow() {
  try {
    const response = await api.get('/api/spot-ltp-trend/window');
    return response.data;
  } catch (error) {
    console.error('Failed to get spot LTP trend window:', error);
    throw error;
  }
}

/**
 * Update the spot LTP trend window.
 * @param {number} seconds - Window size (5-60 seconds, 5s increments)
 */
export async function updateSpotLtpTrendWindow(seconds) {
  try {
    const response = await api.post(`/api/spot-ltp-trend/window?seconds=${seconds}`, null, {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  } catch (error) {
    console.error('Failed to update spot LTP trend window:', error);
    throw error;
  }
}

/**
 * Update the Eaten Delta rolling window time.
 * @param {number} seconds - Window time in seconds (1, 3, 5, 10, or 30)
 */
export async function updateEatenDeltaWindow(seconds) {
  console.debug("updateEatenDeltaWindow: seconds", seconds);
  try {
    // Send as query parameter (backend supports both query param and body)
    const res = await api.post(`/api/eaten-delta/window?seconds=${seconds}`, null, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.info("updateEatenDeltaWindow success:", seconds);
    return res.data;
  } catch (error) {
    console.error("updateEatenDeltaWindow error for seconds=", seconds, ":", error);
    throw error;
  }
}

export async function fetchDerivatives(underlying = 'NIFTY') {
  console.debug("fetchDerivatives: underlying", underlying);
  try {
    // Use only real Zerodha API derivatives data (spot price fetched automatically)
    // Add timestamp to prevent browser/HTTP caching and ensure fresh data
    // Use longer timeout (60 seconds) for derivatives API as it may take longer to fetch all contracts
    const res = await api.get('/api/real-derivatives', { 
      params: { 
        underlying,
        _t: Date.now() // Cache-busting timestamp
      },
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      timeout: 60000 // 60 seconds timeout for derivatives API
    });
    console.info("fetchDerivatives success (real Zerodha API data):", underlying);
    return res.data;
  } catch (error) {
    console.error("fetchDerivatives error for underlying=", underlying, ":", error);
    throw error;
  }
}

/**
 * Fetch the latest cached snapshot (ultra-fast endpoint for polling).
 * This endpoint returns the most recent snapshot from cache without hitting external APIs.
 * @param {string} underlying - The underlying symbol (default: 'NIFTY')
 * @returns {Promise<Object>} The latest derivatives chain snapshot
 */
export async function fetchLatest(underlying = 'NIFTY', signal = null) {
  console.debug("fetchLatest: underlying", underlying);
  try {
    const res = await api.get('/api/latest', { 
      params: { 
        underlying,
        _t: Date.now() // Cache-busting timestamp (though cache should handle this)
      },
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
      timeout: 5000, // Fast timeout since this is a cache lookup
      signal: signal // Support for abort signal
    });
    console.debug("fetchLatest success (cached snapshot):", underlying);
    return res.data;
  } catch (error) {
    // Don't log abort errors
    if (error.name !== 'AbortError' && error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') {
      console.error("fetchLatest error for underlying=", underlying, ":", error);
    }
    throw error;
  }
}

export async function fetchDerivativesBySegment(segment, underlying = 'NIFTY') {
  console.debug("fetchDerivativesBySegment: segment", segment, "underlying", underlying);
  try {
    const res = await api.get('/api/real-derivatives/segment', { 
      params: { segment, underlying }
    });
    console.info("fetchDerivativesBySegment success (real Zerodha API data):", segment, underlying);
    return res.data;
  } catch (error) {
    console.error("fetchDerivativesBySegment error:", error);
    throw error;
  }
}

export async function fetchZerodhaAuthUrl() {
  try {
    const res = await api.get('/api/zerodha/auth-url');
    const data = res.data || {};
    const normalizedUrl = data.url || data.authUrl || data.auth_url || null;
    return {
      ...data,
      url: normalizedUrl,
    };
  } catch (error) {
    console.error('fetchZerodhaAuthUrl error:', error);
    throw error;
  }
}

export async function fetchZerodhaSession() {
  try {
    const res = await api.get('/api/zerodha/session');
    return res.data;
  } catch (error) {
    console.error('fetchZerodhaSession error:', error);
    throw error;
  }
}

export async function logoutZerodhaSession() {
  try {
    const res = await api.post('/api/zerodha/logout');
    return res.data;
  } catch (error) {
    console.error('logoutZerodhaSession error:', error);
    throw error;
  }
}

// API Polling Interval (backend scheduler - how often backend polls Zerodha API)
export async function updateApiPollingInterval(intervalMs) {
  try {
    const res = await api.put('/api/api-polling-interval', { intervalMs });
    return res.data;
  } catch (error) {
    console.error('updateApiPollingInterval error:', error);
    throw error;
  }
}

export async function getApiPollingInterval() {
  try {
    const res = await api.get('/api/api-polling-interval');
    return res.data;
  } catch (error) {
    console.error('getApiPollingInterval error:', error);
    throw error;
  }
}

// Legacy functions - kept for backward compatibility but no longer used
// UI refresh rate is now independent and doesn't sync with backend
export async function updateBackendRefreshInterval(intervalMs) {
  // No-op: UI refresh rate is now independent
  console.warn('updateBackendRefreshInterval is deprecated - UI refresh rate is now independent');
  return { success: true, intervalMs };
}

export async function getBackendRefreshInterval() {
  // Return default - UI refresh rate is now independent
  console.warn('getBackendRefreshInterval is deprecated - UI refresh rate is now independent');
  return { intervalMs: 1000 };
}

/**
 * Get API polling status (for lightweight warning banner).
 * Returns last success/failure times, last error, and whether a warning should be shown.
 */
export async function getApiPollingStatus() {
  try {
    const res = await api.get('/api/api-polling-status');
    return res.data;
  } catch (error) {
    console.error('getApiPollingStatus error:', error);
    throw error;
  }
}