package com.zerodha.dashboard.service;

import com.zerodha.dashboard.model.DerivativeContract;
import com.zerodha.dashboard.model.DerivativesChain;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.*;

/**
 * Service to calculate market trend indicator.
 * 
 * USES DISCRETE WINDOW INTERVAL CALCULATION:
 * - Calculates trend for a fixed time window (e.g., 0-5s)
 * - Displays the calculated result for the entire NEXT window (5-10s)
 * - Ensures smooth transitions between windows
 * 
 * The calculation uses API polled values at API polling intervals.
 * The UI displays the trend at frontend refresh rate.
 */
@Service
public class TrendCalculationService {
    
    private static final Logger log = LoggerFactory.getLogger(TrendCalculationService.class);
    
    // Smoothing parameters
    private static final int SMOOTHING_CYCLES = 3;
    private static final int SMOOTHING_MAJORITY = 2;
    
    // Weights for different metrics
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
    
    // Configurable window size in seconds (discrete time windows)
    // Default matches frontend default in TrendAveragingContext.jsx
    private volatile int windowSeconds = 10;
    
    // Configurable thresholds
    private volatile double bullishThreshold = 3.0;
    private volatile double bearishThreshold = -3.0;
    
    // Window tracking for discrete intervals (aligned to window boundaries)
    private volatile Instant windowStartTime = null;
    
    // Caches for current window calculation (FIFO within each window)
    private final Map<String, List<Double>> futuresCache = new HashMap<>();
    private final Map<String, List<Double>> callsCache = new HashMap<>();
    private final Map<String, List<Double>> putsCache = new HashMap<>();
    
    // Classification history for smoothing
    private final Deque<String> classificationHistory = new ArrayDeque<>();
    
    /**
     * COMPLETED WINDOW RESULT - Result from PREVIOUS completed window (DISPLAYED IN UI)
     * This is what the frontend shows - stable until next window completes.
     * 
     * Example with 5s window:
     * - 0-5s: Calculate currentClassification/Score, display completedClassification/Score (initially Neutral/0)
     * - At 5s: Window completes, store current → completed, display the new completed value
     * - 5-10s: Calculate new current values, display completed (stable)
     */
    private volatile String completedClassification = "Neutral";
    private volatile double completedScore = 0.0;
    private volatile double completedFuturesScore = 0.0;
    private volatile double completedCallsScore = 0.0;
    private volatile double completedPutsScore = 0.0;
    
    /**
     * CURRENT WINDOW RESULT - Running calculation for CURRENT window (NOT displayed until window completes)
     * These values are being calculated but not shown to the UI yet.
     */
    private volatile String currentClassification = "Neutral";
    private volatile double currentScore = 0.0;
    private volatile double currentFuturesScore = 0.0;
    private volatile double currentCallsScore = 0.0;
    private volatile double currentPutsScore = 0.0;
    
    /**
     * Track if we've completed at least one window.
     * Before the first window completes, we show the current calculation (like eaten delta does).
     */
    private volatile boolean hasCompletedWindow = false;
    
