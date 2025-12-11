package com.zerodha.dashboard.service;

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
 * Tracks bid/ask quantity changes over time to determine how much liquidity
 * has been consumed (eaten) by buyers (ask eaten) vs sellers (bid eaten).
 *
 * IMPORTANT: This service ONLY affects the bubble values (eatenDelta, bidEaten, askEaten).
 * 
 * Update Frequency:
 * - Bid Qty and Ask Qty values come directly from Zerodha API and update at the API polling interval
 * - Delta BA (bidQty - askQty) is calculated in the frontend and updates at the UI refresh rate
 * - Only the bubble values (eatenDelta, bidEaten, askEaten) use the discrete window interval
 * 
 * The window interval ONLY controls how eaten events are aggregated for the bubbles.
 * It does NOT affect:
 * - When backend polls Zerodha API (controlled by API polling interval)
 * - When frontend updates UI values (controlled by UI refresh rate)
 * - When bid/ask qty or delta BA values are updated
 */
@Service
public class EatenDeltaService {
    
    private static final Logger log = LoggerFactory.getLogger(EatenDeltaService.class);
    
    /**
     * Stores previous bid/ask quantities for each instrument.
     * Key: instrumentToken
     * Value: PreviousSnapshot containing bidQty, askQty, and timestamp
     */
    private final Map<String, PreviousSnapshot> previousSnapshots = new ConcurrentHashMap<>();
    
    /**
     * Stores eaten events in discrete time windows.
     * Key: instrumentToken
     * Value: WindowData containing events for the current window and window start time
     * 
     * IMPORTANT: Display Logic
     * - completedWindowResult: The result from the PREVIOUS completed window (this is what we display in UI)
     * - currentWindowResult: The running calculation for the CURRENT window (not displayed until window completes)
     * 
     * Example with 5s window:
     * - 0-5s: Calculate currentWindowResult, display completedWindowResult (initially 0)
     * - At 5s: Window completes, store currentWindowResult → completedWindowResult, display 100
     * - 5-10s: Calculate new currentWindowResult, display completedWindowResult (100)
     * - At 10s: Window completes, store currentWindowResult → completedWindowResult, display new value
     */
    private static class WindowData {
        final java.util.List<EatenEvent> events = new java.util.ArrayList<>();
        Instant windowStartTime;
        volatile int windowSeconds; // Volatile to allow updates from UI
        RollingWindowResult completedWindowResult; // Result from PREVIOUS completed window (displayed in UI)
        RollingWindowResult currentWindowResult; // Running calculation for CURRENT window (not displayed until window completes)
        int lastEventCount; // Track event count to detect changes
        
        WindowData(int windowSeconds) {
            this.windowSeconds = windowSeconds;
            // CRITICAL: Initialize windowStartTime to align with discrete window boundaries
            // This ensures the first window check happens at the correct boundary
            Instant now = Instant.now();
            long currentEpochSecond = now.getEpochSecond();
            long windowNumber = currentEpochSecond / windowSeconds;
            this.windowStartTime = Instant.ofEpochSecond(windowNumber * windowSeconds);
            this.completedWindowResult = new RollingWindowResult(0L, 0L, 0L); // Initialize with zeros (displayed initially)
            this.currentWindowResult = new RollingWindowResult(0L, 0L, 0L); // Current window starts at zero
            this.lastEventCount = 0;
        }
        
        void resetWindow(Instant newStartTime) {
            // When a new window starts:
            // 1. Calculate the completed window's result (may legitimately be 0)
            // 2. Always update completedWindowResult with that result
            // 3. Reset current window to start fresh for new calculations
            //
            // Requirement:
            // - For each discrete window (e.g. 0–5s), compute a value.
            // - During the *next* window (5–10s), display that completed window's value,
            //   even if it is 0.
            // - Default \"no data yet\" display is handled on the frontend via \"-\" when value is null.
            
            RollingWindowResult finalResult = calculateFinalResult();

            // Always store the completed window result (including 0)
            completedWindowResult = finalResult;
            log.debug("WindowData: Window completed - setting result: eatenDelta={}, bidEaten={}, askEaten={}, eventsCount={}", 
                finalResult.eatenDelta, finalResult.bidEaten, finalResult.askEaten, events.size());
            
            // Reset for new window (events cleared, currentWindowResult reset to 0 for new calculations)
            events.clear();
            windowStartTime = newStartTime;
            currentWindowResult = new RollingWindowResult(0L, 0L, 0L); // Start fresh for new window
            lastEventCount = 0;
        }
        
