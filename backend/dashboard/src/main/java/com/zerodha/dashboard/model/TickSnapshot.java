package com.zerodha.dashboard.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Objects;

/**
 * TickSnapshot model implemented to match test expectations.
 * - Includes no-arg constructor for Jackson.
 * - Includes a multi-arg constructor matching the test signature in logs:
 *   (int, String, String, long, long, long, BigDecimal, BigDecimal, long, long, BigDecimal, Instant)
 *
 * Adjust/extend fields as needed when integrating real Zerodha adapter.
 */
public class TickSnapshot {

    public enum InstrumentType {
        FUT, CALL, PUT, FUTURE
    }

    // fields (names chosen to match tests' getter names)
    private Integer schemaVersion;
    private String instrumentToken;     // also used as "tradingsymbol" / "token" in some tests
    private String segment;
    private Long volume;
    private Long openInterest;
    private Long changeInOpenInterest;
    private BigDecimal bidPrice;
    private BigDecimal askPrice;
    private Long bidQty;
    private Long askQty;
    private BigDecimal lastPrice;
    private Instant timestamp;
    private String expiry;
    private String strike;
    private String underlying;
    private InstrumentType instrumentType;

    // No-arg constructor required by Jackson tests
    public TickSnapshot() { }

    // The full multi-arg constructor seen in test failure logs (12 args)
        public TickSnapshot(int schemaVersion,
                            String instrumentToken,
                            String segment,
                            long volume,
                            long openInterest,
                            long changeInOpenInterest,
                            BigDecimal bidPrice,
                            BigDecimal askPrice,
                            long bidQty,
                            long askQty,
                            BigDecimal lastPrice,
                            Instant timestamp) {
            this.schemaVersion = clampToOne(schemaVersion);
            this.instrumentToken = instrumentToken;
            this.segment = segment;
            this.volume = Math.max(0, volume);
            this.openInterest = Math.max(0, openInterest);
            this.changeInOpenInterest = changeInOpenInterest;
            this.bidPrice = bidPrice;
            this.askPrice = askPrice;
            this.bidQty = Math.max(0, bidQty);
            this.askQty = Math.max(0, askQty);
            this.lastPrice = lastPrice;
            this.timestamp = timestamp;
        }

    // Additional flexible constructors (allow nulls as tests call variants with nulls)
        public TickSnapshot(Integer schemaVersion,
                            String instrumentToken,
                            String segment,
                            Long volume,
                            Long openInterest,
                            Long changeInOpenInterest,
                            BigDecimal bidPrice,
                            BigDecimal askPrice,
                            Long bidQty,
                            Long askQty,
                            BigDecimal lastPrice,
                            Instant timestamp) {
        this.schemaVersion = clampToOne(schemaVersion);
        this.instrumentToken = instrumentToken;
        this.segment = segment;
        this.volume = (volume == null) ? 0L : Math.max(0, volume);
        this.openInterest = (openInterest == null) ? 0L : Math.max(0, openInterest);
        this.changeInOpenInterest = changeInOpenInterest;
        this.bidPrice = bidPrice;
        this.askPrice = askPrice;
        this.bidQty = (bidQty == null) ? 0L : Math.max(0, bidQty);
        this.askQty = (askQty == null) ? 0L : Math.max(0, askQty);
        this.lastPrice = lastPrice;
        this.timestamp = (timestamp == null) ? java.time.Instant.now() : timestamp;
        }

    // Getters and setters (explicit names tests reference)
        public Integer getSchemaVersion() { return schemaVersion; }
        public void setSchemaVersion(Integer schemaVersion) { this.schemaVersion = clampToOne(schemaVersion); }

    public String getInstrumentToken() { return instrumentToken; }
    public void setInstrumentToken(String instrumentToken) { this.instrumentToken = instrumentToken; }

    // alias methods used in older tests
    public String getToken() { return instrumentToken; }
    public void setToken(String token) { this.instrumentToken = token; }
    public String getTradingsymbol() { return instrumentToken; }
    public void setTradingsymbol(String tradingsymbol) { this.instrumentToken = tradingsymbol; }

    public String getSegment() { return segment; }
    public void setSegment(String segment) { this.segment = segment; }

