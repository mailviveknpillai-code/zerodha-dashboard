import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { getStockData } from '../api/alphaVantage';

export const useSnapshots = (symbol = 'AAPL') =>
  useQuery(['snapshots', symbol], async () => {
    const USE_ALPHA_VANTAGE = import.meta.env.VITE_USE_ALPHA_VANTAGE === "true";
    
    if (USE_ALPHA_VANTAGE) {
      const data = await getStockData(symbol);
      // Transform Alpha Vantage data to match expected format
      return [{
        instrumentToken: symbol,
        tradingsymbol: symbol,
        lastPrice: parseFloat(data["05. price"] || "0"),
        volume: parseInt(data["06. volume"] || "0"),
        segment: "ALPHA_VANTAGE",
        timestamp: new Date().toISOString()
      }];
    } else {
      const res = await api.get(`/api/v1/snapshots?symbol=${symbol}`);
      return res.data;
    }
  }, {
    refetchInterval: 5000, // Reduced frequency for Alpha Vantage (free tier has limits)
    staleTime: 2000,
  });
