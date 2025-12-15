package com.zerodha.dashboard.service;

import com.zerodha.dashboard.constants.WindowConstants;
import com.zerodha.dashboard.model.DerivativeContract;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service to calculate LTP (Last Traded Price) movement direction, confidence, and intensity.
 * 
 * CRITICAL ARCHITECTURE:
 * - Time-driven windows (NOT API-poll-driven)
 * - Immutable completed window results
 * - Accumulators only (NO event lists)
 * - FLAT movements (below threshold) are IGNORED
 * - Window rollover happens BEFORE calculation
 * - Snapshot updates happen AFTER window handling
 * - All contracts share the same window clock
 */
@Service
public class LtpMovementService {
    
    private static final Logger log = LoggerFactory.getLogger(LtpMovementService.class);
    
    /**
     * Minimum change percentage to consider a movement (FLAT movements are ignored).
     */
    private static final double MIN_CHANGE_PERCENT = 0.01; // 0.01%
    
    /**
     * High confidence threshold for intensity calculation.
     */
    private static final int HIGH_CONFIDENCE_THRESHOLD = 70;
    
    /**
     * High movement threshold for intensity calculation.
     */
    private static final double HIGH_MOVEMENT_THRESHOLD = 0.1; // 0.1%
    
    /**
     * Window size in milliseconds (configurable via context).
     * All contracts share the same window size for synchronized updates.
     */
    private volatile long windowSizeMillis = WindowConstants.DEFAULT_WINDOW_SECONDS * 1000L;
    
    /**
     * Movement cache size (number of movements to track for pattern detection).
     */
    private volatile int movementCacheSize = WindowConstants.DEFAULT_MOVEMENT_CACHE_SIZE;
    
    /**
     * Per-contract state storage.
     * Key: instrumentToken
     * Value: ContractLtpMovementState
     */
    private final Map<String, ContractLtpMovementState> contractStates = new ConcurrentHashMap<>();
    
    /**
     * Snapshot of LTP from previous API poll.
     */
    private static class LtpSnapshot {
        final BigDecimal lastPrice;
        
        LtpSnapshot(BigDecimal lastPrice) {
            this.lastPrice = lastPrice;
        }
    }
    
    /**
     * Movement entry (UP or DOWN only - FLAT is ignored).
     */
    private static class Movement {
        final String direction; // "UP" or "DOWN"
        @SuppressWarnings("unused")
        final double changePercent; // Used for maxChangePercent tracking in accumulator
        
        Movement(String direction, double changePercent) {
            this.direction = direction;
            this.changePercent = changePercent;
        }
    }
    
    /**
     * Pattern detection result.
     */
    private static class PatternResult {
        boolean hasHH; // Higher High: UP, UP
        boolean hasHL; // Higher Low: UP, DOWN
        boolean hasLH; // Lower High: DOWN, UP
        boolean hasLL; // Lower Low: DOWN, DOWN
        
        PatternResult() {
            this.hasHH = false;
            this.hasHL = false;
            this.hasLH = false;
            this.hasLL = false;
        }
    }
    
    /**
     * LTP window accumulator - accumulates movements within a window.
     * NO event lists - just counts and sequence.
     */
    private static class LtpWindowAccumulator {
        final long windowId;
        int upCount;
        int downCount;
        double maxChangePercent;
        final List<Movement> sequence; // UP / DOWN only
        
        LtpWindowAccumulator(long windowId) {
            this.windowId = windowId;
            this.upCount = 0;
            this.downCount = 0;
            this.maxChangePercent = 0.0;
            this.sequence = new ArrayList<>();
        }
        
        void addMovement(String movement, double changePercent) {
            sequence.add(new Movement(movement, changePercent));
            maxChangePercent = Math.max(maxChangePercent, changePercent);
            
            if ("UP".equals(movement)) {
                upCount++;
            } else if ("DOWN".equals(movement)) {
                downCount++;
            }
        }
        
        boolean hasData() {
            return sequence.size() >= 2; // Need at least 2 movements for pattern detection
        }
        
