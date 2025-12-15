package com.zerodha.dashboard.service;

import com.zerodha.dashboard.model.DerivativeContract;
import com.zerodha.dashboard.model.DerivativesChain;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Service to calculate spot LTP trend with stability confirmation.
 * 
 * Implements a stable Spot LTP Trend indicator that determines whether the spot price
 * has moved UP, DOWN, or NEUTRAL over a user-configurable time window (3s-50s).
 * 
 * Calculation Logic:
 * 1. Maintains rolling buffer of Spot LTP values matching the window duration
 * 2. Calculates net movement: delta = endLTP - startLTP, deltaPercent = (delta / startLTP) * 100
 * 3. Applies noise filtering: MIN_MOVE_PERCENT = 0.02%
 * 4. Stability check: Counts upMoves and downMoves, calculates dominance ratios
 * 5. Confirmation: UP if upRatio >= 60%, DOWN if downRatio >= 60%, else NEUTRAL
 * 
 * Output: trend (UP/DOWN/NEUTRAL), deltaPercent, windowSeconds
 * No tick-by-tick updates - only one consolidated value per computation cycle.
 */
@Service
public class SpotLtpTrendService {
    
    private static final Logger log = LoggerFactory.getLogger(SpotLtpTrendService.class);
    
    // Feature and symbol constants for WindowManager
    private static final String SPOT_LTP_FEATURE = "spotLtpMovement";
    private static final String SPOT_LTP_SYMBOL = "NIFTY"; // Spot LTP is chain-level
    
    // Configuration constants
    private static final double MIN_MOVE_PERCENT = 0.02; // Minimum movement threshold (0.02%)
    private static final double CONFIRMATION_THRESHOLD = 0.60; // 60% directional dominance required
    
    // Configurable window in seconds (default 10s, range 3s-50s)
    private volatile int windowSeconds = 10;
    
    // Use WindowManager for synchronized window tracking
    private final WindowManager windowManager;
    
    // Rolling buffer of LTP values with timestamps
    private final List<LtpSnapshot> ltpBuffer = new ArrayList<>();
    
    // COMPLETED WINDOW RESULT - Result from PREVIOUS completed window (DISPLAYED IN UI)
    private volatile double completedTrendPercent = 0.0;
    private volatile String completedTrendDirection = "NEUTRAL";
    
    // CURRENT WINDOW RESULT - Running calculation for CURRENT window (NOT displayed until window completes)
    private volatile double currentTrendPercent = 0.0;
    private volatile String currentTrendDirection = "NEUTRAL";
    
    // Track if we've completed at least one window
    private volatile boolean hasCompletedWindow = false;
    
    public SpotLtpTrendService(WindowManager windowManager) {
        this.windowManager = windowManager;
    }
    
    /**
     * Simple snapshot of LTP at a point in time.
     */
    private static class LtpSnapshot {
        final double ltp;
        final Instant timestamp;
        
        LtpSnapshot(double ltp, Instant timestamp) {
            this.ltp = ltp;
            this.timestamp = timestamp;
        }
    }
    
