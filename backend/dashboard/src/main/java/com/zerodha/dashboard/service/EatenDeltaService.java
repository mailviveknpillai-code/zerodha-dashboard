package com.zerodha.dashboard.service;

import com.zerodha.dashboard.constants.WindowConstants;
import com.zerodha.dashboard.model.DerivativeContract;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Service to calculate "Eaten Δ" (Eaten Difference) metric.
 *
 * CRITICAL ARCHITECTURE:
 * - Time-driven windows (NOT API-poll-driven)
 * - Immutable completed window results
 * - Accumulators only (NO event lists)
 * - Zero-change polls are IGNORED
 * - Window rollover happens BEFORE calculation
 * - Snapshot updates happen AFTER window handling
 * - All contracts share the same window clock
 */
@Service
public class EatenDeltaService {
    
    private static final Logger log = LoggerFactory.getLogger(EatenDeltaService.class);
    
    /**
     * Window size in milliseconds (configurable via context).
     * All contracts share the same window size for synchronized updates.
     */
    private volatile long windowSizeMillis = WindowConstants.DEFAULT_WINDOW_SECONDS * 1000L;
    
    /**
     * Per-contract state storage.
     * Key: instrumentToken
     * Value: ContractEatenState
     */
    private final Map<String, ContractEatenState> contractStates = new ConcurrentHashMap<>();
    
    /**
     * Snapshot of bid/ask quantities from previous API poll.
     */
    private static class Snapshot {
        final Long bidQty;
        final Long askQty;
        
        Snapshot(Long bidQty, Long askQty) {
            this.bidQty = bidQty;
            this.askQty = askQty;
        }
    }
    
    /**
     * Window accumulator - accumulates eaten values within a window.
     * NO event lists - just running sums.
     */
    private static class WindowAccumulator {
        final long windowId;
        long askEatenSum;
        long bidEatenSum;
        
        WindowAccumulator(long windowId) {
            this.windowId = windowId;
            this.askEatenSum = 0L;
            this.bidEatenSum = 0L;
        }
        
        void add(long askEaten, long bidEaten) {
            askEatenSum += askEaten;
            bidEatenSum += bidEaten;
        }
        
        boolean hasData() {
            return askEatenSum > 0 || bidEatenSum > 0;
        }
        
        WindowResult toResult() {
            long eatenDelta = askEatenSum - bidEatenSum;
            return new WindowResult(windowId, askEatenSum, bidEatenSum, eatenDelta);
        }
    }
    
    /**
     * Immutable window result - created once when window completes, never modified.
     */
    public static class WindowResult {
        public final long windowId;
        public final long askEaten;
        public final long bidEaten;
        public final long eatenDelta;
        
        WindowResult(long windowId, long askEaten, long bidEaten, long eatenDelta) {
            this.windowId = windowId;
            this.askEaten = askEaten;
            this.bidEaten = bidEaten;
            this.eatenDelta = eatenDelta;
        }
    }
    
    /**
     * Per-contract state following the authoritative data model.
     */
    private static class ContractEatenState {
        Snapshot lastSnapshot;              // bidQty, askQty from previous poll
        long activeWindowId;                // Current window ID (derived from epoch time)
        WindowAccumulator activeWindow;     // Current in-progress window accumulator
        WindowResult lastCompletedWindow;   // IMMUTABLE - UI reads this only
        
