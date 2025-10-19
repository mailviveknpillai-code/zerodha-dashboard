package com.zerodha.dashboard.adapter;

import com.zerodha.dashboard.model.TickSnapshot;
import org.junit.jupiter.api.Test;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;

class MockMarketAdapterImmediateEmissionTest {

    @Test
    void subscribe_emits_immediately() throws Exception {
        MockMarketAdapter adapter = new MockMarketAdapter(500);
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<TickSnapshot> r = new AtomicReference<>();

        Runnable stop = adapter.subscribe(s -> {
            r.set(s);
            latch.countDown();
        });

        try {
            boolean arrived = latch.await(1, TimeUnit.SECONDS);
            assertTrue(arrived, "Expected immediate emission within 1s");
            assertNotNull(r.get());
        } finally {
            stop.run();
            adapter.close();
        }
    }
}
