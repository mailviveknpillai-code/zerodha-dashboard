package com.zerodha.dashboard.adapter;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.zerodha.dashboard.model.TickSnapshot;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.math.BigDecimal;
import java.net.HttpURLConnection;
import java.net.URL;
import java.time.Instant;
import java.util.Optional;
import java.util.Scanner;

/**
 * Temporary adapter to fetch stock data from Alpha Vantage until Zerodha API is live.
 * Controlled via environment variable ALPHA_VANTAGE_ENABLED=true.
 */
@Component
public class AlphaVantageAdapter {
    private static final Logger log = LoggerFactory.getLogger(AlphaVantageAdapter.class);
    private static final String API_KEY = System.getenv().getOrDefault("ALPHA_VANTAGE_API_KEY", "RUD59ZNA5UWUZH3M");
    private static final String BASE_URL = "https://www.alphavantage.co/query";
    private final ObjectMapper mapper = new ObjectMapper();

    private String normalize(String symbol) {
        if (symbol == null) return null;
        String u = symbol.toUpperCase();
        if ("^NSEI".equals(u) || "NIFTY".equals(u) || "NIFTY50".equals(u) || "NIFTY 50".equals(u)) {
            return "IBM"; // Use IBM as demo proxy for NIFTY until we find working NIFTY symbol
        }
        return symbol;
    }

    private Optional<TickSnapshot> fallbackToEtf(String originalSymbol) {
        // Use NIFTYBEES.NS as a proxy spot if index quote isn't returned
        final String proxy = "NIFTYBEES.NS";
        try {
            String url = String.format("%s?function=GLOBAL_QUOTE&symbol=%s&apikey=%s", BASE_URL, proxy, API_KEY);
            HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);
            conn.connect();
            if (conn.getResponseCode() != 200) return Optional.empty();
            StringBuilder json = new StringBuilder();
            try (Scanner sc = new Scanner(conn.getInputStream())) { while (sc.hasNext()) json.append(sc.nextLine()); }
            JsonNode node = mapper.readTree(json.toString()).path("Global Quote");
            if (node.isMissingNode() || !node.has("05. price")) return Optional.empty();
            TickSnapshot s = new TickSnapshot();
            s.setInstrumentToken(originalSymbol);
            s.setTradingsymbol(originalSymbol);
            s.setLastPrice(new BigDecimal(node.path("05. price").asText("0")));
            s.setVolume(node.path("06. volume").asLong(0));
            s.setSegment("ALPHA_VANTAGE_PROXY");
            s.setTimestamp(Instant.now());
            return Optional.of(s);
        } catch (Exception e) { return Optional.empty(); }
    }

    public Optional<TickSnapshot> getQuote(String symbol) {
        if (symbol == null || symbol.isBlank()) {
            log.warn("AlphaVantageAdapter.getQuote() called with blank symbol");
            return Optional.empty();
        }
        
        String sym = normalize(symbol);
        String url = String.format("%s?function=GLOBAL_QUOTE&symbol=%s&apikey=%s", BASE_URL, sym, API_KEY);
        
        log.info("Fetching AlphaVantage data for symbol='{}'", symbol);
        log.debug("Request URL: {}", url);
        
        try {
            HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);
            conn.connect();

            if (conn.getResponseCode() != 200) {
                log.warn("AlphaVantage request failed: HTTP {}", conn.getResponseCode());
                return fallbackToEtf(symbol);
            }

            StringBuilder json = new StringBuilder();
            try (Scanner sc = new Scanner(conn.getInputStream())) {
                while (sc.hasNext()) json.append(sc.nextLine());
            }

            log.debug("Raw JSON Response: {}", json.toString());

            JsonNode node = mapper.readTree(json.toString()).path("Global Quote");
            if (node.isMissingNode() || !node.has("05. price")) {
                log.warn("No quote data found for {} (payload={})", symbol, json);
                return fallbackToEtf(symbol);
            }

            TickSnapshot s = new TickSnapshot();
            s.setInstrumentToken(symbol);
            s.setTradingsymbol(symbol);
            s.setLastPrice(new BigDecimal(node.path("05. price").asText("0")));
            s.setVolume(node.path("06. volume").asLong(0));
            s.setSegment("ALPHA_VANTAGE");
            s.setTimestamp(Instant.now());

            log.info("Mapped AlphaVantage data: price={}, volume={}, segment={}",
                     s.getLastPrice(), s.getVolume(), s.getSegment());

            return Optional.of(s);
        } catch (IOException e) {
            log.error("AlphaVantage fetch failed: {}", e.getMessage());
            return fallbackToEtf(symbol);
        }
    }
}
