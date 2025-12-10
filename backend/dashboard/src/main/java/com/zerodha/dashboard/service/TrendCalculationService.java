package com.zerodha.dashboard.service;

import com.zerodha.dashboard.model.DerivativeContract;
import com.zerodha.dashboard.model.DerivativesChain;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.*;

/**
 * Service to calculate market trend indicator.
 * 
 * MATCHES EXACTLY the release/v1.1.0-clean useMarketTrend.js logic.
 * 
 * IMPORTANT: This calculation uses API polled values at API polling intervals.
 * The calculation uses a FIFO cache for the configured window size.
 * The UI displays the trend at frontend refresh rate but the calculation
 * happens only at API polling intervals.
 */
@Service
public class TrendCalculationService {
    
    private static final Logger log = LoggerFactory.getLogger(TrendCalculationService.class);
    
    // Smoothing parameters (matching release)
    private static final int SMOOTHING_CYCLES = 3;
    private static final int SMOOTHING_MAJORITY = 2;
    
    // Weights for different metrics (matching release)
    private static final double WEIGHT_LTP = 1.0;
    private static final double WEIGHT_VOL = 0.7;
    private static final double WEIGHT_BID = 0.7;
    private static final double WEIGHT_BID_QTY = 0.4;
    private static final double WEIGHT_ASK_QTY = 0.4;
    private static final double WEIGHT_ASK = 0.3;
    
    // Segment weights for bullish score: 45% future + 35% call + 20% put
    private static final double BULLISH_FUTURES_WEIGHT = 0.45;
    private static final double BULLISH_CALLS_WEIGHT = 0.35;
    private static final double BULLISH_PUTS_WEIGHT = 0.20;
    
    // Segment weights for bearish score: 45% future + 20% call + 35% put
    private static final double BEARISH_FUTURES_WEIGHT = 0.45;
    private static final double BEARISH_CALLS_WEIGHT = 0.20;
    private static final double BEARISH_PUTS_WEIGHT = 0.35;
    
    // Configurable window size (number of API polls to keep in cache)
    private volatile int windowSize = 5;
    
    // Configurable thresholds
    private volatile double bullishThreshold = 3.0;
    private volatile double bearishThreshold = -3.0;
    
    // FIFO caches for each segment (exactly like release version)
    private final Map<String, List<Double>> futuresCache = new HashMap<>();
    private final Map<String, List<Double>> callsCache = new HashMap<>();
    private final Map<String, List<Double>> putsCache = new HashMap<>();
    
    // Classification history for smoothing
    private final Deque<String> classificationHistory = new ArrayDeque<>();
    
    // Current trend result
    private volatile String currentClassification = "Neutral";
    private volatile double currentScore = 0.0;
    
    public TrendCalculationService() {
        // Initialize caches
        initializeCache(futuresCache);
        initializeCache(callsCache);
        initializeCache(putsCache);
    }
    
    private void initializeCache(Map<String, List<Double>> cache) {
        cache.put("ltp", new ArrayList<>());
        cache.put("vol", new ArrayList<>());
        cache.put("bid", new ArrayList<>());
        cache.put("ask", new ArrayList<>());
        cache.put("bidQty", new ArrayList<>());
        cache.put("askQty", new ArrayList<>());
    }
    
    /**
     * Set window size (number of API polls to keep in cache).
     */
    public void setWindowSeconds(int size) {
        if (size <= 0) {
            log.warn("Invalid window size: {}, using default 5", size);
            size = 5;
        }
        int oldSize = this.windowSize;
        this.windowSize = size;
        
        // Clear caches when window size changes (matching release behavior)
        if (oldSize != size) {
            clearAllCaches();
            classificationHistory.clear();
            log.info("Trend calculation window size changed from {} to {} - caches cleared", oldSize, size);
        }
    }
    
    public int getWindowSeconds() {
        return windowSize;
    }
    
