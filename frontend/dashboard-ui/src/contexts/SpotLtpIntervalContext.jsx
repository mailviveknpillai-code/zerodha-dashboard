import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSpotLtpTrendWindow, updateSpotLtpTrendWindow } from '../api/client';

const SpotLtpIntervalContext = createContext();

/**
 * Provider for Spot LTP Trend interval settings.
 * The interval determines how many seconds of LTP data to use for trend calculation.
 * Valid values: 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60 seconds.
 */
export function SpotLtpIntervalProvider({ children }) {
  const [intervalSeconds, setIntervalSecondsState] = useState(10); // Default 10s
  const [isLoading, setIsLoading] = useState(true);

  // Load initial value from backend on mount
  useEffect(() => {
    const loadFromBackend = async () => {
      try {
        const data = await getSpotLtpTrendWindow();
        if (data && data.windowSeconds) {
          setIntervalSecondsState(data.windowSeconds);
        }
      } catch (error) {
        console.warn('Failed to load spot LTP trend window from backend, using default:', error);
        // Try to load from localStorage as fallback
        const stored = localStorage.getItem('spotLtpInterval');
        if (stored) {
          setIntervalSecondsState(parseInt(stored, 10));
        }
      } finally {
        setIsLoading(false);
      }
    };
    loadFromBackend();
  }, []);

  // Sync changes to backend and localStorage
  const setIntervalSeconds = useCallback(async (newInterval) => {
    // Validate: 5-60 seconds, 5s increments
    let validInterval = Math.max(5, Math.min(60, newInterval));
    validInterval = Math.round(validInterval / 5) * 5;
    if (validInterval < 5) validInterval = 5;
    
    setIntervalSecondsState(validInterval);
    localStorage.setItem('spotLtpInterval', validInterval.toString());
    
    try {
      await updateSpotLtpTrendWindow(validInterval);
      console.info('Spot LTP trend window updated to', validInterval, 'seconds');
    } catch (error) {
      console.error('Failed to update spot LTP trend window in backend:', error);
    }
  }, []);

  return (
    <SpotLtpIntervalContext.Provider value={{ intervalSeconds, setIntervalSeconds, isLoading }}>
      {children}
    </SpotLtpIntervalContext.Provider>
  );
}

/**
 * Hook to access spot LTP trend interval settings.
 */
export function useSpotLtpInterval() {
  const context = useContext(SpotLtpIntervalContext);
  if (!context) {
    throw new Error('useSpotLtpInterval must be used within a SpotLtpIntervalProvider');
  }
  return context;
}

