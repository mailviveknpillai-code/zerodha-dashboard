package com.zerodha.dashboard.web;

import com.zerodha.dashboard.service.SpotLtpTrendService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * REST controller for Spot LTP Trend configuration.
 * Allows configuring the window size for spot LTP trend calculation.
 */
@RestController
@RequestMapping("/api/spot-ltp-trend")
@CrossOrigin(origins = "*")
public class SpotLtpTrendController {
    
    private static final Logger log = LoggerFactory.getLogger(SpotLtpTrendController.class);
    
    private final SpotLtpTrendService spotLtpTrendService;
    
    public SpotLtpTrendController(SpotLtpTrendService spotLtpTrendService) {
        this.spotLtpTrendService = spotLtpTrendService;
    }
    
    /**
     * Get current spot LTP trend window configuration.
     */
    @GetMapping("/window")
    public ResponseEntity<Map<String, Object>> getWindow() {
        Map<String, Object> response = new HashMap<>();
        response.put("windowSeconds", spotLtpTrendService.getWindowSeconds());
        response.put("trendPercent", spotLtpTrendService.getTrendPercent());
        response.put("trendDirection", spotLtpTrendService.getTrendDirection());
        return ResponseEntity.ok(response);
    }
    
    /**
     * Update spot LTP trend window size.
     * Valid values: 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60 seconds.
     */
    @PostMapping("/window")
    public ResponseEntity<Map<String, Object>> updateWindow(@RequestParam Integer seconds) {
        log.info("Updating spot LTP trend window to {} seconds", seconds);
        
        // Validate range (5-60, 5s increments)
        if (seconds < 5 || seconds > 60) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Window must be between 5 and 60 seconds");
            error.put("validValues", new int[]{5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60});
            return ResponseEntity.badRequest().body(error);
        }
        
        spotLtpTrendService.setWindowSeconds(seconds);
        
        Map<String, Object> response = new HashMap<>();
        response.put("windowSeconds", spotLtpTrendService.getWindowSeconds());
        response.put("message", "Spot LTP trend window updated successfully");
        return ResponseEntity.ok(response);
    }
}


