package com.zerodha.dashboard.adapter;

import com.zerodha.dashboard.model.TickSnapshot;

import java.util.Optional;
import java.util.function.Consumer;

/**
 * Abstraction for market data provider. Implementations:
 * - MockMarketAdapter (development)
 * - ZerodhaMarketAdapter (real, implemented later)
 */
public interface MarketAdapter {

    /**
     * Subscribe to live ticks. Adapter implementation must call consumer.accept(snapshot)
     * for each new snapshot. Implementations should perform this asynchronously.
     *
     * The returned Runnable is a stop handle that will stop the subscription when run.
     *
     * @param consumer consumer to receive snapshots
     * @return stop handle (call run() to stop)
     */
    Runnable subscribe(Consumer<TickSnapshot> consumer);

    /**
     * Return latest snapshot for a token if available.
     */
    Optional<TickSnapshot> getSnapshotByToken(String token);

    /**
     * Graceful shutdown hook for adapter if needed.
     */
    default void close() throws Exception { /* optional */ }
}
