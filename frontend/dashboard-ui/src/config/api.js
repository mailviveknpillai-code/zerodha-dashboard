const USE_ALPHA = import.meta.env.VITE_USE_ALPHA_VANTAGE === "true";
const ALPHA_KEY = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY || "RUD59ZNA5UWUZH3M";

export async function fetchStock(symbol) {
  if (USE_ALPHA) {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    return data["Global Quote"] || {};
  } else {
    const res = await fetch(`/api/market/${symbol}`);
    return res.json();
  }
}
