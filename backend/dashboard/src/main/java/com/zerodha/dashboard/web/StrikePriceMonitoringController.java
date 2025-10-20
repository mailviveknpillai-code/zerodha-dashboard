package com.zerodha.dashboard.web;

import com.zerodha.dashboard.adapter.DerivativesAdapter;
import com.zerodha.dashboard.model.DerivativesChain;
import com.zerodha.dashboard.model.DerivativeContract;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Controller for strike price monitoring endpoints
 * Provides data for monitoring trades around daily strike price
 */
@RestController
@RequestMapping("/api/strike-monitoring")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"})
public class StrikePriceMonitoringController {
    
    private static final Logger log = LoggerFactory.getLogger(StrikePriceMonitoringController.class);
    
    @Autowired
    private DerivativesAdapter derivativesAdapter;
    
    /**
     * Get strike price monitoring data
     * Returns contracts around the daily strike price (±50 points)
     */
    @GetMapping
    public ResponseEntity<?> getStrikePriceMonitoring(
            @RequestParam(defaultValue = "NIFTY") String underlying,
            @RequestParam(defaultValue = "25000") BigDecimal spot) {
        
        log.info("Strike price monitoring request: underlying={}, spot={}", underlying, spot);
        
        try {
            Optional<DerivativesChain> chainOpt = derivativesAdapter.getDerivativesChain(spot);
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
            @RequestParam(defaultValue = "NIFTY") String underlying,
            @RequestParam(defaultValue = "25000") BigDecimal spot) {
        
        log.info("Above strike price request: underlying={}, spot={}", underlying, spot);
        
        try {
            Optional<DerivativesChain> chainOpt = derivativesAdapter.getDerivativesChain(spot);
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
            @RequestParam(defaultValue = "NIFTY") String underlying,
            @RequestParam(defaultValue = "25000") BigDecimal spot) {
        
        log.info("Below strike price request: underlying={}, spot={}", underlying, spot);
        
        try {
            Optional<DerivativesChain> chainOpt = derivativesAdapter.getDerivativesChain(spot);
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
}
