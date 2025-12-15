package com.zerodha.dashboard.service.impl;

import com.zerodha.dashboard.model.DerivativesChain;
import com.zerodha.dashboard.model.MetricResult;
import com.zerodha.dashboard.service.MetricsCacheService;
import com.zerodha.dashboard.service.TrendCalculationService;
import com.zerodha.dashboard.service.WindowManager;
import com.zerodha.dashboard.service.IndependentMetricService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;

/**
 * Independent Trend Score Service - operates as a microservice.
 * 
 * Features:
 * - Own window management (isolated WindowManager state)
 * - Own cache/storage (isolated MetricsCacheService keys)
 * - Own error handling (isolated try-catch)
 * - No dependencies on other services
 */
@Service
public class IndependentTrendScoreService implements IndependentMetricService {
    
    private static final Logger log = LoggerFactory.getLogger(IndependentTrendScoreService.class);
    private static final String SERVICE_NAME = "TrendScore";
    private static final String FEATURE_NAME = "trendScore";
    private static final String SYMBOL = "NIFTY";
    
    private final TrendCalculationService trendCalculationService;
    private final WindowManager windowManager;
    private final MetricsCacheService metricsCacheService;
    
    public IndependentTrendScoreService(
            TrendCalculationService trendCalculationService,
            WindowManager windowManager,
            MetricsCacheService metricsCacheService) {
        this.trendCalculationService = trendCalculationService;
        this.windowManager = windowManager;
        this.metricsCacheService = metricsCacheService;
    }
    
    @Override
    public boolean process(DerivativesChain chain) {
        if (chain == null) {
            log.debug("{}: Chain is null, skipping", SERVICE_NAME);
            return false;
        }
        
        try {
            Instant now = Instant.now();
            
            // Step 1: Calculate trend using TrendCalculationService (maintains own internal state)
            trendCalculationService.calculateTrend(chain);
            
            // Step 2: Get window state (isolated for this service)
            int windowSeconds = trendCalculationService.getWindowSeconds();
            WindowManager.WindowState windowState = windowManager.getWindowState(
                FEATURE_NAME, SYMBOL, windowSeconds);
            
            boolean windowChanged = windowState.checkAndUpdateWindow(now);
            
            // Step 3: Get calculated values from chain
            Double score = chain.getTrendScore();
            String classification = chain.getTrendClassification();
            Double futuresScore = chain.getFuturesTrendScore();
            Double callsScore = chain.getCallsTrendScore();
            Double putsScore = chain.getPutsTrendScore();
            
            // Step 4: Store result in own cache (isolated keys)
            if (windowChanged && windowState.hasCompletedWindow()) {
                // Window completed - store final result
                MetricResult result = new MetricResult(SYMBOL, FEATURE_NAME, score);
                result.setWindowStart(windowState.getWindowStartTime());
                result.setWindowEnd(windowState.getWindowEndTime());
                result.setComputedAt(now);
                result.setStatus("final");
                result.setClassification(classification);
                result.setFuturesScore(futuresScore);
                result.setCallsScore(callsScore);
                result.setPutsScore(putsScore);
                result.setVersion(metricsCacheService.getVersion(SYMBOL, FEATURE_NAME));
                result.setNextExpectedUpdate(windowState.getNextWindowStartTime());
                
                metricsCacheService.storeFinalResult(result);
                log.debug("{}: Stored final result - score={}, classification={}", 
                    SERVICE_NAME, score, classification);
            } else if (score != null) {
                // Store partial result
                MetricResult result = new MetricResult(SYMBOL, FEATURE_NAME, score);
                result.setWindowStart(windowState.getWindowStartTime());
                result.setWindowEnd(windowState.getWindowEndTime());
                result.setComputedAt(now);
                result.setStatus("partial");
                result.setClassification(classification);
                result.setFuturesScore(futuresScore);
                result.setCallsScore(callsScore);
                result.setPutsScore(putsScore);
                result.setVersion(metricsCacheService.getVersion(SYMBOL, FEATURE_NAME));
                result.setNextExpectedUpdate(windowState.getNextWindowStartTime());
                
                metricsCacheService.storePartialResult(result);
            }
            
            // Step 5: Keep calculated values on chain (don't overwrite with cache)
            // The calculated values from Step 1 are already on the chain
            // Only populate window metadata (not the calculated values)
            populateWindowMetadata(chain, windowState, windowSeconds);
            
            return true;
            
        } catch (Exception e) {
            log.error("{}: Error processing chain - {}", SERVICE_NAME, e.getMessage(), e);
            // Isolated error handling - don't affect other services
            return false;
        }
    }
    
    /**
     * Populate chain with window metadata only (not calculated values).
     * Calculated values come directly from TrendCalculationService.calculateTrend().
     */
    private void populateWindowMetadata(DerivativesChain chain, WindowManager.WindowState windowState, int windowSeconds) {
        try {
            // Always set window size
            chain.setTrendWindowSeconds(windowSeconds);
            
            // Set window start/end from current window state
            if (windowState.getWindowStartTime() != null) {
                chain.setTrendWindowStart(windowState.getWindowStartTime());
                chain.setTrendWindowEnd(windowState.getWindowEndTime());
            } else {
                // Calculate from current time if window state not initialized
                Instant now = Instant.now();
                long currentEpochSecond = now.getEpochSecond();
                long windowNumber = currentEpochSecond / windowSeconds;
                long windowStartEpochSecond = windowNumber * windowSeconds;
                Instant calculatedWindowStart = Instant.ofEpochSecond(windowStartEpochSecond);
                chain.setTrendWindowStart(calculatedWindowStart);
                chain.setTrendWindowEnd(calculatedWindowStart.plusSeconds(windowSeconds));
            }
            
        } catch (Exception e) {
            log.error("{}: Error populating window metadata", SERVICE_NAME, e);
        }
    }
    
    @Override
    public String getServiceName() {
        return SERVICE_NAME;
    }
    
    @Override
    public boolean isEnabled() {
        return true; // Always enabled
    }
}