    public TrendCalculationService() {
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
     * Set window size in seconds (discrete time windows).
     */
    public void setWindowSeconds(int seconds) {
        if (seconds <= 0) {
            log.warn("Invalid window size: {}, using default 5", seconds);
            seconds = 5;
        }
        int oldSize = this.windowSeconds;
        this.windowSeconds = seconds;
        
        if (oldSize != seconds) {
            // Reset window tracking when size changes
            windowStartTime = null;
            clearAllCaches();
            classificationHistory.clear();
            // Reset current calculation for new window
            currentClassification = "Neutral";
            currentScore = 0.0;
            // Reset window completion flag - treat as new first window
            hasCompletedWindow = false;
            // DON'T clear completedClassification/Score - keep displaying last result for smooth transition
            log.info("TREND WINDOW SIZE CHANGED: {}s -> {}s. Window tracking reset. hasCompletedWindow=false. Display: {} ({})", 
                oldSize, seconds, completedClassification, String.format("%.2f", completedScore));
        }
    }
    
    public int getWindowSeconds() {
        return windowSeconds;
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
     * Uses discrete time windows - calculates for window N, displays result during window N+1.
     * 
     * FOLLOWS SAME PATTERN AS EatenDeltaService:
     * - completedClassification/Score: Result from PREVIOUS completed window (displayed in UI)
     * - currentClassification/Score: Running calculation for CURRENT window (not displayed until window completes)
     * 
     * Example with 5s window:
     * - 0-5s: Calculate currentScore, display completedScore (initially 0)
     * - At 5s: Window completes, store current → completed, display new value
     * - 5-10s: Calculate new currentScore, display completedScore (stable)
     */
    public void calculateTrend(DerivativesChain chain) {
        if (chain == null) {
            log.warn("calculateTrend: chain is null");
            return;
        }
        
        try {
            Instant now = Instant.now();
            long epochSecond = now.getEpochSecond();
            long currentWindowNumber = epochSecond / windowSeconds;
            
            // Initialize window start time if not set (aligned to discrete boundary)
            if (windowStartTime == null) {
                long windowNumber = epochSecond / windowSeconds;
                windowStartTime = Instant.ofEpochSecond(windowNumber * windowSeconds);
                log.info("TREND: Initialized window start to {} (aligned to {}s boundary, window #{})", 
                    windowStartTime, windowSeconds, windowNumber);
            }
            
            // Calculate window boundaries
            long windowStartNumber = windowStartTime.getEpochSecond() / windowSeconds;
            
            // Check if we've moved to a new window
            boolean windowChanged = currentWindowNumber > windowStartNumber;
            
            // If we've missed windows (e.g., API polling was delayed), log it
            if (windowChanged && (currentWindowNumber - windowStartNumber) > 1) {
                long windowsMissed = currentWindowNumber - windowStartNumber - 1;
                log.warn("TREND: Missed {} window(s) - jumped from window {} to {}. This may cause delayed updates.", 
                    windowsMissed, windowStartNumber, currentWindowNumber);
            }
            
            // Log window changes for debugging
            if (windowChanged) {
                log.info("TREND: Window change - epochSecond={}, window {} -> {}, windowSeconds={}", 
                    epochSecond, windowStartNumber, currentWindowNumber, windowSeconds);
            }
            
            if (windowChanged) {
                // Window completed! Commit current result as completed result
                log.info("TREND WINDOW CHANGE: Window {} completed at epoch {}. Committing score: {} ({}). Window size: {}s",
                    windowStartNumber, now.getEpochSecond(), currentClassification, String.format("%.2f", currentScore), windowSeconds);
                
                commitWindowResult();
                
                // Start new window (aligned to boundary)
                long newWindowStart = currentWindowNumber * windowSeconds;
                windowStartTime = Instant.ofEpochSecond(newWindowStart);
                
                // Clear caches for new window
                clearAllCaches();
                
                // Reset current calculation for new window
                currentClassification = "Neutral";
                currentScore = 0.0;
                currentFuturesScore = 0.0;
                currentCallsScore = 0.0;
                currentPutsScore = 0.0;
                
                log.info("TREND WINDOW CHANGE: New window started: {}s-{}s (window #{}). Display now: {} ({})", 
                    newWindowStart, newWindowStart + windowSeconds, currentWindowNumber,
                    completedClassification, String.format("%.2f", completedScore));
            }
            
            // Extract and cache current metrics
            Metrics futuresMetrics = extractMetrics(chain.getFutures());
            Metrics callsMetrics = extractMetrics(chain.getCallOptions());
            Metrics putsMetrics = extractMetrics(chain.getPutOptions());
            
            // Update caches with current values
            if (futuresMetrics != null) {
                updateCache(futuresCache, futuresMetrics);
            }
            if (callsMetrics != null) {
                updateCache(callsCache, callsMetrics);
            }
            if (putsMetrics != null) {
                updateCache(putsCache, putsMetrics);
            }
            
            // Store previous values before calculating
            double previousCurrentScore = currentScore;
            String previousCurrentClassification = currentClassification;
            
            // Calculate trend for current window (updates currentClassification/Score)
            // These are NOT displayed yet - only completedClassification/Score are displayed
            calculateCurrentWindowTrend(futuresMetrics, callsMetrics, putsMetrics);
            
            // If calculation returned 0 due to insufficient data (only 1 point in cache),
            // preserve the previous non-zero value to avoid oscillation
            int cacheSize = Math.max(
                futuresCache.get("ltp").size(),
                Math.max(callsCache.get("ltp").size(), putsCache.get("ltp").size())
            );
            if (cacheSize <= 1 && currentScore == 0.0 && previousCurrentScore != 0.0) {
                // Not enough data to calculate meaningful score - preserve previous
                currentScore = previousCurrentScore;
                currentClassification = previousCurrentClassification;
                log.debug("calculateTrend: Insufficient data (cacheSize={}), preserving previous score: {} ({})",
                    cacheSize, currentClassification, String.format("%.2f", currentScore));
            }
            
            // Determine what to display
            String displayClassification;
            double displayScore;
            
            if (hasCompletedWindow) {
                // After first window completes: ALWAYS show completed result (stable)
                displayClassification = completedClassification;
                displayScore = completedScore;
            } else {
                // Before first window completes: Show current calculation (like eaten delta)
                // This gives immediate feedback rather than showing 0 for the entire first window
                // But only if we have a meaningful value (not 0 from insufficient data)
                if (currentScore != 0.0 || !"Neutral".equals(currentClassification)) {
                    displayClassification = currentClassification;
                    displayScore = currentScore;
                } else {
                    // No meaningful calculation yet - keep previous display value
                    displayClassification = completedClassification;
                    displayScore = completedScore;
                }
            }
            
            chain.setTrendClassification(displayClassification);
            chain.setTrendScore(displayScore);
            
            // Set segment scores (use completed scores if window completed, otherwise current scores)
            if (hasCompletedWindow) {
                chain.setFuturesTrendScore(completedFuturesScore);
                chain.setCallsTrendScore(completedCallsScore);
                chain.setPutsTrendScore(completedPutsScore);
            } else {
                chain.setFuturesTrendScore(currentFuturesScore);
                chain.setCallsTrendScore(currentCallsScore);
                chain.setPutsTrendScore(currentPutsScore);
            }
            
        } catch (Exception e) {
            log.error("Error calculating trend: {}", e.getMessage(), e);
            // Keep existing completed result on error
            chain.setTrendClassification(completedClassification);
            chain.setTrendScore(completedScore);
            chain.setFuturesTrendScore(completedFuturesScore);
            chain.setCallsTrendScore(completedCallsScore);
            chain.setPutsTrendScore(completedPutsScore);
        }
    }
    
    /**
     * Commit the current window result as the completed result.
     * Called when a window boundary is crossed.
     * 
     * ALWAYS commits the current result (even if 0/Neutral) because:
     * - The calculated value for window N should be displayed during window N+1
     * - If the market is flat and score is 0, that's a valid result to display
     */
    private void commitWindowResult() {
        // Store current result as completed result (this is what UI will display)
        completedClassification = currentClassification;
        completedScore = currentScore;
        completedFuturesScore = currentFuturesScore;
        completedCallsScore = currentCallsScore;
        completedPutsScore = currentPutsScore;
        
        // Mark that we've completed at least one window
        hasCompletedWindow = true;
        
        log.debug("commitWindowResult: Committed {} ({}) as completed window result", 
            completedClassification, String.format("%.2f", completedScore));
    }
    
    /**
     * Calculate trend for the current window (updates currentClassification/Score).
     */
    private void calculateCurrentWindowTrend(Metrics futuresMetrics, Metrics callsMetrics, Metrics putsMetrics) {
        // Check if we have any data in caches
        boolean hasData = 
            futuresCache.get("ltp").size() > 0 ||
            callsCache.get("ltp").size() > 0 ||
            putsCache.get("ltp").size() > 0;
        
        if (!hasData) {
            log.debug("calculateCurrentWindowTrend: No data in caches yet");
            return;
        }
        
        // Need current metrics for calculation
        if (futuresMetrics == null && callsMetrics == null && putsMetrics == null) {
            log.debug("calculateCurrentWindowTrend: No current metrics");
            return;
        }
        
        // Calculate segment scores
        double futuresScore = futuresMetrics != null && futuresCache.get("ltp").size() > 0
            ? calculateSegmentScore(futuresMetrics, futuresCache, "futures") 
            : 0.0;
        double callsScore = callsMetrics != null && callsCache.get("ltp").size() > 0
            ? calculateSegmentScore(callsMetrics, callsCache, "calls") 
            : 0.0;
        double putsScore = putsMetrics != null && putsCache.get("ltp").size() > 0
            ? calculateSegmentScore(putsMetrics, putsCache, "puts") 
            : 0.0;
        
        // Calculate bullish and bearish scores with segment weights
        double bullishScore = 
            BULLISH_FUTURES_WEIGHT * futuresScore +
            BULLISH_CALLS_WEIGHT * callsScore +
            BULLISH_PUTS_WEIGHT * putsScore;
        
        double bearishScore = 
            BEARISH_FUTURES_WEIGHT * futuresScore +
            BEARISH_CALLS_WEIGHT * callsScore +
            BEARISH_PUTS_WEIGHT * putsScore;
        
        // Normalize scores to -10 to +10
        double normalizedBullishScore = normalizeScore(bullishScore);
        double normalizedBearishScore = normalizeScore(bearishScore);
        
        // Determine classification using dual scoring logic
        String classification;
        double finalScore;
        boolean bullishCrossed = normalizedBullishScore >= bullishThreshold;
        boolean bearishCrossed = normalizedBearishScore <= bearishThreshold;
        
        if (bullishCrossed && bearishCrossed) {
            if (Math.abs(normalizedBullishScore) > Math.abs(normalizedBearishScore)) {
                classification = "Bullish";
                finalScore = normalizedBullishScore;
            } else if (Math.abs(normalizedBearishScore) > Math.abs(normalizedBullishScore)) {
                classification = "Bearish";
                finalScore = normalizedBearishScore;
            } else {
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
            if (Math.abs(normalizedBullishScore) > Math.abs(normalizedBearishScore)) {
                classification = "Neutral";
                finalScore = normalizedBullishScore;
            } else {
                classification = "Neutral";
                finalScore = normalizedBearishScore;
            }
        }
        
        // Apply smoothing
        classificationHistory.addLast(classification);
        while (classificationHistory.size() > SMOOTHING_CYCLES) {
            classificationHistory.removeFirst();
        }
        
        String finalClassification = classification;
        
        if (classificationHistory.size() >= SMOOTHING_CYCLES) {
            Map<String, Integer> counts = new HashMap<>();
            for (String c : classificationHistory) {
                counts.put(c, counts.getOrDefault(c, 0) + 1);
            }
            
            String mostCommon = counts.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(classification);
            
            if (counts.getOrDefault(mostCommon, 0) >= SMOOTHING_MAJORITY) {
                finalClassification = mostCommon;
                
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
        
        // Update current window result
        boolean shouldUpdate = 
            bullishCrossed || bearishCrossed ||
            classificationHistory.size() < SMOOTHING_CYCLES ||
            finalClassification.equals(classification);
        
        if (shouldUpdate) {
            currentClassification = finalClassification;
            currentScore = finalScore;
            // Store segment scores for current window
            currentFuturesScore = futuresScore;
            currentCallsScore = callsScore;
            currentPutsScore = putsScore;
        }
    }
    
    /**
     * Extract metrics from contracts list.
     */
    private Metrics extractMetrics(List<DerivativeContract> contracts) {
        if (contracts == null || contracts.isEmpty()) {
            return null;
        }
        
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
        
        Double ltp = contract.getLastPrice() != null ? contract.getLastPrice().doubleValue() : null;
        Double vol = (double) contract.getVolume();
        Double bid = contract.getBid() != null ? contract.getBid().doubleValue() : null;
        Double ask = contract.getAsk() != null ? contract.getAsk().doubleValue() : null;
        Double bidQty = contract.getBidQuantity() != null ? contract.getBidQuantity().doubleValue() : null;
        Double askQty = contract.getAskQuantity() != null ? contract.getAskQuantity().doubleValue() : null;
        
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
     * Update cache with new metrics.
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
        }
    }
    
    /**
     * Calculate delta as percent change from current vs average of cache.
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
     */
    private int getDirection(double delta, double threshold) {
        if (delta > threshold) return 1;
        if (delta < -threshold) return -1;
        return 0;
    }
    
    /**
     * Calculate score for a segment.
     */
    private double calculateSegmentScore(Metrics current, Map<String, List<Double>> cache, String segmentType) {
        double ltpDelta = calculateDelta(current.ltp, cache.get("ltp"));
        double volDelta = calculateDelta(current.vol, cache.get("vol"));
        double bidDelta = calculateDelta(current.bid, cache.get("bid"));
        double askDelta = calculateDelta(current.ask, cache.get("ask"));
        double bidQtyDelta = calculateDelta(current.bidQty, cache.get("bidQty"));
        double askQtyDelta = calculateDelta(current.askQty, cache.get("askQty"));
        
        int ltpDir = getDirection(ltpDelta, 0.1);
        int volDir = getDirection(volDelta, 0.1);
        int bidDir = getDirection(bidDelta, 0.1);
        int askDir = getDirection(askDelta, 0.1);
        int bidQtyDir = getDirection(bidQtyDelta, 0.1);
        int askQtyDir = getDirection(askQtyDelta, 0.1);
        
        double score = 0;
        
        if (segmentType.equals("futures") || segmentType.equals("calls")) {
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
            
            if (askDir == -1) {
                score += WEIGHT_ASK * 0.5;
            } else if (askDir == 1) {
                score *= 0.85;
            }
            
            if (current.bidQty > 0 && current.askQty > 0) {
                double depthRatio = current.bidQty / current.askQty;
                if (depthRatio > 1.2) {
                    score += 0.3;
                } else if (depthRatio < 0.8) {
                    score -= 0.3;
                }
            }
            
        } else if (segmentType.equals("puts")) {
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
            
            if (askDir == 1) {
                score += WEIGHT_ASK * 0.5;
            } else if (askDir == -1) {
                score *= 0.85;
            }
            
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
