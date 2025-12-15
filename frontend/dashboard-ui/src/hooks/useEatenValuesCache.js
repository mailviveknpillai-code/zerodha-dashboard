import { useRef, useCallback } from 'react';

/**
 * Hook to cache eaten values (eatenDelta, bidEaten, askEaten) independently of UI refresh rate.
 * 
 * CRITICAL: Backend always provides values (including 0) for all contracts.
 * The cache should always update when backend provides a number (including 0).
 * We only preserve values when backend returns null/undefined (no data available).
 * 
 * This ensures:
 * 1. Values update when window completes (backend sends new calculated values)
 * 2. Values don't reset to 0 on every UI refresh (cache preserves last known values)
 * 3. All contracts (futures, calls, puts) get consistent values
 */
export default function useEatenValuesCache() {
  // Cache: instrumentToken -> { eatenDelta, bidEaten, askEaten }
  const cacheRef = useRef(new Map());

  /**
   * Update the cache with new values from backend.
   * 
   * Update logic:
   * - If backend provides a number (including 0) → ALWAYS update (0 is a valid calculated value)
   * - If backend provides null/undefined → preserve current value if exists, otherwise null
   * 
   * CRITICAL: 0 is a valid value (means no eaten quantity in window), not a default.
   * We only preserve values when backend returns null/undefined (no data), not when it returns 0.
   * This ensures all contracts get consistent values and updates happen when windows complete.
   */
  const updateEatenValues = useCallback((instrumentToken, eatenDelta, bidEaten, askEaten) => {
    if (!instrumentToken) {
      // No token - return values as-is (no caching possible)
      return {
        eatenDelta: eatenDelta ?? null,
        bidEaten: bidEaten ?? null,
        askEaten: askEaten ?? null,
      };
    }

    const current = cacheRef.current.get(instrumentToken) || {
      eatenDelta: null,
      bidEaten: null,
      askEaten: null,
    };

    // CRITICAL: Always update if backend provides a number (including 0)
    // Only preserve values when backend returns null/undefined (no data available)
    // This ensures:
    // 1. Values update when window completes (backend sends new calculated values)
    // 2. All contracts get consistent values
    // 3. 0 is treated as a valid calculated value, not a default
    const newValues = {
      eatenDelta: 
        (eatenDelta === null || eatenDelta === undefined)
          ? (current.eatenDelta !== null && current.eatenDelta !== undefined 
              ? current.eatenDelta // Preserve current value if backend has no data
              : null) // No data and no previous value
          : Number(eatenDelta), // Always update if backend provides a number (including 0)
      bidEaten:
        (bidEaten === null || bidEaten === undefined)
          ? (current.bidEaten !== null && current.bidEaten !== undefined 
              ? current.bidEaten 
              : null)
          : Number(bidEaten),
      askEaten:
        (askEaten === null || askEaten === undefined)
          ? (current.askEaten !== null && current.askEaten !== undefined 
              ? current.askEaten 
              : null)
          : Number(askEaten),
    };

    // Always update cache (even if values are the same, to ensure consistency)
    cacheRef.current.set(instrumentToken, newValues);

    return newValues;
  }, []);

  /**
   * Get cached values for an instrument token
   */
  const getEatenValues = useCallback((instrumentToken) => {
    if (!instrumentToken) {
      return { eatenDelta: null, bidEaten: null, askEaten: null };
    }
    return cacheRef.current.get(instrumentToken) || {
      eatenDelta: null,
      bidEaten: null,
      askEaten: null,
    };
  }, []);

  /**
   * Clear all cached values (useful for reset)
   */
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  return {
    updateEatenValues,
    getEatenValues,
    clearCache,
  };
}