    public void setBullishThreshold(double threshold) {
        this.bullishThreshold = threshold;
        log.info("Bullish threshold updated to {}", threshold);
    }
    
    public void setBearishThreshold(double threshold) {
        this.bearishThreshold = threshold;
        log.info("Bearish threshold updated to {}", threshold);
    }
    
    public double getBullishThreshold() {
        return bullishThreshold;
    }
    
    public double getBearishThreshold() {
        return bearishThreshold;
    }
    
    private void clearAllCaches() {
        clearCache(futuresCache);
        clearCache(callsCache);
        clearCache(putsCache);
    }
    
    private void clearCache(Map<String, List<Double>> cache) {
        cache.values().forEach(List::clear);
    }
    
    /**
     * Calculate trend for a derivatives chain.
     * Called on every API poll to update the cache and recalculate trend.
     */
    public void calculateTrend(DerivativesChain chain) {
        if (chain == null) {
            log.warn("calculateTrend: chain is null");
            return;
        }
        
        try {
            // Step 1: Extract current metrics from each segment
            Metrics futuresMetrics = extractMetrics(chain.getFutures());
            Metrics callsMetrics = extractMetrics(chain.getCallOptions());
            Metrics putsMetrics = extractMetrics(chain.getPutOptions());
            
            // Step 2: Update caches with current values (FIFO)
            boolean cacheUpdated = false;
            if (futuresMetrics != null) {
                updateCache(futuresCache, futuresMetrics);
                cacheUpdated = true;
            }
            if (callsMetrics != null) {
                updateCache(callsCache, callsMetrics);
                cacheUpdated = true;
            }
            if (putsMetrics != null) {
                updateCache(putsCache, putsMetrics);
                cacheUpdated = true;
            }
            
            if (!cacheUpdated) {
                log.debug("calculateTrend: No valid metrics to update cache");
                return;
            }
            
            // Step 3: Check if we have enough data (matching release: all 3 segments need full cache)
            boolean hasEnoughData = 
                futuresCache.get("ltp").size() >= windowSize &&
                callsCache.get("ltp").size() >= windowSize &&
                putsCache.get("ltp").size() >= windowSize;
            
            if (!hasEnoughData) {
                log.debug("calculateTrend: Not enough data yet - futures: {}/{}, calls: {}/{}, puts: {}/{}", 
                    futuresCache.get("ltp").size(), windowSize,
                    callsCache.get("ltp").size(), windowSize,
                    putsCache.get("ltp").size(), windowSize);
                // Keep existing trend if we have one
                chain.setTrendClassification(currentClassification);
                chain.setTrendScore(currentScore);
                return;
            }
            
            // Step 4: Get current metrics (need all 3 for calculation - matching release)
            if (futuresMetrics == null || callsMetrics == null || putsMetrics == null) {
                log.debug("calculateTrend: Missing current metrics for calculation");
                chain.setTrendClassification(currentClassification);
                chain.setTrendScore(currentScore);
                return;
            }
            
            // Step 5: Calculate segment scores (exactly like release)
            double futuresScore = calculateSegmentScore(futuresMetrics, futuresCache, "futures");
            double callsScore = calculateSegmentScore(callsMetrics, callsCache, "calls");
            double putsScore = calculateSegmentScore(putsMetrics, putsCache, "puts");
            
            // Step 6: Calculate bullish and bearish scores with segment weights
            double bullishScore = 
                BULLISH_FUTURES_WEIGHT * futuresScore +
                BULLISH_CALLS_WEIGHT * callsScore +
                BULLISH_PUTS_WEIGHT * putsScore;
            
            double bearishScore = 
                BEARISH_FUTURES_WEIGHT * futuresScore +
                BEARISH_CALLS_WEIGHT * callsScore +
                BEARISH_PUTS_WEIGHT * putsScore;
            
            // Step 7: Normalize scores to -10 to +10
            double normalizedBullishScore = normalizeScore(bullishScore);
            double normalizedBearishScore = normalizeScore(bearishScore);
            
            // Step 8: Determine classification using dual scoring logic
            String classification;
            double finalScore;
            boolean bullishCrossed = normalizedBullishScore >= bullishThreshold;
            boolean bearishCrossed = normalizedBearishScore <= bearishThreshold;
            
            if (bullishCrossed && bearishCrossed) {
                // Both crossed - use the one with higher absolute value
                if (Math.abs(normalizedBullishScore) > Math.abs(normalizedBearishScore)) {
                    classification = "Bullish";
                    finalScore = normalizedBullishScore;
                } else if (Math.abs(normalizedBearishScore) > Math.abs(normalizedBullishScore)) {
                    classification = "Bearish";
                    finalScore = normalizedBearishScore;
                } else {
                    // Equal - prefer bullish
                    classification = "Bullish";
                    finalScore = normalizedBullishScore;
                }
            } else if (bullishCrossed) {
                classification = "Bullish";
                finalScore = normalizedBullishScore;
            } else if (bearishCrossed) {
                classification = "Bearish";
                finalScore = normalizedBearishScore;
            } else {
                // Neither crossed - use the score with higher absolute value for neutral
                if (Math.abs(normalizedBullishScore) > Math.abs(normalizedBearishScore)) {
                    classification = "Neutral";
                    finalScore = normalizedBullishScore;
                } else {
                    classification = "Neutral";
                    finalScore = normalizedBearishScore;
                }
            }
            
            // Step 9: Apply smoothing (exactly like release)
            classificationHistory.addLast(classification);
            while (classificationHistory.size() > SMOOTHING_CYCLES) {
                classificationHistory.removeFirst();
            }
            
            String finalClassification = classification;
            
            if (classificationHistory.size() >= SMOOTHING_CYCLES) {
                // Count occurrences
                Map<String, Integer> counts = new HashMap<>();
                for (String c : classificationHistory) {
                    counts.put(c, counts.getOrDefault(c, 0) + 1);
                }
                
                // Find most common
                String mostCommon = counts.entrySet().stream()
                    .max(Map.Entry.comparingByValue())
                    .map(Map.Entry::getKey)
                    .orElse(classification);
                
                // Use majority if appears at least SMOOTHING_MAJORITY times
                if (counts.getOrDefault(mostCommon, 0) >= SMOOTHING_MAJORITY) {
                    finalClassification = mostCommon;
                    
                    // Recalculate score for majority classification
                    if (!mostCommon.equals(classification)) {
                        if (mostCommon.equals("Bullish")) {
                            finalScore = normalizedBullishScore;
                        } else if (mostCommon.equals("Bearish")) {
                            finalScore = normalizedBearishScore;
                        } else {
                            finalScore = Math.abs(normalizedBullishScore) > Math.abs(normalizedBearishScore)
                                ? normalizedBullishScore
                                : normalizedBearishScore;
                        }
                    }
                }
            }
            
            // Step 10: Determine if we should update (matching release logic)
            boolean shouldUpdate = 
                bullishCrossed || bearishCrossed ||
                classificationHistory.size() < SMOOTHING_CYCLES ||
                finalClassification.equals(classification);
            
            if (shouldUpdate) {
                currentClassification = finalClassification;
                currentScore = finalScore;
            }
            
            // Step 11: Update chain with calculated trend
            chain.setTrendClassification(currentClassification);
            chain.setTrendScore(currentScore);
            
            log.debug("calculateTrend: {} score={} (bullish={}, bearish={}, thresholds: b>={}, B<={})", 
                currentClassification, 
                String.format("%.2f", currentScore),
                String.format("%.2f", normalizedBullishScore),
                String.format("%.2f", normalizedBearishScore),
                String.format("%.2f", bullishThreshold),
                String.format("%.2f", bearishThreshold));
            
        } catch (Exception e) {
            log.error("Error calculating trend: {}", e.getMessage(), e);
            // Keep existing trend on error
            chain.setTrendClassification(currentClassification);
            chain.setTrendScore(currentScore);
        }
    }
    
