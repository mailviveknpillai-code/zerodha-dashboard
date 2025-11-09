package com.zerodha.dashboard.adapter;

import com.zerodha.dashboard.model.TickSnapshot;
import java.util.Optional;

public interface MarketAdapter {
    void fetchAndEmitSnapshots(String symbol);
    Optional<TickSnapshot> getQuote(String symbol);
}
