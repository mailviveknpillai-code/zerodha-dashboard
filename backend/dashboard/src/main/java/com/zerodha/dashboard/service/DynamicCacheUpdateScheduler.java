package com.zerodha.dashboard.service;

import com.zerodha.dashboard.adapter.ZerodhaApiAdapter;
import com.zerodha.dashboard.constants.WindowConstants;
import com.zerodha.dashboard.model.DerivativesChain;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.time.Instant;
import java.util.List;
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
    private final BasicValuesCacheService basicValuesCacheService; // Separate cache for basic values (8 columns)
    private final ZerodhaSessionService zerodhaSessionService;
    // Independent metric services - each operates as a microservice
    private final List<IndependentMetricService> independentServices;
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
    
    // Track scheduled time for exact interval maintenance
    private volatile long nextScheduledTimeMs = 0;
    
    // Prevent overlapping executions - simple flag check
    private volatile boolean updateInProgress = false;
    
    // API polling error tracking
    private volatile Instant lastSuccessfulPoll = null;
    private volatile Instant lastFailedPoll = null;
    private volatile String lastError = null;
    private volatile int consecutiveFailures = 0;
    private static final int MAX_CONSECUTIVE_FAILURES = 3;

    public DynamicCacheUpdateScheduler(
            ZerodhaApiAdapter zerodhaApiAdapter,
            LatestSnapshotCacheService latestSnapshotCacheService,
            BasicValuesCacheService basicValuesCacheService,
            ZerodhaSessionService zerodhaSessionService,
            TaskScheduler taskScheduler,
            StringRedisTemplate redisTemplate,
            List<IndependentMetricService> independentServices) {
        this.zerodhaApiAdapter = zerodhaApiAdapter;
        this.latestSnapshotCacheService = latestSnapshotCacheService;
        this.basicValuesCacheService = basicValuesCacheService;
        this.zerodhaSessionService = zerodhaSessionService;
        this.taskScheduler = taskScheduler;
        this.redisTemplate = redisTemplate;
        // Initialize independent services list (injected by Spring)
        this.independentServices = independentServices != null ? independentServices : List.of();
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
        log.info("Dynamic cache update scheduler initialized with interval: {}ms ({}s)", 
            interval, interval / 1000.0);
    }
    
    @PreDestroy
    public void shutdown() {
        log.info("Shutting down DynamicCacheUpdateScheduler...");
        stopScheduler();
        // Clear error tracking state
        lastSuccessfulPoll = null;
        lastFailedPoll = null;
        lastError = null;
        consecutiveFailures = 0;
        log.info("DynamicCacheUpdateScheduler shutdown complete");
    }
    
    /**
     * Update the polling interval dynamically.
     * @param intervalMs New interval in milliseconds (must be >= MIN_API_POLLING_INTERVAL_MS)
     */
    public void updateInterval(long intervalMs) {
        long oldIntervalMs = currentIntervalMs;
        
        if (intervalMs < WindowConstants.MIN_API_POLLING_INTERVAL_MS) {
            log.warn("Interval {}ms is too low, using minimum {}ms", intervalMs, WindowConstants.MIN_API_POLLING_INTERVAL_MS);
            intervalMs = WindowConstants.MIN_API_POLLING_INTERVAL_MS;
        }
        
        if (intervalMs == currentIntervalMs) {
            log.debug("Interval unchanged: {}ms ({}s)", intervalMs, intervalMs / 1000.0);
            return;
        }
        
        log.info("Updating API polling interval from {}ms ({}s) to {}ms ({}s)", 
            oldIntervalMs, oldIntervalMs / 1000.0, intervalMs, intervalMs / 1000.0);
        
        if (intervalMs < WindowConstants.WARNING_API_POLLING_INTERVAL_MS) {
            log.warn("WARNING: API polling interval set to {}ms ({}s) - values below {}ms may cause crashes or rate limiting", 
                intervalMs, intervalMs / 1000.0, WindowConstants.WARNING_API_POLLING_INTERVAL_MS);
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
        
        // Initialize scheduled time
        nextScheduledTimeMs = System.currentTimeMillis();
        
        // Start immediately, then self-schedule at exact intervals
        // This prevents task queuing that causes inconsistent updates
        updateCacheAndScheduleNext(intervalMs);
        
        log.info("Started cache update scheduler with interval: {}ms ({}s)", 
            intervalMs, intervalMs / 1000.0);
    }
    
    /**
     * CRITICAL: API polling happens at EXACT intervals, completely independent of processing.
     * 
     * Flow:
     * 1. Schedule next poll at exact interval (based on start time)
     * 2. Check if previous API call is still in progress - if yes, skip (prevent overlapping)
     * 3. Make API call (synchronous - wait for Zerodha response)
     * 4. Update cache immediately with raw data
     * 5. Features fetch from live response and process (doesn't block next poll)
     * 6. Next poll happens at exact scheduled time (independent of processing)
     * 
     * This ensures:
     * - API polling happens at exact configured intervals (not affected by processing)
     * - Only one API call at a time (no overlapping - skip if previous still in progress)
     * - Cache is updated immediately after API response
     * - Features process from live response (consistent)
     * - Processing doesn't affect polling schedule
     */
    private void updateCacheAndScheduleNext(long intervalMs) {
        // Record when this poll was scheduled to run
        long scheduledTime = nextScheduledTimeMs;
        if (scheduledTime == 0) {
            scheduledTime = System.currentTimeMillis();
        }
        
        // CRITICAL: Schedule next poll IMMEDIATELY based on exact interval
        // This ensures polling happens at exact intervals regardless of processing
        long nextScheduled = scheduledTime + intervalMs;
        long now = System.currentTimeMillis();
        long delay = Math.max(0, nextScheduled - now);
        
        // Update scheduled time for next iteration
        nextScheduledTimeMs = nextScheduled;
        
        // Schedule next poll at exact interval (independent of processing)
        Instant nextExecutionTime = Instant.now().plusMillis(delay);
        scheduledTask = taskScheduler.schedule(
            () -> updateCacheAndScheduleNext(intervalMs),
            nextExecutionTime
        );
        
        // Check if previous API call is still in progress - prevent overlapping
        if (updateInProgress) {
            log.debug("Previous API call still in progress, skipping this poll (polling continues at exact intervals)");
            return;
        }
        
        if (!cacheUpdateEnabled || !zerodhaEnabled) {
            return;
        }
        
        // Set in-progress flag for API call
        updateInProgress = true;
        
        try {
            if (!zerodhaSessionService.hasActiveAccessToken()) {
                log.debug("Skipping API poll - Zerodha session not active");
                lastError = "Zerodha session not active";
                lastFailedPoll = Instant.now();
                consecutiveFailures++;
                return;
            }
            
            long apiCallStartTime = System.currentTimeMillis();
            log.debug("API poll started (interval: {}ms)", currentIntervalMs);
            
            // STEP 1: Make API call to Zerodha (synchronous - wait for response)
            // CRITICAL: API call waits for Zerodha response
            // This is the only blocking operation - everything else is independent
            Optional<DerivativesChain> chainOpt = zerodhaApiAdapter.getDerivativesChain("NIFTY");
            
            long apiCallDuration = System.currentTimeMillis() - apiCallStartTime;
            if (apiCallDuration > 100) {
                log.warn("API call took {}ms (unusually slow)", apiCallDuration);
            }
            
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
            
            // Success - update tracking
            lastSuccessfulPoll = Instant.now();
            lastError = null;
            consecutiveFailures = 0;
            
            // STEP 2: Get RAW chain from API response
            DerivativesChain rawChain = chainOpt.get();
            
            // STEP 3: Update cache IMMEDIATELY with raw data
            // CRITICAL: Cache is updated immediately after API response
            // All other processes (except features) will fetch from cache
            basicValuesCacheService.updateCache(rawChain);
            latestSnapshotCacheService.updateCache(rawChain);
            log.debug("Cache updated immediately with raw data from API response");
            
            // STEP 4: Clear in-progress flag - allows next poll to proceed
            // Processing happens but doesn't block next API poll
            updateInProgress = false;
            
            // STEP 5: Process features using live response (doesn't block next poll)
            // CRITICAL: Features fetch from live response directly (not cache) for consistency
            // Processing happens independently - doesn't affect polling schedule
            // Feature calculations are INDEPENDENT of API polling rate:
            // - Each service operates as a microservice with own window management
            // - Windows are epoch-aligned time boundaries (e.g., 0-3s, 3-6s for 3s window)
            // - Services collect data points at each API polling cycle
            // - Final values are calculated and stored when windows complete (at epoch boundaries)
            // - Window completion is based on configured window intervals, NOT API polling rate
            for (IndependentMetricService service : independentServices) {
                if (!service.isEnabled()) {
                    continue;
                }
                
                try {
                    // Each service processes independently - isolated error handling
                    // Services use the live response directly (not cache) for calculations
                    // They collect data points and calculate based on window intervals
                    // Final values are stored in MetricsCacheService when windows complete
                    // They also populate window metadata on the chain (for UI timers)
                    // Basic values (LTP, Bid Qty, Ask Qty, Delta) are NOT modified
                    boolean success = service.process(rawChain);
                    if (!success) {
                        log.warn("{} service returned false, but continuing with other services", 
                            service.getServiceName());
                    }
                } catch (Exception e) {
                    // Isolated error handling - one service failure doesn't affect others
                    log.error("Error in {} service: {}", service.getServiceName(), e.getMessage(), e);
                    // Continue with next service
                }
            }
            
            // STEP 6: Update cache with processed data (includes window metadata)
            // This ensures window metadata from features is available in cache
            basicValuesCacheService.updateCache(rawChain);
            latestSnapshotCacheService.updateCache(rawChain);
            log.debug("Cache updated with processed data (includes window metadata)");
            
            long apiCallDurationTotal = System.currentTimeMillis() - apiCallStartTime;
            log.debug("API poll and processing completed in {}ms for {} contracts", 
                apiCallDurationTotal, rawChain.getTotalContracts());
            
        } catch (Exception e) {
            log.error("Error during API polling: {}", e.getMessage(), e);
            lastError = e.getMessage();
            lastFailedPoll = Instant.now();
            consecutiveFailures++;
            updateInProgress = false; // Clear flag on error
            
            if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                log.error("WARNING: API polling has failed {} consecutive times. Last error: {}", 
                    consecutiveFailures, lastError);
            }
        }
    }
    
    private void stopScheduler() {
        if (scheduledTask != null && !scheduledTask.isCancelled()) {
            scheduledTask.cancel(false);
            scheduledTask = null;
            log.debug("Stopped cache update scheduler");
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
                if (interval >= WindowConstants.MIN_API_POLLING_INTERVAL_MS) {
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
    
    // REMOVED: calculateEatenDeltaForChain() - Now handled by IndependentBidAskEatenService
    // REMOVED: calculateLtpMovementForChain() - Now handled by IndependentLtpMovementService
    // These methods are redundant as each independent service handles its own processing
}