    /**
     * Extract metrics from contracts list.
     */
    private Metrics extractMetrics(List<DerivativeContract> contracts) {
        if (contracts == null || contracts.isEmpty()) {
            return null;
        }
        
        // Find first contract with valid LTP
        DerivativeContract contract = null;
        for (DerivativeContract c : contracts) {
            if (c != null && c.getLastPrice() != null) {
                contract = c;
                break;
            }
        }
        
        if (contract == null) {
            return null;
        }
        
        // Extract all metrics
        Double ltp = contract.getLastPrice() != null ? contract.getLastPrice().doubleValue() : null;
        Double vol = (double) contract.getVolume();
        Double bid = contract.getBid() != null ? contract.getBid().doubleValue() : null;
        Double ask = contract.getAsk() != null ? contract.getAsk().doubleValue() : null;
        Double bidQty = contract.getBidQuantity() != null ? contract.getBidQuantity().doubleValue() : null;
        Double askQty = contract.getAskQuantity() != null ? contract.getAskQuantity().doubleValue() : null;
        
        // All metrics must be valid (matching release validation)
        if (ltp == null || vol == null || bid == null || ask == null || bidQty == null || askQty == null) {
            return null;
        }
        
        if (!Double.isFinite(ltp) || !Double.isFinite(vol) || !Double.isFinite(bid) || 
            !Double.isFinite(ask) || !Double.isFinite(bidQty) || !Double.isFinite(askQty)) {
            return null;
        }
        
        return new Metrics(ltp, vol, bid, ask, bidQty, askQty);
    }
    
