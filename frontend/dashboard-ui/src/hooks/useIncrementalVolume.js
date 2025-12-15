import { useRef, useMemo } from 'react';
import logger from '../utils/logger';

/**
 * Hook to track incremental volume changes over rolling time windows
 * 
 * @param {string} contractKey - Unique identifier for the contract
 * @param {number|null} currentVolume - Current volume value from API
 * @param {number} windowMs - Time window in milliseconds (default: 5 minutes)
 * @returns {Object} { incrementalVol: number, volumeChange: number, displayValue: string }
 */
export function useIncrementalVolume(contractKey, currentVolume, windowMs = 5 * 60 * 1000) {
  const historyRef = useRef(new Map()); // contractKey -> { previousVol: number, changes: Array<{timestamp, change}> }
  
  return useMemo(() => {
    if (!contractKey || currentVolume === null || currentVolume === undefined) {
      return {
        incrementalVol: 0,
        volumeChange: 0,
        displayValue: '-',
        rawValue: null
      };
    }

    const now = Date.now();
    const contractHistory = historyRef.current.get(contractKey) || {
      previousVol: null,
      changes: []
    };

    // Calculate incremental change
    let volumeChange = 0;
    if (contractHistory.previousVol !== null && contractHistory.previousVol !== undefined) {
      const change = currentVolume - contractHistory.previousVol;
      // Handle volume changes: positive changes are added, negative changes reset the counter
      // Volume can decrease (e.g., on contract expiry, data correction, or market reset)
      if (change > 0) {
        volumeChange = change;
        // Add this change to history
        contractHistory.changes.push({
          timestamp: now,
          change: volumeChange
        });
      } else if (change < 0) {
        // Volume decreased - reset history to prevent incorrect cumulative values
        // This handles cases like contract expiry or data corrections
        contractHistory.changes = [];
        contractHistory.cumulativeChange = 0;
        log.warn(`Volume decreased for ${contractKey}: ${contractHistory.previousVol} -> ${currentVolume}. Resetting history.`);
      }
      // If change === 0, no action needed
    }

    // Update previous volume
    contractHistory.previousVol = currentVolume;

    // Remove changes outside the time window
    const cutoffTime = now - windowMs;
    contractHistory.changes = contractHistory.changes.filter(
      entry => entry.timestamp >= cutoffTime
    );

    // Calculate cumulative sum of changes within the window
    const incrementalVol = contractHistory.changes.reduce(
      (sum, entry) => sum + entry.change,
      0
    );

    // Store updated history
    historyRef.current.set(contractKey, contractHistory);

    return {
      incrementalVol,
      volumeChange, // Change in this refresh cycle
      displayValue: incrementalVol > 0 ? incrementalVol.toLocaleString() : '0',
      rawValue: incrementalVol
    };
  }, [contractKey, currentVolume, windowMs]);
}

/**
 * Hook to track incremental volume for multiple contracts
 * Uses fixed intervals that reset completely after the interval completes
 * 
 * @param {number} windowMs - Time window in milliseconds (e.g., 5 minutes = 300000ms)
 */
export function useIncrementalVolumeMap(windowMs = 5 * 60 * 1000) {
  const historyRef = useRef(new Map());
  const intervalStartRef = useRef(null); // Track when current interval started
  const lastWindowMsRef = useRef(windowMs); // Track last window to detect changes
  
  const updateVolume = (contractKey, currentVolume) => {
    // If window changed, reset everything
    if (lastWindowMsRef.current !== windowMs) {
      intervalStartRef.current = null;
      historyRef.current.clear();
      lastWindowMsRef.current = windowMs;
    }
    if (!contractKey || currentVolume === null || currentVolume === undefined) {
      return {
        incrementalVol: 0,
        volumeChange: 0,
        displayValue: '-',
        rawValue: null
      };
    }

    const now = Date.now();
    
    // Initialize or check if we need to start a new interval
    if (intervalStartRef.current === null) {
      intervalStartRef.current = now;
    }
    
    // Check if we've crossed into a new interval
    const timeSinceStart = now - intervalStartRef.current;
    if (timeSinceStart >= windowMs) {
      // Reset everything - new interval started
      intervalStartRef.current = now;
      historyRef.current.clear(); // Discard all previous data
    }

    const contractHistory = historyRef.current.get(contractKey) || {
      previousVol: null,
      cumulativeChange: 0 // Track cumulative change in current interval
    };

    // Calculate incremental change
    let volumeChange = 0;
    if (contractHistory.previousVol !== null && contractHistory.previousVol !== undefined) {
      const change = currentVolume - contractHistory.previousVol;
      // Handle volume changes: positive changes are added, negative changes reset the counter
      // Volume can decrease (e.g., on contract expiry, data correction, or market reset)
      if (change > 0) {
        volumeChange = change;
        // Add to cumulative change for this interval
        contractHistory.cumulativeChange += volumeChange;
      } else if (change < 0) {
        // Volume decreased - reset cumulative change to prevent incorrect values
        // This handles cases like contract expiry or data corrections
        contractHistory.cumulativeChange = 0;
        // Note: We don't log here to avoid console spam, but the reset ensures correctness
      }
      // If change === 0, no action needed
    }

    // Update previous volume
    contractHistory.previousVol = currentVolume;

    // Store updated history
    historyRef.current.set(contractKey, contractHistory);

    const incrementalVol = contractHistory.cumulativeChange;

    return {
      incrementalVol,
      volumeChange, // Change in this refresh cycle
      displayValue: incrementalVol > 0 ? incrementalVol.toLocaleString() : '0',
      rawValue: incrementalVol
    };
  };

  return { updateVolume };
}

