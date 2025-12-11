import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_REFRESH_INTERVAL_MS,
  MIN_REFRESH_INTERVAL_MS,
  MAX_REFRESH_INTERVAL_MS,
  REFRESH_INTERVAL_STEP_MS,
  REFRESH_INTERVAL_OPTIONS,
} from '../constants';
import { updateApiPollingInterval, getApiPollingInterval } from '../api/client';
import logger from '../utils/logger';

const STORAGE_KEY = 'dashboard:apiPollingIntervalMs';

const ApiPollingIntervalContext = createContext({
  intervalMs: DEFAULT_REFRESH_INTERVAL_MS,
  setIntervalMs: () => {},
  minIntervalMs: MIN_REFRESH_INTERVAL_MS,
  maxIntervalMs: MAX_REFRESH_INTERVAL_MS,
  stepMs: REFRESH_INTERVAL_STEP_MS,
});

export function ApiPollingIntervalProvider({ children }) {
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
      console.warn('Unable to read API polling interval preference from storage:', error);
      return DEFAULT_REFRESH_INTERVAL_MS;
    }
  });

  const setIntervalMs = useCallback(async (nextValue) => {
    const clamped = clampInterval(nextValue);
    const oldValue = intervalMs;
    setIntervalMsState(clamped);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, String(clamped));
      }
      
      // Update backend API polling interval
      try {
        logger.info('[ApiPollingIntervalContext] Updating backend API polling interval', { 
          oldIntervalMs: oldValue, 
          newIntervalMs: clamped,
          oldIntervalSeconds: oldValue / 1000,
          newIntervalSeconds: clamped / 1000
        });
        await updateApiPollingInterval(clamped);
        logger.info('[ApiPollingIntervalContext] Successfully updated backend API polling interval', { 
          intervalMs: clamped,
          intervalSeconds: clamped / 1000
        });
      } catch (error) {
        logger.error('[ApiPollingIntervalContext] Failed to update backend API polling interval', { 
          error, 
          intervalMs: clamped,
          errorMessage: error.message
        });
        // Don't throw - frontend will still work with local interval
      }
    } catch (error) {
      console.warn('Unable to persist API polling interval preference:', error);
    }
  }, [intervalMs]);

  useEffect(() => {
    // Sync with backend on mount
    const syncWithBackend = async () => {
      try {
        const backendInterval = await getApiPollingInterval();
        if (backendInterval?.intervalMs) {
          const backendValue = backendInterval.intervalMs;
          const clamped = clampInterval(backendValue);
          if (clamped !== intervalMs) {
            logger.info('[ApiPollingIntervalContext] Syncing with backend interval', { 
              frontend: intervalMs, 
              backend: backendValue,
              clamped 
            });
            setIntervalMsState(clamped);
            if (typeof window !== 'undefined') {
              window.localStorage.setItem(STORAGE_KEY, String(clamped));
            }
          } else {
            // Backend matches frontend, but ensure backend is updated
            await updateApiPollingInterval(clamped);
          }
        } else {
          // No backend interval, update backend with current frontend value
          await updateApiPollingInterval(intervalMs);
        }
      } catch (error) {
        logger.warn('[ApiPollingIntervalContext] Failed to sync with backend', { error });
        // Continue with local value if backend sync fails
      }
    };
    
    syncWithBackend();
  }, []); // intentionally run once

  const value = useMemo(() => ({
    intervalMs,
    setIntervalMs,
    minIntervalMs: MIN_REFRESH_INTERVAL_MS,
    maxIntervalMs: MAX_REFRESH_INTERVAL_MS,
    stepMs: REFRESH_INTERVAL_STEP_MS,
    options: REFRESH_INTERVAL_OPTIONS,
  }), [intervalMs, setIntervalMs]);

  return (
    <ApiPollingIntervalContext.Provider value={value}>
      {children}
    </ApiPollingIntervalContext.Provider>
  );
}

export function useApiPollingInterval() {
  return useContext(ApiPollingIntervalContext);
}

function clampInterval(value) {
  if (!Number.isFinite(value)) {
    return DEFAULT_REFRESH_INTERVAL_MS;
  }
  // Clamp to valid range
  const clamped = Math.max(MIN_REFRESH_INTERVAL_MS, Math.min(MAX_REFRESH_INTERVAL_MS, value));
  // Snap to nearest predefined option
  const nearestOption = REFRESH_INTERVAL_OPTIONS.reduce((closest, option) => {
    const currentDiff = Math.abs(clamped - closest.value);
    const optionDiff = Math.abs(clamped - option.value);
    return optionDiff < currentDiff ? option : closest;
  });
  return nearestOption.value;
}

