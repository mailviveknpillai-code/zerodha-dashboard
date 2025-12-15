package com.zerodha.dashboard.service.impl;

import com.zerodha.dashboard.model.DerivativesChain;
import com.zerodha.dashboard.model.MetricResult;
import com.zerodha.dashboard.service.MetricsCacheService;
import com.zerodha.dashboard.service.SpotLtpTrendService;
import com.zerodha.dashboard.service.WindowManager;
import com.zerodha.dashboard.service.IndependentMetricService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;

/**
 * Independent Spot LTP Trend Service - operates as a microservice.
 * 
 * Features:
 * - Own window management (isolated WindowManager state)
 * - Own cache/storage (isolated MetricsCacheService keys)
 * - Own error handling (isolated try-catch)
 * - No dependencies on other services
 */
@Service
public class IndependentSpotLtpTrendService implements IndependentMetricService {
    
    private static final Logger log = LoggerFactory.getLogger(IndependentSpotLtpTrendService.class);
    private static final String SERVICE_NAME = "SpotLtpTrend";
    private static final String FEATURE_NAME = "spotLtpMovement";
    private static final String SYMBOL = "NIFTY";
    
    private final SpotLtpTrendService spotLtpTrendService;
    private final WindowManager windowManager;
    private final MetricsCacheService metricsCacheService;
    
    public IndependentSpotLtpTrendService(
            SpotLtpTrendService spotLtpTrendService,
            WindowManager windowManager,
            MetricsCacheService metricsCacheService) {
        this.spotLtpTrendService = spotLtpTrendService;
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
            
            // Step 1: Calculate spot LTP trend (maintains own internal state)
            spotLtpTrendService.calculateSpotLtpTrend(chain);
            
            // Step 2: Get window state (isolated for this service)
            // NOTE: calculateSpotLtpTrend already called checkAndUpdateWindow, so we use the same state
            int windowSeconds = spotLtpTrendService.getWindowSeconds();
            WindowManager.WindowState windowState = windowManager.getWindowState(
                FEATURE_NAME, SYMBOL, windowSeconds);
            
            // NOTE: calculateSpotLtpTrend already called checkAndUpdateWindow and updated the window state
            // We just need to check hasCompletedWindow() to determine if we should store a final result
            
            // Step 3: Get COMPLETED values directly from service (not from chain)
            // CRITICAL: Use completed values (from previous window) for stable display
            // The chain values are set for UI display, but cache should store completed values
            // This ensures the frontend always sees stable values from the previous completed window
            Double percent = spotLtpTrendService.getTrendPercent();
            String direction = spotLtpTrendService.getTrendDirection();
            
            // Step 4: Store result in own cache (isolated keys)
            // CRITICAL: Store final results when window completes
            // Since calculateSpotLtpTrend already updated the window state, we check hasCompletedWindow()
            // to determine if we should store a final result
            // This matches the pattern used by TrendCalculationService
            // NOTE: We need to check if window just changed to avoid storing final result multiple times
            // But since calculateSpotLtpTrend already updated the window, we check hasCompletedWindow()
            // and use the current window boundaries (which are for the completed window)
            if (windowState.hasCompletedWindow() && windowState.getWindowStartTime() != null) {
                // Window has completed - store the completed result as final
                // The completed values were already set by calculateSpotLtpTrend when the window completed
                // Use the current window boundaries (which represent the completed window)
                MetricResult result = new MetricResult(SYMBOL, FEATURE_NAME, percent);
                result.setWindowStart(windowState.getWindowStartTime());
                result.setWindowEnd(windowState.getWindowEndTime());
                result.setComputedAt(now);
                result.setStatus("final");
                result.setDirection(direction);
                result.setVersion(metricsCacheService.getVersion(SYMBOL, FEATURE_NAME));
                result.setNextExpectedUpdate(windowState.getNextWindowStartTime());
                
                metricsCacheService.storeFinalResult(result);
                log.debug("{}: Stored final result - percent={}, direction={}, window={}s-{}s", 
                    SERVICE_NAME, percent, direction, 
                    windowState.getWindowStartTime(), windowState.getWindowEndTime());
            } else {
                // During window calculation (before first window completes) - store partial result with completed values
                // This ensures frontend always sees stable completed values, not current window values
                if (percent != null) {
                    MetricResult result = new MetricResult(SYMBOL, FEATURE_NAME, percent);
                    result.setWindowStart(windowState.getWindowStartTime());
                    result.setWindowEnd(windowState.getWindowEndTime());
                    result.setComputedAt(now);
                    result.setStatus("partial");
                    result.setDirection(direction);
                    result.setVersion(metricsCacheService.getVersion(SYMBOL, FEATURE_NAME));
                    result.setNextExpectedUpdate(windowState.getNextWindowStartTime());
                    
                    metricsCacheService.storePartialResult(result);
                }
            }
            
            // Step 5: Populate chain with window metadata (similar to IndependentTrendScoreService)
            // The calculated values from Step 1 are already on the chain
            // Only populate window metadata for UI timer display
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
     * Calculated values come directly from SpotLtpTrendService.calculateSpotLtpTrend().
     */
    private void populateWindowMetadata(DerivativesChain chain, WindowManager.WindowState windowState, int windowSeconds) {
        try {
            // Always set window size
            chain.setSpotLtpWindowSeconds(windowSeconds);
            
            // Set window start/end from current window state
            if (windowState.getWindowStartTime() != null) {
                chain.setSpotLtpWindowStart(windowState.getWindowStartTime());
                chain.setSpotLtpWindowEnd(windowState.getWindowEndTime());
            } else {
                // Calculate from current time if window state not initialized
                Instant now = Instant.now();
                long currentEpochSecond = now.getEpochSecond();
                long windowNumber = currentEpochSecond / windowSeconds;
                long windowStartEpochSecond = windowNumber * windowSeconds;
                Instant calculatedWindowStart = Instant.ofEpochSecond(windowStartEpochSecond);
                chain.setSpotLtpWindowStart(calculatedWindowStart);
                chain.setSpotLtpWindowEnd(calculatedWindowStart.plusSeconds(windowSeconds));
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