        /**
         * Calculate the final result for the completed window.
         */
        private RollingWindowResult calculateFinalResult() {
            if (events.isEmpty()) {
                return new RollingWindowResult(0L, 0L, 0L);
            }
            
            long askEatenWindow = 0;
            long bidEatenWindow = 0;
            
            for (EatenEvent event : events) {
                askEatenWindow += event.askEaten;
                bidEatenWindow += event.bidEaten;
            }
            
            long eatenDelta = askEatenWindow - bidEatenWindow;
            return new RollingWindowResult(eatenDelta, bidEatenWindow, askEatenWindow);
        }
        
        /**
         * Check if we need to recalculate the current window result.
         * Only recalculate if events have changed.
         */
        boolean needsRecalculation() {
            return currentWindowResult == null || events.size() != lastEventCount;
        }
        
        /**
         * Update the current window result and event count after recalculation.
         */
        void updateCurrentWindowCache(RollingWindowResult result) {
            this.currentWindowResult = result;
            this.lastEventCount = events.size();
        }
    }
    
    private final Map<String, WindowData> windowDataMap = new ConcurrentHashMap<>();
    
    /**
     * Default window time in seconds (configurable via context)
     */
    private volatile int rollingWindowSeconds = 5;
    
    /**
     * Record class for previous snapshot
     */
    private static class PreviousSnapshot {
        final Long bidQuantity;
        final Long askQuantity;
        final Instant timestamp;
        
        PreviousSnapshot(Long bidQuantity, Long askQuantity, Instant timestamp) {
            this.bidQuantity = bidQuantity;
            this.askQuantity = askQuantity;
            this.timestamp = timestamp;
        }
    }
    
    /**
     * Record class for eaten events
     */
    private static class EatenEvent {
        final long askEaten;
        final long bidEaten;
        final Instant timestamp;
        
        EatenEvent(long askEaten, long bidEaten, Instant timestamp) {
            this.askEaten = askEaten;
            this.bidEaten = bidEaten;
            this.timestamp = timestamp;
        }
    }
    
    /**
     * Set the window time in seconds (discrete windows: 0-5s, 5-10s, etc.)
     */
    public void setRollingWindowSeconds(int seconds) {
        if (seconds > 0) {
            this.rollingWindowSeconds = seconds;
            // Reset all windows when window size changes
            windowDataMap.clear();
            log.debug("EatenDelta window set to {} seconds (discrete windows)", seconds);
        }
    }
    
    /**
     * Get the current window time in seconds
     */
    public int getRollingWindowSeconds() {
        return rollingWindowSeconds;
    }
    
