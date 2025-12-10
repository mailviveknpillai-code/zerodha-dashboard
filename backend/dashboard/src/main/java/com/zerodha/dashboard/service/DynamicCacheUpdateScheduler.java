package com.zerodha.dashboard.service;

import com.zerodha.dashboard.adapter.ZerodhaApiAdapter;
import com.zerodha.dashboard.model.DerivativesChain;
import com.zerodha.dashboard.model.DerivativeContract;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ScheduledFuture;

/**
 * Dynamic scheduler service that updates the cache at a configurable interval.
 * The interval can be changed at runtime via API calls.
 */
@Service
public class DynamicCacheUpdateScheduler {

    private static final Logger log = LoggerFactory.getLogger(DynamicCacheUpdateScheduler.class);
    private static final String REDIS_KEY_INTERVAL = "zerodha:cache:update:interval:ms";
    
    private final ZerodhaApiAdapter zerodhaApiAdapter;
    private final LatestSnapshotCacheService latestSnapshotCacheService;
    private final ZerodhaSessionService zerodhaSessionService;
    private final EatenDeltaService eatenDeltaService;
    private final LtpMovementService ltpMovementService;
    private final TrendCalculationService trendCalculationService;
    private final SpotLtpTrendService spotLtpTrendService;
    private final TaskScheduler taskScheduler;
    private final StringRedisTemplate redisTemplate;
    
    @Value("${zerodha.enabled:false}")
    private boolean zerodhaEnabled;
    
    @Value("${cache.update.enabled:true}")
    private boolean cacheUpdateEnabled;
    
    @Value("${cache.update.interval.ms:1000}")
    private long defaultIntervalMs;
    
    private ScheduledFuture<?> scheduledTask;
    private volatile long currentIntervalMs;
    
    // API polling error tracking
    private volatile Instant lastSuccessfulPoll = null;
    private volatile Instant lastFailedPoll = null;
    private volatile String lastError = null;
    private volatile int consecutiveFailures = 0;
    private static final int MAX_CONSECUTIVE_FAILURES = 3;

    public DynamicCacheUpdateScheduler(
            ZerodhaApiAdapter zerodhaApiAdapter,
            LatestSnapshotCacheService latestSnapshotCacheService,
            ZerodhaSessionService zerodhaSessionService,
            EatenDeltaService eatenDeltaService,
            LtpMovementService ltpMovementService,
            TrendCalculationService trendCalculationService,
            SpotLtpTrendService spotLtpTrendService,
            TaskScheduler taskScheduler,
            StringRedisTemplate redisTemplate) {
        this.zerodhaApiAdapter = zerodhaApiAdapter;
        this.latestSnapshotCacheService = latestSnapshotCacheService;
        this.zerodhaSessionService = zerodhaSessionService;
        this.eatenDeltaService = eatenDeltaService;
        this.ltpMovementService = ltpMovementService;
        this.trendCalculationService = trendCalculationService;
        this.spotLtpTrendService = spotLtpTrendService;
        this.taskScheduler = taskScheduler;
        this.redisTemplate = redisTemplate;
    }
    
    @PostConstruct
    public void init() {
        // Load interval from Redis or use default
        long interval = loadIntervalFromRedis();
        if (interval <= 0) {
            interval = defaultIntervalMs;
        }
        currentIntervalMs = interval;
        startScheduler(interval);
        log.info("Dynamic cache update scheduler initialized with interval: {}ms", interval);
    }
    
    @PreDestroy
    public void shutdown() {
        stopScheduler();
    }
    
    /**
     * Update the polling interval dynamically.
     * @param intervalMs New interval in milliseconds (must be >= 250ms)
     */
    public void updateInterval(long intervalMs) {
        long oldIntervalMs = currentIntervalMs;
        
        if (intervalMs < 250) {
            log.warn("Interval {}ms is too low, using minimum 250ms", intervalMs);
            intervalMs = 250;
        }
        
        if (intervalMs == currentIntervalMs) {
            log.debug("Interval unchanged: {}ms ({}s)", intervalMs, intervalMs / 1000.0);
            return;
        }
        
        log.info("Updating API polling interval from {}ms ({}s) to {}ms ({}s)", 
            oldIntervalMs, oldIntervalMs / 1000.0, intervalMs, intervalMs / 1000.0);
        
        if (intervalMs < 1500) {
            log.warn("WARNING: API polling interval set to {}ms ({}s) - values below 1.5s may cause crashes or rate limiting", 
                intervalMs, intervalMs / 1000.0);
        }
        
        currentIntervalMs = intervalMs;
        
        // Save to Redis for persistence
        saveIntervalToRedis(intervalMs);
        
        // Restart scheduler with new interval
        stopScheduler();
        startScheduler(intervalMs);
        
        log.info("API polling interval successfully updated to {}ms ({}s). Scheduler restarted.", 
            intervalMs, intervalMs / 1000.0);
    }
    
