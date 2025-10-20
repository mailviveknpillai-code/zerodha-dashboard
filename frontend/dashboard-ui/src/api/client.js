import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_BASE_URL || 'http://localhost:8080',
  timeout: 5000,
});

const USE_ALPHA = import.meta.env.VITE_USE_ALPHA_VANTAGE === "true";
const ALPHA_KEY = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY || "RUD59ZNA5UWUZH3M";

export async function fetchStock(symbol) {
  console.debug("fetchStock: symbol", symbol, "usingAlpha", USE_ALPHA);
  try {
    if (USE_ALPHA) {
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_KEY}`;
      const res = await axios.get(url);
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