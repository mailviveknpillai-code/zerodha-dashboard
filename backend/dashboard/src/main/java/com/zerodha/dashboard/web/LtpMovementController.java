package com.zerodha.dashboard.web;

import com.zerodha.dashboard.service.LtpMovementService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for LTP Movement configuration.
 * Provides endpoints to get and update the movement cache size.
 */
@RestController
@RequestMapping("/api/ltp-movement")
public class LtpMovementController {
    
    private static final Logger log = LoggerFactory.getLogger(LtpMovementController.class);
    
    private final LtpMovementService ltpMovementService;
    
    public LtpMovementController(LtpMovementService ltpMovementService) {
        this.ltpMovementService = ltpMovementService;
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
}



