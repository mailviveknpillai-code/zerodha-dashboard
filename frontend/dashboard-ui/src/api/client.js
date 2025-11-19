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

export async function updateBackendRefreshInterval(intervalMs) {
  try {
    const res = await api.put('/api/refresh-interval', { intervalMs });
    return res.data;
  } catch (error) {
    console.error('updateBackendRefreshInterval error:', error);
    throw error;
  }
}

export async function getBackendRefreshInterval() {
  try {
    const res = await api.get('/api/refresh-interval');
    return res.data;
  } catch (error) {
    console.error('getBackendRefreshInterval error:', error);
    throw error;
  }
}