    /**
     * Set the window size in seconds (3-50s).
     * CRITICAL: Uses WindowManager's normalized value to ensure synchronization.
     */
    public void setWindowSeconds(int seconds) {
        if (seconds < 3) seconds = 3;
        if (seconds > 50) seconds = 50;
        
        // Normalize to supported window size (ensures WindowManager and SpotLtpTrendService use same value)
        int normalizedSeconds = WindowManager.getClosestSupportedWindow(SPOT_LTP_FEATURE, seconds);
        if (normalizedSeconds != seconds) {
            log.info("SPOT_LTP_TREND WINDOW NORMALIZATION: Requested {}s -> Normalized {}s (supported windows: {})", 
                seconds, normalizedSeconds, 
                java.util.Arrays.toString(WindowManager.SUPPORTED_WINDOWS.get(SPOT_LTP_FEATURE)));
        }
        
        int oldWindow = this.windowSeconds;
        this.windowSeconds = normalizedSeconds; // Use normalized value to match WindowManager
        
        if (oldWindow != normalizedSeconds) {
            // Reset window tracking when size changes
            // Synchronize with WindowManager (pass normalized value)
            windowManager.updateWindowSize(SPOT_LTP_FEATURE, SPOT_LTP_SYMBOL, normalizedSeconds);
            synchronized (ltpBuffer) {
                ltpBuffer.clear();
            }
            currentTrendPercent = 0.0;
            currentTrendDirection = "NEUTRAL";
            hasCompletedWindow = false;
            // DON'T clear completedTrendPercent/Direction - keep displaying last result for smooth transition
            log.info("SPOT_LTP_TREND WINDOW SIZE CHANGED: {}s -> {}s (normalized from {}s). Buffer cleared. hasCompletedWindow=false. Display: {} ({}%)", 
                oldWindow, normalizedSeconds, seconds, completedTrendDirection, String.format("%.2f", completedTrendPercent));
        }
    }
    
    /**
     * Get the current window size in seconds.
     */
    public int getWindowSeconds() {
        return windowSeconds;
    }
    
