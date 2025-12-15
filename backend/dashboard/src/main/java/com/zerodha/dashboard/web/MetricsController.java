package com.zerodha.dashboard.web;

import com.zerodha.dashboard.model.MetricResult;
import com.zerodha.dashboard.service.MetricsCacheService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * REST controller for windowed metrics API.
 * 
 * Provides structured access to trendScore, ltpMovement, bidAskEaten, spotLtpMovement
 * with window metadata (window_start, window_end, status, version, etc.).
 */
@RestController
@RequestMapping("/api/metrics")
public class MetricsController {
    
    private static final Logger log = LoggerFactory.getLogger(MetricsController.class);
    
    private final MetricsCacheService metricsCacheService;
    
    public MetricsController(MetricsCacheService metricsCacheService) {
        this.metricsCacheService = metricsCacheService;
    }
    
    /**
     * Get latest metrics for a symbol.
     * 
     * GET /api/metrics/latest?symbol=NIFTY&features=trendScore,ltpMovement,bidAskEaten,spotLtpMovement
     * 
     * @param symbol The symbol identifier (e.g., "NIFTY", "NIFTY23DEC_FUT")
     * @param features Comma-separated list of features to retrieve (optional, returns all if not specified)
     * @return Map of feature names to MetricResult objects
     */
    @GetMapping("/latest")
    public ResponseEntity<Map<String, Object>> getLatestMetrics(
            @RequestParam(value = "symbol", defaultValue = "NIFTY") String symbol,
            @RequestParam(value = "features", required = false) String features) {
        
        try {
            Set<String> featureSet = null;
            if (features != null && !features.trim().isEmpty()) {
                featureSet = Arrays.stream(features.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .collect(Collectors.toSet());
            }
            
            Map<String, MetricResult> results = metricsCacheService.getLatestResults(symbol, featureSet);
            
            // Build response
            Map<String, Object> response = new HashMap<>();
            response.put("symbol", symbol);
            response.put("features", results);
            
            // If no results found, return empty map with symbol
            if (results.isEmpty()) {
                log.debug("No metrics found for symbol={}, features={}", symbol, features);
            } else {
                log.debug("Retrieved {} metrics for symbol={}", results.size(), symbol);
            }
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Error retrieving latest metrics for symbol={}, features={}", symbol, features, e);
            return ResponseEntity.status(500).body(Map.of(
                "error", "Failed to retrieve metrics",
                "message", e.getMessage()
            ));
        }
    }
    
    /**
     * Get latest metric for a specific symbol and feature.
     * 
     * GET /api/metrics/latest/{feature}?symbol=NIFTY
     */
    @GetMapping("/latest/{feature}")
    public ResponseEntity<MetricResult> getLatestMetric(
            @PathVariable String feature,
            @RequestParam(value = "symbol", defaultValue = "NIFTY") String symbol) {
        
        try {
            Optional<MetricResult> resultOpt = metricsCacheService.getLatestResult(symbol, feature);
            
            if (resultOpt.isPresent()) {
                return ResponseEntity.ok(resultOpt.get());
            } else {
                // Return "missing" status
                MetricResult missing = MetricResult.missing(symbol, feature);
                return ResponseEntity.ok(missing);
            }
        } catch (Exception e) {
            log.error("Error retrieving latest metric for symbol={}, feature={}", symbol, feature, e);
            return ResponseEntity.status(500).build();
        }
    }
    
    /**
     * Get version for a symbol and feature.
     * 
     * GET /api/metrics/version/{feature}?symbol=NIFTY
     */
    @GetMapping("/version/{feature}")
    public ResponseEntity<Map<String, Object>> getVersion(
            @PathVariable String feature,
            @RequestParam(value = "symbol", defaultValue = "NIFTY") String symbol) {
        
        try {
            Long version = metricsCacheService.getVersion(symbol, feature);
            return ResponseEntity.ok(Map.of(
                "symbol", symbol,
                "feature", feature,
                "version", version
            ));
        } catch (Exception e) {
            log.error("Error retrieving version for symbol={}, feature={}", symbol, feature, e);
            return ResponseEntity.status(500).build();
        }
    }
}

