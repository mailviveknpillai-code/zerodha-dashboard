package com.zerodha.dashboard.adapter;

import com.zerodha.dashboard.model.TickSnapshot;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;

@Component
public class MockMarketAdapter implements MarketAdapter {

    private static final Logger log = LoggerFactory.getLogger(MockMarketAdapter.class);

    @Autowired(required = false)
    private AlphaVantageAdapter alphaVantageAdapter;

    private final Environment env;

    @Value("${alpha.vantage.enabled:false}")
    private boolean alphaVantageEnabled;

    @Value("${zerodha.enabled:false}")
    private boolean zerodhaEnabled;

    public MockMarketAdapter(Environment env) {
        this.env = env;
    }

    private boolean useAlphaVantage() {
        return alphaVantageEnabled || Boolean.parseBoolean(env.getProperty("ALPHA_VANTAGE_ENABLED", "false"));
    }

    @Override
    public void fetchAndEmitSnapshots(String symbol) {
        log.info("fetchAndEmitSnapshots: using adapter={}", useAlphaVantage() ? "ALPHA" : (zerodhaEnabled ? "ZERODHA" : "MOCK"));

        if (useAlphaVantage() && alphaVantageAdapter != null) {
            alphaVantageAdapter.getQuote(symbol).ifPresent(snapshot -> {
                log.info("Fetched data from Alpha Vantage for {}", symbol);
                publishSnapshot(snapshot);
            });
            return;
        }

        // Fallback to mock data if Alpha Vantage is not enabled or not available, and Zerodha is not enabled
        log.info("Fetching mock data for {} (Zerodha or Mock fallback)", symbol);
        TickSnapshot snapshot = new TickSnapshot();
        snapshot.setInstrumentToken(symbol);
        snapshot.setTradingsymbol(symbol);
        snapshot.setLastPrice(new BigDecimal("100.00"));
        snapshot.setVolume(1000L);
        snapshot.setSegment("MOCK");
        snapshot.setTimestamp(Instant.now());
        publishSnapshot(snapshot);
    }

    private void publishSnapshot(TickSnapshot snapshot) {
        log.info("Published snapshot: {}", snapshot);
    }

    @Override
    public Optional<TickSnapshot> getQuote(String symbol) {
        log.debug("getQuote called for symbol={}", symbol);
        if (useAlphaVantage() && alphaVantageAdapter != null) {
            log.info("Retrieving quote from Alpha Vantage for {}", symbol);
            return alphaVantageAdapter.getQuote(symbol);
        }
        log.info("Returning empty quote for {} (Alpha Vantage disabled or adapter not available)", symbol);
        return Optional.empty();
    }
}
