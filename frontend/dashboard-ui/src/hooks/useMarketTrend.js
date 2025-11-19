import { useRef, useCallback, useMemo, useEffect, useState } from 'react';
import { useTrendAveraging } from '../contexts/TrendAveragingContext';

const SMOOTHING_CYCLES = 3; // Require 3 consecutive same classifications
const BULLISH_THRESHOLD = 3;
const BEARISH_THRESHOLD = -3;

// Weights for different metrics
const WEIGHTS = {
  ltp: 1.0,      // Strongest
  vol: 0.7,      // Medium
  bid: 0.7,      // Medium
  bidQty: 0.4,   // Weaker
  askQty: 0.4,   // Weaker
  ask: 0.3,      // Soft factor (can reduce but not reverse)
};

// Bullish segment weights: 45% future + 35% call + 20% put
const BULLISH_SEGMENT_WEIGHTS = {
  futures: 0.45,
  calls: 0.35,
  puts: 0.20,
};

// Bearish segment weights: 45% future + 20% call + 35% put
const BEARISH_SEGMENT_WEIGHTS = {
  futures: 0.45,
  calls: 0.20,
  puts: 0.35,
};

/**
 * Calculate delta as percent change from current vs average of cache
 */
function calculateDelta(current, cache) {
  if (!cache || cache.length === 0 || current === null || current === undefined) {
    return 0;
  }
  
  const avg = cache.reduce((sum, val) => sum + (val || 0), 0) / cache.length;
  if (avg === 0) return 0;
  
  return ((current - avg) / avg) * 100;
}

/**
 * Determine direction: 1 for up, -1 for down, 0 for flat
 */
function getDirection(delta, threshold = 0.1) {
  if (delta > threshold) return 1;
  if (delta < -threshold) return -1;
  return 0;
}

/**
 * Calculate score for a segment (futures, calls, or puts)
 */
function calculateSegmentScore(metrics, segmentType) {
  const { ltp, vol, bid, ask, bidQty, askQty } = metrics;
  
  // Calculate deltas
  const ltpDelta = calculateDelta(ltp.current, ltp.cache);
  const volDelta = calculateDelta(vol.current, vol.cache);
  const bidDelta = calculateDelta(bid.current, bid.cache);
  const askDelta = calculateDelta(ask.current, ask.cache);
  const bidQtyDelta = calculateDelta(bidQty.current, bidQty.cache);
  const askQtyDelta = calculateDelta(askQty.current, askQty.cache);
  
  // Get directions
  const ltpDir = getDirection(ltpDelta);
  const volDir = getDirection(volDelta);
  const bidDir = getDirection(bidDelta);
  const askDir = getDirection(askDelta);
  const bidQtyDir = getDirection(bidQtyDelta);
  const askQtyDir = getDirection(askQtyDelta);
  
  let score = 0;
  
  if (segmentType === 'futures' || segmentType === 'calls') {
    // Bullish: LTP↑, VOL↑, BID↑, BID_QTY↑, ASK_QTY↓
    // ASK↓ strengthens, ASK↑/neutral doesn't invalidate (soft factor)
    
    if (ltpDir === 1) score += WEIGHTS.ltp;
    else if (ltpDir === -1) score -= WEIGHTS.ltp;
    
    if (volDir === 1) score += WEIGHTS.vol;
    else if (volDir === -1) score -= WEIGHTS.vol;
    
    if (bidDir === 1) score += WEIGHTS.bid;
    else if (bidDir === -1) score -= WEIGHTS.bid;
    
    if (bidQtyDir === 1) score += WEIGHTS.bidQty;
    else if (bidQtyDir === -1) score -= WEIGHTS.bidQty;
    
    if (askQtyDir === -1) score += WEIGHTS.askQty;
    else if (askQtyDir === 1) score -= WEIGHTS.askQty;
    
    // ASK handling: soft factor
    if (askDir === -1) {
      // ASK down strengthens bullish
      score += WEIGHTS.ask * 0.5;
    } else if (askDir === 1) {
      // ASK up reduces bullish score by 15%
      score *= 0.85;
    }
    
    // Depth ratio boost
    if (bidQty.current > 0 && askQty.current > 0) {
      const depthRatio = bidQty.current / askQty.current;
      if (depthRatio > 1.2) {
        score += 0.3; // Slight bullish boost
      } else if (depthRatio < 0.8) {
        score -= 0.3; // Slight bearish boost
      }
    }
    
  } else if (segmentType === 'puts') {
    // For puts, bullish market means puts are down
    // Bullish: LTP↓, VOL↓, BID↓, BID_QTY↓, ASK_QTY↑
    // ASK↑ strengthens, ASK↓ acceptable (soft factor)
    
    if (ltpDir === -1) score += WEIGHTS.ltp; // Put LTP down = bullish
    else if (ltpDir === 1) score -= WEIGHTS.ltp;
    
    if (volDir === -1) score += WEIGHTS.vol; // Put VOL down = bullish
    else if (volDir === 1) score -= WEIGHTS.vol;
    
    if (bidDir === -1) score += WEIGHTS.bid; // Put BID down = bullish
    else if (bidDir === 1) score -= WEIGHTS.bid;
    
    if (bidQtyDir === -1) score += WEIGHTS.bidQty; // Put BID_QTY down = bullish
    else if (bidQtyDir === 1) score -= WEIGHTS.bidQty;
    
    if (askQtyDir === 1) score += WEIGHTS.askQty; // Put ASK_QTY up = bullish
    else if (askQtyDir === -1) score -= WEIGHTS.askQty;
    
    // ASK handling: soft factor
    if (askDir === 1) {
      // ASK up strengthens bullish (puts are being sold)
      score += WEIGHTS.ask * 0.5;
    } else if (askDir === -1) {
      // ASK down reduces bullish score by 15%
      score *= 0.85;
    }
    
    // Depth ratio boost (inverse for puts)
    if (bidQty.current > 0 && askQty.current > 0) {
      const depthRatio = bidQty.current / askQty.current;
      if (depthRatio < 0.8) {
        score += 0.3; // Slight bullish boost (more asks than bids for puts)
      } else if (depthRatio > 1.2) {
        score -= 0.3; // Slight bearish boost
      }
    }
  }
  
  return score;
}

