import React, { createContext, useContext, useState, useCallback } from 'react';

const TrendAveragingContext = createContext(null);

export function TrendAveragingProvider({ children }) {
  const [averagingWindowSeconds, setAveragingWindowSeconds] = useState(10); // Default 10 seconds

  const setAveragingWindow = useCallback((seconds) => {
    if (seconds >= 3 && seconds <= 15 && seconds % 3 === 0) {
      setAveragingWindowSeconds(seconds);
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


