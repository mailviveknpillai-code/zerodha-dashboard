package com.zerodha.dashboard.model;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;

/**
 * Snapshot of the latest tick for an instrument (FUT / CALL / PUT).
 * <p>
 * Fields are nullable where not applicable (e.g. strike for FUT).
 * Instances are created using the static {@link Builder} for clarity.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class TickSnapshot implements Serializable {

    private static final long serialVersionUID = 1L;

    private Long instrumentToken;
    private String tradingsymbol;
    private String underlying;                // e.g. "NIFTY"
    private InstrumentType instrumentType;    // FUT / CALL / PUT
    private Integer strike;                   // null for FUT
    private String expiry;                    // ISO date (YYYY-MM-DD)

    // Market data fields
    private Double lastPrice;
    private Double prevPrice;
    private Long oi;                          // Open Interest
    private Long volume;
    private Double bidPrice;
    private Double askPrice;
    private Long bidQty;
    private Long askQty;
    private Double changeInOi;                // numeric change in OI (can be negative)
    private Instant timestamp;                // time this snapshot was captured

    public enum InstrumentType { FUT, CALL, PUT }

    public TickSnapshot() {
        // default constructor for Jackson
    }

    private TickSnapshot(Builder b) {
        this.instrumentToken = b.instrumentToken;
        this.tradingsymbol = b.tradingsymbol;
        this.underlying = b.underlying;
        this.instrumentType = b.instrumentType;
        this.strike = b.strike;
        this.expiry = b.expiry;
        this.lastPrice = b.lastPrice;
        this.prevPrice = b.prevPrice;
        this.oi = b.oi;
        this.volume = b.volume;
        this.bidPrice = b.bidPrice;
        this.askPrice = b.askPrice;
        this.bidQty = b.bidQty;
        this.askQty = b.askQty;
        this.changeInOi = b.changeInOi;
        this.timestamp = b.timestamp;
    }

    // -------------------------
    // Getters & Setters
    // -------------------------

    public Long getInstrumentToken() {
        return instrumentToken;
    }

    public void setInstrumentToken(Long instrumentToken) {
        this.instrumentToken = instrumentToken;
    }

    public String getTradingsymbol() {
        return tradingsymbol;
    }

    public void setTradingsymbol(String tradingsymbol) {
        this.tradingsymbol = tradingsymbol;
    }

    public String getUnderlying() {
        return underlying;
    }

    public void setUnderlying(String underlying) {
        this.underlying = underlying;
    }

    public InstrumentType getInstrumentType() {
        return instrumentType;
    }

    public void setInstrumentType(InstrumentType instrumentType) {
        this.instrumentType = instrumentType;
    }

    public Integer getStrike() {
        return strike;
    }

    public void setStrike(Integer strike) {
        this.strike = strike;
    }

    public String getExpiry() {
        return expiry;
    }

    public void setExpiry(String expiry) {
        this.expiry = expiry;
    }

    public Double getLastPrice() {
        return lastPrice;
    }

    public void setLastPrice(Double lastPrice) {
        this.lastPrice = lastPrice;
    }

    public Double getPrevPrice() {
        return prevPrice;
    }

    public void setPrevPrice(Double prevPrice) {
        this.prevPrice = prevPrice;
    }

    public Long getOi() {
        return oi;
    }

    public void setOi(Long oi) {
        this.oi = oi;
    }

    public Long getVolume() {
        return volume;
    }

    public void setVolume(Long volume) {
        this.volume = volume;
    }

    public Double getBidPrice() {
        return bidPrice;
    }

    public void setBidPrice(Double bidPrice) {
        this.bidPrice = bidPrice;
    }

    public Double getAskPrice() {
        return askPrice;
    }

    public void setAskPrice(Double askPrice) {
        this.askPrice = askPrice;
    }

    public Long getBidQty() {
        return bidQty;
    }

    public void setBidQty(Long bidQty) {
        this.bidQty = bidQty;
    }

    public Long getAskQty() {
        return askQty;
    }

    public void setAskQty(Long askQty) {
        this.askQty = askQty;
    }

    public Double getChangeInOi() {
        return changeInOi;
    }

    public void setChangeInOi(Double changeInOi) {
        this.changeInOi = changeInOi;
    }

    public Instant getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }

    // -------------------------
    // Builder for convenience
    // -------------------------
    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private Long instrumentToken;
        private String tradingsymbol;
        private String underlying;
        private InstrumentType instrumentType;
        private Integer strike;
        private String expiry;
        private Double lastPrice;
        private Double prevPrice;
        private Long oi;
        private Long volume;
        private Double bidPrice;
        private Double askPrice;
        private Long bidQty;
        private Long askQty;
        private Double changeInOi;
        private Instant timestamp;

        public Builder instrumentToken(Long token) {
            this.instrumentToken = token;
            return this;
        }

        public Builder tradingsymbol(String tradingsymbol) {
            this.tradingsymbol = tradingsymbol;
            return this;
        }

        public Builder underlying(String underlying) {
            this.underlying = underlying;
            return this;
        }

        public Builder instrumentType(InstrumentType t) {
            this.instrumentType = t;
            return this;
        }

        public Builder strike(Integer strike) {
            this.strike = strike;
            return this;
        }

        public Builder expiry(String expiry) {
            this.expiry = expiry;
            return this;
        }

        public Builder lastPrice(Double lastPrice) {
            this.lastPrice = lastPrice;
            return this;
        }

        public Builder prevPrice(Double prevPrice) {
            this.prevPrice = prevPrice;
            return this;
        }

        public Builder oi(Long oi) {
            this.oi = oi;
            return this;
        }

        public Builder volume(Long volume) {
            this.volume = volume;
            return this;
        }

        public Builder bidPrice(Double bidPrice) {
            this.bidPrice = bidPrice;
            return this;
        }

        public Builder askPrice(Double askPrice) {
            this.askPrice = askPrice;
            return this;
        }

        public Builder bidQty(Long bidQty) {
            this.bidQty = bidQty;
            return this;
        }

        public Builder askQty(Long askQty) {
            this.askQty = askQty;
            return this;
        }

        public Builder changeInOi(Double changeInOi) {
            this.changeInOi = changeInOi;
            return this;
        }

        public Builder timestamp(Instant timestamp) {
            this.timestamp = timestamp;
            return this;
        }

        public TickSnapshot build() {
            return new TickSnapshot(this);
        }
    }

    // -------------------------
    // equals / hashCode / toString
    // -------------------------
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;

        TickSnapshot that = (TickSnapshot) o;
        return Objects.equals(instrumentToken, that.instrumentToken) &&
                Objects.equals(tradingsymbol, that.tradingsymbol) &&
                Objects.equals(underlying, that.underlying) &&
                instrumentType == that.instrumentType &&
                Objects.equals(strike, that.strike) &&
                Objects.equals(expiry, that.expiry) &&
                Objects.equals(lastPrice, that.lastPrice) &&
                Objects.equals(prevPrice, that.prevPrice) &&
                Objects.equals(oi, that.oi) &&
                Objects.equals(volume, that.volume) &&
                Objects.equals(bidPrice, that.bidPrice) &&
                Objects.equals(askPrice, that.askPrice) &&
                Objects.equals(bidQty, that.bidQty) &&
                Objects.equals(askQty, that.askQty) &&
                Objects.equals(changeInOi, that.changeInOi) &&
                Objects.equals(timestamp, that.timestamp);
    }

    @Override
    public int hashCode() {
        return Objects.hash(instrumentToken, tradingsymbol, underlying, instrumentType, strike, expiry,
                lastPrice, prevPrice, oi, volume, bidPrice, askPrice, bidQty, askQty, changeInOi, timestamp);
    }

    @Override
    public String toString() {
        return "TickSnapshot{" +
                "instrumentToken=" + instrumentToken +
                ", tradingsymbol='" + tradingsymbol + '\'' +
                ", underlying='" + underlying + '\'' +
                ", instrumentType=" + instrumentType +
                ", strike=" + strike +
                ", expiry='" + expiry + '\'' +
                ", lastPrice=" + lastPrice +
                ", prevPrice=" + prevPrice +
                ", oi=" + oi +
                ", volume=" + volume +
                ", bidPrice=" + bidPrice +
                ", askPrice=" + askPrice +
                ", bidQty=" + bidQty +
                ", askQty=" + askQty +
                ", changeInOi=" + changeInOi +
                ", timestamp=" + timestamp +
                '}';
    }
}