/**
 * Normalize score to -10 to +10 range
 */
function normalizeScore(score, maxPossible = 5) {
  const normalized = (score / maxPossible) * 10;
  return Math.max(-10, Math.min(10, normalized));
}

/**
 * Extract metrics from contracts array
 */
function extractMetrics(contracts) {
  if (!contracts || !Array.isArray(contracts) || contracts.length === 0) {
    return null;
  }
  
  // Use the first contract with valid data
  let contract = null;
  for (const c of contracts) {
    if (c && (
      (c.lastPrice != null && !isNaN(Number(c.lastPrice))) ||
      (c.ltp != null && !isNaN(Number(c.ltp)))
    )) {
      contract = c;
      break;
    }
  }
  
  if (!contract) return null;
  
  // Try multiple field name variations
  const ltp = contract?.lastPrice != null ? Number(contract.lastPrice) : 
              contract?.ltp != null ? Number(contract.ltp) : null;
  const vol = contract?.volume != null ? Number(contract.volume) : 
              contract?.vol != null ? Number(contract.vol) : null;
  const bid = contract?.bid != null ? Number(contract.bid) : 
              contract?.bestBidPrice != null ? Number(contract.bestBidPrice) : null;
  const ask = contract?.ask != null ? Number(contract.ask) : 
              contract?.bestAskPrice != null ? Number(contract.bestAskPrice) : null;
  const bidQty = contract?.bidQuantity != null ? Number(contract.bidQuantity) : 
                 contract?.bestBidQuantity != null ? Number(contract.bestBidQuantity) : null;
  const askQty = contract?.askQuantity != null ? Number(contract.askQuantity) : 
                 contract?.bestAskQuantity != null ? Number(contract.bestAskQuantity) : null;
  
  // Validate all required metrics
  if (ltp === null || vol === null || bid === null || ask === null || 
      bidQty === null || askQty === null) {
    return null;
  }
  
  // Ensure all are valid numbers
  if (!isFinite(ltp) || !isFinite(vol) || !isFinite(bid) || !isFinite(ask) || 
      !isFinite(bidQty) || !isFinite(askQty)) {
    return null;
  }
  
  return { ltp, vol, bid, ask, bidQty, askQty };
}

/**
 * Hook to calculate market trend
 * Optimized: Separates cache updates from trend calculations
 * Uses dual scoring: bullish and bearish with different segment weights
 */
