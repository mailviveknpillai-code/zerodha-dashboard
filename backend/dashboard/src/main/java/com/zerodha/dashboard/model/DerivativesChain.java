package com.zerodha.dashboard.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.ArrayList;

/**
 * Represents a complete derivatives chain for an underlying (e.g., NIFTY)
 * Contains futures and options data organized by segments
 */
public class DerivativesChain {
    private String underlying; // NIFTY
    private BigDecimal spotPrice;
    private BigDecimal dailyStrikePrice; // Daily reference strike price for monitoring
    private List<DerivativeContract> futures;
    private List<DerivativeContract> callOptions;
    private List<DerivativeContract> putOptions;
    private Instant timestamp;
    private String dataSource; // BREEZE_API, ZERODHA_KITE, NO_DATA

    public DerivativesChain() {
        this.futures = new ArrayList<>();
        this.callOptions = new ArrayList<>();
        this.putOptions = new ArrayList<>();
        this.timestamp = Instant.now();
    }

    public DerivativesChain(String underlying, BigDecimal spotPrice) {
        this();
        this.underlying = underlying;
        this.spotPrice = spotPrice;
    }

    // Getters and Setters
    public String getUnderlying() { return underlying; }
    public void setUnderlying(String underlying) { this.underlying = underlying; }

    public BigDecimal getSpotPrice() { return spotPrice; }
    public void setSpotPrice(BigDecimal spotPrice) { this.spotPrice = spotPrice; }

    public BigDecimal getDailyStrikePrice() { return dailyStrikePrice; }
    public void setDailyStrikePrice(BigDecimal dailyStrikePrice) { this.dailyStrikePrice = dailyStrikePrice; }

    public List<DerivativeContract> getFutures() { return futures; }
    public void setFutures(List<DerivativeContract> futures) { this.futures = futures; }

    public List<DerivativeContract> getCallOptions() { return callOptions; }
    public void setCallOptions(List<DerivativeContract> callOptions) { this.callOptions = callOptions; }

    public List<DerivativeContract> getPutOptions() { return putOptions; }
    public void setPutOptions(List<DerivativeContract> putOptions) { this.putOptions = putOptions; }

    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }

    public String getDataSource() { return dataSource; }
    public void setDataSource(String dataSource) { this.dataSource = dataSource; }

    // Helper methods
    public void addFutures(DerivativeContract contract) {
        if (contract != null) {
            this.futures.add(contract);
        }
    }

    public void addCallOption(DerivativeContract contract) {
        if (contract != null) {
            this.callOptions.add(contract);
        }
    }

    public void addPutOption(DerivativeContract contract) {
        if (contract != null) {
            this.putOptions.add(contract);
        }
    }

    public int getTotalContracts() {
        return futures.size() + callOptions.size() + putOptions.size();
    }

    // Strike price monitoring methods
    public List<DerivativeContract> getStrikePriceMonitoring() {
        List<DerivativeContract> monitoring = new ArrayList<>();
        if (dailyStrikePrice == null) return monitoring;
        
        // Find contracts with strike prices around the daily strike
        BigDecimal upperStrike = dailyStrikePrice.add(new BigDecimal("50")); // +50 points
        BigDecimal lowerStrike = dailyStrikePrice.subtract(new BigDecimal("50")); // -50 points
        
        // Add call options around daily strike
        callOptions.stream()
            .filter(contract -> contract.getStrikePrice() != null)
            .filter(contract -> contract.getStrikePrice().compareTo(lowerStrike) >= 0 && 
                               contract.getStrikePrice().compareTo(upperStrike) <= 0)
            .forEach(monitoring::add);
            
        // Add put options around daily strike
        putOptions.stream()
            .filter(contract -> contract.getStrikePrice() != null)
            .filter(contract -> contract.getStrikePrice().compareTo(lowerStrike) >= 0 && 
                               contract.getStrikePrice().compareTo(upperStrike) <= 0)
            .forEach(monitoring::add);
            
        return monitoring;
    }
    
    public List<DerivativeContract> getAboveStrikePrice() {
        List<DerivativeContract> aboveStrike = new ArrayList<>();
        if (dailyStrikePrice == null) return aboveStrike;
        
        BigDecimal upperStrike = dailyStrikePrice.add(new BigDecimal("50"));
        
        callOptions.stream()
            .filter(contract -> contract.getStrikePrice() != null)
            .filter(contract -> contract.getStrikePrice().compareTo(upperStrike) > 0)
            .forEach(aboveStrike::add);
            
        return aboveStrike;
    }
    
    public List<DerivativeContract> getBelowStrikePrice() {
        List<DerivativeContract> belowStrike = new ArrayList<>();
        if (dailyStrikePrice == null) return belowStrike;
        
        BigDecimal lowerStrike = dailyStrikePrice.subtract(new BigDecimal("50"));
        
        putOptions.stream()
            .filter(contract -> contract.getStrikePrice() != null)
            .filter(contract -> contract.getStrikePrice().compareTo(lowerStrike) < 0)
            .forEach(belowStrike::add);
            
        return belowStrike;
    }

    @Override
    public String toString() {
        return "DerivativesChain{" +
                "underlying='" + underlying + '\'' +
                ", spotPrice=" + spotPrice +
                ", futures=" + futures.size() +
                ", callOptions=" + callOptions.size() +
                ", putOptions=" + putOptions.size() +
                ", dataSource='" + dataSource + '\'' +
                ", timestamp=" + timestamp +
                '}';
    }
}
