package com.zerodha.dashboard.web;

import com.zerodha.dashboard.adapter.AlphaVantageAdapter;
import com.zerodha.dashboard.adapter.DerivativesAdapter;
import com.zerodha.dashboard.model.DerivativesChain;
import com.zerodha.dashboard.model.TickSnapshot;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

/**
 * Controller for NIFTY derivatives data
 */
@RestController
@RequestMapping("/api")
public class DerivativesController {
    private final Logger log = LoggerFactory.getLogger(DerivativesController.class);
    private final AlphaVantageAdapter alphaVantageAdapter;
    private final DerivativesAdapter derivativesAdapter;

    public DerivativesController(AlphaVantageAdapter alphaVantageAdapter, DerivativesAdapter derivativesAdapter) {
        this.alphaVantageAdapter = alphaVantageAdapter;
        this.derivativesAdapter = derivativesAdapter;
    }

    /**
     * Get NIFTY derivatives chain (futures and options)
     * GET /api/derivatives?underlying=NIFTY
     */
    @GetMapping("/derivatives")
    public ResponseEntity<?> getDerivativesChain(@RequestParam(value = "underlying", defaultValue = "NIFTY") String underlying) {
        log.info("derivatives request received for underlying='{}'", underlying);

        if (!StringUtils.hasText(underlying)) {
            log.warn("derivatives called with empty underlying");
            return ResponseEntity.badRequest().body("underlying query parameter is required");
        }

        String normalizedUnderlying = URLDecoder.decode(underlying, StandardCharsets.UTF_8).trim().toUpperCase();
        log.info("derivatives normalized underlying='{}'", normalizedUnderlying);

        try {
            // Get spot price from Alpha Vantage
            Optional<TickSnapshot> spotSnapshot = alphaVantageAdapter.getQuote(normalizedUnderlying);
            if (!spotSnapshot.isPresent()) {
                log.warn("No spot price available for underlying: {}", normalizedUnderlying);
                return ResponseEntity.status(404).body("No spot price data available for: " + normalizedUnderlying);
            }

            BigDecimal spotPrice = spotSnapshot.get().getLastPrice();
            log.info("Retrieved spot price for {}: {}", normalizedUnderlying, spotPrice);

            // Generate derivatives chain based on spot price
            Optional<DerivativesChain> derivativesChain = derivativesAdapter.getDerivativesChain(spotPrice);
            if (derivativesChain.isPresent()) {
                log.info("Successfully generated derivatives chain with {} total contracts", 
                        derivativesChain.get().getTotalContracts());
                return ResponseEntity.ok(derivativesChain.get());
            } else {
                log.warn("Failed to generate derivatives chain for {}", normalizedUnderlying);
                return ResponseEntity.status(500).body("Failed to generate derivatives data");
            }

        } catch (Exception e) {
            log.error("Error generating derivatives for {}: {}", normalizedUnderlying, e.getMessage(), e);
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }

    /**
     * Get derivatives by segment
     * GET /api/derivatives/segment?segment=FUTURES&underlying=NIFTY
     */
    @GetMapping("/derivatives/segment")
    public ResponseEntity<?> getDerivativesBySegment(
            @RequestParam("segment") String segment,
            @RequestParam(value = "underlying", defaultValue = "NIFTY") String underlying) {
        
        log.info("derivatives/segment request: segment='{}', underlying='{}'", segment, underlying);

        if (!StringUtils.hasText(segment)) {
            return ResponseEntity.badRequest().body("segment parameter is required");
        }

        try {
            // Get full derivatives chain
            ResponseEntity<?> chainResponse = getDerivativesChain(underlying);
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
            log.error("Error getting derivatives by segment {}: {}", segment, e.getMessage(), e);
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }
}
