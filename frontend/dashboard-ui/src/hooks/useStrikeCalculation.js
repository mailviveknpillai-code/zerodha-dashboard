import { useMemo } from 'react';

/**
 * Custom hook to calculate strike prices and related values.
 * Handles strike unit, step, current strike, and desired strikes calculation.
 */
export function useStrikeCalculation(calls, puts, referencePrice) {
  return useMemo(() => {
    // Get all unique strikes, filtering out null/undefined values
    const allStrikes = [...new Set([
      ...calls.map(c => c.strikePrice).filter(s => s != null),
      ...puts.map(p => p.strikePrice).filter(s => s != null)
    ])].map(s => Number(s)).filter(s => !isNaN(s)).sort((a, b) => a - b);

    // Handle edge case: no valid strikes
    if (allStrikes.length === 0) {
      return {
        allStrikes: [],
        strikeStep: 50, // Default fallback
        currentStrike: 0,
        currentStrikeIndex: -1,
        desiredPlusStrike: referencePrice ? referencePrice + 50 : 50,
        desiredMinusStrike: referencePrice ? referencePrice - 50 : -50,
      };
    }

    // Calculate strike unit dynamically from actual strike differences
    // Try to find the most common difference between consecutive strikes
    const differences = [];
    for (let i = 1; i < Math.min(allStrikes.length, 10); i++) {
      const diff = Math.abs(allStrikes[i] - allStrikes[i - 1]);
      if (diff > 0) {
        differences.push(diff);
      }
    }
    
    // Calculate strike unit: use most common difference, or median, or first difference, or default 50
    let strikeUnit = 50; // Default fallback
    if (differences.length > 0) {
      // Use the most common difference (mode)
      const frequency = {};
      differences.forEach(d => {
        frequency[d] = (frequency[d] || 0) + 1;
      });
      const sortedByFreq = Object.entries(frequency).sort((a, b) => b[1] - a[1]);
      strikeUnit = Number(sortedByFreq[0][0]) || differences[0] || 50;
    } else if (allStrikes.length > 1) {
      // Fallback to first difference if no differences calculated
      strikeUnit = Math.abs(allStrikes[1] - allStrikes[0]) || 50;
    }

    // Calculate strike step (same as strike unit for consistency)
    const strikeStep = strikeUnit;

    // Find current strike (closest to reference price)
    let currentStrike = allStrikes[0] || 0;
    if (allStrikes.length > 0 && referencePrice) {
      currentStrike = allStrikes.reduce((closest, strike) => {
        return Math.abs(strike - referencePrice) < Math.abs(closest - referencePrice) ? strike : closest;
      });
    }

    const currentStrikeIndex = allStrikes.findIndex(strike => Number(strike) === Number(currentStrike));
    const desiredPlusStrike = currentStrike + strikeUnit;
    const desiredMinusStrike = currentStrike - strikeUnit;

    return {
      allStrikes,
      strikeStep,
      currentStrike,
      currentStrikeIndex,
      desiredPlusStrike,
      desiredMinusStrike,
    };
  }, [calls, puts, referencePrice]);
}

