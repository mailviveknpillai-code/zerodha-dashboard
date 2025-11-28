import { useRef, useEffect, useState, useCallback } from 'react';

/**
 * Direction Flow Logic Hook
 * 
 * Tracks price direction by analyzing Higher Highs (HH) or Higher Lows (HL) for UP trends
 * and Lower Highs (LH) or Lower Lows (LL) for DOWN trends.
 * 
 * Core Principle: Do NOT track every second. Track only "turning points" (Highs and Lows).
 * 
 * Direction Rules:
 * - UP Direction = Higher High (HH) OR Higher Low (HL)
 * - DOWN Direction = Lower High (LH) OR Lower Low (LL)
 * 
 * This filters out noise from second-by-second updates by only tracking turning points.
 * Direction is shown when either pattern is detected (HH or HL for UP, LH or LL for DOWN).
 * 
 * @param {number|null} currentValue - Current price/value (updates every second)
 * @param {number} minChangePercent - Minimum percentage change to consider a turning point (default: 0.1%)
 * @returns {Object} - { direction: 'UP'|'DOWN'|'NEUTRAL', confidence: number, highs: Array, lows: Array }
 */
export function useDirectionFlow(currentValue, minChangePercent = 0.1) {
  const [direction, setDirection] = useState('NEUTRAL');
  const [confidence, setConfidence] = useState(0);
  const [highs, setHighs] = useState([]);
  const [lows, setLows] = useState([]);
  
  // Track price values between refreshes
  const previousValueRef = useRef(null);
  
  // Track movement direction between refreshes (UP, DOWN, FLAT)
  // Cache of last 5 movements to analyze patterns
  const movementCacheRef = useRef([]);
  
  // Track direction confirmation
  const directionHistoryRef = useRef([]);
  
  useEffect(() => {
    // Skip if no valid value
    if (currentValue === null || currentValue === undefined) {
      // Reset if value becomes invalid
      if (previousValueRef.current !== null) {
        previousValueRef.current = null;
        movementCacheRef.current = [];
        setDirection('NEUTRAL');
        setConfidence(0);
      }
      return;
    }
    
    const numValue = Number(currentValue);
    
    // Validate the number
    if (isNaN(numValue) || !isFinite(numValue) || numValue <= 0) {
      return;
    }
    
    // Initialize on first value
    if (previousValueRef.current === null) {
      previousValueRef.current = numValue;
      // Set initial state
      setDirection('NEUTRAL');
      setConfidence(0);
      return;
    }
    
    // Only process if value actually changed (avoid processing same value multiple times)
    if (numValue === previousValueRef.current) {
      return;
    }
    
    // Calculate movement direction between this refresh and previous refresh
    const change = numValue - previousValueRef.current;
    const changePercent = previousValueRef.current !== 0 
      ? Math.abs((change / previousValueRef.current) * 100)
      : 0;
    
    // Determine movement direction (UP, DOWN, or FLAT)
    let movement = 'FLAT';
    if (changePercent >= minChangePercent) {
      movement = change > 0 ? 'UP' : 'DOWN';
    }
    
    // Add movement to cache (keep last 5 movements)
    // Only add non-FLAT movements to avoid cluttering cache
    if (movement !== 'FLAT') {
      movementCacheRef.current.push(movement);
      if (movementCacheRef.current.length > 5) {
        movementCacheRef.current.shift();
      }
    }
    
    // Update previous value for next refresh
    previousValueRef.current = numValue;
    
    // Analyze movement cache to determine HH/HL/LH/LL patterns
    const movements = movementCacheRef.current;
    
    // Show immediate direction if we only have 1 movement
    if (movements.length === 1) {
      const lastMovement = movements[0];
      if (lastMovement === 'UP') {
        setDirection('UP');
        setConfidence(Math.min(100, Math.max(1, changePercent * 2))); // Ensure at least 1% if movement detected
      } else if (lastMovement === 'DOWN') {
        setDirection('DOWN');
        setConfidence(Math.min(100, Math.max(1, changePercent * 2))); // Ensure at least 1% if movement detected
      } else {
        setDirection('NEUTRAL');
        setConfidence(0);
      }
      return;
    }
    
    // Analyze patterns when we have 2+ movements
    if (movements.length >= 2) {
      const lastTwo = movements.slice(-2);
      
      // Detect patterns from movement sequence
      let hasHH = false; // Higher High: UP, UP (two consecutive ups)
      let hasHL = false; // Higher Low: UP, DOWN (up then down - low is higher)
      let hasLH = false; // Lower High: DOWN, UP (down then up - high is lower)
      let hasLL = false; // Lower Low: DOWN, DOWN (two consecutive downs)
      
      // Check last two movements
      if (lastTwo.length === 2) {
        if (lastTwo[0] === 'UP' && lastTwo[1] === 'UP') {
          hasHH = true; // Two ups = Higher High
        } else if (lastTwo[0] === 'UP' && lastTwo[1] === 'DOWN') {
          hasHL = true; // Up then down = Higher Low (the low after an up is higher)
        } else if (lastTwo[0] === 'DOWN' && lastTwo[1] === 'UP') {
          hasLH = true; // Down then up = Lower High (the high after a down is lower)
        } else if (lastTwo[0] === 'DOWN' && lastTwo[1] === 'DOWN') {
          hasLL = true; // Two downs = Lower Low
        }
      }
      
      // Also check if we have patterns in the full cache (more reliable)
      if (movements.length >= 3) {
        // Check for HH: look for UP, UP pattern
        for (let i = 0; i < movements.length - 1; i++) {
          if (movements[i] === 'UP' && movements[i + 1] === 'UP') {
            hasHH = true;
            break;
          }
        }
        
        // Check for HL: look for UP, DOWN pattern
        for (let i = 0; i < movements.length - 1; i++) {
          if (movements[i] === 'UP' && movements[i + 1] === 'DOWN') {
            hasHL = true;
            break;
          }
        }
        
        // Check for LH: look for DOWN, UP pattern
        for (let i = 0; i < movements.length - 1; i++) {
          if (movements[i] === 'DOWN' && movements[i + 1] === 'UP') {
            hasLH = true;
            break;
          }
        }
        
        // Check for LL: look for DOWN, DOWN pattern
        for (let i = 0; i < movements.length - 1; i++) {
          if (movements[i] === 'DOWN' && movements[i + 1] === 'DOWN') {
            hasLL = true;
            break;
          }
        }
      }
      
      // Determine direction: UP = HH OR HL, DOWN = LH OR LL
      let newDirection = 'NEUTRAL';
      let newConfidence = 0;
      
      if (hasHH || hasHL) {
        // UP Direction: Higher High OR Higher Low
        newDirection = 'UP';
        
        // Calculate confidence based on pattern strength
        // Count how many UP movements we have
        const upCount = movements.filter(m => m === 'UP').length;
        const totalMovements = movements.length;
        const upRatio = upCount / totalMovements;
        
        // If both HH and HL exist, confidence is higher
        if (hasHH && hasHL) {
          newConfidence = Math.min(100, upRatio * 100 * 1.2); // 20% boost for both patterns
        } else {
          newConfidence = Math.min(100, upRatio * 100);
        }
      } else if (hasLH || hasLL) {
        // DOWN Direction: Lower High OR Lower Low
        newDirection = 'DOWN';
        
        // Calculate confidence based on pattern weakness
        // Count how many DOWN movements we have
        const downCount = movements.filter(m => m === 'DOWN').length;
        const totalMovements = movements.length;
        const downRatio = downCount / totalMovements;
        
        // If both LH and LL exist, confidence is higher
        if (hasLH && hasLL) {
          newConfidence = Math.min(100, downRatio * 100 * 1.2); // 20% boost for both patterns
        } else {
          newConfidence = Math.min(100, downRatio * 100);
        }
      } else {
        // No clear pattern - neutral
        newDirection = 'NEUTRAL';
        newConfidence = 0;
      }
      
      // Update direction immediately when pattern is detected
      // Only smooth if we're switching between UP and DOWN (not from/to NEUTRAL)
      if (direction === 'NEUTRAL' || newDirection === 'NEUTRAL') {
        // Immediate update when coming from or going to neutral
        setDirection(newDirection);
        setConfidence(newConfidence);
      } else if (direction !== newDirection) {
        // Switching between UP and DOWN - use smoothing
        directionHistoryRef.current.push(newDirection);
        if (directionHistoryRef.current.length > 2) {
          directionHistoryRef.current.shift();
        }
        
        // If last 2 are the same, update immediately
        if (directionHistoryRef.current.length >= 2) {
          const lastTwo = directionHistoryRef.current.slice(-2);
          if (lastTwo[0] === lastTwo[1]) {
            setDirection(newDirection);
            setConfidence(newConfidence);
          }
        } else {
          // Not enough history yet, use current
          setDirection(newDirection);
          setConfidence(newConfidence);
        }
      } else {
        // Same direction - update immediately
        setDirection(newDirection);
        setConfidence(newConfidence);
      }
    } else {
      // Not enough movements yet - cannot determine direction
      setDirection('NEUTRAL');
      setConfidence(0);
    }
  }, [currentValue, minChangePercent]);
  
  // Reset function to clear history
  const reset = useCallback(() => {
    previousValueRef.current = null;
    movementCacheRef.current = [];
    directionHistoryRef.current = [];
    setDirection('NEUTRAL');
    setConfidence(0);
    setHighs([]);
    setLows([]);
  }, []);
  
  return {
    direction,
    confidence,
    highs: highs.slice(-5), // Return last 5 highs
    lows: lows.slice(-5),   // Return last 5 lows
    reset
  };
}