    /**
     * Get the current polling interval.
     */
    public long getCurrentInterval() {
        return currentIntervalMs;
    }
    
    private void startScheduler(long intervalMs) {
        if (!cacheUpdateEnabled || !zerodhaEnabled) {
            log.debug("Scheduler disabled or Zerodha not enabled");
            return;
        }
        
        stopScheduler(); // Ensure no duplicate tasks
        
        scheduledTask = taskScheduler.scheduleWithFixedDelay(
            this::updateCache,
            Duration.ofMillis(intervalMs)
        );
        
        log.debug("Started cache update scheduler with interval: {}ms", intervalMs);
    }
    
    private void stopScheduler() {
        if (scheduledTask != null && !scheduledTask.isCancelled()) {
            scheduledTask.cancel(false);
            scheduledTask = null;
            log.debug("Stopped cache update scheduler");
        }
    }
    
    private void updateCache() {
        if (!cacheUpdateEnabled || !zerodhaEnabled) {
            return;
        }
        
        if (!zerodhaSessionService.hasActiveAccessToken()) {
            log.debug("Skipping cache update - Zerodha session not active");
            lastError = "Zerodha session not active";
            lastFailedPoll = Instant.now();
            consecutiveFailures++;
            return;
        }
        
        try {
            log.debug("Scheduled cache update started (interval: {}ms)", currentIntervalMs);
            
            // STEP 1: Fetch RAW data from API (no calculations yet)
            Optional<DerivativesChain> chainOpt = zerodhaApiAdapter.getDerivativesChain("NIFTY");
            
            if (!chainOpt.isPresent()) {
                log.warn("API polling failed: No data returned from Zerodha API");
                lastError = "No data returned from Zerodha API";
                lastFailedPoll = Instant.now();
                consecutiveFailures++;
                
                if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                    log.error("WARNING: API polling has failed {} consecutive times. Last error: {}", 
                        consecutiveFailures, lastError);
                }
                return;
            }
            
            // STEP 2: Get RAW chain
            DerivativesChain rawChain = chainOpt.get();
            
            // NOTE: TrendCalculationService maintains its own internal cache and state
            // It handles trend calculation independently at API polling intervals
            
            // STEP 3: Store RAW data in master cache FIRST (before any calculations)
            // This ensures the master cache always has the latest raw data
            // CRITICAL: Master cache stores RAW data only - no calculations
            // NOTE: We don't update cache here anymore - we update after calculations
            
            // STEP 4: Perform calculations on the RAW chain
            // Each calculation service maintains its own separate data structures:
            // - EatenDeltaService: previousSnapshots, windowDataMap (independent per instrument)
            // - TrendCalculationService: futuresWindowData, callsWindowData, putsWindowData (independent FIFO stacks)
            // - LtpMovementService: previousLtpSnapshots, movementDataMap (independent per instrument)
            // These services read from the chain and update their own internal state independently
            
            // Calculate eaten delta (maintains its own internal state - previousSnapshots, windowDataMap)
            calculateEatenDeltaForChain(rawChain);
            
            // Calculate trend indicator (uses in-memory FIFO cache - matching release logic)
            // Calculation happens at API polling intervals, result is displayed at UI refresh rate
            trendCalculationService.calculateTrend(rawChain);
            
            // Calculate spot LTP trend (average movement over configured window)
            spotLtpTrendService.calculateSpotLtpTrend(rawChain);
            
            // Calculate LTP movement based on API-polled LTP (independent cache in LtpMovementService)
            calculateLtpMovementForChain(rawChain);
            
            // STEP 5: Update master cache with calculated values
            // TrendCalculationService handles its own state and always sets valid trend on the chain
            latestSnapshotCacheService.updateCache(rawChain);
            
            // Success - reset error tracking
            lastSuccessfulPoll = Instant.now();
            lastError = null;
            consecutiveFailures = 0;
            
            log.debug("Cache updated successfully with {} contracts (raw data + calculations)", 
                rawChain.getTotalContracts());
                
        } catch (Exception e) {
            log.error("Error updating cache in scheduled task: {}", e.getMessage(), e);
            lastError = e.getMessage();
            lastFailedPoll = Instant.now();
            consecutiveFailures++;
            
            if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                log.error("WARNING: API polling has failed {} consecutive times. Last error: {}", 
                    consecutiveFailures, lastError);
            }
            // Don't throw - allow scheduler to continue
        }
    }
    
    
    /**
     * Get API polling status (for health checks and warnings).
     */
    public Map<String, Object> getApiPollingStatus() {
        Map<String, Object> status = new java.util.HashMap<>();
        status.put("lastSuccessfulPoll", lastSuccessfulPoll);
        status.put("lastFailedPoll", lastFailedPoll);
        status.put("lastError", lastError);
        status.put("consecutiveFailures", consecutiveFailures);
        status.put("hasWarning", consecutiveFailures >= MAX_CONSECUTIVE_FAILURES);
        status.put("currentIntervalMs", currentIntervalMs);
        return status;
    }
    
    private long loadIntervalFromRedis() {
        try {
            String value = redisTemplate.opsForValue().get(REDIS_KEY_INTERVAL);
            if (value != null) {
                long interval = Long.parseLong(value);
                if (interval >= 250) {
                    return interval;
                }
            }
        } catch (Exception e) {
            log.warn("Failed to load interval from Redis: {}", e.getMessage());
        }
        return 0;
    }
    
    private void saveIntervalToRedis(long intervalMs) {
        try {
            redisTemplate.opsForValue().set(REDIS_KEY_INTERVAL, String.valueOf(intervalMs));
            log.debug("Saved interval {}ms to Redis", intervalMs);
        } catch (Exception e) {
            log.warn("Failed to save interval to Redis: {}", e.getMessage());
        }
    }
    
    /**
     * Calculate eaten delta for all contracts in the chain.
     * This is called on every tick to update the eaten delta values.
     */
    private void calculateEatenDeltaForChain(DerivativesChain chain) {
        if (chain == null) {
            log.warn("calculateEatenDeltaForChain: chain is null");
            return;
        }
        
        int futuresCount = 0;
        int callOptionsCount = 0;
        int putOptionsCount = 0;
        int errorsCount = 0;
        
        try {
            // Process futures
            if (chain.getFutures() != null) {
                for (DerivativeContract contract : chain.getFutures()) {
                    try {
                        // calculateEatenDelta sets eatenDelta, bidEaten, and askEaten on the contract
                        eatenDeltaService.calculateEatenDelta(contract);
                        // Values are already set on contract by calculateEatenDelta
                        futuresCount++;
                    } catch (Exception e) {
                        log.error("Error calculating eatenDelta for futures contract {}: {}", 
                            contract != null ? contract.getInstrumentToken() : "null", e.getMessage(), e);
                        errorsCount++;
                        // Set to 0 on error for all eaten values
                        if (contract != null) {
                            contract.setEatenDelta(0L);
                            contract.setBidEaten(0L);
                            contract.setAskEaten(0L);
                        }
                    }
                }
            }
            
            // Process call options
            if (chain.getCallOptions() != null) {
                for (DerivativeContract contract : chain.getCallOptions()) {
                    try {
                        // calculateEatenDelta sets eatenDelta, bidEaten, and askEaten on the contract
                        eatenDeltaService.calculateEatenDelta(contract);
                        // Values are already set on contract by calculateEatenDelta
                        callOptionsCount++;
                    } catch (Exception e) {
                        log.error("Error calculating eatenDelta for call option {}: {}", 
                            contract != null ? contract.getInstrumentToken() : "null", e.getMessage(), e);
                        errorsCount++;
                        // Set to 0 on error for all eaten values
                        if (contract != null) {
                            contract.setEatenDelta(0L);
                            contract.setBidEaten(0L);
                            contract.setAskEaten(0L);
                        }
                    }
                }
            }
            
            // Process put options
            if (chain.getPutOptions() != null) {
                for (DerivativeContract contract : chain.getPutOptions()) {
                    try {
                        // calculateEatenDelta sets eatenDelta, bidEaten, and askEaten on the contract
                        eatenDeltaService.calculateEatenDelta(contract);
                        // Values are already set on contract by calculateEatenDelta
                        putOptionsCount++;
                    } catch (Exception e) {
                        log.error("Error calculating eatenDelta for put option {}: {}", 
                            contract != null ? contract.getInstrumentToken() : "null", e.getMessage(), e);
                        errorsCount++;
                        // Set to 0 on error for all eaten values
                        if (contract != null) {
                            contract.setEatenDelta(0L);
                            contract.setBidEaten(0L);
                            contract.setAskEaten(0L);
                        }
                    }
                }
            }
            
            log.debug("calculateEatenDeltaForChain completed: futures={}, calls={}, puts={}, errors={}", 
                futuresCount, callOptionsCount, putOptionsCount, errorsCount);
        } catch (Exception e) {
            log.error("Fatal error in calculateEatenDeltaForChain: {}", e.getMessage(), e);
        }
    }
    
    /**
     * Calculate LTP movement for all contracts in the chain.
     * This is called on every tick to update the LTP movement values.
     */
    private void calculateLtpMovementForChain(DerivativesChain chain) {
        if (chain == null) {
            log.warn("calculateLtpMovementForChain: chain is null");
            return;
        }
        
        int futuresCount = 0;
        int callOptionsCount = 0;
        int putOptionsCount = 0;
        int errorsCount = 0;
        
        try {
            // Process futures
            if (chain.getFutures() != null) {
                for (com.zerodha.dashboard.model.DerivativeContract contract : chain.getFutures()) {
                    try {
                        ltpMovementService.calculateLtpMovement(contract);
                        futuresCount++;
                    } catch (Exception e) {
                        log.error("Error calculating LTP movement for futures contract {}: {}", 
                            contract != null ? contract.getInstrumentToken() : "null", e.getMessage(), e);
                        errorsCount++;
                        // Set defaults on error
                        if (contract != null) {
                            contract.setLtpMovementDirection("NEUTRAL");
                            contract.setLtpMovementConfidence(0);
                            contract.setLtpMovementIntensity("SLOW");
                        }
                    }
                }
            }
            
            // Process call options
            if (chain.getCallOptions() != null) {
                for (com.zerodha.dashboard.model.DerivativeContract contract : chain.getCallOptions()) {
                    try {
                        ltpMovementService.calculateLtpMovement(contract);
                        callOptionsCount++;
                    } catch (Exception e) {
                        log.error("Error calculating LTP movement for call option {}: {}", 
                            contract != null ? contract.getInstrumentToken() : "null", e.getMessage(), e);
                        errorsCount++;
                        // Set defaults on error
                        if (contract != null) {
                            contract.setLtpMovementDirection("NEUTRAL");
                            contract.setLtpMovementConfidence(0);
                            contract.setLtpMovementIntensity("SLOW");
                        }
                    }
                }
            }
            
            // Process put options
            if (chain.getPutOptions() != null) {
                for (com.zerodha.dashboard.model.DerivativeContract contract : chain.getPutOptions()) {
                    try {
                        ltpMovementService.calculateLtpMovement(contract);
                        putOptionsCount++;
                    } catch (Exception e) {
                        log.error("Error calculating LTP movement for put option {}: {}", 
                            contract != null ? contract.getInstrumentToken() : "null", e.getMessage(), e);
                        errorsCount++;
                        // Set defaults on error
                        if (contract != null) {
                            contract.setLtpMovementDirection("NEUTRAL");
                            contract.setLtpMovementConfidence(0);
                            contract.setLtpMovementIntensity("SLOW");
                        }
                    }
                }
            }
            
            log.debug("calculateLtpMovementForChain completed: futures={}, calls={}, puts={}, errors={}", 
                futuresCount, callOptionsCount, putOptionsCount, errorsCount);
        } catch (Exception e) {
            log.error("Fatal error in calculateLtpMovementForChain: {}", e.getMessage(), e);
        }
    }
}

