package com.zerodha.dashboard.adapter;

import com.zerodha.dashboard.model.TickSnapshot;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

class MockMarketAdapterTest {

    @Test
    void mockEmitsSnapshotsAndGetByToken() throws Exception {
        MockMarketAdapter adapter = new MockMarketAdapter(200);
        AtomicReference<TickSnapshot> received = new AtomicReference<>();
        CountDownLatch latch = new CountDownLatch(1);

        Runnable stop = adapter.subscribe(s -> {
            received.set(s);
            latch.countDown();
        });

        try {
            boolean arrived = latch.await(2, TimeUnit.SECONDS);
            assertTrue(arrived, "Expected a snapshot within 2s");
            TickSnapshot s = received.get();
            assertNotNull(s);
            Optional<TickSnapshot> byToken = adapter.getSnapshotByToken(s.getInstrumentToken());
            assertTrue(byToken.isPresent());
            assertEquals(s.getInstrumentToken(), byToken.get().getInstrumentToken());
        } finally {
            stop.run();
            adapter.close();
        }
    }
}
