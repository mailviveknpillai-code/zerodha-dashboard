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

    public Optional<TickSnapshot> getQuote(String symbol) {
        log.debug("AlphaVantageAdapter: fetching symbol={} url={}", symbol, BASE_URL);
        String url = String.format("%s?function=GLOBAL_QUOTE&symbol=%s&apikey=%s", BASE_URL, symbol, API_KEY);
        try {
            HttpURLConnection conn = (HttpURLConnection) new URL(url).openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);
            conn.connect();

            if (conn.getResponseCode() != 200) {
                log.warn("AlphaVantage request failed: HTTP {}", conn.getResponseCode());
                return Optional.empty();
            }

            StringBuilder json = new StringBuilder();
            try (Scanner sc = new Scanner(conn.getInputStream())) {
                while (sc.hasNext()) json.append(sc.nextLine());
            }

            JsonNode node = mapper.readTree(json.toString()).path("Global Quote");
            if (node.isMissingNode() || !node.has("05. price")) {
                log.warn("No quote data found for {}", symbol);
                return Optional.empty();
            }

            TickSnapshot s = new TickSnapshot();
            s.setInstrumentToken(symbol);
            s.setTradingsymbol(symbol);
            s.setLastPrice(new BigDecimal(node.path("05. price").asText("0")));
            s.setVolume(node.path("06. volume").asLong(0));
            s.setSegment("ALPHA_VANTAGE");
            s.setTimestamp(Instant.now());

            return Optional.of(s);
        } catch (IOException e) {
            log.error("AlphaVantage fetch failed: {}", e.getMessage());
            return Optional.empty();
        }
    }
}