    /**
     * Calculate and update eaten delta for a contract.
     * This method is called for each contract when new data arrives (at API polling rate).
     * 
     * IMPORTANT: This method is INDEPENDENT of UI refresh rate.
     * - It only recalculates when bid/ask quantities actually change
     * - Uses cached results when values haven't changed to ensure smooth transitions
     * - The discrete window interval controls how events are aggregated
     * 
     * NOTE: This method ONLY sets bubble values (eatenDelta, bidEaten, askEaten).
     * - It reads bidQuantity and askQuantity from the contract (which come from the API)
     * - It does NOT modify bidQuantity or askQuantity
     * - The window interval only affects how eaten events are aggregated for the bubbles
     * 
     * @param contract The current contract snapshot (bidQuantity and askQuantity must be set from API)
     * @return The calculated eaten delta value (ask_eaten_window - bid_eaten_window)
     */
    public Long calculateEatenDelta(DerivativeContract contract) {
        try {
            if (contract == null || contract.getInstrumentToken() == null) {
                log.debug("calculateEatenDelta: contract or instrumentToken is null, returning 0L");
                return 0L; // Return 0 instead of null to always show bubble
            }
            
            String instrumentToken = contract.getInstrumentToken();
            Long currentBidQty = contract.getBidQuantity();
            Long currentAskQty = contract.getAskQuantity();
            // CRITICAL: Use current system time for window calculation, not contract timestamp
            // Contract timestamp may change on every API poll, causing windows to reset incorrectly
            // Using system time ensures windows are based on actual time passage, not API polling frequency
            Instant currentTimestamp = Instant.now();
            
            // If we don't have current quantities, still return 0 to show bubble
            if (currentBidQty == null && currentAskQty == null) {
                log.debug("calculateEatenDelta: No bid/ask quantities for {}, returning 0L", instrumentToken);
                return 0L;
            }
            
            // Get previous snapshot FIRST to check if quantities changed
            // This allows us to skip window checks if quantities haven't changed
            PreviousSnapshot previous = previousSnapshots.get(instrumentToken);
            
            // CRITICAL: Check if bid/ask quantities have actually changed
            // This check must happen BEFORE window checks to ensure strict independence
            boolean quantitiesChanged = false;
            if (previous != null) {
                // Use null-safe comparison to detect actual changes
                boolean bidChanged = !java.util.Objects.equals(previous.bidQuantity, currentBidQty);
                boolean askChanged = !java.util.Objects.equals(previous.askQuantity, currentAskQty);
                quantitiesChanged = bidChanged || askChanged;
            } else {
                // First time - quantities are considered "changed" to initialize
                quantitiesChanged = true;
            }
            
            // Get or create window data for this instrument
            // Use the current configured window size (can be changed via UI)
            int configuredWindowSeconds = this.rollingWindowSeconds;
            
            // Validate window size
            final int currentWindowSeconds;
            if (configuredWindowSeconds <= 0) {
                log.error("calculateEatenDelta: Invalid window size {} for {}, using default 5s", 
                    configuredWindowSeconds, instrumentToken);
                currentWindowSeconds = 5;
                this.rollingWindowSeconds = 5;
            } else {
                currentWindowSeconds = configuredWindowSeconds;
            }
            
            WindowData windowData = windowDataMap.computeIfAbsent(instrumentToken, 
                k -> {
                    log.info("calculateEatenDelta: Creating new WindowData for {} with window size: {}s", 
                        instrumentToken, currentWindowSeconds);
                    return new WindowData(currentWindowSeconds);
                });
            
            // Update window size if it changed (e.g., user changed it in UI)
            if (windowData.windowSeconds != currentWindowSeconds) {
                windowData.windowSeconds = currentWindowSeconds;
                // Reset window when size changes
                long windowNumber = currentTimestamp.getEpochSecond() / currentWindowSeconds;
                Instant newWindowStart = Instant.ofEpochSecond(windowNumber * currentWindowSeconds);
                windowData.resetWindow(newWindowStart);
                log.info("calculateEatenDelta: Window size changed for {} - new size: {}s, reset window to: {}", 
                    instrumentToken, currentWindowSeconds, newWindowStart);
            }
            
            // Check if we need to start a new window (discrete windows: 0-Ns, N-2Ns, 2N-3Ns, etc.)
            // Calculate which discrete window this timestamp belongs to based on current window size
            // CRITICAL: Window boundaries are based on the eaten delta window interval, NOT refresh rate
            // Use epoch seconds to ensure exact window boundaries aligned to wall-clock time
            long currentEpochSecond = currentTimestamp.getEpochSecond();
            long windowNumber = currentEpochSecond / currentWindowSeconds;
            Instant newWindowStart = Instant.ofEpochSecond(windowNumber * currentWindowSeconds);
            
            // Calculate the end of the current window
            Instant currentWindowEnd = newWindowStart.plusSeconds(currentWindowSeconds);
            
            // Check if we've crossed into a new window by comparing epoch seconds
            // This ensures exact boundary detection regardless of API polling timing
            long currentWindowStartEpoch = windowData.windowStartTime.getEpochSecond();
            long newWindowStartEpoch = newWindowStart.getEpochSecond();
            
            // CRITICAL: Only consider window changed if we've actually crossed the boundary
            // Use strict comparison to prevent false positives from floating point or timing issues
            boolean windowChanged = currentWindowStartEpoch != newWindowStartEpoch;
            
            // Additional validation: Ensure we're not in the same window
            // This prevents multiple resets for the same window boundary
            if (windowChanged) {
                // Verify that the new window start is actually different and later
                if (newWindowStartEpoch <= currentWindowStartEpoch) {
                    // This shouldn't happen, but log it if it does
                    log.warn("calculateEatenDelta: Invalid window change detected for {} - currentWindowStart: {}, newWindowStart: {}, currentTime: {}", 
                        instrumentToken, windowData.windowStartTime, newWindowStart, currentTimestamp);
                    windowChanged = false; // Don't reset if window start is not actually later
                }
            }
            
            if (windowChanged) {
                // Start a new window - discard old events completely
                // This happens exactly when we cross the window boundary (e.g., at 5s, 10s, 15s for 5s window)
                long timeSinceLastWindow = currentEpochSecond - currentWindowStartEpoch;
                long windowsMissed = timeSinceLastWindow / currentWindowSeconds;
                
                if (windowsMissed > 1) {
                    // We've missed one or more complete windows - log warning
                    log.warn("calculateEatenDelta: Missed {} window(s) for {} - last window started at {}, current time {}, window size {}s. This may cause delayed updates.", 
                        windowsMissed - 1, instrumentToken, windowData.windowStartTime, currentTimestamp, currentWindowSeconds);
                }
                
                windowData.resetWindow(newWindowStart);
                log.info("calculateEatenDelta: Started new discrete window for {} - windowStart: {}, windowEnd: {}, windowNumber: {}, windowSize: {}s, currentTime: {}, timeSinceLastWindow: {}s, windowsMissed: {}", 
                    instrumentToken, newWindowStart, currentWindowEnd, windowNumber, currentWindowSeconds, currentTimestamp, timeSinceLastWindow, windowsMissed);
            } else {
                // Still in the same window - verify we're within bounds
                long timeInCurrentWindow = currentEpochSecond - currentWindowStartEpoch;
                if (currentTimestamp.isAfter(currentWindowEnd)) {
                    // Edge case: somehow we're past the window end but didn't detect change
                    // Force window reset to ensure correctness
                    log.warn("calculateEatenDelta: Time {} is past window end {} for {} - forcing window reset (timeInWindow: {}s, expected: {}s)", 
                        currentTimestamp, currentWindowEnd, instrumentToken, timeInCurrentWindow, currentWindowSeconds);
                    windowData.resetWindow(newWindowStart);
                } else {
                    // Log window progress for debugging (only occasionally to avoid log spam)
                    if (timeInCurrentWindow % Math.max(1, currentWindowSeconds / 5) == 0) {
                        log.debug("calculateEatenDelta: Window progress for {} - timeInWindow: {}s / {}s, events: {}", 
                            instrumentToken, timeInCurrentWindow, currentWindowSeconds, windowData.events.size());
                    }
                }
            }
            
            // CRITICAL: Display Logic
            // - If window changed: completedWindowResult was updated in resetWindow() with the previous window's final result
            // - If quantities haven't changed AND window hasn't changed: use completedWindowResult (previous window's result)
            // - If quantities changed: update currentWindowResult (running calculation), but still display completedWindowResult
            // 
            // This ensures:
            // - UI displays the PREVIOUS completed window's result while current window is being calculated
            // - When window completes, the result is stored and displayed IMMEDIATELY
            // - Values are STRICTLY independent of UI refresh rate
            
            // Always display the completed window result (previous window's final result)
            // This is what the user sees in the UI
            // Display result is ALWAYS the last completed window result (may be zero)
            RollingWindowResult displayResult =
                windowData.completedWindowResult != null
                    ? windowData.completedWindowResult
                    : new RollingWindowResult(0L, 0L, 0L);
            
            // CRITICAL: Always ensure contract values match the completed window result
            // This ensures the UI always sees the correct value, regardless of API polling timing
            // The contract values should ALWAYS reflect the completed window result (what we display)
            boolean contractNeedsUpdate = 
                contract.getEatenDelta() == null || !contract.getEatenDelta().equals(displayResult.eatenDelta) ||
                contract.getBidEaten() == null || !contract.getBidEaten().equals(displayResult.bidEaten) ||
                contract.getAskEaten() == null || !contract.getAskEaten().equals(displayResult.askEaten);
            
            // CRITICAL: If window changed, ALWAYS update contract immediately with the completed window result
            // This ensures the UI sees the new window result as soon as the boundary is crossed
            // For non-window-changes, only update if contract values don't match (prevents unnecessary updates)
            if (windowChanged || contractNeedsUpdate) {
                // Update contract to match completed window result
                contract.setBidEaten(displayResult.bidEaten);
                contract.setAskEaten(displayResult.askEaten);
                contract.setEatenDelta(displayResult.eatenDelta);
                
                if (windowChanged) {
                    log.info("calculateEatenDelta: Window changed for {} - updated contract with completed window result: eatenDelta={}, bidEaten={}, askEaten={}, windowStart={}, windowNumber={}", 
                        instrumentToken, displayResult.eatenDelta, displayResult.bidEaten, displayResult.askEaten, newWindowStart, windowNumber);
                } else {
                    log.debug("calculateEatenDelta: Contract values synced for {} - displaying completed window: eatenDelta={}, bidEaten={}, askEaten={}", 
                        instrumentToken, displayResult.eatenDelta, displayResult.bidEaten, displayResult.askEaten);
                }
            }
            
            // If quantities haven't changed AND window hasn't changed AND contract values are correct, we can return early
            if (!quantitiesChanged && !windowChanged && !contractNeedsUpdate) {
                // Everything is unchanged - return immediately without modifying contract
                log.debug("calculateEatenDelta: [OPTIONS/FUTURES] No changes for {} - quantities unchanged, window unchanged, contract values correct. Returning without modifying contract (STRICTLY independent of refresh rate)", 
                    instrumentToken);
                // CRITICAL: Return immediately without updating snapshot or processing events or modifying contract
                // This ensures complete independence from UI refresh rate for both futures and options
                return displayResult.eatenDelta;
            }
            
            if (quantitiesChanged) {
                log.debug("calculateEatenDelta: Quantities changed for {} - bid: {} -> {}, ask: {} -> {}", 
                    instrumentToken, previous != null ? previous.bidQuantity : null, currentBidQty, 
                    previous != null ? previous.askQuantity : null, currentAskQty);
            }
            
            // CRITICAL: Always calculate eaten values, regardless of whether quantities changed
            // The calculation window is independent of API polling and value changes
            // This ensures continuous calculation even if values remain the same
            long askEaten = 0;
            long bidEaten = 0;
            
            if (previous != null) {
                // Ask Eaten = max(0, previous ask qty - current ask qty)
                // Always calculate, even if values are the same (result will be 0)
                if (previous.askQuantity != null && currentAskQty != null) {
                    askEaten = Math.max(0, previous.askQuantity - currentAskQty);
                    if (askEaten > 0) {
                        log.debug("calculateEatenDelta: Ask eaten detected for {} - prev: {}, curr: {}, eaten: {}", 
                            instrumentToken, previous.askQuantity, currentAskQty, askEaten);
                    }
                }
                
                // Bid Eaten = max(0, previous bid qty - current bid qty)
                // Always calculate, even if values are the same (result will be 0)
                if (previous.bidQuantity != null && currentBidQty != null) {
                    bidEaten = Math.max(0, previous.bidQuantity - currentBidQty);
                    if (bidEaten > 0) {
                        log.debug("calculateEatenDelta: Bid eaten detected for {} - prev: {}, curr: {}, eaten: {}", 
                            instrumentToken, previous.bidQuantity, currentBidQty, bidEaten);
                    }
                }
            } else {
                log.debug("calculateEatenDelta: No previous snapshot for {} (first time), storing current snapshot", instrumentToken);
            }
            
            // CRITICAL: Always store the eaten event if there's any eaten value
            // The calculation window is independent - we always process, even if values are the same
            // This ensures continuous calculation regardless of value changes
            if (askEaten > 0 || bidEaten > 0) {
                windowData.events.add(new EatenEvent(askEaten, bidEaten, currentTimestamp));
                log.debug("calculateEatenDelta: Stored eaten event for {} - askEaten: {}, bidEaten: {}, timestamp: {}, windowStart: {}, totalEvents: {}", 
                    instrumentToken, askEaten, bidEaten, currentTimestamp, windowData.windowStartTime, windowData.events.size());
            }
            
            // CRITICAL: Always update previous snapshot to track continuous changes
            // This ensures we can always compare current vs previous on the next call
            // The calculation window is independent of API polling - we always track snapshots
            previousSnapshots.put(instrumentToken, new PreviousSnapshot(
                currentBidQty, 
                currentAskQty, 
                currentTimestamp
            ));
            log.debug("calculateEatenDelta: Updated previous snapshot for {} - bidQty: {}, askQty: {}", 
                instrumentToken, currentBidQty, currentAskQty);
            
            // CRITICAL: Always calculate current window aggregates
            // The calculation window is independent - we always recalculate to ensure continuous processing
            // This ensures the calculation runs continuously regardless of value changes
            RollingWindowResult currentResult;
            if (windowData.needsRecalculation()) {
                // Events changed or window changed - recalculate current window
                // This happens continuously, independent of quantity changes
                currentResult = calculateWindowDelta(windowData);
                windowData.updateCurrentWindowCache(currentResult); // Update current window cache
                log.debug("calculateEatenDelta: Updated current window result for {} - eatenDelta: {}, bidEaten: {}, askEaten: {}, eventsInWindow: {}", 
                    instrumentToken, currentResult.eatenDelta, currentResult.bidEaten, currentResult.askEaten, windowData.events.size());
            } else {
                // Use cached current window result (events haven't changed)
                currentResult = windowData.currentWindowResult != null ? windowData.currentWindowResult : new RollingWindowResult(0L, 0L, 0L);
                log.debug("calculateEatenDelta: Using cached current window result for {} (events unchanged)", instrumentToken);
            }
            
            
            // CRITICAL: Always display the COMPLETED window result, not the current window result
            // The current window result is being calculated and will be displayed when the window completes
            // This ensures the UI shows stable values during the window calculation period
            // Return the display result (even if contract wasn't updated, this is the value that should be displayed)
            return displayResult.eatenDelta;
        } catch (Exception e) {
            log.error("Error calculating eatenDelta for contract: {}", e.getMessage(), e);
            return 0L; // Return 0 on error to prevent breaking the UI
        }
    }
    
