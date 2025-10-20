const USE_ALPHA_VANTAGE = import.meta.env.VITE_USE_ALPHA_VANTAGE === "true";
const ALPHA_VANTAGE_API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY || "RUD59ZNA5UWUZH3M";

export const getStockData = async (symbol) => {
  if (USE_ALPHA_VANTAGE) {
    console.log(`Fetching data from Alpha Vantage for ${symbol}`);
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      return data["Global Quote"] || {};
    } catch (error) {
      console.error("Alpha Vantage API error:", error);
      return {};
    }
  } else {
    console.log(`Fetching data from backend for ${symbol}`);
    const res = await fetch(`/api/v1/snapshots?symbol=${symbol}`);
    return res.json();
  }
};

export const getMultipleStocks = async (symbols) => {
  if (USE_ALPHA_VANTAGE) {
    console.log("Fetching multiple stocks from Alpha Vantage");
    const promises = symbols.map(symbol => getStockData(symbol));
    return Promise.all(promises);
  } else {
    console.log("Fetching multiple stocks from backend");
    const res = await fetch(`/api/v1/snapshots`);
    return res.json();
  }
};
