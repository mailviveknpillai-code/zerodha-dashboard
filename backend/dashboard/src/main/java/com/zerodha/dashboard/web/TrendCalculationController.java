package com.zerodha.dashboard.web;

import com.zerodha.dashboard.service.TrendCalculationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

/**
 * REST controller for Trend Calculation configuration.
 * Provides endpoints to get and update trend calculation window and thresholds.
 */
@RestController
@RequestMapping("/api/trend-calculation")
public class TrendCalculationController {
    
    private static final Logger log = LoggerFactory.getLogger(TrendCalculationController.class);
    
    private final TrendCalculationService trendCalculationService;
    
    public TrendCalculationController(TrendCalculationService trendCalculationService) {
        this.trendCalculationService = trendCalculationService;
    }
    
    /**
     * Get current trend calculation window size in seconds.
     * GET /api/trend-calculation/window
     */
    @GetMapping("/window")
    public ResponseEntity<Map<String, Integer>> getWindow() {
        int windowSeconds = trendCalculationService.getWindowSeconds();
        Map<String, Integer> response = new HashMap<>();
        response.put("windowSeconds", windowSeconds);
        log.debug("GET /api/trend-calculation/window: {}", windowSeconds);
        return ResponseEntity.ok(response);
    }
    
    /**
     * Update trend calculation window size in seconds.
     * POST /api/trend-calculation/window?seconds=5
     */
    @PostMapping(value = "/window", consumes = {"*/*"})
    public ResponseEntity<Map<String, Object>> updateWindow(@RequestParam(required = false) Integer seconds) {
        int oldWindowSeconds = trendCalculationService.getWindowSeconds();
        
        if (seconds == null || seconds <= 0) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Invalid window size. Must be a positive integer.");
            return ResponseEntity.badRequest().body(error);
        }
        
        trendCalculationService.setWindowSeconds(seconds);
        
        Map<String, Object> response = new HashMap<>();
        response.put("windowSeconds", seconds);
        response.put("previousWindowSeconds", oldWindowSeconds);
        
        log.info("Trend calculation window updated: {}s -> {}s", oldWindowSeconds, seconds);
        return ResponseEntity.ok(response);
    }
    
    /**
     * Get current trend thresholds.
     * GET /api/trend-calculation/thresholds
     */
    @GetMapping("/thresholds")
    public ResponseEntity<Map<String, Double>> getThresholds() {
        Map<String, Double> response = new HashMap<>();
        response.put("bullishThreshold", trendCalculationService.getBullishThreshold());
        response.put("bearishThreshold", trendCalculationService.getBearishThreshold());
        log.debug("GET /api/trend-calculation/thresholds: bullish={}, bearish={}", 
            response.get("bullishThreshold"), response.get("bearishThreshold"));
        return ResponseEntity.ok(response);
    }
    
    /**
     * Update trend thresholds.
     * POST /api/trend-calculation/thresholds?bullish=3.0&bearish=-3.0
     */
    @PostMapping(value = "/thresholds", consumes = {"*/*"})
    public ResponseEntity<Map<String, Object>> updateThresholds(
            @RequestParam(required = false) Double bullish,
            @RequestParam(required = false) Double bearish) {
        
        double oldBullish = trendCalculationService.getBullishThreshold();
        double oldBearish = trendCalculationService.getBearishThreshold();
        
        if (bullish != null) {
            trendCalculationService.setBullishThreshold(bullish);
        }
        if (bearish != null) {
            trendCalculationService.setBearishThreshold(bearish);
        }
        
        Map<String, Object> response = new HashMap<>();
        response.put("bullishThreshold", trendCalculationService.getBullishThreshold());
        response.put("bearishThreshold", trendCalculationService.getBearishThreshold());
        response.put("previousBullishThreshold", oldBullish);
        response.put("previousBearishThreshold", oldBearish);
        
        log.info("Trend thresholds updated: bullish {} -> {}, bearish {} -> {}", 
            oldBullish, response.get("bullishThreshold"), 
            oldBearish, response.get("bearishThreshold"));
        return ResponseEntity.ok(response);
    }
}




