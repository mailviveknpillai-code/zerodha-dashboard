package com.zerodha.dashboard.adapter;

import com.zerodha.dashboard.model.TickSnapshot;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Optional;
import java.util.function.Consumer;

/**
 * Skeleton for Zerodha market adapter. Implementation will be added when API/credentials are available.
 * This class should be implemented using Kite Connect websocket/REST and map payloads to TickSnapshot.
 */
public class ZerodhaMarketAdapter implements MarketAdapter {
    private static final Logger log = LoggerFactory.getLogger(ZerodhaMarketAdapter.class);

    public ZerodhaMarketAdapter(/* inject config/credentials beans when ready */) {
        // keep constructor simple for now
    }

    @Override
    public Runnable subscribe(Consumer<TickSnapshot> consumer) {
        // TODO: implement subscription using Zerodha Kite websocket
        log.info("ZerodhaMarketAdapter subscribe called - skeleton (no-op)");
        return () -> { /* stop handle no-op */ };
    }

    @Override
    public Optional<TickSnapshot> getSnapshotByToken(String token) {
        // TODO: query an in-memory cache or a short-term store
        return Optional.empty();
    }
}
