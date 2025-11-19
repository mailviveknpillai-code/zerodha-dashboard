package com.zerodha.dashboard.web;

import com.zerodha.dashboard.adapter.BreezeApiAdapter;
import com.zerodha.dashboard.adapter.ZerodhaApiAdapter;
import com.zerodha.dashboard.model.DerivativesChain;
import com.zerodha.dashboard.model.DerivativeContract;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;
import org.springframework.util.StringUtils;

/**
 * Controller for strike price monitoring endpoints
 * Provides data for monitoring trades around daily strike price
 */
@RestController
@RequestMapping("/api/strike-monitoring")
@Validated
public class StrikePriceMonitoringController {

    private static final Pattern UNDERLYING_PATTERN = Pattern.compile("^[A-Z0-9_-]{1,15}$");

    private static final Logger log = LoggerFactory.getLogger(StrikePriceMonitoringController.class);

    private final BreezeApiAdapter breezeApiAdapter;
    private final ZerodhaApiAdapter zerodhaApiAdapter;

    @Value("${breeze.api.enabled:true}")
    private boolean breezeApiEnabled;

    @Value("${zerodha.enabled:false}")
    private boolean zerodhaEnabled;

    public StrikePriceMonitoringController(BreezeApiAdapter breezeApiAdapter,
                                           ZerodhaApiAdapter zerodhaApiAdapter) {
        this.breezeApiAdapter = breezeApiAdapter;
        this.zerodhaApiAdapter = zerodhaApiAdapter;
    }
    
    /**
     * Get strike price monitoring data
     * Returns contracts around the daily strike price (±50 points)
     */
    @GetMapping
    public ResponseEntity<?> getStrikePriceMonitoring(
            @RequestParam(defaultValue = "NIFTY") @Size(min = 1, max = 15) String underlying,
            @RequestParam(defaultValue = "25000") @Positive BigDecimal spot) {
        
        String normalizedUnderlying = sanitizeUnderlying(underlying);
        if (normalizedUnderlying == null) {
            return invalidUnderlyingResponse();
        }

        log.info("Strike price monitoring request: underlying={}, spot={}", normalizedUnderlying, spot);
        
        try {
            Optional<DerivativesChain> chainOpt = loadChain(normalizedUnderlying);
            
            if (chainOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            
            DerivativesChain chain = chainOpt.get();
            Map<String, Object> response = new HashMap<>();
            
            response.put("underlying", chain.getUnderlying());
            response.put("spotPrice", chain.getSpotPrice());
            response.put("dailyStrikePrice", chain.getDailyStrikePrice());
            response.put("monitoringContracts", chain.getStrikePriceMonitoring());
            response.put("aboveStrike", chain.getAboveStrikePrice());
            response.put("belowStrike", chain.getBelowStrikePrice());
            response.put("timestamp", chain.getTimestamp());
            
            log.info("Returned strike price monitoring data: {} contracts around strike {}", 
                    chain.getStrikePriceMonitoring().size(), chain.getDailyStrikePrice());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("Error fetching strike price monitoring data", e);
            return ResponseEntity.internalServerError().body("Error fetching strike price monitoring data");
        }
    }
    
    /**
     * Get contracts above the daily strike price
     */
    @GetMapping("/above")
    public ResponseEntity<?> getAboveStrikePrice(
            @RequestParam(defaultValue = "NIFTY") @Size(min = 1, max = 15) String underlying,
            @RequestParam(defaultValue = "25000") @Positive BigDecimal spot) {
        
        String normalizedUnderlying = sanitizeUnderlying(underlying);
        if (normalizedUnderlying == null) {
            return invalidUnderlyingResponse();
        }

        log.info("Above strike price request: underlying={}, spot={}", normalizedUnderlying, spot);
        
        try {
            Optional<DerivativesChain> chainOpt = loadChain(normalizedUnderlying);
            
            if (chainOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            
            DerivativesChain chain = chainOpt.get();
            List<DerivativeContract> aboveStrike = chain.getAboveStrikePrice();
            
            log.info("Returned {} contracts above strike price {}", aboveStrike.size(), chain.getDailyStrikePrice());
            return ResponseEntity.ok(aboveStrike);
            
        } catch (Exception e) {
            log.error("Error fetching above strike price data", e);
            return ResponseEntity.internalServerError().body("Error fetching above strike price data");
        }
    }
    
    /**
     * Get contracts below the daily strike price
     */
    @GetMapping("/below")
    public ResponseEntity<?> getBelowStrikePrice(
            @RequestParam(defaultValue = "NIFTY") @Size(min = 1, max = 15) String underlying,
            @RequestParam(defaultValue = "25000") @Positive BigDecimal spot) {
        
        String normalizedUnderlying = sanitizeUnderlying(underlying);
        if (normalizedUnderlying == null) {
            return invalidUnderlyingResponse();
        }

        log.info("Below strike price request: underlying={}, spot={}", normalizedUnderlying, spot);
        
        try {
            Optional<DerivativesChain> chainOpt = loadChain(normalizedUnderlying);
            
            if (chainOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            
            DerivativesChain chain = chainOpt.get();
            List<DerivativeContract> belowStrike = chain.getBelowStrikePrice();
            
            log.info("Returned {} contracts below strike price {}", belowStrike.size(), chain.getDailyStrikePrice());
            return ResponseEntity.ok(belowStrike);
            
        } catch (Exception e) {
            log.error("Error fetching below strike price data", e);
            return ResponseEntity.internalServerError().body("Error fetching below strike price data");
        }
    }

    private Optional<DerivativesChain> loadChain(String normalizedUnderlying) {
        Optional<DerivativesChain> chainOpt = Optional.empty();

        if (breezeApiEnabled) {
            chainOpt = breezeApiAdapter.getDerivativesChain(normalizedUnderlying);
        }
        
        if (chainOpt.isEmpty() && zerodhaEnabled) {
            chainOpt = zerodhaApiAdapter.getDerivativesChain(normalizedUnderlying);
        }
        return chainOpt;
    }

    private String sanitizeUnderlying(String rawUnderlying) {
        if (!StringUtils.hasText(rawUnderlying)) {
            return null;
        }
        String normalized = URLDecoder.decode(rawUnderlying, StandardCharsets.UTF_8).trim().toUpperCase();
        if (!UNDERLYING_PATTERN.matcher(normalized).matches()) {
            return null;
        }
        return normalized;
    }

    private ResponseEntity<Map<String, String>> invalidUnderlyingResponse() {
        Map<String, String> body = new HashMap<>();
        body.put("error", "INVALID_UNDERLYING");
        body.put("message", "Underlying must be 1-15 characters (A-Z, 0-9, hyphen or underscore)");
        return ResponseEntity.badRequest().body(body);
    }
}
