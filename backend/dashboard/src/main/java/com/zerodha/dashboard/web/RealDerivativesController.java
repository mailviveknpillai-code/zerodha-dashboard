package com.zerodha.dashboard.web;

import com.zerodha.dashboard.adapter.BreezeApiAdapter;
import com.zerodha.dashboard.adapter.ZerodhaApiAdapter;
import com.zerodha.dashboard.model.DerivativesChain;
import com.zerodha.dashboard.service.LatestSnapshotCacheService;
import com.zerodha.dashboard.service.MockDataService;
import com.zerodha.dashboard.service.ZerodhaSessionService;
import com.zerodha.dashboard.service.DynamicCacheUpdateScheduler;
import com.zerodha.dashboard.service.EatenDeltaService;
import com.zerodha.dashboard.service.LtpMovementService;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Pattern;

/**
 * Controller for real derivatives data using Breeze API (primary) and Zerodha Kite API stopping
 */
@RestController
@RequestMapping("/api")
@Validated
public class RealDerivativesController {
    private static final Pattern UNDERLYING_PATTERN = Pattern.compile("^[A-Z0-9_-]{1,15}$");
    private static final Map<String, String> SEGMENT_ALIASES = Map.of(
            "FUTURES", "FUTURES",
            "CALL_OPTIONS", "CALL_OPTIONS",
            "CALLS", "CALL_OPTIONS",
            "PUT_OPTIONS", "PUT_OPTIONS",
            "PUTS", "PUT_OPTIONS"
    );

    private final Logger log = LoggerFactory.getLogger(RealDerivativesController.class);
    private final BreezeApiAdapter breezeApiAdapter;
    private final ZerodhaApiAdapter zerodhaApiAdapter;
    private final MockDataService mockDataService;
    private final ZerodhaSessionService zerodhaSessionService;
    private final LatestSnapshotCacheService latestSnapshotCacheService;
    private final DynamicCacheUpdateScheduler dynamicCacheUpdateScheduler;
    private final EatenDeltaService eatenDeltaService;
    private final LtpMovementService ltpMovementService;
    
    // Executor service for async cache updates (non-blocking)
    private final ExecutorService cacheUpdateExecutor = Executors.newFixedThreadPool(2);
    
    @Value("${breeze.api.enabled:true}")
    private boolean breezeApiEnabled;
    
    @Value("${zerodha.enabled:false}")
    private boolean zerodhaEnabled;
    
    @Value("${mock.data.enabled:false}")
    private boolean mockDataEnabled;

    public RealDerivativesController(BreezeApiAdapter breezeApiAdapter,
                                     ZerodhaApiAdapter zerodhaApiAdapter,
                                     MockDataService mockDataService,
                                     ZerodhaSessionService zerodhaSessionService,
                                     LatestSnapshotCacheService latestSnapshotCacheService,
                                     DynamicCacheUpdateScheduler dynamicCacheUpdateScheduler,
                                     EatenDeltaService eatenDeltaService,
                                     LtpMovementService ltpMovementService) {
        this.breezeApiAdapter = breezeApiAdapter;
        this.zerodhaApiAdapter = zerodhaApiAdapter;
        this.mockDataService = mockDataService;
        this.zerodhaSessionService = zerodhaSessionService;
        this.latestSnapshotCacheService = latestSnapshotCacheService;
        this.dynamicCacheUpdateScheduler = dynamicCacheUpdateScheduler;
        this.eatenDeltaService = eatenDeltaService;
        this.ltpMovementService = ltpMovementService;
    }