        /**
         * Detect patterns in the movement sequence.
         */
        PatternResult detectPatterns() {
            PatternResult patterns = new PatternResult();
            
            if (sequence.size() < 2) {
                return patterns;
            }
            
            // Check all consecutive pairs
            for (int i = 0; i < sequence.size() - 1; i++) {
                String first = sequence.get(i).direction;
                String second = sequence.get(i + 1).direction;
                
                if ("UP".equals(first) && "UP".equals(second)) {
                    patterns.hasHH = true; // Higher High
                } else if ("UP".equals(first) && "DOWN".equals(second)) {
                    patterns.hasHL = true; // Higher Low
                } else if ("DOWN".equals(first) && "UP".equals(second)) {
                    patterns.hasLH = true; // Lower High
                } else if ("DOWN".equals(first) && "DOWN".equals(second)) {
                    patterns.hasLL = true; // Lower Low
                }
            }
            
            return patterns;
        }
        
        /**
         * Finalize window result (called once per window).
         */
        LtpWindowResult toResult() {
            PatternResult patterns = detectPatterns();
            
            String direction = "NEUTRAL";
            int confidence = 0;
            String intensity = "SLOW";
            
            // Determine direction: UP = HH OR HL, DOWN = LH OR LL
            if (patterns.hasHH || patterns.hasHL) {
                direction = "UP";
            } else if (patterns.hasLH || patterns.hasLL) {
                direction = "DOWN";
            }
            
            // Calculate confidence
            int total = upCount + downCount;
            if (total > 0) {
                int dominant = Math.max(upCount, downCount);
                confidence = (int) Math.round((double) dominant / total * 100);
                
                // Boost confidence if both patterns present
                if ((patterns.hasHH && patterns.hasHL) || (patterns.hasLH && patterns.hasLL)) {
                    confidence = (int) Math.round(confidence * 1.2);
                }
                
                confidence = Math.min(confidence, 100);
            }
            
            // Calculate intensity
            boolean isHighMovement = confidence >= HIGH_CONFIDENCE_THRESHOLD 
                || maxChangePercent >= HIGH_MOVEMENT_THRESHOLD;
            intensity = isHighMovement ? "HIGH" : "SLOW";
            
            return new LtpWindowResult(windowId, direction, confidence, intensity);
        }
    }
    
    /**
     * Immutable window result - created once when window completes, never modified.
     */
    public static class LtpWindowResult {
        public final long windowId;
        public final String direction;
        public final int confidence;
        public final String intensity;
        
        LtpWindowResult(long windowId, String direction, int confidence, String intensity) {
            this.windowId = windowId;
            this.direction = direction;
            this.confidence = confidence;
            this.intensity = intensity;
        }
    }
    
    /**
     * Per-contract state following the authoritative data model.
     */
    private static class ContractLtpMovementState {
        LtpSnapshot lastSnapshot;              // LTP from previous poll
        long activeWindowId;                   // Current window ID (derived from epoch time)
        LtpWindowAccumulator activeWindow;     // Current in-progress window accumulator
        LtpWindowResult lastCompletedWindow;   // IMMUTABLE - UI reads this only
        
        ContractLtpMovementState(long initialWindowId) {
            this.lastSnapshot = null;
            this.activeWindowId = initialWindowId;
            this.activeWindow = new LtpWindowAccumulator(initialWindowId);
            this.lastCompletedWindow = null; // null means no completed window yet
        }
    }
    
    /**
     * Compute window ID from current time.
     * Single source of truth for window identification.
     * windowId = floor(currentEpochMillis / windowSizeMillis)
     */
    private long computeWindowId(long currentEpochMillis) {
        return currentEpochMillis / windowSizeMillis;
    }
    
