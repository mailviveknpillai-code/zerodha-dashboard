import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { setDebugMode as setLoggerDebugMode } from '../utils/logger';

const STORAGE_KEY = 'dashboard:debugMode';

const DebugModeContext = createContext({
  debugMode: true, // Default: enabled (will change to false before building)
  setDebugMode: () => {},
});

export function DebugModeProvider({ children }) {
  const [debugMode, setDebugModeState] = useState(() => {
    if (typeof window === 'undefined') {
      return true; // Default: enabled
    }
    try {
      const storedValue = window.localStorage.getItem(STORAGE_KEY);
      if (storedValue === null) {
        return true; // Default: enabled
      }
      return storedValue === 'true';
    } catch (error) {
      console.warn('Unable to read debug mode preference from storage:', error);
      return true; // Default: enabled
    }
  });

  const setDebugMode = useCallback((enabled) => {
    setDebugModeState(enabled);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, String(enabled));
      }
    } catch (error) {
      console.warn('Unable to persist debug mode preference:', error);
    }
  }, []);

  // Update global logger when debug mode changes
  useEffect(() => {
    setLoggerDebugMode(debugMode);
  }, [debugMode]);

  const value = {
    debugMode,
    setDebugMode,
  };

  return (
    <DebugModeContext.Provider value={value}>
      {children}
    </DebugModeContext.Provider>
  );
}

export function useDebugMode() {
  return useContext(DebugModeContext);
}