        ContractEatenState(long initialWindowId) {
            this.lastSnapshot = null;
            this.activeWindowId = initialWindowId;
            this.activeWindow = new WindowAccumulator(initialWindowId);
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
    public void setRollingWindowSeconds(int seconds) {
        if (seconds < WindowConstants.MIN_WINDOW_SECONDS) {
            seconds = WindowConstants.MIN_WINDOW_SECONDS;
        }
        if (seconds > WindowConstants.MAX_WINDOW_SECONDS) {
            seconds = WindowConstants.MAX_WINDOW_SECONDS;
        }
        
        // Normalize to supported window size
        int normalizedSeconds = WindowManager.getClosestSupportedWindow("bidAskEaten", seconds);
        long newWindowSizeMillis = normalizedSeconds * 1000L;
        
        if (newWindowSizeMillis != windowSizeMillis) {
            log.info("EATEN_DELTA: Window size changed from {}ms to {}ms ({}s). " +
                "Existing windows will continue with old size until rollover.",
                windowSizeMillis, newWindowSizeMillis, normalizedSeconds);
            windowSizeMillis = newWindowSizeMillis;
            // Note: Don't clear states - let them rollover naturally with new window size
        }
    }
    
    /**
     * Get current window size in seconds.
     */
    public int getRollingWindowSeconds() {
        return (int) (windowSizeMillis / 1000L);
    }
    
    /**
     * Process API poll for a contract.
     * 
     * CRITICAL ORDER (DO NOT CHANGE):
     * 1. Compute window ID
     * 2. Handle window rollover FIRST (if needed)
     * 3. Calculate eaten values (only if snapshot exists)
     * 4. Add to accumulator (only if non-zero)
     * 5. Update snapshot LAST
     */
    public void processApiPoll(DerivativeContract contract, Instant now) {
        if (contract == null || contract.getInstrumentToken() == null) {
            return;
        }
        
        String instrumentToken = contract.getInstrumentToken();
        Long currentBidQty = contract.getBidQuantity();
        Long currentAskQty = contract.getAskQuantity();
        
        // Use current time in milliseconds for window calculation
        long currentEpochMillis = now.toEpochMilli();
        
        // Compute window ID (single source of truth)
        long windowId = computeWindowId(currentEpochMillis);
        
        // Get or create contract state
        ContractEatenState state = contractStates.computeIfAbsent(instrumentToken, 
            k -> new ContractEatenState(windowId));
        
        // STEP 1: HANDLE WINDOW ROLLOVER FIRST
        if (windowId != state.activeWindowId) {
            // Window has changed - finalize previous window
            if (state.activeWindow.hasData()) {
                // Finalize and store completed window result (IMMUTABLE)
                state.lastCompletedWindow = state.activeWindow.toResult();
                log.info("EATEN_DELTA: Window {} completed for {} - askEaten={}, bidEaten={}, eatenDelta={}",
                    state.activeWindowId, instrumentToken,
                    state.lastCompletedWindow.askEaten,
                    state.lastCompletedWindow.bidEaten,
                    state.lastCompletedWindow.eatenDelta);
            } else {
                // Window had no data - no completed result
                log.debug("EATEN_DELTA: Window {} completed for {} with no data (all zero-change polls)",
                    state.activeWindowId, instrumentToken);
            }
            
            // Start new window
            state.activeWindow = new WindowAccumulator(windowId);
            state.activeWindowId = windowId;
            log.debug("EATEN_DELTA: Started new window {} for {}", windowId, instrumentToken);
        }
        
        // STEP 2: CALCULATE EATEN VALUES (ONLY IF SNAPSHOT EXISTS)
        if (state.lastSnapshot != null) {
            // Calculate eaten values from previous snapshot
            Long lastBidQty = state.lastSnapshot.bidQty != null ? state.lastSnapshot.bidQty : 0L;
            Long lastAskQty = state.lastSnapshot.askQty != null ? state.lastSnapshot.askQty : 0L;
            Long safeBidQty = currentBidQty != null ? currentBidQty : 0L;
            Long safeAskQty = currentAskQty != null ? currentAskQty : 0L;
            
            long askEaten = Math.max(0, lastAskQty - safeAskQty);
            long bidEaten = Math.max(0, lastBidQty - safeBidQty);
            
            // STEP 3: IGNORE ZERO-CHANGE POLLS
            if (askEaten > 0 || bidEaten > 0) {
                // Add to active window accumulator
                state.activeWindow.add(askEaten, bidEaten);
                log.debug("EATEN_DELTA: Added to window {} for {} - askEaten={}, bidEaten={}, " +
                    "window totals: askSum={}, bidSum={}",
                    windowId, instrumentToken, askEaten, bidEaten,
                    state.activeWindow.askEatenSum, state.activeWindow.bidEatenSum);
        } else {
                // Zero-change poll - ignored (not added to accumulator)
                log.debug("EATEN_DELTA: Zero-change poll for {} - askEaten=0, bidEaten=0 (ignored)",
                    instrumentToken);
            }
        } else {
            // First poll - no snapshot yet, just initialize
            log.debug("EATEN_DELTA: First poll for {} - initializing snapshot", instrumentToken);
        }
        
        // STEP 4: UPDATE SNAPSHOT LAST
        state.lastSnapshot = new Snapshot(currentBidQty, currentAskQty);
    }
    
    /**
     * Get the last completed window result for a contract.
     * Returns null if no window has completed yet (UI should show neutral/empty state).
     * 
     * CRITICAL: This is the ONLY value the UI should read.
     * Do NOT expose activeWindow or partial sums.
     */
    public WindowResult getLastCompletedWindow(String instrumentToken) {
        ContractEatenState state = contractStates.get(instrumentToken);
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
        log.info("EATEN_DELTA: Cleared all contract states");
    }
    
    /**
     * Clear state for a specific contract.
     */
    public void clearContract(String instrumentToken) {
        contractStates.remove(instrumentToken);
        log.debug("EATEN_DELTA: Cleared state for {}", instrumentToken);
    }
}
