import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getTrendCalculationWindow, updateTrendCalculationWindow } from '../api/client';

const TrendAveragingContext = createContext(null);

/**
 * Context for managing Trend Calculation window size.
 * This window determines how many API polled values are kept in the FIFO stack.
 * The trend is calculated from these values and updated in UI at frontend refresh rate.
 */
export function TrendAveragingProvider({ children }) {
  const [averagingWindowSeconds, setAveragingWindowSeconds] = useState(10); // Default 10 seconds

  // Load window size from backend on mount
  useEffect(() => {
    getTrendCalculationWindow()
      .then(data => {
        if (data?.windowSeconds) {
          setAveragingWindowSeconds(data.windowSeconds);
        }
      })
      .catch(err => {
        console.warn('Failed to load trend calculation window from backend:', err);
      });
  }, []);

  const setAveragingWindow = useCallback(async (seconds) => {
    if (seconds >= 3 && seconds <= 15 && seconds % 3 === 0) {
      try {
        await updateTrendCalculationWindow(seconds);
        setAveragingWindowSeconds(seconds);
      } catch (error) {
        console.error('Failed to update trend calculation window:', error);
        throw error;
      }
    }
  }, []);

  const contextValue = {
    averagingWindowSeconds,
    setAveragingWindow,
  };

  return (
    <TrendAveragingContext.Provider value={contextValue}>
      {children}
    </TrendAveragingContext.Provider>
  );
}

export function useTrendAveraging() {
  const context = useContext(TrendAveragingContext);
  if (!context) {
    throw new Error('useTrendAveraging must be used within TrendAveragingProvider');
  }
  return context;
}


