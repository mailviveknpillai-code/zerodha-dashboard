import { useRef, useEffect, useState, useCallback } from 'react';

/**
 * Direction Flow Logic Hook
 * 
 * Tracks price direction by analyzing Higher Highs (HH) + Higher Lows (HL) for UP trends
 * and Lower Highs (LH) + Lower Lows (LL) for DOWN trends.
 * 
 * This filters out noise from second-by-second updates by only tracking turning points.
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
  
  // Track price history and turning points
  const priceHistoryRef = useRef([]);
  const currentHighRef = useRef(null);
  const currentLowRef = useRef(null);
  const lastHighRef = useRef(null);
  const lastLowRef = useRef(null);
  const isRisingRef = useRef(null); // true = rising, false = falling, null = unknown
  
  // Track direction confirmation
  const directionHistoryRef = useRef([]);
  
  useEffect(() => {
    // Skip if no valid value
    if (currentValue === null || currentValue === undefined || isNaN(Number(currentValue))) {
      return;
    }
    
    const numValue = Number(currentValue);
    
    // Initialize on first value
    if (priceHistoryRef.current.length === 0) {
      priceHistoryRef.current.push(numValue);
      currentHighRef.current = numValue;
      currentLowRef.current = numValue;
      lastHighRef.current = numValue;
      lastLowRef.current = numValue;
      return;
    }
    
    // Add to history (keep last 100 values for reference)
    priceHistoryRef.current.push(numValue);
    if (priceHistoryRef.current.length > 100) {
      priceHistoryRef.current.shift();
    }
    
    // Update current high/low
    if (numValue > currentHighRef.current) {
      currentHighRef.current = numValue;
    }
    if (numValue < currentLowRef.current) {
      currentLowRef.current = numValue;
    }
    
    // Detect turning points
    const lastValue = priceHistoryRef.current[priceHistoryRef.current.length - 2];
    const changePercent = Math.abs((numValue - lastValue) / lastValue) * 100;
    
    // Determine if we're in a rising or falling phase
    if (isRisingRef.current === null) {
      // Initialize direction
      isRisingRef.current = numValue > lastValue;
    } else {
      // Check for reversal
      if (numValue > lastValue && !isRisingRef.current) {
        // Switched from falling to rising - previous low is a turning point
        if (currentLowRef.current < lastLowRef.current) {
          // Lower low detected
          const newLows = [...lows, currentLowRef.current];
          setLows(newLows.slice(-10)); // Keep last 10 lows
          lastLowRef.current = currentLowRef.current;
        }
        isRisingRef.current = true;
        currentLowRef.current = numValue; // Reset for new rising phase
      } else if (numValue < lastValue && isRisingRef.current) {
        // Switched from rising to falling - previous high is a turning point
        if (currentHighRef.current > lastHighRef.current) {
          // Higher high detected
          const newHighs = [...highs, currentHighRef.current];
          setHighs(newHighs.slice(-10)); // Keep last 10 highs
          lastHighRef.current = currentHighRef.current;
        }
        isRisingRef.current = false;
        currentHighRef.current = numValue; // Reset for new falling phase
      }
    }
    
    // Analyze direction based on HH/HL or LH/LL pattern
    if (highs.length >= 2 && lows.length >= 2) {
      const recentHighs = highs.slice(-2);
      const recentLows = lows.slice(-2);
      
      // Check for Higher Highs (HH)
      const hasHH = recentHighs[1] > recentHighs[0];
      
      // Check for Higher Lows (HL)
      const hasHL = recentLows[1] > recentLows[0];
      
      // Check for Lower Highs (LH)
      const hasLH = recentHighs[1] < recentHighs[0];
      
      // Check for Lower Lows (LL)
      const hasLL = recentLows[1] < recentLows[0];
      
      // Determine direction
      let newDirection = 'NEUTRAL';
      let newConfidence = 0;
      
      if (hasHH && hasHL) {
        // UP Direction: Higher High + Higher Low
        newDirection = 'UP';
        // Calculate confidence based on how strong the pattern is
        const highStrength = ((recentHighs[1] - recentHighs[0]) / recentHighs[0]) * 100;
        const lowStrength = ((recentLows[1] - recentLows[0]) / recentLows[0]) * 100;
        newConfidence = Math.min(100, (highStrength + lowStrength) * 10);
      } else if (hasLH && hasLL) {
        // DOWN Direction: Lower High + Lower Low
        newDirection = 'DOWN';
        // Calculate confidence
        const highWeakness = ((recentHighs[0] - recentHighs[1]) / recentHighs[0]) * 100;
        const lowWeakness = ((recentLows[0] - recentLows[1]) / recentLows[0]) * 100;
        newConfidence = Math.min(100, (highWeakness + lowWeakness) * 10);
      } else if (hasHH && !hasHL) {
        // Higher High but not Higher Low - weak UP or sideways
        newDirection = 'NEUTRAL';
        newConfidence = 30;
      } else if (hasHL && !hasHH) {
        // Higher Low but not Higher High - weak UP or sideways
        newDirection = 'NEUTRAL';
        newConfidence = 30;
      } else if (hasLH && !hasLL) {
        // Lower High but not Lower Low - weak DOWN or sideways
        newDirection = 'NEUTRAL';
        newConfidence = 30;
      } else if (hasLL && !hasLH) {
        // Lower Low but not Lower High - weak DOWN or sideways
        newDirection = 'NEUTRAL';
        newConfidence = 30;
      }
      
      // Smooth direction changes (require 2 consecutive same directions)
      directionHistoryRef.current.push(newDirection);
      if (directionHistoryRef.current.length > 3) {
        directionHistoryRef.current.shift();
      }
      
      // Only update if direction is consistent
      if (directionHistoryRef.current.length >= 2) {
        const lastTwo = directionHistoryRef.current.slice(-2);
        if (lastTwo[0] === lastTwo[1]) {
          setDirection(newDirection);
          setConfidence(newConfidence);
        }
      } else {
        setDirection(newDirection);
        setConfidence(newConfidence);
      }
    }
  }, [currentValue, minChangePercent, highs, lows]);
  
  // Reset function to clear history
  const reset = useCallback(() => {
    priceHistoryRef.current = [];
    currentHighRef.current = null;
    currentLowRef.current = null;
    lastHighRef.current = null;
    lastLowRef.current = null;
    isRisingRef.current = null;
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