/**
 * Enhanced version that works with arrays of values
 * Useful for analyzing historical data or multiple contracts
 */
export function useDirectionFlowArray(values, minChangePercent = 0.1) {
  const [direction, setDirection] = useState('NEUTRAL');
  const [confidence, setConfidence] = useState(0);
  const [highs, setHighs] = useState([]);
  const [lows, setLows] = useState([]);
  
  useEffect(() => {
    if (!values || values.length < 3) {
      return;
    }
    
    // Filter valid numeric values
    const validValues = values
      .map(v => {
        const num = Number(v);
        return isNaN(num) ? null : num;
      })
      .filter(v => v !== null);
    
    if (validValues.length < 3) {
      return;
    }
    
    // Find turning points (local highs and lows)
    const detectedHighs = [];
    const detectedLows = [];
    
    for (let i = 1; i < validValues.length - 1; i++) {
      const prev = validValues[i - 1];
      const curr = validValues[i];
      const next = validValues[i + 1];
      
      // Local high: value is higher than both neighbors
      if (curr > prev && curr > next) {
        detectedHighs.push({ index: i, value: curr });
      }
      
      // Local low: value is lower than both neighbors
      if (curr < prev && curr < next) {
        detectedLows.push({ index: i, value: curr });
      }
    }
    
    // Analyze direction
    if (detectedHighs.length >= 2 && detectedLows.length >= 2) {
      const recentHighs = detectedHighs.slice(-2).map(h => h.value);
      const recentLows = detectedLows.slice(-2).map(l => l.value);
      
      const hasHH = recentHighs[1] > recentHighs[0];
      const hasHL = recentLows[1] > recentLows[0];
      const hasLH = recentHighs[1] < recentHighs[0];
      const hasLL = recentLows[1] < recentLows[0];
      
      let newDirection = 'NEUTRAL';
      let newConfidence = 0;
      
      if (hasHH && hasHL) {
        newDirection = 'UP';
        const highStrength = ((recentHighs[1] - recentHighs[0]) / recentHighs[0]) * 100;
        const lowStrength = ((recentLows[1] - recentLows[0]) / recentLows[0]) * 100;
        newConfidence = Math.min(100, (highStrength + lowStrength) * 10);
      } else if (hasLH && hasLL) {
        newDirection = 'DOWN';
        const highWeakness = ((recentHighs[0] - recentHighs[1]) / recentHighs[0]) * 100;
        const lowWeakness = ((recentLows[0] - recentLows[1]) / recentLows[0]) * 100;
        newConfidence = Math.min(100, (highWeakness + lowWeakness) * 10);
      }
      
      setDirection(newDirection);
      setConfidence(newConfidence);
      setHighs(detectedHighs.slice(-10).map(h => h.value));
      setLows(detectedLows.slice(-10).map(l => l.value));
    }
  }, [values, minChangePercent]);
  
  return {
    direction,
    confidence,
    highs,
    lows
  };
}