    /**
     * Calculate the spot LTP trend for a derivatives chain.
     * Uses discrete time windows - calculates for window N, displays result during window N+1.
     * 
     * Calculation follows the specified algorithm:
     * 1. Maintain rolling buffer of LTP values matching window duration
     * 2. Calculate delta = endLTP - startLTP, deltaPercent = (delta / startLTP) * 100
     * 3. Apply noise filtering (MIN_MOVE_PERCENT = 0.02%)
     * 4. Stability check: count upMoves/downMoves, calculate dominance ratios
     * 5. Confirmation: UP if upRatio >= 60%, DOWN if downRatio >= 60%, else NEUTRAL
     * 
     * Output: trend (UP/DOWN/NEUTRAL), deltaPercent, windowSeconds
     * No tick-by-tick updates - only one consolidated value per computation cycle.
     */
    public void calculateSpotLtpTrend(DerivativesChain chain) {
        if (chain == null) {
            return;
        }
        
        try {
            // Get the actual spot price (NIFTY index price) from the chain
            Double currentSpotPrice = extractSpotPrice(chain);
            
            if (currentSpotPrice == null || currentSpotPrice <= 0) {
                log.debug("calculateSpotLtpTrend: No spot price available");
                // Maintain previous completed values
                chain.setSpotLtpTrendPercent(completedTrendPercent);
                chain.setSpotLtpTrendDirection(completedTrendDirection);
                return;
            }
            
            Instant now = Instant.now();
            
            // Use WindowManager for synchronized window tracking
            WindowManager.WindowState windowState = windowManager.getWindowState(
                SPOT_LTP_FEATURE, SPOT_LTP_SYMBOL, windowSeconds);
            
            // Check if we've moved to a new window (synchronized with WindowManager)
            boolean windowChanged = windowState.checkAndUpdateWindow(now);
            
            if (windowChanged && windowState.hasCompletedWindow()) {
                // Window completed! Commit current result as completed result
                log.info("SPOT_LTP_TREND WINDOW CHANGE: Window completed at epoch {}. Committing: {} ({}%). Window size: {}s",
                    now.getEpochSecond(), currentTrendDirection, String.format("%.2f", currentTrendPercent), windowSeconds);
                
                // Commit current to completed
                completedTrendPercent = currentTrendPercent;
                completedTrendDirection = currentTrendDirection;
                hasCompletedWindow = true;
                
                // Clear buffer for new window (keep only values within new window)
                synchronized (ltpBuffer) {
                    Instant windowStart = windowState.getWindowStartTime();
                    if (windowStart != null) {
                        ltpBuffer.removeIf(snapshot -> snapshot.timestamp.isBefore(windowStart));
                    }
                }
                
                // Reset current calculation for new window
                currentTrendPercent = 0.0;
                currentTrendDirection = "NEUTRAL";
                
                log.info("SPOT_LTP_TREND WINDOW CHANGE: New window started: {}s-{}s. Display now: {} ({}%)", 
                    windowState.getWindowStartTime().getEpochSecond(), 
                    windowState.getWindowEndTime().getEpochSecond(),
                    completedTrendDirection, String.format("%.2f", completedTrendPercent));
            }
            
            // Maintain rolling buffer: remove values outside current window
            Instant windowStart = windowState.getWindowStartTime();
            if (windowStart != null) {
                Instant windowEnd = windowStart.plusSeconds(windowSeconds);
                synchronized (ltpBuffer) {
                    // Remove values outside the current window
                    ltpBuffer.removeIf(snapshot -> 
                        snapshot.timestamp.isBefore(windowStart) || snapshot.timestamp.isAfter(windowEnd));
                }
            }
            
            // Add current spot price to buffer
            synchronized (ltpBuffer) {
                ltpBuffer.add(new LtpSnapshot(currentSpotPrice, now));
            }
            
            // Calculate trend for current window using the specified algorithm
            synchronized (ltpBuffer) {
                if (ltpBuffer.size() >= 2) {
                    TrendResult result = calculateTrendWithStabilityCheck(ltpBuffer);
                    currentTrendPercent = result.deltaPercent;
                    currentTrendDirection = result.direction;
                    
                    log.debug("Spot LTP Trend: deltaPercent={}%, direction={}, bufferSize={}", 
                        String.format("%.4f", result.deltaPercent), 
                        result.direction,
                        ltpBuffer.size());
                }
            }
            
            // Determine what to display
            double displayPercent;
            String displayDirection;
            
            if (hasCompletedWindow) {
                // After first window completes: ALWAYS show completed result (stable)
                displayPercent = completedTrendPercent;
                displayDirection = completedTrendDirection;
            } else {
                // Before first window completes: Show current calculation
                displayPercent = currentTrendPercent;
                displayDirection = currentTrendDirection;
            }
            
            // Set on chain (convert direction to match existing format: UP/DOWN/NEUTRAL)
            chain.setSpotLtpTrendPercent(displayPercent);
            // Map NEUTRAL to FLAT for backward compatibility with existing UI
            String chainDirection = "NEUTRAL".equals(displayDirection) ? "FLAT" : displayDirection;
            chain.setSpotLtpTrendDirection(chainDirection);
            
        } catch (Exception e) {
            log.error("Error calculating spot LTP trend: {}", e.getMessage(), e);
            // Maintain previous completed values on error
            chain.setSpotLtpTrendPercent(completedTrendPercent);
            chain.setSpotLtpTrendDirection("NEUTRAL".equals(completedTrendDirection) ? "FLAT" : completedTrendDirection);
        }
    }
    
    /**
     * Result of trend calculation.
     */
    private static class TrendResult {
        final double deltaPercent;
        final String direction; // UP, DOWN, or NEUTRAL
        
        TrendResult(double deltaPercent, String direction) {
            this.deltaPercent = deltaPercent;
            this.direction = direction;
        }
    }
    
