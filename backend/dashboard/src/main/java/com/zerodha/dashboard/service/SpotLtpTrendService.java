package com.zerodha.dashboard.service;

import com.zerodha.dashboard.model.DerivativeContract;
import com.zerodha.dashboard.model.DerivativesChain;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Service to calculate spot/futures LTP trend.
 * 
 * This tracks the average movement of the spot LTP over a configurable time window.
 * The trend shows whether the spot price is moving up or down on average.
 * 
 * Calculation:
 * - Stores LTP values with timestamps in a FIFO queue
 * - Calculates percent change from oldest to newest value in the window
 * - Returns the trend direction and percentage
 */
@Service
public class SpotLtpTrendService {
    
    private static final Logger log = LoggerFactory.getLogger(SpotLtpTrendService.class);
    
    // Configurable window in seconds (default 10s)
    private volatile int windowSeconds = 10;
    
    // LTP history with timestamps
    private final List<LtpSnapshot> ltpHistory = new ArrayList<>();
    
    // Current calculated trend
    private volatile double trendPercent = 0.0;
    private volatile String trendDirection = "FLAT"; // UP, DOWN, FLAT
    
    /**
     * Simple snapshot of LTP at a point in time.
     */
    private static class LtpSnapshot {
        final double ltp;
        final Instant timestamp;
        
        LtpSnapshot(double ltp, Instant timestamp) {
            this.ltp = ltp;
            this.timestamp = timestamp;
        }
    }
    
    /**
     * Set the window size in seconds (5-60s, 5s increments).
     */
    public void setWindowSeconds(int seconds) {
        if (seconds < 5) seconds = 5;
        if (seconds > 60) seconds = 60;
        // Round to nearest 5
        seconds = (seconds / 5) * 5;
        if (seconds < 5) seconds = 5;
        
        int oldWindow = this.windowSeconds;
        this.windowSeconds = seconds;
        
        if (oldWindow != seconds) {
            // Clear history when window changes
            synchronized (ltpHistory) {
                ltpHistory.clear();
            }
            trendPercent = 0.0;
            trendDirection = "FLAT";
            log.info("Spot LTP trend window changed from {}s to {}s - history cleared", oldWindow, seconds);
        }
    }
    
    /**
     * Get the current window size in seconds.
     */
    public int getWindowSeconds() {
        return windowSeconds;
    }
    
    /**
     * Calculate the spot LTP trend for a derivatives chain.
     * Called on every API poll.
     */
    public void calculateSpotLtpTrend(DerivativesChain chain) {
        if (chain == null) {
            return;
        }
        
        try {
            // Get the spot/futures LTP from the first futures contract
            Double currentLtp = extractFuturesLtp(chain);
            
            if (currentLtp == null) {
                log.debug("calculateSpotLtpTrend: No futures LTP available");
                chain.setSpotLtpTrendPercent(trendPercent);
                chain.setSpotLtpTrendDirection(trendDirection);
                return;
            }
            
            Instant now = Instant.now();
            Instant windowStart = now.minusSeconds(windowSeconds);
            
            synchronized (ltpHistory) {
                // Add current LTP to history
                ltpHistory.add(new LtpSnapshot(currentLtp, now));
                
                // Remove entries older than the window
                ltpHistory.removeIf(s -> s.timestamp.isBefore(windowStart));
                
                // Calculate trend if we have enough data
                if (ltpHistory.size() >= 2) {
                    // Get oldest and newest values in window
                    LtpSnapshot oldest = ltpHistory.get(0);
                    LtpSnapshot newest = ltpHistory.get(ltpHistory.size() - 1);
                    
                    // Calculate percent change
                    if (oldest.ltp != 0) {
                        double change = ((newest.ltp - oldest.ltp) / oldest.ltp) * 100;
                        trendPercent = Math.round(change * 100.0) / 100.0; // Round to 2 decimals
                        
                        // Determine direction with threshold
                        if (change > 0.01) {
                            trendDirection = "UP";
                        } else if (change < -0.01) {
                            trendDirection = "DOWN";
                        } else {
                            trendDirection = "FLAT";
                        }
                    }
                    
                    log.debug("calculateSpotLtpTrend: {} {}% (oldest={}, newest={}, window={}s, samples={})", 
                        trendDirection, 
                        String.format("%.2f", trendPercent),
                        String.format("%.2f", oldest.ltp),
                        String.format("%.2f", newest.ltp),
                        windowSeconds,
                        ltpHistory.size());
                }
            }
            
            // Set on chain
            chain.setSpotLtpTrendPercent(trendPercent);
            chain.setSpotLtpTrendDirection(trendDirection);
            
        } catch (Exception e) {
            log.error("Error calculating spot LTP trend: {}", e.getMessage(), e);
            chain.setSpotLtpTrendPercent(trendPercent);
            chain.setSpotLtpTrendDirection(trendDirection);
        }
    }
    
    /**
     * Extract LTP from the first valid futures contract.
     */
    private Double extractFuturesLtp(DerivativesChain chain) {
        if (chain.getFutures() == null || chain.getFutures().isEmpty()) {
            return null;
        }
        
        for (DerivativeContract contract : chain.getFutures()) {
            if (contract != null && contract.getLastPrice() != null) {
                return contract.getLastPrice().doubleValue();
            }
        }
        
        return null;
    }
    
    /**
     * Get current trend percent.
     */
    public double getTrendPercent() {
        return trendPercent;
    }
    
    /**
     * Get current trend direction.
     */
    public String getTrendDirection() {
        return trendDirection;
    }
}


