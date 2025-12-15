import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { updateLtpMovementWindow } from '../api/client';

const LtpMovementWindowContext = createContext(null);

/**
 * Context for managing LTP Movement window time configuration.
 * Allows users to select window duration: 1-15s with 3s intervals (1, 4, 7, 10, 13), 
 * then 15-60s with 5-10s intervals (15, 20, 25, 30, 35, 40, 45, 50, 55, 60).
 */
export function LtpMovementWindowProvider({ children }) {
  const [windowSeconds, setWindowSeconds] = useState(5); // Default: 5 seconds
  
  // Supported intervals: 1-15s with 3s intervals, then 15-60s with 5-10s intervals
  const SUPPORTED_INTERVALS = [1, 4, 7, 10, 13, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60];

  // Load window time from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('ltpMovementWindowSeconds');
    if (saved) {
      const seconds = parseInt(saved, 10);
      if (SUPPORTED_INTERVALS.includes(seconds)) {
        setWindowSeconds(seconds);
        // Update backend with saved value
        updateLtpMovementWindow(seconds).catch(err => {
          console.warn('Failed to sync LTP movement window to backend:', err);
        });
      }
    }
  }, []);

  const updateWindowSeconds = useCallback(async (seconds) => {
    if (SUPPORTED_INTERVALS.includes(seconds)) {
      setWindowSeconds(seconds);
      localStorage.setItem('ltpMovementWindowSeconds', seconds.toString());
      
      // Update backend
      try {
        await updateLtpMovementWindow(seconds);
      } catch (error) {
        console.error('Failed to update LTP movement window on backend:', error);
        // Still keep the local state even if backend update fails
      }
    }
  }, []);

  return (
    <LtpMovementWindowContext.Provider
      value={{
        windowSeconds,
        updateWindowSeconds,
      }}
    >
      {children}
    </LtpMovementWindowContext.Provider>
  );
}

export function useLtpMovementWindow() {
  const context = useContext(LtpMovementWindowContext);
  if (!context) {
    throw new Error('useLtpMovementWindow must be used within LtpMovementWindowProvider');
  }
  return context;
}

