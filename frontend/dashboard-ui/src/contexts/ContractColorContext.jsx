import React, { createContext, useCallback, useContext, useMemo, useRef, useState, useEffect } from 'react';

const ContractColorContext = createContext(null);

const DEFAULT_CACHE_SIZE = 120;
const MIN_CACHE_SIZE = 50;
const MAX_CACHE_SIZE = 240;

const sanitizeNumber = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.replace(/[^0-9+\-.\deE]/g, '');
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const FIELD_CONFIG = {
  ltp: { thresholds: [0.2, 0.8, 1.6], minimumDenominator: 1 },
  change: { thresholds: [0.2, 0.8, 1.6], minimumDenominator: 1 },
  changePercent: { thresholds: [0.4, 1.2, 2.5], minimumDenominator: 0.25 },
  oi: { thresholds: [1.5, 4, 9], minimumDenominator: 500 },
  vol: { thresholds: [5, 15, 40], minimumDenominator: 1000 }, // Adjusted for volume change magnitudes
  bid: { thresholds: [0.25, 0.9, 1.8], minimumDenominator: 1 },
  ask: { thresholds: [0.25, 0.9, 1.8], minimumDenominator: 1 },
  bidQty: { thresholds: [12, 35, 80], minimumDenominator: 50 },
  askQty: { thresholds: [12, 35, 80], minimumDenominator: 50 },
  deltaBA: { thresholds: [12, 35, 80], minimumDenominator: 50 },
};

const DEFAULT_CONFIG = { thresholds: [0.3, 1, 2.5], minimumDenominator: 1 };

const computePercentChange = (previous, current, config) => {
  if (previous === null || previous === undefined) return null;
  if (current === null || current === undefined) return null;

  const denominatorBase = config?.minimumDenominator ?? 1;
  const denominator = Math.max(Math.abs(previous), denominatorBase);
  if (denominator === 0) {
    return 0;
  }

  return ((current - previous) / denominator) * 100;
};

const evaluateIntensity = (percentChange, thresholds) => {
  if (percentChange === null || percentChange === undefined || percentChange === 0) {
    return null;
  }

  const absValue = Math.abs(percentChange);
  // Use 5 intensity levels to better utilize the 10-color palette
  // Map to: very-soft, soft, medium, strong, very-strong
  if (absValue >= thresholds[2] * 1.5) return 'very-strong';
  if (absValue >= thresholds[2]) return 'strong';
  if (absValue >= thresholds[1]) return 'medium';
  if (absValue >= thresholds[0]) return 'soft';
  // Very small movements
  return 'very-soft';
};

const toBackgroundClass = (direction, intensity) => {
  if (!direction || !intensity) return '';
  return `cell-bg-${direction}-${intensity}`;
};

const toHaloClass = (direction) => {
  if (!direction) return '';
  return direction === 'up' ? 'cell-halo-max' : 'cell-halo-min';
};