    /**
     * Set window size in seconds.
     * Normalizes to supported window sizes.
     */
    public void setWindowSeconds(int seconds) {
        if (seconds < WindowConstants.MIN_WINDOW_SECONDS) {
            seconds = WindowConstants.MIN_WINDOW_SECONDS;
        }
        if (seconds > WindowConstants.MAX_WINDOW_SECONDS) {
            seconds = WindowConstants.MAX_WINDOW_SECONDS;
        }
        
        // Normalize to supported window size
        int normalizedSeconds = WindowManager.getClosestSupportedWindow("ltpMovement", seconds);
        long newWindowSizeMillis = normalizedSeconds * 1000L;
        
        if (newWindowSizeMillis != windowSizeMillis) {
            log.info("LTP_MOVEMENT: Window size changed from {}ms to {}ms ({}s). " +
                "Existing windows will continue with old size until rollover.",
                windowSizeMillis, newWindowSizeMillis, normalizedSeconds);
            windowSizeMillis = newWindowSizeMillis;
            // Note: Don't clear states - let them rollover naturally with new window size
        }
    }
    
    /**
     * Get current window size in seconds.
     */
    public int getWindowSeconds() {
        return (int) (windowSizeMillis / 1000L);
    }
    
    /**
     * Set movement cache size (number of movements to track).
     */
    public void setMovementCacheSize(int size) {
        if (size < WindowConstants.MIN_MOVEMENT_CACHE_SIZE) {
            size = WindowConstants.MIN_MOVEMENT_CACHE_SIZE;
        }
        if (size > WindowConstants.MAX_MOVEMENT_CACHE_SIZE) {
            size = WindowConstants.MAX_MOVEMENT_CACHE_SIZE;
        }
        
        int oldSize = this.movementCacheSize;
        this.movementCacheSize = size;
        
        // Clear all states when cache size changes
        contractStates.clear();
        log.info("LTP movement cache size set to {} movements (was {} movements)", size, oldSize);
    }
    
    /**
     * Get current movement cache size.
     */
    public int getMovementCacheSize() {
        return movementCacheSize;
    }
    
    /**
     * Process API poll for a contract.
     * 
     * CRITICAL ORDER (DO NOT CHANGE):
     * 1. Compute window ID
     * 2. Handle window rollover FIRST (if needed)
     * 3. Calculate movement (only if snapshot exists)
     * 4. Add to accumulator (only if non-FLAT)
     * 5. Update snapshot LAST
     */
    public void processApiPoll(DerivativeContract contract, Instant pollTimestamp) {
        if (contract == null || contract.getInstrumentToken() == null) {
            return;
        }
        
        String instrumentToken = contract.getInstrumentToken();
        BigDecimal currentLtp = contract.getLastPrice();
        
        if (currentLtp == null) {
            log.debug("LTP_MOVEMENT: No LTP for {}, skipping", instrumentToken);
            return;
        }
        
        // Use poll timestamp in milliseconds for window calculation
        long currentEpochMillis = pollTimestamp.toEpochMilli();
        
        // Compute window ID (single source of truth)
        long windowId = computeWindowId(currentEpochMillis);
        
        // Get or create contract state
        ContractLtpMovementState state = contractStates.computeIfAbsent(instrumentToken, 
            k -> new ContractLtpMovementState(windowId));
        
        // STEP 1: HANDLE WINDOW ROLLOVER FIRST
        if (windowId != state.activeWindowId) {
            // Window has changed - finalize previous window
            if (state.activeWindow.hasData()) {
                // Finalize and store completed window result (IMMUTABLE)
                state.lastCompletedWindow = state.activeWindow.toResult();
                log.info("LTP_MOVEMENT: Window {} completed for {} - direction={}, confidence={}, intensity={}, movementsCount={}",
                    state.activeWindowId, instrumentToken,
                    state.lastCompletedWindow.direction,
                    state.lastCompletedWindow.confidence,
                    state.lastCompletedWindow.intensity,
                    state.activeWindow.sequence.size());
            } else {
                // Window had no data (less than 2 movements) - no completed result
                log.debug("LTP_MOVEMENT: Window {} completed for {} with insufficient data (need at least 2 movements)",
                    state.activeWindowId, instrumentToken);
            }
            
            // Start new window
            state.activeWindow = new LtpWindowAccumulator(windowId);
            state.activeWindowId = windowId;
            log.debug("LTP_MOVEMENT: Started new window {} for {}", windowId, instrumentToken);
        }
        
        // STEP 2: USE POLLED VALUE FOR CALCULATION (ONLY IF SNAPSHOT EXISTS)
        if (state.lastSnapshot != null && state.lastSnapshot.lastPrice != null) {
            BigDecimal lastLtp = state.lastSnapshot.lastPrice;
            
            // Calculate delta and change percentage
            BigDecimal delta = currentLtp.subtract(lastLtp);
            double changePercent = 0.0;
            
            if (lastLtp.compareTo(BigDecimal.ZERO) != 0) {
                changePercent = Math.abs(delta.divide(lastLtp, 6, RoundingMode.HALF_UP)
                    .multiply(BigDecimal.valueOf(100)).doubleValue());
            }
            
            // STEP 3: IGNORE FLAT MOVEMENTS (below threshold)
            if (changePercent >= MIN_CHANGE_PERCENT) {
                // Determine movement direction
                String movement = delta.compareTo(BigDecimal.ZERO) > 0 ? "UP" : "DOWN";
                
                // Add to active window accumulator
                state.activeWindow.addMovement(movement, changePercent);
                
                log.debug("LTP_MOVEMENT: Added movement to window {} for {} - movement={}, changePercent={:.4f}%, " +
                    "window totals: upCount={}, downCount={}, maxChangePercent={:.4f}%",
                    windowId, instrumentToken, movement, changePercent,
                    state.activeWindow.upCount, state.activeWindow.downCount, state.activeWindow.maxChangePercent);
            } else {
                // FLAT movement - ignored (not added to accumulator)
                log.debug("LTP_MOVEMENT: FLAT movement for {} - changePercent={:.4f}% < MIN_CHANGE_PERCENT={:.2f}% (ignored)",
                    instrumentToken, changePercent, MIN_CHANGE_PERCENT);
            }
        } else {
            // First poll - no snapshot yet, just initialize
            log.debug("LTP_MOVEMENT: First poll for {} - initializing snapshot", instrumentToken);
        }
        
        // STEP 4: UPDATE SNAPSHOT LAST
        state.lastSnapshot = new LtpSnapshot(currentLtp);
    }
    
