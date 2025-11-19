package com.zerodha.dashboard.model;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TickSnapshotTest {

    @Test
    void constructorValidatesInstrumentToken() {
        Instant now = Instant.now();
        TickSnapshot snapshot = new TickSnapshot("123", "NIFTY", BigDecimal.ONE, 10, "FUTURES", now);

        assertThat(snapshot.getInstrumentToken()).isEqualTo("123");
        assertThat(snapshot.getVolume()).isEqualTo(10);
        assertThat(snapshot.getTimestamp()).isEqualTo(now);
    }

    @Test
    void constructorDefaultsTimestampAndNonNegativeVolume() {
        TickSnapshot snapshot = new TickSnapshot("456", "BANKNIFTY", BigDecimal.TEN, -5, "OPTIONS", null);
        assertThat(snapshot.getVolume()).isZero();
        assertThat(snapshot.getTimestamp()).isNotNull();
    }

    @Test
    void requireNonEmptyThrowsForMissingToken() {
        assertThatThrownBy(() -> new TickSnapshot(null, "SYM", BigDecimal.ONE, 1, "SEG", Instant.now()))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void settersAndEqualsWork() {
        TickSnapshot a = new TickSnapshot();
        a.setInstrumentToken("789");
        a.setTradingsymbol("SYM");
        a.setLastPrice(BigDecimal.ONE);
        a.setVolume(5);
        a.setSegment("SEG");
        a.setTimestamp(Instant.EPOCH);

        TickSnapshot b = new TickSnapshot("789", "SYM", BigDecimal.ONE, 5, "SEG", Instant.EPOCH);

        assertThat(a).isEqualTo(b);
        assertThat(a.hashCode()).isEqualTo(b.hashCode());
        assertThat(a.equals(null)).isFalse();
        TickSnapshot different = new TickSnapshot("999", "OTHER", BigDecimal.TEN, 6, "SEG", Instant.EPOCH);
        assertThat(a).isNotEqualTo(different);
        assertThat(a.equals(new Object())).isFalse();
    }
}
