package com.zerodha.dashboard.web;

import com.zerodha.dashboard.adapter.AlphaVantageAdapter;
import com.zerodha.dashboard.model.TickSnapshot;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Optional;

@RestController
@RequestMapping("/api")
public class AlphaDemoController {
    private static final Logger log = LoggerFactory.getLogger(AlphaDemoController.class);
    private final AlphaVantageAdapter alphaVantageAdapter;

    public AlphaDemoController(AlphaVantageAdapter alphaVantageAdapter) {
        this.alphaVantageAdapter = alphaVantageAdapter;
    }

    @GetMapping("/alpha-demo")
    public ResponseEntity<?> getAlphaDemo(@RequestParam("symbol") String symbolRaw) {
        log.info("alpha-demo request received raw symbol='{}'", symbolRaw);
        if (!StringUtils.hasText(symbolRaw)) {
            return ResponseEntity.badRequest().body("symbol query parameter is required");
        }
        String symbol = URLDecoder.decode(symbolRaw, StandardCharsets.UTF_8).trim();
        log.info("alpha-demo decoded symbol='{}'", symbol);
        try {
            Optional<TickSnapshot> snapshot = alphaVantageAdapter.getQuote(symbol);
            return snapshot.<ResponseEntity<?>>map(ResponseEntity::ok)
                    .orElseGet(() -> ResponseEntity.status(404).body("no data for symbol: " + symbol));
        } catch (Exception e) {
            log.error("alpha-demo: error fetching symbol {}", symbol, e);
            return ResponseEntity.status(500).body("error: " + e.getMessage());
        }
    }
}
