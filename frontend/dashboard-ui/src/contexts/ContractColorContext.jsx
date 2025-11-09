import React, { createContext, useCallback, useContext, useMemo, useRef, useState, useEffect } from 'react';

const ContractColorContext = createContext(null);

const MAX_CACHE_DEFAULT = 10;
const MIN_CACHE_DEFAULT = 7;

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
  ltp: { thresholds: [0.05, 0.25, 0.75], minimumDenominator: 1 },
  change: { thresholds: [0.05, 0.25, 0.75], minimumDenominator: 1 },
  changePercent: { thresholds: [0.05, 0.25, 0.75], minimumDenominator: 0.5 },
  oi: { thresholds: [0.02, 0.1, 0.3], minimumDenominator: 100 },
  vol: { thresholds: [0.02, 0.1, 0.3], minimumDenominator: 100 },
  bid: { thresholds: [0.05, 0.25, 0.75], minimumDenominator: 1 },
  ask: { thresholds: [0.05, 0.25, 0.75], minimumDenominator: 1 },
  bidQty: { thresholds: [0.5, 1.5, 3], minimumDenominator: 10 },
  askQty: { thresholds: [0.5, 1.5, 3], minimumDenominator: 10 },
};

const DEFAULT_CONFIG = { thresholds: [0.05, 0.25, 0.75], minimumDenominator: 1 };

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
  if (absValue >= thresholds[2]) return 'strong';
  if (absValue >= thresholds[1]) return 'medium';
  // Any non-zero movement should still tint softly
  return 'soft';
};

const toBackgroundClass = (direction, intensity) => {
  if (!direction || !intensity) return '';
  return `cell-bg-${direction}-${intensity}`;
};

const toHaloClass = (direction) => {
  if (!direction) return '';
  return direction === 'up' ? 'cell-halo-max' : 'cell-halo-min';
};

export function ContractColorProvider({ children, maxSize = MAX_CACHE_DEFAULT }) {
  const effectiveLimit = Math.max(MIN_CACHE_DEFAULT, Math.min(maxSize, MAX_CACHE_DEFAULT));
  const cacheRef = useRef(new Map());
  const orderRef = useRef([]);

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
    while (cache.size > effectiveLimit) {
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

  const contextValue = useMemo(() => ({
    evaluateCell,
  }), [evaluateCell]);

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

