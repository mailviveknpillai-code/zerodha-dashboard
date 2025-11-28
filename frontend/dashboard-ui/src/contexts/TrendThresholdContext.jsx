import React, { createContext, useContext, useState, useCallback } from 'react';

const TrendThresholdContext = createContext(null);

export function TrendThresholdProvider({ children }) {
  // Default thresholds: Bullish >= 3, Bearish <= -3
  const [bullishThreshold, setBullishThreshold] = useState(3);
  const [bearishThreshold, setBearishThreshold] = useState(-3);

  const setBullishThresholdValue = useCallback((value) => {
    if (value >= 1 && value <= 10) {
      setBullishThreshold(value);
    }
  }, []);

  const setBearishThresholdValue = useCallback((value) => {
    if (value >= -10 && value <= -1) {
      setBearishThreshold(value);
    }
  }, []);

  const contextValue = {
    bullishThreshold,
    bearishThreshold,
    setBullishThreshold: setBullishThresholdValue,
    setBearishThreshold: setBearishThresholdValue,
  };

  return (
    <TrendThresholdContext.Provider value={contextValue}>
      {children}
    </TrendThresholdContext.Provider>
  );
}

export function useTrendThreshold() {
  const context = useContext(TrendThresholdContext);
  if (!context) {
    throw new Error('useTrendThreshold must be used within TrendThresholdProvider');
  }
  return context;
}