export default function useMarketTrend(derivativesData) {
  const { averagingWindowSeconds } = useTrendAveraging();
  const CACHE_SIZE = averagingWindowSeconds; // Use configurable window size
  const lastWindowSizeRef = useRef(averagingWindowSeconds);
  
  const cachesRef = useRef({
    futures: {
      ltp: [],
      vol: [],
      bid: [],
      ask: [],
      bidQty: [],
      askQty: [],
    },
    calls: {
      ltp: [],
      vol: [],
      bid: [],
      ask: [],
      bidQty: [],
      askQty: [],
    },
    puts: {
      ltp: [],
      vol: [],
      bid: [],
      ask: [],
      bidQty: [],
      askQty: [],
    },
  });
  
  const classificationHistoryRef = useRef([]);
  const currentTrendRef = useRef({ classification: 'Neutral', score: 0 });
  const [cacheVersion, setCacheVersion] = useState(0); // Track cache changes
  const [trend, setTrend] = useState({ classification: 'Neutral', score: 0 });
  
  // Reset cache when window size changes
  useEffect(() => {
    if (lastWindowSizeRef.current !== averagingWindowSeconds) {
      // Window size changed - clear all caches
      cachesRef.current = {
        futures: { ltp: [], vol: [], bid: [], ask: [], bidQty: [], askQty: [] },
        calls: { ltp: [], vol: [], bid: [], ask: [], bidQty: [], askQty: [] },
        puts: { ltp: [], vol: [], bid: [], ask: [], bidQty: [], askQty: [] },
      };
      classificationHistoryRef.current = [];
      lastWindowSizeRef.current = averagingWindowSeconds;
      setCacheVersion(prev => prev + 1); // Force recalculation
    }
  }, [averagingWindowSeconds]);

  // Update cache when data changes (separate from calculation)
  useEffect(() => {
    if (!derivativesData) {
      return;
    }
    
    let cacheUpdated = false;
    
    // Extract and update futures cache
    const futuresMetrics = extractMetrics(derivativesData.futures);
    if (futuresMetrics) {
      const cache = cachesRef.current.futures;
      Object.keys(futuresMetrics).forEach(key => {
        const value = futuresMetrics[key];
        if (value !== null && value !== undefined && !isNaN(value)) {
          if (!cache[key]) cache[key] = [];
          cache[key].push(value);
          if (cache[key].length > CACHE_SIZE) {
            cache[key].shift();
          }
          cacheUpdated = true;
        }
      });
    }
    
    // Extract and update calls cache
    const callsMetrics = extractMetrics(derivativesData.callOptions);
    if (callsMetrics) {
      const cache = cachesRef.current.calls;
      Object.keys(callsMetrics).forEach(key => {
        const value = callsMetrics[key];
        if (value !== null && value !== undefined && !isNaN(value)) {
          if (!cache[key]) cache[key] = [];
          cache[key].push(value);
          if (cache[key].length > CACHE_SIZE) {
            cache[key].shift();
          }
          cacheUpdated = true;
        }
      });
    }
    
    // Extract and update puts cache
    const putsMetrics = extractMetrics(derivativesData.putOptions);
    if (putsMetrics) {
      const cache = cachesRef.current.puts;
      Object.keys(putsMetrics).forEach(key => {
        const value = putsMetrics[key];
        if (value !== null && value !== undefined && !isNaN(value)) {
          if (!cache[key]) cache[key] = [];
          cache[key].push(value);
          if (cache[key].length > CACHE_SIZE) {
            cache[key].shift();
          }
          cacheUpdated = true;
        }
      });
    }
    
    // Only increment version if cache actually updated
    if (cacheUpdated) {
      setCacheVersion(prev => prev + 1);
    }
  }, [derivativesData]);
  
  // Calculate trend only when cache changes
  useEffect(() => {
    const futuresCache = cachesRef.current.futures;
    const callsCache = cachesRef.current.calls;
    const putsCache = cachesRef.current.puts;
    
    // Early exit if not enough data
    const hasEnoughData = 
      futuresCache.ltp.length >= CACHE_SIZE &&
      callsCache.ltp.length >= CACHE_SIZE &&
      putsCache.ltp.length >= CACHE_SIZE;
    
    if (!hasEnoughData) {
      return;
    }
    
    // Get current metrics
    const futuresMetrics = extractMetrics(derivativesData?.futures);
    const callsMetrics = extractMetrics(derivativesData?.callOptions);
    const putsMetrics = extractMetrics(derivativesData?.putOptions);
    
    if (!futuresMetrics || !callsMetrics || !putsMetrics) {
      return;
    }
    
    // Prepare metrics with current values and caches
    const futuresData = {
      ltp: { current: futuresMetrics.ltp, cache: futuresCache.ltp },
      vol: { current: futuresMetrics.vol, cache: futuresCache.vol },
      bid: { current: futuresMetrics.bid, cache: futuresCache.bid },
      ask: { current: futuresMetrics.ask, cache: futuresCache.ask },
      bidQty: { current: futuresMetrics.bidQty, cache: futuresCache.bidQty },
      askQty: { current: futuresMetrics.askQty, cache: futuresCache.askQty },
    };
    
    const callsData = {
      ltp: { current: callsMetrics.ltp, cache: callsCache.ltp },
      vol: { current: callsMetrics.vol, cache: callsCache.vol },
      bid: { current: callsMetrics.bid, cache: callsCache.bid },
      ask: { current: callsMetrics.ask, cache: callsCache.ask },
      bidQty: { current: callsMetrics.bidQty, cache: callsCache.bidQty },
      askQty: { current: callsMetrics.askQty, cache: callsCache.askQty },
    };
    
    const putsData = {
      ltp: { current: putsMetrics.ltp, cache: putsCache.ltp },
      vol: { current: putsMetrics.vol, cache: putsCache.vol },
      bid: { current: putsMetrics.bid, cache: putsCache.bid },
      ask: { current: putsMetrics.ask, cache: putsCache.ask },
      bidQty: { current: putsMetrics.bidQty, cache: putsCache.bidQty },
      askQty: { current: putsMetrics.askQty, cache: putsCache.askQty },
    };
    
    // Calculate segment scores
    const futuresScore = calculateSegmentScore(futuresData, 'futures');
    const callsScore = calculateSegmentScore(callsData, 'calls');
    const putsScore = calculateSegmentScore(putsData, 'puts');
    
    // Calculate bullish score: 45% future + 35% call + 20% put
    const bullishScore = 
      BULLISH_SEGMENT_WEIGHTS.futures * futuresScore +
      BULLISH_SEGMENT_WEIGHTS.calls * callsScore +
      BULLISH_SEGMENT_WEIGHTS.puts * putsScore;
    
    // Calculate bearish score: 45% future + 20% call + 35% put
    const bearishScore = 
      BEARISH_SEGMENT_WEIGHTS.futures * futuresScore +
      BEARISH_SEGMENT_WEIGHTS.calls * callsScore +
      BEARISH_SEGMENT_WEIGHTS.puts * putsScore;
    
    // Normalize both scores to -10 to +10
    const normalizedBullishScore = normalizeScore(bullishScore);
    const normalizedBearishScore = normalizeScore(bearishScore);
    
    // Determine classification using dual scoring logic
    let classification;
    let finalScore;
    const bullishCrossed = normalizedBullishScore >= BULLISH_THRESHOLD;
    const bearishCrossed = normalizedBearishScore <= BEARISH_THRESHOLD;
    
    if (bullishCrossed && bearishCrossed) {
      // Both crossed - use the one with higher absolute value
      if (Math.abs(normalizedBullishScore) > Math.abs(normalizedBearishScore)) {
        classification = 'Bullish';
        finalScore = normalizedBullishScore;
      } else if (Math.abs(normalizedBearishScore) > Math.abs(normalizedBullishScore)) {
        classification = 'Bearish';
        finalScore = normalizedBearishScore;
      } else {
        // Equal absolute values - prefer bullish
        classification = 'Bullish';
        finalScore = normalizedBullishScore;
      }
    } else if (bullishCrossed) {
      // Only bullish threshold crossed
      classification = 'Bullish';
      finalScore = normalizedBullishScore;
    } else if (bearishCrossed) {
      // Only bearish threshold crossed
      classification = 'Bearish';
      finalScore = normalizedBearishScore;
    } else {
      // Neither crossed - use the score with higher absolute value for neutral
      if (Math.abs(normalizedBullishScore) > Math.abs(normalizedBearishScore)) {
        classification = 'Neutral';
        finalScore = normalizedBullishScore;
      } else {
        classification = 'Neutral';
        finalScore = normalizedBearishScore;
      }
    }
    
    // Smoothing: require 3 consecutive same classifications
    classificationHistoryRef.current.push(classification);
    if (classificationHistoryRef.current.length > SMOOTHING_CYCLES) {
      classificationHistoryRef.current.shift();
    }
    
    // Check if last 3 are the same
    if (classificationHistoryRef.current.length === SMOOTHING_CYCLES) {
      const allSame = classificationHistoryRef.current.every(c => c === classification);
      if (allSame) {
        const newTrend = { classification, score: finalScore };
        currentTrendRef.current = newTrend;
        setTrend(newTrend);
      }
    } else {
      // Not enough history yet, use current
      const newTrend = { classification, score: finalScore };
      currentTrendRef.current = newTrend;
      setTrend(newTrend);
    }
  }, [cacheVersion, derivativesData, averagingWindowSeconds]); // Recalculate when window changes
  
  return trend;
}
