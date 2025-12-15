import { useMemo } from 'react';

/**
 * Custom hook to determine the target expiry for options filtering.
 * Handles expiry selection logic based on futures contract and available expiries.
 */
export function useOptionsExpiry(derivativesData, activeFuturesContract) {
  return useMemo(() => {
    if (!derivativesData) {
      return {
        targetExpiry: null,
        calls: [],
        puts: [],
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all unique option expiries
    const allOptionExpiries = [...new Set([
      ...(derivativesData.callOptions || []).map(call => call.expiryDate),
      ...(derivativesData.putOptions || []).map(put => put.expiryDate)
    ])]
      .map(expiry => ({
        raw: expiry,
        date: expiry ? new Date(expiry) : null
      }))
      .filter(item => item.date && !isNaN(item.date.getTime()))
      .sort((a, b) => a.date - b.date);

    // Find nearest weekly expiry
    const nearestWeeklyExpiry = allOptionExpiries.find(item => {
      const date = new Date(item.date);
      date.setHours(0, 0, 0, 0);
      return date >= today;
    }) || allOptionExpiries[allOptionExpiries.length - 1] || null;

    // Find preferred expiry (same month as futures contract)
    let preferredExpiry = null;
    if (activeFuturesContract?.expiryDateObj) {
      const targetMonth = activeFuturesContract.expiryDateObj.getMonth();
      const targetYear = activeFuturesContract.expiryDateObj.getFullYear();

      const sameMonthExpiries = allOptionExpiries.filter(item => {
        if (!item.date || Number.isNaN(item.date.getTime())) return false;
        return item.date.getMonth() === targetMonth && item.date.getFullYear() === targetYear;
      });

      if (sameMonthExpiries.length) {
        preferredExpiry = sameMonthExpiries.find(item => item.date >= today) || sameMonthExpiries[sameMonthExpiries.length - 1];
      }
    }

    const targetExpiry = (preferredExpiry ?? nearestWeeklyExpiry)?.raw ?? null;

    // Filter options by target expiry
    const calls = targetExpiry
      ? (derivativesData.callOptions || []).filter(call => call.expiryDate === targetExpiry)
      : (derivativesData.callOptions || []);

    const puts = targetExpiry
      ? (derivativesData.putOptions || []).filter(put => put.expiryDate === targetExpiry)
      : (derivativesData.putOptions || []);

    return {
      targetExpiry,
      calls,
      puts,
    };
  }, [derivativesData, activeFuturesContract]);
}

