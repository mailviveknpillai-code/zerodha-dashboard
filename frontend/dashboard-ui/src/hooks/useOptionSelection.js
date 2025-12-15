import { useCallback } from 'react';

/**
 * Custom hook to select options based on strike price and type.
 * Handles option selection logic with exact match, above, below, and closest strategies.
 */
export function useOptionSelection() {
  /**
   * Select an option based on strike value, type, and direction.
   * @param {Array} options - Array of option contracts
   * @param {number} strikeValue - Target strike price
   * @param {string} type - Option type ('CE' or 'PE')
   * @param {string} direction - Selection direction ('closest', 'above', 'below')
   * @returns {Object|null} Selected option contract or null
   */
  const selectOption = useCallback((options, strikeValue, type, direction = 'closest') => {
    if (!options.length || strikeValue == null) return null;
    
    const filtered = options
      .filter(opt => (opt.instrumentType || '').toUpperCase() === type && opt.strikePrice != null)
      .sort((a, b) => Number(a.strikePrice) - Number(b.strikePrice));

    if (!filtered.length) return null;

    const target = Number(strikeValue);
    const exact = filtered.find(opt => Number(opt.strikePrice) === target);
    if (exact) return exact;

    if (direction === 'below') {
      const below = filtered.filter(opt => Number(opt.strikePrice) < target);
      return below.length ? below[below.length - 1] : filtered[0];
    }

    if (direction === 'above') {
      const above = filtered.filter(opt => Number(opt.strikePrice) > target);
      return above.length ? above[0] : filtered[filtered.length - 1];
    }

    // 'closest' direction
    return filtered.reduce((closest, current) => {
      if (!closest) return current;
      const currentDiff = Math.abs(Number(current.strikePrice) - target);
      const closestDiff = Math.abs(Number(closest.strikePrice) - target);
      if (currentDiff < closestDiff) return current;
      if (currentDiff === closestDiff) {
        const currentVol = Number(current.volume) || 0;
        const closestVol = Number(closest.volume) || 0;
        return currentVol >= closestVol ? current : closest;
      }
      return closest;
    }, null);
  }, []);

  return { selectOption };
}

