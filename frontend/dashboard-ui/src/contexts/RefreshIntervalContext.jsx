import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_REFRESH_INTERVAL_MS,
  MIN_REFRESH_INTERVAL_MS,
  MAX_REFRESH_INTERVAL_MS,
  REFRESH_INTERVAL_STEP_MS,
} from '../constants';

const STORAGE_KEY = 'dashboard:refreshIntervalMs';

const RefreshIntervalContext = createContext({
  intervalMs: DEFAULT_REFRESH_INTERVAL_MS,
  setIntervalMs: () => {},
  minIntervalMs: MIN_REFRESH_INTERVAL_MS,
  maxIntervalMs: MAX_REFRESH_INTERVAL_MS,
  stepMs: REFRESH_INTERVAL_STEP_MS,
});

export function RefreshIntervalProvider({ children }) {
  const [intervalMs, setIntervalMsState] = useState(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_REFRESH_INTERVAL_MS;
    }
    try {
      const storedValue = window.localStorage.getItem(STORAGE_KEY);
      if (!storedValue) return DEFAULT_REFRESH_INTERVAL_MS;
      const parsed = Number(storedValue);
      if (!Number.isFinite(parsed)) return DEFAULT_REFRESH_INTERVAL_MS;
      return clampInterval(parsed);
    } catch (error) {
      console.warn('Unable to read refresh interval preference from storage:', error);
      return DEFAULT_REFRESH_INTERVAL_MS;
    }
  });

  const setIntervalMs = useCallback((nextValue) => {
    const clamped = clampInterval(nextValue);
    setIntervalMsState(clamped);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, String(clamped));
      }
    } catch (error) {
      console.warn('Unable to persist refresh interval preference:', error);
    }
  }, []);

  useEffect(() => {
    // Ensure any external storage changes are clamped.
    setIntervalMs(intervalMs);
  }, []); // intentionally run once

  const value = useMemo(() => ({
    intervalMs,
    setIntervalMs,
    minIntervalMs: MIN_REFRESH_INTERVAL_MS,
    maxIntervalMs: MAX_REFRESH_INTERVAL_MS,
    stepMs: REFRESH_INTERVAL_STEP_MS,
  }), [intervalMs, setIntervalMs]);

  return (
    <RefreshIntervalContext.Provider value={value}>
      {children}
    </RefreshIntervalContext.Provider>
  );
}

export function useRefreshInterval() {
  return useContext(RefreshIntervalContext);
}

function clampInterval(value) {
  if (!Number.isFinite(value)) {
    return DEFAULT_REFRESH_INTERVAL_MS;
  }
  return Math.min(
    MAX_REFRESH_INTERVAL_MS,
    Math.max(MIN_REFRESH_INTERVAL_MS, Math.round(value / REFRESH_INTERVAL_STEP_MS) * REFRESH_INTERVAL_STEP_MS)
  );
}
