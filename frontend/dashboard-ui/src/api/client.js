import axios from 'axios';
import * as mockClient from './mockClient';

// Check if mock mode is enabled
function isMockModeEnabled() {
  // Check query parameter (e.g., ?mock=true)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('mock') === 'true') {
    return true;
  }
  
  // Check environment variable
  return import.meta.env.VITE_USE_MOCK_DATA === 'true';
}

const USE_MOCK_DATA = isMockModeEnabled();

// Use mock client if enabled, otherwise use real API
const client = USE_MOCK_DATA ? mockClient : null;

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
  timeout: 15000,
  timeoutErrorMessage: 'The request took too long to respond. Please retry in a moment.',
});

// Export mock mode status for debugging
export const isMockMode = USE_MOCK_DATA;

// Proxy functions that use mock data when enabled
export async function fetchStock(symbol) {
  if (USE_MOCK_DATA) {
    return await mockClient.fetchStock(symbol);
  }
  
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
  if (USE_MOCK_DATA) {
    return await mockClient.fetchDerivatives(underlying);
  }
  
  console.debug("fetchDerivatives: underlying", underlying);
  try {
    // Use only real Zerodha API derivatives data (spot price fetched automatically)
    const res = await api.get('/api/real-derivatives', { 
      params: { underlying } 
    });
    console.info("fetchDerivatives success (real Zerodha API data):", underlying);
    return res.data;
  } catch (error) {
    console.error("fetchDerivatives error for underlying=", underlying, ":", error);
    throw error;
  }
}

export async function fetchDerivativesBySegment(segment, underlying = 'NIFTY') {
  if (USE_MOCK_DATA) {
    return await mockClient.fetchDerivativesBySegment(segment, underlying);
  }
  
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

export async function fetchStrikePriceMonitoring(underlying = 'NIFTY') {
  if (USE_MOCK_DATA) {
    return await mockClient.fetchStrikePriceMonitoring(underlying);
  }
  
  console.debug("fetchStrikePriceMonitoring: underlying", underlying);
  try {
    // Use only real Zerodha API strike monitoring data (spot price fetched automatically)
    const res = await api.get('/api/real-strike-monitoring', { 
      params: { underlying } 
    });
    console.info("fetchStrikePriceMonitoring success (real Zerodha API data):", underlying);
    return res.data;
  } catch (error) {
    console.error("fetchStrikePriceMonitoring error:", error);
    throw error;
  }
}

export async function fetchZerodhaAuthUrl() {
  try {
    const res = await api.get('/api/zerodha/auth-url');
    return res.data;
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