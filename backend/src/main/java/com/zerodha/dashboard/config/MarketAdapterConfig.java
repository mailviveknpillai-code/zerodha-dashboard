package com.zerodha.dashboard.config;

import com.zerodha.dashboard.adapter.MarketAdapter;
import com.zerodha.dashboard.adapter.MockMarketAdapter;
import com.zerodha.dashboard.adapter.ZerodhaMarketAdapter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Picks MarketAdapter implementation based on property 'market.adapter'.
 * - market.adapter=mock (default) -> MockMarketAdapter
 * - market.adapter=zerodha -> ZerodhaMarketAdapter (skeleton)
 */
@Configuration
public class MarketAdapterConfig {

    @Bean
    @ConditionalOnProperty(name = "market.adapter", havingValue = "mock", matchIfMissing = true)
    public MarketAdapter mockMarketAdapter() {
        return new MockMarketAdapter(1000L);
    }

    @Bean
    @ConditionalOnProperty(name = "market.adapter", havingValue = "zerodha")
    public MarketAdapter zerodhaMarketAdapter() {
        // keep simple for now; later inject credentials/config
        return new ZerodhaMarketAdapter();
    }
}
