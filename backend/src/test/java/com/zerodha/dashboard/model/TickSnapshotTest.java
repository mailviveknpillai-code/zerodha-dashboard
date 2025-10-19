package com.zerodha.dashboard.model;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

class TickSnapshotTest {

    private final ObjectMapper mapper = TickSnapshot.newMapperWithJavaTime();

    @Test
    void constructor_and_getters_and_json_serialization() throws Exception {
        Instant now = Instant.parse("2025-04-01T10:00:00Z");

        TickSnapshot t = new TickSnapshot(
                1,
                "NIFTY:25APR:25000:CE",
                "Call ATM (25000)",
                54320L,
                12850L,
                1020L,
                new BigDecimal("22410"),
                new BigDecimal("22412"),
                1200L,
                1150L,
                new BigDecimal("22411"),
                now
        );

        assertEquals(1, t.getSchemaVersion());
        assertEquals("NIFTY:25APR:25000:CE", t.getToken());
        assertEquals("Call ATM (25000)", t.getSegment());
        assertEquals(54320L, t.getVolume());
        assertEquals(12850L, t.getOpenInterest());
        assertEquals(1020L, t.getChangeInOpenInterest());
        assertEquals(new BigDecimal("22410"), t.getBidPrice());
        assertEquals(new BigDecimal("22412"), t.getAskPrice());
        assertEquals(1200L, t.getBidQty());
        assertEquals(1150L, t.getAskQty());
        assertEquals(new BigDecimal("22411"), t.getLtp());
        assertEquals(now, t.getTimestamp());

        // JSON round-trip
        String json = mapper.writeValueAsString(t);
        TickSnapshot fromJson = mapper.readValue(json, TickSnapshot.class);
        assertEquals(t, fromJson);
    }

    @Test
    void null_and_negative_values_are_handled_safely() {
        // nulls for optional BigDecimal fields should be allowed; numeric negatives should be sanitized
        TickSnapshot t = new TickSnapshot(
                null,
                "token",
                "segment",
                -100L,
                null,
                -5L,
                null,
                null,
                -10L,
                null,
                null,
                null
        );

        assertEquals(1, t.getSchemaVersion());
        assertEquals(0L, t.getVolume(), "negative volume should be clamped to 0");
        assertEquals(0L, t.getOpenInterest(), "null open interest defaults to 0");
        assertEquals(-5L, t.getChangeInOpenInterest(), "changeInOpenInterest may be negative and preserved");
        assertEquals(0L, t.getBidQty());
        assertEquals(0L, t.getAskQty());
        assertNull(t.getBidPrice());
        assertNull(t.getAskPrice());
        assertNull(t.getLtp());
        assertNotNull(t.getTimestamp());
    }

    @Test
    void token_and_segment_must_be_present() {
        TickSnapshot snap = new TickSnapshot();
        assertThrows(IllegalArgumentException.class, snap::requireNonEmptyTokenAndSegment);
    }
}