    /**
     * Calculate trend with stability confirmation check.
     * 
     * Algorithm:
     * 1. Calculate delta = endLTP - startLTP, deltaPercent = (delta / startLTP) * 100
     * 2. Apply noise filtering: if |deltaPercent| < MIN_MOVE_PERCENT, mark as NEUTRAL
     * 3. Count upMoves and downMoves in the buffer
     * 4. Calculate dominance ratios: upRatio = upMoves / totalMoves, downRatio = downMoves / totalMoves
     * 5. Confirmation: UP if upRatio >= 60%, DOWN if downRatio >= 60%, else NEUTRAL
     */
    private TrendResult calculateTrendWithStabilityCheck(List<LtpSnapshot> buffer) {
        if (buffer.size() < 2) {
            return new TrendResult(0.0, "NEUTRAL");
        }
        
        // STEP 1: Calculate net movement (startLTP to endLTP)
        LtpSnapshot startLtp = buffer.get(0);
        LtpSnapshot endLtp = buffer.get(buffer.size() - 1);
        
        if (startLtp.ltp <= 0) {
            return new TrendResult(0.0, "NEUTRAL");
        }
        
        double delta = endLtp.ltp - startLtp.ltp;
        double deltaPercent = (delta / startLtp.ltp) * 100.0;
        
        // STEP 2: Apply noise filtering
        if (Math.abs(deltaPercent) < MIN_MOVE_PERCENT) {
            return new TrendResult(deltaPercent, "NEUTRAL");
        }
        
        // STEP 3: Count upMoves and downMoves
        int upMoves = 0;
        int downMoves = 0;
        int totalMoves = 0;
        
        for (int i = 1; i < buffer.size(); i++) {
            LtpSnapshot prev = buffer.get(i - 1);
            LtpSnapshot curr = buffer.get(i);
            
            if (prev.ltp > 0) {
                if (curr.ltp > prev.ltp) {
                    upMoves++;
                    totalMoves++;
                } else if (curr.ltp < prev.ltp) {
                    downMoves++;
                    totalMoves++;
                }
                // If equal, don't count as a move
            }
        }
        
        // STEP 4: Calculate dominance ratios and apply confirmation rule
        if (totalMoves == 0) {
            // No moves detected, use deltaPercent direction
            if (deltaPercent > 0) {
                return new TrendResult(deltaPercent, "UP");
            } else if (deltaPercent < 0) {
                return new TrendResult(deltaPercent, "DOWN");
            } else {
                return new TrendResult(deltaPercent, "NEUTRAL");
            }
        }
        
        double upRatio = (double) upMoves / totalMoves;
        double downRatio = (double) downMoves / totalMoves;
        
        // STEP 5: Confirmation rule
        if (upRatio >= CONFIRMATION_THRESHOLD) {
            // Confirm UP only if upRatio >= 60%
            return new TrendResult(deltaPercent, "UP");
        } else if (downRatio >= CONFIRMATION_THRESHOLD) {
            // Confirm DOWN only if downRatio >= 60%
            return new TrendResult(deltaPercent, "DOWN");
        } else {
            // Neither direction has 60% dominance - mark as NEUTRAL
            return new TrendResult(deltaPercent, "NEUTRAL");
        }
    }
    
    /**
     * Extract actual spot price from the chain.
     * Uses chain.getSpotPrice() which is the actual NIFTY index price from the API.
     * Falls back to first futures LTP only if spot price is not available.
     */
    private Double extractSpotPrice(DerivativesChain chain) {
        // PRIORITY 1: Use actual spot price from chain (NIFTY index price)
        if (chain.getSpotPrice() != null) {
            return chain.getSpotPrice().doubleValue();
        }
        
        // PRIORITY 2: Fallback to first futures LTP (if spot price not available)
        // Note: Futures LTP may have premium/discount, so it's less accurate
        if (chain.getFutures() != null && !chain.getFutures().isEmpty()) {
            for (DerivativeContract contract : chain.getFutures()) {
                if (contract != null && contract.getLastPrice() != null) {
                    log.debug("Using futures LTP as fallback for spot price: {}", contract.getLastPrice());
                    return contract.getLastPrice().doubleValue();
                }
            }
        }
        
        return null;
    }
    
    /**
     * Get current trend percent (completed window value).
     */
    public double getTrendPercent() {
        return completedTrendPercent;
    }
    
    /**
     * Get current trend direction (completed window value).
     * Returns: UP, DOWN, or NEUTRAL
     */
    public String getTrendDirection() {
        return completedTrendDirection;
    }
}


