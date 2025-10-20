package com.zerodha.dashboard.controller;

import com.zerodha.dashboard.adapter.AlphaVantageAdapter;
import com.zerodha.dashboard.model.TickSnapshot;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api")
public class AlphaDemoController {

    private static final Logger logger = LoggerFactory.getLogger(AlphaDemoController.class);
    private final AlphaVantageAdapter alphaVantageAdapter;

    @Value("${alpha.vantage.enabled:false}")
    private boolean alphaVantageEnabled;

    @Autowired
    public AlphaDemoController(AlphaVantageAdapter alphaVantageAdapter) {
        this.alphaVantageAdapter = alphaVantageAdapter;
    }

    /**
     * Demo endpoint that fetches a single quote from Alpha Vantage and returns it.
     * Query param: symbol (required)
     *
     * Example: GET /api/alpha-demo?symbol=IBM
     */
    @GetMapping("/alpha-demo")
    public ResponseEntity<?> getAlphaDemo(@RequestParam("symbol") String symbol) {
        logger.debug("GET /api/alpha-demo?symbol={} called", symbol);
        if (!alphaVantageEnabled) {
            logger.warn("Alpha Vantage demo endpoint is disabled. Set alpha.vantage.enabled=true to enable.");
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body("Alpha Vantage demo is disabled");
        }

        if (symbol == null || symbol.trim().isEmpty()) {
            logger.warn("Missing required query param: symbol");
            return ResponseEntity.badRequest().body("Missing required query param: symbol");
        }
        try {
            Optional<TickSnapshot> maybe = alphaVantageAdapter.getQuote(symbol.trim());
            if (maybe.isPresent()) {
                logger.info("Returned Alpha Vantage data for {}", symbol);
                return ResponseEntity.ok(maybe.get());
            } else {
                logger.warn("AlphaVantage returned no data or an error for {}", symbol);
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body("AlphaVantage returned no data or an error");
            }
        } catch (Exception e) {
            logger.error("Error fetching Alpha Vantage data for {}", symbol, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error fetching Alpha Vantage data");
        }
    }
}
