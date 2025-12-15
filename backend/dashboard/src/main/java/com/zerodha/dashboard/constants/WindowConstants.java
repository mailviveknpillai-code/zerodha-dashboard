package com.zerodha.dashboard.constants;

/**
 * Constants for window sizes, API polling intervals, and calculation thresholds.
 * Centralizes magic numbers used across multiple services.
 */
public final class WindowConstants {
    private WindowConstants() {
        // Utility class - prevent instantiation
    }
    
    // ========== Window Sizes ==========
    /** Default window size in seconds for most calculations */
    public static final int DEFAULT_WINDOW_SECONDS = 5;
    
    /** Minimum allowed window size in seconds */
    public static final int MIN_WINDOW_SECONDS = 1;
    
    /** Maximum allowed window size in seconds for eaten delta */
    public static final int MAX_WINDOW_SECONDS = 30;
    
    /** Maximum allowed window size in seconds for LTP movement */
    public static final int MAX_LTP_WINDOW_SECONDS = 60;
    
    // ========== API Polling Intervals ==========
    /** Minimum API polling interval in milliseconds (250ms) */
    public static final long MIN_API_POLLING_INTERVAL_MS = 250L;
    
    /** Warning threshold for API polling interval - values below this may cause issues */
    public static final long WARNING_API_POLLING_INTERVAL_MS = 1500L;
    
    /** Default API polling interval in milliseconds (1 second) */
    public static final long DEFAULT_API_POLLING_INTERVAL_MS = 1000L;
    
    // ========== Movement Cache ==========
    /** Default movement cache size (number of movements to track) */
    public static final int DEFAULT_MOVEMENT_CACHE_SIZE = 5;
    
    /** Minimum movement cache size */
    public static final int MIN_MOVEMENT_CACHE_SIZE = 2;
    
    /** Maximum movement cache size */
    public static final int MAX_MOVEMENT_CACHE_SIZE = 20;
    
    // ========== Change Thresholds ==========
    /** Minimum change percentage (0.05%) to consider a movement significant */
    public static final double MIN_CHANGE_PERCENT = 0.05;
    
    /** Threshold for high movement intensity (0.5%) */
    public static final double HIGH_MOVEMENT_THRESHOLD = 0.5;
    
    /** Threshold for high confidence (50%) */
    public static final int HIGH_CONFIDENCE_THRESHOLD = 50;
}


