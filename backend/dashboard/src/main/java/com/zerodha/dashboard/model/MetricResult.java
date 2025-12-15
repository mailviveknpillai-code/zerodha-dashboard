package com.zerodha.dashboard.model;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;

/**
 * Represents a windowed metric calculation result with metadata.
 * Used for trendScore, ltpMovement, bidAskEaten, spotLtpMovement features.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public class MetricResult {
    
    /**
     * The symbol/identifier for this metric (e.g., "NIFTY23DEC_FUT", "NIFTY", etc.)
     */
    private String symbol;
    
    /**
     * The feature name (e.g., "trendScore", "ltpMovement", "bidAskEaten", "spotLtpMovement")
     */
    private String feature;
    
    /**
     * The calculated value
     */
    private Double value;
    
    /**
     * ISO-8601 timestamp: when this window started
     */
    private String windowStart;
    
    /**
     * ISO-8601 timestamp: when this window ended (exclusive)
     */
    private String windowEnd;
    
    /**
     * ISO-8601 timestamp: when this result was computed
     */
    private String computedAt;
    
    /**
     * Status: "final" (window completed), "partial" (in-progress), "missing" (no data yet), "pending" (calculation queued)
     */
    private String status;
    
    /**
     * Monotonic version number (increases per feature per symbol)
     */
    private Long version;
    
    /**
     * ISO-8601 timestamp: when the next window result is expected
     */
    private String nextExpectedUpdate;
    
    // Additional metadata for specific features
    private String direction; // For ltpMovement, spotLtpMovement
    private Integer confidence; // For ltpMovement
    private String intensity; // For ltpMovement (HIGH/SLOW)
    private String classification; // For trendScore (Bullish/Bearish/Neutral)
    private Double futuresScore; // For trendScore
    private Double callsScore; // For trendScore
    private Double putsScore; // For trendScore
    private Long bidEaten; // For bidAskEaten
    private Long askEaten; // For bidAskEaten
    
    public MetricResult() {
    }
    
    public MetricResult(String symbol, String feature, Double value) {
        this.symbol = symbol;
        this.feature = feature;
        this.value = value;
        this.status = "final";
        this.version = 0L;
    }
    
    public static MetricResult missing(String symbol, String feature) {
        MetricResult result = new MetricResult(symbol, feature, null);
        result.setStatus("missing");
        result.setVersion(0L);
        return result;
    }
    
    public static MetricResult pending(String symbol, String feature) {
        MetricResult result = new MetricResult(symbol, feature, null);
        result.setStatus("pending");
        result.setVersion(0L);
        return result;
    }
    
    // Getters and Setters
    
    public String getSymbol() {
        return symbol;
    }
    
    public void setSymbol(String symbol) {
        this.symbol = symbol;
    }
    
    public String getFeature() {
        return feature;
    }
    
    public void setFeature(String feature) {
        this.feature = feature;
    }
    
    public Double getValue() {
        return value;
    }
    
    public void setValue(Double value) {
        this.value = value;
    }
    
    public String getWindowStart() {
        return windowStart;
    }
    
    public void setWindowStart(String windowStart) {
        this.windowStart = windowStart;
    }
    
    public void setWindowStart(Instant windowStart) {
        this.windowStart = windowStart != null ? windowStart.toString() : null;
    }
    
    public String getWindowEnd() {
        return windowEnd;
    }
    
    public void setWindowEnd(String windowEnd) {
        this.windowEnd = windowEnd;
    }
    
    public void setWindowEnd(Instant windowEnd) {
        this.windowEnd = windowEnd != null ? windowEnd.toString() : null;
    }
    
    public String getComputedAt() {
        return computedAt;
    }
    
    public void setComputedAt(String computedAt) {
        this.computedAt = computedAt;
    }
    
    public void setComputedAt(Instant computedAt) {
        this.computedAt = computedAt != null ? computedAt.toString() : null;
    }
    
    public String getStatus() {
        return status;
    }
    
    public void setStatus(String status) {
        this.status = status;
    }
    
    public Long getVersion() {
        return version;
    }
    
    public void setVersion(Long version) {
        this.version = version;
    }
    
    public String getNextExpectedUpdate() {
        return nextExpectedUpdate;
    }
    
    public void setNextExpectedUpdate(String nextExpectedUpdate) {
        this.nextExpectedUpdate = nextExpectedUpdate;
    }
    
    public void setNextExpectedUpdate(Instant nextExpectedUpdate) {
        this.nextExpectedUpdate = nextExpectedUpdate != null ? nextExpectedUpdate.toString() : null;
    }
    
    public String getDirection() {
        return direction;
    }
    
    public void setDirection(String direction) {
        this.direction = direction;
    }
    
    public Integer getConfidence() {
        return confidence;
    }
    
    public void setConfidence(Integer confidence) {
        this.confidence = confidence;
    }
    
    public String getIntensity() {
        return intensity;
    }
    
    public void setIntensity(String intensity) {
        this.intensity = intensity;
    }
    
    public String getClassification() {
        return classification;
    }
    
    public void setClassification(String classification) {
        this.classification = classification;
    }
    
    public Double getFuturesScore() {
        return futuresScore;
    }
    
    public void setFuturesScore(Double futuresScore) {
        this.futuresScore = futuresScore;
    }
    
    public Double getCallsScore() {
        return callsScore;
    }
    
    public void setCallsScore(Double callsScore) {
        this.callsScore = callsScore;
    }
    
    public Double getPutsScore() {
        return putsScore;
    }
    
    public void setPutsScore(Double putsScore) {
        this.putsScore = putsScore;
    }
    
    public Long getBidEaten() {
        return bidEaten;
    }
    
    public void setBidEaten(Long bidEaten) {
        this.bidEaten = bidEaten;
    }
    
    public Long getAskEaten() {
        return askEaten;
    }
    
    public void setAskEaten(Long askEaten) {
        this.askEaten = askEaten;
    }
}



