package com.zerodha.dashboard.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/**
 * Represents a derivative contract (futures or options) for NIFTY
 */
public class DerivativeContract {
    private String instrumentToken;
    private String tradingsymbol;
    private String underlying; // NIFTY
    private String segment; // FUTURES, CALL_OPTIONS, PUT_OPTIONS
    private String instrumentType; // FUT, CE, PE
    private LocalDate expiryDate;
    private BigDecimal strikePrice; // For options, null for futures
    private BigDecimal lastPrice;
    private BigDecimal openInterest;
    private BigDecimal change;
    private BigDecimal changePercent;
    private long volume;
    private BigDecimal bid;
    private BigDecimal ask;
    private BigDecimal high;
    private BigDecimal low;
    private BigDecimal open;
    private BigDecimal close;
    private long totalTradedValue;
    private int lotSize;
    private BigDecimal tickSize;
    private Long bidQuantity;
    private Long askQuantity;
    private Long eatenDelta; // Eaten Δ = ask_eaten_window - bid_eaten_window
    private Long bidEaten; // Bid Eaten = total bid quantity consumed in rolling window
    private Long askEaten; // Ask Eaten = total ask quantity consumed in rolling window
    private String ltpMovementDirection; // LTP Movement Direction: UP, DOWN, NEUTRAL
    private Integer ltpMovementConfidence; // LTP Movement Confidence: 0-100
    private String ltpMovementIntensity; // LTP Movement Intensity: HIGH, SLOW
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Instant timestamp;

    // Constructors
    public DerivativeContract() {}

    public DerivativeContract(String instrumentToken, String tradingsymbol, String underlying, 
                             String segment, String instrumentType, LocalDate expiryDate, 
                             BigDecimal strikePrice, BigDecimal lastPrice) {
        this.instrumentToken = instrumentToken;
        this.tradingsymbol = tradingsymbol;
        this.underlying = underlying;
        this.segment = segment;
        this.instrumentType = instrumentType;
        this.expiryDate = expiryDate;
        this.strikePrice = strikePrice;
        this.lastPrice = lastPrice;
        this.timestamp = Instant.now();
    }

    // Getters and Setters
    public String getInstrumentToken() { return instrumentToken; }
    public void setInstrumentToken(String instrumentToken) { this.instrumentToken = instrumentToken; }

    public String getTradingsymbol() { return tradingsymbol; }
    public void setTradingsymbol(String tradingsymbol) { this.tradingsymbol = tradingsymbol; }

    public String getUnderlying() { return underlying; }
    public void setUnderlying(String underlying) { this.underlying = underlying; }

    public String getSegment() { return segment; }
    public void setSegment(String segment) { this.segment = segment; }

    public String getInstrumentType() { return instrumentType; }
    public void setInstrumentType(String instrumentType) { this.instrumentType = instrumentType; }

    public LocalDate getExpiryDate() { return expiryDate; }
    public void setExpiryDate(LocalDate expiryDate) { this.expiryDate = expiryDate; }

    public BigDecimal getStrikePrice() { return strikePrice; }
    public void setStrikePrice(BigDecimal strikePrice) { this.strikePrice = strikePrice; }

    public BigDecimal getLastPrice() { return lastPrice; }
    public void setLastPrice(BigDecimal lastPrice) { this.lastPrice = lastPrice; }

    public BigDecimal getOpenInterest() { return openInterest; }
    public void setOpenInterest(BigDecimal openInterest) { this.openInterest = openInterest; }

    public BigDecimal getChange() { return change; }
    public void setChange(BigDecimal change) { this.change = change; }

    public BigDecimal getChangePercent() { return changePercent; }
    public void setChangePercent(BigDecimal changePercent) { this.changePercent = changePercent; }

    public long getVolume() { return volume; }
    public void setVolume(long volume) { this.volume = volume; }

    public BigDecimal getBid() { return bid; }
    public void setBid(BigDecimal bid) { this.bid = bid; }

    public BigDecimal getAsk() { return ask; }
    public void setAsk(BigDecimal ask) { this.ask = ask; }

    public BigDecimal getHigh() { return high; }
    public void setHigh(BigDecimal high) { this.high = high; }

    public BigDecimal getLow() { return low; }
    public void setLow(BigDecimal low) { this.low = low; }

    public BigDecimal getOpen() { return open; }
    public void setOpen(BigDecimal open) { this.open = open; }

    public BigDecimal getClose() { return close; }
    public void setClose(BigDecimal close) { this.close = close; }

    public long getTotalTradedValue() { return totalTradedValue; }
    public void setTotalTradedValue(long totalTradedValue) { this.totalTradedValue = totalTradedValue; }

    public int getLotSize() { return lotSize; }
    public void setLotSize(int lotSize) { this.lotSize = lotSize; }

    public BigDecimal getTickSize() { return tickSize; }
    public void setTickSize(BigDecimal tickSize) { this.tickSize = tickSize; }

    public Long getBidQuantity() { return bidQuantity; }
    public void setBidQuantity(Long bidQuantity) { this.bidQuantity = bidQuantity; }

    public Long getAskQuantity() { return askQuantity; }
    public void setAskQuantity(Long askQuantity) { this.askQuantity = askQuantity; }

    public Long getEatenDelta() { return eatenDelta; }
    public void setEatenDelta(Long eatenDelta) { this.eatenDelta = eatenDelta; }

    public Long getBidEaten() { return bidEaten; }
    public void setBidEaten(Long bidEaten) { this.bidEaten = bidEaten; }

    public Long getAskEaten() { return askEaten; }
    public void setAskEaten(Long askEaten) { this.askEaten = askEaten; }

    public String getLtpMovementDirection() { return ltpMovementDirection; }
    public void setLtpMovementDirection(String ltpMovementDirection) { this.ltpMovementDirection = ltpMovementDirection; }

    public Integer getLtpMovementConfidence() { return ltpMovementConfidence; }
    public void setLtpMovementConfidence(Integer ltpMovementConfidence) { this.ltpMovementConfidence = ltpMovementConfidence; }

    public String getLtpMovementIntensity() { return ltpMovementIntensity; }
    public void setLtpMovementIntensity(String ltpMovementIntensity) { this.ltpMovementIntensity = ltpMovementIntensity; }

    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }

    @Override
    public String toString() {
        return "DerivativeContract{" +
                "instrumentToken='" + instrumentToken + '\'' +
                ", tradingsymbol='" + tradingsymbol + '\'' +
                ", underlying='" + underlying + '\'' +
                ", segment='" + segment + '\'' +
                ", instrumentType='" + instrumentType + '\'' +
                ", expiryDate=" + expiryDate +
                ", strikePrice=" + strikePrice +
                ", lastPrice=" + lastPrice +
                ", volume=" + volume +
                ", timestamp=" + timestamp +
                '}';
    }
}
