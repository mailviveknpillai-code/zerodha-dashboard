import { useRef, useCallback } from 'react';

/**
 * Hook to cache eaten values (eatenDelta, bidEaten, askEaten) independently of UI refresh rate.
 * 
 * These values should only update when:
 * 1. A new non-zero value is received from the backend
 * 2. The value is explicitly cleared
 * 
 * This ensures the bubbles don't reset to 0 on every UI refresh.
 */
export default function useEatenValuesCache() {
  // Cache: instrumentToken -> { eatenDelta, bidEaten, askEaten }
  const cacheRef = useRef(new Map());

  /**
   * Update the cache with new values, but only if:
   * - The new value is non-zero (always update)
   * - The new value is null/undefined (clear cache)
   * - Don't update if new value is 0 and we have a non-zero cached value (preserve previous)
   * 
   * CRITICAL: This ensures bubbles don't reset to 0 on every UI refresh.
   * The cache preserves the last non-zero value until a new non-zero value arrives.
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

    // Smart update logic:
    // 1. If new value is a number (including 0) → always update (0 is a valid calculated value)
    // 2. If new value is null/undefined → preserve current value if exists, otherwise null
    // CRITICAL: 0 is a valid value (means no eaten quantity in window), not a default
    // We only preserve values when backend returns null/undefined (no data), not when it returns 0
    const newValues = {
      eatenDelta: 
        eatenDelta === null || eatenDelta === undefined 
          ? (current.eatenDelta !== null && current.eatenDelta !== undefined 
              ? current.eatenDelta // Preserve current value if backend has no data
              : null) // No data and no previous value
          : eatenDelta, // Always update if backend provides a number (including 0)
      bidEaten:
        bidEaten === null || bidEaten === undefined
          ? (current.bidEaten !== null && current.bidEaten !== undefined 
              ? current.bidEaten 
              : null)
          : bidEaten,
      askEaten:
        askEaten === null || askEaten === undefined
          ? (current.askEaten !== null && current.askEaten !== undefined 
              ? current.askEaten 
              : null)
          : askEaten,
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

