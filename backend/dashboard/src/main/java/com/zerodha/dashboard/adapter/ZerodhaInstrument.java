package com.zerodha.dashboard.adapter;

import java.time.LocalDate;

/**
 * Represents a Zerodha instrument from the instruments list
 */
public class ZerodhaInstrument {
    private long instrumentToken;
    private long exchangeToken;
    private String tradingsymbol;
    private String name;
    private double lastPrice;
    private LocalDate expiry;
    private double strike;
    private double tickSize;
    private int lotSize;
    private String instrumentType; // FUT, CE, PE
    private String segment;
    private String exchange;

    public ZerodhaInstrument() {}

    // Getters and Setters
    public long getInstrumentToken() { return instrumentToken; }
    public void setInstrumentToken(long instrumentToken) { this.instrumentToken = instrumentToken; }

    public long getExchangeToken() { return exchangeToken; }
    public void setExchangeToken(long exchangeToken) { this.exchangeToken = exchangeToken; }

    public String getTradingsymbol() { return tradingsymbol; }
    public void setTradingsymbol(String tradingsymbol) { this.tradingsymbol = tradingsymbol; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public double getLastPrice() { return lastPrice; }
    public void setLastPrice(double lastPrice) { this.lastPrice = lastPrice; }

    public LocalDate getExpiry() { return expiry; }
    public void setExpiry(LocalDate expiry) { this.expiry = expiry; }

    public double getStrike() { return strike; }
    public void setStrike(double strike) { this.strike = strike; }

    public double getTickSize() { return tickSize; }
    public void setTickSize(double tickSize) { this.tickSize = tickSize; }

    public int getLotSize() { return lotSize; }
    public void setLotSize(int lotSize) { this.lotSize = lotSize; }

    public String getInstrumentType() { return instrumentType; }
    public void setInstrumentType(String instrumentType) { this.instrumentType = instrumentType; }

    public String getSegment() { return segment; }
    public void setSegment(String segment) { this.segment = segment; }

    public String getExchange() { return exchange; }
    public void setExchange(String exchange) { this.exchange = exchange; }

    @Override
    public String toString() {
        return "ZerodhaInstrument{" +
                "instrumentToken=" + instrumentToken +
                ", tradingsymbol='" + tradingsymbol + '\'' +
                ", instrumentType='" + instrumentType + '\'' +
                ", expiry=" + expiry +
                ", strike=" + strike +
                '}';
    }
}