    public Long getVolume() { return clampToZero(volume); }
    public void setVolume(Long volume) { this.volume = clampToZero(volume); }

    public Long getOpenInterest() { return clampToZero(openInterest); }
    public void setOpenInterest(Long openInterest) { this.openInterest = clampToZero(openInterest); }

    // change in OI
    public Long getChangeInOpenInterest() { return changeInOpenInterest; }
    public void setChangeInOpenInterest(Long changeInOpenInterest) { this.changeInOpenInterest = changeInOpenInterest; }

    // older alias names tests expect
    public Long getChangeInOi() { return changeInOpenInterest; }
    public void setChangeInOi(Long changeInOi) { this.changeInOpenInterest = changeInOi; }

    // price/quantity getters used by tests
    public BigDecimal getBidPrice() { return bidPrice; }
    public void setBidPrice(BigDecimal bidPrice) { this.bidPrice = bidPrice; }

    public BigDecimal getAskPrice() { return askPrice; }
    public void setAskPrice(BigDecimal askPrice) { this.askPrice = askPrice; }

    public Long getBidQty() { return clampToZero(bidQty); }
    public void setBidQty(Long bidQty) { this.bidQty = clampToZero(bidQty); }

    public Long getAskQty() { return clampToZero(askQty); }
    public void setAskQty(Long askQty) { this.askQty = clampToZero(askQty); }

    public BigDecimal getLastPrice() { return lastPrice; }
    public void setLastPrice(BigDecimal lastPrice) { this.lastPrice = lastPrice; }

    // older alias
    public BigDecimal getLtp() { return lastPrice; }
    public void setLtp(BigDecimal ltp) { this.lastPrice = ltp; }

    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }

    public String getExpiry() { return expiry; }
    public void setExpiry(String expiry) { this.expiry = expiry; }
    public String getStrike() { return strike; }
    public void setStrike(String strike) { this.strike = strike; }
    public String getUnderlying() { return underlying; }
    public void setUnderlying(String underlying) { this.underlying = underlying; }
    public InstrumentType getInstrumentType() { return instrumentType; }
    public void setInstrumentType(InstrumentType instrumentType) { this.instrumentType = instrumentType; }

    // Validation helper used in tests expecting IllegalArgumentException
    public void requireNonEmptyTokenAndSegment() {
        if (instrumentToken == null || instrumentToken.trim().isEmpty()) {
            throw new IllegalArgumentException("instrumentToken must be present");
        }
        if (segment == null || segment.trim().isEmpty()) {
            throw new IllegalArgumentException("segment must be present");
        }
    }

    // Static helper for tests to get a Jackson ObjectMapper with JavaTimeModule
    public static com.fasterxml.jackson.databind.ObjectMapper newMapperWithJavaTime() {
        com.fasterxml.jackson.databind.ObjectMapper m = new com.fasterxml.jackson.databind.ObjectMapper();
        m.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());
        return m;
    }

    public static Long clampToOne(Long v) { return (v == null || v < 1) ? 1L : v; }
    public static Integer clampToOne(Integer v) { return (v == null || v < 1) ? 1 : v; }
    public static Long clampToZero(Long v) { return (v == null || v < 0) ? 0L : v; }

    @Override
    public String toString() {
        return "TickSnapshot{" +
                "schemaVersion=" + schemaVersion +
                ", instrumentToken='" + instrumentToken + '\'' +
                ", segment='" + segment + '\'' +
                ", volume=" + volume +
                ", openInterest=" + openInterest +
                ", changeInOpenInterest=" + changeInOpenInterest +
                ", bidPrice=" + bidPrice +
                ", askPrice=" + askPrice +
                ", bidQty=" + bidQty +
                ", askQty=" + askQty +
                ", lastPrice=" + lastPrice +
                ", timestamp=" + timestamp +
                '}';
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof TickSnapshot)) return false;
        TickSnapshot that = (TickSnapshot) o;
        return Objects.equals(instrumentToken, that.instrumentToken)
                && Objects.equals(segment, that.segment);
    }

    @Override
    public int hashCode() {
        return Objects.hash(instrumentToken, segment);
    }
}
