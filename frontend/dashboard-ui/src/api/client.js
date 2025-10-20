import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_BASE_URL || 'http://localhost:8080',
  timeout: 5000,
});

const USE_ALPHA = import.meta.env.VITE_USE_ALPHA_VANTAGE === "true";
const ALPHA_KEY = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY || "RUD59ZNA5UWUZH3M";

const normalize = (s) => {
  if (!s) return s;
  const u = String(s).toUpperCase();
  if (u === 'NIFTY' || u === 'NIFTY 50' || u === 'NIFTY50') return '^NSEI';
  // If symbol already has exchange suffix, keep it; else default to NSE equity
  return s.includes('.') ? s : `${s}.NSE`;
};

export async function fetchStock(symbol) {
  console.debug("fetchStock: symbol", symbol, "usingAlpha", USE_ALPHA);
  try {
    if (USE_ALPHA) {
      const sym = normalize(symbol);
      const res = await axios.get('https://www.alphavantage.co/query', {
        params: { function: 'GLOBAL_QUOTE', symbol: sym, apikey: ALPHA_KEY },
      });
      console.info("fetchStock success (AlphaVantage):", symbol);
      return res.data["Global Quote"] || {};
    } else {
      const res = await api.get(`/api/market/${symbol}`);
      console.info("fetchStock success (Backend API):", symbol);
      return res.data;
    }
  } catch (error) {
    console.error("fetchStock error for symbol=", symbol, ":", error);
    throw error; // Re-throw the error to be handled by the caller
  }
}

export async function fetchSpot(symbol) {
  const sym = normalize(symbol);
  const res = await api.get('/api/alpha-demo', { params: { symbol: sym } });
  return res.data;
}

export async function fetchDerivatives(underlying = 'NIFTY', spotPrice = 25000) {
  console.debug("fetchDerivatives: underlying", underlying, "spotPrice", spotPrice);
  try {
    // Try real derivatives first, fallback to mock if not available
    try {
      const res = await api.get('/api/real-derivatives', { 
        params: { underlying } 
      });
      console.info("fetchDerivatives success (real data):", underlying);
      return res.data;
    } catch (realError) {
      console.warn("Real derivatives not available, falling back to mock data:", realError.message);
      const res = await api.get('/api/mock-derivatives', { 
        params: { underlying, spot: spotPrice } 
      });
      console.info("fetchDerivatives success (mock data):", underlying);
      return res.data;
    }
  } catch (error) {
    console.error("fetchDerivatives error for underlying=", underlying, ":", error);
    throw error;
  }
}

export async function fetchDerivativesBySegment(segment, underlying = 'NIFTY', spotPrice = 25000) {
  console.debug("fetchDerivativesBySegment: segment", segment, "underlying", underlying, "spotPrice", spotPrice);
  try {
    const res = await api.get('/api/mock-derivatives/segment', { 
      params: { segment, underlying, spot: spotPrice } 
    });
    console.info("fetchDerivativesBySegment success:", segment, underlying);
    return res.data;
  } catch (error) {
    console.error("fetchDerivativesBySegment error:", error);
    throw error;
  }
}

export async function fetchStrikePriceMonitoring(underlying = 'NIFTY', spotPrice = 25000) {
  console.debug("fetchStrikePriceMonitoring: underlying", underlying, "spotPrice", spotPrice);
  try {
    // Try real strike monitoring first, fallback to mock if not available
    try {
      const res = await api.get('/api/real-strike-monitoring', { 
        params: { underlying } 
      });
      console.info("fetchStrikePriceMonitoring success (real data):", underlying);
      return res.data;
    } catch (realError) {
      console.warn("Real strike monitoring not available, falling back to mock data:", realError.message);
      const res = await api.get('/api/strike-monitoring', { 
        params: { underlying, spot: spotPrice } 
      });
      console.info("fetchStrikePriceMonitoring success (mock data):", underlying);
      return res.data;
    }
  } catch (error) {
    console.error("fetchStrikePriceMonitoring error:", error);
    throw error;
  }
}