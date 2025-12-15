import { useState, useEffect, useRef } from 'react';

/**
 * Hook to track price movements relative to starting value
 * Returns CSS classes for color-coded halo effect based on price change
 * 
 * @param {number} currentValue - Current price/value
 * @param {boolean} isHeader - Whether this is a header row
 * @returns {string} - CSS class for the halo effect
 */
export function usePriceTracking(currentValue, isHeader) {
  const [haloClass, setHaloClass] = useState('');
  const startingValueRef = useRef(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    if (isHeader || currentValue === null || currentValue === undefined || currentValue === '-' || currentValue === '—') {
      setHaloClass('');
      return;
    }

    const numValue = Number(currentValue);
    if (isNaN(numValue)) {
      setHaloClass('');
      return;
    }

    // Initialize starting value on first valid data
    if (!isInitializedRef.current) {
      startingValueRef.current = numValue;
      isInitializedRef.current = true;
    }

    const startValue = startingValueRef.current;
    const change = numValue - startValue;
    const changePercent = (change / startValue) * 100;

    let newHaloClass = 'price-tracking-cell ';

    if (change < 0) {
      // Below starting value - RED halo
      if (changePercent <= -10) {
        newHaloClass += 'price-tracking-red-intense'; // Bright red for severe drops
      } else if (changePercent <= -5) {
        newHaloClass += 'price-tracking-red-dark'; // Dark red for significant drops
      } else if (changePercent <= -2) {
        newHaloClass += 'price-tracking-red-medium'; // Medium red for moderate drops
      } else {
        newHaloClass += 'price-tracking-red-light'; // Light red for small drops
      }
    } else if (change > 0) {
      // Above starting value - GREEN halo
      if (changePercent >= 10) {
        newHaloClass += 'price-tracking-green-intense'; // Bright green for strong upward movement
      } else if (changePercent >= 5) {
        newHaloClass += 'price-tracking-green-dark'; // Dark green for significant upward movement
      } else if (changePercent >= 2) {
        newHaloClass += 'priceoptimizing-green-medium'; // Medium green for moderate upward movement
      } else {
        newHaloClass += 'price-tracking-green-light'; // Light green for small gains
      }
    } else {
      // Equal to starting value
      newHaloClass += 'price-tracking-green-light'; // Light green for at starting value
    }

    setHaloClass(newHaloClass);
  }, [currentValue, isHeader]);

  // Reset starting value when needed (e.g., new trading session)
  const resetTracking = () => {
    if (startingValueRef.current !== null && !isHeader) {
      const currentNum = Number(currentValue);
      if (!isNaN(currentNum)) {
        startingValueRef.current = currentNum;
      }
    }
  };

  return { haloClass, resetTracking };
}

/**
 * Helper function to get price tracking class for a cell
 * Simpler version that doesn't use hooks (for use in class components or loops)
 * 
 * @param {number} currentValue - Current price
 * @param {number} startingValue - Starting/reference price
 * @param {boolean} isHeader - Whether this is a header
 * @returns {string} - CSS class
 */
export function getPriceTrackingClass(currentValue, startingValue, isHeader) {
  if (isHeader || currentValue === null || currentValue === undefined || currentValue === '-' || currentValue === '—') {
    return '';
  }

  const numValue = Number(currentValue);
  if (isNaN(numValue) || startingValue === null || startingValue === undefined) {
    return 'price-tracking-cell';
  }

  const change = numValue - startingValue;
  const changePercent = (change / startingValue) * 100;

  if (change < 0) {
    // Below starting value - RED halo
    if (changePercent <= -10) return 'price-tracking-cell price-tracking-red-intense';
    if (changePercent <= -5) return 'price-tracking-cell price-tracking-red-dark';
    if (changePercent <= -2) return 'price-tracking-cell price-tracking-red-medium';
    return 'price-tracking-cell price-tracking-red-light';
  } else if (change > 0) {
    // Above starting value - GREEN halo
    if (changePercent >= 10) return 'price-tracking-cell price-tracking-green-intense';
    if (changePercent >= 5) return 'price-tracking-cell price-tracking-green-dark';
    if (changePercent >= 2) return 'price-tracking-cell price-tracking-green-medium';
    return 'price-tracking-cell price-tracking-green-light';
  } else {
    // Equal to starting value - light green
    return 'price-tracking-cell price-tracking-green-light';
  }
}
