    /**
     * Get the last completed window result for a contract.
     * Returns null if no window has completed yet (UI should show neutral/empty state).
     * 
     * CRITICAL: This is the ONLY value the UI should read.
     * Do NOT expose activeWindow or partial sums.
     */
    public LtpWindowResult getLastCompletedWindow(String instrumentToken) {
        ContractLtpMovementState state = contractStates.get(instrumentToken);
        if (state == null) {
            return null; // No state yet - UI shows neutral/empty
        }
        return state.lastCompletedWindow; // May be null if no window completed yet
    }
    
    /**
     * Get window metadata for UI timer display.
     * Returns window start/end times based on current window.
     */
    public WindowMetadata getWindowMetadata(Instant now) {
        long currentEpochMillis = now.toEpochMilli();
        long windowId = computeWindowId(currentEpochMillis);
        long windowStartMillis = windowId * windowSizeMillis;
        long windowEndMillis = windowStartMillis + windowSizeMillis;
        
        return new WindowMetadata(
            Instant.ofEpochMilli(windowStartMillis),
            Instant.ofEpochMilli(windowEndMillis),
            (int) (windowSizeMillis / 1000L)
        );
    }
    
    /**
     * Window metadata for UI timer display.
     */
    public static class WindowMetadata {
        public final Instant windowStart;
        public final Instant windowEnd;
        public final int windowSeconds;
        
        WindowMetadata(Instant windowStart, Instant windowEnd, int windowSeconds) {
            this.windowStart = windowStart;
            this.windowEnd = windowEnd;
            this.windowSeconds = windowSeconds;
        }
    }
    
    /**
     * Clear all state (useful for testing or reset).
     */
    public void clearAll() {
        contractStates.clear();
        log.info("LTP_MOVEMENT: Cleared all contract states");
    }
    
    /**
     * Clear state for a specific contract.
     */
    public void clearContract(String instrumentToken) {
        contractStates.remove(instrumentToken);
        log.debug("LTP_MOVEMENT: Cleared state for {}", instrumentToken);
    }
}
