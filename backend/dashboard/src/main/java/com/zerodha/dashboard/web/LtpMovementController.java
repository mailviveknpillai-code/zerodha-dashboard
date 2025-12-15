package com.zerodha.dashboard.web;

import com.zerodha.dashboard.service.LtpMovementService;
import com.zerodha.dashboard.service.WindowManager;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * REST controller for LTP Movement configuration.
 * Provides endpoints to get and update the movement cache size.
 */
@RestController
@RequestMapping("/api/ltp-movement")
public class LtpMovementController {
    
    private static final Logger log = LoggerFactory.getLogger(LtpMovementController.class);
    
    private static final String FEATURE_NAME = "ltpMovement";
    private static final String SYMBOL = "NIFTY"; // Representative symbol for window size updates
    
    private final LtpMovementService ltpMovementService;
    private final WindowManager windowManager;
    
    public LtpMovementController(LtpMovementService ltpMovementService, WindowManager windowManager) {
        this.ltpMovementService = ltpMovementService;
        this.windowManager = windowManager;
    }
    
    /**
     * Get the current movement cache size.
     * 
     * @return Current cache size (number of movements tracked)
     */
    @GetMapping("/cache-size")
    public ResponseEntity<Integer> getCacheSize() {
        int cacheSize = ltpMovementService.getMovementCacheSize();
        log.debug("getCacheSize: Returning current cache size: {}", cacheSize);
        return ResponseEntity.ok(cacheSize);
    }
    
    /**
     * Update the movement cache size.
     * 
     * @param size Number of movements to track (minimum 2, maximum 20)
     * @return Updated cache size
     */
    @PostMapping(value = "/cache-size", consumes = {"*/*"})
    public ResponseEntity<Integer> updateCacheSize(@RequestParam(required = false) Integer size,
                                                    @RequestBody(required = false) java.util.Map<String, Integer> body) {
        // Support both query parameter and request body for backward compatibility
        Integer newSize = size != null ? size : (body != null ? body.get("size") : null);
        
        if (newSize == null) {
            log.warn("updateCacheSize: No size parameter provided");
            return ResponseEntity.badRequest().build();
        }
        
        int oldSize = ltpMovementService.getMovementCacheSize();
        ltpMovementService.setMovementCacheSize(newSize);
        int updatedSize = ltpMovementService.getMovementCacheSize();
        
        log.info("updateCacheSize: Updated LTP movement cache size from {} to {}", oldSize, updatedSize);
        return ResponseEntity.ok(updatedSize);
    }
    
    /**
     * Get the current window size in seconds.
     * 
     * @return Current window size
     */
    @GetMapping("/window")
    public ResponseEntity<Map<String, Integer>> getWindow() {
        int windowSeconds = ltpMovementService.getWindowSeconds();
        Map<String, Integer> response = new HashMap<>();
        response.put("windowSeconds", windowSeconds);
        log.debug("getWindow: Returning current window size: {}s", windowSeconds);
        return ResponseEntity.ok(response);
    }
    
    /**
     * Update the window size in seconds.
     * 
     * @param seconds Window size in seconds (must be positive)
     * @return Updated window size
     */
    @PostMapping(value = "/window", consumes = {"*/*"})
    public ResponseEntity<Map<String, Object>> updateWindow(@RequestParam(required = false) Integer seconds) {
        int oldWindowSeconds = ltpMovementService.getWindowSeconds();
        
        if (seconds == null || seconds <= 0) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Invalid window size. Must be a positive integer.");
            return ResponseEntity.badRequest().body(error);
        }
        
        ltpMovementService.setWindowSeconds(seconds);
        
        // CRITICAL: Synchronize with WindowManager to ensure window boundaries are aligned
        // Get normalized window size from service (it normalizes to supported values)
        int normalizedWindowSeconds = ltpMovementService.getWindowSeconds();
        windowManager.updateWindowSize(FEATURE_NAME, SYMBOL, normalizedWindowSeconds);
        
        Map<String, Object> response = new HashMap<>();
        response.put("windowSeconds", normalizedWindowSeconds);
        response.put("previousWindowSeconds", oldWindowSeconds);
        
        log.info("LTP movement window updated: {}s -> {}s (normalized: {}s). Synchronized with WindowManager.", 
            oldWindowSeconds, seconds, normalizedWindowSeconds);
        return ResponseEntity.ok(response);
    }
}



