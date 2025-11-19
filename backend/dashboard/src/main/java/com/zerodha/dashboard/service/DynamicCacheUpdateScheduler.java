package com.zerodha.dashboard.service;

import com.zerodha.dashboard.adapter.ZerodhaApiAdapter;
import com.zerodha.dashboard.model.DerivativesChain;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.time.Duration;
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

    public DynamicCacheUpdateScheduler(
            ZerodhaApiAdapter zerodhaApiAdapter,
            LatestSnapshotCacheService latestSnapshotCacheService,
            ZerodhaSessionService zerodhaSessionService,
            TaskScheduler taskScheduler,
            StringRedisTemplate redisTemplate) {
        this.zerodhaApiAdapter = zerodhaApiAdapter;
        this.latestSnapshotCacheService = latestSnapshotCacheService;
        this.zerodhaSessionService = zerodhaSessionService;
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
        if (intervalMs < 250) {
            log.warn("Interval {}ms is too low, using minimum 250ms", intervalMs);
            intervalMs = 250;
        }
        
        if (intervalMs == currentIntervalMs) {
            log.debug("Interval unchanged: {}ms", intervalMs);
            return;
        }
        
        log.info("Updating cache update interval from {}ms to {}ms", currentIntervalMs, intervalMs);
        currentIntervalMs = intervalMs;
        
        // Save to Redis for persistence
        saveIntervalToRedis(intervalMs);
        
        // Restart scheduler with new interval
        stopScheduler();
        startScheduler(intervalMs);
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
            return;
        }
        
        try {
            log.debug("Scheduled cache update started (interval: {}ms)", currentIntervalMs);
            Optional<DerivativesChain> chain = zerodhaApiAdapter.getDerivativesChain("NIFTY");
            
            if (chain.isPresent()) {
                latestSnapshotCacheService.updateCache(chain.get());
                log.debug("Cache updated successfully with {} contracts", chain.get().getTotalContracts());
            } else {
                log.debug("No data available for cache update");
            }
        } catch (Exception e) {
            log.error("Error updating cache in scheduled task: {}", e.getMessage(), e);
            // Don't throw - allow scheduler to continue
        }
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
}

