package com.zerodha.dashboard.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;

public class TickSnapshot {
    private String instrumentToken;
    private String tradingsymbol;
    private BigDecimal lastPrice;
    private long volume;
    private String segment;
    private Instant timestamp;

    public TickSnapshot() {
    }

    public TickSnapshot(String instrumentToken, String tradingsymbol, BigDecimal lastPrice, long volume, String segment, Instant timestamp) {
        this.instrumentToken = requireNonEmpty(instrumentToken, "instrumentToken");
        this.tradingsymbol = tradingsymbol;
        this.lastPrice = lastPrice;
        this.volume = Math.max(0L, volume);
        this.segment = segment;
        this.timestamp = (timestamp == null) ? Instant.now() : timestamp;
    }

    private static String requireNonEmpty(String v, String name) {
        if (v == null || v.isEmpty()) throw new IllegalArgumentException(name + " must be present");
        return v;
    }

    public String getInstrumentToken() {
        return instrumentToken;
    }

    public void setInstrumentToken(String instrumentToken) {
        this.instrumentToken = instrumentToken;
    }

    public String getTradingsymbol() {
        return tradingsymbol;
    }

    public void setTradingsymbol(String tradingsymbol) {
        this.tradingsymbol = tradingsymbol;
    }

    public BigDecimal getLastPrice() {
        return lastPrice;
    }

    public void setLastPrice(BigDecimal lastPrice) {
        this.lastPrice = lastPrice;
    }

    public long getVolume() {
        return volume;
    }

    public void setVolume(long volume) {
        this.volume = volume;
    }

    public String getSegment() {
        return segment;
    }

    public void setSegment(String segment) {
        this.segment = segment;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        TickSnapshot that = (TickSnapshot) o;
        return volume == that.volume &&
               Objects.equals(instrumentToken, that.instrumentToken) &&
               Objects.equals(tradingsymbol, that.tradingsymbol) &&
               Objects.equals(lastPrice, that.lastPrice) &&
               Objects.equals(segment, that.segment) &&
               Objects.equals(timestamp, that.timestamp);
    }

    @Override
    public int hashCode() {
        return Objects.hash(instrumentToken, tradingsymbol, lastPrice, volume, segment, timestamp);
    }

    @Override
    public String toString() {
        return "TickSnapshot{" +
               "instrumentToken='" + instrumentToken + '\'' +
               ", tradingsymbol='" + tradingsymbol + '\'' +
               ", lastPrice=" + lastPrice +
               ", volume=" + volume +
               ", segment='" + segment + '\'' +
               ", timestamp=" + timestamp +
               '}';
    }
}
