package com.zerodha.dashboard.web;

import com.zerodha.dashboard.adapter.DerivativesAdapter;
import com.zerodha.dashboard.model.DerivativesChain;
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
 * Mock controller for NIFTY derivatives data (doesn't depend on Alpha Vantage)
 */
@RestController
@RequestMapping("/api")
public class MockDerivativesController {
    private final Logger log = LoggerFactory.getLogger(MockDerivativesController.class);
    private final DerivativesAdapter derivativesAdapter;

    public MockDerivativesController(DerivativesAdapter derivativesAdapter) {
        this.derivativesAdapter = derivativesAdapter;
    }

    /**
     * Get NIFTY derivatives chain (futures and options) with mock spot price
     * GET /api/mock-derivatives?underlying=NIFTY&spot=25000
     */
    @GetMapping("/mock-derivatives")
    public ResponseEntity<?> getMockDerivativesChain(
            @RequestParam(value = "underlying", defaultValue = "NIFTY") String underlying,
            @RequestParam(value = "spot", defaultValue = "25000") BigDecimal spotPrice) {
        
        log.info("mock-derivatives request received for underlying='{}', spot='{}'", underlying, spotPrice);

        if (!StringUtils.hasText(underlying)) {
            log.warn("mock-derivatives called with empty underlying");
            return ResponseEntity.badRequest().body("underlying query parameter is required");
        }

        String normalizedUnderlying = URLDecoder.decode(underlying, StandardCharsets.UTF_8).trim().toUpperCase();
        log.info("mock-derivatives normalized underlying='{}'", normalizedUnderlying);

        try {
            // Generate derivatives chain based on provided spot price
            Optional<DerivativesChain> derivativesChain = derivativesAdapter.getDerivativesChain(spotPrice);
            if (derivativesChain.isPresent()) {
                log.info("Successfully generated mock derivatives chain with {} total contracts", 
                        derivativesChain.get().getTotalContracts());
                return ResponseEntity.ok(derivativesChain.get());
            } else {
                log.warn("Failed to generate mock derivatives chain for {}", normalizedUnderlying);
                return ResponseEntity.status(500).body("Failed to generate derivatives data");
            }

        } catch (Exception e) {
            log.error("Error generating mock derivatives for {}: {}", normalizedUnderlying, e.getMessage(), e);
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }

    /**
     * Get mock derivatives by segment
     * GET /api/mock-derivatives/segment?segment=FUTURES&underlying=NIFTY&spot=25000
     */
    @GetMapping("/mock-derivatives/segment")
    public ResponseEntity<?> getMockDerivativesBySegment(
            @RequestParam("segment") String segment,
            @RequestParam(value = "underlying", defaultValue = "NIFTY") String underlying,
            @RequestParam(value = "spot", defaultValue = "25000") BigDecimal spotPrice) {
        
        log.info("mock-derivatives/segment request: segment='{}', underlying='{}', spot='{}'", 
                segment, underlying, spotPrice);

        if (!StringUtils.hasText(segment)) {
            return ResponseEntity.badRequest().body("segment parameter is required");
        }

        try {
            // Get full derivatives chain
            ResponseEntity<?> chainResponse = getMockDerivativesChain(underlying, spotPrice);
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
            log.error("Error getting mock derivatives by segment {}: {}", segment, e.getMessage(), e);
            return ResponseEntity.status(500).body("Error: " + e.getMessage());
        }
    }
}
