package com.zerodha.dashboard.web;

import com.zerodha.dashboard.adapter.BreezeApiAdapter;
import com.zerodha.dashboard.adapter.ZerodhaApiAdapter;
import com.zerodha.dashboard.model.DerivativesChain;
import com.zerodha.dashboard.service.MockDataService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Controller for real derivatives data using Breeze API (primary) and Zerodha Kite API stopping
 */
@RestController
@RequestMapping("/api")
public class RealDerivativesController {
    private final Logger log = LoggerFactory.getLogger(RealDerivativesController.class);
    private final BreezeApiAdapter breezeApiAdapter;
    private final ZerodhaApiAdapter zerodhaApiAdapter;
    private final MockDataService mockDataService;
    
    @Value("${breeze.api.enabled:true}")
    private boolean breezeApiEnabled;
    
    @Value("${zerodha.enabled:false}")
    private boolean zerodhaEnabled;
    
    @Value("${mock.data.enabled:false}")
    private boolean mockDataEnabled;

    public RealDerivativesController(BreezeApiAdapter breezeApiAdapter, ZerodhaApiAdapter zerodhaApiAdapter, MockDataService mockDataService) {
        this.breezeApiAdapter = breezeApiAdapter;
        this.zerodhaApiAdapter = zerodhaApiAdapter;
        this.mockDataService = mockDataService;
    }

    /**
     * Get real NIFTY derivatives chain using Breeze API (primary) or Zerodha Kite API (production)
     * GET /api/real-derivatives?underlying=NIFTY
     */
    @GetMapping("/real-derivatives")
    public ResponseEntity<?> getRealDerivativesChain(@RequestParam(value = "underlying", defaultValue = "NIFTY") String underlying) {
        log.info("real-derivatives request received for underlying='{}'", underlying);

        if (!StringUtils.hasText(underlying)) {
            log.warn("real-derivatives called with empty underlying");
            return ResponseEntity.badRequest().body("underlying query parameter is required");
        }

        String normalizedUnderlying = URLDecoder.decode(underlying, StandardCharsets.UTF_8).trim().toUpperCase();
        log.info("real-derivatives normalized underlying='{}'", normalizedUnderlying);

        try {
            Optional<DerivativesChain> derivativesChain = Optional.empty();
            String dataSource = "NO_DATA";
            
            // Priority: Zerodha Kite API (if enabled) > Breeze API > Mock Data
            // Mock data is disabled when Zerodha is enabled
            if (zerodhaEnabled) {
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
            if (!derivativesChain.isPresent() && breezeApiEnabled && !zerodhaEnabled) {
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
            if (!derivativesChain.isPresent() && mockDataEnabled && !zerodhaEnabled) {
                log.info("Using mock data for UI testing (Zerodha is disabled)");
                derivativesChain = Optional.of(mockDataService.generateMockDerivativesChain());
                dataSource = "MOCK_DATA";
                log.info("Successfully generated mock derivatives chain");
            }
            
            if (derivativesChain.isPresent()) {
                log.info("Successfully fetched real derivatives chain with {} total contracts using {}", 
                        derivativesChain.get().getTotalContracts(), dataSource);
                return ResponseEntity.ok(derivativesChain.get());
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

        if (!StringUtils.hasText(segment)) {
            return ResponseEntity.badRequest().body("segment parameter is required");
        }

        String normalizedUnderlying = StringUtils.capitalize(underlying.toLowerCase());

        try {
            // Get full derivatives chain
            ResponseEntity<?> chainResponse = getRealDerivativesChain(underlying);
            if (chainResponse.getStatusCode().is2xxSuccessful() && chainResponse.getBody() instanceof DerivativesChain) {
                DerivativesChain chain = (DerivativesChain) chainResponse.getBody();
                if (chain != null) {
                    switch (segment.toUpperCase()) {
                        case "FUTURES":
                            return ResponseEntity.ok(chain.getFutures());
                        case "CALL_OPTIONS":
                        case "CALLS":
                            return ResponseEntity.ok(chain.getCallOptions());
                        case "PUT_OPTIONS":
                        case "PUTS":
                            return ResponseEntity.ok(chain.getPutOptions());
                        default:
                            return ResponseEntity.badRequest().body("Invalid segment. Use: FUTURES, CALL_OPTIONS, PUT_OPTIONS");
                    }
                } else {
                    log.warn("Derivatives chain is null for segment {} and underlying {}", segment, normalizedUnderlying);
                    return ResponseEntity.status(500).body("Failed to retrieve derivatives data for segment");
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

        try {
            // Get full derivatives chain
            ResponseEntity<?> chainResponse = getRealDerivativesChain(underlying);
            if (chainResponse.getStatusCode().is2xxSuccessful() && chainResponse.getBody() instanceof DerivativesChain) {
                DerivativesChain chain = (DerivativesChain) chainResponse.getBody();
                if (chain != null) {
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
                    log.warn("Derivatives chain is null for strike price monitoring for {}", underlying);
                    return ResponseEntity.status(500).body("Failed to retrieve strike price monitoring data");
                }
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
}
