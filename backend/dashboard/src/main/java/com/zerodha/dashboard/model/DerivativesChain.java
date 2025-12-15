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
    private String dataSource; // ZERODHA_KITE, MOCK_DATA, NO_DATA
    private String trendClassification; // Bullish, Bearish, Neutral (calculated in backend from API polled values)
    private Double trendScore; // Normalized score from -10 to +10
    private Double futuresTrendScore; // Trend score for futures segment (raw score before normalization)
    private Double callsTrendScore; // Trend score for calls segment (raw score before normalization)
    private Double putsTrendScore; // Trend score for puts segment (raw score before normalization)
    private Double spotLtpTrendPercent; // Percent change of spot LTP over configured window
    private String spotLtpTrendDirection; // UP, DOWN, FLAT
    // Trend window metadata for UI timer display
    private Instant trendWindowStart; // Start time of current trend calculation window
    private Instant trendWindowEnd; // End time of current trend calculation window
    private Integer trendWindowSeconds; // Size of trend calculation window in seconds
    // Spot LTP Trend window metadata for UI timer display
    private Instant spotLtpWindowStart; // Start time of current spot LTP trend calculation window
    private Instant spotLtpWindowEnd; // End time of current spot LTP trend calculation window
    private Integer spotLtpWindowSeconds; // Size of spot LTP trend calculation window in seconds
    // Eaten Delta window metadata for UI timer display
    private Instant eatenDeltaWindowStart; // Start time of current eaten delta calculation window
    private Instant eatenDeltaWindowEnd; // End time of current eaten delta calculation window
    private Integer eatenDeltaWindowSeconds; // Size of eaten delta calculation window in seconds
    // LTP Movement window metadata for UI timer display
    private Instant ltpMovementWindowStart; // Start time of current LTP movement calculation window
    private Instant ltpMovementWindowEnd; // End time of current LTP movement calculation window
    private Integer ltpMovementWindowSeconds; // Size of LTP movement calculation window in seconds

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

    public String getTrendClassification() { return trendClassification; }
    public void setTrendClassification(String trendClassification) { this.trendClassification = trendClassification; }

    public Double getTrendScore() { return trendScore; }
    public void setTrendScore(Double trendScore) { this.trendScore = trendScore; }

    public Double getFuturesTrendScore() { return futuresTrendScore; }
    public void setFuturesTrendScore(Double futuresTrendScore) { this.futuresTrendScore = futuresTrendScore; }

    public Double getCallsTrendScore() { return callsTrendScore; }
    public void setCallsTrendScore(Double callsTrendScore) { this.callsTrendScore = callsTrendScore; }

    public Double getPutsTrendScore() { return putsTrendScore; }
    public void setPutsTrendScore(Double putsTrendScore) { this.putsTrendScore = putsTrendScore; }

    public Double getSpotLtpTrendPercent() { return spotLtpTrendPercent; }
    public void setSpotLtpTrendPercent(Double spotLtpTrendPercent) { this.spotLtpTrendPercent = spotLtpTrendPercent; }

    public String getSpotLtpTrendDirection() { return spotLtpTrendDirection; }
    public void setSpotLtpTrendDirection(String spotLtpTrendDirection) { this.spotLtpTrendDirection = spotLtpTrendDirection; }

    public Instant getTrendWindowStart() { return trendWindowStart; }
    public void setTrendWindowStart(Instant trendWindowStart) { this.trendWindowStart = trendWindowStart; }

    public Instant getTrendWindowEnd() { return trendWindowEnd; }
    public void setTrendWindowEnd(Instant trendWindowEnd) { this.trendWindowEnd = trendWindowEnd; }

    public Integer getTrendWindowSeconds() { return trendWindowSeconds; }
    public void setTrendWindowSeconds(Integer trendWindowSeconds) { this.trendWindowSeconds = trendWindowSeconds; }

    public Instant getSpotLtpWindowStart() { return spotLtpWindowStart; }
    public void setSpotLtpWindowStart(Instant spotLtpWindowStart) { this.spotLtpWindowStart = spotLtpWindowStart; }

    public Instant getSpotLtpWindowEnd() { return spotLtpWindowEnd; }
    public void setSpotLtpWindowEnd(Instant spotLtpWindowEnd) { this.spotLtpWindowEnd = spotLtpWindowEnd; }

    public Integer getSpotLtpWindowSeconds() { return spotLtpWindowSeconds; }
    public void setSpotLtpWindowSeconds(Integer spotLtpWindowSeconds) { this.spotLtpWindowSeconds = spotLtpWindowSeconds; }

    public Instant getEatenDeltaWindowStart() { return eatenDeltaWindowStart; }
    public void setEatenDeltaWindowStart(Instant eatenDeltaWindowStart) { this.eatenDeltaWindowStart = eatenDeltaWindowStart; }

    public Instant getEatenDeltaWindowEnd() { return eatenDeltaWindowEnd; }
    public void setEatenDeltaWindowEnd(Instant eatenDeltaWindowEnd) { this.eatenDeltaWindowEnd = eatenDeltaWindowEnd; }

    public Integer getEatenDeltaWindowSeconds() { return eatenDeltaWindowSeconds; }
    public void setEatenDeltaWindowSeconds(Integer eatenDeltaWindowSeconds) { this.eatenDeltaWindowSeconds = eatenDeltaWindowSeconds; }

    public Instant getLtpMovementWindowStart() { return ltpMovementWindowStart; }
    public void setLtpMovementWindowStart(Instant ltpMovementWindowStart) { this.ltpMovementWindowStart = ltpMovementWindowStart; }

    public Instant getLtpMovementWindowEnd() { return ltpMovementWindowEnd; }
    public void setLtpMovementWindowEnd(Instant ltpMovementWindowEnd) { this.ltpMovementWindowEnd = ltpMovementWindowEnd; }

    public Integer getLtpMovementWindowSeconds() { return ltpMovementWindowSeconds; }
    public void setLtpMovementWindowSeconds(Integer ltpMovementWindowSeconds) { this.ltpMovementWindowSeconds = ltpMovementWindowSeconds; }

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
