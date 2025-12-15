package com.zerodha.dashboard.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Manages discrete time windows for metric calculations.
 * Ensures windows are aligned to boundaries and tracks window state.
 */
@Service
public class WindowManager {
    
    private static final Logger log = LoggerFactory.getLogger(WindowManager.class);
    
    /**
     * Tracks window state per feature and symbol.
     * Key: feature:symbol
     * Value: WindowState
     */
    private final Map<String, WindowState> windowStates = new ConcurrentHashMap<>();
    
    /**
     * Supported window sizes per feature (in seconds).
     * UI should restrict choices to these values.
     */
    public static final Map<String, int[]> SUPPORTED_WINDOWS = Map.of(
        "trendScore", new int[]{3, 6, 9, 12, 15, 30, 60}, // Match frontend validation: 3-15s in 3s increments
        "ltpMovement", new int[]{1, 4, 7, 10, 13, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60}, // 1-15s: 3s intervals, 15-60s: 5-10s intervals
        "bidAskEaten", new int[]{1, 3, 5, 7, 9, 11, 13, 15, 17, 19}, // 1-20s with 2s intervals
        "spotLtpMovement", new int[]{3, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50} // 3-50s range for spot LTP trend
    );
    
    /**
     * Get the closest supported window size for a feature.
     */
    public static int getClosestSupportedWindow(String feature, int requestedSeconds) {
        int[] supported = SUPPORTED_WINDOWS.get(feature);
        if (supported == null) {
            log.warn("Unknown feature: {}, using default window 5s", feature);
            return 5;
        }
        
        int closest = supported[0];
        int minDiff = Math.abs(requestedSeconds - closest);
        
        for (int window : supported) {
            int diff = Math.abs(requestedSeconds - window);
            if (diff < minDiff) {
                minDiff = diff;
                closest = window;
            }
        }
        
        return closest;
    }
    
    /**
     * Window state for a feature-symbol combination.
     */
    public static class WindowState {
        private volatile int windowSeconds;
        private volatile Instant windowStartTime;
        private volatile long windowNumber;
        private volatile boolean hasCompletedWindow;
        
        public WindowState(String feature, String symbol, int windowSeconds) {
            // feature and symbol parameters kept for API compatibility but not stored
            this.windowSeconds = windowSeconds;
            this.windowStartTime = null;
            this.windowNumber = -1;
            this.hasCompletedWindow = false;
        }
        
        /**
         * Check if we've crossed into a new window and update state if needed.
         * @param currentTime Current timestamp
         * @return true if a new window started, false if still in the same window
         */
        public boolean checkAndUpdateWindow(Instant currentTime) {
            long currentEpochSecond = currentTime.getEpochSecond();
            long newWindowNumber = currentEpochSecond / windowSeconds;
            long windowStartEpochSecond = newWindowNumber * windowSeconds;
            Instant newWindowStartTime = Instant.ofEpochSecond(windowStartEpochSecond);
            
            if (windowStartTime == null || windowNumber != newWindowNumber) {
                // New window started
                boolean wasFirstWindow = windowStartTime == null;
                windowStartTime = newWindowStartTime;
                windowNumber = newWindowNumber;
                
                if (!wasFirstWindow) {
                    hasCompletedWindow = true;
                }
                
                return true;
            }
            
            return false;
        }
        
        /**
         * Get the start time of the current window.
         */
        public Instant getWindowStartTime() {
            return windowStartTime;
        }
        
        /**
         * Get the end time of the current window (exclusive).
         */
        public Instant getWindowEndTime() {
            if (windowStartTime == null) {
                return null;
            }
            return windowStartTime.plusSeconds(windowSeconds);
        }
        
        /**
         * Get the start time of the next window.
         */
        public Instant getNextWindowStartTime() {
            Instant endTime = getWindowEndTime();
            return endTime != null ? endTime : null;
        }
        
        public int getWindowSeconds() {
            return windowSeconds;
        }
        
        public void setWindowSeconds(int windowSeconds) {
            if (this.windowSeconds != windowSeconds) {
                this.windowSeconds = windowSeconds;
                // Reset window tracking when size changes
                this.windowStartTime = null;
                this.windowNumber = -1;
                this.hasCompletedWindow = false;
            }
        }
        
        public boolean hasCompletedWindow() {
            return hasCompletedWindow;
        }
    }
    
    /**
     * Get or create window state for a feature-symbol combination.
     * If state exists and window size changed, updates the existing state.
     */
    public WindowState getWindowState(String feature, String symbol, int windowSeconds) {
        String key = feature + ":" + symbol;
        
        // Normalize window size to supported value
        int normalizedWindow = getClosestSupportedWindow(feature, windowSeconds);
        if (normalizedWindow != windowSeconds) {
            log.debug("Normalized window size for feature={}, symbol={}: {}s -> {}s", 
                feature, symbol, windowSeconds, normalizedWindow);
        }
        
        WindowState state = windowStates.get(key);
        if (state != null) {
            // Update window size if it changed
            if (state.getWindowSeconds() != normalizedWindow) {
                log.info("Updating window size for feature={}, symbol={}: {}s -> {}s", 
                    feature, symbol, state.getWindowSeconds(), normalizedWindow);
                state.setWindowSeconds(normalizedWindow);
            }
            return state;
        }
        
        // Create new state
        WindowState newState = new WindowState(feature, symbol, normalizedWindow);
        windowStates.put(key, newState);
        return newState;
    }
    
    /**
     * Update window size for a feature-symbol combination.
     */
    public void updateWindowSize(String feature, String symbol, int windowSeconds) {
        String key = feature + ":" + symbol;
        WindowState state = windowStates.get(key);
        if (state != null) {
            int normalizedWindow = getClosestSupportedWindow(feature, windowSeconds);
            state.setWindowSeconds(normalizedWindow);
        } else {
            // Create new state with normalized window
            int normalizedWindow = getClosestSupportedWindow(feature, windowSeconds);
            windowStates.put(key, new WindowState(feature, symbol, normalizedWindow));
        }
    }
    
    /**
     * Clear window state for a feature-symbol (useful for testing or reset).
     */
    public void clearWindowState(String feature, String symbol) {
        String key = feature + ":" + symbol;
        windowStates.remove(key);
    }
}

