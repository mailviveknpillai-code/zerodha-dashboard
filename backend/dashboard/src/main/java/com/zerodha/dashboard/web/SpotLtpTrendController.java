package com.zerodha.dashboard.web;

import com.zerodha.dashboard.service.SpotLtpTrendService;
import com.zerodha.dashboard.service.WindowManager;
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
public class SpotLtpTrendController {
    
    private static final Logger log = LoggerFactory.getLogger(SpotLtpTrendController.class);
    private static final String FEATURE_NAME = "spotLtpMovement";
    private static final String SYMBOL = "NIFTY";
    
    private final SpotLtpTrendService spotLtpTrendService;
    private final WindowManager windowManager;
    
    public SpotLtpTrendController(SpotLtpTrendService spotLtpTrendService, WindowManager windowManager) {
        this.spotLtpTrendService = spotLtpTrendService;
        this.windowManager = windowManager;
    }
    
    /**
     * Get current spot LTP trend window configuration.
     */
    @GetMapping("/window")
    public ResponseEntity<Map<String, Object>> getWindow() {
        int windowSeconds = spotLtpTrendService.getWindowSeconds();
        Map<String, Object> response = new HashMap<>();
        response.put("windowSeconds", windowSeconds);
        response.put("trendPercent", spotLtpTrendService.getTrendPercent());
        response.put("trendDirection", spotLtpTrendService.getTrendDirection());
        log.info("GET /api/spot-ltp-trend/window: {}s (SpotLtpTrendService={}, WindowManager={})", 
            windowSeconds, windowSeconds, 
            windowManager.getWindowState(FEATURE_NAME, SYMBOL, windowSeconds).getWindowSeconds());
        return ResponseEntity.ok(response);
    }
    
    /**
     * Update spot LTP trend window size.
     * Valid values: 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60 seconds.
     */
    @PostMapping("/window")
    public ResponseEntity<Map<String, Object>> updateWindow(@RequestParam Integer seconds) {
        int oldWindowSeconds = spotLtpTrendService.getWindowSeconds();
        
        if (seconds == null || seconds < 5 || seconds > 60) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Window must be between 5 and 60 seconds");
            error.put("validValues", new int[]{5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60});
            log.warn("Invalid window size requested: {}", seconds);
            return ResponseEntity.badRequest().body(error);
        }
        
        log.info("SPOT_LTP_TREND WINDOW UPDATE REQUEST: {}s -> {}s (current SpotLtpTrendService={}, WindowManager={})", 
            oldWindowSeconds, seconds, oldWindowSeconds,
            windowManager.getWindowState(FEATURE_NAME, SYMBOL, oldWindowSeconds).getWindowSeconds());
        
        // Step 1: Update SpotLtpTrendService (this also updates WindowManager internally)
        spotLtpTrendService.setWindowSeconds(seconds);
        
        // Step 2: Verify WindowManager is synchronized (redundant but ensures consistency)
        windowManager.updateWindowSize(FEATURE_NAME, SYMBOL, seconds);
        
        // Step 3: Verify the update was successful
        int actualWindowSeconds = spotLtpTrendService.getWindowSeconds();
        int windowManagerSeconds = windowManager.getWindowState(FEATURE_NAME, SYMBOL, seconds).getWindowSeconds();
        
        if (actualWindowSeconds != seconds || windowManagerSeconds != seconds) {
            log.error("WARNING: Spot LTP Trend window size update mismatch! Requested={}, SpotLtpTrendService={}, WindowManager={}", 
                seconds, actualWindowSeconds, windowManagerSeconds);
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("windowSeconds", actualWindowSeconds);
        response.put("previousWindowSeconds", oldWindowSeconds);
        response.put("message", "Spot LTP trend window updated successfully");
        
        log.info("Spot LTP trend window updated successfully: {}s -> {}s (SpotLtpTrendService={}, WindowManager={})", 
            oldWindowSeconds, actualWindowSeconds, actualWindowSeconds, windowManagerSeconds);
        return ResponseEntity.ok(response);
    }
}