    /**
     * Get real NIFTY derivatives chain using Breeze API (primary) or Zerodha Kite API (production)
     * GET /api/real-derivatives?underlying=NIFTY
     */
    @GetMapping("/real-derivatives")
    public ResponseEntity<?> getRealDerivativesChain(@RequestParam(value = "underlying", defaultValue = "NIFTY") String underlying) {
        log.info("real-derivatives request received for underlying='{}'", underlying);

        String normalizedUnderlying = sanitizeUnderlying(underlying);
        if (normalizedUnderlying == null) {
            return validationError("underlying", "Underlying must be 1-15 characters (A-Z, 0-9, hyphen or underscore)");
        }
        log.info("real-derivatives normalized underlying='{}'", normalizedUnderlying);

        try {
            Optional<DerivativesChain> derivativesChain = Optional.empty();
            String dataSource = "NO_DATA";
            
            // Priority: Zerodha Kite API (if enabled) > Breeze API > Mock Data
            // Mock data is disabled when Zerodha is enabled
            if (zerodhaEnabled) {
                if (!zerodhaSessionService.hasActiveAccessToken()) {
                    log.warn("Zerodha session is not active. Prompting user to login.");
                    Map<String, Object> loginRequired = new HashMap<>();
                    loginRequired.put("error", "ZERODHA_LOGIN_REQUIRED");
                    loginRequired.put("message", "Zerodha session expired or not initialized. Please log in to Zerodha to continue.");
                    loginRequired.put("auth_url_endpoint", "/api/zerodha/auth-url");
                    loginRequired.put("dataSource", "ZERODHA_LOGIN_REQUIRED");
                    loginRequired.put("timestamp", Instant.now());
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(loginRequired);
                }

                log.info("Fetching data from Zerodha Kite API (priority)");
                derivativesChain = zerodhaApiAdapter.getDerivativesChain(normalizedUnderlying);
                if (derivativesChain.isPresent()) {
                    dataSource = "ZERODHA_KITE";
                    log.info("Successfully fetched derivatives chain using Zerodha Kite API");
                } else {
                    log.warn("Zerodha Kite API returned no data for {}", normalizedUnderlying);
                }
            }
            
            // Fallback to Breeze API if Zerodha is disabled or failed
            if (derivativesChain.isEmpty() && breezeApiEnabled && !zerodhaEnabled) {
                log.info("Fetching data from Breeze API");
                derivativesChain = breezeApiAdapter.getDerivativesChain(normalizedUnderlying);
                if (derivativesChain.isPresent()) {
                    dataSource = "BREEZE_API";
                    log.info("Successfully fetched derivatives chain using Breeze API");
                } else {
                    log.warn("Breeze API returned no data for {}", normalizedUnderlying);
                }
            }
            
            // Mock data ONLY if both APIs are disabled (never when Zerodha is enabled)
            if (derivativesChain.isEmpty() && mockDataEnabled && !zerodhaEnabled) {
                log.info("Using mock data for UI testing (Zerodha is disabled)");
                derivativesChain = Optional.of(mockDataService.generateMockDerivativesChain());
                dataSource = "MOCK_DATA";
                log.info("Successfully generated mock derivatives chain");
            }
            
            if (derivativesChain.isPresent()) {
                DerivativesChain chain = derivativesChain.get();
                
                // Calculate eaten delta for all contracts
                calculateEatenDeltaForChain(chain);
                
                // Update cache atomically with the latest snapshot
                latestSnapshotCacheService.updateCache(chain);
                log.info("Successfully fetched real derivatives chain with {} total contracts using {}", 
                        chain.getTotalContracts(), dataSource);
                return ResponseEntity.ok(chain);
            } else {
                log.warn("No real data available from any API for {}", normalizedUnderlying);
                // Return empty chain instead of error
                DerivativesChain emptyChain = new DerivativesChain(normalizedUnderlying, new BigDecimal("25000"));
                emptyChain.setDailyStrikePrice(new BigDecimal("25000"));
                emptyChain.setTimestamp(Instant.now());
                emptyChain.setDataSource("NO_DATA");
                return ResponseEntity.ok(emptyChain);
            }

        } catch (Exception e) {
            log.error("Error generating real derivatives for {}: {}", normalizedUnderlying, e.getMessage(), e);
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }

    /**
     * Get real derivatives by segment
     * GET /api/real-derivatives/segment?segment=FUTURES&underlying=NIFTY
     */
    @GetMapping("/real-derivatives/segment")
    public ResponseEntity<?> getRealDerivativesBySegment(
            @RequestParam("segment") String segment,
            @RequestParam(value = "underlying", defaultValue = "NIFTY") String underlying) {
        
        log.info("real-derivatives/segment request: segment='{}', underlying='{}'", segment, underlying);

        String normalizedUnderlying = sanitizeUnderlying(underlying);
        if (normalizedUnderlying == null) {
            return validationError("underlying", "Underlying must be 1-15 characters (A-Z, 0-9, hyphen or underscore)");
        }

        String normalizedSegment = normalizeSegment(segment);
        if (normalizedSegment == null) {
            return validationError("segment", "Segment must be one of FUTURES, CALL_OPTIONS or PUT_OPTIONS");
        }

        try {
            // Get full derivatives chain
            ResponseEntity<?> chainResponse = getRealDerivativesChain(normalizedUnderlying);
            if (chainResponse.getStatusCode().is2xxSuccessful() && chainResponse.getBody() instanceof DerivativesChain chain) {
                switch (normalizedSegment) {
                    case "FUTURES":
                        return ResponseEntity.ok(chain.getFutures());
                    case "CALL_OPTIONS":
                        return ResponseEntity.ok(chain.getCallOptions());
                    case "PUT_OPTIONS":
                        return ResponseEntity.ok(chain.getPutOptions());
                    default:
                        return validationError("segment", "Segment must be one of FUTURES, CALL_OPTIONS or PUT_OPTIONS");
                }
            } else {
                return chainResponse;
            }
        } catch (Exception e) {
            log.error("Error getting real derivatives by segment {}: {}", segment, e.getMessage(), e);
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }

    /**
     * Get strike price monitoring data using real derivatives
     * GET /api/real-strike-monitoring?underlying=NIFTY
     */
    @GetMapping("/real-strike-monitoring")
    public ResponseEntity<?> getRealStrikePriceMonitoring(@RequestParam(value = "underlying", defaultValue = "NIFTY") String underlying) {
        log.info("real-strike-monitoring request received for underlying='{}'", underlying);

        String normalizedUnderlying = sanitizeUnderlying(underlying);
        if (normalizedUnderlying == null) {
            return validationError("underlying", "Underlying must be 1-15 characters (A-Z, 0-9, hyphen or underscore)");
        }

        try {
            // Get full derivatives chain
            ResponseEntity<?> chainResponse = getRealDerivativesChain(normalizedUnderlying);
            if (chainResponse.getStatusCode().is2xxSuccessful() && chainResponse.getBody() instanceof DerivativesChain chain) {
                // Create strike price monitoring response
                DerivativesChain monitoringResponse = new DerivativesChain();
                monitoringResponse.setUnderlying(chain.getUnderlying());
                monitoringResponse.setSpotPrice(chain.getSpotPrice());
                monitoringResponse.setDailyStrikePrice(chain.getDailyStrikePrice());
                monitoringResponse.setTimestamp(chain.getTimestamp());
                
                // Filter contracts around strike price (±50 points)
                BigDecimal strikePrice = chain.getDailyStrikePrice();
                BigDecimal lowerBound = strikePrice.subtract(new BigDecimal("50"));
                BigDecimal upperBound = strikePrice.add(new BigDecimal("50"));
                
                // Add monitoring contracts (around strike)
                chain.getCallOptions().stream()
                    .filter(opt -> opt.getStrikePrice().compareTo(lowerBound) >= 0 && opt.getStrikePrice().compareTo(upperBound) <= 0)
                    .forEach(monitoringResponse::addCallOption);
                
                chain.getPutOptions().stream()
                    .filter(opt -> opt.getStrikePrice().compareTo(lowerBound) >= 0 && opt.getStrikePrice().compareTo(upperBound) <= 0)
                    .forEach(monitoringResponse::addPutOption);
                
                // Add above strike contracts
                chain.getCallOptions().stream()
                    .filter(opt -> opt.getStrikePrice().compareTo(upperBound) > 0)
                    .forEach(opt -> {
                        opt.setSegment("ABOVE_STRIKE_CALLS");
                        monitoringResponse.addCallOption(opt);
                    });
                
                chain.getPutOptions().stream()
                    .filter(opt -> opt.getStrikePrice().compareTo(upperBound) > 0)
                    .forEach(opt -> {
                        opt.setSegment("ABOVE_STRIKE_PUTS");
                        monitoringResponse.addPutOption(opt);
                    });
                
                // Add below strike contracts
                chain.getCallOptions().stream()
                    .filter(opt -> opt.getStrikePrice().compareTo(lowerBound) < 0)
                    .forEach(opt -> {
                        opt.setSegment("BELOW_STRIKE_CALLS");
                        monitoringResponse.addCallOption(opt);
                    });
                
                chain.getPutOptions().stream()
                    .filter(opt -> opt.getStrikePrice().compareTo(lowerBound) < 0)
                    .forEach(opt -> {
                        opt.setSegment("BELOW_STRIKE_PUTS");
                        monitoringResponse.addPutOption(opt);
                    });
                
                return ResponseEntity.ok(monitoringResponse);
            } else {
                return chainResponse;
            }
        } catch (Exception e) {
            log.error("Error getting real strike price monitoring for {}: {}", underlying, e.getMessage(), e);
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }
    
    /**
     * Debug endpoint to check derivatives chain data
     * GET /api/debug-derivatives?underlying=NIFTY
     */
    @GetMapping("/debug-derivatives")
    public ResponseEntity<Map<String, Object>> debugDerivativesChain(
            @RequestParam(value = "underlying", defaultValue = "NIFTY") String underlying) {
        
        log.info("Debug derivatives chain for underlying: {}", underlying);

        String normalizedUnderlying = sanitizeUnderlying(underlying);
        if (normalizedUnderlying == null) {
            return validationError("underlying", "Underlying must be 1-15 characters (A-Z, 0-9, hyphen or underscore)");
        }
        
        try {
            BigDecimal spotPrice = new BigDecimal("25000");
            Optional<DerivativesChain> chain = breezeApiAdapter.getDerivativesChain(spotPrice);
            
            Map<String, Object> debug = new HashMap<>();
            if (chain.isPresent()) {
                debug.put("underlying", chain.get().getUnderlying());
                debug.put("spotPrice", chain.get().getSpotPrice());
                debug.put("futuresCount", chain.get().getFutures().size());
                debug.put("callOptionsCount", chain.get().getCallOptions().size());
                debug.put("putOptionsCount", chain.get().getPutOptions().size());
                debug.put("dataSource", chain.get().getDataSource());
                debug.put("futures", chain.get().getFutures());
                debug.put("callOptions", chain.get().getCallOptions());
                debug.put("putOptions", chain.get().getPutOptions());
            } else {
                debug.put("error", "No chain found");
            }
            
            return ResponseEntity.ok(debug);
        } catch (Exception e) {
            log.error("Error in debug endpoint: {}", e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }
    
    /**
     * Get the latest snapshot from cache ONLY (ultra-fast endpoint for UI refresh).
     * GET /api/latest?underlying=NIFTY
     * 
     * IMPORTANT: This endpoint does NOT trigger API calls. It only returns cached data.
     * API polling is handled by DynamicCacheUpdateScheduler at the configured polling interval.
     * 
     * This endpoint:
     * 1. Returns cached data from Redis (fast, no external API calls)
     * 2. Recalculates eatenDelta and LTP movement (these are computed from cached bid/ask/LTP values)
     * 3. If cache is empty, returns empty chain
     * 
     * This ensures:
     * - UI refresh rate does NOT trigger Zerodha API calls
     * - Backend scheduler handles all API polling at the configured interval
     * - Frontend can poll this endpoint frequently without crashing
     */
    @GetMapping("/latest")
    public ResponseEntity<?> getLatest(@RequestParam(value = "underlying", defaultValue = "NIFTY") String underlying) {
        log.debug("latest request received for underlying='{}' (cache-only, no API calls)", underlying);
        
        String normalizedUnderlying = sanitizeUnderlying(underlying);
        if (normalizedUnderlying == null) {
            return validationError("underlying", "Underlying must be 1-15 characters (A-Z, 0-9, hyphen or underscore)");
        }
        
        try {
            // ONLY return cached data - do NOT trigger API calls
            // API polling is handled separately by DynamicCacheUpdateScheduler
            // CRITICAL: Do NOT recalculate eatenDelta or LTP movement here
            // These values are already calculated and stored in the cache by DynamicCacheUpdateScheduler
            // The calculation window is independent and runs at API polling rate, not UI refresh rate
            Optional<DerivativesChain> cached = latestSnapshotCacheService.getLatest();
            if (cached.isPresent()) {
                DerivativesChain chain = cached.get();
                // Verify underlying matches (for future multi-underlying support)
                if (normalizedUnderlying.equals(chain.getUnderlying())) {
                    // Return cached data as-is - eatenDelta and LTP movement are already calculated
                    // The calculation window runs independently at API polling rate
                    log.debug("Returning cached snapshot for underlying='{}' with {} contracts (cache-only, no API calls, no recalculation - values already calculated at API polling rate)", 
                            normalizedUnderlying, chain.getTotalContracts());
                    return ResponseEntity.ok(chain);
                } else {
                    log.warn("Cached snapshot underlying mismatch: requested={}, cached={}", 
                            normalizedUnderlying, chain.getUnderlying());
                }
            }
            
            // Step 3: Both live and cache failed - return empty chain
            log.debug("Both live data and cache unavailable for underlying='{}', returning empty chain", normalizedUnderlying);
            DerivativesChain emptyChain = new DerivativesChain(normalizedUnderlying, new BigDecimal("25000"));
            emptyChain.setDailyStrikePrice(new BigDecimal("25000"));
            emptyChain.setTimestamp(Instant.now());
            emptyChain.setDataSource("NO_DATA");
            return ResponseEntity.ok(emptyChain);
        } catch (Exception e) {
            log.error("Error retrieving latest snapshot for {}: {}", underlying, e.getMessage(), e);
            
            // Last resort: try to return cached data even on error
            try {
                Optional<DerivativesChain> cached = latestSnapshotCacheService.getLatest();
                if (cached.isPresent()) {
                    DerivativesChain chain = cached.get();
                    if (normalizedUnderlying.equals(chain.getUnderlying())) {
                        // Return cached data as-is - values already calculated at API polling rate
                        log.info("Returning cached data as fallback after error (no recalculation)");
                        return ResponseEntity.ok(chain);
                    }
                }
            } catch (Exception cacheError) {
                log.error("Failed to retrieve cache as fallback: {}", cacheError.getMessage());
            }
            
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }
    
    /**
     * Update the API polling interval for backend cache updates.
     * PUT /api/api-polling-interval
     * Body: { "intervalMs": 1000 }
     */
    @CrossOrigin(origins = "*", methods = {RequestMethod.PUT, RequestMethod.OPTIONS})
    @PutMapping("/api-polling-interval")
    public ResponseEntity<?> updateApiPollingInterval(@RequestBody Map<String, Object> request) {
        try {
            Object intervalObj = request.get("intervalMs");
            if (intervalObj == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "intervalMs is required"));
            }
            
            long intervalMs;
            if (intervalObj instanceof Number) {
                intervalMs = ((Number) intervalObj).longValue();
            } else {
                intervalMs = Long.parseLong(intervalObj.toString());
            }
            
            if (intervalMs < 250) {
                return ResponseEntity.badRequest().body(Map.of("error", "Interval must be at least 250ms"));
            }
            
            long oldInterval = dynamicCacheUpdateScheduler.getCurrentInterval();
            log.info("API endpoint: Updating API polling interval from {}ms ({}s) to {}ms ({}s)", 
                oldInterval, oldInterval / 1000.0, intervalMs, intervalMs / 1000.0);
            
            if (intervalMs < 1500) {
                log.warn("API endpoint: WARNING - API polling interval {}ms ({}s) is below 1.5s - may cause crashes", 
                    intervalMs, intervalMs / 1000.0);
            }
            
            dynamicCacheUpdateScheduler.updateInterval(intervalMs);
            
            long newInterval = dynamicCacheUpdateScheduler.getCurrentInterval();
            log.info("API endpoint: Successfully updated API polling interval to {}ms ({}s)", 
                newInterval, newInterval / 1000.0);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "intervalMs", intervalMs,
                "message", "API polling interval updated successfully"
            ));
        } catch (Exception e) {
            log.error("Error updating API polling interval: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Get the current API polling interval.
     * GET /api/api-polling-interval
     */
    @CrossOrigin(origins = "*")
    @GetMapping("/api-polling-interval")
    public ResponseEntity<?> getApiPollingInterval() {
        try {
            long intervalMs = dynamicCacheUpdateScheduler.getCurrentInterval();
            return ResponseEntity.ok(Map.of("intervalMs", intervalMs));
        } catch (Exception e) {
            log.error("Error getting API polling interval: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Legacy endpoint - kept for backward compatibility
     * Update the cache update interval (backend polling rate).
     * PUT /api/refresh-interval
     * Body: { "intervalMs": 1000 }
     * @deprecated Use /api/api-polling-interval instead
     */
    @Deprecated
    @CrossOrigin(origins = "*", methods = {RequestMethod.PUT, RequestMethod.OPTIONS})
    @PutMapping("/refresh-interval")
    public ResponseEntity<?> updateRefreshInterval(@RequestBody Map<String, Object> request) {
        // Redirect to new endpoint
        return updateApiPollingInterval(request);
    }
    
    /**
     * Legacy endpoint - kept for backward compatibility
     * Get the current cache update interval.
     * GET /api/refresh-interval
     * @deprecated Use /api/api-polling-interval instead
     */
    @Deprecated
    @CrossOrigin(origins = "*")
    @GetMapping("/refresh-interval")
    public ResponseEntity<?> getRefreshInterval() {
        // Redirect to new endpoint
        return getApiPollingInterval();
    }
    
    /**
     * Get API polling status and warnings.
     * GET /api/api-polling-status
     */
    @CrossOrigin(origins = "*")
    @GetMapping("/api-polling-status")
    public ResponseEntity<?> getApiPollingStatus() {
        try {
            Map<String, Object> status = dynamicCacheUpdateScheduler.getApiPollingStatus();
            return ResponseEntity.ok(status);
        } catch (Exception e) {
            log.error("Error getting API polling status: {}", e.getMessage(), e);
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Health check endpoint for all API integrations
     * GET /api/health
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> getApiHealth() {
        log.info("API health check requested");
        
        Map<String, Object> health = new HashMap<>();
        health.put("breezeApiEnabled", breezeApiEnabled);
        health.put("zerodhaEnabled", zerodhaEnabled);
        health.put("timestamp", Instant.now());
        
        // Test Zerodha Kite API connectivity
        if (zerodhaEnabled) {
            try {
                Optional<BigDecimal> spotPrice = zerodhaApiAdapter.getSpotPrice("NIFTY");
                health.put("zerodhaSpotPriceAvailable", spotPrice.isPresent());
                if (spotPrice.isPresent()) {
                    health.put("zerodhaCurrentSpotPrice", spotPrice.get());
                }
                
                Optional<DerivativesChain> testChain = zerodhaApiAdapter.getDerivativesChain("NIFTY");
                health.put("zerodhaConnected", testChain.isPresent());
                health.put("zerodhaDataAvailable", testChain.isPresent() && testChain.get().getTotalContracts() > 0);
                
                if (testChain.isPresent()) {
                    health.put("zerodhaFuturesCount", testChain.get().getFutures().size());
                    health.put("zerodhaCallOptionsCount", testChain.get().getCallOptions().size());
                    health.put("zerodhaPutOptionsCount", testChain.get().getPutOptions().size());
                }
            } catch (Exception e) {
                health.put("zerodhaConnected", false);
                health.put("zerodhaError", e.getMessage());
            }
        }
        
        // Test Breeze API connectivity
        if (breezeApiEnabled) {
            try {
                Optional<BigDecimal> spotPrice = breezeApiAdapter.getSpotPrice("NIFTY");
                health.put("breezeApiSpotPriceAvailable", spotPrice.isPresent());
                if (spotPrice.isPresent()) {
                    health.put("breezeApiCurrentSpotPrice", spotPrice.get());
                }
                
                Optional<DerivativesChain> testChain = breezeApiAdapter.getDerivativesChain("NIFTY");
                health.put("breezeApiConnected", testChain.isPresent());
                health.put("breezeApiDataAvailable", testChain.isPresent() && testChain.get().getTotalContracts() > 0);
                
                if (testChain.isPresent()) {
                    health.put("breezeApiFuturesCount", testChain.get().getFutures().size());
                    health.put("breezeApiCallOptionsCount", testChain.get().getCallOptions().size());
                    health.put("breezeApiPutOptionsCount", testChain.get().getPutOptions().size());
                }
            } catch (Exception e) {
                health.put("breezeApiConnected", false);
                health.put("breezeApiError", e.getMessage());
            }
        }
        
        // Determine primary data source
        String primaryDataSource = "NO_DATA";
        if (breezeApiEnabled && (Boolean) health.getOrDefault("breezeApiConnected", false)) {
            primaryDataSource = "BREEZE_API";
        } else if (zerodhaEnabled && (Boolean) health.getOrDefault("zerodhaConnected", false)) {
            primaryDataSource = "ZERODHA_KITE";
        }
        health.put("primaryDataSource", primaryDataSource);
        
        return ResponseEntity.ok(health);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Map<String, Object>> handleConstraintViolation(ConstraintViolationException ex) {
        Map<String, Object> response = new HashMap<>();
        response.put("error", "INVALID_REQUEST");
        response.put("details", ex.getConstraintViolations().stream()
                .map(ConstraintViolation::getMessage)
                .toList());
        return ResponseEntity.badRequest().body(response);
    }

    private String sanitizeUnderlying(String raw) {
        if (!StringUtils.hasText(raw)) {
            return null;
        }
        String normalized = URLDecoder.decode(raw, StandardCharsets.UTF_8).trim().toUpperCase();
        if (!UNDERLYING_PATTERN.matcher(normalized).matches()) {
            return null;
        }
        return normalized;
    }

    private String normalizeSegment(String segment) {
        if (segment == null) {
            return null;
        }
        return SEGMENT_ALIASES.get(segment.trim().toUpperCase());
    }

    private ResponseEntity<Map<String, Object>> validationError(String field, String message) {
        Map<String, Object> body = new HashMap<>();
        body.put("error", "INVALID_" + field.toUpperCase());
        body.put("message", message);
        return ResponseEntity.badRequest().body(body);
    }
    
    /**
     * Calculate eaten delta for all contracts in the chain.
     * This is called on every tick to update the eaten delta values.
     */
    private void calculateEatenDeltaForChain(DerivativesChain chain) {
        if (chain == null) {
            log.warn("calculateEatenDeltaForChain: chain is null");
            return;
        }
        
        int futuresCount = 0;
        int callOptionsCount = 0;
        int putOptionsCount = 0;
        int errorsCount = 0;
        
        try {
            // Process futures
            if (chain.getFutures() != null) {
                for (com.zerodha.dashboard.model.DerivativeContract contract : chain.getFutures()) {
                    try {
                        // calculateEatenDelta sets eatenDelta, bidEaten, and askEaten on the contract
                        eatenDeltaService.calculateEatenDelta(contract);
                        // Values are already set on contract by calculateEatenDelta
                        futuresCount++;
                    } catch (Exception e) {
                        log.error("Error calculating eatenDelta for futures contract {}: {}", 
                            contract != null ? contract.getInstrumentToken() : "null", e.getMessage(), e);
                        errorsCount++;
                        // Set to 0 on error for all eaten values
                        if (contract != null) {
                            contract.setEatenDelta(0L);
                            contract.setBidEaten(0L);
                            contract.setAskEaten(0L);
                        }
                    }
                }
            }
            
            // Process call options
            if (chain.getCallOptions() != null) {
                for (com.zerodha.dashboard.model.DerivativeContract contract : chain.getCallOptions()) {
                    try {
                        // calculateEatenDelta sets eatenDelta, bidEaten, and askEaten on the contract
                        eatenDeltaService.calculateEatenDelta(contract);
                        // Values are already set on contract by calculateEatenDelta
                        callOptionsCount++;
                    } catch (Exception e) {
                        log.error("Error calculating eatenDelta for call option {}: {}", 
                            contract != null ? contract.getInstrumentToken() : "null", e.getMessage(), e);
                        errorsCount++;
                        // Set to 0 on error for all eaten values
                        if (contract != null) {
                            contract.setEatenDelta(0L);
                            contract.setBidEaten(0L);
                            contract.setAskEaten(0L);
                        }
                    }
                }
            }
            
            // Process put options
            if (chain.getPutOptions() != null) {
                for (com.zerodha.dashboard.model.DerivativeContract contract : chain.getPutOptions()) {
                    try {
                        // calculateEatenDelta sets eatenDelta, bidEaten, and askEaten on the contract
                        eatenDeltaService.calculateEatenDelta(contract);
                        // Values are already set on contract by calculateEatenDelta
                        putOptionsCount++;
                    } catch (Exception e) {
                        log.error("Error calculating eatenDelta for put option {}: {}", 
                            contract != null ? contract.getInstrumentToken() : "null", e.getMessage(), e);
                        errorsCount++;
                        // Set to 0 on error for all eaten values
                        if (contract != null) {
                            contract.setEatenDelta(0L);
                            contract.setBidEaten(0L);
                            contract.setAskEaten(0L);
                        }
                    }
                }
            }
            
            log.debug("calculateEatenDeltaForChain completed: futures={}, calls={}, puts={}, errors={}", 
                futuresCount, callOptionsCount, putOptionsCount, errorsCount);
        } catch (Exception e) {
            log.error("Fatal error in calculateEatenDeltaForChain: {}", e.getMessage(), e);
        }
    }
    
    /**
     * Calculate LTP movement for all contracts in the chain.
     * This is called on every request to update the LTP movement values.
     */
    private void calculateLtpMovementForChain(DerivativesChain chain) {
        if (chain == null) {
            log.warn("calculateLtpMovementForChain: chain is null");
            return;
        }
        
        int futuresCount = 0;
        int callOptionsCount = 0;
        int putOptionsCount = 0;
        int errorsCount = 0;
        
        try {
            // Process futures
            if (chain.getFutures() != null) {
                for (com.zerodha.dashboard.model.DerivativeContract contract : chain.getFutures()) {
                    try {
                        ltpMovementService.calculateLtpMovement(contract);
                        futuresCount++;
                    } catch (Exception e) {
                        log.error("Error calculating LTP movement for futures contract {}: {}", 
                            contract != null ? contract.getInstrumentToken() : "null", e.getMessage(), e);
                        errorsCount++;
                        // Set defaults on error
                        if (contract != null) {
                            contract.setLtpMovementDirection("NEUTRAL");
                            contract.setLtpMovementConfidence(0);
                            contract.setLtpMovementIntensity("SLOW");
                        }
                    }
                }
            }
            
            // Process call options
            if (chain.getCallOptions() != null) {
                for (com.zerodha.dashboard.model.DerivativeContract contract : chain.getCallOptions()) {
                    try {
                        ltpMovementService.calculateLtpMovement(contract);
                        callOptionsCount++;
                    } catch (Exception e) {
                        log.error("Error calculating LTP movement for call option {}: {}", 
                            contract != null ? contract.getInstrumentToken() : "null", e.getMessage(), e);
                        errorsCount++;
                        // Set defaults on error
                        if (contract != null) {
                            contract.setLtpMovementDirection("NEUTRAL");
                            contract.setLtpMovementConfidence(0);
                            contract.setLtpMovementIntensity("SLOW");
                        }
                    }
                }
            }
            
            // Process put options
            if (chain.getPutOptions() != null) {
                for (com.zerodha.dashboard.model.DerivativeContract contract : chain.getPutOptions()) {
                    try {
                        ltpMovementService.calculateLtpMovement(contract);
                        putOptionsCount++;
                    } catch (Exception e) {
                        log.error("Error calculating LTP movement for put option {}: {}", 
                            contract != null ? contract.getInstrumentToken() : "null", e.getMessage(), e);
                        errorsCount++;
                        // Set defaults on error
                        if (contract != null) {
                            contract.setLtpMovementDirection("NEUTRAL");
                            contract.setLtpMovementConfidence(0);
                            contract.setLtpMovementIntensity("SLOW");
                        }
                    }
                }
            }
            
            log.debug("calculateLtpMovementForChain completed: futures={}, calls={}, puts={}, errors={}", 
                futuresCount, callOptionsCount, putOptionsCount, errorsCount);
        } catch (Exception e) {
            log.error("Fatal error in calculateLtpMovementForChain: {}", e.getMessage(), e);
        }
    }
}
