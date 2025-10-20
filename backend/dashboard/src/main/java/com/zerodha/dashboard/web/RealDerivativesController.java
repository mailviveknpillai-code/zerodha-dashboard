package com.zerodha.dashboard.web;

import com.zerodha.dashboard.adapter.AlphaVantageAdapter;
import com.zerodha.dashboard.adapter.NseDerivativesAdapter;
import com.zerodha.dashboard.model.DerivativesChain;
import com.zerodha.dashboard.model.TickSnapshot;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

/**
 * Controller for real derivatives data using Alpha Vantage for spot price and NSE for derivatives
 */
@RestController
@RequestMapping("/api")
public class RealDerivativesController {
    private final Logger log = LoggerFactory.getLogger(RealDerivativesController.class);
    private final AlphaVantageAdapter alphaVantageAdapter;
    private final NseDerivativesAdapter nseDerivativesAdapter;
    
    @Value("${alpha.vantage.enabled:false}")
    private boolean alphaVantageEnabled;
    
    @Value("${nse.derivatives.enabled:true}")
    private boolean nseDerivativesEnabled;

    public RealDerivativesController(AlphaVantageAdapter alphaVantageAdapter, NseDerivativesAdapter nseDerivativesAdapter) {
        this.alphaVantageAdapter = alphaVantageAdapter;
        this.nseDerivativesAdapter = nseDerivativesAdapter;
    }

    /**
     * Get real NIFTY derivatives chain using Alpha Vantage for spot price and NSE for derivatives
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
            BigDecimal spotPrice;
            
            // Get real spot price from Alpha Vantage if enabled
            if (alphaVantageEnabled) {
                Optional<TickSnapshot> spotSnapshot = alphaVantageAdapter.getQuote(normalizedUnderlying);
                if (spotSnapshot.isPresent()) {
                    spotPrice = spotSnapshot.get().getLastPrice();
                    log.info("Retrieved real spot price from Alpha Vantage for {}: {}", normalizedUnderlying, spotPrice);
                } else {
                    log.warn("Alpha Vantage spot price not available, using fallback");
                    spotPrice = new BigDecimal("25000"); // Fallback price
                }
            } else {
                log.info("Alpha Vantage disabled, using fallback spot price");
                spotPrice = new BigDecimal("25000"); // Fallback price
            }

            // Get real derivatives data from NSE if enabled
            if (nseDerivativesEnabled) {
                Optional<DerivativesChain> derivativesChain = nseDerivativesAdapter.getDerivativesChain(spotPrice);
                if (derivativesChain.isPresent()) {
                    log.info("Successfully generated real derivatives chain with {} total contracts", 
                            derivativesChain.get().getTotalContracts());
                    return ResponseEntity.ok(derivativesChain.get());
                } else {
                    log.warn("Failed to generate real derivatives chain for {}", normalizedUnderlying);
                    return ResponseEntity.status(500).body("Failed to generate real derivatives data");
                }
            } else {
                log.warn("NSE derivatives disabled, cannot provide real data");
                return ResponseEntity.status(503).body("Real derivatives data not available");
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

        try {
            // Get full derivatives chain
            ResponseEntity<?> chainResponse = getRealDerivativesChain(underlying);
            if (chainResponse.getStatusCode().is2xxSuccessful() && chainResponse.getBody() instanceof DerivativesChain) {
                DerivativesChain chain = (DerivativesChain) chainResponse.getBody();
                
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
}
