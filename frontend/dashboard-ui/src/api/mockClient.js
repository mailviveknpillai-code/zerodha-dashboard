/**
 * Mock API Client
 * Wraps the real API client and returns mock data when enabled
 */

import { 
  generateMockDerivatives, 
  generateMockStrikeMonitoring, 
  generateMockStock 
} from './mockData';

// Check if mock mode is enabled via environment variable or query parameter
function isMockModeEnabled() {
  // Check query parameter (e.g., ?mock=true)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('mock') === 'true') {
    return true;
  }
  
  // Check environment variable
  return import.meta.env.VITE_USE_MOCK_DATA === 'true';
}

const MOCK_MODE = isMockModeEnabled();

console.log(`🎭 Mock Data Mode: ${MOCK_MODE ? 'ENABLED' : 'DISABLED'}`);
if (MOCK_MODE) {
  console.log('📝 Using mock data for UI testing. Add ?mock=true to URL or set VITE_USE_MOCK_DATA=true');
}

// Track current underlying for consistent spot price
let currentUnderlying = 'NIFTY';
let currentSpotPrice = 22500;

// Update spot price with slight variations
function getCurrentSpotPrice(underlying) {
  // Maintain consistency across calls with slight variance
  currentSpotPrice = currentSpotPrice + (Math.random() * 4 - 2); // ±2 point variance
  return currentSpotPrice;
}

// Mock implementations of API functions
export async function fetchStock(symbol) {
  if (!MOCK_MODE) {
    throw new Error('Mock client should not be used when mock mode is disabled');
  }
  
  console.debug("🎭 [MOCK] fetchStock:", symbol);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
  
  const stockData = generateMockStock(symbol);
  return stockData;
}

export async function fetchDerivatives(underlying = 'NIFTY') {
  if (!MOCK_MODE) {
    throw new Error('Mock client should not be used when mock mode is disabled');
  }
  
  console.debug("🎭 [MOCK] fetchDerivatives:", underlying);
  
  currentUnderlying = underlying;
  const spotPrice = getCurrentSpotPrice(underlying);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
  
  const derivativesData = generateMockDerivatives(underlying, spotPrice);
  return derivativesData;
}

export async function fetchDerivativesBySegment(segment, underlying = 'NIFTY') {
  if (!MOCK_MODE) {
    throw new Error('Mock client should not be used when mock mode is disabled');
  }
  
  console.debug("🎭 [MOCK] fetchDerivativesBySegment:", segment, underlying);
  
  currentUnderlying = underlying;
  const spotPrice = getCurrentSpotPrice(underlying);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
  
  const derivativesData = generateMockDerivatives(underlying, spotPrice);
  
  // Filter by segment
  if (segment === 'futures') {
    return {
      ...derivativesData,
      callOptions: [],
      putOptions: [],
      dataSource: 'MOCK'
    };
  } else if (segment === 'options') {
    return {
      ...derivativesData,
      futures: [],
      dataSource: 'MOCK'
    };
  }
  
  return derivativesData;
}

export async function fetchStrikePriceMonitoring(underlying = 'NIFTY') {
  if (!MOCK_MODE) {
    throw new Error('Mock client should not be used when mock mode is disabled');
  }
  
  console.debug("🎭 [MOCK] fetchStrikePriceMonitoring:", underlying);
  
  currentUnderlying = underlying;
  const spotPrice = getCurrentSpotPrice(underlying);
  
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 200));
  
  const strikeData = generateMockStrikeMonitoring(underlying, spotPrice);
  return strikeData;
}

// Export mock mode status
export const isMockMode = MOCK_MODE;

// Mock axios instance for compatibility
export const api = {
  get: async (url, config = {}) => {
    console.warn('🎭 [MOCK] Direct api.get() called:', url);
    throw new Error('Mock client does not support direct api.get() calls. Use the specific fetch functions.');
  },
  post: async (url, data, config = {}) => {
    console.warn('🎭 [MOCK] Direct api.post() called:', url);
    throw new Error('Mock client does not support direct api.post() calls. Use the specific fetch functions.');
  }
};

// Export all mock functions
export default {
  fetchStock,
  fetchDerivatives,
  fetchDerivativesBySegment,
  fetchStrikePriceMonitoring,
  isMockMode
};