    /**
     * Calculate the window delta for an instrument
     * Returns a result object containing eatenDelta, bidEaten, and askEaten
     */
    private static class RollingWindowResult {
        final long eatenDelta;
        final long bidEaten;
        final long askEaten;
        
        RollingWindowResult(long eatenDelta, long bidEaten, long askEaten) {
            this.eatenDelta = eatenDelta;
            this.bidEaten = bidEaten;
            this.askEaten = askEaten;
        }
    }
    
    /**
     * Calculate delta from events in the current discrete window.
     * This method is called only when events change or window changes to ensure smooth transitions.
     */
    private RollingWindowResult calculateWindowDelta(WindowData windowData) {
        if (windowData.events.isEmpty()) {
            log.debug("calculateWindowDelta: No events in current window, returning zeros");
            return new RollingWindowResult(0L, 0L, 0L);
        }
        
        long askEatenWindow = 0;
        long bidEatenWindow = 0;
        
        // Sum all events in the current window
        for (EatenEvent event : windowData.events) {
            askEatenWindow += event.askEaten;
            bidEatenWindow += event.bidEaten;
        }
        
        // Eaten Δ = ask_eaten_window - bid_eaten_window
        long eatenDelta = askEatenWindow - bidEatenWindow;
        log.debug("calculateWindowDelta: Calculated - askEatenWindow: {}, bidEatenWindow: {}, eventsInWindow: {}, eatenDelta: {}", 
            askEatenWindow, bidEatenWindow, windowData.events.size(), eatenDelta);
        return new RollingWindowResult(eatenDelta, bidEatenWindow, askEatenWindow);
    }
    
    /**
     * Clear all data for an instrument (useful for cleanup)
     */
    public void clearInstrument(String instrumentToken) {
        previousSnapshots.remove(instrumentToken);
        windowDataMap.remove(instrumentToken);
    }
    
    /**
     * Clear all data (useful for testing or reset)
     */
    public void clearAll() {
        previousSnapshots.clear();
        windowDataMap.clear();
    }
}

