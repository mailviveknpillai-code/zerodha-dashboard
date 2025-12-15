import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { updateEatenDeltaWindow } from '../api/client';

const EatenDeltaWindowContext = createContext(null);

/**
 * Context for managing Eaten Delta rolling window time configuration.
 * Allows users to select window duration: 1-20s with 2s intervals (1, 3, 5, 7, 9, 11, 13, 15, 17, 19).
 */
export function EatenDeltaWindowProvider({ children }) {
  const [windowSeconds, setWindowSeconds] = useState(5); // Default: 5 seconds
  
  // Supported intervals: 1-20s with 2s intervals
  const SUPPORTED_INTERVALS = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19];

  // Load window time from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('eatenDeltaWindowSeconds');
    if (saved) {
      const seconds = parseInt(saved, 10);
      if (SUPPORTED_INTERVALS.includes(seconds)) {
        setWindowSeconds(seconds);
        // Update backend with saved value
        updateEatenDeltaWindow(seconds).catch(err => {
          console.warn('Failed to sync eaten delta window to backend:', err);
        });
      }
    }
  }, []);

  const updateWindowSeconds = useCallback(async (seconds) => {
    if (SUPPORTED_INTERVALS.includes(seconds)) {
      setWindowSeconds(seconds);
      localStorage.setItem('eatenDeltaWindowSeconds', seconds.toString());
      
      // Update backend
      try {
        await updateEatenDeltaWindow(seconds);
      } catch (error) {
        console.error('Failed to update eaten delta window on backend:', error);
        // Still keep the local state even if backend update fails
      }
    }
  }, []);

  return (
    <EatenDeltaWindowContext.Provider
      value={{
        windowSeconds,
        updateWindowSeconds,
      }}
    >
      {children}
    </EatenDeltaWindowContext.Provider>
  );
}

export function useEatenDeltaWindow() {
  const context = useContext(EatenDeltaWindowContext);
  if (!context) {
    throw new Error('useEatenDeltaWindow must be used within EatenDeltaWindowProvider');
  }
  return context;
}

