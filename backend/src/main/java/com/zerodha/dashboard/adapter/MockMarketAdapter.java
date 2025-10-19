package com.zerodha.dashboard.adapter;

import com.zerodha.dashboard.model.TickSnapshot;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Mock adapter emits synthetic ticks at configurable interval.
 * Intended for development and CI (no Zerodha credentials).
 */
public class MockMarketAdapter implements MarketAdapter {
    private static final Logger log = LoggerFactory.getLogger(MockMarketAdapter.class);

    private final ScheduledExecutorService executor = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "mock-market-adapter");
        t.setDaemon(true);
        return t;
    });
    private final Map<String, TickSnapshot> store = new ConcurrentHashMap<>();
    private final Random rnd = new Random();
    private final AtomicBoolean started = new AtomicBoolean(false);
    private ScheduledFuture<?> future;

    /** Emit interval in milliseconds (default 1000 ms). */
    private final long intervalMillis;

    public MockMarketAdapter() {
        this(1000L);
    }

    public MockMarketAdapter(long intervalMillis) {
        this.intervalMillis = intervalMillis;
    }

    @Override
    public Runnable subscribe(Consumer<TickSnapshot> consumer) {
        if (started.getAndSet(true)) {
            // already started, return a no-op stop handle
            return () -> { /* no-op */ };
        }
        // Immediately emit one snapshot set to the consumer
        try {
            TickSnapshot fut = makeSnapshot("NIFTY", "NEAR", "0", TickSnapshot.InstrumentType.FUT, 22411, 54320);
            TickSnapshot call = makeSnapshot("NIFTY", "NEAR", "22450", TickSnapshot.InstrumentType.CALL, 58.25, 45100);
            TickSnapshot put = makeSnapshot("NIFTY", "NEAR", "22450", TickSnapshot.InstrumentType.PUT, 43.10, 35500);

            store.put(fut.getInstrumentToken(), fut);
            store.put(call.getInstrumentToken(), call);
            store.put(put.getInstrumentToken(), put);

            consumer.accept(fut);
            consumer.accept(call);
            consumer.accept(put);
        } catch (Exception e) {
            log.warn("Mock adapter immediate emission error: {}", e.getMessage(), e);
        }

        future = executor.scheduleAtFixedRate(() -> {
            try {
                TickSnapshot fut = makeSnapshot("NIFTY", "NEAR", "0", TickSnapshot.InstrumentType.FUT, 22411, 54320);
                TickSnapshot call = makeSnapshot("NIFTY", "NEAR", "22450", TickSnapshot.InstrumentType.CALL, 58.25, 45100);
                TickSnapshot put = makeSnapshot("NIFTY", "NEAR", "22450", TickSnapshot.InstrumentType.PUT, 43.10, 35500);

                store.put(fut.getInstrumentToken(), fut);
                store.put(call.getInstrumentToken(), call);
                store.put(put.getInstrumentToken(), put);

                consumer.accept(fut);
                consumer.accept(call);
                consumer.accept(put);
            } catch (Exception e) {
                log.warn("Mock adapter emission error: {}", e.getMessage(), e);
            }
        }, intervalMillis, intervalMillis, TimeUnit.MILLISECONDS);

        // stop handle
        return () -> {
            try {
                if (future != null) future.cancel(false);
                executor.shutdownNow();
                started.set(false);
            } catch (Exception ignored) { }
        };
    }

    @Override
    public Optional<TickSnapshot> getSnapshotByToken(String token) {
        return Optional.ofNullable(store.get(token));
    }

    private TickSnapshot makeSnapshot(String underlying, String expiry, String strike, TickSnapshot.InstrumentType type, double ltp, long volume) {
        TickSnapshot s = new TickSnapshot();
        // construct a token that follows our token convention (underlying:expiry:strike:TYPE)
        String typeCode = switch(type) {
            case CALL -> "CE";
            case PUT -> "PE";
            case FUT -> "FUT";
            default -> "UNK";
        };
        String token = String.format("%s:%s:%s:%s", underlying, expiry, strike, typeCode);
        s.setInstrumentToken(token);
        s.setUnderlying(underlying);
        s.setExpiry(expiry);
        s.setStrike(strike);
        s.setInstrumentType(type);
        s.setLtp(BigDecimal.valueOf(ltp));
        s.setVolume(volume);
        s.setBidPrice(BigDecimal.valueOf(Math.max(0.01, ltp - 0.5)));
        s.setAskPrice(BigDecimal.valueOf(ltp + 0.5));
        s.setBidQty((long) rnd.nextInt(2000));
        s.setAskQty((long) rnd.nextInt(2000));
        s.setOpenInterest((long) rnd.nextInt(200000));
        s.setChangeInOpenInterest((long) (rnd.nextInt(5000) - 2500));
        s.setSegment(type == TickSnapshot.InstrumentType.FUT ? "Futures" : (type == TickSnapshot.InstrumentType.CALL ? "Call" : "Put"));
        s.setTimestamp(Instant.now());
        return s;
    }

    @Override
    public void close() {
        try {
            if (future != null) future.cancel(true);
            executor.shutdownNow();
        } catch (Exception ignored) { }
    }
}
