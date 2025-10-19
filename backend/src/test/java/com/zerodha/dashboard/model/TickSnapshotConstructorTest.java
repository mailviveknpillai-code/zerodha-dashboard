package com.zerodha.dashboard.model;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

class TickSnapshotConstructorTest {

    @Test
    void constructor_clamps_schema_and_defaults_timestamp() {
        TickSnapshot t = new TickSnapshot(
                null,
                "token-1",
                "segment",
                -10L,
                null,
                -2L,
                null,
                null,
                -5L,
                null,
                null,
                null
        );

        assertEquals(1, t.getSchemaVersion(), "schemaVersion should default to 1 when null or <1");
        assertNotNull(t.getTimestamp(), "timestamp should default to now when null");
    }
}
