package com.zerodha.dashboard.web;

import com.zerodha.dashboard.service.EatenDeltaService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * Controller for Eaten Delta configuration endpoints.
 * Allows updating the rolling window time for eaten delta calculations.
 */
@RestController
@RequestMapping("/api/eaten-delta")
public class EatenDeltaController {

    private static final Logger log = LoggerFactory.getLogger(EatenDeltaController.class);
    
    private final EatenDeltaService eatenDeltaService;
    
    public EatenDeltaController(EatenDeltaService eatenDeltaService) {
        this.eatenDeltaService = eatenDeltaService;
    }
    
    /**
     * Update the discrete window time for eaten delta calculations.
     * POST /api/eaten-delta/window?seconds=5
     * Query parameter: seconds (1, 3, 5, 10, or 30)
     * Also supports body: { "seconds": 5 } for backward compatibility
     */
    @PostMapping(value = "/window", consumes = {"application/json", "application/x-www-form-urlencoded", "*/*"})
    public ResponseEntity<?> updateWindow(@RequestParam(required = false) Integer seconds, @RequestBody(required = false) Map<String, Integer> body) {
        try {
            // Support both query parameter and body for backward compatibility
            Integer windowSeconds = seconds;
            if (windowSeconds == null && body != null) {
                windowSeconds = body.get("seconds");
            }
            
            if (windowSeconds == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "seconds parameter is required"));
            }
            
            if (!isValidWindowTime(windowSeconds)) {
                return ResponseEntity.badRequest().body(Map.of(
                    "error", 
                    "Invalid window time. Must be one of: 1, 3, 5, 10, 30 seconds"
                ));
            }
            
            int oldWindow = eatenDeltaService.getRollingWindowSeconds();
            eatenDeltaService.setRollingWindowSeconds(windowSeconds);
            log.info("Eaten Delta discrete window updated from {}s to {}s (discrete windows: 0-{}s, {}-{}s, etc.)", 
                oldWindow, windowSeconds, windowSeconds, windowSeconds, windowSeconds * 2);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("windowSeconds", windowSeconds);
            response.put("message", "Window time updated successfully. New discrete windows: 0-" + windowSeconds + "s, " + windowSeconds + "-" + (windowSeconds * 2) + "s, etc.");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error updating eaten delta window time", e);
            return ResponseEntity.status(500).body(Map.of("error", "Failed to update window time: " + e.getMessage()));
        }
    }
    
    /**
     * Get the current rolling window time.
     * GET /api/eaten-delta/window
     */
    @GetMapping("/window")
    public ResponseEntity<?> getWindow() {
        try {
            Map<String, Object> response = new HashMap<>();
            response.put("windowSeconds", eatenDeltaService.getRollingWindowSeconds());
            response.put("availableOptions", new int[]{1, 3, 5, 10, 30});
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error getting eaten delta window time", e);
            return ResponseEntity.status(500).body(Map.of("error", "Failed to get window time: " + e.getMessage()));
        }
    }
    
    private boolean isValidWindowTime(int seconds) {
        return seconds == 1 || seconds == 3 || seconds == 5 || seconds == 10 || seconds == 30;
    }
}