    /**
     * Update cache with new metrics (FIFO).
     */
    private void updateCache(Map<String, List<Double>> cache, Metrics metrics) {
        addToCache(cache.get("ltp"), metrics.ltp);
        addToCache(cache.get("vol"), metrics.vol);
        addToCache(cache.get("bid"), metrics.bid);
        addToCache(cache.get("ask"), metrics.ask);
        addToCache(cache.get("bidQty"), metrics.bidQty);
        addToCache(cache.get("askQty"), metrics.askQty);
    }
    
    private void addToCache(List<Double> cache, Double value) {
        if (value != null && !Double.isNaN(value)) {
            cache.add(value);
            while (cache.size() > windowSize) {
                cache.remove(0);
            }
        }
    }
    
    /**
     * Calculate delta as percent change from current vs average of cache.
     * Exactly matches release logic.
     */
    private double calculateDelta(double current, List<Double> cache) {
        if (cache == null || cache.isEmpty()) {
            return 0;
        }
        
        double sum = 0;
        for (Double val : cache) {
            sum += (val != null ? val : 0);
        }
        double avg = sum / cache.size();
        
        if (avg == 0) return 0;
        
        return ((current - avg) / avg) * 100;
    }
    
    /**
     * Get direction: 1 for up, -1 for down, 0 for flat.
     * Exactly matches release logic.
     */
    private int getDirection(double delta, double threshold) {
        if (delta > threshold) return 1;
        if (delta < -threshold) return -1;
        return 0;
    }
    