export function ContractColorProvider({ children, maxSize = DEFAULT_CACHE_SIZE }) {
  const effectiveLimit = useMemo(() => {
    const requested = Number.isFinite(maxSize) ? maxSize : DEFAULT_CACHE_SIZE;
    return Math.max(MIN_CACHE_SIZE, Math.min(requested, MAX_CACHE_SIZE));
  }, [maxSize]);
  const cacheRef = useRef(new Map());
  const orderRef = useRef([]);
  
  // Separate cache for OI values and delta OI (independent of color coding)
  const oiCacheRef = useRef(new Map()); // contractId -> { oi: number, deltaOi: number }
  const oiOrderRef = useRef([]);

  const touchKey = useCallback((contractId) => {
    const currentOrder = orderRef.current;
    const existingIndex = currentOrder.indexOf(contractId);
    if (existingIndex !== -1) {
      currentOrder.splice(existingIndex, 1);
    }
    currentOrder.push(contractId);
  }, []);

  const evictIfNeeded = useCallback(() => {
    const cache = cacheRef.current;
    const currentOrder = orderRef.current;
    while (cache.size > effectiveLimit && currentOrder.length) {
      const oldestKey = currentOrder.shift();
      if (oldestKey !== undefined) {
        cache.delete(oldestKey);
      }
    }
  }, [effectiveLimit]);

  const evaluateCell = useCallback((contractId, fieldKey, rawValue, options = {}) => {
    if (!contractId || !fieldKey) {
      return { backgroundClass: '', haloClass: '' };
    }

    const currentValue = sanitizeNumber(rawValue);
    if (currentValue === null) {
      return { backgroundClass: '', haloClass: '' };
    }

    const cache = cacheRef.current;
    let state = cache.get(contractId);
    if (!state) {
      state = { fields: {} };
      cache.set(contractId, state);
    }

    const fieldState = state.fields[fieldKey] || {};
    const config = FIELD_CONFIG[fieldKey] || DEFAULT_CONFIG;
    const previousValue = fieldState.value ?? null;
    const previousBackground = fieldState.backgroundClass || '';
    const diffPercent = previousValue !== null ? computePercentChange(previousValue, currentValue, config) : null;

    let backgroundClass = previousBackground;
    if (diffPercent !== null && diffPercent !== undefined && diffPercent !== 0) {
      const direction = diffPercent > 0 ? 'up' : 'down';
      const thresholds = config.thresholds ?? DEFAULT_CONFIG.thresholds;
      const intensity = evaluateIntensity(diffPercent, thresholds);
      backgroundClass = toBackgroundClass(direction, intensity);
    }

    let haloClass = '';
    const { dayHigh, dayLow } = options;
    const highValue = sanitizeNumber(dayHigh);
    const lowValue = sanitizeNumber(dayLow);
    if (highValue !== null && currentValue >= highValue) {
      haloClass = toHaloClass('up');
    } else if (lowValue !== null && currentValue <= lowValue) {
      haloClass = toHaloClass('down');
    }

    state.fields[fieldKey] = {
      value: currentValue,
      backgroundClass,
    };

    touchKey(contractId);
    evictIfNeeded();

    return { backgroundClass, haloClass };
  }, [touchKey, evictIfNeeded]);

  const getPreviousValue = useCallback((contractId, fieldKey) => {
    if (!contractId || !fieldKey) return null;
    const cache = cacheRef.current;
    const state = cache.get(contractId);
    if (!state || !state.fields[fieldKey]) return null;
    return state.fields[fieldKey].value ?? null;
  }, []);

  const getDeltaValue = useCallback((contractId, fieldKey) => {
    if (!contractId || !fieldKey) return null;
    const cache = cacheRef.current;
    const state = cache.get(contractId);
    if (!state || !state.fields[fieldKey]) return null;
    return state.fields[fieldKey].deltaValue ?? null;
  }, []);

  // Separate OI cache management - only updates if OI value actually changes
  const updateOiCache = useCallback((contractId, newOi) => {
    if (!contractId || newOi === null || newOi === undefined) {
      return null; // Return null if no valid data
    }

    const oiCache = oiCacheRef.current;
    const oiOrder = oiOrderRef.current;
    
    // Sanitize the new OI value
    const sanitizedOi = sanitizeNumber(newOi);
    if (sanitizedOi === null) {
      return null;
    }

    let oiEntry = oiCache.get(contractId);
    
    if (!oiEntry) {
      // First time seeing this contract - initialize cache
      oiEntry = { oi: sanitizedOi, deltaOi: null };
      oiCache.set(contractId, oiEntry);
      oiOrder.push(contractId);
      
      // Evict if needed
      while (oiCache.size > effectiveLimit && oiOrder.length) {
        const oldestKey = oiOrder.shift();
        if (oldestKey !== undefined) {
          oiCache.delete(oldestKey);
        }
      }
      
      return null; // No delta on first appearance
    }

    // Check if OI value has changed
    const cachedOi = oiEntry.oi;
    if (cachedOi === sanitizedOi) {
      // OI unchanged - return cached delta OI
      return oiEntry.deltaOi;
    }

    // OI changed - calculate new delta and update cache
    const previousOi = cachedOi;
    const newDeltaOi = sanitizedOi - previousOi;
    
    // Update cache with new OI and new delta
    oiEntry.oi = sanitizedOi;
    oiEntry.deltaOi = newDeltaOi;
    
    // Update order (move to end)
    const existingIndex = oiOrder.indexOf(contractId);
    if (existingIndex !== -1) {
      oiOrder.splice(existingIndex, 1);
    }
    oiOrder.push(contractId);
    
    return newDeltaOi;
  }, [effectiveLimit]);

  const getCachedDeltaOi = useCallback((contractId) => {
    if (!contractId) return null;
    const oiEntry = oiCacheRef.current.get(contractId);
    return oiEntry?.deltaOi ?? null;
  }, []);

  const contextValue = useMemo(() => ({
    evaluateCell,
    getPreviousValue,
    getDeltaValue,
    updateOiCache,
    getCachedDeltaOi,
  }), [evaluateCell, getPreviousValue, getDeltaValue, updateOiCache, getCachedDeltaOi]);

  return (
    <ContractColorContext.Provider value={contextValue}>
      {children}
    </ContractColorContext.Provider>
  );
}

export function useContractColoring(metadata, value) {
  const context = useContext(ContractColorContext);
  const [styles, setStyles] = useState({ backgroundClass: '', haloClass: '' });

  useEffect(() => {
    if (!context || !metadata || !metadata.contractId || !metadata.fieldKey) {
      setStyles({ backgroundClass: '', haloClass: '' });
      return undefined;
    }

    const result = context.evaluateCell(metadata.contractId, metadata.fieldKey, value, {
      dayHigh: metadata.dayHigh,
      dayLow: metadata.dayLow,
    });

    setStyles(result);

    return undefined;
  }, [context, metadata?.contractId, metadata?.fieldKey, metadata?.dayHigh, metadata?.dayLow, value]);

  return styles;
}

export function useContractColoringContext() {
  return useContext(ContractColorContext);
}