    /**
     * Calculate score for a segment.
     * Exactly matches release logic.
     */
    private double calculateSegmentScore(Metrics current, Map<String, List<Double>> cache, String segmentType) {
        // Calculate deltas
        double ltpDelta = calculateDelta(current.ltp, cache.get("ltp"));
        double volDelta = calculateDelta(current.vol, cache.get("vol"));
        double bidDelta = calculateDelta(current.bid, cache.get("bid"));
        double askDelta = calculateDelta(current.ask, cache.get("ask"));
        double bidQtyDelta = calculateDelta(current.bidQty, cache.get("bidQty"));
        double askQtyDelta = calculateDelta(current.askQty, cache.get("askQty"));
        
        // Get directions (threshold 0.1%)
        int ltpDir = getDirection(ltpDelta, 0.1);
        int volDir = getDirection(volDelta, 0.1);
        int bidDir = getDirection(bidDelta, 0.1);
        int askDir = getDirection(askDelta, 0.1);
        int bidQtyDir = getDirection(bidQtyDelta, 0.1);
        int askQtyDir = getDirection(askQtyDelta, 0.1);
        
        double score = 0;
        
        if (segmentType.equals("futures") || segmentType.equals("calls")) {
            // Bullish: LTP↑, VOL↑, BID↑, BID_QTY↑, ASK_QTY↓
            if (ltpDir == 1) score += WEIGHT_LTP;
            else if (ltpDir == -1) score -= WEIGHT_LTP;
            
            if (volDir == 1) score += WEIGHT_VOL;
            else if (volDir == -1) score -= WEIGHT_VOL;
            
            if (bidDir == 1) score += WEIGHT_BID;
            else if (bidDir == -1) score -= WEIGHT_BID;
            
            if (bidQtyDir == 1) score += WEIGHT_BID_QTY;
            else if (bidQtyDir == -1) score -= WEIGHT_BID_QTY;
            
            if (askQtyDir == -1) score += WEIGHT_ASK_QTY;
            else if (askQtyDir == 1) score -= WEIGHT_ASK_QTY;
            
            // ASK handling: soft factor
            if (askDir == -1) {
                score += WEIGHT_ASK * 0.5;
            } else if (askDir == 1) {
                score *= 0.85;
            }
            
            // Depth ratio boost
            if (current.bidQty > 0 && current.askQty > 0) {
                double depthRatio = current.bidQty / current.askQty;
                if (depthRatio > 1.2) {
                    score += 0.3;
                } else if (depthRatio < 0.8) {
                    score -= 0.3;
                }
            }
            
        } else if (segmentType.equals("puts")) {
            // For puts, bullish market means puts are down
            if (ltpDir == -1) score += WEIGHT_LTP;
            else if (ltpDir == 1) score -= WEIGHT_LTP;
            
            if (volDir == -1) score += WEIGHT_VOL;
            else if (volDir == 1) score -= WEIGHT_VOL;
            
            if (bidDir == -1) score += WEIGHT_BID;
            else if (bidDir == 1) score -= WEIGHT_BID;
            
            if (bidQtyDir == -1) score += WEIGHT_BID_QTY;
            else if (bidQtyDir == 1) score -= WEIGHT_BID_QTY;
            
            if (askQtyDir == 1) score += WEIGHT_ASK_QTY;
            else if (askQtyDir == -1) score -= WEIGHT_ASK_QTY;
            
            // ASK handling: soft factor (inverse for puts)
            if (askDir == 1) {
                score += WEIGHT_ASK * 0.5;
            } else if (askDir == -1) {
                score *= 0.85;
            }
            
            // Depth ratio boost (inverse for puts)
            if (current.bidQty > 0 && current.askQty > 0) {
                double depthRatio = current.bidQty / current.askQty;
                if (depthRatio < 0.8) {
                    score += 0.3;
                } else if (depthRatio > 1.2) {
                    score -= 0.3;
                }
            }
        }
        
        return score;
    }
    
    /**
     * Normalize score to -10 to +10 range.
     * Exactly matches release logic.
     */
    private double normalizeScore(double score) {
        double maxPossible = 5.0;
        double normalized = (score / maxPossible) * 10;
        return Math.max(-10, Math.min(10, normalized));
    }
    
    /**
     * Simple metrics container.
     */
    private static class Metrics {
        final double ltp;
        final double vol;
        final double bid;
        final double ask;
        final double bidQty;
        final double askQty;
        
        Metrics(double ltp, double vol, double bid, double ask, double bidQty, double askQty) {
            this.ltp = ltp;
            this.vol = vol;
            this.bid = bid;
            this.ask = ask;
            this.bidQty = bidQty;
            this.askQty = askQty;
        }
    }
}
